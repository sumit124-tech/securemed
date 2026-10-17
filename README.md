# Secure Medical Record System (SMRS)

A privacy-preserving, role-based Electronic Health Record (EHR) platform featuring immutable cryptographic integrity verification powered by Ethereum/Hardhat smart contracts and SHA-256 fingerprinting.

---

## Daily Start-up Steps

When developing locally, the Hardhat blockchain node runs in-memory. Every restart of the Hardhat node resets the blockchain state. To ensure records remain verified and recovery is seamless, follow these daily start-up steps:

### 1. Start the Blockchain Node & Auto-Deploy Contract
Open a dedicated terminal and run:
```bash
npm run chain:start
```
*(Or from the `blockchain/` directory: `cd blockchain && npm run chain:start`)*

**What this does automatically:**
- Spawns the local Hardhat node on `127.0.0.1:8545`.
- Polls the node until it responds to JSON-RPC requests (`eth_blockNumber`).
- Deploys the `RecordIntegrity` smart contract to the local network.
- Automatically writes the active contract address to `server/.env.blockchain`.
- Runs the server re-anchoring routine (`reanchorRecords.js`) to re-anchor existing patient records.
- Keeps the Hardhat node running. Keep this terminal open during development!

---

### 2. Start the Backend API Server
Open a second terminal and run:
```bash
npm run dev:server
```
*(Or from the `server/` directory: `cd server && npm run dev`)*

**What happens on startup:**
- Connects to MongoDB (`mongodb://127.0.0.1:27017/secure-medical-records`).
- Verifies smart contract connectivity.
- Compares stored contract address with active one. If the chain was reset while the server was down, it logs:
  ```text
  Chain was reset
  ```
  and flags the status for the Admin System Health panel.

---

### 3. Start the Frontend Client
Open a third terminal and run:
```bash
npm run dev:client
```
*(Or from the `client/` directory: `cd client && npm run dev`)*

The client web interface will be available at:
`http://localhost:5173`

---

### Quick Start (After Blockchain is Running)
Once the blockchain node is running in Terminal 1, you can start both the server and client concurrently using:
```bash
npm run dev
```

---

## Automatic Recovery & Re-Anchoring

### Why Re-anchoring is Needed
Because the Hardhat development node runs in-memory, restarting it creates a fresh blockchain with zero historical blocks. Record versions stored in MongoDB reference old transaction receipts and an older contract address, resulting in `NOT_ANCHORED` or `CHAIN_MISMATCH` statuses.

### Automatic Recovery Routine
The automatic recovery routine (`server/scripts/reanchorRecords.js`) resolves this:
1. **Safety check**: Refuses to run if `NODE_ENV === 'production'`.
2. **Identification**: Queries record versions with status `NOT_ANCHORED` or `CHAIN_MISMATCH`.
3. **Data Verification**:
   - Recomputes the SHA-256 hash from the clinical record fields in MongoDB.
   - Compares the calculated hash with the record's stored fingerprint (`currentHash`).
4. **Anchoring**:
   - If equal: Sends the stored fingerprint to the newly deployed smart contract, updates `blockchainTxHash`, `anchoredAt`, and `contractAddress`, and writes a `RECORD_ANCHORED` audit entry.
   - If different: Refuses to anchor. Marks record as `TAMPERED`, logs `RECORD_TAMPERING_DETECTED` in the audit trail, and dispatches a critical notification to administrators via `notifyAdmins`.
5. **Batch Processing**: Processes records in batches with real-time console progress logging, skipping records already verified on the active contract.

---

## Admin System Health & Manual Re-anchoring

If the blockchain is restarted while the server is running or if contract addresses differ:
1. The server logs `Chain was reset`.
2. The **Admin Dashboard -> System Health** panel displays a prominent alert:
   > **Chain was reset**  
   > *The blockchain network was restarted or the contract address changed. Records in the database need to be re-anchored to the active contract to restore verification.*
3. Administrators can click the **"Re-anchor records"** button directly in the System Health panel.
4. This executes `POST /api/admin/reanchor` (restricted to `ADMIN` role only), audits the action (`ADMIN_REANCHORED_RECORDS`), re-anchors eligible records, and refreshes system health stats.

### Manual CLI Fallback
You can also run the re-anchoring routine directly from the command line anytime:
```bash
cd server
node scripts/reanchorRecords.js
```

---

---

## Blockchain Anchor Retry Queue

When a doctor creates or edits a medical record while the blockchain node is offline or restarting:
1. **Never blocked**: The medical record is saved to the database immediately without failing or losing clinical data.
2. **`PENDING_ANCHOR` status**: The record's SHA-256 fingerprint is calculated and stored with status `PENDING_ANCHOR`.
3. **Queue Worker (`server/jobs/anchorQueue.js`)**: Runs automatically every 60 seconds.
   - Checks if the blockchain node is reachable before attempting runs.
   - Processes pending records oldest-first in batches of 20 sequentially (preventing nonce collisions).
   - Anchors the stored fingerprint to the smart contract, updates transaction receipt, and logs `RECORD_ANCHORED` in the audit log.
   - Tracks failed attempts; after 5 failed tries, transitions record to `ANCHOR_FAILED` and dispatches `notifyAdmins`.
4. **Admin System Health**: Displays waiting records count and provides a manual "Retry now" button (restricted to `ADMIN`, audited as `ADMIN_RETRY_ANCHOR_QUEUE`).

