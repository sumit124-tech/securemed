import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { requestAccess } from '../api/access';
import { getPatientRecords } from '../api/records';
import { Search, Users, ShieldAlert, FileText, Activity, AlertTriangle, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../api/axios';

const DoctorDashboard = () => {
  const { user, profile, refreshUser } = useAuth();
  const [searchId, setSearchId] = useState('');
  const [patientRecords, setPatientRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [stats, setStats] = useState(null);
  const [sentRequests, setSentRequests] = useState([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [statsError, setStatsError] = useState(false);

  const toArray = (res) => Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];

  useEffect(() => {
    refreshUser();
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoadingStats(true);
      setStatsError(false);
      const token = localStorage.getItem('token');
      const [statsRes, requestsRes] = await Promise.all([
        api.get('/doctor/stats'),
        api.get('/doctor/requests')
      ]);
      setStats(statsRes.data);
      setSentRequests(toArray(requestsRes).slice(0, 5)); // show latest 5
    } catch (err) {
      console.error('Failed to fetch doctor stats', err);
      setStatsError(err.response?.data?.message || 'Failed to load dashboard data');
    } finally {
      setLoadingStats(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchId.trim()) return;

    try {
      setLoading(true);
      setError('');
      setSuccess('');
      setPatientRecords([]);

      const records = await getPatientRecords(searchId);
      setPatientRecords(toArray(records));
    } catch (err) {
      if (err.response?.status === 403) {
        setError('You do not have access to this patient\'s records.');
      } else if (err.response?.status === 404) {
        setError('Patient not found.');
      } else {
        setError(err.response?.data?.message || 'Error searching patient.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRequestAccess = async () => {
    try {
      setLoading(true);
      setError('');
      
      const res = await requestAccess(searchId);
      if (res.status === 'PENDING') {
         setSuccess('Access request sent successfully. Waiting for patient approval.');
         fetchStats(); // refresh stats to show pending
      } else if (res.status === 'APPROVED') {
         setSuccess('You already have access. Try searching again.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to request access.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch(status) {
      case 'APPROVED': return 'badge badge-success';
      case 'PENDING': return 'badge badge-warning';
      case 'REJECTED': return 'badge badge-danger';
      case 'REVOKED': return 'badge badge-danger';
      default: return 'badge';
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Welcome, Dr. {profile?.lastName}</h1>
        <p className="page-subtitle">Manage your authorized patients and medical records.</p>
      </div>

      {!profile?.isVerified && (
        <div className="alert alert-warning" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
          <AlertTriangle size={24} />
          <div>
            <strong>Account Not Verified</strong>
            <p style={{ margin: 0, fontSize: '0.875rem' }}>Your account is pending administrator verification. You cannot request access to patient records until verified.</p>
          </div>
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon primary">
            <Users size={24} />
          </div>
          <div className="stat-details">
            <h4>Authorized Patients</h4>
            <div className="stat-value">{loadingStats ? '-' : (stats?.authorizedPatients || 0)}</div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Patients granted you access</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon success">
            <FileText size={24} />
          </div>
          <div className="stat-details">
            <h4>Records Created</h4>
            <div className="stat-value">{loadingStats ? '-' : (stats?.recordsCreated || 0)}</div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Secured on blockchain</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon warning">
            <Clock size={24} />
          </div>
          <div className="stat-details">
            <h4>Pending Requests</h4>
            <div className="stat-value">{loadingStats ? '-' : (stats?.pendingRequests || 0)}</div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Awaiting patient approval</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon danger">
            <ShieldAlert size={24} />
          </div>
          <div className="stat-details">
            <h4>Rejected/Revoked</h4>
            <div className="stat-value">{loadingStats ? '-' : (stats?.rejectedOrRevokedRequests || 0)}</div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Access removed or denied</p>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '1.5rem', marginBottom: '2rem' }}>
        
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div className="card">
            <div className="card-header">
              <h3 className="card-title"><Search size={20} className="text-muted"/> Patient Search</h3>
            </div>
            <div className="card-body">
              <form onSubmit={handleSearch} style={{ display: 'flex', gap: '1rem' }}>
                <input
                  type="text"
                  placeholder="Enter Patient ID (e.g. 651a...)"
                  className="form-control"
                  value={searchId}
                  onChange={(e) => setSearchId(e.target.value)}
                  required
                />
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Searching...' : 'Search'}
                </button>
              </form>

              {error && (
                <div style={{ marginTop: '1.5rem', padding: '1.5rem', background: 'var(--danger-light)', borderRadius: 'var(--radius-md)', border: '1px solid var(--danger)', textAlign: 'center' }}>
                  <ShieldAlert size={48} className="text-danger" style={{ marginBottom: '1rem' }} />
                  <h4 style={{ color: 'var(--danger)', marginBottom: '0.5rem' }}>Access Denied</h4>
                  <p style={{ color: 'var(--text-main)', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</p>
                  
                  {error.includes('access') && profile?.isVerified && (
                    <button onClick={handleRequestAccess} className="btn btn-primary" disabled={loading}>
                      {loading ? 'Requesting...' : 'Request Access'}
                    </button>
                  )}
                  {error.includes('access') && !profile?.isVerified && (
                    <button className="btn btn-primary" disabled={true} title="You must be verified by an admin first">
                      Request Access
                    </button>
                  )}
                </div>
              )}

              {success && (
                <div className="alert alert-success" style={{ marginTop: '1.5rem' }}>
                  {success}
                </div>
              )}
            </div>
          </div>

          {patientRecords.length > 0 && (
            <div className="card">
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 className="card-title"><FileText size={20} className="text-muted"/> Medical Records</h3>
                <Link to={`/create-record/${searchId}`} className="btn btn-primary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }}>
                  + Author Record
                </Link>
              </div>
              <div className="card-body" style={{ padding: 0 }}>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Diagnosis</th>
                        <th>Date</th>
                        <th style={{ textAlign: 'right' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {patientRecords.map(record => (
                        <tr key={record._id}>
                          <td><strong>{record.diagnosis}</strong></td>
                          <td>{new Date(record.visitDate).toLocaleDateString()}</td>
                          <td style={{ textAlign: 'right' }}>
                            <Link to={`/record/${record._id}`} className="btn btn-outline" style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}>
                              View details
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column */}
        <div>
          <div className="card">
            <div className="card-header">
              <h3 className="card-title" style={{ fontSize: '1rem' }}><Activity size={18} className="text-muted"/> Recent Sent Requests</h3>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              {statsError ? (
                <div style={{ padding: '1.5rem', textAlign: 'center' }}>
                  <p style={{ color: 'var(--danger)', marginBottom: '0.5rem' }}>Failed to load requests.</p>
                  <button onClick={fetchStats} className="btn btn-sm btn-outline">Retry</button>
                </div>
              ) : loadingStats ? (
                <div style={{ padding: '1rem', textAlign: 'center' }}>Loading...</div>
              ) : sentRequests.length === 0 ? (
                <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  No requests sent.
                </div>
              ) : (
                <div className="table-container">
                  <table style={{ minWidth: '100%' }}>
                    <thead>
                      <tr>
                        <th>Patient</th>
                        <th style={{ textAlign: 'right' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sentRequests.map(req => (
                        <tr key={req?._id}>
                          <td style={{ fontSize: '0.75rem', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={req?.patient?._id || req?.patient}>
                            {req?.firstName ? `${req.firstName} ${req.lastName}` : (req?.patient?._id || req?.patient)}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <span className={getStatusBadgeClass(req?.status)} style={{ fontSize: '0.65rem' }}>
                              {req?.status}
                            </span>
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

      </div>
    </div>
  );
};

export default DoctorDashboard;
