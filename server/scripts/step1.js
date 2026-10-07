import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), 'server', '.env') });

const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/securemed';

const run = async () => {
  await mongoose.connect(uri);
  
  const User = mongoose.model('User', new mongoose.Schema({ email: String, role: String }));
  const DoctorProfile = mongoose.model('DoctorProfile', new mongoose.Schema({ user: mongoose.Schema.Types.ObjectId, firstName: String, lastName: String }));
  const PatientProfile = mongoose.model('PatientProfile', new mongoose.Schema({ user: mongoose.Schema.Types.ObjectId, firstName: String, lastName: String }));
  
  const AccessRequest = mongoose.model('AccessRequest', new mongoose.Schema({
    patient: mongoose.Schema.Types.ObjectId,
    doctor: mongoose.Schema.Types.ObjectId,
    status: String
  }, { strict: false }));

  console.log("--- Dr. Doe Info ---");
  const doctorUser = await User.findOne({ email: 'jon@gmail.com' });
  const doctorProfile = await DoctorProfile.findOne({ user: doctorUser?._id });
  console.log(`User _id: ${doctorUser?._id}`);
  console.log(`DoctorProfile _id: ${doctorProfile?._id}`);

  console.log("\n--- Sahil Info ---");
  const patientUser = await User.findOne({ email: 'sahil@gmail.com' }); // assuming email is sahil@gmail.com based on previous output
  const patientProfile = await PatientProfile.findOne({ user: patientUser?._id });
  console.log(`User _id: ${patientUser?._id}`);
  console.log(`PatientProfile _id: ${patientProfile?._id}`);

  console.log("\n--- AccessRequests ---");
  const requests = await AccessRequest.find({});
  for (const r of requests) {
    console.log(`Request ID: ${r._id}`);
    console.log(`  doctor: ${r.doctor}`);
    console.log(`  patient: ${r.patient}`);
    console.log(`  status: ${r.status}`);
  }

  mongoose.disconnect();
};

run().catch(console.error);
