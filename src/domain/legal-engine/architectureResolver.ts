/**
 * VIPAZ Jurídico — Motor Determinístico de Montagem Jurídica
 * Resolvedor de Arquitetura, Variáveis e Derivações Jurídicas
 */

import {
  LegalFormData,
  LegalArchitecture,
  ResolvedDocumentAssembly,
  RuleEvaluationResult,
  RequestEvaluationResult,
  LegalBlock,
  FinalRequestItem,
  UfType,
} from './types.js';
import { evaluateCondition, describeConditionReason } from './operators.js';
import { CONTESTACAO_PME_ARCHITECTURE } from './data/contestacao/architecture.js';
import { getArchitectureForPiece } from './architectureRegistry.js';

/**
 * Converte data atual em extenso no formato padrão forense brasileiro
 */
export function formatDataExtenso(date: Date = new Date()): string {
  const meses = [
    'janeiro',
    'fevereiro',
    'março',
    'abril',
    'maio',
    'junho',
    'julho',
    'agosto',
    'setembro',
    'outubro',
    'novembro',
    'dezembro',
  ];
  const dia = date.getDate();
  const mes = meses[date.getMonth()];
  const ano = date.getFullYear();
  return `${dia} de ${mes} de ${ano}`;
}

/**
 * Mapeamentos estritos por UF conforme especificação homologada
 */
export function getUfDerivations(uf: UfType): {
  estadoFull: string;
  cidadeDefault: string;
  advogadoOabEspecifica: string;
  listaOabsPatrono: string;
} {
  switch (uf) {
    case 'RJ':
      return {
        estadoFull: 'DO ESTADO DO RIO DE JANEIRO',
        cidadeDefault: 'Rio de Janeiro – RJ',
        advogadoOabEspecifica: 'inscrito na OAB/RJ sob o nº 114.760',
        listaOabsPatrono: 'OAB/RJ 114.760',
      };
    case 'SP':
      return {
        estadoFull: 'DO ESTADO DE SÃO PAULO',
        cidadeDefault: 'São Paulo – SP',
        advogadoOabEspecifica: 'inscrito na OAB/SP sob o nº 340.639',
        listaOabsPatrono: 'OAB/SP 340.639',
      };
    case 'MG':
      return {
        estadoFull: 'DO ESTADO DE MINAS GERAIS',
        cidadeDefault: 'Belo Horizonte – MG',
        advogadoOabEspecifica: 'inscrito na OAB/MG sob o nº 122.535',
        listaOabsPatrono: 'OAB/MG 122.535',
      };
    case 'BA':
      return {
        estadoFull: 'DO ESTADO DA BAHIA',
        cidadeDefault: 'Salvador – BA',
        advogadoOabEspecifica: 'inscrito na OAB/BA sob o nº 31.341',
        listaOabsPatrono: 'OAB/BA 31.341',
      };
    default:
      return {
        estadoFull: 'DO ESTADO DO RIO DE JANEIRO',
        cidadeDefault: 'Rio de Janeiro – RJ',
        advogadoOabEspecifica: 'inscrito na OAB/RJ sob o nº 114.760',
        listaOabsPatrono: 'OAB/RJ 114.760',
      };
  }
}

/**
 * Cria o contexto de avaliação contendo campos originais e derivações jurídicas
 */
