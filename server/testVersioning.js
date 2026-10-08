import { MongoClient, ObjectId } from 'mongodb';

const API_URL = 'http://localhost:5003/api';

async function fetchAPI(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    console.error('Failed to parse JSON. Response text:', text);
    throw e;
  }
  if (!res.ok) throw new Error(data.message || 'API Error');
  return data;
}

async function run() {
  try {
    // 1. Create Patient
    let patientRes = await fetchAPI(`${API_URL}/auth/register`, {
      method: 'POST',
      body: JSON.stringify({
        email: `patient_${Date.now()}@test.com`,
        password: 'password123',
        role: 'PATIENT',
        firstName: 'Test',
        lastName: 'Patient',
        dob: '1990-01-01',
        bloodGroup: 'O+',
        contactNumber: '1234567890'
      })
    });
    const patientId = patientRes._id;
    const patientToken = patientRes.token;

    // 2. Create Doctor
    let doctorRes = await fetchAPI(`${API_URL}/auth/register`, {
      method: 'POST',
      body: JSON.stringify({
        email: `doctor_${Date.now()}@test.com`,
        password: 'password123',
        role: 'DOCTOR',
        firstName: 'Test',
        lastName: 'Doctor',
        specialization: 'General',
        licenseNumber: `LIC123_${Date.now()}`
      })
    });
    const doctorId = doctorRes._id;
    const doctorToken = doctorRes.token;

    // Verify Doctor directly via DB
    const client = new MongoClient('mongodb://127.0.0.1:27017/secure-medical-records');
    await client.connect();
    const db = client.db('secure-medical-records');
    await db.collection('doctorprofiles').updateOne({ user: new ObjectId(doctorId) }, { $set: { isVerified: true } });

    // 3. Doctor requests access
    await fetchAPI(`${API_URL}/access/request`, {
      method: 'POST',
      body: JSON.stringify({ patientId }),
      headers: { Authorization: `Bearer ${doctorToken}` }
    });
    
    // 4. Patient gets requests and approves
    let requestsRes = await fetchAPI(`${API_URL}/access/my-requests`, {
      headers: { Authorization: `Bearer ${patientToken}` }
    });
    console.log('Requests:', requestsRes);
    const reqId = requestsRes[0]._id;
    await fetchAPI(`${API_URL}/access/respond/${reqId}`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'APPROVED' }),
      headers: { Authorization: `Bearer ${patientToken}` }
    });

    // 5. Doctor creates a record
    let recordRes = await fetchAPI(`${API_URL}/records`, {
      method: 'POST',
      body: JSON.stringify({
        patientId,
        diagnosis: 'V1 Diagnosis',
        symptoms: 'V1 Symptoms',
        treatment: 'V1 Treatment',
        prescription: 'V1 Prescription'
      }),
      headers: { Authorization: `Bearer ${doctorToken}` }
    });
    
    const v1Id = recordRes._id;
    console.log('Created v1:', v1Id);

    // Wait a sec
    await new Promise(r => setTimeout(r, 2000));

    // 6. Doctor edits to v2
    let edit1Res = await fetchAPI(`${API_URL}/records/${v1Id}/version`, {
      method: 'POST',
      body: JSON.stringify({
        diagnosis: 'V2 Diagnosis',
        symptoms: 'V2 Symptoms',
        treatment: 'V2 Treatment',
        prescription: 'V2 Prescription'
      }),
      headers: { Authorization: `Bearer ${doctorToken}` }
    });
    
    const v2Id = edit1Res._id;
    console.log('Created v2:', v2Id);
    
    // Wait a sec
    await new Promise(r => setTimeout(r, 2000));

    // 7. Doctor edits to v3
    let edit2Res = await fetchAPI(`${API_URL}/records/${v2Id}/version`, {
      method: 'POST',
      body: JSON.stringify({
        diagnosis: 'V3 Diagnosis',
        symptoms: 'V3 Symptoms',
        treatment: 'V3 Treatment',
        prescription: 'V3 Prescription'
      }),
      headers: { Authorization: `Bearer ${doctorToken}` }
    });
    
    const v3Id = edit2Res._id;
    console.log('Created v3:', v3Id);
    
    console.log('Verifying all 3 via API...');
    for (let id of [v1Id, v2Id, v3Id]) {
       let vRes = await fetchAPI(`${API_URL}/records/verify/${id}`, { headers: { Authorization: `Bearer ${doctorToken}` }});
       console.log(`Verify ${id}: ${vRes.status}`);
    }

    console.log('Fetching history for v3...');
    let historyRes = await fetchAPI(`${API_URL}/records/${v3Id}/history`, { headers: { Authorization: `Bearer ${doctorToken}` }});
    console.log(`History returned ${historyRes.length} items. IDs: ${historyRes.map(h => h._id).join(', ')}`);

    console.log('Fetching history for v1...');
    let historyResV1 = await fetchAPI(`${API_URL}/records/${v1Id}/history`, { headers: { Authorization: `Bearer ${doctorToken}` }});
    console.log(`History returned ${historyResV1.length} items. IDs: ${historyResV1.map(h => h._id).join(', ')}`);

    console.log('Tampering v1 in DB...');
    await db.collection('medicalrecords').updateOne({ _id: new ObjectId(v1Id) }, { $set: { diagnosis: 'TAMPERED V1' } });
    await client.close();

    console.log('Re-verifying all 3 after tampering v1...');
    for (let id of [v1Id, v2Id, v3Id]) {
       let vRes = await fetchAPI(`${API_URL}/records/verify/${id}`, { headers: { Authorization: `Bearer ${doctorToken}` }});
       console.log(`Verify ${id}: ${vRes.status}`);
    }
    
  } catch (err) {
    console.error(err.message);
  }
}
run();
