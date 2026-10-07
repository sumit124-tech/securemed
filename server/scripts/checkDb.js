import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

const url = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smrs';
mongoose.connect(url)
  .then(async () => {
    const { default: AccessRequest } = await import('../models/AccessRequest.js');
    const { default: User } = await import('../models/User.js');
    const { default: DoctorProfile } = await import('../models/DoctorProfile.js');
    
    const reqs = await AccessRequest.find();
    console.log("All AccessRequests:", JSON.stringify(reqs, null, 2));

    const docs = await User.find({ role: 'DOCTOR' });
    console.log("Doctors:", docs.map(d => ({ _id: d._id, email: d.email })));

    const docProfiles = await DoctorProfile.find();
    console.log("DoctorProfiles:", docProfiles.map(d => ({ _id: d._id, user: d.user, firstName: d.firstName })));
    
    process.exit();
  })
  .catch(console.error);
