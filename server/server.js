import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db.js';

import authRoutes from './routes/authRoutes.js';
import accessRoutes from './routes/accessRoutes.js';
import recordRoutes from './routes/recordRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import auditRoutes from './routes/auditRoutes.js';
import doctorRoutes from './routes/doctorRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import { generalLimiter, authLimiter } from './middleware/rateLimitMiddleware.js';

import fs from 'fs';
import path from 'path';

dotenv.config();

// Load blockchain env variables if they exist
const blockchainEnvPath = path.resolve('.env.blockchain');
if (fs.existsSync(blockchainEnvPath)) {
  const envConfig = dotenv.parse(fs.readFileSync(blockchainEnvPath));
  for (const k in envConfig) {
    process.env[k] = envConfig[k];
  }
}

const app = express();
app.set('trust proxy', true);

// 1. Hide X-Powered-By header
app.disable('x-powered-by');

// 2. Helmet with sensible defaults for cross-origin assets, popups, and API protection
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
  contentSecurityPolicy: false // Pure REST API backend: avoids breaking client assets, Vite HMR, and external links
}));

// 3. CORS Configuration: allow only CLIENT_URL from env (default http://localhost:5173), no wildcard
const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    const cleanOrigin = origin.replace(/\/$/, '');
    const cleanClientUrl = clientUrl.replace(/\/$/, '');
    if (cleanOrigin === cleanClientUrl) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked: Origin ${origin} not allowed`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// 4. Body parsing: limit JSON and URL-encoded body size to 100kb
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// 5. NoSQL operator sanitization (strips $ and . keys from body, query, and params)
app.use(mongoSanitize({ allowDots: false }));

// 6. Rate Limiting
// General limiter on /api: 300 requests per 15 minutes per IP (skips health, notifications, and integrity-audit polling)
app.use('/api', generalLimiter);

// Strict limiter on login, register, and admin login: 10 requests per 15 minutes per IP (writes audit entry on 429)
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/admin/login', authLimiter);

// 7. Routes
app.use('/api/auth', authRoutes);
app.use('/api/access', accessRoutes);
app.use('/api/records', recordRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/doctor', doctorRoutes);
app.use('/api/admin', adminRoutes);

// Basic Health Check Route
app.get('/', (req, res) => {
  res.send('Secure Medical Record System API is running...');
});

// 8. 404 Handler for undefined routes
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Not Found - ${req.originalUrl}`
  });
});

// 9. Final Error Handler: clean JSON with correct status, no stack traces in production, clear 400 for malformed JSON
app.use((err, req, res, next) => {
  // Malformed JSON payload syntax error
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      message: 'Invalid JSON payload provided'
    });
  }

  // Request body too large
  if (err.type === 'entity.too.large' || err.status === 413) {
    return res.status(413).json({
      success: false,
      message: 'Payload too large. Maximum allowed size is 100kb.'
    });
  }

  // CORS blocked error
  if (err.message && err.message.startsWith('CORS blocked')) {
    return res.status(403).json({
      success: false,
      message: err.message
    });
  }

  const statusCode = err.status || (res.statusCode >= 400 ? res.statusCode : 500);
  const isProduction = process.env.NODE_ENV === 'production';
  const response = {
    success: false,
    message: err.message || 'Internal Server Error'
  };

  if (!isProduction && err.stack) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
});

const PORT = process.env.PORT || 5000;

// Start server only after DB connection
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    
    // Check for chain reset on startup
    import('./services/chainResetService.js').then(({ checkChainResetOnStartup }) => {
      checkChainResetOnStartup().catch(err => {
        console.warn('Chain reset check error:', err.message);
      });
    });

    // Start background anchor retry queue worker (runs every 60s)
    import('./jobs/anchorQueue.js').then(({ startAnchorQueueWorker }) => {
      startAnchorQueueWorker(60000);
    }).catch(err => {
      console.warn('Failed to start anchor queue worker:', err.message);
    });

    // Start scheduled cryptographic integrity audit cron (runs 02:00 daily or AUDIT_CRON)
    import('./jobs/integrityAudit.js').then(({ startIntegrityAuditCron }) => {
      startIntegrityAuditCron();
    }).catch(err => {
      console.warn('Failed to initialize integrity audit cron scheduler:', err.message);
    });

    // Check blockchain asynchronously without blocking
    import('./services/blockchainService.js').then((module) => {
      const blockchainService = module.default;
      const activeNetwork = blockchainService.getNetworkName();

      // Fail at startup with a clear message if required variables are missing for the selected network
      if (activeNetwork === 'sepolia') {
        const hasRpc = !!(process.env.SEPOLIA_RPC_URL || process.env.SEPOLIA_RPC_UR || process.env.BLOCKCHAIN_RPC_URL);
        const hasKey = !!(process.env.DEPLOYER_PRIVATE_KEY || process.env.SYSTEM_WALLET_PRIVATE_KEY);
        if (!hasRpc || !hasKey) {
          const missing = [];
          if (!hasRpc) missing.push('SEPOLIA_RPC_URL');
          if (!hasKey) missing.push('DEPLOYER_PRIVATE_KEY');
          console.error(`\n===============================================================`);
          console.error(`[FATAL CONFIG ERROR] CHAIN_NETWORK is set to "sepolia" but required environment variables are missing in server/.env:`);
          console.error(`Missing: ${missing.join(', ')}`);
          console.error(`Please add these variables to server/.env and restart.`);
          console.error(`===============================================================\n`);
          process.exit(1);
        }
      }

      let isConnected = false;
      let retryTimer = null;

      const checkBlockchainConnection = async () => {
        try {
          blockchainService.reloadContract();
          if (!blockchainService.provider) {
            throw new Error(`Blockchain provider is not configured for network "${activeNetwork}".`);
          }

          const network = await blockchainService.provider.getNetwork();
          const address = blockchainService.getContractAddress();

          if (!isConnected) {
            console.log(`Blockchain connected: ${network.name} [${activeNetwork}] via ${blockchainService.getMaskedRpcUrl()}`);
            isConnected = true;
          }

          if (retryTimer) {
            clearInterval(retryTimer);
            retryTimer = null;
          }

          if (!address) {
            console.warn(`WARNING: No smart contract address configured. Run deployment script first.`);
            return;
          }

          const code = await blockchainService.provider.getCode(address);
          if (code === '0x') {
            console.warn(`WARNING: No contract code found at address ${address} on network "${activeNetwork}". Please deploy contract.`);
          } else {
            console.log(`Smart contract verified at ${address} on ${activeNetwork}`);
          }
        } catch (err) {
          isConnected = false;
          console.warn(`WARNING: Blockchain is unreachable on network "${activeNetwork}". (${err.message}). Retrying in 10s...`);
          if (!retryTimer) {
            retryTimer = setInterval(checkBlockchainConnection, 10000);
          }
        }
      };

      checkBlockchainConnection();
    }).catch(err => {
      console.warn(`WARNING: Failed to load blockchain service. (${err.message})`);
    });
  });
});
