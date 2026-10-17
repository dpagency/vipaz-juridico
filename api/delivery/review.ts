import type { Request, Response } from 'express';
import { handleVipazDeliveryReview } from '../../src/server/vipazDeliveryReviewHandler';

/**
 * Static import allows Vercel's bundler to trace and package the review handler.
 * A dynamic import of an extensionless TS module was left unresolved at runtime
 * (ERR_MODULE_NOT_FOUND in /var/task/src/server).
 */
export default async function handler(req: Request, res: Response): Promise<void> {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Método não permitido.' });
    return;
  }
  try {
    await handleVipazDeliveryReview(req, res);
  } catch (error) {
    console.error('[VIPAZ Delivery] Falha inesperada na função', error);
    if (!res.headersSent) {
      res.status(503).json({ error: 'Serviço de revisão temporariamente indisponível.' });
    }
  }
}
