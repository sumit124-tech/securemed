import { useState, useEffect, useMemo, useCallback, Fragment } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { 
  Activity, 
  ShieldAlert, 
  FileText, 
  UserPlus, 
  ShieldCheck, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  RotateCcw, 
  ChevronDown, 
  ChevronUp, 
  Layers, 
  ListFilter,
  CheckCircle2,
  Clock,
  Globe
} from 'lucide-react';

const FALLBACK_ACTIONS = [
  { action: 'ALL', label: 'All Actions' },
  { action: 'LOGIN', label: 'User logged in' },
  { action: 'REGISTER', label: 'User registered' },
  { action: 'VERIFY_DOCTOR', label: 'Doctor verified' },
  { action: 'REVERIFY_DOCTOR', label: 'Doctor re-verified' },
  { action: 'REJECT_DOCTOR', label: 'Doctor rejected' },
  { action: 'ADMIN_VIEWED_RECORDS_OVERVIEW', label: 'Records overview viewed' },
  { action: 'ADMIN_VIEWED_PATIENTS', label: 'Patients directory viewed' },
  { action: 'ADMIN_EXPORTED_AUDIT_LOG', label: 'Audit log exported' },
  { action: 'CREATE_RECORD', label: 'Medical record created' },
  { action: 'EDIT_RECORD', label: 'Medical record updated' },
  { action: 'VIEW_RECORDS', label: 'Medical records viewed' },
  { action: 'VERIFY_RECORD', label: 'Integrity verified' },
  { action: 'VERIFY_RECORD_FAILED', label: 'Integrity check failed' },
  { action: 'REQUEST_ACCESS', label: 'Access requested' },
  { action: 'RE_REQUEST_ACCESS', label: 'Access re-requested' },
  { action: 'ACCESS_APPROVED', label: 'Access approved' },
  { action: 'ACCESS_REJECTED', label: 'Access rejected' },
  { action: 'ACCESS_REVOKED', label: 'Access revoked' }
];

