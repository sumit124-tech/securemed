const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');

const RPC_HOST = '127.0.0.1';
const RPC_PORT = 8545;
const RPC_URL = `http://${RPC_HOST}:${RPC_PORT}`;
const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';

/**
 * Checks if the Hardhat node is ready and answering JSON-RPC requests.
 */
function checkNodeReady() {
  return new Promise((resolve) => {
    const postData = JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_blockNumber',
      params: [],
      id: 1
    });

    const req = http.request(
      {
        hostname: RPC_HOST,
        port: RPC_PORT,
        path: '/',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        },
        timeout: 1000
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            if (parsed && parsed.result !== undefined) {
              return resolve(true);
            }
          } catch (e) {
            // not ready
          }
          resolve(false);
        });
      }
    );

    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });

    req.write(postData);
    req.end();
  });
}

/**
 * Polls the node until responsive or timeout.
 */
async function waitForNode(timeoutMs = 45000) {
  const start = Date.now();
  process.stdout.write('[chain:start] Waiting for Hardhat node to respond on port 8545');
  while (Date.now() - start < timeoutMs) {
    const isReady = await checkNodeReady();
    if (isReady) {
      console.log('\n[chain:start] Hardhat node is ready!');
      return true;
    }
    process.stdout.write('.');
    await new Promise((r) => setTimeout(r, 600));
  }
  console.log('');
  throw new Error(`Hardhat node failed to respond within ${timeoutMs}ms.`);
}

/**
 * Runs a child process and returns a promise that resolves on exit 0.
 */
function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      stdio: 'inherit',
      ...options
    });

    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(' ')} failed with exit code ${code}`));
    });

    proc.on('error', (err) => reject(err));
  });
}

async function main() {
  console.log('========================================================');
  console.log('  SECURE MEDICAL RECORDS - BLOCKCHAIN AUTO-DEV RUNNER   ');
  console.log('========================================================');

  // 1. Check if node is already running, or start a new Hardhat node process
  const alreadyRunning = await checkNodeReady();
  let hardhatNodeProcess = null;

  if (alreadyRunning) {
    console.log('[chain:start] Existing Hardhat node detected on port 8545. Reusing running instance.');
  } else {
    console.log('[chain:start] Starting in-memory Hardhat node...');
    const blockchainDir = path.resolve(__dirname, '..');

    hardhatNodeProcess = spawn(npxCmd, ['hardhat', 'node', '--hostname', RPC_HOST, '--port', String(RPC_PORT)], {
      cwd: blockchainDir,
      stdio: 'inherit'
    });

    hardhatNodeProcess.on('error', (err) => {
      console.error('[chain:start] Failed to spawn hardhat node:', err);
      process.exit(1);
    });

    // Ensure child process is killed when this script exits
    const cleanup = () => {
      if (hardhatNodeProcess && !hardhatNodeProcess.killed) {
        console.log('\n[chain:start] Shutting down Hardhat node...');
        try {
          hardhatNodeProcess.kill();
        } catch (e) {
          // ignore
        }
      }
      process.exit(0);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    process.on('exit', cleanup);

    // Wait until node answers RPC calls
    await waitForNode();
  }

  // 2. Deploy smart contract and update server/.env.blockchain
  console.log('\n[chain:start] Deploying RecordIntegrity smart contract to localhost...');
  const blockchainDir = path.resolve(__dirname, '..');
  await runCommand(npxCmd, ['hardhat', 'run', 'scripts/deploy.js', '--network', 'localhost'], {
    cwd: blockchainDir
  });

  // 3. Call server re-anchor routine
  console.log('\n[chain:start] Triggering record re-anchoring routine...');
  const serverDir = path.resolve(__dirname, '../../server');
  const reanchorScript = path.resolve(serverDir, 'scripts/reanchorRecords.js');

  try {
    await runCommand(process.execPath, [reanchorScript], {
      cwd: serverDir
    });
    console.log('\n[chain:start] Re-anchoring successfully completed!');
  } catch (reanchorErr) {
    console.warn('[chain:start] Re-anchoring warning (MongoDB might not be running yet):', reanchorErr.message);
    console.log('[chain:start] You can run the re-anchoring script anytime once MongoDB is up:');
    console.log('              cd server && node scripts/reanchorRecords.js');
  }

  console.log('\n========================================================');
  console.log('  BLOCKCHAIN READY - HARDHAT NODE IS RUNNING ACTIVE     ');
  console.log('  Keep this terminal open while developing.             ');
  console.log('========================================================\n');

  // Keep node alive if we spawned it
  if (hardhatNodeProcess) {
    await new Promise(() => {});
  }
}

main().catch((err) => {
  console.error('\n[chain:start] Execution failed:', err.message);
  process.exit(1);
});
