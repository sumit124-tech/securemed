import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { Activity, ShieldAlert, CheckCircle2, FileText, UserPlus, ShieldCheck, Search, ChevronLeft, ChevronRight } from 'lucide-react';

const AuditTrail = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filters
  const [filterAction, setFilterAction] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const safeLogs = Array.isArray(logs) ? logs : [];

  useEffect(() => {
    fetchLogs();
  }, [page]); // Fetch on page change

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError('');
      
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', 20);
      if (filterAction !== 'ALL') params.append('action', filterAction);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const res = await api.get(`/audit/my?${params.toString()}`);
      if (res.data && res.data.logs) {
        setLogs(res.data.logs);
        setTotalPages(res.data.totalPages);
      } else {
        // Fallback for older api
        setLogs(Array.isArray(res.data) ? res.data : res);
        setTotalPages(1);
      }
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

  const getActionIcon = (action) => {
    if (action.includes('RECORD')) return <FileText size={16} />;
    if (action.includes('ACCESS')) return <ShieldCheck size={16} />;
    if (action.includes('LOGIN') || action.includes('REGISTER')) return <UserPlus size={16} />;
    return <Activity size={16} />;
  };

  const getActionColor = (action) => {
    if (action.includes('REJECTED') || action.includes('REVOKED') || action.includes('FAILED')) return 'var(--danger)';
    if (action.includes('APPROVED') || action.includes('CREATED') || action.includes('VERIFY_RECORD') && !action.includes('FAILED')) return 'var(--success)';
    return 'var(--primary)';
  };

  const getFriendlyAction = (action) => {
    switch (action) {
      case 'VIEW_RECORDS': return 'Records viewed';
      case 'CREATE_RECORD': return 'Record created';
      case 'ACCESS_APPROVED': return 'Access approved';
      case 'ACCESS_REVOKED': return 'Access revoked';
      case 'REQUEST_ACCESS': return 'Access requested';
      case 'VERIFY_RECORD': return 'Integrity verified';
      case 'VERIFY_RECORD_FAILED': return 'Integrity check failed';
      case 'LOGIN': return 'Login';
      default: return action;
    }
  };

  const filteredLogs = filterAction === 'ALL' ? safeLogs : safeLogs.filter(log => log?.action === filterAction);

  const groupedLogs = filteredLogs.reduce((acc, log) => {
    const last = acc[acc.length - 1];
    const actorId = log?.actor?._id || log?.actor;
    const lastActorId = last?.log?.actor?._id || last?.log?.actor;
    
    if (
      last &&
      lastActorId === actorId &&
      last.log?.action === log?.action &&
      last.log?.resourceId === log?.resourceId
    ) {
      last.count += 1;
      last.timestamps.push(new Date(log?.timestamp).toLocaleString());
    } else {
      acc.push({ log, count: 1, timestamps: [new Date(log?.timestamp).toLocaleString()] });
    }
    return acc;
  }, []);

  const uniqueActions = [...new Set(safeLogs.map(log => log?.action).filter(Boolean))];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Audit Trail</h1>
        <p className="page-subtitle">A secure, append-only ledger of all activities related to your account and records.</p>
      </div>



      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
        <form onSubmit={(e) => { e.preventDefault(); setPage(1); fetchLogs(); }} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
            <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>Action</label>
            <select 
              value={filterAction} 
              onChange={(e) => setFilterAction(e.target.value)}
              className="form-control"
              style={{ width: 'auto', padding: '0.375rem 0.75rem' }}
            >
              <option value="ALL">All Actions</option>
              <option value="VIEW_RECORDS">Records viewed</option>
              <option value="CREATE_RECORD">Record created</option>
              <option value="ACCESS_APPROVED">Access approved</option>
              <option value="ACCESS_REVOKED">Access revoked</option>
              <option value="REQUEST_ACCESS">Access requested</option>
              <option value="VERIFY_RECORD">Integrity verified</option>
              <option value="LOGIN">Login</option>
            </select>
          </div>
          <div>
            <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>Start Date</label>
            <input type="date" className="form-control" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ padding: '0.375rem 0.75rem' }} />
          </div>
          <div>
            <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>End Date</label>
            <input type="date" className="form-control" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ padding: '0.375rem 0.75rem' }} />
          </div>
          <button type="submit" className="btn btn-primary" style={{ padding: '0.45rem 1rem' }}>
            <Search size={16} /> Filter
          </button>
        </form>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title"><Activity size={20} className="text-muted"/> System Activity Log</h3>
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
            <div className="table-container" style={{ overflowX: 'auto' }}>
              <table style={{ minWidth: '640px' }}>
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Who</th>
                    <th>Action</th>
                    <th>Resource</th>
                    <th>IP Address</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedLogs.map((group, index) => {
                    const log = group.log;
                    return (
                    <tr key={`${log?._id || index}`} className="responsive-row">
                      <td style={{ fontSize: '0.875rem' }}>{new Date(log?.timestamp).toLocaleString()}</td>
                      <td title={log?.actor?._id || log?.actor}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 500 }}>{log?.actorName || log?.actor?._id || 'Unknown Actor'}</span>
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
                          {getActionIcon(log?.action || '')} {getFriendlyAction(log?.action || '')}
                        </span>
                        {group.count > 1 && (
                          <span 
                            className="badge" 
                            style={{ marginLeft: '0.5rem', background: 'var(--bg-main)', color: 'var(--text-muted)', border: '1px solid var(--border-light)', fontSize: '0.7rem', cursor: 'help' }}
                            title={`Also triggered at:\n${group.timestamps.slice(1).join('\n')}`}
                          >
                            x{group.count}
                          </span>
                        )}
                      </td>
                      <td style={{ fontSize: '0.875rem' }}>
                        {log?.resourceType === 'MedicalRecord' && log?.resourceId ? (
                          log?.isAccessible ? (
                            <Link to={`/record/${log.resourceId}`} title={log.resourceId} style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 500 }}>
                              Medical record #{log.resourceId.slice(-6)}
                            </Link>
                          ) : (
                            <span title={log.resourceId}>Medical record #{log.resourceId.slice(-6)}</span>
                          )
                        ) : log?.resourceType === 'User' && log?.resourceId ? (
                          log?.isAccessible ? (
                            <Link to="/patient/records" title={log.resourceId} style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 500 }}>
                              Patient records
                            </Link>
                          ) : (
                            <span title={log.resourceId}>Patient resources</span>
                          )
                        ) : log?.resourceType ? (
                          <span title={log?.resourceId || ''}>{log.resourceType} {log.resourceId ? `#${log.resourceId.slice(-6)}` : ''}</span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>
                      <td style={{ fontSize: '0.875rem' }}>{log?.ipAddress || 'Unknown'}</td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
        {totalPages > 1 && (
          <div className="card-footer" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', padding: '1rem' }}>
            <button 
              className="btn btn-outline btn-sm" 
              disabled={page === 1} 
              onClick={() => setPage(p => p - 1)}
            >
              <ChevronLeft size={16} /> Prev
            </button>
            <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Page {page} of {totalPages}</span>
            <button 
              className="btn btn-outline btn-sm" 
              disabled={page === totalPages} 
              onClick={() => setPage(p => p + 1)}
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditTrail;
