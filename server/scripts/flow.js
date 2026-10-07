import { execSync } from 'child_process';
const API_URL = 'http://localhost:5000/api';

const logTest = (step, name, passed, details = '') => {
  console.log(`[Step ${step}] ${name}: ${passed ? 'PASS' : 'FAIL'} ${details}`);
};

const run = async () => {
  let docToken, patToken, pat2Token, doc2Token;
  let docId, patId, pat2Id, doc2Id;
  let recordId;
  
  try {
    // 1. Register Patient and Doctor
    const docEmail = `doc${Date.now()}@test.com`;
    let res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: docEmail, password: 'Password123!', role: 'DOCTOR', firstName: 'D', lastName: 'O', licenseNumber: `D${Date.now()}`, specialization: 'General' })
    });
    let data = await res.json();
    if (!data.token) console.log('DOC REG ERROR:', data);
    docToken = data.token; docId = data._id;
    
    const patEmail = `pat${Date.now()}@test.com`;
    res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: patEmail, password: 'Password123!', role: 'PATIENT', firstName: 'P', lastName: 'A', dob: '1990-01-01' })
    });
    data = await res.json();
    if (!data.token) console.log('PAT REG ERROR:', data);
    patToken = data.token; patId = data._id;

    logTest(1, 'Register patient & doctor', docToken && patToken);

    // 2. Verify Doctor
    execSync(`node verifyDoctor.js ${docEmail}`, { stdio: 'pipe' });
    res = await fetch(`${API_URL}/auth/me`, { headers: { Authorization: `Bearer ${docToken}` } });
    data = await res.json();
    logTest(2, 'Verify doctor', data.profile.isVerified === true);

    // 3. Doctor requests access
    res = await fetch(`${API_URL}/access/request`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${docToken}` },
      body: JSON.stringify({ patientId: patId })
    });
    data = await res.json();
    logTest(3, 'Doctor requests access', data.status === 'PENDING', `Expected ID: ${patId}, API received/used: ${data.patient}`);

    // 4. Patient approves access
    // Wait, first fetch requests to get requestId
    res = await fetch(`${API_URL}/access/my-requests`, { headers: { Authorization: `Bearer ${patToken}` } });
    let requests = await res.json();
    const reqId = requests[0]._id;
    res = await fetch(`${API_URL}/access/respond/${reqId}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${patToken}` },
      body: JSON.stringify({ status: 'APPROVED' })
    });
    data = await res.json();
    logTest(4, 'Patient approves access', data.status === 'APPROVED');

    // 5. Doctor creates record
    res = await fetch(`${API_URL}/records`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${docToken}` },
      body: JSON.stringify({ patientId: patId, diagnosis: 'Fever', symptoms: 'Hot', treatment: 'Rest', prescription: 'Paracetamol', visitDate: new Date() })
    });
    data = await res.json();
    if (!data.blockchainTxHash) console.log('RECORD CREATION ERROR:', data);
    recordId = data._id;
    logTest(5, 'Doctor creates record', !!data.blockchainTxHash, `SHA: ${data.currentHash} | TX: ${data.blockchainTxHash}`);

    // 6. Patient dashboard stats & records match
    res = await fetch(`${API_URL}/records/patient/${patId}`, { headers: { Authorization: `Bearer ${patToken}` } });
    const records = await res.json();
    logTest(6, 'Patient sees record', records.length === 1 && records[0]._id === recordId);

    // 7. Verify Integrity VERIFIED
    res = await fetch(`${API_URL}/records/verify/${recordId}`, { headers: { Authorization: `Bearer ${patToken}` } });
    data = await res.json();
    logTest(7, 'Verify integrity VERIFIED', data.status === 'VERIFIED');

    // 8. Tamper & verify FAILED
    execSync(`node tamperRecord.js ${recordId}`, { stdio: 'pipe' });
    res = await fetch(`${API_URL}/records/verify/${recordId}`, { headers: { Authorization: `Bearer ${patToken}` } });
    data = await res.json();
    logTest(8, 'Verify integrity FAILED after tamper', data.status === 'INTEGRITY_CHECK_FAILED', `(Red warning active, got status ${data.status})`);

    // 9. Revoke access -> 403
    res = await fetch(`${API_URL}/access/revoke/${docId}`, {
      method: 'PUT', headers: { Authorization: `Bearer ${patToken}` }
    });
    res = await fetch(`${API_URL}/records/verify/${recordId}`, { headers: { Authorization: `Bearer ${docToken}` } });
    logTest(9, 'Revoke access yields 403 for doctor', res.status === 403);

    // 10. Different patient/doctor 403
    res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: `pat2${Date.now()}@test.com`, password: 'Password123!', role: 'PATIENT', firstName: 'P2', lastName: 'A2', dob: '1995-05-05' })
    });
    pat2Token = (await res.json()).token;
    res = await fetch(`${API_URL}/records/verify/${recordId}`, { headers: { Authorization: `Bearer ${pat2Token}` } });
    logTest(10, 'Different patient gets 403', res.status === 403, `Got status ${res.status}`);

    // 11. Audit logs exist
    res = await fetch(`${API_URL}/audit/my`, { headers: { Authorization: `Bearer ${patToken}` } });
    const auditLogs = await res.json();
    const hasApprove = Array.isArray(auditLogs) && auditLogs.some(l => l.action === 'ACCESS_APPROVED');
    logTest(11, 'Audit logs exist', hasApprove, `Logs count: ${auditLogs.length || 0}`);

  } catch(e) {
    console.error(e);
  }
};

run();
