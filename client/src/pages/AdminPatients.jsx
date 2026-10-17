import { useState, useEffect } from 'react';
import api from '../api/axios';
import { 
  Users, 
  Search, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight, 
  AlertTriangle,
  UserCheck,
  UserX,
  Mail,
  Calendar
} from 'lucide-react';

const AdminPatients = () => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Search & Pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    fetchPatients();
  }, [page, debouncedSearch]);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/admin/patients', {
        params: {
          page,
          limit: 10,
          search: debouncedSearch
        }
      });

      if (res.data?.success) {
        setPatients(res.data.data || []);
        if (res.data.pagination) {
          setTotalPages(res.data.pagination.pages || 1);
          setTotalCount(res.data.pagination.total || 0);
        }
      }
    } catch (err) {
      console.error('Fetch admin patients error:', err);
      const message = err.response
        ? `Error ${err.response.status}: ${err.response.data?.message || err.message}`
        : 'Cannot reach server. Please check your connection or backend service.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <Users size={24} style={{ color: 'var(--primary)' }} /> Patients Directory
          </h2>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            System-wide registered patient accounts. Medical history and personal health records remain private and encrypted.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchPatients}
          disabled={loading}
          className="btn btn-outline"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Main Table Card */}
      <div className="card">
        {/* Header with Search */}
        <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>
              Total Patients:
            </span>
            <span 
              style={{ 
                padding: '0.15rem 0.5rem', 
                borderRadius: '999px', 
                background: 'rgba(14, 165, 164, 0.15)', 
                color: '#0EA5A4', 
                fontSize: '0.8rem', 
                fontWeight: 700 
              }}
            >
              {totalCount}
            </span>
          </div>

          <div style={{ position: 'relative', width: '280px', maxWidth: '100%' }}>
            <Search 
              size={15} 
              style={{ 
                position: 'absolute', 
                left: '10px', 
                top: '50%', 
                transform: 'translateY(-50%)', 
                color: 'var(--text-muted)' 
              }} 
            />
            <input 
              type="text" 
              className="form-control" 
              placeholder="Search by name or email..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '32px', fontSize: '0.85rem' }}
            />
          </div>
        </div>

        {/* Content Body */}
        <div className="card-body" style={{ padding: 0 }}>
          {error ? (
            <div style={{ padding: '2.5rem', textAlign: 'center' }}>
              <div style={{ display: 'inline-flex', padding: '0.75rem', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', marginBottom: '0.75rem' }}>
                <AlertTriangle size={32} />
              </div>
              <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-main)' }}>Failed to load patients</h4>
              <p style={{ margin: '0 0 1rem 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>{error}</p>
              <button onClick={fetchPatients} className="btn btn-outline" style={{ fontSize: '0.85rem' }}>
                Retry
              </button>
            </div>
          ) : loading && patients.length === 0 ? (
            /* Shimmer Skeleton */
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <div 
                  key={i} 
                  style={{ 
                    height: '42px', 
                    borderRadius: '6px', 
                    background: 'linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 50%, #F1F5F9 75%)', 
                    backgroundSize: '200% 100%', 
                    animation: 'shimmer 1.5s infinite' 
                  }} 
                />
              ))}
            </div>
          ) : patients.length === 0 ? (
            /* Empty State */
            <div style={{ padding: '3.5rem 1.5rem', textAlign: 'center' }}>
              <div 
                style={{ 
                  display: 'inline-flex', 
                  padding: '1rem', 
                  borderRadius: '50%', 
                  background: 'rgba(14, 165, 164, 0.1)', 
                  color: '#0EA5A4', 
                  marginBottom: '0.75rem' 
                }}
              >
                <Users size={36} />
              </div>
              <h4 style={{ margin: '0 0 0.25rem 0', color: 'var(--text-main)' }}>No patients found</h4>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                {debouncedSearch 
                  ? `No patient records matched "${debouncedSearch}".`
                  : 'There are currently no patients registered in the system.'}
              </p>
            </div>
          ) : (
            /* Table */
            <div className="table-container" style={{ overflowX: 'auto', width: '100%', maxWidth: '100%' }}>
              <table style={{ width: '100%', minWidth: '600px', tableLayout: 'fixed', borderCollapse: 'collapse', margin: 0 }}>
                <colgroup>
                  <col style={{ width: '30%' }} />
                  <col style={{ width: '34%' }} />
                  <col style={{ width: '20%' }} />
                  <col style={{ width: '16%' }} />
                </colgroup>
                <thead>
                  <tr>
                    <th style={{ width: '30%', padding: '0.75rem 1rem', textAlign: 'left' }}>Patient Name</th>
                    <th style={{ width: '34%', padding: '0.75rem 1rem', textAlign: 'left' }}>Email Address</th>
                    <th style={{ width: '20%', padding: '0.75rem 1rem', textAlign: 'left' }}>Registered Date</th>
                    <th style={{ width: '16%', padding: '0.75rem 1rem', textAlign: 'left' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {patients.map((patient) => (
                    <tr key={patient._id}>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-main)', overflow: 'hidden' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
                          <div 
                            style={{ 
                              width: '32px', 
                              height: '32px', 
                              borderRadius: '50%', 
                              background: 'rgba(14, 165, 164, 0.15)', 
                              color: '#0EA5A4', 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center',
                              fontSize: '0.8rem',
                              fontWeight: 700,
                              flexShrink: 0
                            }}
                          >
                            {(patient.name?.[0] || 'P').toUpperCase()}
                          </div>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={patient.name}>{patient.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'left', overflow: 'hidden' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={patient.email}>
                          <Mail size={13} style={{ flexShrink: 0 }} />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{patient.email}</span>
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'left', overflow: 'hidden' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          <Calendar size={13} style={{ flexShrink: 0 }} />
                          {patient.createdAt ? new Date(patient.createdAt).toLocaleDateString() : 'N/A'}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>
                        <span 
                          style={{ 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            gap: '0.35rem',
                            padding: '0.2rem 0.55rem', 
                            borderRadius: '999px', 
                            fontSize: '0.75rem', 
                            fontWeight: 600,
                            background: patient.status === 'Active' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                            color: patient.status === 'Active' ? 'var(--success)' : 'var(--danger)',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          <span 
                            style={{ 
                              width: '6px', 
                              height: '6px', 
                              borderRadius: '50%', 
                              background: patient.status === 'Active' ? 'var(--success)' : 'var(--danger)',
                              flexShrink: 0
                            }} 
                          />
                          {patient.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              padding: '0.75rem 1.25rem', 
              borderTop: '1px solid var(--border-light)', 
              background: 'var(--bg-main)' 
            }}
          >
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Showing {patients.length > 0 ? (page - 1) * 10 + 1 : 0} to {Math.min(page * 10, totalCount)} of {totalCount} patients
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page <= 1 || loading}
                className="btn btn-outline"
                style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
              >
                <ChevronLeft size={14} /> Previous
              </button>

              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', padding: '0 0.5rem' }}>
                Page {page} of {totalPages}
              </span>

              <button
                type="button"
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                disabled={page >= totalPages || loading}
                className="btn btn-outline"
                style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPatients;