const AuditTrail = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Available action options from server
  const [actionOptions, setActionOptions] = useState(FALLBACK_ACTIONS);

  // Filters
  const initialFrom = searchParams.get('from') || searchParams.get('startDate') || '';
  const formattedInitialStart = initialFrom 
    ? (initialFrom.length >= 10 ? initialFrom.substring(0, 10) : initialFrom) 
    : '';

  const [filterAction, setFilterAction] = useState('ALL');
  const [searchEmail, setSearchEmail] = useState('');
  const [startDate, setStartDate] = useState(formattedInitialStart);
  const [endDate, setEndDate] = useState('');
  
  // Grouping & Expansion
  const [groupRepeated, setGroupRepeated] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState({});

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Export State
  const [exporting, setExporting] = useState(false);
  const [exportNotice, setExportNotice] = useState('');

  // 1. Fetch Action Types on Mount
  useEffect(() => {
    const fetchActions = async () => {
      try {
        const res = await api.get('/audit/actions');
        if (res.data?.success && Array.isArray(res.data.data)) {
          setActionOptions([
            { action: 'ALL', label: 'All Actions' },
            ...res.data.data
          ]);
        }
      } catch (err) {
        console.warn('Could not load actions list, using fallbacks:', err.message);
      }
    };
    fetchActions();
  }, []);

  // 2. Fetch Logs when page changes
  const fetchLogs = useCallback(async (targetPage = page) => {
    try {
      setLoading(true);
      setError('');
      
      const params = new URLSearchParams();
      params.append('page', targetPage);
      params.append('limit', 20);
      
      if (filterAction && filterAction !== 'ALL') {
        params.append('action', filterAction);
      }
      if (searchEmail && searchEmail.trim()) {
        params.append('search', searchEmail.trim());
      }
      
      // If startDate matches initial 24h ISO string, preserve precision
      if (startDate) {
        const apiStartDate = (startDate === formattedInitialStart && initialFrom.includes('T'))
          ? initialFrom
          : startDate;
        params.append('startDate', apiStartDate);
      }
      if (endDate) {
        params.append('endDate', endDate);
      }
      
      const res = await api.get(`/audit/my?${params.toString()}`);
      
      const rawLogs = res.data?.data || res.data?.logs || (Array.isArray(res.data) ? res.data : []);
      const pages = res.data?.pagination?.pages || res.data?.totalPages || 1;
      const count = res.data?.pagination?.total ?? res.data?.totalLogs ?? rawLogs.length;

      setLogs(rawLogs);
      setTotalPages(pages);
      setTotalCount(count);
    } catch (err) {
      console.error('fetchLogs error:', err);
      const serverMsg = err.response?.data?.message || err.message || 'Cannot reach server';
      setError(`Error ${err.response?.status || ''}: ${serverMsg}`);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [page, filterAction, searchEmail, startDate, endDate, formattedInitialStart, initialFrom]);

  useEffect(() => {
    fetchLogs(page);
  }, [page, fetchLogs]);

  // Handle Filter Submission
  const handleFilterSubmit = (e) => {
    if (e) e.preventDefault();
    setPage(1);
    fetchLogs(1);
  };

  // Clear All Filters
  const handleClearFilters = () => {
    setFilterAction('ALL');
    setSearchEmail('');
    setStartDate('');
    setEndDate('');
    setPage(1);
    // Clear URL parameters
    setSearchParams({});
    setTimeout(() => {
      fetchLogs(1);
    }, 0);
  };

  // Toggle Group Expansion
  const toggleGroupExpand = (groupId) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  // CSV Export Handler
  const handleExportCsv = async () => {
    try {
      setExporting(true);
      setExportNotice('');

      const params = new URLSearchParams();
      if (filterAction && filterAction !== 'ALL') params.append('action', filterAction);
      if (searchEmail && searchEmail.trim()) params.append('search', searchEmail.trim());
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await api.get(`/audit/export?${params.toString()}`, {
        responseType: 'blob'
      });

      // Create download blob
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const dateStr = new Date().toISOString().slice(0, 10);
      link.setAttribute('download', `audit_log_${dateStr}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setExportNotice('Audit log exported successfully.');
      setTimeout(() => setExportNotice(''), 4000);
    } catch (err) {
      console.error('Export CSV failed:', err);
      setError(`CSV Export failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setExporting(false);
    }
  };

  // Action Icon Helper
  const getActionIcon = (action = '') => {
    if (action.includes('FAILED') || action.includes('DENIED') || action.includes('REJECTED')) return <ShieldAlert size={15} />;
    if (action.includes('RECORD')) return <FileText size={15} />;
    if (action.includes('ACCESS')) return <ShieldCheck size={15} />;
    if (action.includes('LOGIN') || action.includes('REGISTER')) return <UserPlus size={15} />;
    return <Activity size={15} />;
  };

  // Action Color Helper
  const getActionColor = (action = '') => {
    if (action.includes('REJECTED') || action.includes('REVOKED') || action.includes('FAILED')) return 'var(--danger)';
    if (action.includes('APPROVED') || action.includes('VERIFIED') || action.includes('CREATE') && !action.includes('FAILED')) return 'var(--success)';
    if (action.includes('VIEW') || action.includes('EXPORT')) return '#0EA5A4';
    return 'var(--primary)';
  };

  // Grouping Logic
  const displayRows = useMemo(() => {
    if (!groupRepeated) {
      return logs.map(log => ({
        id: log._id,
        primaryLog: log,
        count: 1,
        occurrences: [{
          timestamp: log.timestamp,
          ipAddress: log.ipAddress,
          _id: log._id
        }]
      }));
    }

    return logs.reduce((acc, log) => {
      const last = acc[acc.length - 1];
      const actorId = log?.actor?._id || log?.actor || log?.actorName;
      const lastActorId = last?.primaryLog?.actor?._id || last?.primaryLog?.actor || last?.primaryLog?.actorName;
      
      const resourceKey = log?.resourceId || log?.resourceLabel || '';
      const lastResourceKey = last?.primaryLog?.resourceId || last?.primaryLog?.resourceLabel || '';

      if (
        last &&
        lastActorId === actorId &&
        last.primaryLog?.action === log?.action &&
        lastResourceKey === resourceKey
      ) {
        last.count += 1;
        last.occurrences.push({
          timestamp: log.timestamp,
          ipAddress: log.ipAddress,
          _id: log._id
        });
      } else {
        acc.push({
          id: log._id,
          primaryLog: log,
          count: 1,
          occurrences: [{
            timestamp: log.timestamp,
            ipAddress: log.ipAddress,
            _id: log._id
          }]
        });
      }
      return acc;
    }, []);
  }, [logs, groupRepeated]);

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Page Header */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'flex-start', 
        justifyContent: 'space-between', 
        flexWrap: 'wrap', 
        gap: '1rem', 
        marginBottom: '1.75rem' 
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <h1 className="page-title" style={{ margin: 0 }}>Audit Trail</h1>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.72rem',
              fontWeight: 600,
              padding: '0.2rem 0.55rem',
              borderRadius: '999px',
              background: 'rgba(16, 185, 129, 0.1)',
              color: 'var(--success)',
              border: '1px solid rgba(16, 185, 129, 0.25)'
            }}>
              <CheckCircle2 size={12} /> Append-Only Ledger
            </span>
          </div>
          <p className="page-subtitle" style={{ margin: 0 }}>
            Comprehensive, tamper-evident record of all system operations, authentications, and data requests.
          </p>
        </div>

        {/* Top Controls: CSV Export & Repeat Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Group Repeated Toggle */}
          <button
            type="button"
            onClick={() => setGroupRepeated(prev => !prev)}
            className="btn btn-sm btn-outline"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              background: groupRepeated ? 'var(--bg-card)' : 'transparent',
              borderColor: groupRepeated ? 'var(--primary)' : 'var(--border-light)',
              color: groupRepeated ? 'var(--primary)' : 'var(--text-muted)'
            }}
            title="Toggle grouping of consecutive identical actions"
          >
            <Layers size={14} />
            <span>Group Repeated: <strong>{groupRepeated ? 'On' : 'Off'}</strong></span>
          </button>

          {/* Admin CSV Export Button */}
          {user?.role === 'ADMIN' && (
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={exporting || loading}
              className="btn btn-sm btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
            >
              <Download size={14} />
              <span>{exporting ? 'Exporting...' : 'Export CSV'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Export feedback toast */}
      {exportNotice && (
        <div style={{
          padding: '0.65rem 1rem',
          borderRadius: '8px',
          background: 'rgba(16, 185, 129, 0.12)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          color: 'var(--success)',
          fontSize: '0.85rem',
          fontWeight: 500,
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <CheckCircle2 size={16} /> {exportNotice}
        </div>
      )}

      {/* Filter Bar Card */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.15rem' }}>
        <form onSubmit={handleFilterSubmit} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          {/* Action Filter */}
          <div style={{ minWidth: '180px', flex: '1 1 180px' }}>
            <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <ListFilter size={13} className="text-muted" /> Action Type
            </label>
            <select 
              value={filterAction} 
              onChange={(e) => {
                setFilterAction(e.target.value);
                setPage(1);
              }}
              className="form-control"
              style={{ fontSize: '0.85rem', padding: '0.45rem 0.65rem' }}
            >
              {actionOptions.map(opt => (
                <option key={opt.action} value={opt.action}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* User Email Search */}
          <div style={{ minWidth: '200px', flex: '1.5 1 200px' }}>
            <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Search size={13} className="text-muted" /> User Email
            </label>
            <input 
              type="text" 
              placeholder="Filter by user email..." 
              className="form-control" 
              value={searchEmail} 
              onChange={(e) => setSearchEmail(e.target.value)} 
              style={{ fontSize: '0.85rem', padding: '0.45rem 0.65rem' }}
            />
          </div>

          {/* Start Date */}
          <div style={{ minWidth: '145px', flex: '1 1 145px' }}>
            <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.35rem' }}>
              Start Date
            </label>
            <input 
              type="date" 
              className="form-control" 
              value={startDate} 
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }} 
              style={{ fontSize: '0.85rem', padding: '0.45rem 0.65rem' }} 
            />
          </div>

          {/* End Date */}
          <div style={{ minWidth: '145px', flex: '1 1 145px' }}>
            <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.35rem' }}>
              End Date
            </label>
            <input 
              type="date" 
              className="form-control" 
              value={endDate} 
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }} 
              style={{ fontSize: '0.85rem', padding: '0.45rem 0.65rem' }} 
            />
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button 
              type="submit" 
              className="btn btn-primary btn-sm" 
              style={{ padding: '0.5rem 1rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <Search size={14} /> Filter
            </button>
            <button 
              type="button" 
              onClick={handleClearFilters}
              className="btn btn-outline btn-sm" 
              style={{ padding: '0.5rem 0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
              title="Reset all filters"
            >
              <RotateCcw size={14} /> Clear
            </button>
          </div>
        </form>
      </div>

      {/* Main Ledger Card */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={18} className="text-muted" /> System Activity Log
          </h3>
          {!loading && !error && (
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Total: <strong>{totalCount.toLocaleString()}</strong> events
            </span>
          )}
        </div>

        <div className="card-body" style={{ padding: 0 }}>
          {/* Error State with Server Message & Retry */}
          {error ? (
            <div style={{ padding: '2.5rem 1.5rem', textAlign: 'center' }}>
              <ShieldAlert size={42} style={{ color: 'var(--danger)', margin: '0 auto 0.75rem' }} />
              <h4 style={{ color: 'var(--danger)', marginBottom: '0.5rem', fontWeight: 600 }}>Ledger Query Error</h4>
              <p style={{ color: 'var(--text-muted)', maxWidth: '480px', margin: '0 auto 1.25rem', fontSize: '0.88rem' }}>
                {error}
              </p>
              <button 
                onClick={() => fetchLogs(page)} 
                className="btn btn-sm btn-outline"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <RotateCcw size={14} /> Retry Request
              </button>
            </div>
          ) : loading ? (
            /* Loading Skeleton */
            <div style={{ padding: '1rem' }}>
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div 
                  key={i} 
                  style={{
                    display: 'flex', 
                    gap: '1.25rem', 
                    padding: '0.9rem 0.5rem', 
                    borderBottom: '1px solid var(--border-light)',
                    alignItems: 'center'
                  }}
                >
                  <div style={{ width: '130px', height: '14px', background: 'linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 50%, #F1F5F9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite', borderRadius: '4px' }} />
                  <div style={{ width: '180px', height: '14px', background: 'linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 50%, #F1F5F9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite', borderRadius: '4px' }} />
                  <div style={{ width: '150px', height: '14px', background: 'linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 50%, #F1F5F9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite', borderRadius: '4px' }} />
                  <div style={{ flex: 1, height: '14px', background: 'linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 50%, #F1F5F9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite', borderRadius: '4px' }} />
                  <div style={{ width: '90px', height: '14px', background: 'linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 50%, #F1F5F9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite', borderRadius: '4px' }} />
                </div>
              ))}
            </div>
          ) : displayRows.length === 0 ? (
            /* Empty State */
            <div className="empty-state" style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
              <ShieldAlert size={48} className="empty-state-icon" style={{ opacity: 0.4, margin: '0 auto 1rem' }} />
              <h3 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '0.35rem' }}>No activity matches these filters</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '1.25rem' }}>
                Try selecting a broader date range or clearing the active filters.
              </p>
              <button 
                onClick={handleClearFilters} 
                className="btn btn-sm btn-outline"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <RotateCcw size={14} /> Clear filters
              </button>
            </div>
          ) : (
            /* Table Data */
            <div className="table-container" style={{ overflowX: 'auto', width: '100%', maxWidth: '100%' }}>
              <table style={{ width: '100%', minWidth: '700px', tableLayout: 'fixed', borderCollapse: 'collapse' }}>
                <colgroup>
                  <col style={{ width: '20%' }} />
                  <col style={{ width: '24%' }} />
                  <col style={{ width: '18%' }} />
                  <col style={{ width: '24%' }} />
                  <col style={{ width: '14%' }} />
                </colgroup>
                <thead>
                  <tr style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border-light)' }}>
                    <th style={{ width: '20%', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', textAlign: 'left' }}>Timestamp</th>
                    <th style={{ width: '24%', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', textAlign: 'left' }}>Who</th>
                    <th style={{ width: '18%', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', textAlign: 'left' }}>Action</th>
                    <th style={{ width: '24%', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', textAlign: 'left' }}>Resource</th>
                    <th style={{ width: '14%', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', textAlign: 'left' }}>IP Address</th>
                  </tr>
                </thead>
                <tbody>
                  {displayRows.map((row, index) => {
                    const log = row.primaryLog;
                    const isExpanded = !!expandedGroups[row.id];
                    const hasMultiple = row.count > 1;

                    // Actor display rules:
                    // Primary line: log.actorName (Real name or email; never raw ObjectId)
                    // Secondary line: email & role
                    const primaryWho = log?.actorName || log?.actorEmail || 'Unknown User';
                    const isNameDifferentFromEmail = log?.actorEmail && log?.actorName !== log?.actorEmail;

                    return (
                      <Fragment key={row.id || index}>
                        <tr 
                          className="responsive-row"
                          style={{
                            borderBottom: isExpanded ? 'none' : '1px solid var(--border-light)',
                            background: isExpanded ? 'rgba(99, 102, 241, 0.03)' : 'transparent',
                            transition: 'background 0.15s ease'
                          }}
                        >
                          {/* Timestamp */}
                          <td style={{ padding: '0.75rem 1rem', fontSize: '0.825rem', color: 'var(--text-muted)', textAlign: 'left', overflow: 'hidden' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              <Clock size={13} style={{ opacity: 0.6, flexShrink: 0 }} />
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{new Date(log?.timestamp).toLocaleString()}</span>
                            </div>
                          </td>

                          {/* WHO Column */}
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'left', overflow: 'hidden' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                              <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={primaryWho}>
                                {primaryWho}
                              </span>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1px', display: 'flex', alignItems: 'center', gap: '0.35rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {isNameDifferentFromEmail ? <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }} title={log?.actorEmail}>{log?.actorEmail}</span> : null}
                                <span style={{
                                  display: 'inline-block',
                                  fontSize: '0.68rem',
                                  fontWeight: 600,
                                  padding: '0.1rem 0.4rem',
                                  borderRadius: '4px',
                                  background: 'var(--bg-main)',
                                  border: '1px solid var(--border-light)',
                                  color: 'var(--text-muted)',
                                  flexShrink: 0
                                }}>
                                  {log?.displayRole || log?.role || 'USER'}
                                </span>
                              </span>
                            </div>
                          </td>

                          {/* ACTION Column with Expandable Badge */}
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'left', overflow: 'hidden' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                              <span style={{ 
                                display: 'inline-flex', 
                                alignItems: 'center', 
                                gap: '0.35rem', 
                                color: getActionColor(log?.action || ''),
                                fontWeight: 600,
                                fontSize: '0.85rem',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }} title={log?.actionLabel || log?.action}>
                                <span style={{ flexShrink: 0 }}>{getActionIcon(log?.action || '')}</span>
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{log?.actionLabel || log?.action}</span>
                              </span>

                              {/* Expandable Group Pill Badge */}
                              {hasMultiple && (
                                <button
                                  type="button"
                                  onClick={() => toggleGroupExpand(row.id)}
                                  className="badge"
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.25rem',
                                    padding: '0.15rem 0.45rem',
                                    background: isExpanded ? 'var(--primary)' : 'var(--bg-main)',
                                    color: isExpanded ? '#ffffff' : 'var(--text-muted)',
                                    border: '1px solid var(--border-light)',
                                    borderRadius: '12px',
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    flexShrink: 0,
                                    transition: 'all 0.15s ease'
                                  }}
                                  title="Click to view all timestamps and IPs"
                                >
                                  <span>x{row.count}</span>
                                  {isExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                                </button>
                              )}
                            </div>
                          </td>

                          {/* RESOURCE Column */}
                          <td style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', textAlign: 'left', overflow: 'hidden' }}>
                            {log?.resourceType === 'MedicalRecord' && log?.resourceId && log?.isAccessible ? (
                              <Link 
                                to={`/record/${log.resourceId}`} 
                                style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 600, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                title={log?.resourceLabel || `Medical record #${String(log.resourceId).slice(-6)}`}
                              >
                                {log?.resourceLabel || `Medical record #${String(log.resourceId).slice(-6)}`}
                              </Link>
                            ) : log?.resourceLabel && log.resourceLabel !== '—' ? (
                              <span style={{ fontWeight: 500, color: 'var(--text-main)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log.resourceLabel}>
                                {log.resourceLabel}
                              </span>
                            ) : (
                              <span style={{ color: 'var(--text-muted)' }}>—</span>
                            )}
                          </td>

                          {/* IP ADDRESS Column */}
                          <td style={{ padding: '0.75rem 1rem', fontSize: '0.825rem', color: 'var(--text-muted)', textAlign: 'left', overflow: 'hidden' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              <Globe size={13} style={{ opacity: 0.6, flexShrink: 0 }} />
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{log?.ipAddress || 'Unknown'}</span>
                            </div>
                          </td>
                        </tr>

                        {/* Expandable Timeline Sub-row */}
                        {isExpanded && hasMultiple && (
                          <tr style={{ background: 'rgba(99, 102, 241, 0.03)', borderBottom: '1px solid var(--border-light)' }}>
                            <td colSpan={5} style={{ padding: '0.75rem 1rem 1rem 1rem', textAlign: 'left' }}>
                              <div style={{
                                padding: '0.75rem 1rem',
                                background: 'var(--bg-card)',
                                borderRadius: '8px',
                                border: '1px solid var(--border-light)'
                              }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                                  Occurrences Timeline ({row.count} events)
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.5rem' }}>
                                  {row.occurrences.map((occ, i) => (
                                    <div 
                                      key={occ._id || i}
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        fontSize: '0.78rem',
                                        color: 'var(--text-main)',
                                        padding: '0.3rem 0.5rem',
                                        background: 'var(--bg-main)',
                                        borderRadius: '6px'
                                      }}
                                    >
                                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary)', flexShrink: 0 }} />
                                      <span style={{ fontWeight: 500 }}>{new Date(occ.timestamp).toLocaleTimeString()}</span>
                                      <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>({new Date(occ.timestamp).toLocaleDateString()})</span>
                                      <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: '0.72rem' }}>{occ.ipAddress || 'Unknown'}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Server-Side Pagination Footer */}
        {totalPages > 1 && (
          <div className="card-footer" style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            padding: '0.85rem 1.25rem',
            borderTop: '1px solid var(--border-light)',
            flexWrap: 'wrap',
            gap: '0.75rem'
          }}>
            <span style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
              Showing Page <strong>{page}</strong> of <strong>{totalPages}</strong>
            </span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                type="button"
                className="btn btn-outline btn-sm" 
                disabled={page <= 1 || loading} 
                onClick={() => setPage(p => Math.max(p - 1, 1))}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
              >
                <ChevronLeft size={15} /> Prev
              </button>
              <button 
                type="button"
                className="btn btn-outline btn-sm" 
                disabled={page >= totalPages || loading} 
                onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
              >
                Next <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditTrail;
