/**
 * VIPAZ Jurídico — Motor Determinístico de Montagem Jurídica
 * Mapeamento e Estruturação do Snapshot Jurídico (Fase 3)
 */

import { LegalFormData, ResolvedDocumentAssembly } from './types.js';

/**
 * Constante técnica de versão do motor determinístico
 */
export const DETERMINISTIC_ENGINE_VERSION = '1.0';

export interface BasicDataSnapshot {
  process_number: string;
  court: string;
  district: string;
  state: string;
  regional_forum: string | null;
  represented_party: string;
  opposing_party: string;
}

export interface LegalAnswersSnapshot {
  document_type: string;
  opposing_party_nature: string[];
  dispute_objects: string[];
  injunction_status: string;
  moral_damages: string;
  legal_aid: string;
  legal_aid_targets: string[];
  active_legitimacy: string;
  claim_value: string;
  initial_petition_aptitude: string;
  three_year_limitation: string;
  ten_year_limitation: string;
  restitution: string;
}

export interface CustomTextsSnapshot {
  executive_summary: string;
  claim_summary: string;
  controversy_delimitation: string;
  other_dispute_object: string | null;
  appeal_effect_suspensive?: string;
  appeal_mistaken_premise?: string;
  appeal_fumus?: string;
  appeal_periculum?: string;
  appeal_countersecurity?: string;
  appeal_final_requests?: string;
}

export interface AuditBlockSnapshot {
  block_key: string;
  included: boolean;
  reason: string;
  trigger: string;
  content_status: string;
}

export interface LinkedRequestSnapshot {
  request_key: string;
  label: string;
  order: number;
  included: boolean;
}

export interface ResolvedArchitectureSnapshot {
  included_blocks: AuditBlockSnapshot[];
  excluded_blocks: AuditBlockSnapshot[];
  linked_requests: LinkedRequestSnapshot[];
  unresolved_requirements: string[];
  resolution_metadata: {
    architecture_id: string;
    architecture_version: string;
    total_blocks_count: number;
    included_blocks_count: number;
    excluded_blocks_count: number;
    linked_requests_count: number;
    resolved_at: string;
  };
}

export const INITIAL_EMPTY_DERIVED_VARIABLES: Record<string, unknown> = {};

export const INITIAL_EMPTY_RESOLVED_ARCHITECTURE = {
  included_blocks: [] as AuditBlockSnapshot[],
  excluded_blocks: [] as AuditBlockSnapshot[],
  linked_requests: [] as LinkedRequestSnapshot[],
  unresolved_requirements: [] as string[],
  resolution_metadata: {} as Record<string, unknown>,
};

export interface LegalCaseInputPayload {
  id: string;
  organization_id: string;
  process_id: string;
  generation_job_id: string;
  user_id: string;
  basic_data: BasicDataSnapshot;
  legal_answers: LegalAnswersSnapshot;
  custom_texts: CustomTextsSnapshot;
  derived_variables: Record<string, unknown>;
  resolved_architecture:
    | ResolvedArchitectureSnapshot
    | typeof INITIAL_EMPTY_RESOLVED_ARCHITECTURE;
  architecture_id: string | null;
  architecture_version: string | null;
  engine_version: string;
  created_at?: string;
  updated_at?: string;
}

export interface PersistedLegalCaseInput {
  id: string;
  organization_id?: string;
  process_id: string;
  generation_job_id: string;
  user_id?: string;
  basic_data: BasicDataSnapshot;
  legal_answers: LegalAnswersSnapshot;
  custom_texts: CustomTextsSnapshot;
  derived_variables: Record<string, unknown>;
  resolved_architecture: ResolvedArchitectureSnapshot;
  architecture_id?: string | null;
  architecture_version?: string | null;
  engine_version?: string;
  created_at?: string;
  updated_at?: string;
}

export function buildInitialLegalCaseInputPayload(params: {
  id: string;
  organization_id: string;
  process_id: string;
  generation_job_id: string;
  user_id: string;
  basic_data: BasicDataSnapshot;
  legal_answers: LegalAnswersSnapshot;
  custom_texts: CustomTextsSnapshot;
  architecture_id: string | null;
  architecture_version: string | null;
  engine_version?: string;
}): LegalCaseInputPayload {
  return {
    id: params.id,
    organization_id: params.organization_id,
    process_id: params.process_id,
    generation_job_id: params.generation_job_id,
    user_id: params.user_id,
    basic_data: params.basic_data,
    legal_answers: params.legal_answers,
    custom_texts: params.custom_texts,
    derived_variables: INITIAL_EMPTY_DERIVED_VARIABLES,
    resolved_architecture: INITIAL_EMPTY_RESOLVED_ARCHITECTURE,
    architecture_id: params.architecture_id,
    architecture_version: params.architecture_version,
    engine_version: params.engine_version || DETERMINISTIC_ENGINE_VERSION,
  };
}

/**
 * 1. Mapeia os dados básicos do formulário para basic_data
 */
export function mapBasicData(formData: LegalFormData): BasicDataSnapshot {
  return {
    process_number: formData.process_number.trim(),
    court: `${formData.court_number}ª ${formData.court_type}`,
    district: formData.district.trim(),
    state: formData.uf,
    regional_forum: formData.court_regional?.trim() ? formData.court_regional.trim() : null,
    represented_party: formData.client.trim(),
    opposing_party: formData.opposing_party.trim(),
  };
}

/**
 * 2. Mapeia as escolhas forenses e teses jurídicas para legal_answers
 */