export function buildEvaluationContext(formData: LegalFormData): Record<string, unknown> {
  const is_pf_present = formData.adverse_party_nature.includes('pf');
  const is_pj_present = formData.adverse_party_nature.includes('pj');

  const is_pme_selected = Boolean(
    (formData.dispute_objects?.reajuste_anual &&
      (formData.dispute_objects?.reajuste_anual_modalidade === 'pme' ||
        formData.dispute_objects?.reajuste_anual_pme ||
        formData.dispute_objects?.reajuste_pme_anual ||
        formData.dispute_objects?.reajuste_anual_modalidade === undefined)) ||
    (formData.dispute_objects?.reajuste_etario &&
      (formData.dispute_objects?.reajuste_etario_modalidade === 'pme' ||
        formData.dispute_objects?.reajuste_etario_pme ||
        formData.dispute_objects?.reajuste_pme_etario)) ||
    formData.dispute_objects?.reajuste_pme ||
    formData.dispute_objects?.reajuste_anual_pme
  );

  const is_individual_selected = Boolean(
    (formData.dispute_objects?.reajuste_anual &&
      (formData.dispute_objects?.reajuste_anual_modalidade === 'individual' ||
        formData.dispute_objects?.reajuste_anual_individual)) ||
    (formData.dispute_objects?.reajuste_etario &&
      (formData.dispute_objects?.reajuste_etario_modalidade === 'individual' ||
        formData.dispute_objects?.reajuste_etario_individual))
  );

  const is_age_readjustment_selected = Boolean(
    formData.dispute_objects?.reajuste_etario ||
      formData.dispute_objects?.reajuste_etario_faixa ||
      formData.dispute_objects?.reajuste_pme_etario ||
      formData.dispute_objects?.reajuste_individual_etario
  );

  const is_notice_selected = Boolean(
    formData.dispute_objects?.aviso_previo ||
      formData.dispute_objects?.aviso_previo_rescisao
  );

  const is_complementary_premium_selected = Boolean(
    formData.dispute_objects?.premio_complementar ||
      formData.dispute_objects?.premio_complementar_cobranca
  );

  const is_other_dispute_selected = Boolean(
    formData.dispute_objects?.outro
  );

  const is_repetition_claimed =
    formData.repetition_status === 'simple' || formData.repetition_status === 'double';

  // Alvo da gratuidade de justiça
  let is_pf_legal_aid_targeted = false;
  let is_pj_legal_aid_targeted = false;

  if (formData.legal_aid_status === 'challenge') {
    if (formData.legal_aid_target === 'both') {
      is_pf_legal_aid_targeted = true;
      is_pj_legal_aid_targeted = true;
    } else if (formData.legal_aid_target === 'pf') {
      is_pf_legal_aid_targeted = true;
    } else if (formData.legal_aid_target === 'pj') {
      is_pj_legal_aid_targeted = true;
    } else {
      // Se não especificado explicitamente, infere das partes presentes
      if (is_pf_present) is_pf_legal_aid_targeted = true;
      if (is_pj_present) is_pj_legal_aid_targeted = true;
    }
  }

  const ufInfo = getUfDerivations(formData.uf);

  const isOtherCourt = formData.court_type === 'Outro';
  const juizoArtigo = formData.court_type === 'Vara Cível' ? 'DA' : formData.court_type === 'Juizado Especial Cível' ? 'DO' : '';
  const juizoSuffix = formData.court_type === 'Vara Cível'
    ? 'ª VARA CÍVEL'
    : formData.court_type === 'Juizado Especial Cível'
      ? 'º JUIZADO ESPECIAL CÍVEL'
      : (formData.court_type_custom || '').trim().toUpperCase();

  return {
    ...formData,
    is_pf_present,
    is_pj_present,
    is_pme_selected,
    is_individual_selected,
    is_age_readjustment_selected,
    is_notice_selected,
    is_complementary_premium_selected,
    is_other_dispute_selected,
    is_repetition_claimed,
    is_pf_legal_aid_targeted,
    is_pj_legal_aid_targeted,
    uf_info: ufInfo,
    juizo_artigo: juizoArtigo,
    juizo_suffix: juizoSuffix,
  };
}

/**
 * Constrói o mapa de substituição de variáveis para o texto dos blocos
 */
