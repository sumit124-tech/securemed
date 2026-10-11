import { useState, useEffect } from 'react';
import api from '../api/axios';
import { 
  FileText, 
  RefreshCw, 
  AlertTriangle, 
  Shield, 
  Calendar, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  Lock,
  Layers,
  BarChart3
} from 'lucide-react';

const AdminRecords = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchOverview();
  }, []);

  const fetchOverview = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/admin/records/overview');
      if (res.data?.success && res.data?.data) {
        setData(res.data.data);
      }
    } catch (err) {
      console.error('Fetch records overview error:', err);
      const message = err.response
        ? `Error ${err.response.status}: ${err.response.data?.message || err.message}`
        : 'Cannot reach server. Please check your connection or backend service.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // Compute maximum daily count for SVG chart scaling
  const perDay = data?.perDay || [];
  const maxDaily = Math.max(...perDay.map(d => d.count), 5);

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <FileText size={24} style={{ color: '#8B5CF6' }} /> Medical Records Analytics
          </h2>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            System-wide creation metrics, temporal activity trends, and blockchain anchoring integrity.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchOverview}
          disabled={loading}
          className="btn btn-outline"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Strict Privacy Notice Banner */}
      <div 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.75rem', 
          padding: '0.875rem 1.25rem', 
          background: 'rgba(139, 92, 246, 0.08)', 
          border: '1px solid rgba(139, 92, 246, 0.25)', 
          borderRadius: '10px',
          marginBottom: '1.75rem',
          fontSize: '0.85rem',
          color: '#6D28D9'
        }}
      >
        <Lock size={18} style={{ flexShrink: 0, color: '#8B5CF6' }} />
        <div>
          <strong>Privacy Guard Active:</strong> Admins see totals and metadata only. Record contents, diagnoses, symptoms, prescriptions, and medical documents are end-to-end encrypted and private to patients and authorized doctors.
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="card" style={{ padding: '2.5rem', textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{ display: 'inline-flex', padding: '0.75rem', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', marginBottom: '0.75rem' }}>
            <AlertTriangle size={32} />
          </div>
          <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-main)' }}>Failed to load records overview</h4>
          <p style={{ margin: '0 0 1rem 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>{error}</p>
          <button onClick={fetchOverview} className="btn btn-primary" style={{ fontSize: '0.85rem' }}>
            Retry
          </button>
        </div>
      )}

      {/* Summary Stat Cards */}
      <div 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '1rem', 
          marginBottom: '1.75rem' 
        }}
      >
        {[
          { label: 'Total Records', value: data?.total, icon: FileText, color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.15)' },
          { label: 'Created Today', value: data?.today, icon: Clock, color: '#0EA5A4', bg: 'rgba(14, 165, 164, 0.15)' },
          { label: 'This Week', value: data?.thisWeek, icon: Calendar, color: '#2563EB', bg: 'rgba(37, 99, 235, 0.15)' },
          { label: 'This Month', value: data?.thisMonth, icon: TrendingUp, color: '#10B981', bg: 'rgba(16, 185, 129, 0.15)' }
        ].map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div 
              key={idx} 
              className="card"
              style={{
                padding: '1.15rem 1.25rem',
                borderRadius: 'var(--radius-lg, 12px)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.875rem'
              }}
            >
              <div 
                style={{ 
                  width: '42px', 
                  height: '42px', 
                  borderRadius: '10px', 
                  background: stat.bg, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <Icon size={20} style={{ color: stat.color }} />
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '2px' }}>
                  {stat.label}
                </div>
                {loading && !data ? (
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
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.2 }}>
                    {(stat.value ?? 0).toLocaleString()}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Charts & Breakdown Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem', marginBottom: '1.75rem' }}>
        
        {/* Chart Card: Records Created Per Day (Last 30 Days) */}
        <div className="card" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg, 12px)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BarChart3 size={18} style={{ color: 'var(--primary)' }} />
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)' }}>
                Activity Trend (Last 30 Days)
              </h3>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Daily creation rate
            </span>
          </div>

          {loading && !data ? (
            <div style={{ height: '180px', borderRadius: '8px', background: 'linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 50%, #F1F5F9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
          ) : perDay.length === 0 || perDay.every(d => d.count === 0) ? (
            <div style={{ height: '180px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              <Calendar size={32} style={{ opacity: 0.4, marginBottom: '0.5rem' }} />
              No medical records created in the last 30 days.
            </div>
          ) : (
            <div>
              {/* Responsive SVG Bar Chart */}
              <div style={{ width: '100%', overflowX: 'auto' }}>
                <svg viewBox="0 0 600 160" style={{ width: '100%', height: '170px', display: 'block' }}>
                  {/* Grid lines */}
                  <line x1="0" y1="135" x2="600" y2="135" stroke="var(--border-light, #E2E8F0)" strokeWidth="1" />
                  <line x1="0" y1="70" x2="600" y2="70" stroke="var(--border-light, #E2E8F0)" strokeDasharray="3 3" strokeWidth="1" />
                  <line x1="0" y1="15" x2="600" y2="15" stroke="var(--border-light, #E2E8F0)" strokeDasharray="3 3" strokeWidth="1" />

                  {/* Bars */}
                  {perDay.map((d, i) => {
                    const barWidth = 14;
                    const spacing = 20;
                    const x = i * spacing + 5;
                    const maxH = 110;
                    const barHeight = Math.max((d.count / maxDaily) * maxH, d.count > 0 ? 4 : 0);
                    const y = 135 - barHeight;

                    return (
                      <g key={d.date} className="chart-bar">
                        <title>{`${d.date}: ${d.count} record${d.count === 1 ? '' : 's'}`}</title>
                        <rect
                          x={x}
                          y={y}
                          width={barWidth}
                          height={barHeight}
                          rx="3"
                          fill={d.count > 0 ? '#8B5CF6' : 'rgba(0,0,0,0.05)'}
                          style={{ transition: 'all 0.2s ease', cursor: 'pointer' }}
                        />
                        {/* Display label every 5 days */}
                        {i % 5 === 0 && (
                          <text
                            x={x + barWidth / 2}
                            y="150"
                            fontSize="9"
                            fill="var(--text-muted, #94A3B8)"
                            textAnchor="middle"
                          >
                            {d.date.substring(5)}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </svg>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <span>30 days ago</span>
                <span>Peak: {maxDaily} records/day</span>
                <span>Today</span>
              </div>
            </div>
          )}
        </div>

        {/* Breakdown by Type Card */}
        <div className="card" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg, 12px)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Layers size={18} style={{ color: '#0EA5A4' }} />
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)' }}>
                Distribution by Record Type
              </h3>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Classification
            </span>
          </div>

          {loading && !data ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{ height: '36px', borderRadius: '6px', background: 'linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 50%, #F1F5F9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
              ))}
            </div>
          ) : !data?.byType || data.byType.length === 0 ? (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              No classified record types available.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {data.byType.map((item, idx) => {
                const total = data.total || 1;
                const percentage = Math.round((item.count / total) * 100);
                const colors = ['#8B5CF6', '#0EA5A4', '#2563EB', '#F59E0B', '#10B981'];
                const color = colors[idx % colors.length];

                return (
                  <div key={item.type}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem', fontSize: '0.85rem' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{item.type}</span>
                      <span style={{ color: 'var(--text-muted)' }}>
                        <strong>{item.count}</strong> ({percentage}%)
                      </span>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: 'var(--bg-main, #F1F5F9)', borderRadius: '999px', overflow: 'hidden' }}>
                      <div 
                        style={{ 
                          width: `${percentage}%`, 
                          height: '100%', 
                          background: color, 
                          borderRadius: '999px',
                          transition: 'width 0.5s ease-in-out' 
                        }} 
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* Blockchain Anchoring Security Card */}
      <div className="card" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg, 12px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <div 
              style={{ 
                width: '32px', 
                height: '32px', 
                borderRadius: '8px', 
                background: 'rgba(16, 185, 129, 0.12)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                color: 'var(--success)'
              }}
            >
              <Shield size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)' }}>
                Blockchain Cryptographic Anchoring Status
              </h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Immutable SHA-256 state commitments on Hardhat smart contract
              </span>
            </div>
          </div>

          <span 
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '0.4rem', 
              padding: '0.2rem 0.65rem', 
              borderRadius: '999px', 
              fontSize: '0.75rem', 
              fontWeight: 600,
              background: data?.notAnchored === 0 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
              color: data?.notAnchored === 0 ? 'var(--success)' : '#B45309'
            }}
          >
            <CheckCircle2 size={13} />
            {data?.notAnchored === 0 ? '100% On-Chain Integrity' : 'Sync In Progress'}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          
          <div style={{ background: 'var(--bg-main, #F8FAFC)', border: '1px solid var(--border-light)', borderRadius: '10px', padding: '1rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
              Anchored On-Chain
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--success)' }}>
              {(data?.anchoredOnChain ?? 0).toLocaleString()}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              SHA-256 hash verified with transaction receipt
            </div>
          </div>

          <div style={{ background: 'var(--bg-main, #F8FAFC)', border: '1px solid var(--border-light)', borderRadius: '10px', padding: '1rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
              Pending / Off-Chain
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: (data?.notAnchored ?? 0) > 0 ? 'var(--warning)' : 'var(--text-main)' }}>
              {(data?.notAnchored ?? 0).toLocaleString()}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Records awaiting next ledger verification block
            </div>
          </div>

          <div style={{ background: 'var(--bg-main, #F8FAFC)', border: '1px solid var(--border-light)', borderRadius: '10px', padding: '1rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
              Integrity Coverage
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)' }}>
              {data?.total ? Math.round(((data.anchoredOnChain || 0) / data.total) * 100) : 100}%
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Tamper-evident blockchain verification ratio
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default AdminRecords;
