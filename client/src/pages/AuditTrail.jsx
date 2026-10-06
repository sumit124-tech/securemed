import { useState, useEffect } from 'react';
import axios from 'axios';
import { Activity, ShieldAlert, CheckCircle2, FileText, UserPlus, ShieldCheck } from 'lucide-react';

const AuditTrail = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterAction, setFilterAction] = useState('ALL');

  const toArray = (res) => Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : Array.isArray(res?.logs) ? res.logs : [];

  const safeLogs = toArray(logs);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/audit/my', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLogs(toArray(res));
    } catch (err) {
      setError('Failed to fetch audit logs.');
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action) => {
    if (action.includes('RECORD')) return <FileText size={16} />;
    if (action.includes('ACCESS')) return <ShieldCheck size={16} />;
    if (action.includes('LOGIN') || action.includes('REGISTER')) return <UserPlus size={16} />;
    return <Activity size={16} />;
  };

  const getActionColor = (action) => {
    if (action.includes('REJECTED') || action.includes('REVOKED') || action.includes('FAILED')) return 'var(--danger)';
    if (action.includes('APPROVED') || action.includes('CREATED') || action.includes('VERIFY')) return 'var(--success)';
    return 'var(--primary)';
  };

  const filteredLogs = filterAction === 'ALL' ? safeLogs : safeLogs.filter(log => log?.action === filterAction);

  const uniqueActions = [...new Set(safeLogs.map(log => log?.action).filter(Boolean))];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Audit Trail</h1>
        <p className="page-subtitle">A secure, append-only ledger of all activities related to your account and records.</p>
      </div>



      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 className="card-title"><Activity size={20} className="text-muted"/> System Activity Log</h3>
          <select 
            value={filterAction} 
            onChange={(e) => setFilterAction(e.target.value)}
            className="form-control"
            style={{ width: 'auto', padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}
          >
            <option value="ALL">All Actions</option>
            {uniqueActions.map(action => (
              <option key={action} value={action}>{action}</option>
            ))}
          </select>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          {error ? (
            <div style={{ padding: '1.5rem', textAlign: 'center' }}>
              <p style={{ color: 'var(--danger)', marginBottom: '0.5rem' }}>{error}</p>
              <button onClick={fetchLogs} className="btn btn-sm btn-outline">Retry</button>
            </div>
          ) : loading ? (
            <div className="loading-container"><div className="loading-spinner"></div></div>
          ) : filteredLogs.length === 0 ? (
            <div className="empty-state">
              <ShieldAlert size={48} className="empty-state-icon" />
              <h3>No audit logs found</h3>
              <p>Activity will appear here once actions are performed.</p>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Actor</th>
                    <th>Action</th>
                    <th>Resource ID</th>
                    <th>IP Address</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map(log => (
                    <tr key={log?._id}>
                      <td style={{ fontSize: '0.875rem' }}>{new Date(log?.timestamp).toLocaleString()}</td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 500 }}>{log?.actor?.firstName} {log?.actor?.lastName}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{log?.actor?.email} ({log?.role})</span>
                        </div>
                      </td>
                      <td>
                        <span style={{ 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: '0.25rem', 
                          color: getActionColor(log?.action || ''),
                          fontWeight: 600,
                          fontSize: '0.875rem'
                        }}>
                          {getActionIcon(log?.action || '')} {log?.action}
                        </span>
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{log?.resourceId || 'N/A'}</td>
                      <td style={{ fontSize: '0.875rem' }}>{log?.ipAddress || 'Unknown'}</td>
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

export default AuditTrail;
