import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getPatientRecords } from '../api/records';
import { respondToAccess, revokeAccess, getMyRequests } from '../api/access';
import { FileText, ShieldAlert, CheckCircle, XCircle, Clock, CheckCircle2, ShieldCheck, UserCheck, Inbox, Copy, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const PatientDashboard = () => {
  const { user, profile } = useAuth();
  
  const [records, setRecords] = useState([]);
  const [loadingRecords, setLoadingRecords] = useState(true);
  const [recordsError, setRecordsError] = useState(false);
  
  const [requests, setRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [requestsError, setRequestsError] = useState(false);
  
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [logsError, setLogsError] = useState(false);
  
  const [copied, setCopied] = useState(false);

  const toArray = (res) => Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];

  const safeRecords = toArray(records);
  const safeRequests = toArray(requests);
  const safeLogs = toArray(logs);

  useEffect(() => {
    if (user?._id) {
      fetchRecords();
      fetchRequests();
      fetchLogs();
    }
  }, [user]);

  const fetchRecords = async () => {
    try {
      setLoadingRecords(true);
      setRecordsError(false);
      const res = await getPatientRecords(user?._id);
      setRecords(toArray(res));
    } catch (err) {
      setRecordsError(true);
    } finally {
      setLoadingRecords(false);
    }
  };

  const fetchRequests = async () => {
    try {
      setLoadingRequests(true);
      setRequestsError(false);
      const res = await getMyRequests();
      setRequests(toArray(res));
    } catch (err) {
      setRequestsError(true);
    } finally {
      setLoadingRequests(false);
    }
  };

  const fetchLogs = async () => {
    try {
      setLoadingLogs(true);
      setLogsError(false);
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/audit/my', { headers: { Authorization: `Bearer ${token}` } });
      setLogs(toArray(res).slice(0, 5));
    } catch (err) {
      setLogsError(true);
    } finally {
      setLoadingLogs(false);
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
    if(!window.confirm('Are you sure you want to revoke access for this provider? They will immediately lose access to your records.')) return;
    try {
      await revokeAccess(doctorId);
      fetchRequests();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to revoke access');
    }
  };

  const handleCopyId = () => {
    if (!user?._id) return;
    navigator.clipboard.writeText(user._id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const pendingRequests = safeRequests.filter(r => r?.status === 'PENDING');
  const authorizedDoctors = safeRequests.filter(r => r?.status === 'APPROVED');

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Good morning, {profile?.firstName}</h1>
          <p className="page-subtitle">Here's an overview of your medical records and account activity.</p>
        </div>
        
        <div style={{ background: 'white', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Your Patient ID</div>
            <div style={{ fontFamily: 'monospace', fontWeight: 500, fontSize: '0.875rem' }}>{user?._id || 'N/A'}</div>
          </div>
          <button onClick={handleCopyId} className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem' }}>
            {copied ? <CheckCircle2 size={14} color="var(--success)" /> : <Copy size={14} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon primary">
            <FileText size={24} />
          </div>
          <div className="stat-details">
            <h4>Total Records</h4>
            <div className="stat-value">{loadingRecords ? '-' : safeRecords.length}</div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Created by your doctors</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon success">
            <ShieldCheck size={24} />
          </div>
          <div className="stat-details">
            <h4>Verified Records</h4>
            <div className="stat-value">{loadingRecords ? '-' : safeRecords.length}</div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Secured on blockchain</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon teal">
            <UserCheck size={24} />
          </div>
          <div className="stat-details">
            <h4>Authorized Doctors</h4>
            <div className="stat-value">{loadingRequests ? '-' : authorizedDoctors.length}</div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>With access to records</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon warning">
            <Clock size={24} />
          </div>
          <div className="stat-details">
            <h4>Pending Requests</h4>
            <div className="stat-value">{loadingRequests ? '-' : pendingRequests.length}</div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Awaiting your approval</p>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem', marginBottom: '2rem' }}>
        
        {/* Medical Records Section */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title"><FileText size={20} className="text-muted" /> Recent Medical Records</h3>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {recordsError ? (
              <div style={{ padding: '1.5rem', textAlign: 'center' }}>
                <p style={{ color: 'var(--danger)', marginBottom: '0.5rem' }}>Failed to load records.</p>
                <button onClick={fetchRecords} className="btn btn-sm btn-outline">Retry</button>
              </div>
            ) : loadingRecords ? (
              <div className="loading-container" style={{ padding: '2rem', display: 'flex', justifyContent: 'center' }}><div className="loading-spinner"></div></div>
            ) : safeRecords.length === 0 ? (
              <div className="empty-state" style={{ padding: '3rem 2rem' }}>
                <Inbox size={48} className="empty-state-icon" style={{ marginBottom: '1rem', color: 'var(--primary)' }} />
                <h3 style={{ marginBottom: '1.5rem' }}>How it works</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', textAlign: 'left' }}>
                  <div style={{ background: 'var(--bg-main)', padding: '1.5rem', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ background: 'var(--primary-light)', color: 'var(--primary)', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', marginBottom: '1rem' }}>1</div>
                    <h4 style={{ fontSize: '0.95rem', marginBottom: '0.5rem' }}>Share ID</h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Share your Patient ID with your doctor during your visit.</p>
                  </div>
                  <div style={{ background: 'var(--bg-main)', padding: '1.5rem', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ background: 'var(--warning-light)', color: 'var(--warning)', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', marginBottom: '1rem' }}>2</div>
                    <h4 style={{ fontSize: '0.95rem', marginBottom: '0.5rem' }}>Approve Access</h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Approve their access request in the dashboard.</p>
                  </div>
                  <div style={{ background: 'var(--bg-main)', padding: '1.5rem', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ background: 'var(--success-light)', color: 'var(--success)', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', marginBottom: '1rem' }}>3</div>
                    <h4 style={{ fontSize: '0.95rem', marginBottom: '0.5rem' }}>Records Secured</h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Your doctor adds the record and it is verified on the blockchain.</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Diagnosis / Record Type</th>
                      <th>Date</th>
                      <th>Verification Status</th>
                      <th style={{ textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {safeRecords.map(record => (
                      <tr key={record?._id}>
                        <td><strong>{record?.diagnosis}</strong></td>
                        <td>{new Date(record?.visitDate).toLocaleDateString()}</td>
                        <td>
                          <span className="badge badge-success"><CheckCircle2 size={12}/> Verified</span>
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

        {/* Authorized Doctors Section */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title"><UserCheck size={20} className="text-muted" /> Authorized Doctors</h3>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {requestsError ? (
              <div style={{ padding: '1.5rem', textAlign: 'center' }}>
                <p style={{ color: 'var(--danger)', marginBottom: '0.5rem' }}>Failed to load authorized doctors.</p>
                <button onClick={fetchRequests} className="btn btn-sm btn-outline">Retry</button>
              </div>
            ) : loadingRequests ? (
              <div className="loading-container"><div className="loading-spinner"></div></div>
            ) : authorizedDoctors.length === 0 ? (
              <div className="empty-state">
                <ShieldCheck size={48} className="empty-state-icon" />
                <h3>No authorized doctors</h3>
                <p>You have not granted access to any doctors.</p>
              </div>
            ) : (
              <div className="table-container" style={{ overflowX: 'auto' }}>
                <table style={{ minWidth: '640px' }}>
                  <thead>
                    <tr>
                      <th>Doctor</th>
                      <th>Specialization</th>
                      <th>Status</th>
                      <th>Access Granted On</th>
                      <th style={{ textAlign: 'right', width: '120px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {authorizedDoctors.map(req => (
                      <tr key={req?._id} className="responsive-row">
                        <td title={req?.doctor?._id || req?.doctor}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div className="avatar" style={{ width: '32px', height: '32px', fontSize: '0.75rem' }}>
                              DR
                            </div>
                            <div>
                              <div style={{ fontWeight: 500 }}>
                                {req?.firstName ? `Dr. ${req.firstName} ${req.lastName}` : `Doctor ID: ${req?.doctor?._id || req?.doctor}`}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                {req?.email || req?.doctor?.email}
                              </div>
                              {req?.licenseNumber && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Lic: {req.licenseNumber}</div>}
                            </div>
                          </div>
                        </td>
                        <td>{req?.specialization || 'N/A'}</td>
                        <td>
                          {req?.isVerified && <span className="badge badge-success">Verified</span>}
                        </td>
                        <td>{new Date(req?.respondedAt).toLocaleDateString()}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button onClick={() => {
                            if (window.confirm(`Revoke Dr. ${req.lastName || 'Doctor'}'s access? They will no longer be able to view your records.`)) {
                              handleRevoke(req?.doctor?._id || req?.doctor);
                            }
                          }} className="btn btn-danger" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>
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

        {/* Access Requests Section */}
        {(requestsError || loadingRequests || pendingRequests.length > 0) && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title"><ShieldAlert size={20} className="text-muted" /> Pending Access Requests</h3>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {requestsError ? (
              <div style={{ padding: '1.5rem', textAlign: 'center' }}>
                <p style={{ color: 'var(--danger)', marginBottom: '0.5rem' }}>Failed to load requests.</p>
                <button onClick={fetchRequests} className="btn btn-sm btn-outline">Retry</button>
              </div>
            ) : loadingRequests ? (
              <div className="loading-container"><div className="loading-spinner"></div></div>
            ) : pendingRequests.length > 0 ? (
              <div className="table-container" style={{ overflowX: 'auto' }}>
                <table style={{ minWidth: '640px' }}>
                  <thead>
                    <tr>
                      <th>Doctor</th>
                      <th>Specialization</th>
                      <th>Status</th>
                      <th>Date Requested</th>
                      <th style={{ textAlign: 'right', width: '120px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingRequests.map(req => (
                      <tr key={req?._id} className="responsive-row">
                        <td title={req?.doctor?._id || req?.doctor}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div className="avatar" style={{ width: '32px', height: '32px', fontSize: '0.75rem' }}>
                              DR
                            </div>
                            <div>
                              <div style={{ fontWeight: 500 }}>
                                {req?.firstName ? `Dr. ${req.firstName} ${req.lastName}` : `Doctor ID: ${req?.doctor?._id || req?.doctor}`}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                {req?.email || req?.doctor?.email}
                              </div>
                              {req?.licenseNumber && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Lic: {req.licenseNumber}</div>}
                            </div>
                          </div>
                        </td>
                        <td>{req?.specialization || 'N/A'}</td>
                        <td>
                          {req?.isVerified && <span className="badge badge-success">Verified</span>}
                        </td>
                        <td>{new Date(req?.requestedAt || Date.now()).toLocaleDateString()}</td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                <button onClick={() => {
                                  if (window.confirm(`Approve access for Dr. ${req.lastName || 'Doctor'}?`)) {
                                    handleAccessResponse(req?._id, 'APPROVED');
                                  }
                                }} className="btn btn-success" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>
                                  Approve
                                </button>
                                <button onClick={() => {
                                  if (window.confirm(`Reject access for Dr. ${req.lastName || 'Doctor'}?`)) {
                                    handleAccessResponse(req?._id, 'REJECTED');
                                  }
                                }} className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', borderColor: 'var(--border-light)' }}>
                                  Reject
                                </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        </div>
        )}

        {/* Recent Activity Section */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title"><Activity size={20} className="text-muted" /> Recent Activity</h3>
          </div>
          <div className="card-body" style={{ padding: '1rem' }}>
            {logsError ? (
              <div style={{ padding: '1.5rem', textAlign: 'center' }}>
                <p style={{ color: 'var(--danger)', marginBottom: '0.5rem' }}>Failed to load activity logs.</p>
                <button onClick={fetchLogs} className="btn btn-sm btn-outline">Retry</button>
              </div>
            ) : loadingLogs ? (
               <div className="loading-container" style={{ padding: '2rem', display: 'flex', justifyContent: 'center' }}><div className="loading-spinner"></div></div>
            ) : safeLogs.length === 0 ? (
               <p style={{ color: 'var(--text-muted)' }}>No recent activity.</p>
            ) : (
               <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                 {safeLogs.map((log, idx) => (
                   <li key={log?._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: idx < safeLogs.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
                     <div>
                       <span style={{ fontWeight: 500, fontSize: '0.875rem', color: 'var(--text-main)' }}>{log?.action}</span>
                       <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }} title={log?.actor?._id || log?.actor}>
                         By: {log?.actorName || log?.actor?._id || 'Unknown Actor'} ({log?.role})
                       </div>
                     </div>
                     <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                       {new Date(log?.timestamp).toLocaleString()}
                     </div>
                   </li>
                 ))}
               </ul>
            )}
            <div style={{ marginTop: '1rem', textAlign: 'center' }}>
               <Link to="/audit-trail" style={{ fontSize: '0.875rem', color: 'var(--primary)', fontWeight: 500, textDecoration: 'none' }}>View Full Audit Trail</Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default PatientDashboard;
