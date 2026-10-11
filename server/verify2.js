import mongoose from 'mongoose';

async function verify() {
  await mongoose.connect('mongodb://127.0.0.1:27017/secure-medical-records');
  const db = mongoose.connection;
  
  // We'll manually insert them using our API to ensure we know the password
  console.log("\n== Registering Patient & Doctor ==");
  const pReg = await fetch('http://127.0.0.1:5003/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'verify_pat@test.com', password: 'Password1!', role: 'PATIENT', firstName: 'P', lastName: 'T', dob: '1990-01-01' })
  });
  
  const dReg = await fetch('http://127.0.0.1:5003/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'verify_doc@test.com', password: 'Password1!', role: 'DOCTOR', firstName: 'D', lastName: 'C', specialization: 'S', licenseNumber: 'L' })
  });

  const pRes = await fetch('http://127.0.0.1:5003/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'verify_pat@test.com', password: 'Password1!' })
  });
  const patientToken = (await pRes.json()).token;

  const dRes = await fetch('http://127.0.0.1:5003/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'verify_doc@test.com', password: 'Password1!' })
  });
  const doctorToken = (await dRes.json()).token;

  console.log(`Patient Token Received: ${!!patientToken}`);
  console.log(`Doctor Token Received: ${!!doctorToken}`);

  console.log("\n== Patient requesting /api/admin/doctors ==");
  const pAdminRes = await fetch('http://127.0.0.1:5003/api/admin/doctors', {
    headers: { 'Authorization': `Bearer ${patientToken}` }
  });
  console.log(`Status: ${pAdminRes.status}`);
  console.log(`Body:`, await pAdminRes.json());

  console.log("\n== Doctor requesting /api/admin/doctors ==");
  const dAdminRes = await fetch('http://127.0.0.1:5003/api/admin/doctors', {
    headers: { 'Authorization': `Bearer ${doctorToken}` }
  });
  console.log(`Status: ${dAdminRes.status}`);

  console.log("\n== No token requesting /api/admin/doctors ==");
  const noTokenRes = await fetch('http://127.0.0.1:5003/api/admin/doctors');
  console.log(`Status: ${noTokenRes.status}`);

  process.exit(0);
}

verify().catch(console.error);
