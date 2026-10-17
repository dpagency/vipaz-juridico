import type { Request, Response } from 'express';

/**
 * Keep the Vercel entrypoint lightweight: the quality engine and its Node
 * dependencies must not initialize for a GET health/method probe.
 */
export default async function handler(req: Request, res: Response): Promise<void> {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Método não permitido.' });
    return;
  }
  try {
    const { handleVipazDeliveryReview } = await import('../../src/server/vipazDeliveryReviewHandler');
    await handleVipazDeliveryReview(req, res);
  } catch (error) {
    console.error('[VIPAZ Delivery] Falha ao carregar ou executar a função', error);
    if (!res.headersSent) {
      res.status(503).json({ error: 'Serviço de revisão temporariamente indisponível.' });
    }
  }
}