export function buildVariableMap(
  formData: LegalFormData,
  requestsText: string
): Record<string, string> {
  const ufInfo = getUfDerivations(formData.uf);
  const dataExtenso = formatDataExtenso();
  const regionalRaw = formData.court_regional?.trim().toUpperCase() || '';
  const regionalPart = regionalRaw
    ? (/^(FORO|SUBSEÇÃO|REGIONAL)/.test(regionalRaw) ? regionalRaw : `FORO REGIONAL ${regionalRaw}`)
    : '';

  const juizoArtigo = formData.court_type === 'Vara Cível' ? 'DA' : formData.court_type === 'Juizado Especial Cível' ? 'DO' : '';
  const juizoSuffix = formData.court_type === 'Vara Cível'
    ? 'ª VARA CÍVEL'
    : formData.court_type === 'Juizado Especial Cível'
      ? 'º JUIZADO ESPECIAL CÍVEL'
      : (formData.court_type_custom || '').trim().toUpperCase();

  const cidadeEstadoData = `${ufInfo.cidadeDefault}, ${dataExtenso}.`;

  return {
    JUIZO_ARTIGO: juizoArtigo,
    COURT_NUMBER: formData.court_number.trim(),
    JUIZO_SUFFIX: juizoSuffix,
    REGIONAL_SE_HOUVER: regionalPart,
    DISTRICT: formData.district.trim().toUpperCase(),
    ESTADO_FULL: ufInfo.estadoFull,
    PROCESS_NUMBER: formData.process_number.trim(),
    CLIENT: formData.client.trim(),
    OPPOSING_PARTY: formData.opposing_party.trim(),
    EXECUTIVE_SUMMARY: formData.executive_summary.trim(),
    CLAIM_SUMMARY: formData.claim_summary.trim(),
    CONTROVERSY_DELIMITATION: formData.controversy_delimitation.trim(),
    APPEAL_EFFECT_SUSPENSIVE: (formData.appeal_effect_suspensive || '').trim(),
    APPEAL_MISTAKEN_PREMISE: (formData.appeal_mistaken_premise || '').trim(),
    APPEAL_FUMUS: (formData.appeal_fumus || '').trim(),
    APPEAL_PERICULUM: (formData.appeal_periculum || '').trim(),
    APPEAL_COUNTERSECURITY: (formData.appeal_countersecurity || '').trim(),
    APPEAL_FINAL_REQUESTS: (formData.appeal_final_requests || '').trim(),
    INJUNCTION_DECISION_TEXT: (formData.injunction_decision_manifestation || '').trim(),
    MORAL_DAMAGES_SPECIFIC_TEXT: (formData.moral_damages_manifestation || '').trim(),
    REQUESTS_ITEMS_TEXT: requestsText,
    CIDADE_ESTADO_DATA: cidadeEstadoData,
    LISTA_OABS_PATRONO: ufInfo.listaOabsPatrono,
    ADVOGADO_OAB_ESPECIFICA: ufInfo.advogadoOabEspecifica,
  };
}

/**
 * Substitui todas as ocorrências de {{VARIABLE}} no texto
 */
export function interpolateVariables(text: string, variables: Record<string, string>): string {
  let result = text;
  let iterations = 0;
  while (iterations < 3 && /\{\{\s*([A-Za-z0-9_]+)\s*\}\}/.test(result)) {
    const next = result.replace(/\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g, (_, key) => {
      return variables[key] !== undefined ? variables[key] : `{{${key}}}`;
    });
    if (next === result) break;
    result = next;
    iterations++;
  }
  return result;
}

/**
 * Renumera dinamicamente os pedidos finais incluídos.
 * 
 * Regras Homologadas:
 * - A enumeração é uma propriedade da MONTAGEM FINAL, e NÃO da identidade persistente do pedido.
 * - Nível principal contínuo: a), b), c), d)... sem saltar nenhuma letra.
 * - Subpedidos acompanham a letra recalculada do pedido principal ao qual estão vinculados (ex: se o mérito virar d), seus subpedidos serão d.1, d.2, d.3...).
 * - Subitens dentro do próprio texto (como em req_provas com i.1, i.2) acompanham a nova letra do pedido principal.
 * - O request_key permanece estritamente IDÊNTICO e intacto.
 */
export function renumberRequests(requests: FinalRequestItem[]): FinalRequestItem[] {
  let mainIndex = 0;
  let currentMainLetter = 'a';
  let subIndex = 0;

  return requests.map((req) => {
    const rawText = req.text || req.label || '';
    const rawLabel = req.label || req.text || '';

    const isSub =
      /^\s*[a-z]\.[0-9]+\)/i.test(rawText) ||
      /^\s*[a-z]\.[0-9]+\)/i.test(rawLabel) ||
      (req.key.startsWith('req_merits_') && req.key !== 'req_merits_head');

    if (isSub) {
      subIndex++;
      const assignedLetter = `${currentMainLetter}.${subIndex}`;
      const prefix = `${assignedLetter})`;

      const newLabel = rawLabel.replace(/^\s*[a-z]\.[0-9]+\)/i, prefix);
      const newText = rawText.replace(/^([ \t]*)[a-z]\.[0-9]+\)/i, `$1${prefix}`);

      return {
        ...req,
        label: newLabel,
        text: newText,
      };
    } else {
      currentMainLetter = String.fromCharCode(97 + mainIndex);
      mainIndex++;
      subIndex = 0;
      const assignedLetter = currentMainLetter;
      const prefix = `${assignedLetter})`;

      const newLabel = rawLabel.replace(/^\s*[a-z]\)/i, prefix);
      let newText = rawText.replace(/^([ \t]*)[a-z]\)/i, `$1${prefix}`);

      // Se houver subitens internos no texto (ex: req_provas com i.1, i.2...)
      let internalSub = 0;
      newText = newText.replace(/([ \t\n\r]+)[a-z]\.[0-9]+\)/gi, (match, whitespace) => {
        internalSub++;
        return `${whitespace}${currentMainLetter}.${internalSub})`;
      });

      return {
        ...req,
        label: newLabel,
        text: newText,
      };
    }
  });
}

