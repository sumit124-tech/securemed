import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import blockchainService from '../services/blockchainService.js';
import MedicalRecord from '../models/MedicalRecord.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });
// fallback for test config if any
dotenv.config({ path: path.join(__dirname, '../.env') });

const run = async () => {
  const confirm = process.argv.includes('--confirm');
  
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smrs');
    console.log('Connected to MongoDB.');
    
    const records = await MedicalRecord.find({});
    console.log(`Found ${records.length} total records.`);
    
    const toDelete = [];
    
    for (const record of records) {
      let anchored = true;
      try {
        await blockchainService.getRecordHistory(record._id);
      } catch (err) {
        if (err.message === 'NOT_ANCHORED' || err.message === 'CONTRACT_NOT_DEPLOYED' || err.message === 'BLOCKCHAIN_UNREACHABLE') {
          anchored = false;
        } else {
          // Some other error, assume not anchored to be safe if contract resets
          anchored = false; 
        }
      }
      
      if (!anchored) {
        toDelete.push(record);
      }
    }
    
    console.log(`Found ${toDelete.length} records not anchored on the current chain.`);
    
    if (toDelete.length > 0) {
      console.log('\nRecords to delete:');
      toDelete.forEach(r => console.log(`- ID: ${r._id}, Patient: ${r.patient}, TxHash: ${r.blockchainTxHash}`));
    }
    
    if (confirm) {
      if (toDelete.length > 0) {
        const ids = toDelete.map(r => r._id);
        await MedicalRecord.deleteMany({ _id: { $in: ids } });
        console.log(`\nSuccessfully deleted ${toDelete.length} records.`);
      }
    } else {
      if (toDelete.length > 0) {
        console.log('\nRun with --confirm flag to delete these records.');
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

run();
