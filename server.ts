import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import authRoutes from './routes/authRoutes.ts';
import userRoutes from './routes/userRoutes.ts';
import adminRoutes from './routes/adminRoutes.ts';
import paymentRoutes from './routes/paymentRoutes.ts';
import integrationRoutes from './routes/integrationRoutes.ts';
import { dbService } from './database/db.ts';
import { telemetryService } from './services/telemetryService.ts';
import { PaymentSyncService } from './services/paymentSyncService.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Api-Key', 'x-api-key'],
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api', integrationRoutes);
app.use('/api/webhook', (req, res, next) => {
  req.url = '/webhook' + (req.url === '/' ? '' : req.url);
  paymentRoutes(req, res, next);
});

app.get('/api/public/stats', (req, res) => {
  dbService.incrementApiRequests();
  return res.json({
    success: true,
    stats: dbService.getStats(),
  });
});

app.post('/api/public/ping', (req, res) => {
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
  const { sessionId, page, referrer, userAgent, isCheckout, orderAmount } = req.body || {};
  const result = telemetryService.recordPing({
    sessionId,
    ip: clientIp,
    page,
    referrer,
    userAgent: userAgent || req.headers['user-agent'],
    isCheckout,
    orderAmount,
  });
  return res.json({
    success: true,
    sessionId: result.sessionId,
    activeCount: result.activeCount,
  });
});

app.get('/api/public/live-visitors', (req, res) => {
  return res.json({
    success: true,
    activeCount: telemetryService.getActiveCount(),
    visitors: telemetryService.getActiveVisitors(),
  });
});

app.get(['/health', '/api/health'], (req, res) => {
  return res.json({
    status: 'HEALTHY',
    uptime_seconds: Math.floor(process.uptime()),
    service: 'FamGateway 24/7 UPI & IMAP Gateway',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/public/site-settings', (req, res) => {
  return res.json({
    success: true,
    settings: dbService.getSiteSettings(),
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'custom',
      });

      app.use(vite.middlewares);

      app.use('*', async (req, res, next) => {
        const url = req.originalUrl;
        if (url.startsWith('/api')) return next();

        try {
          const fs = await import('fs/promises');
          let template = await fs.readFile(path.resolve(__dirname, 'index.html'), 'utf-8');
          template = await vite.transformIndexHtml(url, template);
          res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
        } catch (e) {
          vite.ssrFixStacktrace(e as Error);
          next(e);
        }
      });
    } catch (err) {
      console.error('Error starting Vite dev middleware:', err);
    }
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    console.log(`Serving static files from: ${distPath}`);
    
    app.use(express.static(distPath));
    app.use('*', (req, res) => {
      if (req.originalUrl.startsWith('/api')) {
        return res.status(404).json({ error: 'Endpoint not found' });
      }
      const indexPath = path.resolve(distPath, 'index.html');
      res.sendFile(indexPath, async (err) => {
        if (err) {
          console.error(`Error sending index.html from ${indexPath}:`, err);
          
          // Debugging: List files in dist to see what's happening
          try {
            const fs = await import('fs/promises');
            const files = await fs.readdir(distPath);
            console.log(`Files found in dist: ${files.join(', ')}`);
          } catch (readdirErr) {
            console.error(`Could not read dist directory:`, readdirErr);
          }
          
          res.status(500).send(`Build files not found at ${indexPath}. Please ensure 'npm run build' was executed successfully during deployment.`);
        }
      });
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 FamGateway.in server listening on port ${PORT}`);
    // Start continuous background cross-referencing auto-sync service
    PaymentSyncService.startBackgroundPoller(5000);

    // 24/7 Internal Keep-Alive Heartbeat (prevents free cloud container from sleeping)
    setInterval(async () => {
      try {
        const externalUrl = process.env.RENDER_EXTERNAL_URL || `http://127.0.0.1:${PORT}`;
        await fetch(`${externalUrl}/health`).catch(() => {});
      } catch {
        // Ignore background ping errors
      }
    }, 180000); // Ping every 3 minutes
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
