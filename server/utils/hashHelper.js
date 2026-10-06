import crypto from 'crypto';

/**
 * Generates a SHA-256 hash representing the current state of a medical record.
 * This ensures any tampering with the DB data will result in a mismatch 
 * when compared with the blockchain anchor.
 */
export const generateRecordHash = (recordData) => {
  // Create a deterministic canonical string from the critical data fields
  const dataString = JSON.stringify({
    patient: recordData.patient.toString(),
    doctor: recordData.doctor.toString(),
    visitDate: recordData.visitDate,
    symptoms: recordData.symptoms,
    diagnosis: recordData.diagnosis,
    treatment: recordData.treatment,
    prescription: recordData.prescription,
  });
  
  return crypto.createHash('sha256').update(dataString).digest('hex');
};
