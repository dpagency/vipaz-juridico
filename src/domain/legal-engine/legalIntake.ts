import type { AdversePartyNature, LegalFormData } from './types.js';

export interface LegalIntakeSuggestion {
  field: string;
  status: 'suggested'|'not_found';
  value: string;
  confidence: 'high'|'medium'|'low';
  evidence: string;
  page: number|null;
  explanation: string;
}

const TEXT_FIELDS = new Set<keyof LegalFormData>([
  'district','client','opposing_party','executive_summary','claim_summary','controversy_delimitation',
  'court_type_custom','appeal_demand_type','appeal_main_object','appealed_decision','appeal_initial_claim',
  'appeal_relevant_documents','appeal_contractual_documents','appeal_procedural_history','appeal_specific_instructions',
  'appeal_effect_suspensive','appeal_mistaken_premise','appeal_fumus','appeal_periculum','appeal_countersecurity','appeal_final_requests',
]);

export function applyLegalIntakeSuggestions(current:LegalFormData,suggestions:LegalIntakeSuggestion[],selectedFields:string[]){
  const next={...current,dispute_objects:{...current.dispute_objects}} as LegalFormData;
  const appliedFields:string[]=[];
  for(const item of suggestions){
    if(item.status!=='suggested'||!selectedFields.includes(item.field)||!item.value.trim()) continue;
    const value=item.value.trim(); let applied=false;
    if(item.field==='process_number'&&/^\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}$/.test(value)){next.process_number=value;applied=true;}
    else if(item.field==='court_number'&&/^\d+$/.test(value)){next.court_number=value;applied=true;}
    else if(item.field==='court_type'&&['Vara Cível','Juizado Especial Cível','Outro'].includes(value)){next.court_type=value as LegalFormData['court_type'];applied=true;}
    else if(item.field==='uf'&&['RJ','SP','MG','BA'].includes(value)){next.uf=value as LegalFormData['uf'];applied=true;}
    else if(item.field==='adverse_party_nature'){
      const parties=value.split(',').map(entry=>entry.trim()).filter((entry):entry is AdversePartyNature=>entry==='pf'||entry==='pj');
      if(parties.length){next.adverse_party_nature=[...new Set(parties)];applied=true;}
    }else if(item.field==='dispute_objects'){
      const codes=new Set(value.split(',').map(entry=>entry.trim()));
      const known=['reajuste_anual_pme','reajuste_anual_individual','reajuste_etario_pme','reajuste_etario_individual','aviso_previo','premio_complementar','outro'];
      if(known.some(code=>codes.has(code))){next.dispute_objects={reajuste_anual:codes.has('reajuste_anual_pme')||codes.has('reajuste_anual_individual'),reajuste_anual_modalidade:codes.has('reajuste_anual_individual')?'individual':'pme',reajuste_etario:codes.has('reajuste_etario_pme')||codes.has('reajuste_etario_individual'),reajuste_etario_modalidade:codes.has('reajuste_etario_individual')?'individual':'pme',aviso_previo:codes.has('aviso_previo'),premio_complementar:codes.has('premio_complementar'),outro:codes.has('outro'),outro_descricao:next.dispute_objects.outro_descricao||''};applied=true;}
    }else if(item.field==='dispute_objects.outro_descricao'){next.dispute_objects.outro_descricao=value;applied=true;}
    else if(TEXT_FIELDS.has(item.field as keyof LegalFormData)){(next as unknown as Record<string,string>)[item.field]=value;applied=true;}
    if(applied) appliedFields.push(item.field);
  }
  if(!next.dispute_objects.reajuste_anual&&!next.dispute_objects.reajuste_etario) next.appeal_countersecurity='';
  return {data:next,appliedFields};
}
