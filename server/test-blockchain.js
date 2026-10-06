import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import MedicalRecord from './models/MedicalRecord.js';
import DoctorProfile from './models/DoctorProfile.js';

dotenv.config();
const API_URL = 'http://localhost:5000/api';

async function runTest() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Blockchain Test Script: DB connected');

    // Setup Users
    const pRes = await (await fetch(`${API_URL}/auth/register`, {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ email: `pat_bc_${Date.now()}@test.com`, password: 'password', role: 'PATIENT', firstName: 'Alice', lastName: 'Chain', dob: '1990-01-01' })
    })).json();
    
    const dRes = await (await fetch(`${API_URL}/auth/register`, {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ email: `doc_bc_${Date.now()}@test.com`, password: 'password', role: 'DOCTOR', firstName: 'Bob', lastName: 'Builder', specialization: 'Surgery', licenseNumber: `LIC${Date.now()}` })
    })).json();
    
    await DoctorProfile.updateOne({ user: dRes._id }, { isVerified: true });

    // Request & Approve Access
    const reqAccessRes = await (await fetch(`${API_URL}/access/request`, {
      method: 'POST', headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${dRes.token}`},
      body: JSON.stringify({ patientId: pRes._id })
    })).json();

    await fetch(`${API_URL}/access/respond/${reqAccessRes._id}`, {
      method: 'PUT', headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${pRes.token}`},
      body: JSON.stringify({ status: 'APPROVED' })
    });

    // 1. Create Record & Anchor Hash
    console.log('\n--- 1. Testing Blockchain Anchor ---');
    const recordRes = await (await fetch(`${API_URL}/records`, {
      method: 'POST', headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${dRes.token}`},
      body: JSON.stringify({ patientId: pRes._id, symptoms: 'Cough', diagnosis: 'Flu', treatment: 'Rest', prescription: 'Water' })
    })).json();
    
    console.log('Record created!');
    console.log('MongoDB Hash:', recordRes.currentHash);
    console.log('Blockchain TX:', recordRes.blockchainTxHash);

    // 2. Verify Integrity
    console.log('\n--- 2. Verifying Untampered Record ---');
    const verifyRes1 = await (await fetch(`${API_URL}/records/verify/${recordRes._id}`, {
        headers: {'Authorization': `Bearer ${dRes.token}`}
    })).json();
    
    console.log('Status:', verifyRes1.status);
    console.log('Blockchain Timestamp:', verifyRes1.timestamp);
    if (verifyRes1.status !== 'VERIFIED') throw new Error('Failed initial verification');

    // 3. Tamper with the Database (Simulating an attack)
    console.log('\n--- 3. Simulating Database Tampering ---');
    await MedicalRecord.updateOne({ _id: recordRes._id }, { diagnosis: 'Cancer - FAKE DATA' });
    console.log('MongoDB record altered directly (bypassing application logic).');

    // 4. Verify Integrity Again
    console.log('\n--- 4. Verifying Tampered Record ---');
    const verifyRes2 = await (await fetch(`${API_URL}/records/verify/${recordRes._id}`, {
        headers: {'Authorization': `Bearer ${dRes.token}`}
    })).json();

    console.log('Status:', verifyRes2.status);
    if (verifyRes2.status !== 'INTEGRITY_CHECK_FAILED') throw new Error('Failed to detect tampering');

    console.log('\n✅ BLOCKCHAIN INTEGRATION TEST PASSED FULLY!');
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
runTest();
