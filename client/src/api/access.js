import api from './axios';

export const requestAccess = async (patientId) => {
  const res = await api.post('/access/request', { patientId });
  return res.data;
};

export const respondToAccess = async (requestId, status) => {
  const res = await api.put(`/access/respond/${requestId}`, { status });
  return res.data;
};

export const revokeAccess = async (doctorId) => {
  const res = await api.put(`/access/revoke/${doctorId}`);
  return res.data;
};

export const getMyRequests = async () => {
  const res = await api.get('/access/my-requests');
  return res.data;
};
