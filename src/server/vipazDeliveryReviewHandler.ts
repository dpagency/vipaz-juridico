import type { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { createVipazSupabaseRepository } from '../domain/legal-engine/vipazSupabaseRepository';
import { produceVipazReviewDraft } from '../domain/legal-engine/vipazProductionPipeline';
import type { VipazComposition } from '../domain/legal-engine/vipazCompositionContract';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
/**
 * Authenticated, tenant-scoped review draft. Does not approve or publish a
 * legal document; download is explicitly marked for attorney review.
 * This endpoint requires the end-user Supabase access JWT, not an n8n API key.
 */
export async function handleVipazDeliveryReview(req: Request, res: Response): Promise<void> {
  const token = /^Bearer\s+(.+)$/i.exec(req.headers.authorization || '')?.[1];
  if (!token) { res.status(401).json({ error: 'Autenticação necessária.' }); return; }
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) { res.status(503).json({ error: 'Supabase indisponível.' }); return; }
  // Authenticate the caller before inspecting any case or document identifiers.
  // This uses the public anon key and never grants service-role access.
  try {
    const authClient = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await authClient.auth.getUser(token);
    if (error || !data.user) {
      res.status(401).json({ error: 'Sessão inválida.' });
      return;
    }
  } catch (error) {
    console.error('[VIPAZ Delivery] Falha na verificação de sessão', error instanceof Error ? error.message : 'erro desconhecido');
    res.status(503).json({ error: 'Não foi possível verificar a sessão.' });
    return;
  }
  const composition = req.body?.composition as VipazComposition | undefined;
  if (!composition || typeof composition !== 'object' ||
      ![composition.jobId, composition.processId, composition.templateId].every(v => typeof v === 'string' && UUID.test(v)) ||
      typeof composition.templateVersion !== 'string' || !Array.isArray(composition.blocks) ||
      composition.blocks.length > 200) {
    res.status(400).json({ error: 'Composição ou identificadores inválidos.' }); return;
  }
  try {
    const repository = createVipazSupabaseRepository({
      supabaseUrl: url, anonKey: key, accessToken: token,
    });
    const result = await produceVipazReviewDraft(composition, repository);
    if (result.status === 'blocked') {
      res.status(422).json({ jobId: result.jobId, status: result.status, issues: result.issues });
      return;
    }
    // Binary DOCX is returned only on explicit download request.
    if (req.query.download === 'true') {
      res.setHeader('Content-Type', result.mimeType);
      res.setHeader('Content-Disposition', 'attachment; filename="VIPAZ_RASCUNHO_REVISAO.docx"');
      res.setHeader('Cache-Control', 'no-store');
      res.status(200).send(result.docx);
      return;
    }
    res.status(200).json({
      jobId: result.jobId, status: result.status, approvedForHumanReview: true,
      evidenceCount: result.evidenceCount,
      checkedAt: new Date().toISOString(),
      downloadEndpoint: '/api/delivery/review?download=true',
      humanApprovalRequired: true,
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : '';
    if (code === 'VIPAZ_UNAUTHENTICATED') { res.status(401).json({ error: 'Sessão inválida.' }); return; }
    if (code === 'VIPAZ_JOB_NOT_AUTHORIZED') { res.status(403).json({ error: 'Acesso ao trabalho negado.' }); return; }
    if (code === 'VIPAZ_INVALID_IDENTIFIER') { res.status(400).json({ error: 'Identificador inválido.' }); return; }
    console.error('[VIPAZ Delivery] Falha de homologação', code);
    res.status(503).json({ error: 'Não foi possível verificar a documentação para revisão.' });
  }
}
