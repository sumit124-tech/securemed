import api from './axios';

export const getPatientRecords = async (patientId, verify = false) => {
  const query = verify ? '?verify=true' : '';
  const res = await api.get(`/records/patient/${patientId}${query}`);
  return res.data;
};

export const createRecord = async (recordData) => {
  const res = await api.post('/records', recordData);
  return res.data;
};

export const verifyRecord = async (recordId, forceLog = false) => {
  const query = forceLog ? '?forceLog=true' : '';
  const res = await api.get(`/records/verify/${recordId}${query}`);
  return res.data;
};

export const editRecord = async (recordId, recordData) => {
  const res = await api.post(`/records/${recordId}/version`, recordData);
  return res.data;
};

export const getRecordHistory = async (recordId) => {
  const res = await api.get(`/records/${recordId}/history`);
  return res.data;
};
