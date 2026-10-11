/**
 * VIPAZ Jurídico — Motor Determinístico de Montagem Jurídica
 * Fase 5: Endpoint Server-Side para Integração Nativa com o Webhook DOCX CAW (n8n / Carbone)
 * 
 * Regras:
 * - Valida autorização e sessão.
 * - Identifica organization_id estritamente a partir do contexto autenticado / snapshot persistido.
 * - Reutiliza a montagem do AssemblyEngine determinístico existente.
 * - Constrói o payload documental homologado via buildCawDocxPayload.
 * - Chama o webhook de produção: https://agencia-asserto.app.n8n.cloud/webhook/vipaz/caw/docx
 * - Trata timeouts e respostas HTTP sem expor segredos.
 * - Confirma o registro em public.generated_documents.
 * - Gera URL assinada temporária para download seguro.
 */

import { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import {
  assembleDocumentFromSnapshot,
} from '../services/experimentalDocxService.js';
import { buildCawDocxPayload } from '../domain/legal-engine/documentPayloadMapper.js';
import { PersistedLegalCaseInput } from '../domain/legal-engine/caseDataMapper.js';


export async function handleGenerateDocx(req: Request, res: Response): Promise<void> {
  const startTime = Date.now();

  try {
    const { generation_job_id } = req.body || {};

    if (!generation_job_id || typeof generation_job_id !== 'string' || !generation_job_id.trim()) {
      res.status(400).json({
        success: false,
        error: 'O parâmetro generation_job_id é obrigatório e deve ser uma string válida.',
      });
      return;
    }

    const cleanJobId = generation_job_id.trim();

    // 1. Cliente Supabase com repasse do token de autorização do usuário (se fornecido)
    const authHeader = req.headers.authorization;
    const supabaseUrl =
      process.env.VITE_SUPABASE_URL ||
      process.env.SUPABASE_URL ||
      '';
    const supabaseAnonKey =
      process.env.VITE_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      '';

    const token = /^Bearer\s+(.+)$/i.exec(authHeader || '')?.[1];
    if (!token) { res.status(401).json({ success: false, error: 'Autenticação necessária.' }); return; }
    if (!supabaseUrl || !supabaseAnonKey) { res.status(503).json({ success: false, error: 'Supabase não configurado.' }); return; }
    const client = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: 'Bearer ' + token } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: identity, error: identityError } = await client.auth.getUser(token);
    if (identityError || !identity.user) {
      res.status(401).json({ success: false, error: 'Sessão inválida.' }); return;
    }

    // 2. Localizar o generation_job e recuperar a organization_id autêntica
    let organizationId: string | null = null;
    let finalJobId = cleanJobId;
    let snapshot: PersistedLegalCaseInput | null = null;

    // Tenta primeiro em public.generation_jobs
    try {
      const { data: jobData, error: jobErr } = await client
        .from('generation_jobs')
        .select('*')
        .eq('id', cleanJobId)
        .maybeSingle();

      if (!jobErr && jobData) {
        organizationId = jobData.organization_id;
      }
    } catch (e) {
      console.warn('[handleGenerateDocx] Consulta em generation_jobs:', e);
    }

    if (!organizationId) {
      res.status(403).json({ success: false, error: 'Job não encontrado ou não autorizado.' });
      return;
    }
    const { data: member, error: memberError } = await client
      .from('organization_members')
      .select('user_id')
      .eq('organization_id', organizationId)
      .eq('user_id', identity.user.id)
      .maybeSingle();
    if (memberError || !member) {
      res.status(403).json({ success: false, error: 'Acesso à organização não autorizado.' });
      return;
    }

    // 3. Localizar o legal_case_input correspondente
    // Busca por generation_job_id ou pelo id do próprio legal_case_input
    try {
      const { data: inputByJob, error: inputByJobErr } = await client
        .from('legal_case_inputs')
        .select('*')
        .eq('generation_job_id', cleanJobId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!inputByJobErr && inputByJob) {
        snapshot = inputByJob as PersistedLegalCaseInput;
        organizationId = organizationId || snapshot.organization_id || null;
        finalJobId = snapshot.generation_job_id || cleanJobId;
      } else {
        // Tenta buscar por id do legal_case_input
        const { data: inputById, error: inputByIdErr } = await client
          .from('legal_case_inputs')
          .select('*')
          .eq('id', cleanJobId)
          .maybeSingle();

        if (!inputByIdErr && inputById) {
          snapshot = inputById as PersistedLegalCaseInput;
          organizationId = organizationId || snapshot.organization_id || null;
          finalJobId = snapshot.generation_job_id || cleanJobId;
        }
      }
    } catch (e) {
      console.warn('[handleGenerateDocx] Consulta em legal_case_inputs:', e);
    }

    // Only authenticated, persisted case snapshots may be used in production.
    // Se for o caso homologado de referência em ambiente de teste ou sem persistência prévia
    if (!snapshot || snapshot.organization_id !== organizationId || snapshot.generation_job_id !== cleanJobId) {
      res.status(404).json({ success: false, error: 'Snapshot do caso não encontrado ou não autorizado.' });
      return;
    }
    const validSnapshot: PersistedLegalCaseInput = snapshot;

    // 4. Reconstruir a arquitetura determinística existente
    const assembled = assembleDocumentFromSnapshot(validSnapshot, {
      recalculateArchitecture: true,
      filenameSuffix: '',
    });

    if (!assembled || !assembled.assembly) {
      res.status(422).json({
        success: false,
        error: 'Falha na montagem determinística dos blocos da peça processual.',
      });
      return;
    }

    // 5. Montar o payload documental esperado pelo workflow Carbone
    const documentPayload = buildCawDocxPayload({
      assembly: assembled.assembly,
      organization_id: organizationId,
      generation_job_id: finalJobId,
      filename: assembled.filename,
    });

    // 6. Chamar o Webhook de Produção do n8n (CAW DOCX)
    const webhookUrl = process.env.N8N_DOCX_WEBHOOK_URL?.trim();
    const webhookSecret = process.env.N8N_DOCX_WEBHOOK_SECRET;
    if (!webhookUrl || !webhookSecret) {
      res.status(503).json({ success: false, error: 'Motor DOCX não configurado.' });
      return;
    }

    console.log(`[handleGenerateDocx] Enviando payload ao n8n: job=${finalJobId}, org=${organizationId}, url=${webhookUrl}`);

    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), 90000); // 90s timeout

    let n8nResponse: globalThis.Response;
    try {
      n8nResponse = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-VIPAZ-Secret': webhookSecret,
        },
        body: JSON.stringify(documentPayload),
        signal: abortController.signal,
      });
    } catch (networkErr: unknown) {
      clearTimeout(timeoutId);
      const isAbort = (networkErr as Error)?.name === 'AbortError';
      const msg = isAbort
        ? 'Tempo limite de 90 segundos excedido na comunicação com o motor n8n (DOCX CAW).'
        : (networkErr as Error)?.message || 'Erro de rede ao conectar com o webhook n8n.';

      console.error('[handleGenerateDocx] Erro de rede:', networkErr);
      res.status(504).json({
        success: false,
        error: `Falha de comunicação com o motor DOCX CAW (n8n): ${msg}`,
        generation_job_id: finalJobId,
      });
      return;
    } finally {
      clearTimeout(timeoutId);
    }

    if (!n8nResponse.ok) {
      let errorBody = '';
      try {
        errorBody = await n8nResponse.text();
      } catch {
        errorBody = '(sem corpo de resposta)';
      }

      console.error('[handleGenerateDocx] n8n rejeitou com status:', n8nResponse.status, errorBody);
      res.status(502).json({
        success: false,
        error: `O motor n8n rejeitou a solicitação de geração DOCX (HTTP ${n8nResponse.status}: ${n8nResponse.statusText}). Detalhes: ${errorBody.slice(0, 300)}`,
        generation_job_id: finalJobId,
      });
      return;
    }

    let responseJson: any = null;
    try {
      const respText = await n8nResponse.text();
      if (respText && respText.trim()) {
        try {
          responseJson = JSON.parse(respText);
        } catch {
          responseJson = { raw: respText };
        }
      }
    } catch (parseErr) {
      console.warn('[handleGenerateDocx] Não foi possível converter resposta do n8n em JSON:', parseErr);
    }

    // 7. Confirmar a existência do registro em public.generated_documents
    let confirmedDoc: any = null;
    const maxPollAttempts = 8;
    const pollIntervalMs = 1500;

    for (let attempt = 1; attempt <= maxPollAttempts; attempt++) {
      try {
        const { data: docData, error: docErr } = await client
          .from('generated_documents')
          .select('*')
          .eq('generation_job_id', finalJobId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!docErr && docData) {
          confirmedDoc = docData;
          break;
        }
      } catch (pollErr) {
        console.warn(`[handleGenerateDocx] Tentativa ${attempt} de confirmação do documento:`, pollErr);
      }

      if (attempt < maxPollAttempts) {
        await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
      }
    }

    if (!confirmedDoc || confirmedDoc.organization_id !== organizationId) {
      res.status(502).json({
        success: false,
        error: 'Documento não confirmado no banco; download não disponibilizado.',
      });
      return;
    }
    const docxStoragePath = confirmedDoc.docx_storage_path;
    if (typeof docxStoragePath !== 'string' ||
        !docxStoragePath.startsWith(organizationId + '/' + finalJobId + '/')) {
      res.status(502).json({
        success: false,
        error: 'Caminho do documento inválido ou fora da organização.',
      });
      return;
    }

    // 8. Gerar URL assinada temporária para download seguro (validade de 1 hora)
    let signedUrl: string | null = null;
    try {
      const { data: signedData, error: signedErr } = await client.storage
        .from('generated-documents')
        .createSignedUrl(docxStoragePath, 3600);

      if (!signedErr && signedData?.signedUrl) {
        signedUrl = signedData.signedUrl;
      }
    } catch (signErr) {
      console.warn('[handleGenerateDocx] Aviso ao criar signedUrl:', signErr);
    }

    const durationMs = Date.now() - startTime;
    console.log(`[handleGenerateDocx] Concluído em ${durationMs}ms: job=${finalJobId}, docxStoragePath=${docxStoragePath}`);

    // 9. Devolver resultado tipado e seguro ao frontend
    res.status(200).json({
      success: true,
      generation_job_id: finalJobId,
      document_id: confirmedDoc?.id || responseJson?.id || responseJson?.document_id || null,
      filename: assembled.filename,
      docx_storage_path: docxStoragePath,
      signed_url: signedUrl,
      included_blocks_count: assembled.includedBlocksCount,
      linked_requests_count: assembled.linkedRequestsCount,
      created_at: confirmedDoc?.created_at || new Date().toISOString(),
      duration_ms: durationMs,
      message: 'Documento DOCX processado com sucesso pelo motor CAW (Carbone).',
    });
  } catch (globalErr: unknown) {
    const errorMsg =
      globalErr instanceof Error
        ? globalErr.message
        : 'Erro interno ao processar a geração do DOCX.';

    console.error('[handleGenerateDocx] Exceção não tratada:', globalErr);
    res.status(500).json({
      success: false,
      error: errorMsg,
    });
  }
}
