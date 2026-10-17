import crypto from 'crypto';

/**
 * Returns a canonical, normalized object from medical record data.
 * Guarantees identical field presence, order, and string serialization
 * across creation, edit, verification, audit, and re-anchor.
 *
 * @param {Object} record - Raw record data or Mongoose MedicalRecord document
 * @returns {Object|null} Deterministic canonical record representation
 */
export const canonicalRecordData = (record) => {
  if (!record) return null;

  // Extract patient ID string deterministically
  const patientId = record.patient?._id
    ? record.patient._id.toString()
    : (record.patient ? record.patient.toString() : '');

  // Extract doctor ID string deterministically
  const doctorId = record.doctor?._id
    ? record.doctor._id.toString()
    : (record.doctor ? record.doctor.toString() : '');

  // Normalize visitDate to ISO-8601 string representation
  let visitDateIso = '';
  if (record.visitDate) {
    const d = new Date(record.visitDate);
    visitDateIso = !isNaN(d.getTime()) ? d.toISOString() : String(record.visitDate);
  }

  // Canonicalize clinical string fields: fallback to empty string if undefined/null
  const symptoms = typeof record.symptoms === 'string' ? record.symptoms : (record.symptoms || '');
  const diagnosis = typeof record.diagnosis === 'string' ? record.diagnosis : (record.diagnosis || '');
  const treatment = typeof record.treatment === 'string' ? record.treatment : (record.treatment || '');
  const prescription = typeof record.prescription === 'string' ? record.prescription : (record.prescription || '');

  return {
    patient: patientId,
    doctor: doctorId,
    visitDate: visitDateIso,
    symptoms,
    diagnosis,
    treatment,
    prescription,
  };
};

/**
 * Generates a SHA-256 hash representing the current canonical state of a medical record.
 * This guarantees consistent hashes across creation, edit, verification, audit, and re-anchor.
 *
 * @param {Object} recordData - Record object or MedicalRecord document
 * @returns {string} 64-character hex SHA-256 digest
 */
export const generateRecordHash = (recordData) => {
  const canonical = canonicalRecordData(recordData);
  const dataString = JSON.stringify(canonical);
  return crypto.createHash('sha256').update(dataString).digest('hex');
};

/**
 * Checks whether all clinical fields in a record are empty or 'Not provided'.
 * Used to classify early test records as LEGACY_EMPTY.
 *
 * @param {Object} record - Record object or document
 * @returns {boolean} True if all clinical fields are absent, whitespace, or 'Not provided'
 */
export const isLegacyEmptyRecord = (record) => {
  if (!record) return true;
  const isEmptyVal = (val) => {
    if (val === null || val === undefined) return true;
    const str = String(val).trim().toLowerCase();
    return str === '' || str === 'not provided' || str === 'n/a' || str === 'none';
  };

  return (
    isEmptyVal(record.symptoms) &&
    isEmptyVal(record.diagnosis) &&
    isEmptyVal(record.treatment) &&
    isEmptyVal(record.prescription)
  );
};

export default {
  canonicalRecordData,
  generateRecordHash,
  isLegacyEmptyRecord
};
