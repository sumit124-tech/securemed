import { useState, useEffect, useRef } from 'react';
import api from '../api/axios';
import { 
  ShieldCheck, 
  UserCheck, 
  UserX, 
  AlertTriangle, 
  RefreshCw, 
  X, 
  Check, 
  Search, 
  ChevronLeft, 
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Info,
  Users,
  Stethoscope,
  FileText,
  Activity,
  Server,
  Database,
  Cpu,
  Copy,
  CheckCheck,
  Clock,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useNavigate, useSearchParams } from 'react-router-dom';

const AdminDashboard = () => {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Data State
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Tabs, Search & Pagination State
  const tabFromUrl = (searchParams.get('tab') || 'PENDING').toUpperCase();
  const initialTab = ['ALL', 'PENDING', 'VERIFIED', 'REJECTED'].includes(tabFromUrl) ? tabFromUrl : 'PENDING';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [counts, setCounts] = useState({ all: 0, pending: 0, verified: 0, rejected: 0 });
  
  // Modal State
  const [modalState, setModalState] = useState(null); // { type: 'VERIFY' | 'REJECT', doctor: doc }
  const [rejectionReason, setRejectionReason] = useState('');
  const [reverificationReason, setReverificationReason] = useState('');
  const [modalError, setModalError] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  // Stats State
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState('');

  // System Health State
  const [health, setHealth] = useState(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [healthRefreshing, setHealthRefreshing] = useState(false);
  const [healthError, setHealthError] = useState('');
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [healthExpanded, setHealthExpanded] = useState(false); // Collapsible panel state

  // Ref for smooth scrolling to Doctor Verifications section
  const doctorVerificationsRef = useRef(null);

  const scrollToVerifications = () => {
    if (doctorVerificationsRef.current) {
      doctorVerificationsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Debounce search input by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1); // Reset to first page on search
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch doctors when tab, page, or debounced search changes
  useEffect(() => {
    fetchDoctors();
  }, [activeTab, page, debouncedSearch]);

  // Initial fetch stats
  useEffect(() => {
    fetchStats();
  }, []);

  // Fetch health on mount and auto-refresh every 30 seconds
  useEffect(() => {
    fetchHealth(true);

    const intervalId = setInterval(() => {
      fetchHealth(false);
    }, 30000);

    return () => clearInterval(intervalId);
  }, []);

  const fetchHealth = async (isInitial = false) => {
    try {
      if (isInitial) {
        setHealthLoading(true);
      } else {
        setHealthRefreshing(true);
      }
      setHealthError('');
      const res = await api.get('/admin/health');
      if (res.data?.success && res.data?.data) {
        setHealth(res.data.data);
      } else if (res.data?.data) {
        setHealth(res.data.data);
      }
    } catch (err) {
      console.error('Fetch system health error:', err);
      const message = err.response
        ? `Error ${err.response.status}: ${err.response.data?.message || err.message}`
        : 'Failed to fetch system health status. Please verify server connectivity.';
      setHealthError(message);
    } finally {
      if (isInitial) setHealthLoading(false);
      setHealthRefreshing(false);
    }
  };

  const handleCopyContract = (address) => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      setStatsError('');
      const res = await api.get('/admin/stats');
      if (res.data?.success && res.data?.data) {
        setStats(res.data.data);
      } else if (res.data) {
        setStats(res.data);
      }
    } catch (err) {
      console.error('Fetch admin stats error:', err);
      const message = err.response
        ? `Error ${err.response.status}: ${err.response.data?.message || err.message}`
        : 'Failed to load stats. Please check your connection or backend service.';
      setStatsError(message);
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchAllData = async () => {
    await Promise.all([fetchDoctors(), fetchStats(), fetchHealth(false)]);
  };

  const fetchDoctors = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/admin/doctors', {
        params: {
          status: activeTab,
          page,
          limit: 10,
          search: debouncedSearch
        }
      });

      const doctorList = Array.isArray(res.data?.data) 
        ? res.data.data 
        : Array.isArray(res.data) 
        ? res.data 
        : [];
      setDoctors(doctorList);

      if (res.data?.pagination) {
        setTotalPages(res.data.pagination.pages || 1);
        setTotalCount(res.data.pagination.total || 0);
      }
      if (res.data?.counts) {
        setCounts(res.data.counts);
      }
    } catch (err) {
      console.error('Fetch doctors error:', err);
      const message = err.response
        ? `Error ${err.response.status}: ${err.response.data?.message || err.message}`
        : 'Cannot reach server. Please check your connection or backend service.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // React to URL tab query parameter changes (e.g. from notification clicks or on load)
  useEffect(() => {
    const currentParam = searchParams.get('tab');
    if (currentParam) {
      const upper = currentParam.toUpperCase();
      if (['ALL', 'PENDING', 'VERIFIED', 'REJECTED'].includes(upper)) {
        if (upper !== activeTab) {
          setActiveTab(upper);
          setPage(1);
        }
        // Smooth scroll when ?tab= is present
        setTimeout(() => {
          scrollToVerifications();
        }, 150);
      }
    }
  }, [searchParams]);

  const handleTabChange = (tab) => {
    if (tab === activeTab) {
      scrollToVerifications();
      return;
    }
    setActiveTab(tab);
    setPage(1);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('tab', tab);
      return next;
    }, { replace: true });
    setTimeout(() => {
      scrollToVerifications();
    }, 50);
  };

  const openVerifyModal = (doc) => {
    setModalState({ type: 'VERIFY', doctor: doc });
    setReverificationReason('');
    setModalError('');
  };

  const openRejectModal = (doc) => {
    setModalState({ type: 'REJECT', doctor: doc });
    setRejectionReason('');
    setModalError('');
  };

  const closeModal = (force = false) => {
    if (submittingAction && !force) return;
    setModalState(null);
    setModalError('');
    setRejectionReason('');
    setReverificationReason('');
  };

  const handleConfirmVerify = async () => {
    if (!modalState?.doctor) return;
    const doctor = modalState.doctor;
    const doctorId = doctor._id;
    const isReverifying = doctor.verificationStatus === 'REJECTED';
    const doctorName = doctor.firstName && doctor.lastName
      ? `${doctor.firstName} ${doctor.lastName}`
      : doctor.user?.name || doctor.licenseNumber || 'Doctor';

    const cleanReverificationReason = reverificationReason.trim();
    if (isReverifying && cleanReverificationReason.length < 10) {
      setModalError('Reason for re-verification is required and must be at least 10 characters long.');
      return;
    }

    try {
      setSubmittingAction(true);
      setModalError('');
      await api.put(`/admin/verify-doctor/${doctorId}`, {
        reverificationReason: isReverifying ? cleanReverificationReason : undefined
      });
      
      // Update local state immediately for instant UI feedback
      setDoctors(prev => prev.map(d => d._id === doctorId ? {
        ...d,
        isVerified: true,
        verificationStatus: 'VERIFIED',
        rejectionReason: null,
        reverificationReason: isReverifying ? cleanReverificationReason : d.reverificationReason
      } : d));

      closeModal(true);
      toast.success(
        isReverifying 
          ? `Dr. ${doctorName} has been re-verified.`
          : `Dr. ${doctorName} has been verified.`
      );
      await Promise.all([fetchDoctors(), fetchStats()]);
    } catch (err) {
      console.error('Doctor verification failed:', err);
      const serverMsg = err.response?.data?.message || err.message || 'Verification failed';
      const statusText = err.response?.status ? `Error ${err.response.status}: ` : '';
      setModalError(`${statusText}${serverMsg}`);
      toast.error(`${statusText}${serverMsg}`);
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!modalState?.doctor) return;
    const doctor = modalState.doctor;
    const doctorName = doctor.firstName && doctor.lastName
      ? `${doctor.firstName} ${doctor.lastName}`
      : doctor.user?.name || doctor.licenseNumber || 'Doctor';

    const cleanReason = rejectionReason.trim();
    if (cleanReason.length < 10) {
      setModalError('Rejection reason is required and must be at least 10 characters long.');
      return;
    }

    const doctorId = doctor._id;
    try {
      setSubmittingAction(true);
      setModalError('');
      await api.put(`/admin/reject-doctor/${doctorId}`, { reason: cleanReason });
      
      // Update local state immediately for instant UI feedback
      setDoctors(prev => prev.map(d => d._id === doctorId ? {
        ...d,
        isVerified: false,
        verificationStatus: 'REJECTED',
        rejectionReason: cleanReason
      } : d));

      closeModal(true);
      toast.success(
        `Dr. ${doctorName} has been rejected. The reason was sent to the doctor.`,
        {
          label: 'View rejected',
          onClick: () => handleTabChange('REJECTED')
        }
      );
      await Promise.all([fetchDoctors(), fetchStats()]);
    } catch (err) {
      console.error('Doctor rejection failed:', err);
      const serverMsg = err.response?.data?.message || err.message || 'Rejection failed';
      const statusText = err.response?.status ? `Error ${err.response.status}: ` : '';
      setModalError(`${statusText}${serverMsg}`);
      toast.error(`${statusText}${serverMsg}`);
    } finally {
      setSubmittingAction(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title">Admin Dashboard</h1>
          <p className="page-subtitle">Verify and manage doctor accounts and platform integrity.</p>
        </div>
        <button 
          onClick={fetchAllData} 
          disabled={loading || statsLoading}
          className="btn btn-outline" 
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}
          title="Refresh dashboard data"
        >
          <RefreshCw size={16} className={(loading || statsLoading) ? 'animate-spin' : ''} />
          {(loading || statsLoading) ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Stat Cards Section */}
      {statsError ? (
        <div className="card" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderLeft: '4px solid var(--danger)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <AlertTriangle size={20} style={{ color: 'var(--danger)', flexShrink: 0 }} />
            <div>
              <strong style={{ fontSize: '0.9rem', color: 'var(--danger)', display: 'block' }}>Failed to load dashboard statistics</strong>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{statsError}</span>
            </div>
          </div>
          <button 
            type="button" 
            onClick={fetchStats} 
            disabled={statsLoading} 
            className="btn btn-outline" 
            style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
          >
            {statsLoading ? 'Retrying...' : 'Retry Stats'}
          </button>
        </div>
      ) : (
        <div 
          style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', 
            gap: '1rem', 
            marginBottom: '1.75rem' 
          }}
        >
          {[
            {
              id: 'TOTAL_DOCTORS',
              title: 'Total Doctors',
              value: stats?.totalDoctors ?? counts.all ?? 0,
              icon: Stethoscope,
              color: 'var(--primary)',
              bg: 'var(--primary-light)',
              clickable: true,
              tab: 'ALL'
            },
            {
              id: 'PENDING',
              title: 'Pending',
              value: stats?.pendingDoctors ?? counts.pending ?? 0,
              icon: AlertTriangle,
              color: 'var(--warning)',
              bg: 'var(--warning-light)',
              clickable: true,
              tab: 'PENDING'
            },
            {
              id: 'VERIFIED',
              title: 'Verified',
              value: stats?.verifiedDoctors ?? counts.verified ?? 0,
              icon: UserCheck,
              color: 'var(--success)',
              bg: 'var(--success-light)',
              clickable: true,
              tab: 'VERIFIED'
            },
            {
              id: 'REJECTED',
              title: 'Rejected',
              value: stats?.rejectedDoctors ?? counts.rejected ?? 0,
              icon: UserX,
              color: 'var(--danger)',
              bg: 'var(--danger-light)',
              clickable: true,
              tab: 'REJECTED'
            },
            {
              id: 'TOTAL_PATIENTS',
              title: 'Total Patients',
              value: stats?.totalPatients ?? 0,
              icon: Users,
              color: '#0EA5A4',
              bg: 'rgba(14, 165, 164, 0.15)',
              clickable: true,
              onClick: () => navigate('/admin-patients')
            },
            {
              id: 'TOTAL_RECORDS',
              title: 'Total Records',
              value: stats?.totalRecords ?? 0,
              icon: FileText,
              color: '#8B5CF6',
              bg: 'rgba(139, 92, 246, 0.15)',
              clickable: false
            },
            {
              id: 'ACTIVITY',
              title: 'Activity (24h)',
              value: stats?.auditEventsLast24h ?? 0,
              icon: Activity,
              color: '#F59E0B',
              bg: 'rgba(245, 158, 11, 0.15)',
              clickable: true,
              onClick: () => {
                const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
                navigate(`/audit-trail?from=${encodeURIComponent(twentyFourHoursAgo)}`);
              }
            }
          ].map(card => {
            const Icon = card.icon;
            const isSelected = card.clickable && card.tab && activeTab === card.tab;

            const handleCardClick = () => {
              if (!card.clickable) return;
              if (card.onClick) {
                card.onClick();
              } else if (card.tab) {
                handleTabChange(card.tab);
              }
            };

            return (
              <div
                key={card.id}
                onClick={handleCardClick}
                onKeyDown={(e) => {
                  if (card.clickable && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    handleCardClick();
                  }
                }}
                tabIndex={card.clickable ? 0 : undefined}
                role={card.clickable ? 'button' : undefined}
                aria-label={card.clickable ? `View ${card.title}` : undefined}
                className="stat-card"
                style={{
                  background: 'var(--bg-card)',
                  padding: '1.15rem 1.25rem',
                  borderRadius: 'var(--radius-lg, 12px)',
                  border: isSelected ? `2px solid ${card.color}` : '1px solid var(--border-light)',
                  boxShadow: isSelected ? `0 6px 16px -2px rgba(0, 0, 0, 0.08), 0 0 0 1px ${card.color}` : 'var(--shadow-sm)',
                  cursor: card.clickable ? 'pointer' : 'default',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.875rem',
                  position: 'relative',
                  overflow: 'hidden',
                  outline: 'none'
                }}
                onMouseEnter={(e) => {
                  if (card.clickable && !isSelected) {
                    e.currentTarget.style.borderColor = card.color;
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (card.clickable && !isSelected) {
                    e.currentTarget.style.borderColor = 'var(--border-light)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }
                }}
                onFocus={(e) => {
                  if (card.clickable && !isSelected) {
                    e.currentTarget.style.borderColor = card.color;
                    e.currentTarget.style.boxShadow = `0 0 0 2px ${card.color}33`;
                  }
                }}
                onBlur={(e) => {
                  if (card.clickable && !isSelected) {
                    e.currentTarget.style.borderColor = 'var(--border-light)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                  }
                }}
                title={
                  card.tab 
                    ? `Switch to ${card.title} doctors` 
                    : card.onClick 
                    ? `Go to ${card.title}` 
                    : undefined
                }
              >
                {/* Icon Circle */}
                <div 
                  style={{ 
                    width: '42px', 
                    height: '42px', 
                    borderRadius: '10px', 
                    background: card.bg, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <Icon size={20} style={{ color: card.color }} />
                </div>

                {/* Content */}
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '2px', wordBreak: 'break-word' }}>
                    {card.title}
                  </div>
                  
                  {statsLoading && !stats ? (
                    <div 
                      style={{ 
                        height: '24px', 
                        width: '48px', 
                        background: 'linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 50%, #F1F5F9 75%)', 
                        backgroundSize: '200% 100%', 
                        animation: 'shimmer 1.5s infinite',
                        borderRadius: '4px' 
                      }} 
                    />
                  ) : (
                    <>
                      <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.2 }}>
                        {card.value.toLocaleString()}
                      </div>
                      {card.id === 'TOTAL_RECORDS' && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '3px', fontWeight: 500 }}>
                          +{stats?.recordsThisWeek ?? 0} in the last 7 days
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Subtle active pill for selected tabs */}
                {isSelected && (
                  <span 
                    style={{ 
                      position: 'absolute', 
                      top: '6px', 
                      right: '8px', 
                      width: '6px', 
                      height: '6px', 
                      borderRadius: '50%', 
                      background: card.color 
                    }} 
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Main Table Card */}
      <div className="card" ref={doctorVerificationsRef}>
        {/* Card Header with Title, Tabs and Search */}
        <div className="card-header" style={{ flexDirection: 'column', gap: '1rem', alignItems: 'stretch' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <ShieldCheck size={20} className="text-primary" /> Doctor Verifications
            </h3>

            {/* Search Box */}
            <div style={{ position: 'relative', width: '280px', maxWidth: '100%' }}>
              <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search name, email, license..."
                style={{
                  width: '100%',
                  padding: '0.45rem 2rem 0.45rem 2.25rem',
                  fontSize: '0.85rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border-input)',
                  background: 'var(--bg-surface)',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  style={{
                    position: 'absolute',
                    right: '0.5rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  title="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Status Tabs */}
          <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.25rem' }}>
            {[
              { key: 'ALL', label: 'All', count: counts.all ?? (stats?.totalDoctors ?? 0), color: 'var(--primary)' },
              { key: 'PENDING', label: 'Pending', count: counts.pending ?? 0, color: 'var(--warning)' },
              { key: 'VERIFIED', label: 'Verified', count: counts.verified ?? 0, color: 'var(--success)' },
              { key: 'REJECTED', label: 'Rejected', count: counts.rejected ?? 0, color: 'var(--danger)' }
            ].map(tab => (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleTabChange(tab.key)}
                style={{
                  padding: '0.5rem 0.85rem',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: activeTab === tab.key ? 600 : 500,
                  color: activeTab === tab.key ? 'var(--primary)' : 'var(--text-secondary)',
                  borderBottom: activeTab === tab.key ? '2px solid var(--primary)' : '2px solid transparent',
                  marginBottom: '-1px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>{tab.label}</span>
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  padding: '0.1rem 0.45rem',
                  borderRadius: '10px',
                  background: activeTab === tab.key ? 'var(--primary-light)' : 'var(--bg-main)',
                  color: activeTab === tab.key ? 'var(--primary)' : 'var(--text-muted)'
                }}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Card Body */}
        <div className="card-body" style={{ padding: 0 }}>
          {loading ? (
            <div className="loading-container" style={{ padding: '3.5rem', textAlign: 'center' }}>
              <div className="loading-spinner" style={{ margin: '0 auto 1rem' }}></div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading doctors...</p>
            </div>
          ) : error ? (
            <div style={{ padding: '3rem 2rem', textAlign: 'center', maxWidth: '500px', margin: '0 auto' }}>
              <AlertTriangle size={42} style={{ color: 'var(--danger)', marginBottom: '1rem' }} />
              <h4 style={{ color: 'var(--danger)', marginBottom: '0.5rem', fontSize: '1.1rem' }}>Failed to load doctors</h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem', wordBreak: 'break-word' }}>
                {error}
              </p>
              <button 
                onClick={fetchDoctors} 
                disabled={loading}
                className="btn btn-primary" 
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                {loading ? 'Retrying...' : 'Retry'}
              </button>
            </div>
          ) : doctors.length === 0 ? (
            <div className="empty-state" style={{ padding: '3.5rem 1rem', textAlign: 'center' }}>
              <UserCheck size={48} className="empty-state-icon" style={{ opacity: 0.5, marginBottom: '1rem' }} />
              <h3 style={{ marginBottom: '0.5rem' }}>
                {debouncedSearch 
                  ? 'No matching doctors found' 
                  : activeTab === 'PENDING'
                  ? 'No pending doctors'
                  : activeTab === 'VERIFIED'
                  ? 'No verified doctors'
                  : 'No rejected doctors'}
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                {debouncedSearch 
                  ? `No doctor records matched "${debouncedSearch}". Try a different search term.` 
                  : 'Check back later or switch tabs to view other records.'}
              </p>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Doctor Name</th>
                    <th>Email</th>
                    <th>License Number</th>
                    {activeTab === 'REJECTED' ? (
                      <>
                        <th>Rejection Reason</th>
                        <th>Rejected On</th>
                      </>
                    ) : (
                      <>
                        <th>Specialty</th>
                        <th>Status</th>
                      </>
                    )}
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {doctors.map(doc => {
                    const isVerified = doc.isVerified || doc.verificationStatus === 'VERIFIED';
                    const isRejected = doc.verificationStatus === 'REJECTED';
                    const rejectedDateStr = doc.rejectedAt 
                      ? new Date(doc.rejectedAt).toLocaleDateString(undefined, { 
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric' 
                        })
                      : '—';

                    return (
                      <tr key={doc._id}>
                        <td>
                          <strong style={{ color: 'var(--text-main)' }}>
                            Dr. {doc.firstName || doc.user?.firstName || '—'} {doc.lastName || doc.user?.lastName || ''}
                          </strong>
                        </td>
                        <td>{doc.user?.email || '—'}</td>
                        <td style={{ fontFamily: 'monospace' }}>{doc.licenseNumber || '—'}</td>
                        
                        {activeTab === 'REJECTED' ? (
                          <>
                            <td style={{ maxWidth: '260px' }}>
                              <span 
                                style={{
                                  display: 'inline-block',
                                  fontSize: '0.8125rem',
                                  color: 'var(--danger)',
                                  background: 'var(--danger-light)',
                                  padding: '0.25rem 0.5rem',
                                  borderRadius: '6px',
                                  lineHeight: 1.35,
                                  wordBreak: 'break-word'
                                }}
                              >
                                {doc.rejectionReason || '—'}
                              </span>
                            </td>
                            <td style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                              {rejectedDateStr}
                            </td>
                          </>
                        ) : (
                          <>
                            <td>{doc.specialization || doc.specialty || 'General'}</td>
                            <td>
                              <span className={`badge badge-${isVerified ? 'success' : isRejected ? 'danger' : 'warning'}`}>
                                {isVerified ? 'VERIFIED' : isRejected ? 'REJECTED' : 'PENDING'}
                              </span>
                            </td>
                          </>
                        )}

                        <td style={{ textAlign: 'right' }}>
                          {isRejected ? (
                            /* Rejected Doctors: Show ONLY Re-verify button (Hide Reject) */
                            <button 
                              onClick={() => openVerifyModal(doc)} 
                              className="btn btn-success" 
                              style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                              title="Re-verify this doctor account"
                            >
                              <UserCheck size={14} /> Re-verify
                            </button>
                          ) : !isVerified ? (
                            /* Pending Doctors: Show Verify and Reject buttons */
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                              <button 
                                onClick={() => openVerifyModal(doc)} 
                                className="btn btn-success" 
                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                              >
                                <UserCheck size={14} /> Verify
                              </button>
                              <button 
                                onClick={() => openRejectModal(doc)} 
                                className="btn btn-outline" 
                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                              >
                                <UserX size={14} /> Reject
                              </button>
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Verified</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {!loading && !error && totalCount > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.75rem 1.25rem',
              borderTop: '1px solid var(--border-light)',
              background: 'var(--bg-main)',
              fontSize: '0.85rem'
            }}>
              <span style={{ color: 'var(--text-muted)' }}>
                Showing {((page - 1) * 10) + 1} to {Math.min(page * 10, totalCount)} of {totalCount} doctors
              </span>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="btn btn-outline"
                  style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                >
                  <ChevronLeft size={14} /> Previous
                </button>
                
                <span style={{ padding: '0 0.5rem', color: 'var(--text-main)', fontWeight: 500 }}>
                  Page {page} of {totalPages}
                </span>

                <button
                  type="button"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="btn btn-outline"
                  style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Collapsible System Health Panel (Placed below Doctor Verifications) */}
      <div 
        className="card" 
        style={{ 
          padding: '1.25rem 1.5rem', 
          marginTop: '1.75rem',
          borderRadius: 'var(--radius-lg, 12px)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: healthExpanded ? '1.25rem' : 0 }}>
          <div 
            onClick={() => setHealthExpanded(prev => !prev)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', cursor: 'pointer', userSelect: 'none' }}
          >
            <div 
              style={{ 
                width: '32px', 
                height: '32px', 
                borderRadius: '8px', 
                background: 'rgba(99, 102, 241, 0.12)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                color: '#6366F1'
              }}
            >
              <Activity size={18} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  System Health & Services
                </h3>
                {health && (
                  <span 
                    style={{ 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      gap: '0.3rem', 
                      fontSize: '0.7rem', 
                      padding: '0.1rem 0.5rem', 
                      borderRadius: '999px',
                      background: health.server?.status === 'up' && health.mongodb?.status === 'up' && health.blockchain?.status === 'up' 
                        ? 'rgba(16, 185, 129, 0.12)' 
                        : 'rgba(245, 158, 11, 0.12)',
                      color: health.server?.status === 'up' && health.mongodb?.status === 'up' && health.blockchain?.status === 'up'
                        ? 'var(--success)'
                        : 'var(--warning)',
                      fontWeight: 600
                    }}
                  >
                    <span 
                      style={{ 
                        width: '6px', 
                        height: '6px', 
                        borderRadius: '50%', 
                        background: health.server?.status === 'up' && health.mongodb?.status === 'up' && health.blockchain?.status === 'up'
                          ? 'var(--success)'
                          : 'var(--warning)'
                      }} 
                    />
                    {health.server?.status === 'up' && health.mongodb?.status === 'up' && health.blockchain?.status === 'up'
                      ? 'All Systems Operational'
                      : 'Issues Detected'}
                  </span>
                )}
                {healthExpanded ? <ChevronUp size={16} color="var(--text-muted)" /> : <ChevronDown size={16} color="var(--text-muted)" />}
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '2px' }}>
                <Clock size={12} />
                {health?.checkedAt ? (
                  <>Last checked: {new Date(health.checkedAt).toLocaleTimeString()} • Click to {healthExpanded ? 'collapse' : 'expand details'}</>
                ) : (
                  <>Auto-refreshes every 30s • Click to {healthExpanded ? 'collapse' : 'expand details'}</>
                )}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                fetchHealth(false);
              }}
              disabled={healthLoading || healthRefreshing}
              className="btn btn-outline"
              style={{
                fontSize: '0.8rem',
                padding: '0.35rem 0.75rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
              title="Manually refresh health status"
            >
              <RefreshCw size={13} className={healthRefreshing ? 'animate-spin' : ''} />
              {healthRefreshing ? 'Refreshing...' : 'Refresh'}
            </button>
            <button
              type="button"
              onClick={() => setHealthExpanded(prev => !prev)}
              className="btn btn-outline"
              style={{
                fontSize: '0.8rem',
                padding: '0.35rem 0.6rem'
              }}
              title={healthExpanded ? 'Collapse panel' : 'Expand panel'}
            >
              {healthExpanded ? 'Hide' : 'Show Details'}
            </button>
          </div>
        </div>

        {healthExpanded && (
          healthError ? (
            <div 
              style={{ 
                padding: '0.875rem 1rem', 
                background: 'rgba(239, 68, 68, 0.08)', 
                borderRadius: '8px', 
                border: '1px solid rgba(239, 68, 68, 0.25)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                gap: '0.75rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertTriangle size={16} style={{ color: 'var(--danger)', flexShrink: 0 }} />
                <span style={{ fontSize: '0.85rem', color: 'var(--danger)' }}>{healthError}</span>
              </div>
              <button
                type="button"
                onClick={() => fetchHealth(true)}
                disabled={healthLoading}
                className="btn btn-outline"
                style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem', color: 'var(--danger)', borderColor: 'var(--danger)' }}
              >
                Retry
              </button>
            </div>
          ) : healthLoading && !health ? (
            /* Loading skeleton */
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
              {[1, 2, 3].map(i => (
                <div 
                  key={i} 
                  style={{ 
                    height: '110px', 
                    borderRadius: '10px', 
                    background: 'linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 50%, #F1F5F9 75%)', 
                    backgroundSize: '200% 100%', 
                    animation: 'shimmer 1.5s infinite' 
                  }} 
                />
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
                
                {/* Service 1: Application Server */}
                <div 
                  style={{ 
                    background: 'var(--bg-main, #F8FAFC)', 
                    border: '1px solid var(--border-light)', 
                    borderRadius: '10px', 
                    padding: '1rem 1.15rem' 
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Server size={17} style={{ color: 'var(--text-muted)' }} />
                      <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)' }}>API Server</span>
                    </div>
                    <span 
                      style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '0.4rem', 
                        fontSize: '0.75rem', 
                        fontWeight: 600,
                        padding: '0.2rem 0.6rem',
                        borderRadius: '999px',
                        background: health?.server?.status === 'up' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                        color: health?.server?.status === 'up' ? 'var(--success)' : 'var(--danger)'
                      }}
                    >
                      <span 
                        style={{ 
                          width: '7px', 
                          height: '7px', 
                          borderRadius: '50%', 
                          background: health?.server?.status === 'up' ? 'var(--success)' : 'var(--danger)' 
                        }} 
                      />
                      {health?.server?.status === 'up' ? 'Operational' : 'Down'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <div>
                      <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>Uptime: </span>
                      {health?.server?.uptimeSeconds != null ? (
                        (() => {
                          const s = health.server.uptimeSeconds;
                          const h = Math.floor(s / 3600);
                          const m = Math.floor((s % 3600) / 60);
                          const sec = s % 60;
                          if (h > 0) return `${h}h ${m}m ${sec}s`;
                          if (m > 0) return `${m}m ${sec}s`;
                          return `${sec}s`;
                        })()
                      ) : 'N/A'}
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>Runtime: </span>
                      Node {health?.server?.nodeVersion || 'N/A'}
                    </div>
                  </div>
                </div>

                {/* Service 2: MongoDB */}
                <div 
                  style={{ 
                    background: 'var(--bg-main, #F8FAFC)', 
                    border: '1px solid var(--border-light)', 
                    borderRadius: '10px', 
                    padding: '1rem 1.15rem' 
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Database size={17} style={{ color: 'var(--text-muted)' }} />
                      <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)' }}>MongoDB Database</span>
                    </div>
                    <span 
                      style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '0.4rem', 
                        fontSize: '0.75rem', 
                        fontWeight: 600,
                        padding: '0.2rem 0.6rem',
                        borderRadius: '999px',
                        background: health?.mongodb?.status === 'up' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                        color: health?.mongodb?.status === 'up' ? 'var(--success)' : 'var(--danger)'
                      }}
                    >
                      <span 
                        style={{ 
                          width: '7px', 
                          height: '7px', 
                          borderRadius: '50%', 
                          background: health?.mongodb?.status === 'up' ? 'var(--success)' : 'var(--danger)' 
                        }} 
                      />
                      {health?.mongodb?.status === 'up' ? 'Connected' : 'Disconnected'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <div>
                      <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>Driver: </span>
                      Mongoose Connection Pool
                    </div>
                    {health?.mongodb?.status === 'down' && health?.mongodb?.error && (
                      <div style={{ color: 'var(--danger)', fontSize: '0.75rem' }}>
                        {health.mongodb.error}
                      </div>
                    )}
                    {health?.mongodb?.status === 'up' && (
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                        Ready state: Active (read/write available)
                      </div>
                    )}
                  </div>
                </div>

                {/* Service 3: Blockchain Node */}
                <div 
                  style={{ 
                    background: 'var(--bg-main, #F8FAFC)', 
                    border: '1px solid var(--border-light)', 
                    borderRadius: '10px', 
                    padding: '1rem 1.15rem' 
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Cpu size={17} style={{ color: 'var(--text-muted)' }} />
                      <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)' }}>Blockchain Node</span>
                    </div>
                    <span 
                      style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '0.4rem', 
                        fontSize: '0.75rem', 
                        fontWeight: 600,
                        padding: '0.2rem 0.6rem',
                        borderRadius: '999px',
                        background: health?.blockchain?.status === 'up' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                        color: health?.blockchain?.status === 'up' ? 'var(--success)' : 'var(--danger)'
                      }}
                    >
                      <span 
                        style={{ 
                          width: '7px', 
                          height: '7px', 
                          borderRadius: '50%', 
                          background: health?.blockchain?.status === 'up' ? 'var(--success)' : 'var(--danger)' 
                        }} 
                      />
                      {health?.blockchain?.status === 'up' ? 'Synced' : 'Offline'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <div>
                      <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>Latest Block: </span>
                      {health?.blockchain?.latestBlock != null ? (
                        <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-main)' }}>
                          #{health.blockchain.latestBlock}
                        </span>
                      ) : 'Unavailable'}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                      <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>Contract: </span>
                      {health?.blockchain?.contractAddress ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                          <code 
                            style={{ 
                              fontSize: '0.75rem', 
                              background: 'rgba(0,0,0,0.05)', 
                              padding: '0.1rem 0.35rem', 
                              borderRadius: '4px',
                              fontFamily: 'monospace'
                            }}
                            title={health.blockchain.contractAddress}
                          >
                            {`${health.blockchain.contractAddress.substring(0, 6)}...${health.blockchain.contractAddress.substring(health.blockchain.contractAddress.length - 4)}`}
                          </code>
                          <button
                            type="button"
                            onClick={() => handleCopyContract(health.blockchain.contractAddress)}
                            style={{
                              border: 'none',
                              background: 'transparent',
                              cursor: 'pointer',
                              color: copiedAddress ? 'var(--success)' : 'var(--text-muted)',
                              padding: '2px',
                              display: 'inline-flex',
                              alignItems: 'center'
                            }}
                            title={copiedAddress ? 'Copied!' : 'Copy full contract address'}
                          >
                            {copiedAddress ? <CheckCheck size={14} /> : <Copy size={14} />}
                          </button>
                        </span>
                      ) : (
                        <span>Not configured</span>
                      )}
                    </div>
                  </div>
                </div>

              </div>

              {/* Offline Blockchain Hint Banner */}
              {health?.blockchain?.status === 'down' && (
                <div 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.625rem', 
                    padding: '0.75rem 1rem', 
                    background: 'rgba(245, 158, 11, 0.1)', 
                    border: '1px solid rgba(245, 158, 11, 0.3)', 
                    borderRadius: '8px',
                    fontSize: '0.825rem',
                    color: '#B45309'
                  }}
                >
                  <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                  <div>
                    <strong>Blockchain node is unreachable.</strong> Start the Hardhat node and redeploy the contract.
                    {health.blockchain.error && (
                      <span style={{ display: 'block', fontSize: '0.75rem', opacity: 0.85, marginTop: '2px' }}>
                        Reason: {health.blockchain.error}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        )}
      </div>

      {/* Verification & Rejection Modal */}
      {modalState && modalState.doctor && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {modalState.type === 'VERIFY' ? (
                  <>
                    <ShieldCheck size={22} style={{ color: 'var(--success)' }} />
                    {modalState.doctor.verificationStatus === 'REJECTED' 
                      ? 'Confirm Doctor Re-verification' 
                      : 'Confirm Doctor Verification'}
                  </>
                ) : (
                  <>
                    <AlertTriangle size={22} style={{ color: 'var(--danger)' }} />
                    Reject Doctor Verification
                  </>
                )}
              </h3>
              <button 
                onClick={closeModal} 
                disabled={submittingAction}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              {/* Doctor Info Summary Card */}
              <div style={{
                background: 'var(--bg-main)',
                border: '1px solid var(--border-light)',
                borderRadius: '8px',
                padding: '1rem',
                marginBottom: '1.25rem'
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.85rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Doctor Name</span>
                    <strong style={{ color: 'var(--text-main)' }}>
                      Dr. {modalState.doctor.firstName || modalState.doctor.user?.firstName || '—'} {modalState.doctor.lastName || modalState.doctor.user?.lastName || ''}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Email Address</span>
                    <span style={{ color: 'var(--text-main)', wordBreak: 'break-all' }}>
                      {modalState.doctor.user?.email || '—'}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>License Number</span>
                    <code style={{ color: 'var(--primary)', fontWeight: 600 }}>
                      {modalState.doctor.licenseNumber || '—'}
                    </code>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Specialty</span>
                    <span style={{ color: 'var(--text-main)' }}>
                      {modalState.doctor.specialization || modalState.doctor.specialty || 'General'}
                    </span>
                  </div>
                </div>
              </div>

              {modalError && (
                <div className="alert alert-danger" style={{ marginBottom: '1rem', padding: '0.75rem 1rem', fontSize: '0.85rem' }}>
                  <AlertTriangle size={16} style={{ marginRight: '0.5rem', flexShrink: 0 }} />
                  <span>{modalError}</span>
                </div>
              )}

              {modalState.type === 'VERIFY' ? (
                modalState.doctor.verificationStatus === 'REJECTED' ? (
                  <div>
                    {/* Previous Rejection Reason Callout */}
                    <div style={{
                      marginBottom: '1rem',
                      padding: '0.75rem 0.85rem',
                      background: 'var(--danger-light)',
                      border: '1px solid rgba(220, 38, 38, 0.25)',
                      borderRadius: '8px'
                    }}>
                      <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--danger)', marginBottom: '0.25rem' }}>
                        Previous Rejection Reason (Read-only):
                      </span>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#991B1B', lineHeight: 1.4, wordBreak: 'break-word' }}>
                        {modalState.doctor.rejectionReason || 'No detailed reason provided previously.'}
                      </p>
                    </div>

                    {/* Required Reason for Re-verification */}
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                      Reason for Re-verification <span style={{ color: 'var(--danger)' }}>*</span>
                    </label>
                    <textarea
                      rows={3}
                      value={reverificationReason}
                      onChange={(e) => {
                        setReverificationReason(e.target.value);
                        if (modalError) setModalError('');
                      }}
                      placeholder="Explain why this doctor is now eligible for verification (e.g. updated license documents validated, credentials reinstated)..."
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        borderRadius: '8px',
                        border: '1px solid var(--border-input)',
                        fontSize: '0.875rem',
                        fontFamily: 'var(--font-sans)',
                        resize: 'vertical',
                        boxSizing: 'border-box'
                      }}
                    />

                    {/* Character counter & requirement hint */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.35rem', fontSize: '0.75rem' }}>
                      <span style={{ color: reverificationReason.trim().length >= 10 ? 'var(--success)' : 'var(--text-muted)' }}>
                        {reverificationReason.trim().length} / 10 characters minimum
                      </span>
                      <span style={{ color: 'var(--text-muted)' }}>
                        Written to audit trail & clears rejection status
                      </span>
                    </div>

                    {reverificationReason.trim().length < 10 ? (
                      <div style={{
                        marginTop: '0.5rem',
                        padding: '0.4rem 0.6rem',
                        background: 'rgba(245, 158, 11, 0.1)',
                        border: '1px solid rgba(245, 158, 11, 0.25)',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        color: '#B45309',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem'
                      }}>
                        <Info size={14} style={{ flexShrink: 0 }} />
                        <span>Enter at least 10 characters to enable the Confirm button ({10 - reverificationReason.trim().length} more needed).</span>
                      </div>
                    ) : (
                      <div style={{
                        marginTop: '0.5rem',
                        padding: '0.4rem 0.6rem',
                        background: 'rgba(22, 163, 74, 0.1)',
                        border: '1px solid rgba(22, 163, 74, 0.25)',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        color: 'var(--success)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem'
                      }}>
                        <Check size={14} style={{ flexShrink: 0 }} />
                        <span>Requirement met. You can now re-verify this doctor.</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5, margin: 0 }}>
                    Are you sure you want to approve and verify this doctor? Once verified, they will be authorized to access the system and send record access requests to patients.
                  </p>
                )
              ) : (
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                    Reason for Rejection <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <textarea
                    rows={4}
                    value={rejectionReason}
                    onChange={(e) => {
                      setRejectionReason(e.target.value);
                      if (modalError) setModalError('');
                    }}
                    placeholder="Provide a detailed explanation for rejection (e.g. invalid medical license number, expired credentials, mismatched identity)..."
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border-input)',
                      fontSize: '0.875rem',
                      fontFamily: 'var(--font-sans)',
                      resize: 'vertical',
                      boxSizing: 'border-box'
                    }}
                  />

                  {/* Character counter & requirement hint */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.35rem', fontSize: '0.75rem' }}>
                    <span style={{ color: rejectionReason.trim().length >= 10 ? 'var(--success)' : 'var(--text-muted)' }}>
                      {rejectionReason.trim().length} / 10 characters minimum
                    </span>
                    <span style={{ color: 'var(--text-muted)' }}>
                      Saved to audit trail & sent to doctor
                    </span>
                  </div>

                  {/* Helpful hint for user so button doesn't look broken */}
                  {rejectionReason.trim().length < 10 ? (
                    <div style={{
                      marginTop: '0.5rem',
                      padding: '0.4rem 0.6rem',
                      background: 'rgba(245, 158, 11, 0.1)',
                      border: '1px solid rgba(245, 158, 11, 0.25)',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      color: '#B45309',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem'
                    }}>
                      <Info size={14} style={{ flexShrink: 0 }} />
                      <span>Enter at least 10 characters to enable the Confirm button ({10 - rejectionReason.trim().length} more needed).</span>
                    </div>
                  ) : (
                    <div style={{
                      marginTop: '0.5rem',
                      padding: '0.4rem 0.6rem',
                      background: 'rgba(22, 163, 74, 0.1)',
                      border: '1px solid rgba(22, 163, 74, 0.25)',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      color: 'var(--success)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem'
                    }}>
                      <Check size={14} style={{ flexShrink: 0 }} />
                      <span>Requirement met. You can now submit the rejection.</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button 
                type="button" 
                onClick={closeModal} 
                disabled={submittingAction}
                className="btn btn-outline" 
                style={{ fontSize: '0.875rem' }}
              >
                Cancel
              </button>

              {modalState.type === 'VERIFY' ? (
                <button 
                  type="button" 
                  onClick={handleConfirmVerify} 
                  disabled={
                    submittingAction || 
                    (modalState.doctor.verificationStatus === 'REJECTED' && reverificationReason.trim().length < 10)
                  }
                  className="btn btn-success" 
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}
                  title={
                    modalState.doctor.verificationStatus === 'REJECTED' && reverificationReason.trim().length < 10
                      ? 'Enter at least 10 characters to enable this button'
                      : 'Confirm'
                  }
                >
                  {submittingAction ? (
                    <>
                      <div className="loading-spinner" style={{ width: '14px', height: '14px', borderWidth: '2px' }}></div>
                      Verifying...
                    </>
                  ) : (
                    <>
                      <Check size={16} /> 
                      {modalState.doctor.verificationStatus === 'REJECTED' 
                        ? 'Confirm re-verification' 
                        : 'Confirm verification'}
                    </>
                  )}
                </button>
              ) : (
                <button 
                  type="button" 
                  onClick={handleConfirmReject} 
                  disabled={submittingAction || rejectionReason.trim().length < 10}
                  className="btn btn-danger" 
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}
                  title={rejectionReason.trim().length < 10 ? 'Enter at least 10 characters to enable this button' : 'Confirm rejection'}
                >
                  {submittingAction ? (
                    <>
                      <div className="loading-spinner" style={{ width: '14px', height: '14px', borderWidth: '2px' }}></div>
                      Rejecting...
                    </>
                  ) : (
                    <>
                      <UserX size={16} /> Confirm rejection
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
