import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createRecord } from '../api/records';
import { FilePlus, Shield, Activity, ListChecks, Stethoscope, FileText, ChevronLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const CreateRecord = () => {
  const { patientId } = useParams();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    patientId: patientId,
    symptoms: '',
    diagnosis: '',
    treatment: '',
    prescription: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    const errors = {};
    if (!formData.symptoms.trim()) errors.symptoms = 'Symptoms are required';
    if (!formData.diagnosis.trim()) errors.diagnosis = 'Diagnosis is required';
    if (!formData.treatment.trim()) errors.treatment = 'Treatment plan is required';
    if (!formData.prescription.trim()) errors.prescription = 'Prescription is required';
    
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }
    
    setValidationErrors({});
    setIsLoading(true);

    try {
      const res = await createRecord(formData);
      // createRecord returns the response data directly because of how the API client handles it, or wait, createRecord is a wrapper.
      // Let's assume createRecord returns the data or response. We'll use res directly.
      const data = res.data || res;
      const hash = data.currentHash ? data.currentHash.substring(0, 10) : 'N/A';
      const tx = data.blockchainTxHash ? data.blockchainTxHash.substring(0, 10) : 'N/A';
      
      setSuccess({
        message: 'Record created and anchored on blockchain',
        hash,
        tx
      });
      
      setTimeout(() => {
        navigate('/my-patients');
      }, 3000);
      
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to author medical record on network');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDiscard = (e) => {
    if (!window.confirm('Are you sure you want to discard this draft?')) {
      e.preventDefault();
    }
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Link to="/doctor-dashboard" className="btn btn-outline" style={{ padding: '0.5rem', borderRadius: '50%' }}>
          <ChevronLeft size={20} />
        </Link>
        <div>
          <h1 className="page-title">Create Medical Record</h1>
          <p className="page-subtitle">Creating a medical record for Patient ID: <span style={{fontFamily: 'monospace', color: 'var(--primary)'}}>{patientId}</span></p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      
      {success && (
        <div className="alert alert-success" style={{ marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <strong>{success.message}</strong>
          <span style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>Hash: {success.hash}...</span>
          <span style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>TX: {success.tx}...</span>
        </div>
      )}

      <div className="card" style={{ maxWidth: '900px', margin: '0 auto' }}>
        <div className="card-header" style={{ background: 'var(--bg-main)' }}>
          <h3 className="card-title"><FilePlus size={20} className="text-primary"/> Clinical Details Form</h3>
        </div>
        
        <div className="card-body">
          <div style={{ marginBottom: '2rem', padding: '1rem', background: 'var(--primary-light)', borderRadius: 'var(--radius-md)', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <Shield size={24} className="text-primary" style={{ flexShrink: 0 }} />
            <p style={{ fontSize: '0.875rem', color: 'var(--primary-hover)', margin: 0 }}>
              <strong>Record Integrity:</strong> The information entered below will be securely saved and verified to ensure it cannot be tampered with. Do not include highly sensitive raw PII in the free-text if preventable.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--text-main)' }}>
              <Activity size={18} className="text-muted"/> Assessment & Symptoms
            </h4>
            
            <div className="form-group">
              <label className="form-label">Primary Symptoms / Chief Complaint</label>
              <textarea 
                name="symptoms" 
                required 
                className={`form-control ${validationErrors.symptoms ? 'is-invalid' : ''}`}
                rows="3"
                placeholder="Patient presents with..."
                value={formData.symptoms} 
                onChange={handleChange}
              ></textarea>
              {validationErrors.symptoms && <span style={{ color: 'var(--danger)', fontSize: '0.75rem' }}>{validationErrors.symptoms}</span>}
            </div>
            
            <div className="form-group" style={{ marginBottom: '2rem' }}>
              <label className="form-label">Clinical Diagnosis</label>
              <input 
                type="text" 
                name="diagnosis" 
                required 
                className={`form-control ${validationErrors.diagnosis ? 'is-invalid' : ''}`}
                placeholder="e.g. Acute Bronchitis"
                value={formData.diagnosis} 
                onChange={handleChange}
              />
              {validationErrors.diagnosis && <span style={{ color: 'var(--danger)', fontSize: '0.75rem' }}>{validationErrors.diagnosis}</span>}
            </div>

            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--text-main)', borderTop: '1px solid var(--border-light)', paddingTop: '1.5rem' }}>
              <Stethoscope size={18} className="text-muted"/> Plan & Management
            </h4>
            
            <div className="form-group">
              <label className="form-label">Recommended Treatment Plan</label>
              <textarea 
                name="treatment" 
                required
                className={`form-control ${validationErrors.treatment ? 'is-invalid' : ''}`}
                rows="4"
                placeholder="Outline the steps for care..."
                value={formData.treatment} 
                onChange={handleChange}
              ></textarea>
              {validationErrors.treatment && <span style={{ color: 'var(--danger)', fontSize: '0.75rem' }}>{validationErrors.treatment}</span>}
            </div>
            
            <div className="form-group" style={{ marginBottom: '2rem' }}>
              <label className="form-label">Prescriptions / Medications</label>
              <textarea 
                name="prescription"
                required
                className={`form-control ${validationErrors.prescription ? 'is-invalid' : ''}`}
                rows="2"
                placeholder="Medication, Dosage, Frequency..."
                value={formData.prescription} 
                onChange={handleChange}
              ></textarea>
              {validationErrors.prescription && <span style={{ color: 'var(--danger)', fontSize: '0.75rem' }}>{validationErrors.prescription}</span>}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', borderTop: '1px solid var(--border-light)', paddingTop: '1.5rem' }}>
              <Link to="/doctor-dashboard" className="btn btn-outline" onClick={handleDiscard}>
                Discard Draft
              </Link>
              <button type="submit" className="btn btn-primary" disabled={isLoading || success}>
                {isLoading ? (
                  <>
                    <div className="loading-spinner" style={{ width: '16px', height: '16px', borderWidth: '2px', borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }}></div>
                    Saving to blockchain...
                  </>
                ) : (
                  <>
                    <Shield size={16} /> Create Record
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateRecord;
