import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getPatientRecords } from '../api/records';
import { ChevronLeft, FileText, FilePlus, ShieldAlert, CheckCircle2 } from 'lucide-react';

const PatientRecords = () => {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const toArray = (res) => Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];

  useEffect(() => {
    fetchRecords();
  }, [patientId]);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getPatientRecords(patientId, true);
      setRecords(toArray(res));
    } catch (err) {
      if (err.response?.status === 403) {
        setError('Access not granted');
      } else {
        setError(err.response?.data?.message || 'Failed to fetch records');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: '1rem', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={() => navigate(-1)} className="btn btn-outline" style={{ padding: '0.5rem', borderRadius: '50%' }}>
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="page-title">Patient Records</h1>
            <p className="page-subtitle">Patient ID: {patientId}</p>
          </div>
        </div>
        <Link to={`/create-record/${patientId}`} className="btn btn-primary" style={{ padding: '0.5rem 1rem' }}>
          <FilePlus size={16} style={{ marginRight: '0.5rem' }}/> Create Record
        </Link>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title"><FileText size={20} className="text-muted" /> Medical Records</h3>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          {error === 'Access not granted' ? (
            <div style={{ padding: '3rem', textAlign: 'center' }}>
              <ShieldAlert size={48} className="text-danger" style={{ marginBottom: '1rem' }} />
              <h3 style={{ color: 'var(--danger)' }}>Access not granted</h3>
              <p>You do not have approved access to this patient's records.</p>
            </div>
          ) : error ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
              <p style={{ color: 'var(--danger)', marginBottom: '1rem' }}>{error}</p>
              <button onClick={fetchRecords} className="btn btn-outline">Retry</button>
            </div>
          ) : loading ? (
            <div className="loading-container" style={{ padding: '3rem' }}><div className="loading-spinner"></div></div>
          ) : records.length === 0 ? (
            <div className="empty-state">
              <FileText size={48} className="empty-state-icon" />
              <h3>No records yet</h3>
              <p>This patient has no medical records.</p>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Diagnosis</th>
                    <th>Integrity Status</th>
                    <th>Transaction Hash</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map(record => (
                    <tr key={record?._id}>
                      <td>{new Date(record?.visitDate).toLocaleDateString()}</td>
                      <td><strong>{record?.diagnosis}</strong></td>
                      <td>
                        {record?.verificationStatus === 'VERIFIED' ? (
                          <span className="badge badge-success"><CheckCircle2 size={12}/> Verified</span>
                        ) : record?.verificationStatus === 'TAMPERED' ? (
                          <span className="badge badge-danger"><ShieldAlert size={12}/> Tampered</span>
                        ) : record?.verificationStatus === 'BLOCKCHAIN_UNREACHABLE' ? (
                          <span className="badge badge-warning" title="Blockchain node offline"><ShieldAlert size={12}/> Offline</span>
                        ) : record?.verificationStatus === 'CONTRACT_NOT_DEPLOYED' ? (
                          <span className="badge badge-warning" title="Contract not deployed at this address"><ShieldAlert size={12}/> No Contract</span>
                        ) : record?.verificationStatus === 'NOT_ANCHORED' ? (
                          <span className="badge badge-warning" title="Record was never anchored on this chain"><ShieldAlert size={12}/> Not Anchored</span>
                        ) : (
                          <span className="badge" style={{ background: '#e2e8f0', color: '#64748b' }}>Not checked</span>
                        )}
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-muted)' }} title={record?.transactionHash}>
                        {record?.transactionHash ? `${record.transactionHash.substring(0, 10)}...` : 'N/A'}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <Link to={`/record/${record?._id}`} className="btn btn-outline" style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}>
                          View Details
                        </Link>
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

export default PatientRecords;
