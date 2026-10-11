import type { Request, Response } from 'express';
import { handleStartGeneration } from '../src/server/startGenerationHandler.js';

export default async function handler(req: Request, res: Response) {
  return handleStartGeneration(req, res);
}
