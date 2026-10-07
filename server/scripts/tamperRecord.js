import mongoose from 'mongoose';
import dotenv from 'dotenv';
import MedicalRecord from '../models/MedicalRecord.js';

dotenv.config({ path: '../.env' });

const tamperRecord = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/secure-medical-records');
    console.log('Connected to MongoDB');

    const recordId = process.argv[2];
    if (!recordId) {
      console.log('Please provide a record ID: node tamperRecord.js <recordId>');
      process.exit(1);
    }

    const result = await MedicalRecord.updateOne({ _id: recordId }, { $set: { diagnosis: 'TAMPERED DIAGNOSIS' } });
    
    console.log(`Tampered record ${recordId}: ${result.modifiedCount > 0 ? 'SUCCESS' : 'FAILED'}`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

tamperRecord();
