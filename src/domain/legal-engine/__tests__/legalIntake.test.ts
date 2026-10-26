import assert from 'node:assert/strict';
import { applyLegalIntakeSuggestions, type LegalIntakeSuggestion } from '../legalIntake';
import { HOMOLOGATED_CASE_DEFAULTS } from '../formDefinitions';

const suggestions:LegalIntakeSuggestion[]=[
  {field:'process_number',status:'suggested',value:'4009025-83.2026.8.26.0704',confidence:'high',evidence:'Processo nº 4009025-83.2026.8.26.0704',page:1,explanation:'Capa'},
  {field:'uf',status:'suggested',value:'XX',confidence:'low',evidence:'',page:null,explanation:'Valor inválido'},
  {field:'adverse_party_nature',status:'suggested',value:'pf,pj,invasor',confidence:'medium',evidence:'Partes',page:1,explanation:'Polos'},
  {field:'dispute_objects',status:'suggested',value:'reajuste_anual_pme,codigo_invalido',confidence:'high',evidence:'Reajuste',page:2,explanation:'Objeto'},
  {field:'client',status:'not_found',value:'NÃO APLICAR',confidence:'low',evidence:'',page:null,explanation:'Ausente'},
];
const result=applyLegalIntakeSuggestions({...HOMOLOGATED_CASE_DEFAULTS,process_number:'',uf:'RJ'},suggestions,suggestions.map(item=>item.field));
assert.equal(result.data.process_number,'4009025-83.2026.8.26.0704');
assert.equal(result.data.uf,'RJ');
assert.deepEqual(result.data.adverse_party_nature,['pf','pj']);
assert.equal(result.data.dispute_objects.reajuste_anual,true);
assert.equal(result.data.client,HOMOLOGATED_CASE_DEFAULTS.client);
assert.deepEqual(result.appliedFields,['process_number','adverse_party_nature','dispute_objects']);
const manual=applyLegalIntakeSuggestions(result.data,[{...suggestions[4],status:'suggested',value:'Parte preenchida manualmente'}],['client']);
assert.equal(manual.data.client,'Parte preenchida manualmente');
console.log('VIPAZ legal intake: controlled application contract passed');
