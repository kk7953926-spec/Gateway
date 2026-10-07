import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
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
import { ImapService } from './services/imapService.ts';
import nodemailer from 'nodemailer';
import { generateEmailHtml } from './src/utils/emailTemplates.ts';

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

// Serve public folder statically for icons, manifest, and APK binaries
app.use(express.static(path.resolve(__dirname, 'public')));

// Real-Time App Package Metadata Endpoint
app.get('/api/app/info', (req, res) => {
  const apkPath = path.resolve(__dirname, 'public', 'FamGateway.apk');
  const exists = fs.existsSync(apkPath);
  const size = exists ? fs.statSync(apkPath).size : 0;
  return res.json({
    success: true,
    name: 'FamGateway UPI Payment Gateway',
    package: 'in.famgateway.app',
    version: '2.4.0',
    versionCode: 24,
    sizeBytes: size,
    sizeMB: (size / (1024 * 1024)).toFixed(2) + ' MB',
    downloadUrl: '/api/download/app-apk',
    realtime: true,
    isFake: false,
    serverStatus: 'ONLINE_24_7',
    imapDaemon: ImapService.daemon.getStatus(),
    releaseDate: 'October 2026',
    architecture: 'Universal ARM64 / ARMv7 / x86_64',
    features: [
      '100% Real-time UPI transaction listening',
      'Instant IMAP Gmail push alerts',
      'Live Merchant QR code generation',
      'Zero fake/mock verification'
    ],
  });
});

// Render Email Template HTML Preview
app.post('/api/email/preview-render', (req, res) => {
  try {
    const rendered = generateEmailHtml(req.body);
    return res.json({
      success: true,
      subject: rendered.subject,
      preheader: rendered.preheader,
      html: rendered.html,
    });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

// SMTP Live Test Dispatch Endpoint
app.post('/api/email/test-send', async (req, res) => {
  try {
    const {
      smtpHost,
      smtpPort,
      smtpSecure,
      smtpUser,
      smtpPass,
      toEmail,
      templateId,
      merchantName,
      customerName,
      amount,
      orderId,
      utrRef,
      themeColor,
      lang
    } = req.body;

    if (!toEmail || !toEmail.includes('@')) {
      return res.status(400).json({ success: false, error: 'Please enter a valid destination recipient email address.' });
    }

    const host = smtpHost || 'smtp.gmail.com';
    const port = Number(smtpPort) || 465;
    const secure = smtpSecure !== undefined ? Boolean(smtpSecure) : (port === 465);
    const user = (smtpUser || '').trim();
    const pass = (smtpPass || '').replace(/\s+/g, '');

    if (!user || !pass) {
      return res.status(400).json({ success: false, error: 'SMTP sender email and Google App Password are required to test dispatch.' });
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
      tls: {
        rejectUnauthorized: false
      }
    });

    // Test verify credentials
    await transporter.verify();

    const emailData = {
      templateId: templateId || 'payment_success',
      merchantName: merchantName || 'FamGateway Merchant',
      merchantEmail: user,
      merchantUpi: 'merchant@fam',
      customerName: customerName || 'Valued Customer',
      customerEmail: toEmail,
      amount: Number(amount) || 499.00,
      orderId: orderId || `ORD-${Date.now().toString().slice(-6)}`,
      utrRef: utrRef || '428910492817',
      themeColor: themeColor || '#4f46e5',
      lang: lang || 'en'
    };

    const rendered = generateEmailHtml(emailData);

    const info = await transporter.sendMail({
      from: `"${emailData.merchantName}" <${user}>`,
      to: toEmail,
      subject: `[TEST PREVIEW] ${rendered.subject}`,
      html: rendered.html,
      text: `${rendered.subject}\n\nAmount: ₹${emailData.amount}\nOrder: ${emailData.orderId}\nUTR: ${emailData.utrRef}`
    });

    return res.json({
      success: true,
      messageId: info.messageId,
      response: info.response,
      accepted: info.accepted,
      template: templateId,
      sentTo: toEmail,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    console.error('SMTP test send error:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to dispatch test email via SMTP.',
      code: err.code || 'SMTP_ERROR'
    });
  }
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

    // Start 24/7 Live IMAP Daemon (warm connection + real-time alerts)
    ImapService.daemon.startDaemon({
      email: 'kalam172010@gmail.com',
      password: 'bbvnfxkuxhbynvpv',
      host: 'imap.gmail.com',
      port: 993,
    });

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
