import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';

dotenv.config({ path: '../.env' });

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/smrs');
    console.log('Connected to MongoDB');

    const adminExists = await User.findOne({ email: 'admin@securemed.com' });
    if (adminExists) {
      console.log('Admin already exists!');
      process.exit(0);
    }

    const admin = new User({
      email: 'admin@securemed.com',
      password: 'AdminPassword123!',
      role: 'ADMIN'
    });

    await admin.save();
    console.log('Admin user seeded successfully!');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

seedAdmin();
