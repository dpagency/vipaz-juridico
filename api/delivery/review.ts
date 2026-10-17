import type { Request, Response } from 'express';

/**
 * The delivery engine is bundled as a CommonJS artifact during the Vercel build.
 * Importing TypeScript source by a relative path fails in Vercel's ESM runtime.
 */
export default async function handler(req: Request, res: Response): Promise<void> {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Método não permitido.' });
    return;
  }

  try {
    const module = await import('../../dist/delivery-review.cjs');
    await module.handleVipazDeliveryReview(req, res);
  } catch (error) {
    console.error('[VIPAZ Delivery] Falha ao carregar ou executar a função', error);
    if (!res.headersSent) {
      res.status(503).json({ error: 'Serviço de revisão temporariamente indisponível.' });
    }
  }
}
