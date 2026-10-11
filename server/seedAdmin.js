import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/secure-medical-records');
    
    const adminExists = await User.findOne({ email: 'admin@securemed.com' });
    
    if (adminExists) {
      console.log('Admin user already exists:', adminExists.email);
    } else {
      const admin = await User.create({
        email: 'admin@securemed.com',
        password: 'AdminPassword123!',
        role: 'ADMIN'
      });
      console.log('Admin user successfully created:', admin.email);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding admin:', error);
    process.exit(1);
  }
};

seedAdmin();
