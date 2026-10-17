import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleVipazDeliveryReview } from '../../src/server/vipazDeliveryReviewHandler';

/**
 * Vercel serverless entrypoint. The Express listener in server.ts is used
 * for local development and standalone hosting, not Vercel static deployments.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método não permitido.' });
  }
  return handleVipazDeliveryReview(req as any, res as any);
}