---

## Scheduled Cryptographic Integrity Audit

The system features an automated, background verification engine that regularly audits all anchored records to detect tampering:
- **Scheduler (`server/jobs/integrityAudit.js`)**: Runs on a cron schedule using `node-cron` (default: `0 2 * * *` / 02:00 AM daily, configurable via `AUDIT_CRON` in `.env`).
- **Connection Safety**: Verifies blockchain node connectivity first. If unreachable, logs `"Audit skipped: node unreachable"` and creates a `SKIPPED` audit record. **Never reports records as TAMPERED due to network downtime.**
- **Batch Processing**: Scans all anchored record versions in memory-safe batches of 50 using `computeIntegrityStatus`. Versions with `PENDING_ANCHOR`, `NOT_ANCHORED`, or `ANCHOR_FAILED` are counted without invoking the on-chain comparison loop.
- **In-process Concurrency Lock**: Prevents multiple audit runs from executing concurrently and pauses while the anchor queue is mid-batch.
- **Tampering Detection & Non-invasive Safety**: Never modifies or deletes clinical data. If a record is newly detected as `TAMPERED`:
  - Flags `verificationStatus = 'TAMPERED'` on the record version.
  - Dispatches an audit entry: `RECORD_TAMPERING_DETECTED`.
  - Dispatches `notifyAdmins` alert once per record (does not repeat on subsequent nightly runs for already-flagged records).
- **Audit Run History (`IntegrityAuditRun` model)**: Persists audit timestamps, trigger type (`SCHEDULED` vs `MANUAL`), triggered by actor, counts (`checked`, `verified`, `tampered`, `pending`, `notAnchored`, `unverifiable`), and tampered record IDs.
- **Admin Dashboard UI**: A dedicated **"Integrity Audit"** card in the Admin Dashboard displays:
  - Last run timestamp, trigger type, and operational status badge (Green for clean, Red for tampering detected).
  - Metrics grid with live counts.
  - "Run audit now" button with spinner feedback and toast alerts (`POST /api/admin/integrity-audit/run`).
  - Interactive table of detected tampered records with direct links to each record inspection page.

---

## Unified Integrity Status Guarantees

The unified record status verification engine (`server/services/verificationService.js`) enforces strict rules:

| Status | Meaning | When Triggered |
| :--- | :--- | :--- |
| `VERIFIED` | Integrity intact | On-chain hash matches recalculated data hash exactly. |
| `PENDING_ANCHOR` | In retry queue | Record saved while blockchain was offline; awaiting queue worker. |
| `ANCHOR_FAILED` | Max retries exceeded | Record failed 5 automatic anchoring attempts. Admin alert dispatched. |
| `NOT_ANCHORED` | Never anchored / missing receipt | Record lacks a transaction receipt or has no entry on current chain. **Never marked TAMPERED.** |
| `CHAIN_MISMATCH` | Chain was restarted | Record was anchored to an older contract before a chain reset. |
| `UNVERIFIABLE` | Node unreachable / contract missing | Hardhat node is down (`ECONNREFUSED`, timeout) or contract bytecode is missing (`0x`). **Never marked TAMPERED.** |
| `TAMPERED` | Genuine data tampering | On-chain anchor exists but does not match data, or stored fingerprint does not match recalculated data. |

---

## Project Structure

```text
├── blockchain/
│   ├── contracts/
│   │   └── RecordIntegrity.sol       # Solidity smart contract storing record hashes
│   ├── scripts/
│   │   ├── deploy.js                 # Deploys contract and writes server/.env.blockchain
│   │   └── startDev.js               # npm run chain:start runner (spawns node, deploys, auto-reanchors)
│   └── hardhat.config.js
├── server/
│   ├── models/
│   │   ├── MedicalRecord.js          # Record schema (contractAddress, anchoredAt, verificationStatus, anchorAttempts)
│   │   ├── IntegrityAuditRun.js      # Audit history model (counts, trigger, tamperedRecords)
│   │   └── SystemConfig.js           # Persists active contract address
│   ├── routes/
│   │   └── adminRoutes.js            # Admin endpoints including POST /api/admin/reanchor & integrity-audit routes
│   ├── controllers/
│   │   ├── adminController.js        # Health status check, re-anchor & integrity audit controllers
│   │   └── recordController.js       # Unified verification status integration
│   ├── jobs/
│   │   ├── anchorQueue.js            # Background worker retrying pending anchors
│   │   └── integrityAudit.js         # Scheduled (02:00 daily) and manual integrity audit job
│   ├── services/
│   │   ├── blockchainService.js      # ethers.js interface with dynamic contract reload
│   │   ├── chainResetService.js      # Detects contract address shifts on startup
│   │   └── verificationService.js    # Unified verification status function (computeIntegrityStatus)
│   └── scripts/
│       └── reanchorRecords.js        # Batch re-anchor routine with tampering check
└── client/
    └── src/
        ├── pages/
        │   ├── AdminDashboard.jsx    # System Health panel & Cryptographic Integrity Audit card
        │   ├── RecordDetails.jsx     # Detailed cryptographic inspection panel
        │   ├── PatientDashboard.jsx  # Patient records with verification status
        │   └── PatientRecords.jsx    # Doctor-facing patient records view
```

