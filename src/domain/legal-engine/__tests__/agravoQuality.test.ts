import assert from 'node:assert/strict';
import { validateAgravoDraft, normalizeAgravoText, normalizeAgravoFields } from '../agravoQuality';

const base:any={document_piece:'Agravo de Instrumento',appealed_decision:'Decisão que fixou astreintes à luz do art. 537 do CPC.',executive_summary:'AGRAVO DE INSTRUMENTO. ASTREINTES EXCESSIVAS\n1. Probabilidade do direito.\n2. Risco de dano.',claim_summary:'Síntese.',appeal_effect_suspensive:'Fundamento.',appeal_mistaken_premise:'O art. 537 do CPC exige compatibilidade.',appeal_fumus:'Probabilidade.',appeal_periculum:'Risco.',appeal_final_requests:'Requer o provimento.',appeal_countersecurity:'',dispute_objects:{reajuste_anual:false,reajuste_etario:false}};
assert.equal(validateAgravoDraft(base).length,0);
assert(validateAgravoDraft({...base,executive_summary:'x'.repeat(2001)}).some(e=>e.field==='executive_summary'));
assert(validateAgravoDraft({...base,dispute_objects:{reajuste_anual:true},appeal_countersecurity:''}).some(e=>e.field==='appeal_countersecurity'));
assert.equal(normalizeAgravoText('O Autor pede... Ao Juízo.'),'O autor pede. Ao juízo.');
assert.equal(normalizeAgravoFields({appeal_fumus:'Aplica-se o art. 537 do CPC. O comando deve ser revisto.'}).appeal_fumus,'Aplica-se o art. 537 do CPC.\n\nO comando deve ser revisto.');
console.log('VIPAZ Agravo quality contract: 5 checks passed');