/**
 * Resolve a arquitetura jurídica com base nas seleções do formulário
 */
export function resolveLegalArchitecture(
  formData: LegalFormData,
  architecture?: LegalArchitecture
): ResolvedDocumentAssembly {
  const targetArch =
    architecture ||
    getArchitectureForPiece(formData.document_piece) ||
    CONTESTACAO_PME_ARCHITECTURE;
  const context = buildEvaluationContext(formData);

  // 1. Avalia os Requerimentos Finais
  const requestEvaluations: RequestEvaluationResult[] = targetArch.finalRequests.map((req) => {
    if (!req.condition) {
      return {
        requestKey: req.key,
        label: req.label,
        order: req.order,
        included: true,
        reason: 'Item obrigatório permanente dos requerimentos finais.',
        item: req,
      };
    }

    const isMet = evaluateCondition(req.condition, context);
    const reason = describeConditionReason(req.condition, context, isMet);

    return {
      requestKey: req.key,
      label: req.label,
      order: req.order,
      included: isMet,
      reason: isMet ? `Ativado: ${reason}` : `Não aplicável: ${reason}`,
      item: req,
    };
  });

  const rawIncludedRequests = requestEvaluations
    .filter((r) => r.included)
    .sort((a, b) => a.order - b.order)
    .map((r) => r.item);

  // Renumeração dinâmica contínua dos pedidos incluídos
  const includedRequests = renumberRequests(rawIncludedRequests);

  // Monta o texto concatenado dos requerimentos finais com alíneas contínuas
  const requestsText = includedRequests.map((req) => req.text).join('\n\n');

  // 2. Constrói o mapa final de variáveis com os pedidos incluídos
  const variableMap = buildVariableMap(formData, requestsText);

  // 3. Avalia cada bloco da arquitetura
  const blockEvaluations: RuleEvaluationResult[] = targetArch.blocks.map((block) => {
    if (!block.active) {
      return {
        blockKey: block.key,
        title: block.title,
        category: block.category,
        order: block.order,
        included: false,
        reason: 'Bloco desativado na arquitetura.',
        isAvailable: false,
        block,
      };
    }

    if (!block.condition) {
      return {
        blockKey: block.key,
        title: block.title,
        category: block.category,
        order: block.order,
        included: true,
        reason: 'Bloco estrutural permanente da peça processual.',
        isAvailable: true,
        block,
      };
    }

    const isMet = evaluateCondition(block.condition, context);
    const reason = describeConditionReason(block.condition, context, isMet);

    return {
      blockKey: block.key,
      title: block.title,
      category: block.category,
      order: block.order,
      included: isMet,
      reason: isMet ? `Regra satisfeita: ${reason}` : `Regra não satisfeita: ${reason}`,
      isAvailable: true,
      block,
    };
  });

  const includedBlocks = blockEvaluations
    .filter((e) => e.included && e.block)
    .sort((a, b) => a.order - b.order)
    .map((e) => {
      const b = e.block!;
      const interpolatedContent = interpolateVariables(b.content, variableMap);
      return {
        ...b,
        content: interpolatedContent,
      };
    });

  const appliedRuleKeys = blockEvaluations
    .filter((e) => e.included)
    .map((e) => e.blockKey);

  const includedBlockKeys = includedBlocks.map((b) => b.key);

  const snapshot = {
    formData: { ...formData },
    appliedRuleKeys,
    includedBlockKeys,
    architectureVersion: targetArch.version,
    timestamp: new Date().toISOString(),
  };

  return {
    architecture: targetArch,
    evaluations: blockEvaluations,
    includedBlocks,
    includedRequests,
    resolvedVariables: variableMap,
    snapshot,
  };
}
