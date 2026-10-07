import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import DoctorProfile from '../models/DoctorProfile.js';

dotenv.config({ path: '../.env' });

const verifyDoctor = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/secure-medical-records');
    console.log('Connected to MongoDB');

    const email = process.argv[2];
    if (!email) {
      console.log('Please provide an email: node verifyDoctor.js <email>');
      process.exit(1);
    }

    const user = await User.findOne({ email });
    if (!user) {
      console.log('User not found');
      process.exit(1);
    }

    const doctorProfile = await DoctorProfile.findOne({ user: user._id });
    if (!doctorProfile) {
      console.log('Doctor profile not found');
      process.exit(1);
    }

    const originalStatus = doctorProfile.isVerified;
    doctorProfile.isVerified = true;
    await doctorProfile.save();
    
    console.log(`Matched: 1`);
    console.log(`Modified: ${originalStatus === true ? 0 : 1}`);
    console.log(`Name: ${doctorProfile.firstName} ${doctorProfile.lastName}`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

verifyDoctor();
