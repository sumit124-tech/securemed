import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), 'server', '.env') });

const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/securemed';

const run = async () => {
  await mongoose.connect(uri);
  
  // Find Dr. Doe
  const User = mongoose.model('User', new mongoose.Schema({ email: String, role: String }));
  const DoctorProfile = mongoose.model('DoctorProfile', new mongoose.Schema({ user: mongoose.Schema.Types.ObjectId, firstName: String, lastName: String }));
  const PatientProfile = mongoose.model('PatientProfile', new mongoose.Schema({ user: mongoose.Schema.Types.ObjectId, firstName: String, lastName: String }));
  
  const AccessRequest = mongoose.model('AccessRequest', new mongoose.Schema({
    patient: mongoose.Schema.Types.ObjectId,
    doctor: mongoose.Schema.Types.ObjectId,
    status: String
  }, { strict: false }));

  const profiles = await DoctorProfile.find({ lastName: /doe/i });
  console.log('Dr. Doe Profiles:', profiles);
  
  for (const prof of profiles) {
    const user = await User.findById(prof.user);
    console.log(`\nDr. Doe User ID: ${prof.user}, Email: ${user?.email}`);
    
    // Check requests where doctor is User ID
    const reqsByUser = await AccessRequest.find({ doctor: prof.user });
    console.log(`Requests with doctor = User ID: ${reqsByUser.length}`);
    for (const r of reqsByUser) {
        console.log(`  - ID: ${r._id}, patient: ${r.patient}, doctor: ${r.doctor}, status: ${r.status}`);
    }

    // Check requests where doctor is Profile ID
    const reqsByProfile = await AccessRequest.find({ doctor: prof._id });
    console.log(`Requests with doctor = Profile ID: ${reqsByProfile.length}`);
    for (const r of reqsByProfile) {
        console.log(`  - ID: ${r._id}, patient: ${r.patient}, doctor: ${r.doctor}, status: ${r.status}`);
    }
  }

  mongoose.disconnect();
};

run().catch(console.error);
