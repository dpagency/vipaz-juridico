import * as tus from 'tus-js-client';
import { supabase } from '../lib/supabase';
import { normalizeAgravoFields } from '../domain/legal-engine/agravoQuality';
import type { LegalIntakeSuggestion } from '../domain/legal-engine/legalIntake';

export type LegalAiField =
 | 'appealed_decision' | 'executive_summary' | 'claim_summary' | 'controversy_delimitation'
 | 'appeal_effect_suspensive' | 'appeal_mistaken_premise' | 'appeal_fumus'
 | 'appeal_periculum' | 'appeal_countersecurity' | 'appeal_final_requests';

export type CompleteAppealDraft = Record<LegalAiField, string>;
export type { LegalIntakeSuggestion } from '../domain/legal-engine/legalIntake';

function safeFilename(name: string): string {
  return (name || 'autos.pdf')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(-120);
}

function getProjectId(): string {
  const url = String(import.meta.env.VITE_SUPABASE_URL || '');
  try {
    return new URL(url).hostname.split('.')[0] || '';
  } catch {
    return '';
  }
}

async function uploadPdfResumable(
  file: File,
  storagePath: string,
  accessToken: string
): Promise<void> {
  const projectId = getProjectId();
  if (!projectId) {
    throw new Error('Configuração do Supabase Storage não identificada.');
  }

  const endpoint = `https://${projectId}.storage.supabase.co/storage/v1/upload/resumable`;

  await new Promise<void>((resolve, reject) => {
    const upload = new tus.Upload(file, {
      endpoint,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: {
        authorization: `Bearer ${accessToken}`,
        'x-upsert': 'false',
      },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      chunkSize: 6 * 1024 * 1024,
      metadata: {
        bucketName: 'source-documents',
        objectName: storagePath,
        contentType: 'application/pdf',
        cacheControl: '3600',
      },
      onError(error) {
        console.error('[VIPAZ][LegalAI][Storage][TUS]', error);
        reject(
          new Error(
            `Falha no upload seguro e retomável dos autos: ${error.message || 'erro de comunicação com o Storage.'}`
          )
        );
      },
      onSuccess() {
        resolve();
      },
    });

    upload.findPreviousUploads()
      .then((previousUploads) => {
        if (previousUploads.length > 0) {
          upload.resumeFromPreviousUpload(previousUploads[0]);
        }
        upload.start();
      })
      .catch((error) => {
        console.error('[VIPAZ][LegalAI][Storage][TUS][resume]', error);
        reject(new Error('Não foi possível iniciar o upload seguro dos autos.'));
      });
  });
}

export const legalAiService={
 async prepareSource(sourcePdf:File, organizationId:string){
   const {data:{session}}=await supabase.auth.getSession();
   if(!session?.access_token) throw new Error('Sessão expirada. Entre novamente para usar a assistência por IA.');
   if(!sourcePdf || (sourcePdf.type || 'application/pdf') !== 'application/pdf') throw new Error('Anexe os autos processuais em PDF.');
   const requestId=crypto.randomUUID();
   const storagePath=`${organizationId}/ai/${requestId}/${safeFilename(sourcePdf.name)}`;
   await uploadPdfResumable(sourcePdf,storagePath,session.access_token);
   return {accessToken:session.access_token,sourcePdf:{name:sourcePdf.name,mime_type:'application/pdf',storage_path:storagePath}};
 },
 async generatePrepared(field:LegalAiField,context:Record<string,unknown>,prepared:{accessToken:string;sourcePdf:{name:string;mime_type:string;storage_path:string}}):Promise<string>{
   const response=await fetch('/api/ai/legal-field',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${prepared.accessToken}`},body:JSON.stringify({field,context,source_pdf:prepared.sourcePdf})});
   const body=await response.json().catch(()=>({}));
   if(!response.ok) throw new Error(body?.error||`Falha na geração assistida (HTTP ${response.status}).`);
   const content=String(body.content||'').trim();
   if(!content) throw new Error('A geração assistida não retornou conteúdo utilizável.');
   return content;
 },
 async resolvePending(context:Record<string,unknown>,sourcePdf:File,organizationId:string,pendingFields:string[]):Promise<LegalIntakeSuggestion[]>{
   if(!organizationId) throw new Error('Organização não identificada para a triagem assistida.');
   const prepared=await this.prepareSource(sourcePdf,organizationId);
   const response=await fetch('/api/ai/legal-intake',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${prepared.accessToken}`},body:JSON.stringify({context,pending_fields:pendingFields,source_pdf:prepared.sourcePdf})});
   const body=await response.json().catch(()=>({}));
   if(!response.ok) throw new Error(body?.error||`Falha na triagem assistida (HTTP ${response.status}).`);
   if(!Array.isArray(body.suggestions)) throw new Error('A triagem assistida retornou um formato inválido.');
   return body.suggestions as LegalIntakeSuggestion[];
 },
 async generateCompleteAppeal(context:Record<string,unknown>,sourcePdf:File,organizationId:string,onProgress?:(message:string,current:number,total:number)=>void):Promise<CompleteAppealDraft>{
   onProgress?.('Armazenando os autos com segurança…',0,9);
   const prepared=await this.prepareSource(sourcePdf,organizationId);
   const fields:LegalAiField[]=['appealed_decision','executive_summary','claim_summary','controversy_delimitation','appeal_effect_suspensive','appeal_mistaken_premise','appeal_fumus','appeal_periculum',...(context.countersecurity_allowed?['appeal_countersecurity' as LegalAiField]:[]),'appeal_final_requests'];
   const result={} as CompleteAppealDraft;
   for(let index=0;index<fields.length;index++){
     const field=fields[index];
     onProgress?.(`Redigindo ${index+1} de ${fields.length}: ${field.replace(/_/g,' ')}…`,index+1,fields.length);
     result[field]=await this.generatePrepared(field,context,prepared);
   }
   if(!context.countersecurity_allowed) result.appeal_countersecurity='';
   return normalizeAgravoFields(result);
 },
 async generate(
   field:LegalAiField,
   context:Record<string,unknown>,
   sourcePdf:File,
   organizationId:string
 ):Promise<string>{
   if(!organizationId) throw new Error('Organização não identificada para armazenamento seguro dos autos.');
   const prepared=await this.prepareSource(sourcePdf,organizationId);
   return this.generatePrepared(field,context,prepared);
 }
};
