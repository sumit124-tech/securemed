import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { execSync } from 'child_process';

dotenv.config({ path: path.join(process.cwd(), 'server', '.env') });

const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/securemed';
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_for_development';

const run = async () => {
  await mongoose.connect(uri);
  const User = mongoose.model('User', new mongoose.Schema({ email: String, role: String }));
  
  const doctorUser = await User.findOne({ email: 'jon@gmail.com' });
  if (!doctorUser) {
      console.log('Doctor not found');
      return;
  }

  const token = jwt.sign({ id: doctorUser._id, role: doctorUser.role }, JWT_SECRET, { expiresIn: '30d' });
  
  console.log('--- GET /api/doctor/stats ---');
  try {
      const stats = execSync(`curl -s -H "Authorization: Bearer ${token}" http://localhost:5000/api/doctor/stats`).toString();
      console.log(stats);
  } catch(e) { console.log(e.message); }

  console.log('--- GET /api/doctor/patients ---');
  try {
      const patients = execSync(`curl -s -H "Authorization: Bearer ${token}" http://localhost:5000/api/doctor/patients`).toString();
      console.log(patients);
  } catch(e) { console.log(e.message); }

  console.log('--- GET /api/doctor/requests ---');
  try {
      const requests = execSync(`curl -s -H "Authorization: Bearer ${token}" http://localhost:5000/api/doctor/requests`).toString();
      console.log(requests);
  } catch(e) { console.log(e.message); }

  mongoose.disconnect();
};

run().catch(console.error);
