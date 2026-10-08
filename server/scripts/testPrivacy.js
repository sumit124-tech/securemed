import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import AuditLog from '../models/AuditLog.js';
import User from '../models/User.js';

dotenv.config({ path: '.env' });

const testPrivacy = async () => {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/secure-medical-records');
  const patient = await User.findOne({ role: 'PATIENT' });
  
  const token = jwt.sign(
    { id: patient._id, role: patient.role },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );

  const res = await fetch('http://127.0.0.1:5000/api/audit/my?limit=1000', {
    headers: { Authorization: 'Bearer ' + token }
  });
  const data = await res.json();
  
  const others = data.logs.filter(log => {
    const isActor = log.actor && log.actor._id.toString() === patient._id.toString();
    const isRelated = log.relatedPatient && log.relatedPatient.toString() === patient._id.toString();
    return !isActor && !isRelated;
  });
  
  console.log(`Total logs returned for patient ${patient.email}: ${data.logs.length}`);
  console.log(`Logs that belong to someone else entirely: ${others.length}`);
  if (others.length > 0) {
    console.log('VIOLATION:', others[0]);
  }
  process.exit(0);
};

testPrivacy().catch(console.error);
