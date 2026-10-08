import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { verifyRecord, getRecordHistory, editRecord } from '../api/records';
import { ShieldCheck, ShieldAlert, FileText, Database, Key, ArrowDown, Activity, ChevronLeft, Stethoscope, RefreshCw, Edit2 } from 'lucide-react';
import { useRef } from 'react';
import { useAuth } from '../context/AuthContext';

const RecordDetails = () => {
  const { recordId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [recordInfo, setRecordInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [verifyingManual, setVerifyingManual] = useState(false);
  
  const [history, setHistory] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [editError, setEditError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const hasFetched = useRef(false);

  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true;
      fetchRecordVerification();
    }
  }, [recordId]);

  const fetchRecordVerification = async (forceLog = false) => {
    try {
      if (forceLog) {
        setVerifyingManual(true);
      } else {
        setLoading(true);
      }
      const data = await verifyRecord(recordId, forceLog);
      setRecordInfo(data);
      if (!forceLog) {
        const histData = await getRecordHistory(recordId);
        setHistory(histData);
        setEditFormData({
          symptoms: data.recordData?.symptoms || '',
          diagnosis: data.recordData?.diagnosis || '',
          treatment: data.recordData?.treatment || '',
          prescription: data.recordData?.prescription || ''
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to verify the integrity of the record.');
    } finally {
      setLoading(false);
      setVerifyingManual(false);
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
  const isTampered = recordInfo?.status === 'TAMPERED' || recordInfo?.status === 'INTEGRITY_CHECK_FAILED';
  const isWarning = !isVerified && !isTampered;
  // Backend returns: status, calculatedHash, blockchainHash, transactionHash, timestamp, recordData (if populated), createdAt
  const data = recordInfo?.recordData || {};

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={() => navigate(-1)} className="btn btn-outline" style={{ padding: '0.5rem', borderRadius: '50%' }}>
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="page-title">Medical Record Details {recordInfo?.version && <span className="badge badge-primary" style={{marginLeft: '0.5rem'}}>v{recordInfo.version}</span>}</h1>
            <p className="page-subtitle">ID: <span style={{ fontFamily: 'monospace' }}>{recordId}</span></p>
          </div>
        </div>
        {user?.role === 'DOCTOR' && recordInfo?.recordStatus === 'ACTIVE' && (
          <button className="btn btn-primary" onClick={() => setIsEditing(!isEditing)}>
            <Edit2 size={16} /> {isEditing ? 'Cancel Edit' : 'Edit Record'}
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem', alignItems: 'start' }}>
        
        {/* Left Column: Clinical Data */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card">
            <div className={`card-header`}>
              <h3 className="card-title"><Activity size={18} className="text-muted"/> Clinical Information</h3>
              <div className={`badge badge-${isVerified ? 'success' : isTampered ? 'danger' : 'warning'}`}>
                {isVerified ? 'Integrity Verified' : isTampered ? 'Integrity Warning' : 'Not Verified'}
              </div>
            </div>
            <div className="card-body">
              {editError && <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>{editError}</div>}
              {isEditing ? (
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  setEditError('');
                  setIsSaving(true);
                  try {
                    const trimmedData = {
                      symptoms: editFormData.symptoms?.trim() || '',
                      diagnosis: editFormData.diagnosis?.trim() || '',
                      treatment: editFormData.treatment?.trim() || '',
                      prescription: editFormData.prescription?.trim() || ''
                    };
                    const newVersion = await editRecord(recordId, trimmedData);
                    setIsEditing(false);
                    navigate('/record/' + newVersion._id, { replace: true });
                    window.location.reload(); // Quick way to reset state for new record
                  } catch (err) {
                    setEditError(err.response?.data?.message || 'Failed to save new version');
                  } finally {
                    setIsSaving(false);
                  }
                }}>
                  <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label className="form-label">Primary Diagnosis</label>
                    <input type="text" className="form-input" value={editFormData.diagnosis} onChange={e => setEditFormData({...editFormData, diagnosis: e.target.value})} required />
                  </div>
                  <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label className="form-label">Symptoms & Presentation</label>
                    <textarea className="form-input" rows="3" value={editFormData.symptoms} onChange={e => setEditFormData({...editFormData, symptoms: e.target.value})} required />
                  </div>
                  <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label className="form-label">Treatment Plan</label>
                    <textarea className="form-input" rows="3" value={editFormData.treatment} onChange={e => setEditFormData({...editFormData, treatment: e.target.value})} required />
                  </div>
                  <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label className="form-label">Prescriptions</label>
                    <textarea className="form-input" rows="3" value={editFormData.prescription} onChange={e => setEditFormData({...editFormData, prescription: e.target.value})} required />
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                    <button type="submit" className="btn btn-primary" disabled={isSaving}>
                      {isSaving ? 'Saving...' : 'Save New Version'}
                    </button>
                    <button type="button" className="btn btn-outline" onClick={() => setIsEditing(false)}>Cancel</button>
                  </div>
                </form>
              ) : (
                <>
                  <div style={{ marginBottom: '1.5rem' }}>
                    <p className="text-muted" style={{ fontSize: '0.875rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.25rem' }}>Primary Diagnosis</p>
                    <p style={{ fontSize: '1.1rem', fontWeight: 500, color: 'var(--text-main)' }}>{data.diagnosis || 'Not provided'}</p>
                  </div>

                  <div style={{ marginBottom: '1.5rem' }}>
                    <p className="text-muted" style={{ fontSize: '0.875rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.25rem' }}>Symptoms & Presentation</p>
                    <p style={{ color: 'var(--text-main)', background: 'var(--bg-main)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
                      {data.symptoms || 'Not provided'}
                    </p>
                  </div>

                  <div style={{ marginBottom: '1.5rem' }}>
                    <p className="text-muted" style={{ fontSize: '0.875rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.25rem' }}>Treatment Plan</p>
                    <p style={{ color: 'var(--text-main)', background: 'var(--bg-main)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
                      {data.treatment || 'Not provided'}
                    </p>
                  </div>

                  <div>
                    <p className="text-muted" style={{ fontSize: '0.875rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.25rem' }}>Prescriptions</p>
                    <p style={{ color: 'var(--text-main)', background: 'var(--bg-main)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
                      {data.prescription || 'Not provided'}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {history && history.length > 0 && (
            <div className="card" style={{ marginTop: '2rem' }}>
              <div className="card-header">
                <h3 className="card-title">Version History</h3>
              </div>
              <div className="card-body" style={{ padding: 0 }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Version</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Tx Hash</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((item) => (
                      <tr key={item._id} style={{ background: item._id === recordId ? 'var(--bg-main)' : 'transparent' }}>
                        <td>
                          v{item.version}
                          {item._id === recordId && <span className="badge badge-primary" style={{marginLeft: '0.5rem'}}>Viewing</span>}
                          {item.status === 'ACTIVE' && <span className="badge badge-success" style={{marginLeft: '0.5rem'}}>CURRENT</span>}
                        </td>
                        <td>{new Date(item.createdAt).toLocaleString()}</td>
                        <td>
                          {item.verificationStatus === 'VERIFIED' ? (
                            <span className="badge badge-success">Verified</span>
                          ) : item.verificationStatus === 'TAMPERED' ? (
                            <span className="badge badge-danger">Tampered</span>
                          ) : (
                            <span className="badge badge-warning">Unverified</span>
                          )}
                        </td>
                        <td>
                          <span title={item.blockchainTxHash} style={{ cursor: 'help' }}>
                            {item.blockchainTxHash ? item.blockchainTxHash.substring(0, 10) + '...' : 'N/A'}
                          </span>
                        </td>
                        <td>
                          {item._id !== recordId ? (
                            <button className="btn btn-outline btn-sm" onClick={() => {
                              navigate('/record/' + item._id);
                              window.location.reload();
                            }}>View</button>
                          ) : (
                            <span className="text-muted">Viewing</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Cryptographic Security Panel */}
        <div style={{ position: 'sticky', top: '1rem' }}>
          
          <div className={`security-panel ${isTampered ? 'failed' : isWarning ? 'warning' : ''}`}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontSize: '1.1rem', color: isVerified ? 'var(--success)' : isTampered ? 'var(--danger)' : 'var(--warning)' }}>
              {isVerified ? <ShieldCheck size={24} /> : <ShieldAlert size={24} />}
              {recordInfo?.status === 'BLOCKCHAIN_UNREACHABLE' ? 'BLOCKCHAIN OFFLINE' : 
               recordInfo?.status === 'CONTRACT_NOT_DEPLOYED' ? 'CONTRACT NOT DEPLOYED' :
               recordInfo?.status === 'NOT_ANCHORED' ? 'RECORD NOT ANCHORED' :
               (isVerified ? 'INTEGRITY VERIFIED' : 'INTEGRITY WARNING')}
            </h3>
            
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              {recordInfo?.status === 'BLOCKCHAIN_UNREACHABLE'
                ? "Blockchain node offline"
                : recordInfo?.status === 'CONTRACT_NOT_DEPLOYED'
                ? "Contract not deployed at this address: redeploy and update .env.blockchain"
                : recordInfo?.status === 'NOT_ANCHORED'
                ? "Record was never anchored on this chain"
                : (isVerified 
                ? "This medical record has been verified. It has not been altered since it was created." 
                : "These do not match: the record was modified after it was created.")}
            </p>

            <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', margin: 0 }}>
                {!isVerified && !['BLOCKCHAIN_UNREACHABLE', 'CONTRACT_NOT_DEPLOYED', 'NOT_ANCHORED'].includes(recordInfo?.status) ? 'Recalculated from current data' : 'Record Fingerprint'}
              </p>
              <button 
                className="btn btn-outline btn-sm" 
                onClick={() => fetchRecordVerification(true)} 
                disabled={verifyingManual}
                style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
              >
                <RefreshCw size={14} className={verifyingManual ? 'spin' : ''} style={{ marginRight: '4px' }} />
                Verify Again
              </button>
            </div>
            <div className="crypto-data" style={{ marginBottom: '1rem' }}>{recordInfo?.calculatedHash}</div>

            <div style={{ marginBottom: '1rem' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                {!isVerified && !['BLOCKCHAIN_UNREACHABLE', 'CONTRACT_NOT_DEPLOYED', 'NOT_ANCHORED'].includes(recordInfo?.status) ? 'Stored on blockchain (original)' : 'Verification Reference'}
              </p>
              <div className="crypto-data">
                {recordInfo?.status === 'BLOCKCHAIN_UNREACHABLE' ? 'Blockchain unreachable' : 
                 recordInfo?.status === 'CONTRACT_NOT_DEPLOYED' ? 'Contract not deployed' :
                 recordInfo?.status === 'NOT_ANCHORED' ? 'Not anchored' :
                 (recordInfo?.blockchainHash || 'Not Found')}
              </div>
            </div>
            
            <div style={{ marginBottom: '1rem' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>System Receipt</p>
              <div className="crypto-data">
                {recordInfo?.status === 'NOT_ANCHORED' && recordInfo?.blockchainTxHash 
                  ? 'Transaction not found on current chain' 
                  : (recordInfo?.blockchainTxHash || 'Not anchored')}
              </div>
            </div>
            
            <div>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Timestamp</p>
              <div style={{ fontSize: '0.875rem' }}>
                {recordInfo?.createdAt ? new Date(recordInfo.createdAt).toLocaleString() : 'N/A'}
                {recordInfo?.timestamp ? ` (Block: ${new Date(recordInfo.timestamp).toLocaleString()})` : ''}
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
