import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), 'server', '.env') });

const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/securemed';

const run = async () => {
  await mongoose.connect(uri);
  
  const AccessRequest = mongoose.model('AccessRequest', new mongoose.Schema({
    patient: mongoose.Schema.Types.ObjectId,
    doctor: mongoose.Schema.Types.ObjectId,
    status: String
  }, { strict: false }));
  
  const User = mongoose.model('User', new mongoose.Schema({ email: String, role: String }));
  const DoctorProfile = mongoose.model('DoctorProfile', new mongoose.Schema({ user: mongoose.Schema.Types.ObjectId, firstName: String, lastName: String }));

  const requests = await AccessRequest.find();
  console.log(`Total Requests: ${requests.length}`);
  for (const r of requests) {
    const isDoctorUser = await User.findById(r.doctor);
    const isDoctorProfile = await DoctorProfile.findById(r.doctor);
    console.log(`Req: ${r._id}, doctor is User: ${!!isDoctorUser}, doctor is Profile: ${!!isDoctorProfile}`);
  }

  mongoose.disconnect();
};

run().catch(console.error);
