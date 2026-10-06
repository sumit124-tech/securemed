const testAPI = async () => {
  const patient = { email: 'pat3@test.com', password: 'Password1!', role: 'PATIENT', firstName: 'A', lastName: 'B', dob: '1990-01-01' };
  const doctor = { email: 'doc3@test.com', password: 'Password1!', role: 'DOCTOR', firstName: 'C', lastName: 'D', specialization: 'X', licenseNumber: 'Y' };

  const r1 = await fetch('http://127.0.0.1:5000/api/auth/register', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(patient) });
  console.log('Register Patient:', r1.status);

  const r2 = await fetch('http://127.0.0.1:5000/api/auth/register', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(doctor) });
  console.log('Register Doctor:', r2.status);

  const l1 = await fetch('http://127.0.0.1:5000/api/auth/login', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ email: 'pat3@test.com', password: 'Password1!' }) });
  console.log('Login Patient:', l1.status);

  const l2 = await fetch('http://127.0.0.1:5000/api/auth/login', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ email: 'doc3@test.com', password: 'Password1!' }) });
  console.log('Login Doctor:', l2.status);
};
testAPI();
