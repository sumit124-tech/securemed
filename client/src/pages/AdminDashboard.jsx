import { useState, useEffect } from 'react';
import axios from 'axios';
import { ShieldCheck, UserCheck, UserX, AlertTriangle, ChevronLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const AdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    try {
      setLoading(true);
      setError(false);
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/admin/doctors', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDoctors(res.data);
    } catch (err) {
      console.error(err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (id) => {
    if (!window.confirm('Verify this doctor?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/admin/verify-doctor/${id}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchDoctors();
    } catch (err) {
      alert(err.response?.data?.message || 'Verification failed');
    }
  };

  const handleReject = async (id) => {
    if (!window.confirm('Reject this doctor?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/admin/reject-doctor/${id}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchDoctors();
    } catch (err) {
      alert(err.response?.data?.message || 'Rejection failed');
    }
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Admin Dashboard</h1>
          <p className="page-subtitle">Verify and manage doctor accounts.</p>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title"><ShieldCheck size={20} className="text-primary" /> Doctor Verifications</h3>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          {error ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
              <p style={{ color: 'var(--danger)', marginBottom: '1rem' }}>Failed to load doctors.</p>
              <button onClick={fetchDoctors} className="btn btn-outline">Retry</button>
            </div>
          ) : loading ? (
            <div className="loading-container" style={{ padding: '3rem' }}><div className="loading-spinner"></div></div>
          ) : doctors.length === 0 ? (
            <div className="empty-state">
              <UserCheck size={48} className="empty-state-icon" />
              <h3>No doctors registered</h3>
              <p>There are no doctor accounts to manage.</p>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Doctor Name</th>
                    <th>Email</th>
                    <th>License Number</th>
                    <th>Specialty</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {doctors.map(doc => (
                    <tr key={doc._id}>
                      <td><strong style={{ color: 'var(--text-main)' }}>Dr. {doc.user?.firstName} {doc.user?.lastName}</strong></td>
                      <td>{doc.user?.email}</td>
                      <td style={{ fontFamily: 'monospace' }}>{doc.licenseNumber}</td>
                      <td>{doc.specialty}</td>
                      <td>
                        <span className={`badge badge-${doc.isVerified ? 'success' : 'warning'}`}>
                          {doc.isVerified ? 'VERIFIED' : 'PENDING'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {!doc.isVerified ? (
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                            <button onClick={() => handleVerify(doc._id)} className="btn btn-success" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>
                              <UserCheck size={14} style={{ marginRight: '0.25rem' }} /> Verify
                            </button>
                            <button onClick={() => handleReject(doc._id)} className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>
                              <UserX size={14} style={{ marginRight: '0.25rem' }} /> Reject
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Verified</span>
                        )}
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

export default AdminDashboard;
