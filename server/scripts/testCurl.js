import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

const url = 'http://localhost:5000';

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smrs');
    const { default: User } = await import('../models/User.js');
    const { default: DoctorProfile } = await import('../models/DoctorProfile.js');
    const { default: AccessRequest } = await import('../models/AccessRequest.js');
    
    const reqs = await AccessRequest.find();
    console.log("Total requests:", reqs.length);
    for (const r of reqs) {
       const u = await User.findById(r.doctor);
       const p = await DoctorProfile.findById(r.doctor);
       console.log(`Req ${r._id}: doctor=${r.doctor} isUser=${!!u} isProfile=${!!p}`);
    }
    
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
};
run();
