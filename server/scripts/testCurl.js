
const test = async () => {
  try {
    let token;
    let loginRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'testdr2@securemed.com', password: 'Password123!' })
    });
    
    if (!loginRes.ok) {
      let regRes = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'testdr2@securemed.com',
          password: 'Password123!',
          role: 'DOCTOR',
          firstName: 'Test',
          lastName: 'Dr',
          licenseNumber: 'MD12345',
          specialty: 'General'
        })
      });
      const data = await regRes.json();
      token = data.token;
    } else {
      const data = await loginRes.json();
      token = data.token;
    }
    
    if (!token) console.log('NO TOKEN');

    const res = await fetch('http://localhost:5000/api/doctor/patients', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('STATUS:', res.status);
    console.log('BODY:', await res.text());
  } catch (err) {
    console.log(err.message);
  }
};

test();
