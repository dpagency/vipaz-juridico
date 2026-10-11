import type { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

export async function handleStartGeneration(req: Request, res: Response): Promise<void> {
  const id = req.body?.generation_job_id;
  if (req.method !== 'POST') { res.status(405).json({ error: 'Método não permitido.' }); return; }
  if (typeof id !== 'string' || !/^[a-f0-9-]{36}$/i.test(id)) {
    res.status(400).json({ error: 'ID de geração inválido.' }); return;
  }
  const token = /^Bearer\s+(.+)$/i.exec(req.headers.authorization || '')?.[1];
  if (!token) { res.status(401).json({ error: 'Autenticação necessária.' }); return; }
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const webhook = process.env.N8N_GENERATION_WEBHOOK_URL;
  const secret = process.env.N8N_GENERATION_WEBHOOK_SECRET;
  if (!url || !key || !webhook || !secret) {
    res.status(503).json({ error: 'Integração não configurada.' }); return;
  }
  try {
    const db = createClient(url, key, {
      global: { headers: { Authorization: 'Bearer ' + token } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: auth, error: authError } = await db.auth.getUser(token);
    if (authError || !auth.user) {
      res.status(401).json({ error: 'Sessão inválida.' }); return;
    }
    const { data: job, error: jobError } = await db.from('generation_jobs')
      .select('id,user_id,status').eq('id', id).maybeSingle();
    if (jobError || !job || job.user_id !== auth.user.id) {
      res.status(403).json({ error: 'Solicitação não autorizada.' }); return;
    }
    if (job.status !== 'pending') {
      res.status(409).json({ error: 'Job não está pendente.' }); return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);
    let response: globalThis.Response;
    try {
      response = await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-VIPAZ-Secret': secret },
        body: JSON.stringify({ generation_job_id: id }),
        signal: controller.signal,
      });
    } finally { clearTimeout(timer); }
    if (!response.ok) {
      console.error('[VIPAZ] n8n returned', response.status);
      res.status(502).json({ error: 'Motor indisponível; job preservado.' }); return;
    }
    res.status(202).json({ success: true, generation_job_id: id });
  } catch (error) {
    console.error('[VIPAZ] Generation dispatch failed', error);
    res.status(502).json({ error: 'Falha ao iniciar geração; job preservado.' });
  }
}
