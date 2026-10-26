import express from 'express';
import path from 'path';
import 'dotenv/config';
import { handleGenerateDocx } from './src/server/generateDocxHandler';
import { handleLegalAiField, handleLegalAiIntake } from './src/server/legalAiHandler';
import { handleStartGeneration } from './src/server/startGenerationHandler';
import { handleVipazDeliveryReview } from './src/server/vipazDeliveryReviewHandler';

const PORT = 3000;
const HOST = '0.0.0.0';

async function startServer() {
  const app = express();

  // Parsing de payloads JSON e URL-encoded
  app.use(express.json({ limit: '35mb' }));
  app.use(express.urlencoded({ extended: true, limit: '35mb' }));

  // ==========================================
  // ROTAS DE API DO BACKEND VIPAZ (SEMPRE PRIMEIRO)
  // ==========================================

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'VIPAZ Jurídico CAW Motor DOCX',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    });
  });

  // Assistência por IA para campos editáveis das peças jurídicas
  app.post('/api/ai/legal-field', (req, res) => {
    handleLegalAiField(req, res);
  });

  app.post('/api/ai/legal-intake', (req, res) => {
    handleLegalAiIntake(req, res);
  });

  app.post('/api/start-generation', (req, res) => {
    handleStartGeneration(req, res);
  });

  // Delivery review endpoint with JWT, tenant RLS and mandatory human review
  app.post('/api/delivery/review', (req, res) => {
    handleVipazDeliveryReview(req, res);
  });

  // Endpoint seguro de geração DOCX via motor CAW (n8n / Carbone)
  app.post('/api/generate-docx', (req, res) => {
    handleGenerateDocx(req, res);
  });

  // ==========================================
  // VITE MIDDLEWARE / STATIC SERVING
  // ==========================================
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`[VIPAZ] Servidor backend ativo em http://${HOST}:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[VIPAZ] Falha ao iniciar servidor:', err);
  process.exit(1);
});
