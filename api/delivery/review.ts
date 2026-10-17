import type { Request, Response } from 'express';
import { handleVipazDeliveryReview } from '../../src/server/vipazDeliveryReviewHandler';

/** Vercel serverless entrypoint for the authenticated Delivery quality gateway. */
export default async function handler(req: Request, res: Response): Promise<void> {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Método não permitido.' });
    return;
  }
  await handleVipazDeliveryReview(req, res);
}
