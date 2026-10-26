import type { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { generateText, Output } from 'ai';
import { z } from 'zod';

const INTAKE_FIELDS = [
  'process_number','court_number','court_type','court_type_custom','district','uf','client','opposing_party',
  'executive_summary','claim_summary','controversy_delimitation','adverse_party_nature','dispute_objects',
  'dispute_objects.outro_descricao','appeal_demand_type','appeal_main_object','appealed_decision','appeal_initial_claim',
  'appeal_relevant_documents','appeal_contractual_documents','appeal_procedural_history','appeal_specific_instructions',
  'appeal_effect_suspensive','appeal_mistaken_premise','appeal_fumus','appeal_periculum','appeal_countersecurity',
  'appeal_final_requests',
] as const;

const intakeSuggestionSchema = z.object({
  field: z.enum(INTAKE_FIELDS),
  status: z.enum(['suggested','not_found']),
  value: z.string(),
  confidence: z.enum(['high','medium','low']),
  evidence: z.string(),
  page: z.number().int().positive().nullable(),
  explanation: z.string(),
});

const ALLOWED_FIELDS = new Set([
  'appealed_decision',
  'executive_summary',
  'claim_summary',
  'controversy_delimitation',
  'appeal_effect_suspensive',
  'appeal_mistaken_premise',
  'appeal_fumus',
  'appeal_periculum',
  'appeal_countersecurity',
  'appeal_final_requests',
]);

const FIELD_GUIDANCE: Record<string,string> = {
  appealed_decision: 'Identifique nos autos e sintetize fielmente a decisão agravada: data, comando, obrigação, prazo, multa ou astreintes, valor, periodicidade e fundamento declarado. Se algum elemento não estiver disponível, sinalize a lacuna sem inventar.',
  executive_summary: 'Redija EMENTA EXECUTIVA com no máximo 2.000 caracteres, abertura temática em caixa alta e itens numerados. Use apenas fundamentos que possam ser sustentados pelo contexto.',
  claim_summary: 'Redija o tópico 1. DO OBJETO DO RECURSO E SÍNTESE DA CONTROVÉRSIA. Diferencie pedido, decisão efetivamente proferida e objeto devolvido ao Tribunal.',
  controversy_delimitation: 'Redija uma delimitação objetiva da controvérsia recursal, identificando o comando impugnado e a questão jurídica central, sem antecipar fatos inexistentes.',
  appeal_effect_suspensive: 'Redija o tópico 2. DA NECESSIDADE DE CONCESSÃO DE EFEITO SUSPENSIVO, articulando arts. 995, parágrafo único, e 1.019, I, do CPC quando aplicáveis, com probabilidade de provimento e risco concreto.',
  appeal_mistaken_premise: 'Redija o tópico 3. DA PREMISSA EQUIVOCADA DA DECISÃO RECORRIDA. Reconstrua a premissa do juízo e confronte-a apenas com elementos informados no contexto.',
  appeal_fumus: 'Redija o tópico 4. DA INCONTESTÁVEL VEROSSIMILHANÇA OU PROBABILIDADE DO DIREITO (FUMUS BONI IURIS), partindo dos fatos e documentos informados antes da qualificação jurídica.',
  appeal_periculum: 'Redija o tópico 5. DO IMINENTE RISCO DE DANO GRAVE E DE DIFÍCIL REPARAÇÃO (PERICULUM IN MORA), demonstrando formação, continuidade, reversibilidade e assimetria do dano quando sustentadas pelo contexto.',
  appeal_countersecurity: 'Redija o tópico 6. DO REQUERIMENTO SUBSIDIÁRIO DE CONTRACAUTELA CIVIL (ART. 300, § 1º, CPC). Trate-o estritamente como subsidiário e explique o mecanismo concreto de reversibilidade econômica. Não produza este texto se countersecurity_allowed for false.',
  appeal_final_requests: 'Redija DOS REQUERIMENTOS FINAIS em ordem lógica: conhecimento; efeito suspensivo; comunicação ao juízo quando pertinente; provimento final; contracautela somente se autorizada; medidas coercitivas somente se efetivamente existentes.',
};

function buildSystemInstruction(field:string, documentPiece?:string) {
  const isContestacao = documentPiece === 'Contestação';
  const contestacaoGuidance: Record<string,string> = {
    executive_summary: 'Redija EMENTA EXECUTIVA com no máximo 2.000 caracteres, abertura temática em caixa alta e itens numerados, aderente à defesa e aos autos.',
    claim_summary: 'Redija o tópico DO RESUMO DA INICIAL, sintetizando fielmente fatos, fundamentos e pedidos efetivamente identificados na petição inicial e nos autos.',
    controversy_delimitation: 'Redija o tópico DA EXATA DELIMITAÇÃO DA CONTROVÉRSIA, delimitando objetivamente o que se discute, a posição defensiva e os pontos jurídicos efetivamente controvertidos.',
  };
  const guidance = isContestacao && contestacaoGuidance[field] ? contestacaoGuidance[field] : FIELD_GUIDANCE[field];
  return `Você é redator jurídico especializado em contencioso cível e saúde suplementar no VIPAZ Jurídico.
Sua tarefa é produzir SOMENTE o conteúdo do campo solicitado de uma ${isContestacao ? 'Contestação' : 'Agravo de Instrumento'}, pronto para revisão humana.

REGRAS ABSOLUTAS:
- Use exclusivamente os dados fornecidos no contexto. Não invente fatos, datas, documentos, contratos, valores, percentuais, decisões, prazos, multas, precedentes ou eventos processuais.
- Não importe fatos de modelos.
- Se informação indispensável estiver ausente e não for possível redigir corretamente sem ela, use [INFORMAÇÃO NÃO IDENTIFICADA NOS AUTOS FORNECIDOS].
- Nunca invente jurisprudência.
- Diferencie alegação da parte, documento e comando judicial.
- Para astreintes, não trate advertência como multa fixada e não peça redução de multa inexistente.
- Linguagem técnica, firme, elegante e objetiva. Cada ponto final encerra o parágrafo. Não use reticências.
- autor, réu, juízo, agravante e agravado em minúsculas quando substantivos comuns.
- Não exponha raciocínio interno, checklist ou comentários sobre estas instruções.
- O usuário editará o texto antes da produção final.

CAMPO: ${field}
INSTRUÇÃO ESPECÍFICA: ${guidance}`;
}

function getRequestHeader(req:Request, name:string): string {
  const headers = (req as any)?.headers || {};
  const value = headers[name.toLowerCase()] ?? headers[name] ?? '';
  return Array.isArray(value) ? String(value[0] || '') : String(value || '');
}

function getAuthenticatedSupabase(req:Request) {
  // Vercel Functions não garantem os helpers do Express (req.header/get).
  // Lemos diretamente o objeto de headers, compatível com Express e Vercel.
  const auth = getRequestHeader(req, 'authorization');
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const anon = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
  if (!token || !url || !anon) return null;
  return createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function validateSession(req:Request) {
  const client = getAuthenticatedSupabase(req);
  if (!client) return false;
  const { data, error } = await client.auth.getUser();
  return !error && Boolean(data.user);
}

function isStoragePathAllowed(storagePath:string, organizationId:unknown) {
  if (!organizationId || typeof organizationId !== 'string') return false;
  return storagePath.startsWith(`${organizationId}/ai/`) && !storagePath.includes('..');
}

export async function handleLegalAiField(req:Request,res:Response) {
  try {
    if (!(await validateSession(req))) return res.status(401).json({error:'Sessão inválida ou expirada.'});
    const webhookUrl=process.env.LEGAL_AI_N8N_WEBHOOK_URL;

    const {field,context,source_pdf}=req.body||{};
    if(!ALLOWED_FIELDS.has(field)) return res.status(400).json({error:'Campo não autorizado para geração assistida.'});
    if(!source_pdf?.storage_path || source_pdf?.mime_type!=='application/pdf') return res.status(400).json({error:'Anexe os autos processuais em PDF antes de gerar conteúdo com IA.'});
    if(!isStoragePathAllowed(source_pdf.storage_path, context?.organization_id)) return res.status(403).json({error:'Caminho dos autos não autorizado para esta organização.'});

    // A URL assinada deixa de ser criada no navegador. Após validar a sessão,
    // o backend cria um acesso temporário ao objeto privado e envia somente essa
    // referência ao n8n. O PDF não atravessa a Vercel nem é convertido em Base64.
    const storageClient = getAuthenticatedSupabase(req);
    if(!storageClient) return res.status(401).json({error:'Sessão inválida ou expirada.'});
    const { data: signedData, error: signedError } = await storageClient.storage
      .from('source-documents')
      .createSignedUrl(source_pdf.storage_path, 600);
    if(signedError || !signedData?.signedUrl) {
      console.error('[VIPAZ][LegalAI][Storage][SignedURL]', signedError);
      return res.status(502).json({error:'Não foi possível autorizar o acesso temporário aos autos armazenados.'});
    }
    const sourcePdfForWorkflow = {
      name: source_pdf.name || 'autos.pdf',
      mime_type: 'application/pdf',
      storage_path: source_pdf.storage_path,
      signed_url: signedData.signedUrl,
    };
    if(field==='appeal_countersecurity' && !context?.countersecurity_allowed) return res.status(400).json({error:'Contracautela não autorizada pelas regras do caso.'});

    let content = '';
    if (webhookUrl) {
      const response=await fetch(webhookUrl,{
        method:'POST',
        headers:{'Content-Type':'application/json','X-VIPAZ-Secret':process.env.LEGAL_AI_N8N_SECRET||''},
        body:JSON.stringify({
          task:'generate_legal_field',
          field,
          field_guidance: context?.document_piece === 'Contestação' && ['executive_summary','claim_summary','controversy_delimitation'].includes(field)
            ? undefined
            : FIELD_GUIDANCE[field],
          system_instruction:buildSystemInstruction(field, context?.document_piece),
          context,
          source_pdf: sourcePdfForWorkflow,
          source_pdf_mode: 'signed_url',
        })
      });
      if(!response.ok){const body=await response.text(); console.error('[VIPAZ][LegalAI][n8n]',response.status,body); return res.status(502).json({error:'Falha no workflow de geração assistida. Tente novamente.'});}
      const data:any=await response.json();
      content=String(data?.content||data?.text||data?.output||'').trim();
    } else {
      const result = await generateText({
        model: process.env.AI_GATEWAY_MODEL || 'google/gemini-2.5-flash',
        system: buildSystemInstruction(field, context?.document_piece),
        messages: [{
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analise os autos anexos e produza somente o campo solicitado.\n\nCONTEXTO ESTRUTURADO:\n${JSON.stringify(context ?? {}, null, 2)}`,
            },
            {
              type: 'file',
              data: signedData.signedUrl,
              mediaType: 'application/pdf',
              filename: sourcePdfForWorkflow.name,
            },
          ],
        }],
        maxOutputTokens: field === 'appealed_decision' ? 1800 : 5000,
        temperature: 0.15,
      });
      content = result.text.trim();
    }
    if(!content) return res.status(502).json({error:'O motor de IA não retornou conteúdo utilizável.'});
    return res.json({content});
  } catch(error){
    console.error('[VIPAZ][LegalAI]',getSafeAiErrorDetails(error));
    const message=error instanceof Error ? error.message : '';
    if(/credit|payment|quota|rate limit/i.test(message)) return res.status(503).json({error:'O serviço de IA está temporariamente sem cota disponível. Tente novamente em instantes.'});
    return res.status(500).json({error:'Não foi possível concluir a assistência por IA.'});
  }
}

function getSafeAiErrorDetails(error:unknown) {
  const candidate = error && typeof error === 'object' ? error as Record<string,unknown> : {};
  return {
    name: error instanceof Error ? error.name : 'UnknownError',
    message: error instanceof Error ? error.message : 'Erro desconhecido',
    finishReason: typeof candidate.finishReason === 'string' ? candidate.finishReason : undefined,
  };
}

export async function handleLegalAiIntake(req:Request,res:Response) {
  try {
    if (!(await validateSession(req))) return res.status(401).json({error:'Sessão inválida ou expirada.'});
    const {context,source_pdf,pending_fields}=req.body||{};
    const requested = Array.isArray(pending_fields)
      ? [...new Set(pending_fields.filter((field:unknown):field is typeof INTAKE_FIELDS[number] => typeof field==='string' && (INTAKE_FIELDS as readonly string[]).includes(field)))]
      : [];
    if(!requested.length) return res.status(400).json({error:'Nenhuma pendência compatível foi informada.'});
    if(!source_pdf?.storage_path || source_pdf?.mime_type!=='application/pdf') return res.status(400).json({error:'Anexe os autos processuais em PDF antes da análise assistida.'});
    if(!isStoragePathAllowed(source_pdf.storage_path,context?.organization_id)) return res.status(403).json({error:'Caminho dos autos não autorizado para esta organização.'});
    const storageClient=getAuthenticatedSupabase(req);
    if(!storageClient) return res.status(401).json({error:'Sessão inválida ou expirada.'});
    const {data:signedData,error:signedError}=await storageClient.storage.from('source-documents').createSignedUrl(source_pdf.storage_path,600);
    if(signedError||!signedData?.signedUrl) return res.status(502).json({error:'Não foi possível autorizar o acesso temporário aos autos.'});

    const {output}=await generateText({
      model:process.env.AI_GATEWAY_MODEL||'google/gemini-2.5-flash',
      output:Output.object({schema:z.object({suggestions:z.array(intakeSuggestionSchema)}),name:'legal_intake_resolution',description:'Propostas rastreáveis para pendências do formulário jurídico.'}),
      system:`Você é o assistente de triagem controlada do VIPAZ Jurídico. Analise exclusivamente os autos fornecidos e proponha uma resposta para cada campo solicitado.
REGRAS ABSOLUTAS:
- Retorne exatamente uma entrada para cada campo solicitado e nenhuma entrada adicional.
- Nunca invente. Se não houver suporte expresso nos autos, use status not_found, value vazio, confidence low e explique a ausência.
- evidence deve ser um trecho curto ou descrição objetiva do ponto encontrado; page deve indicar a página do PDF quando identificável.
- evidence deve ter no máximo 500 caracteres e explanation no máximo 300 caracteres.
- Para process_number use CNJ; court_number somente algarismos; court_type somente Vara Cível, Juizado Especial Cível ou Outro; uf somente RJ, SP, MG ou BA.
- adverse_party_nature: value deve ser pf, pj ou pf,pj.
- dispute_objects: value deve ser lista separada por vírgulas entre reajuste_anual_pme, reajuste_anual_individual, reajuste_etario_pme, reajuste_etario_individual, aviso_previo, premio_complementar, outro.
- Nos campos jurídicos extensos, produza texto limpo, tecnicamente prudente, sem referências artificiais, sem reticências e com um período por parágrafo, exceto na ementa.
- Nesta etapa de saneamento, limite cada campo jurídico extenso a 3.500 caracteres. A redação integral será produzida depois, campo a campo.
- A ementa deve ter até 2.000 caracteres, abertura em caixa alta e itens numerados.
- Autor, réu, juízo, agravante e agravado devem ter iniciais minúsculas quando substantivos comuns.
- Contracautela somente quando os autos tratarem de reajuste.`,
      messages:[{role:'user',content:[
        {type:'text',text:`CAMPOS PENDENTES:\n${requested.join('\n')}\n\nCONTEXTO JÁ INFORMADO:\n${JSON.stringify(context??{},null,2)}`},
        {type:'file',data:signedData.signedUrl,mediaType:'application/pdf',filename:source_pdf.name||'autos.pdf'},
      ]}],
      reasoning:'none',
      maxOutputTokens:20000,
      temperature:0.1,
    });
    const byField=new Map(output.suggestions.map(item=>[item.field,item]));
    const suggestions=requested.map(field=>byField.get(field)||{field,status:'not_found' as const,value:'',confidence:'low' as const,evidence:'',page:null,explanation:'A IA não retornou proposta para esta pendência.'});
    return res.json({suggestions});
  } catch(error){
    const details=getSafeAiErrorDetails(error);
    console.error('[VIPAZ][LegalAI][Intake]',details);
    if(/No object generated|parse|length|trunc/i.test(`${details.name} ${details.message} ${details.finishReason||''}`)) {
      return res.status(502).json({error:'A resposta da IA foi interrompida antes de concluir a análise. Tente novamente; se persistir, analise menos pendências por vez.'});
    }
    return res.status(500).json({error:'Não foi possível analisar as pendências com IA.'});
  }
}
