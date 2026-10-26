import type { LegalFormData, ValidationError } from './types.js';

export const AGRAVO_GENERATED_FIELDS = [
  'executive_summary','claim_summary','appeal_effect_suspensive','appeal_mistaken_premise',
  'appeal_fumus','appeal_periculum','appeal_countersecurity','appeal_final_requests',
] as const;

const roleUppercase = /\b(Autor|Réu|Juízo|Agravante|Agravado|Recorrente|Recorrido)\b/g;
const ellipsis = /\.\.\.|…/;

export function normalizeAgravoText(value: string): string {
  return String(value || '')
    .replace(/\.\.\.|…/g, '.')
    .replace(roleUppercase, match => match.toLocaleLowerCase('pt-BR'))
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function enforceOneSentencePerParagraph(value: string): string {
  const protectedText = value
    .replace(/\b(art|arts|inc|al|n|nº|p|pp|fl|fls|Dr|Dra)\./gi, '$1∯')
    .replace(/(\d)\.(\d)/g, '$1∯$2');
  return protectedText
    .replace(/([.!?])\s+(?=[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ])/g, '$1\n\n')
    .replace(/∯/g, '.')
    .replace(/\n{3,}/g, '\n\n');
}

export function validateAgravoDraft(data: Partial<LegalFormData>): ValidationError[] {
  if (data.document_piece !== 'Agravo de Instrumento') return [];
  const errors: ValidationError[] = [];
  const required: Array<[keyof LegalFormData, string]> = [
    ['appealed_decision','Informe ou extraia a decisão agravada.'],
    ['executive_summary','Gere a ementa executiva.'],
    ['claim_summary','Gere o objeto do recurso e a síntese da controvérsia.'],
    ['appeal_effect_suspensive','Gere a fundamentação do efeito suspensivo.'],
    ['appeal_mistaken_premise','Gere a análise da premissa equivocada.'],
    ['appeal_fumus','Gere a probabilidade do direito.'],
    ['appeal_periculum','Gere o risco de dano.'],
    ['appeal_final_requests','Gere os requerimentos finais.'],
  ];
  for (const [field, message] of required) if (!String(data[field] || '').trim()) errors.push({ field:String(field), message });
  const hasReadjustment = Boolean(data.dispute_objects?.reajuste_anual || data.dispute_objects?.reajuste_etario);
  if (hasReadjustment && !data.appeal_countersecurity?.trim()) errors.push({ field:'appeal_countersecurity', message:'A contracautela é obrigatória quando a lide envolve reajuste.' });
  if (!hasReadjustment && data.appeal_countersecurity?.trim()) errors.push({ field:'appeal_countersecurity', message:'Remova a contracautela: o objeto selecionado não envolve reajuste.' });
  const ementa = String(data.executive_summary || '').trim();
  if (ementa.length > 2000) errors.push({ field:'executive_summary', message:`A ementa possui ${ementa.length} caracteres; o limite é 2.000.` });
  if (ementa && !/^([A-ZÁÀÂÃÉÊÍÓÔÕÚÇ0-9][A-ZÁÀÂÃÉÊÍÓÔÕÚÇ0-9 ,;:()§ºª./–—-]{15,})(?:\n|$)/.test(ementa)) errors.push({ field:'executive_summary', message:'A ementa deve começar por uma síntese temática em caixa alta.' });
  if (ementa && !/(?:^|\n)\s*1[.)-]\s+/m.test(ementa)) errors.push({ field:'executive_summary', message:'A ementa deve conter uma segunda parte em itens numerados.' });
  const body = AGRAVO_GENERATED_FIELDS.map(field => String(data[field] || '')).join('\n');
  if (ellipsis.test(body)) errors.push({ field:'document_piece', message:'O texto contém reticências, que não são permitidas.' });
  if (/\b(Autor|Réu|Juízo|Agravante|Agravado|Recorrente|Recorrido)\b/.test(body)) errors.push({ field:'document_piece', message:'Autor, réu, juízo e correlatos devem ter inicial minúscula no corpo.' });
  const article537Context = [data.appealed_decision, data.appeal_mistaken_premise, data.appeal_fumus, data.appeal_final_requests].join('\n');
  if (!/(?:art(?:igo)?\.?\s*537|astreinte|multa cominatória)/i.test(article537Context)) errors.push({ field:'appeal_mistaken_premise', message:'A peça deve enfrentar expressamente o art. 537 do CPC ou as astreintes do caso.' });
  return errors;
}

export function normalizeAgravoFields<T extends Record<string, string>>(fields: T): T {
  return Object.fromEntries(Object.entries(fields).map(([key,value]) => {
    const normalized = normalizeAgravoText(value);
    return [key, key === 'executive_summary' ? normalized : enforceOneSentencePerParagraph(normalized)];
  })) as T;
}
