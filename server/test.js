const tokenJon = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZhYzRhNTRkZDdhNzFlYTY0M2Q1NGVlYSIsInJvbGUiOiJET0NUT1IiLCJpYXQiOjE3OTEzNTk3NTQsImV4cCI6MTc5Mzk1MTc1NH0.o665M40RJHvc8CsO2qOOMwpbI8gaPxLp_s4CqCFy1q8';

const runTests = async () => {
  // Wait to ensure we're at least starting fresh. Since the last verify was minutes ago, it should create ONE new log.
  console.log('--- CLEARING OLD Jon VERIFY LOGS FOR CLEAN TEST ---');
  
  const AuditLog = (await import('./models/AuditLog.js')).default;
  const mongoose = (await import('mongoose')).default;
  await mongoose.connect('mongodb://127.0.0.1:27017/secure-medical-records');
  
  // Note: the prompt says "Logs stay append-only (never delete or edit existing entries)." 
  // I won't delete logs, I will just filter by timestamps for my assertion!
  
  const startTime = new Date();
  
  console.log('--- FETCHING RECORD 5 TIMES (NO FORCELOG) ---');
  for (let i = 0; i < 5; i++) {
    await fetch('http://127.0.0.1:5000/api/records/verify/6ac60196c39b26359e044b2e', { headers: { Authorization: 'Bearer ' + tokenJon } });
  }
  
  console.log('--- CHECKING AUDIT LOGS FOR Jon ---');
  let logs = await AuditLog.find({ actor: '6ac4a54dd7a71ea643d54eea', timestamp: { $gte: startTime }, action: 'VERIFY_RECORD' }).sort({ timestamp: -1 });
  console.log('Total VERIFY_RECORD logs after 5 good requests:', logs.length);
  
  console.log('--- TAMPERING RECORD ---');
  const { execSync } = await import('child_process');
  execSync('node scripts/tamperRecord.js 6ac60196c39b26359e044b2e');
  
  const tamperTime = new Date();
  
  console.log('--- FETCHING TAMPERED RECORD 3 TIMES ---');
  for (let i = 0; i < 3; i++) {
    await fetch('http://127.0.0.1:5000/api/records/verify/6ac60196c39b26359e044b2e', { headers: { Authorization: 'Bearer ' + tokenJon } });
  }
  
  logs = await AuditLog.find({ actor: '6ac4a54dd7a71ea643d54eea', timestamp: { $gte: tamperTime }, action: 'VERIFY_RECORD_FAILED' }).sort({ timestamp: -1 });
  console.log('Total VERIFY_RECORD_FAILED logs after tampering (3 requests):', logs.length);
  
  process.exit(0);
};

runTests().catch(console.error);
