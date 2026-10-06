import api from './axios';

export const getPatientRecords = async (patientId) => {
  const res = await api.get(`/records/patient/${patientId}`);
  return res.data;
};

export const createRecord = async (recordData) => {
  const res = await api.post('/records', recordData);
  return res.data;
};

export const verifyRecord = async (recordId) => {
  const res = await api.get(`/records/verify/${recordId}`);
  return res.data;
};
