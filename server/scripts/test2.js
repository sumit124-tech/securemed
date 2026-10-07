import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

const url = 'http://localhost:5000'; // Assume backend runs here or modify if needed.
// Wait, I can just use mongoose directly instead of axios, it's faster.
import mongoose from 'mongoose';

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smrs').then(async () => {
  const { default: AccessRequest } = await import('../models/AccessRequest.js');
  const { default: User } = await import('../models/User.js');
  const { default: DoctorProfile } = await import('../models/DoctorProfile.js');
  const { default: PatientProfile } = await import('../models/PatientProfile.js');

  const docs = await DoctorProfile.find({ lastName: /doe/i });
  console.log("Dr. Doe profiles:", docs);
  
  if (docs.length > 0) {
    const docUserId = docs[0].user;
    const docProfileId = docs[0]._id;
    console.log("Dr User ID:", docUserId, "Profile ID:", docProfileId);
    
    // Check requests by User ID
    const reqsByUser = await AccessRequest.find({ doctor: docUserId });
    console.log("Requests with doctor=UserId:", reqsByUser.length);

    // Check requests by Profile ID
    const reqsByProfile = await AccessRequest.find({ doctor: docProfileId });
    console.log("Requests with doctor=ProfileId:", reqsByProfile.length);
  } catch (err) {
    console.error(err);
  }
};
run();
