import mongoose from 'mongoose';
import AuditLog from './models/AuditLog.js';

await mongoose.connect('mongodb://127.0.0.1:27017/secure-medical-records');

const tokenJon = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZhYzRhNTRkZDdhNzFlYTY0M2Q1NGVlYSIsInJvbGUiOiJET0NUT1IiLCJpYXQiOjE3OTEzNTk3NTQsImV4cCI6MTc5Mzk1MTc1NH0.o665M40RJHvc8CsO2qOOMwpbI8gaPxLp_s4CqCFy1q8';

console.log('Fetching 3 times...');
for (let i = 0; i < 3; i++) {
  const res = await fetch('http://127.0.0.1:5000/api/records/verify/6ac60196c39b26359e044b2e', { headers: { Authorization: 'Bearer ' + tokenJon } });
  const data = await res.json();
  console.log(`Fetch ${i+1}:`, data.status);
}

const logs = await AuditLog.find({ action: 'VERIFY_RECORD_FAILED' });
console.log('Total FAILED logs:', logs.length);
process.exit(0);
