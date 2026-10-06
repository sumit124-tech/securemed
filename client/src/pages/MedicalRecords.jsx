import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getPatientRecords } from '../api/records';
import { FileText, ShieldAlert, CheckCircle2, ChevronLeft, Inbox } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const MedicalRecords = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const toArray = (res) => Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];

  useEffect(() => {
    if (user?._id) fetchRecords();
  }, [user]);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      setError(false);
      const res = await getPatientRecords(user?._id);
      setRecords(toArray(res));
    } catch (err) {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button onClick={() => navigate(-1)} className="btn btn-outline" style={{ padding: '0.5rem', borderRadius: '50%' }}>
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="page-title">Medical Records</h1>
          <p className="page-subtitle">Your complete, blockchain-secured medical history.</p>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title"><FileText size={20} className="text-muted" /> All Medical Records</h3>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          {error ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
              <p style={{ color: 'var(--danger)', marginBottom: '1rem' }}>Failed to load medical records.</p>
              <button onClick={fetchRecords} className="btn btn-outline">Retry</button>
            </div>
          ) : loading ? (
            <div className="loading-container" style={{ padding: '3rem' }}><div className="loading-spinner"></div></div>
          ) : records.length === 0 ? (
            <div className="empty-state">
              <Inbox size={48} className="empty-state-icon" />
              <h3>No records yet.</h3>
              <p>Your doctor creates records after you approve their access.<br/>Share your Patient ID with them.</p>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Doctor</th>
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
                      <td>
                        <div style={{ fontWeight: 500 }}>{record?.doctor?.firstName} {record?.doctor?.lastName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{record?.doctor?.email}</div>
                      </td>
                      <td><strong>{record?.diagnosis}</strong></td>
                      <td>
                        <span className="badge badge-success"><CheckCircle2 size={12}/> Verified</span>
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
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

export default MedicalRecords;
