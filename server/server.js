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
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
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
    
    // Check blockchain asynchronously without blocking
    import('./services/blockchainService.js').then((module) => {
      const blockchainService = module.default;
      blockchainService.provider.getNetwork().then((network) => {
        console.log(`Blockchain connected: ${network.name}`);
        const address = blockchainService.getContractAddress();
        blockchainService.provider.getCode(address).then(code => {
          if (code === '0x') {
            console.warn(`WARNING: No contract code found at address ${address}. Please redeploy and update .env.blockchain.`);
          } else {
            console.log(`Smart contract verified at ${address}`);
          }
        }).catch(err => {
          console.warn(`WARNING: Failed to check contract code at ${address} (${err.message})`);
        });
      }).catch((err) => {
        console.warn(`WARNING: Blockchain is unreachable. Smart contract functions will fail! (${err.message})`);
      });
    }).catch(err => {
      console.warn(`WARNING: Failed to load blockchain service. (${err.message})`);
    });
  });
});
