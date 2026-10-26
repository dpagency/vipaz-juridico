/**
 * VIPAZ Jurídico — Testes Unitários do Motor Determinístico de Regras
 * Cobertura completa dos 40 Casos Forenses e Derivações Jurídicas
 */

import { LegalFormData } from '../types';
import { ruleEngine } from '../ruleEngine';
import { resolveLegalArchitecture, getUfDerivations } from '../architectureResolver';
import { CONTESTACAO_PME_ARCHITECTURE } from '../data/contestacao/architecture';
import { validateLegalFormData } from '../validators';
import { isPieceHomologated, getArchitectureForPiece } from '../architectureRegistry';
import { DOCUMENT_PIECES_CATALOG } from '../formDefinitions';

// Modelo base válido para os testes
function createBaseFormData(overrides: Partial<LegalFormData> = {}): LegalFormData {
  return {
    process_number: '0801234-56.2026.8.19.0001',
    court_number: '2',
    court_type: 'Vara Cível',
    court_regional: '',
    district: 'Capital',
    uf: 'RJ',
    client: 'Sul América Companhia de Seguro Saúde',
    opposing_party: 'MG Métodos Gráficos Ltda. e outros',
    executive_summary: 'Ementa Executiva de Teste Homologada.',
    claim_summary: 'Resumo da Inicial de Teste.',
    controversy_delimitation: 'Delimitação da Controvérsia de Teste.',
    adverse_party_nature: ['pj', 'pf'],
    document_piece: 'Contestação',
    dispute_objects: {
      reajuste_anual: true,
      reajuste_anual_modalidade: 'pme',
      reajuste_etario: false,
      reajuste_etario_modalidade: 'pme',
      aviso_previo: false,
      premio_complementar: false,
      outro: false,
      outro_descricao: '',
    },
    injunction_status: 'not_requested',
    moral_damages_status: 'not_claimed',
    legal_aid_status: 'not_requested',
    standing_challenge_status: 'do_not_challenge',
    claim_value_challenge_status: 'do_not_challenge',
    petition_aptitude_status: 'do_not_challenge',
    prescription_triennial_status: 'do_not_argue',
    prescription_decennial_status: 'do_not_argue',
    repetition_status: 'not_claimed',
    ...overrides,
  };
}

