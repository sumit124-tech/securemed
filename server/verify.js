import mongoose from 'mongoose';
import fs from 'fs';

async function verify() {
  console.log("== 1a. CURL Login (Admin) ==");
  const loginRes = await fetch('http://127.0.0.1:5003/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@securemed.com', password: 'AdminPassword123!' })
  });
  const loginStatus = loginRes.status;
  const loginData = await loginRes.json();
  const adminToken = loginData.token;
  delete loginData.token;
  console.log(`Status: ${loginStatus}`);
  console.log(`Body:`, loginData);

  console.log("\n== 1e. GET /auth/me ==");
  const meRes = await fetch('http://127.0.0.1:5003/api/auth/me', {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  console.log(`Me Status: ${meRes.status}`);
  console.log(`Me Body:`, await meRes.json());

  console.log("\n== Get Patient & Doctor Tokens ==");
  const pRes = await fetch('http://127.0.0.1:5003/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'pat3@test.com', password: 'Password1!' })
  });
  const patientToken = (await pRes.json()).token;

  const dRes = await fetch('http://127.0.0.1:5003/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'doc3@test.com', password: 'Password1!' })
  });
  const doctorToken = (await dRes.json()).token;

  console.log(`Patient Token Received: ${!!patientToken}`);
  console.log(`Doctor Token Received: ${!!doctorToken}`);

  console.log("\n== Patient requesting /api/admin/doctors ==");
  const pAdminRes = await fetch('http://127.0.0.1:5003/api/admin/doctors', {
    headers: { 'Authorization': `Bearer ${patientToken}` }
  });
  console.log(`Status: ${pAdminRes.status}`);

  console.log("\n== Doctor requesting /api/admin/doctors ==");
  const dAdminRes = await fetch('http://127.0.0.1:5003/api/admin/doctors', {
    headers: { 'Authorization': `Bearer ${doctorToken}` }
  });
  console.log(`Status: ${dAdminRes.status}`);

  console.log("\n== No token requesting /api/admin/doctors ==");
  const noTokenRes = await fetch('http://127.0.0.1:5003/api/admin/doctors');
  console.log(`Status: ${noTokenRes.status}`);
}

verify().catch(console.error);
