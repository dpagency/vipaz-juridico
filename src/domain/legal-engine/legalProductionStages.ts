export const FACTUAL_INTAKE_FIELDS = [
  'process_number',
  'court_number',
  'court_type',
  'court_type_custom',
  'district',
  'uf',
  'client',
  'opposing_party',
  'adverse_party_nature',
  'dispute_objects',
  'dispute_objects.outro_descricao',
  'appeal_demand_type',
  'appeal_main_object',
  'appealed_decision',
  'appeal_initial_claim',
  'appeal_relevant_documents',
  'appeal_contractual_documents',
  'appeal_procedural_history',
  'appeal_specific_instructions',
] as const;

export const AGRAVO_DRAFT_FIELDS = [
  'executive_summary',
  'claim_summary',
  'appeal_effect_suspensive',
  'appeal_mistaken_premise',
  'appeal_fumus',
  'appeal_periculum',
  'appeal_countersecurity',
  'appeal_final_requests',
] as const;

export type FactualIntakeField = typeof FACTUAL_INTAKE_FIELDS[number];
export type AgravoDraftField = typeof AGRAVO_DRAFT_FIELDS[number];

const factualFieldSet = new Set<string>(FACTUAL_INTAKE_FIELDS);
const draftFieldSet = new Set<string>(AGRAVO_DRAFT_FIELDS);

export function isFactualIntakeField(field: string): field is FactualIntakeField {
  return factualFieldSet.has(field);
}

export function isAgravoDraftField(field: string): field is AgravoDraftField {
  return draftFieldSet.has(field);
}

export const AGRAVO_DRAFT_LABELS: Record<AgravoDraftField, string> = {
  executive_summary: 'Ementa executiva',
  claim_summary: 'Objeto do recurso e síntese da controvérsia',
  appeal_effect_suspensive: 'Efeito suspensivo',
  appeal_mistaken_premise: 'Premissa equivocada da decisão',
  appeal_fumus: 'Probabilidade do direito',
  appeal_periculum: 'Risco de dano grave',
  appeal_countersecurity: 'Contracautela civil',
  appeal_final_requests: 'Requerimentos finais',
};

