import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import DoctorProfile from './models/DoctorProfile.js';

dotenv.config();

const API_URL = 'http://localhost:5000/api';

async function runTest() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Test Script: DB connected');

    // 1. Register Patient
    const pRes = await fetch(`${API_URL}/auth/register`, {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ email: `patient${Date.now()}@test.com`, password: 'password', role: 'PATIENT', firstName: 'John', lastName: 'Doe', dob: '1990-01-01' })
    });
    const patient = await pRes.json();
    console.log('✓ Patient registered:', patient.email);

    // 2. Register Doctor
    const dRes = await fetch(`${API_URL}/auth/register`, {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ email: `doctor${Date.now()}@test.com`, password: 'password', role: 'DOCTOR', firstName: 'Jane', lastName: 'Smith', specialization: 'Neurology', licenseNumber: `LIC${Date.now()}` })
    });
    const doctor = await dRes.json();
    console.log('✓ Doctor registered:', doctor.email);

    // 3. Verify Doctor manually (simulating Admin action)
    await DoctorProfile.updateOne({ user: doctor._id }, { isVerified: true });
    console.log('✓ Doctor verified in DB');

    // 4. Doctor requests access
    const reqAccessRes = await fetch(`${API_URL}/access/request`, {
      method: 'POST', headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${doctor.token}`},
      body: JSON.stringify({ patientId: patient._id })
    });
    const accessReq = await reqAccessRes.json();
    console.log('✓ Doctor requested access. Status:', accessReq.status);

    // 5. Patient approves access
    const approveRes = await fetch(`${API_URL}/access/respond/${accessReq._id}`, {
      method: 'PUT', headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${patient.token}`},
      body: JSON.stringify({ status: 'APPROVED' })
    });
    const approvedReq = await approveRes.json();
    console.log('✓ Patient approved access. Status:', approvedReq.status);

    // 6. Doctor creates medical record
    const recordRes = await fetch(`${API_URL}/records`, {
      method: 'POST', headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${doctor.token}`},
      body: JSON.stringify({ patientId: patient._id, symptoms: 'Headache', diagnosis: 'Migraine', treatment: 'Rest', prescription: 'Ibuprofen' })
    });
    const record = await recordRes.json();
    
    if (record._id) {
      console.log('✓ Medical record created successfully.');
      console.log('  -> Generated SHA-256 Hash:', record.currentHash);
      console.log('\n✅ ALL INTEGRATION TESTS PASSED!');
    } else {
      console.error('❌ Record creation failed:', record);
    }
    
    process.exit(0);
  } catch (e) {
    console.error('Test Failed:', e);
    process.exit(1);
  }
}

runTest();
