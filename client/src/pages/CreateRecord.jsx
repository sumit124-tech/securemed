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
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await createRecord(formData);
      navigate('/doctor-dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to author medical record on network');
    } finally {
      setIsLoading(false);
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
                className="form-control" 
                rows="3"
                placeholder="Patient presents with..."
                value={formData.symptoms} 
                onChange={handleChange}
              ></textarea>
            </div>
            
            <div className="form-group" style={{ marginBottom: '2rem' }}>
              <label className="form-label">Clinical Diagnosis</label>
              <input 
                type="text" 
                name="diagnosis" 
                required 
                className="form-control"
                placeholder="e.g. Acute Bronchitis"
                value={formData.diagnosis} 
                onChange={handleChange}
              />
            </div>

            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--text-main)', borderTop: '1px solid var(--border-light)', paddingTop: '1.5rem' }}>
              <Stethoscope size={18} className="text-muted"/> Plan & Management
            </h4>
            
            <div className="form-group">
              <label className="form-label">Recommended Treatment Plan</label>
              <textarea 
                name="treatment" 
                className="form-control" 
                rows="4"
                placeholder="Outline the steps for care..."
                value={formData.treatment} 
                onChange={handleChange}
              ></textarea>
            </div>
            
            <div className="form-group" style={{ marginBottom: '2rem' }}>
              <label className="form-label">Prescriptions / Medications</label>
              <textarea 
                name="prescription" 
                className="form-control" 
                rows="2"
                placeholder="Medication, Dosage, Frequency..."
                value={formData.prescription} 
                onChange={handleChange}
              ></textarea>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', borderTop: '1px solid var(--border-light)', paddingTop: '1.5rem' }}>
              <Link to="/doctor-dashboard" className="btn btn-outline">
                Discard Draft
              </Link>
              <button type="submit" className="btn btn-primary" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <div className="loading-spinner" style={{ width: '16px', height: '16px', borderWidth: '2px', borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }}></div>
                    Saving Record...
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
