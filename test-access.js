const mongoose = require('./server/node_modules/mongoose');

async function runTest() {
  try {
    const API_URL = 'http://localhost:5000/api';

    // Create random users to ensure no conflicts
    const rand = Math.floor(Math.random() * 100000);
    const doctorEmail = `doc${rand}@test.com`;
    const patientEmail = `pat${rand}@test.com`;

    console.log('1. Registering doctor...');
    await fetch(`${API_URL}/auth/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstName: 'Test', lastName: 'Doc', email: doctorEmail, password: 'password123', role: 'DOCTOR' })
    });
    
    await mongoose.connect('mongodb://127.0.0.1:27017/smrs');
    await mongoose.connection.db.collection('users').updateOne({ email: doctorEmail }, { $set: { isVerified: true } });

    console.log('2. Registering patient...');
    await fetch(`${API_URL}/auth/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstName: 'Test', lastName: 'Pat', email: patientEmail, password: 'password123', role: 'PATIENT' })
    });

    console.log('3. Logging in...');
    let res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: doctorEmail, password: 'password123' })
    }).then(r => r.json());
    const doctorToken = res.token;
    
    res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: patientEmail, password: 'password123' })
    }).then(r => r.json());
    const patientToken = res.token;
    const patientId = res.user.id;
    
    console.log('4. Doctor requests access...');
    await fetch(`${API_URL}/access/request`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${doctorToken}` },
      body: JSON.stringify({ patientId })
    });
    
    console.log('5. Patient approves access...');
    res = await fetch(`${API_URL}/access/patient-requests`, {
      headers: { Authorization: `Bearer ${patientToken}` }
    }).then(r => r.json());
    const requestId = res[0]._id;
    await fetch(`${API_URL}/access/respond/${requestId}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${patientToken}` },
      body: JSON.stringify({ status: 'APPROVED' })
    });

    console.log('6. Doctor attempts to get records (APPROVED)...');
    let getRes = await fetch(`${API_URL}/records/patient/${patientId}?verify=true`, {
      headers: { Authorization: `Bearer ${doctorToken}` }
    });
    if (!getRes.ok) throw new Error('FAIL: ' + getRes.status);
    let data = await getRes.json();
    console.log(' -> SUCCESS: Doctor can access records. Count:', data.length);

    console.log('7. Patient revokes access...');
    await fetch(`${API_URL}/access/respond/${requestId}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${patientToken}` },
      body: JSON.stringify({ status: 'REVOKED' })
    });

    console.log('8. Doctor attempts to get records (REVOKED)...');
    getRes = await fetch(`${API_URL}/records/patient/${patientId}?verify=true`, {
      headers: { Authorization: `Bearer ${doctorToken}` }
    });
    if (getRes.status === 403) {
      console.log(' -> SUCCESS: Doctor received 403 Forbidden as expected.');
    } else {
      console.error(' -> FAIL: Expected 403, got', getRes.status);
    }
    
    console.log('\nTEST COMPLETED.');
    process.exit(0);
  } catch (err) {
    console.error('Test failed with error:', err.message);
    if (err.code === 'ECONNREFUSED') {
      console.error('Server is not running on port 5000. Please start the server and try again.');
    }
    process.exit(1);
  }
}

runTest();
