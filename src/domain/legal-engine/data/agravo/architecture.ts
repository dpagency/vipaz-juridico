import type { FinalRequestItem, LegalArchitecture, LegalBlock } from '../../types.js';

const blocks: LegalBlock[] = [
  { key:'appeal_addressing', title:'ENDEREÇAMENTO', category:'addressing', order:10, contentType:'derived', version:'1.0.0', active:true, content:'EXCELENTÍSSIMO SENHOR DESEMBARGADOR PRESIDENTE DO TRIBUNAL DE JUSTIÇA {{ESTADO_FULL}}\n\nProcesso de origem nº {{PROCESS_NUMBER}}' },
  { key:'appeal_qualification', title:'INTERPOSIÇÃO', category:'facts', order:20, contentType:'derived', version:'1.0.0', active:true, content:'{{CLIENT}}, nos autos movidos por {{OPPOSING_PARTY}}, por seus advogados, interpõe AGRAVO DE INSTRUMENTO contra a decisão indicada nesta peça, com pedido de efeito suspensivo.' },
  { key:'appeal_executive_summary', title:'EMENTA EXECUTIVA', category:'executive_summary', order:30, contentType:'variable', version:'1.0.0', active:true, content:'EMENTA EXECUTIVA\n\n{{EXECUTIVE_SUMMARY}}' },
  { key:'appeal_object', title:'DO OBJETO DO RECURSO E SÍNTESE DA CONTROVÉRSIA', category:'controversy', order:40, contentType:'variable', version:'1.0.0', active:true, content:'DO OBJETO DO RECURSO E SÍNTESE DA CONTROVÉRSIA\n\n{{CLAIM_SUMMARY}}' },
  { key:'appeal_suspensive', title:'DA NECESSIDADE DE CONCESSÃO DE EFEITO SUSPENSIVO', category:'injunction', order:50, contentType:'variable', version:'1.0.0', active:true, content:'DA NECESSIDADE DE CONCESSÃO DE EFEITO SUSPENSIVO\n\n{{APPEAL_EFFECT_SUSPENSIVE}}' },
  { key:'appeal_mistaken_premise', title:'DA PREMISSA EQUIVOCADA DA DECISÃO RECORRIDA', category:'merits', order:60, contentType:'variable', version:'1.0.0', active:true, content:'DA PREMISSA EQUIVOCADA DA DECISÃO RECORRIDA\n\n{{APPEAL_MISTAKEN_PREMISE}}' },
  { key:'appeal_fumus', title:'DA INCONTESTÁVEL VEROSSIMILHANÇA OU PROBABILIDADE DO DIREITO (FUMUS BONI IURIS)', category:'merits', order:70, contentType:'variable', version:'1.0.0', active:true, content:'DA INCONTESTÁVEL VEROSSIMILHANÇA OU PROBABILIDADE DO DIREITO (FUMUS BONI IURIS)\n\n{{APPEAL_FUMUS}}' },
  { key:'appeal_periculum', title:'DO IMINENTE RISCO DE DANO GRAVE E DE DIFÍCIL REPARAÇÃO (PERICULUM IN MORA)', category:'merits', order:80, contentType:'variable', version:'1.0.0', active:true, content:'DO IMINENTE RISCO DE DANO GRAVE E DE DIFÍCIL REPARAÇÃO (PERICULUM IN MORA)\n\n{{APPEAL_PERICULUM}}' },
  { key:'appeal_countersecurity', title:'DO REQUERIMENTO SUBSIDIÁRIO DE CONTRACAUTELA CIVIL (ART. 300, § 1º, CPC)', category:'merits', order:90, contentType:'conditional', version:'1.0.0', active:true, content:'DO REQUERIMENTO SUBSIDIÁRIO DE CONTRACAUTELA CIVIL (ART. 300, § 1º, CPC)\n\n{{APPEAL_COUNTERSECURITY}}', condition:{ operator:'any', conditions:[{field:'dispute_objects.reajuste_anual',operator:'truthy'},{field:'dispute_objects.reajuste_etario',operator:'truthy'}] } },
  { key:'appeal_requests', title:'DOS REQUERIMENTOS', category:'requests', order:100, contentType:'variable', version:'1.0.0', active:true, content:'DOS REQUERIMENTOS\n\n{{APPEAL_FINAL_REQUESTS}}' },
  { key:'appeal_closing', title:'FECHAMENTO', category:'closing', order:110, contentType:'derived', version:'1.0.0', active:true, content:'Termos em que,\npede deferimento.\n\n{{CIDADE_ESTADO_DATA}}\n\n{{LISTA_OABS_PATRONO}}' },
];

const requests: FinalRequestItem[] = [
  { key:'appeal_req_knowledge', label:'a) conhecimento', order:10, contentType:'permanent', text:'a) o conhecimento do presente agravo de instrumento;' },
  { key:'appeal_req_suspensive', label:'b) efeito suspensivo', order:20, contentType:'permanent', text:'b) a concessão de efeito suspensivo, nos termos desenvolvidos na fundamentação;' },
  { key:'appeal_req_merits', label:'c) provimento', order:30, contentType:'permanent', text:'c) ao final, o provimento do recurso para reformar a decisão agravada;' },
  { key:'appeal_req_countersecurity', label:'d) contracautela', order:40, contentType:'conditional', text:'d) subsidiariamente, a fixação de contracautela civil idônea;', condition:{ operator:'any', conditions:[{field:'dispute_objects.reajuste_anual',operator:'truthy'},{field:'dispute_objects.reajuste_etario',operator:'truthy'}] } },
];

export const AGRAVO_INSTRUMENTO_ARCHITECTURE: LegalArchitecture = {
  id:'arch_agravo_instrumento_v1', documentPiece:'Agravo de Instrumento',
  title:'Agravo de Instrumento — Tutela de Urgência e Astreintes', version:'1.0.0', active:true,
  blocks, finalRequests:requests,
};
