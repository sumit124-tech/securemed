import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { verifyRecord } from '../api/records';
import { ShieldCheck, ShieldAlert, FileText, Database, Key, ArrowDown, Activity, ChevronLeft, Stethoscope } from 'lucide-react';

const RecordDetails = () => {
  const { recordId } = useParams();
  const [recordInfo, setRecordInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchRecordVerification();
  }, [recordId]);

  const fetchRecordVerification = async () => {
    try {
      setLoading(true);
      const data = await verifyRecord(recordId);
      setRecordInfo(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to verify the integrity of the record.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading-container" style={{ minHeight: '60vh' }}><div className="loading-spinner"></div></div>;
  }

  if (error) {
    return (
      <div className="empty-state">
        <ShieldAlert size={64} className="text-danger" style={{ marginBottom: '1rem' }} />
        <h3 className="text-danger">Verification Error</h3>
        <p>{error}</p>
        <Link to="/" className="btn btn-primary" style={{ marginTop: '1rem' }}>Return to Dashboard</Link>
      </div>
    );
  }

  const isVerified = recordInfo?.status === 'VERIFIED';
  // Backend returns: status, calculatedHash, blockchainHash, transactionHash, timestamp, recordData (if populated)
  const data = recordInfo?.recordData || {};

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button onClick={() => window.history.back()} className="btn btn-outline" style={{ padding: '0.5rem', borderRadius: '50%' }}>
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="page-title">Medical Record Details</h1>
          <p className="page-subtitle">ID: <span style={{ fontFamily: 'monospace' }}>{recordId}</span></p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem', alignItems: 'start' }}>
        
        {/* Left Column: Clinical Data */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card">
            <div className="card-header">
              <h3 className="card-title"><Activity size={18} className="text-muted"/> Clinical Information</h3>
              <div className={`badge badge-${isVerified ? 'success' : 'danger'}`}>
                {isVerified ? 'Integrity Verified' : 'Integrity Warning'}
              </div>
            </div>
            <div className="card-body">
              <div style={{ marginBottom: '1.5rem' }}>
                <p className="text-muted" style={{ fontSize: '0.875rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.25rem' }}>Primary Diagnosis</p>
                <p style={{ fontSize: '1.1rem', fontWeight: 500, color: 'var(--text-main)' }}>{data.diagnosis || recordInfo.diagnosis || 'Diagnosis information protected'}</p>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <p className="text-muted" style={{ fontSize: '0.875rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.25rem' }}>Symptoms & Presentation</p>
                <p style={{ color: 'var(--text-main)', background: 'var(--bg-main)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
                  {data.symptoms || recordInfo.symptoms || 'Data unavailable'}
                </p>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <p className="text-muted" style={{ fontSize: '0.875rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.25rem' }}>Treatment Plan</p>
                <p style={{ color: 'var(--text-main)', background: 'var(--bg-main)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
                  {data.treatment || recordInfo.treatment || 'Data unavailable'}
                </p>
              </div>

              <div>
                <p className="text-muted" style={{ fontSize: '0.875rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.25rem' }}>Prescriptions</p>
                <p style={{ color: 'var(--text-main)', background: 'var(--bg-main)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
                  {data.prescription || recordInfo.prescription || 'No prescriptions attached'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Cryptographic Security Panel */}
        <div style={{ position: 'sticky', top: '1rem' }}>
          
          <div className={`security-panel ${!isVerified ? 'failed' : ''}`}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontSize: '1.1rem', color: isVerified ? 'var(--success)' : 'var(--danger)' }}>
              {isVerified ? <ShieldCheck size={24} /> : <ShieldAlert size={24} />}
              {isVerified ? 'INTEGRITY VERIFIED' : 'INTEGRITY WARNING'}
            </h3>
            
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              {isVerified 
                ? "This medical record has been verified. It has not been altered since it was created." 
                : "Warning: The data in this record does not match its original fingerprint. It may have been altered."}
            </p>

            <div style={{ marginBottom: '1rem' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Record Fingerprint</p>
              <div className="crypto-data">{recordInfo?.calculatedHash}</div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Verification Reference</p>
              <div className="crypto-data">{recordInfo?.blockchainHash || 'Not Found'}</div>
            </div>
            
            <div style={{ marginBottom: '1rem' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>System Receipt</p>
              <div className="crypto-data">{recordInfo?.transactionHash || 'N/A'}</div>
            </div>
            
            <div>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Timestamp</p>
              <div style={{ fontSize: '0.875rem' }}>
                {recordInfo?.timestamp ? new Date(recordInfo.timestamp).toLocaleString() : 'N/A'}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h4 style={{ fontSize: '0.95rem' }}>Integrity Verification Process</h4>
            </div>
            <div className="card-body">
              <div className="diagram-flow">
                <div className="diagram-box" style={{ background: 'var(--bg-main)', border: '1px solid var(--border-light)', color: 'var(--text-main)' }}>
                  <FileText size={16} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />
                  Medical Record
                </div>
                <ArrowDown size={20} className="diagram-arrow" />
                <div className="diagram-box">
                  <Key size={16} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />
                  Digital Fingerprint Created
                </div>
                <ArrowDown size={20} className="diagram-arrow" />
                <div className="diagram-box" style={{ background: 'var(--success-light)', border: '1px solid var(--success)', color: 'var(--success)' }}>
                  <Database size={16} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />
                  Secure Verification Storage
                </div>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '1rem' }}>
                Your private medical data is stored securely. Only a digital fingerprint is used for verification.
              </p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default RecordDetails;
