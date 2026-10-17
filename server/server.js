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
import rateLimit from 'express-rate-limit';

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

// Security Headers
app.use(helmet());

// CORS Configuration
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || 
        origin.includes('localhost') || 
        origin.includes('127.0.0.1') || 
        origin.endsWith('.trycloudflare.com')) {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  credentials: true
}));

// Rate Limiting (Basic brute-force protection)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window`
  message: { message: "Too many requests from this IP, please try again after 15 minutes" },
  validate: { trustProxy: false }
});
app.use('/api/auth', apiLimiter); // Apply only to auth routes as requested
app.use('/api/records/verify', apiLimiter);

// Middleware
app.use(express.json({ limit: '1mb' })); // Limit body size to prevent payload starvation attacks
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Routes
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
