import { useState, useEffect } from 'react';
import { requestAccess } from '../api/access';
import api from '../api/axios';
import { Users, FilePlus, Search, UserPlus, FileText } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const MyPatients = () => {
  const { profile } = useAuth();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [searchId, setSearchId] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchMessage, setSearchMessage] = useState({ type: '', text: '' });
  
  const navigate = useNavigate();

  const toArray = (res) => Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      const res = await api.get('/doctor/patients');
      setPatients(toArray(res));
    } catch (err) {
      setError(
        err.response 
          ? `Error ${err.response.status}: ${err.response.data?.message || err.message}`
          : 'Cannot reach server'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRequestAccess = async (e) => {
    e.preventDefault();
    if (!searchId.trim()) return;
    try {
      setSearchLoading(true);
      setSearchMessage({ type: '', text: '' });
      await requestAccess(searchId);
      setSearchMessage({ type: 'success', text: 'Access request sent successfully.' });
      setSearchId('');
    } catch (err) {
      setSearchMessage({ type: 'error', text: err.response?.data?.message || 'Failed to send request' });
    } finally {
      setSearchLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">My Patients</h1>
        <p className="page-subtitle">Patients who have granted you access to their medical records.</p>
      </div>

      <div className="card" style={{ marginBottom: '2rem' }}>
        <div className="card-header">
          <h3 className="card-title"><UserPlus size={20} className="text-muted"/> Request Patient Access</h3>
        </div>
        <div className="card-body">
          <form onSubmit={handleRequestAccess} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <input 
                type="text" 
                placeholder="Enter Patient ID..." 
                className="form-control"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
              />
              {searchMessage.text && (
                <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: searchMessage.type === 'error' ? 'var(--danger)' : 'var(--success)' }}>
                  {searchMessage.text}
                </p>
              )}
            </div>
            <button 
              type="submit" 
              disabled={searchLoading || !searchId.trim() || !profile?.isVerified} 
              className="btn btn-primary"
              title={!profile?.isVerified ? "You must be verified by an admin first." : "Request Access"}
            >
              {searchLoading ? 'Requesting...' : <><Search size={16}/> Request Access</>}
            </button>
          </form>
        </div>
      </div>



      <div className="card">
        <div className="card-header">
          <h3 className="card-title"><Users size={20} className="text-muted"/> Authorized Patients</h3>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          {loading ? (
            <div className="loading-container"><div className="loading-spinner"></div></div>
          ) : error ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
              <p style={{ color: 'var(--danger)', marginBottom: '1rem' }}>{error}</p>
              <button onClick={fetchPatients} className="btn btn-primary">Retry</button>
            </div>
          ) : patients.length === 0 ? (
            <div className="empty-state">
              <Users size={48} className="empty-state-icon" />
              <h3>No patients yet</h3>
              <p>Request access using a Patient ID.</p>
            </div>
          ) : (
            <div className="table-container" style={{ overflowX: 'auto' }}>
              <table style={{ minWidth: '640px' }}>
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Access Granted On</th>
                    <th>Last Record Date</th>
                    <th style={{ textAlign: 'right', width: '250px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {patients.map(patient => (
                    <tr key={patient.patientId} className="responsive-row">
                      <td title={patient.patientId}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 500 }}>
                            {patient.firstName ? `${patient.firstName} ${patient.lastName}` : `Patient ID: ${patient.patientId}`}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{patient.email}</span>
                        </div>
                      </td>
                      <td>{new Date(patient.accessDate).toLocaleDateString()}</td>
                      <td>{patient.lastRecordDate ? new Date(patient.lastRecordDate).toLocaleDateString() : 'No records'}</td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                          <button onClick={() => navigate('/patient-records/' + patient.patientId)} className="btn btn-outline" style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}>
                            <FileText size={14} /> View Records
                          </button>
                          <Link to={`/create-record/${patient.patientId}`} className="btn btn-primary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}>
                            <FilePlus size={14} /> Create Record
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyPatients;
