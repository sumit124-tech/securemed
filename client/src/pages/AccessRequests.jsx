import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getMyRequests, respondToAccess, revokeAccess } from '../api/access';
import { ShieldCheck, ShieldAlert, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AccessRequests = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const toArray = (res) => Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];

  useEffect(() => {
    if (user?._id) fetchRequests();
  }, [user]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError(false);
      const res = await getMyRequests();
      setRequests(toArray(res));
    } catch (err) {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleAccessResponse = async (requestId, status) => {
    if(status === 'REJECTED' && !window.confirm('Are you sure you want to reject this request?')) return;
    try {
      await respondToAccess(requestId, status);
      fetchRequests();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update access');
    }
  };

  const handleRevoke = async (doctorId) => {
    if(!window.confirm('Are you sure you want to revoke access for this provider?')) return;
    try {
      await revokeAccess(doctorId);
      fetchRequests();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to revoke access');
    }
  };

  const pendingRequests = requests.filter(r => r?.status === 'PENDING');
  const authorizedDoctors = requests.filter(r => r?.status === 'APPROVED');

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button onClick={() => navigate(-1)} className="btn btn-outline" style={{ padding: '0.5rem', borderRadius: '50%' }}>
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="page-title">Access Requests & Authorized Doctors</h1>
          <p className="page-subtitle">Manage who has access to your medical records.</p>
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          Failed to load requests. <button onClick={fetchRequests} className="btn btn-sm btn-outline" style={{ marginLeft: '1rem' }}>Retry</button>
        </div>
      )}

      {loading && !error && (
        <div className="loading-container"><div className="loading-spinner"></div></div>
      )}

      {!loading && !error && (
        <>
          <div className="card" style={{ marginBottom: '2rem' }}>
            <div className="card-header">
              <h3 className="card-title"><ShieldAlert size={20} className="text-warning" /> Pending Access Requests</h3>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              {pendingRequests.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No pending access requests.
                </div>
              ) : (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Doctor</th>
                        <th>Date Requested</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingRequests.map(req => (
                        <tr key={req?._id}>
                          <td>
                            <div style={{ fontWeight: 500 }}>Doctor ID: {req?.doctor?._id || req?.doctor}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{req?.doctor?.email}</div>
                          </td>
                          <td>{new Date(req?.requestedAt || Date.now()).toLocaleDateString()}</td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                              <button onClick={() => handleAccessResponse(req?._id, 'APPROVED')} className="btn btn-success" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>
                                Approve
                              </button>
                              <button onClick={() => handleAccessResponse(req?._id, 'REJECTED')} className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>
                                Reject
                              </button>
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

          <div className="card">
            <div className="card-header">
              <h3 className="card-title"><ShieldCheck size={20} className="text-success" /> Authorized Doctors</h3>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              {authorizedDoctors.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  You have not granted access to any doctors.
                </div>
              ) : (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Doctor</th>
                        <th>Access Granted On</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {authorizedDoctors.map(req => (
                        <tr key={req?._id}>
                          <td>
                            <div style={{ fontWeight: 500 }}>Doctor ID: {req?.doctor?._id || req?.doctor}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{req?.doctor?.email}</div>
                          </td>
                          <td>{new Date(req?.respondedAt).toLocaleDateString()}</td>
                          <td style={{ textAlign: 'right' }}>
                            <button onClick={() => handleRevoke(req?.doctor?._id || req?.doctor)} className="btn btn-danger" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>
                              Revoke Access
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AccessRequests;
