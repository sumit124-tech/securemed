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
  const PatientProfile = mongoose.model('PatientProfile', new mongoose.Schema({ user: mongoose.Schema.Types.ObjectId, firstName: String, lastName: String }));

  const requests = await AccessRequest.find();
  console.log(`Total Requests: ${requests.length}`);
  for (const r of requests) {
    const isPatientUser = await User.findById(r.patient);
    const isPatientProfile = await PatientProfile.findById(r.patient);
    console.log(`Req: ${r._id}, patient is User: ${!!isPatientUser}, patient is Profile: ${!!isPatientProfile}`);
  }

  mongoose.disconnect();
};

run().catch(console.error);