export function mapLegalAnswers(formData: LegalFormData): LegalAnswersSnapshot {
  const disputeObjectsList: string[] = [];

  if (formData.dispute_objects) {
    if (formData.dispute_objects.reajuste_anual) {
      disputeObjectsList.push(
        formData.dispute_objects.reajuste_anual_modalidade === 'individual'
          ? 'reajuste_anual_individual'
          : 'reajuste_anual_pme'
      );
    }
    if (formData.dispute_objects.reajuste_etario) {
      disputeObjectsList.push(
        formData.dispute_objects.reajuste_etario_modalidade === 'individual'
          ? 'reajuste_etario_individual'
          : 'reajuste_etario_pme'
      );
    }
    if (formData.dispute_objects.aviso_previo) {
      disputeObjectsList.push('aviso_previo');
    }
    if (formData.dispute_objects.premio_complementar) {
      disputeObjectsList.push('premio_complementar');
    }
    if (formData.dispute_objects.outro) {
      disputeObjectsList.push('outro');
    }
  }

  let legalAidTargets: string[] = [];
  if (formData.legal_aid_status === 'challenge' && formData.legal_aid_target) {
    legalAidTargets =
      formData.legal_aid_target === 'both' ? ['pf', 'pj'] : [formData.legal_aid_target];
  }

  return {
    document_type: formData.document_piece,
    opposing_party_nature: [...formData.adverse_party_nature],
    dispute_objects: disputeObjectsList,
    injunction_status: formData.injunction_status,
    moral_damages: formData.moral_damages_status,
    legal_aid: formData.legal_aid_status,
    legal_aid_targets: legalAidTargets,
    active_legitimacy: formData.standing_challenge_status,
    claim_value: formData.claim_value_challenge_status,
    initial_petition_aptitude: formData.petition_aptitude_status,
    three_year_limitation: formData.prescription_triennial_status,
    ten_year_limitation: formData.prescription_decennial_status,
    restitution: formData.repetition_status,
  };
}

/**
 * 3. Mapeia exatamente os textos literais fornecidos pelo usuário em custom_texts
 * SEM normalização, SEM reescrita e SEM uso de IA
 */
export function mapCustomTexts(formData: LegalFormData): CustomTextsSnapshot {
  const otherDesc =
    formData.dispute_objects?.outro && formData.dispute_objects?.outro_descricao?.trim()
      ? formData.dispute_objects.outro_descricao
      : null;

  return {
    executive_summary: formData.executive_summary,
    claim_summary: formData.claim_summary,
    controversy_delimitation: formData.controversy_delimitation,
    other_dispute_object: otherDesc,
    appeal_effect_suspensive: formData.appeal_effect_suspensive || '',
    appeal_mistaken_premise: formData.appeal_mistaken_premise || '',
    appeal_fumus: formData.appeal_fumus || '',
    appeal_periculum: formData.appeal_periculum || '',
    appeal_countersecurity: formData.appeal_countersecurity || '',
    appeal_final_requests: formData.appeal_final_requests || '',
  };
}

/**
 * 4. Extrai SOMENTE as variáveis efetivamente derivadas pelo motor
 * Não duplica todo o caseData e não insere conteúdo dos blocos jurídicos
 */
export function extractDerivedVariables(
  formData: LegalFormData,
  assembly: ResolvedDocumentAssembly
): Record<string, unknown> {
  const vars = assembly.resolvedVariables;

  return {
    JUIZO_ARTIGO: vars.JUIZO_ARTIGO,
    JUIZO_SUFFIX: vars.JUIZO_SUFFIX,
    REGIONAL_SE_HOUVER: vars.REGIONAL_SE_HOUVER,
    ESTADO_FULL: vars.ESTADO_FULL,
    CIDADE_ESTADO_DATA: vars.CIDADE_ESTADO_DATA,
    LISTA_OABS_PATRONO: vars.LISTA_OABS_PATRONO,
    ADVOGADO_OAB_ESPECIFICA: vars.ADVOGADO_OAB_ESPECIFICA,
  };
}

/**
 * 5. Estrutura o snapshot auditável da arquitetura resolvida
 * Não persiste o texto integral dos blocos jurídicos em resolved_architecture
 */
export function buildResolvedArchitectureSnapshot(
  assembly: ResolvedDocumentAssembly
): ResolvedArchitectureSnapshot {
  const included_blocks: AuditBlockSnapshot[] = assembly.evaluations
    .filter((e) => e.included)
    .map((e) => ({
      block_key: e.blockKey,
      included: true,
      reason: e.reason,
      trigger: e.block?.condition ? JSON.stringify(e.block.condition) : 'permanent_block',
      content_status: 'available',
    }));

  const excluded_blocks: AuditBlockSnapshot[] = assembly.evaluations
    .filter((e) => !e.included)
    .map((e) => ({
      block_key: e.blockKey,
      included: false,
      reason: e.reason,
      trigger: e.block?.condition ? JSON.stringify(e.block.condition) : 'condition_not_met',
      content_status: e.isAvailable ? 'available' : 'unavailable',
    }));

  const linked_requests: LinkedRequestSnapshot[] = assembly.includedRequests.map((r) => ({
    request_key: r.key,
    label: r.label,
    order: r.order,
    included: true,
  }));

  return {
    included_blocks,
    excluded_blocks,
    linked_requests,
    unresolved_requirements: [],
    resolution_metadata: {
      architecture_id: assembly.architecture.id,
      architecture_version: assembly.architecture.version,
      total_blocks_count: assembly.evaluations.length,
      included_blocks_count: included_blocks.length,
      excluded_blocks_count: excluded_blocks.length,
      linked_requests_count: linked_requests.length,
      resolved_at: new Date().toISOString(),
    },
  };
}