// Utilitário simples de asserção
function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[FALHA NO TESTE]: ${message}`);
  }
}

export function runRuleEngineTests() {
  console.log('--- INICIANDO OS 40 TESTES DO MOTOR DETERMINÍSTICO VIPAZ ---');
  let passed = 0;

  // GRUPO 1: TUTELA DE URGÊNCIA (CASOS 1 A 5)
  // CASO 1: Tutela Indeferida -> bloco de indeferimento incluído
  {
    const data = createBaseFormData({
      injunction_status: 'denied',
      injunction_decision_manifestation: 'Decisão indeferiu a tutela por ausência de perigo de dano.',
    });
    const { assembly } = ruleEngine.evaluate(data);
    const keys = assembly.includedBlocks.map((b) => b.key);
    assert(keys.includes('injunction_denied_block'), 'Caso 1: injunction_denied_block deve estar incluído');
    assert(!keys.includes('injunction_granted_block'), 'Caso 1: injunction_granted_block NÃO deve estar incluído');
    passed++;
    console.log('✓ Caso 01: Tutela Indeferida testada com sucesso');
  }

  // CASO 2: Tutela Deferida -> bloco de deferimento incluído
  {
    const data = createBaseFormData({
      injunction_status: 'granted',
      injunction_decision_manifestation: 'Decisão deferiu liminar para suspender reajustes.',
    });
    const { assembly } = ruleEngine.evaluate(data);
    const keys = assembly.includedBlocks.map((b) => b.key);
    assert(keys.includes('injunction_granted_block'), 'Caso 2: injunction_granted_block deve estar incluído');
    assert(!keys.includes('injunction_denied_block'), 'Caso 2: injunction_denied_block NÃO deve estar incluído');
    passed++;
    console.log('✓ Caso 02: Tutela Deferida testada com sucesso');
  }

  // CASO 3: Tutela Não Requerida -> nenhum bloco de tutela incluído
  {
    const data = createBaseFormData({
      injunction_status: 'not_requested',
    });
    const { assembly } = ruleEngine.evaluate(data);
    const keys = assembly.includedBlocks.map((b) => b.key);
    assert(!keys.includes('injunction_denied_block'), 'Caso 3: injunction_denied_block NÃO deve estar incluído');
    assert(!keys.includes('injunction_granted_block'), 'Caso 3: injunction_granted_block NÃO deve estar incluído');
    passed++;
    console.log('✓ Caso 03: Tutela Não Requerida testada com sucesso');
  }

  // CASO 4: Tutela Indeferida aciona bloco homologado sem exigir manifestação manual
  {
    const data = createBaseFormData({
      injunction_status: 'denied',
    });
    const errors = validateLegalFormData(data);
    assert(!errors.injunction_decision_manifestation, 'Caso 4: Não deve exigir manifestação manual do usuário');
    const { assembly } = ruleEngine.evaluate(data);
    const deniedBlock = assembly.includedBlocks.find((b) => b.key === 'injunction_denied_block');
    assert(Boolean(deniedBlock), 'Caso 4: Bloco de indeferimento homologado deve estar incluído');
    passed++;
    console.log('✓ Caso 04: Tutela Indeferida com bloco homologado testada com sucesso');
  }

  // CASO 5: Tutela Deferida aciona bloco homologado sem exigir manifestação manual
  {
    const data = createBaseFormData({
      injunction_status: 'granted',
    });
    const errors = validateLegalFormData(data);
    assert(!errors.injunction_decision_manifestation, 'Caso 5: Não deve exigir manifestação manual do usuário');
    const { assembly } = ruleEngine.evaluate(data);
    const grantedBlock = assembly.includedBlocks.find((b) => b.key === 'injunction_granted_block');
    assert(Boolean(grantedBlock), 'Caso 5: Bloco de deferimento homologado deve estar incluído');
    passed++;
    console.log('✓ Caso 05: Tutela Deferida com bloco homologado testada com sucesso');
  }

  // GRUPO 2: DANO MORAL (CASOS 6 A 8)
  // CASO 6: Dano Moral Pleiteado -> bloco e pedido incluídos
  {
    const data = createBaseFormData({
      moral_damages_status: 'claimed',
    });
    const { assembly } = ruleEngine.evaluate(data);
    const blockKeys = assembly.includedBlocks.map((b) => b.key);
    const reqKeys = assembly.includedRequests.map((r) => r.key);
    assert(blockKeys.includes('moral_damages_block'), 'Caso 6: moral_damages_block deve estar incluído');
    assert(reqKeys.includes('req_merits_moral_damages'), 'Caso 6: req_merits_moral_damages deve estar nos pedidos');
    passed++;
    console.log('✓ Caso 06: Dano Moral Pleiteado testado com sucesso');
  }

  // CASO 7: Dano Moral Não Pleiteado -> bloco e pedido excluídos
  {
    const data = createBaseFormData({
      moral_damages_status: 'not_claimed',
    });
    const { assembly } = ruleEngine.evaluate(data);
    const blockKeys = assembly.includedBlocks.map((b) => b.key);
    const reqKeys = assembly.includedRequests.map((r) => r.key);
    assert(!blockKeys.includes('moral_damages_block'), 'Caso 7: moral_damages_block NÃO deve estar incluído');
    assert(!reqKeys.includes('req_merits_moral_damages'), 'Caso 7: req_merits_moral_damages NÃO deve estar nos pedidos');
    passed++;
    console.log('✓ Caso 07: Dano Moral Não Pleiteado testado com sucesso');
  }

  // CASO 8: Dano Moral utiliza repositório de texto homologado
  {
    const data = createBaseFormData({
      moral_damages_status: 'claimed',
    });
    const { assembly } = ruleEngine.evaluate(data);
    const block = assembly.includedBlocks.find((b) => b.key === 'moral_damages_block');
    assert(Boolean(block && block.content && block.content.length > 0), 'Caso 8: Bloco de dano moral homologado deve conter redação');
    passed++;
    console.log('✓ Caso 08: Dano Moral com texto previamente homologado testado com sucesso');
  }

  // GRUPO 3: GRATUIDADE DE JUSTIÇA (CASOS 9 A 13)
  // CASO 9: Gratuidade de Justiça - Impugnação PF
  {
    const data = createBaseFormData({
      legal_aid_status: 'challenge',
      legal_aid_target: 'pf',
    });
    const { assembly } = ruleEngine.evaluate(data);
    const blockKeys = assembly.includedBlocks.map((b) => b.key);
    const reqKeys = assembly.includedRequests.map((r) => r.key);
    assert(blockKeys.includes('legal_aid_pf_block'), 'Caso 9: legal_aid_pf_block deve estar incluído');
    assert(!blockKeys.includes('legal_aid_pj_block'), 'Caso 9: legal_aid_pj_block NÃO deve estar incluído');
    assert(reqKeys.includes('req_legal_aid'), 'Caso 9: req_legal_aid deve estar nos pedidos');
    passed++;
    console.log('✓ Caso 09: Impugnação de Gratuidade PF testada com sucesso');
  }

  // CASO 10: Gratuidade de Justiça - Impugnação PJ
  {
    const data = createBaseFormData({
      legal_aid_status: 'challenge',
      legal_aid_target: 'pj',
    });
    const { assembly } = ruleEngine.evaluate(data);
    const blockKeys = assembly.includedBlocks.map((b) => b.key);
    const reqKeys = assembly.includedRequests.map((r) => r.key);
    assert(blockKeys.includes('legal_aid_pj_block'), 'Caso 10: legal_aid_pj_block deve estar incluído');
    assert(!blockKeys.includes('legal_aid_pf_block'), 'Caso 10: legal_aid_pf_block NÃO deve estar incluído');
    assert(reqKeys.includes('req_legal_aid'), 'Caso 10: req_legal_aid deve estar nos pedidos');
    passed++;
    console.log('✓ Caso 10: Impugnação de Gratuidade PJ testada com sucesso');
  }

  // CASO 11: Gratuidade de Justiça - Impugnação Ambas
  {
    const data = createBaseFormData({
      legal_aid_status: 'challenge',
      legal_aid_target: 'both',
    });
    const { assembly } = ruleEngine.evaluate(data);
    const blockKeys = assembly.includedBlocks.map((b) => b.key);
    const reqKeys = assembly.includedRequests.map((r) => r.key);
    assert(blockKeys.includes('legal_aid_pf_block'), 'Caso 11: legal_aid_pf_block deve estar incluído');
    assert(blockKeys.includes('legal_aid_pj_block'), 'Caso 11: legal_aid_pj_block deve estar incluído');
    assert(reqKeys.includes('req_legal_aid'), 'Caso 11: req_legal_aid deve estar nos pedidos');
    passed++;
    console.log('✓ Caso 11: Impugnação de Gratuidade Ambas testada com sucesso');
  }

  // CASO 12: Gratuidade de Justiça Não Impugnada
  {
    const data = createBaseFormData({
      legal_aid_status: 'do_not_challenge',
    });
    const { assembly } = ruleEngine.evaluate(data);
    const blockKeys = assembly.includedBlocks.map((b) => b.key);
    const reqKeys = assembly.includedRequests.map((r) => r.key);
    assert(!blockKeys.includes('legal_aid_pf_block'), 'Caso 12: legal_aid_pf_block NÃO deve estar incluído');
    assert(!blockKeys.includes('legal_aid_pj_block'), 'Caso 12: legal_aid_pj_block NÃO deve estar incluído');
    assert(!reqKeys.includes('req_legal_aid'), 'Caso 12: req_legal_aid NÃO deve estar nos pedidos');
    passed++;
    console.log('✓ Caso 12: Gratuidade Não Impugnada testada com sucesso');
  }

  // CASO 13: Gratuidade de Justiça Não Requerida
  {
    const data = createBaseFormData({
      legal_aid_status: 'not_requested',
    });
    const { assembly } = ruleEngine.evaluate(data);
    const blockKeys = assembly.includedBlocks.map((b) => b.key);
    assert(!blockKeys.includes('legal_aid_pf_block'), 'Caso 13: legal_aid_pf_block NÃO deve estar incluído');
    assert(!blockKeys.includes('legal_aid_pj_block'), 'Caso 13: legal_aid_pj_block NÃO deve estar incluído');
    passed++;
    console.log('✓ Caso 13: Gratuidade Não Requerida testada com sucesso');
  }

  // GRUPO 4: ILEGITIMIDADE ATIVA & NATUREZA POLO ATIVO (CASOS 14 A 17)
  // CASO 14: Ilegitimidade Ativa - Impugnada com PF presente
  {
    const data = createBaseFormData({
      adverse_party_nature: ['pj', 'pf'],
      standing_challenge_status: 'challenge',
    });
    const { assembly } = ruleEngine.evaluate(data);
    const blockKeys = assembly.includedBlocks.map((b) => b.key);
    const reqKeys = assembly.includedRequests.map((r) => r.key);
    assert(blockKeys.includes('standing_challenge_block'), 'Caso 14: standing_challenge_block deve estar incluído');
    assert(reqKeys.includes('req_standing'), 'Caso 14: req_standing deve estar nos pedidos');
    passed++;
    console.log('✓ Caso 14: Ilegitimidade Ativa Impugnada testada com sucesso');
  }

  // CASO 15: Ilegitimidade Ativa - Não Impugnada (mesmo com PF)
  {
    const data = createBaseFormData({
      adverse_party_nature: ['pj', 'pf'],
      standing_challenge_status: 'do_not_challenge',
    });
    const { assembly } = ruleEngine.evaluate(data);
    const blockKeys = assembly.includedBlocks.map((b) => b.key);
    const reqKeys = assembly.includedRequests.map((r) => r.key);
    assert(!blockKeys.includes('standing_challenge_block'), 'Caso 15: standing_challenge_block NÃO deve estar incluído');
    assert(!reqKeys.includes('req_standing'), 'Caso 15: req_standing NÃO deve estar nos pedidos');
    passed++;
    console.log('✓ Caso 15: Ilegitimidade Ativa Não Impugnada testada com sucesso');
  }

  // CASO 16: Ilegitimidade Ativa - Independência entre natureza do polo e impugnação
  {
    const data = createBaseFormData({
      adverse_party_nature: ['pj'],
      standing_challenge_status: 'challenge',
    });
    const { assembly } = ruleEngine.evaluate(data);
    const blockKeys = assembly.includedBlocks.map((b) => b.key);
    assert(
      blockKeys.includes('standing_challenge_block'),
      'Caso 16: Impugnação à legitimidade deve ser acionada pela escolha explícita, independente do polo'
    );
    passed++;
    console.log('✓ Caso 16: Ilegitimidade Ativa acionada com variável de polo independente');
  }

  // CASO 17: Validação de Polo Ativo Vazio -> deve acusar erro
  {
    const data = createBaseFormData({
      adverse_party_nature: [],
    });
    const errors = validateLegalFormData(data);
    assert(Boolean(errors.adverse_party_nature), 'Caso 17: Deve acusar erro se polo ativo estiver vazio');
    passed++;
    console.log('✓ Caso 17: Validação de Polo Ativo Vazio testada com sucesso');
  }

  // GRUPO 5: VALOR DA CAUSA (CASOS 18 E 19)
  // CASO 18: Impugnação ao Valor da Causa
  {
    const data = createBaseFormData({
      claim_value_challenge_status: 'challenge',
    });
    const { assembly } = ruleEngine.evaluate(data);
    const blockKeys = assembly.includedBlocks.map((b) => b.key);
    const reqKeys = assembly.includedRequests.map((r) => r.key);
    assert(blockKeys.includes('claim_value_challenge_block'), 'Caso 18: claim_value_challenge_block deve estar incluído');
    assert(reqKeys.includes('req_claim_value'), 'Caso 18: req_claim_value deve estar nos pedidos');
    passed++;
    console.log('✓ Caso 18: Impugnação ao Valor da Causa testada com sucesso');
  }

  // CASO 19: Valor da Causa Não Impugnado
  {
    const data = createBaseFormData({
      claim_value_challenge_status: 'do_not_challenge',
    });
    const { assembly } = ruleEngine.evaluate(data);
    const blockKeys = assembly.includedBlocks.map((b) => b.key);
    const reqKeys = assembly.includedRequests.map((r) => r.key);
    assert(!blockKeys.includes('claim_value_challenge_block'), 'Caso 19: claim_value_challenge_block NÃO deve estar incluído');
    assert(!reqKeys.includes('req_claim_value'), 'Caso 19: req_claim_value NÃO deve estar nos pedidos');
    passed++;
    console.log('✓ Caso 19: Valor da Causa Não Impugnado testado com sucesso');
  }

  // GRUPO 6: INÉPCIA DA INICIAL (CASOS 20 E 21)
  // CASO 20: Inépcia da Petição Inicial
  {
    const data = createBaseFormData({
      petition_aptitude_status: 'challenge',
    });
    const { assembly } = ruleEngine.evaluate(data);
    const blockKeys = assembly.includedBlocks.map((b) => b.key);
    const reqKeys = assembly.includedRequests.map((r) => r.key);
    assert(blockKeys.includes('petition_aptitude_block'), 'Caso 20: petition_aptitude_block deve estar incluído');
    assert(reqKeys.includes('req_petition_aptitude'), 'Caso 20: req_petition_aptitude deve estar nos pedidos');
    passed++;
    console.log('✓ Caso 20: Inépcia da Petição Inicial testada com sucesso');
  }

  // CASO 21: Inépcia Não Arguida
  {
    const data = createBaseFormData({
      petition_aptitude_status: 'do_not_challenge',
    });
    const { assembly } = ruleEngine.evaluate(data);
    const blockKeys = assembly.includedBlocks.map((b) => b.key);
    const reqKeys = assembly.includedRequests.map((r) => r.key);
    assert(!blockKeys.includes('petition_aptitude_block'), 'Caso 21: petition_aptitude_block NÃO deve estar incluído');
    assert(!reqKeys.includes('req_petition_aptitude'), 'Caso 21: req_petition_aptitude NÃO deve estar nos pedidos');
    passed++;
    console.log('✓ Caso 21: Inépcia Não Arguida testada com sucesso');
  }

  // GRUPO 7: PRESCRIÇÃO TRIENAL (CASOS 22 E 23)
  // CASO 22: Prescrição Trienal Arguida (Tema 610/STJ)
  {
    const data = createBaseFormData({
      prescription_triennial_status: 'argue',
    });
    const { assembly } = ruleEngine.evaluate(data);
    const blockKeys = assembly.includedBlocks.map((b) => b.key);
    const reqKeys = assembly.includedRequests.map((r) => r.key);
    assert(blockKeys.includes('prescription_triennial_block'), 'Caso 22: prescription_triennial_block deve estar incluído');
    assert(reqKeys.includes('req_prescription_triennial'), 'Caso 22: req_prescription_triennial deve estar nos pedidos');
    passed++;
    console.log('✓ Caso 22: Prescrição Trienal testada com sucesso');
  }

  // CASO 23: Prescrição Trienal Não Arguida
  {
    const data = createBaseFormData({
      prescription_triennial_status: 'do_not_argue',
    });
    const { assembly } = ruleEngine.evaluate(data);
    const blockKeys = assembly.includedBlocks.map((b) => b.key);
    const reqKeys = assembly.includedRequests.map((r) => r.key);
    assert(!blockKeys.includes('prescription_triennial_block'), 'Caso 23: prescription_triennial_block NÃO deve estar incluído');
    assert(!reqKeys.includes('req_prescription_triennial'), 'Caso 23: req_prescription_triennial NÃO deve estar nos pedidos');
    passed++;
    console.log('✓ Caso 23: Prescrição Trienal Não Arguida testada com sucesso');
  }

  // GRUPO 8: PRESCRIÇÃO DECENAL (CASOS 24 E 25)
  // CASO 24: Prescrição Decenal Arguida (Art. 205 CC)
  {
    const data = createBaseFormData({
      prescription_decennial_status: 'argue',
    });
    const { assembly } = ruleEngine.evaluate(data);
    const blockKeys = assembly.includedBlocks.map((b) => b.key);
    const reqKeys = assembly.includedRequests.map((r) => r.key);
    assert(blockKeys.includes('prescription_decennial_block'), 'Caso 24: prescription_decennial_block deve estar incluído');
    assert(reqKeys.includes('req_prescription_decennial'), 'Caso 24: req_prescription_decennial deve estar nos pedidos');
    passed++;
    console.log('✓ Caso 24: Prescrição Decenal testada com sucesso');
  }

  // CASO 25: Prescrição Decenal Não Arguida
  {
    const data = createBaseFormData({
      prescription_decennial_status: 'do_not_argue',
    });
    const { assembly } = ruleEngine.evaluate(data);
    const blockKeys = assembly.includedBlocks.map((b) => b.key);
    const reqKeys = assembly.includedRequests.map((r) => r.key);
    assert(!blockKeys.includes('prescription_decennial_block'), 'Caso 25: prescription_decennial_block NÃO deve estar incluído');
    assert(!reqKeys.includes('req_prescription_decennial'), 'Caso 25: req_prescription_decennial NÃO deve estar nos pedidos');
    passed++;
    console.log('✓ Caso 25: Prescrição Decenal Não Arguida testada com sucesso');
  }

  // GRUPO 9: REPETIÇÃO DE INDÉBITO (CASOS 26 A 29)
  // CASO 26: Repetição Simples
  {
    const data = createBaseFormData({ repetition_status: 'simple' });
    const { assembly } = ruleEngine.evaluate(data);
    const blockKeys = assembly.includedBlocks.map((b) => b.key);
    const reqKeys = assembly.includedRequests.map((r) => r.key);
    assert(blockKeys.includes('repetition_simple_block'), 'Caso 26: repetition_simple_block deve estar incluído');
    assert(!blockKeys.includes('repetition_double_block'), 'Caso 26: repetition_double_block NÃO deve estar incluído');
    assert(reqKeys.includes('req_merits_repetition'), 'Caso 26: req_merits_repetition deve estar nos pedidos');
    passed++;
    console.log('✓ Caso 26: Repetição Simples testada com sucesso');
  }

  // CASO 27: Repetição em Dobro
  {
    const data = createBaseFormData({ repetition_status: 'double' });
    const { assembly } = ruleEngine.evaluate(data);
    const blockKeys = assembly.includedBlocks.map((b) => b.key);
    const reqKeys = assembly.includedRequests.map((r) => r.key);
    assert(blockKeys.includes('repetition_double_block'), 'Caso 27: repetition_double_block deve estar incluído');
    assert(!blockKeys.includes('repetition_simple_block'), 'Caso 27: repetition_simple_block NÃO deve estar incluído');
    assert(reqKeys.includes('req_merits_repetition'), 'Caso 27: req_merits_repetition deve estar nos pedidos');
    passed++;
    console.log('✓ Caso 27: Repetição em Dobro testada com sucesso');
  }

  // CASO 28: Repetição Não Pleiteada
  {
    const data = createBaseFormData({ repetition_status: 'not_claimed' });
    const { assembly } = ruleEngine.evaluate(data);
    const blockKeys = assembly.includedBlocks.map((b) => b.key);
    const reqKeys = assembly.includedRequests.map((r) => r.key);
    assert(!blockKeys.includes('repetition_simple_block'), 'Caso 28: repetition_simple_block NÃO deve estar incluído');
    assert(!blockKeys.includes('repetition_double_block'), 'Caso 28: repetition_double_block NÃO deve estar incluído');
    assert(!reqKeys.includes('req_merits_repetition'), 'Caso 28: req_merits_repetition NÃO deve estar nos pedidos');
    passed++;
    console.log('✓ Caso 28: Repetição Não Pleiteada testada com sucesso');
  }

  // CASO 29: Inclusão do Pedido de Improcedência Total
  {
    const data = createBaseFormData();
    const { assembly } = ruleEngine.evaluate(data);
    const reqKeys = assembly.includedRequests.map((r) => r.key);
    assert(reqKeys.includes('req_merits_head'), 'Caso 29: req_merits_head deve ser obrigatório');
    passed++;
    console.log('✓ Caso 29: Pedido de Improcedência Total obrigatório testado com sucesso');
  }

  // GRUPO 10: TAXONOMIA DO OBJETO DA LIDE (CASOS 30 A 34)
  // CASO 30: Reajuste Anual PME selecionado ativa blocos de mérito PME
  {
    const data = createBaseFormData({
      dispute_objects: {
        reajuste_anual: true,
        reajuste_anual_modalidade: 'pme',
        reajuste_etario: false,
        reajuste_etario_modalidade: 'pme',
        aviso_previo: false,
        premio_complementar: false,
        outro: false,
        outro_descricao: '',
      },
    });
    const { assembly } = ruleEngine.evaluate(data);
    const blockKeys = assembly.includedBlocks.map((b) => b.key);
    assert(blockKeys.includes('merits_pme_robustness_block'), 'Caso 30: merits_pme_robustness_block deve estar incluído');
    passed++;
    console.log('✓ Caso 30: Taxonomia Reajuste Anual PME testada com sucesso');
  }

  // CASO 31: Reajuste Etário selecionado ativa bloco etário
  {
    const data = createBaseFormData({
      dispute_objects: {
        reajuste_anual: true,
        reajuste_anual_modalidade: 'pme',
        reajuste_etario: true,
        reajuste_etario_modalidade: 'pme',
        aviso_previo: false,
        premio_complementar: false,
        outro: false,
        outro_descricao: '',
      },
    });
    const { assembly } = ruleEngine.evaluate(data);
    const blockKeys = assembly.includedBlocks.map((b) => b.key);
    assert(blockKeys.includes('merits_age_readjustment_block'), 'Caso 31: merits_age_readjustment_block deve estar incluído');
    passed++;
    console.log('✓ Caso 31: Taxonomia Reajuste Etário testada com sucesso');
  }

  // CASO 32: Outro Objeto com descrição válida -> sem erros de validação
  {
    const data = createBaseFormData({
      dispute_objects: {
        reajuste_anual: true,
        reajuste_anual_modalidade: 'pme',
        reajuste_etario: false,
        reajuste_etario_modalidade: 'pme',
        aviso_previo: false,
        premio_complementar: false,
        outro: true,
        outro_descricao: 'Controvérsia sobre inclusão de dependente extracontratual.',
      },
    });
    const errors = validateLegalFormData(data);
    assert(!errors['dispute_objects.outro_descricao'], 'Caso 32: Não deve acusar erro quando houver descrição');
    passed++;
    console.log('✓ Caso 32: Outro Objeto com descrição válida testado com sucesso');
  }

  // CASO 33: Outro Objeto sem descrição -> erro de validação acusando obrigatoriedade
  {
    const data = createBaseFormData({
      dispute_objects: {
        reajuste_anual: true,
        reajuste_anual_modalidade: 'pme',
        reajuste_etario: false,
        reajuste_etario_modalidade: 'pme',
        aviso_previo: false,
        premio_complementar: false,
        outro: true,
        outro_descricao: '',
      },
    });
    const errors = validateLegalFormData(data);
    assert(Boolean(errors['dispute_objects.outro_descricao']), 'Caso 33: Deve acusar erro para outro objeto sem descrição');
    passed++;
    console.log('✓ Caso 33: Validação de Outro Objeto sem descrição testada com sucesso');
  }

  // CASO 34: Nenhum objeto da lide selecionado -> erro de validação
  {
    const data = createBaseFormData({
      dispute_objects: {
        reajuste_anual: false,
        reajuste_anual_modalidade: 'pme',
        reajuste_etario: false,
        reajuste_etario_modalidade: 'pme',
        aviso_previo: false,
        premio_complementar: false,
        outro: false,
        outro_descricao: '',
      },
    });
    const errors = validateLegalFormData(data);
    assert(Boolean(errors.dispute_objects), 'Caso 34: Deve acusar erro se nenhum objeto for selecionado');
    passed++;
    console.log('✓ Caso 34: Validação de ausência de Objeto da Lide testada com sucesso');
  }

  // GRUPO 11: HOMOLOGAÇÃO DE PEÇA PROCESSUAL (CASOS 35 A 38)
  // CASO 35: Contestação é homologada e resolve a arquitetura
  {
    assert(isPieceHomologated('Contestação'), 'Caso 35: Contestação deve ser homologada');
    const arch = getArchitectureForPiece('Contestação');
    assert(arch !== null && (arch.id === 'arch_contestacao_pme_v1' || arch.id === 'contestacao_civel_reajuste_pme'), 'Caso 35: Deve retornar arquitetura PME');
    passed++;
    console.log('✓ Caso 35: Contestação homologada verificada com sucesso');
  }

  // CASO 36: Agravo de Instrumento possui arquitetura homologada
  {
    assert(isPieceHomologated('Agravo de Instrumento'), 'Caso 36: Agravo de Instrumento deve ser homologado');
    const arch=getArchitectureForPiece('Agravo de Instrumento');
    assert(arch?.id==='arch_agravo_instrumento_v1','Caso 36: Deve retornar arquitetura própria do agravo');
    passed++;
    console.log('✓ Caso 36: Agravo de Instrumento homologado testado com sucesso');
  }

  // CASO 37: Apelação NÃO é homologada
  {
    assert(!isPieceHomologated('Apelação'), 'Caso 37: Apelação NÃO deve ser homologada');
    const data = createBaseFormData({ document_piece: 'Apelação' });
    const errors = validateLegalFormData(data);
    assert(Boolean(errors.document_piece), 'Caso 37: Deve acusar erro de peça não homologada para Apelação');
    passed++;
    console.log('✓ Caso 37: Apelação não homologada testada com sucesso');
  }

  // CASO 38: Catálogo Processual Exato de 8 Peças (presença, ausências e homologação restrita)
  {
    const expectedPieces = [
      'Contestação',
      'Agravo de Instrumento',
      'Recurso Inominado',
      'Apelação',
      'Recurso Especial',
      'Contraminuta de Agravo de Instrumento',
      'Contrarrazões de Recurso Inominado',
      'Contrarrazões de Apelação',
    ];

    // 1. Quantidade = 8
    assert(DOCUMENT_PIECES_CATALOG.length === 8, 'Caso 38: Quantidade de peças no catálogo deve ser exatamente 8');

    // 2. Presença das oito peças acima
    const catalogIds = DOCUMENT_PIECES_CATALOG.map((p) => p.id);
    for (const piece of expectedPieces) {
      assert(catalogIds.includes(piece as any), `Caso 38: Peça "${piece}" deve estar presente no catálogo`);
    }

    // 3. Ausência de Embargos de Declaração
    assert(
      !catalogIds.includes('Embargos de Declaração' as any),
      'Caso 38: Ausência de Embargos de Declaração verificada'
    );

    // 4. Ausência de Petição Inicial
    assert(
      !catalogIds.includes('Petição Inicial' as any),
      'Caso 38: Ausência de Petição Inicial verificada'
    );

    // 5. Contestação homologada
    assert(isPieceHomologated('Contestação'), 'Caso 38: Contestação deve retornar homologada');
    const contestacaoMetadata = DOCUMENT_PIECES_CATALOG.find((p) => p.id === 'Contestação');
    assert(contestacaoMetadata?.isHomologated === true, 'Caso 38: Metadado de Contestação deve ser homologado');

    // 6. Contestação e Agravo homologados; demais seis não homologadas
    assert(isPieceHomologated('Agravo de Instrumento'), 'Caso 38: Agravo deve retornar homologado');
    const agravoMetadata=DOCUMENT_PIECES_CATALOG.find((p)=>p.id==='Agravo de Instrumento');
    assert(agravoMetadata?.isHomologated===true,'Caso 38: Metadado de Agravo deve ser homologado');
    const nonHomologatedPieces = expectedPieces.filter((p) => !['Contestação','Agravo de Instrumento'].includes(p));
    assert(nonHomologatedPieces.length === 6, 'Caso 38: Devem existir exatamente 6 peças não homologadas');
    for (const piece of nonHomologatedPieces) {
      assert(!isPieceHomologated(piece as any), `Caso 38: "${piece}" NÃO deve ser homologada`);
      const meta = DOCUMENT_PIECES_CATALOG.find((p) => p.id === piece);
      assert(meta?.isHomologated === false, `Caso 38: Metadado de "${piece}" deve ser não homologado`);
    }

    passed++;
    console.log('✓ Caso 38: Catálogo com exatamente 8 peças homologadas/restritas testado com sucesso');
  }

  // GRUPO 12: DERIVAÇÕES REGIONAIS E JUÍZO (CASOS 39 E 40)
  // CASO 39: Derivação de UF RJ, Vara Cível e Foro Regional
  {
    const dataRJ = createBaseFormData({
      uf: 'RJ',
      court_type: 'Vara Cível',
      court_number: '5',
      court_regional: 'Barra da Tijuca',
      district: 'Capital',
    });
    const assemblyRJ = resolveLegalArchitecture(dataRJ, CONTESTACAO_PME_ARCHITECTURE);
    assert(assemblyRJ.resolvedVariables.ESTADO_FULL === 'DO ESTADO DO RIO DE JANEIRO', 'UF RJ correto');
    assert(assemblyRJ.resolvedVariables.JUIZO_ARTIGO === 'DA', 'Vara Cível -> DA');
    assert(assemblyRJ.resolvedVariables.JUIZO_SUFFIX === 'ª VARA CÍVEL', 'Vara Cível -> ª VARA CÍVEL');
    assert(assemblyRJ.resolvedVariables.REGIONAL_SE_HOUVER.includes('BARRA DA TIJUCA'), 'Regional deve constar');
    passed++;
    console.log('✓ Caso 39: Derivações de UF RJ, Vara Cível e Regional testadas com sucesso');
  }

  // CASO 40: Derivação de Juizado Especial Cível em SP e MG
  {
    const dataSP = createBaseFormData({
      uf: 'SP',
      court_type: 'Juizado Especial Cível',
      court_number: '1',
      district: 'São Paulo',
    });
    const assemblySP = resolveLegalArchitecture(dataSP, CONTESTACAO_PME_ARCHITECTURE);
    assert(assemblySP.resolvedVariables.ESTADO_FULL === 'DO ESTADO DE SÃO PAULO', 'UF SP correto');
    assert(assemblySP.resolvedVariables.JUIZO_ARTIGO === 'DO', 'JEC -> DO');
    assert(assemblySP.resolvedVariables.JUIZO_SUFFIX === 'º JUIZADO ESPECIAL CÍVEL', 'JEC -> º JUIZADO ESPECIAL CÍVEL');

    const dataMG = createBaseFormData({
      uf: 'MG',
      court_type: 'Vara Cível',
      court_number: '12',
      district: 'Belo Horizonte',
    });
    const assemblyMG = resolveLegalArchitecture(dataMG, CONTESTACAO_PME_ARCHITECTURE);
    assert(assemblyMG.resolvedVariables.ESTADO_FULL === 'DO ESTADO DE MINAS GERAIS', 'UF MG correto');

    passed++;
    console.log('✓ Caso 40: Derivações de JEC SP e Vara Cível MG testadas com sucesso');
  }

  console.log(`\n======================================================`);
  console.log(`TODOS OS ${passed} TESTES DO MOTOR DETERMINÍSTICO PASSARAM COM SUCESSO!`);
  console.log(`======================================================\n`);
}

// Execução direta se rodado via tsx / node
if (typeof process !== 'undefined' && process.argv && process.argv[1]?.includes('ruleEngine.test')) {
  runRuleEngineTests();
}
