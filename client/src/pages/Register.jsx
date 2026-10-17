import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, User, HeartPulse, AlertCircle, CheckCircle2, Activity, Mail, Lock, Eye, EyeOff, Calendar, Briefcase, Hash } from 'lucide-react';
import { getDashboardPath } from '../utils/navigation';
import { 
  getTodayString, 
  getMinDateString, 
  calculateAge, 
  formatDisplayDate, 
  validateDob 
} from '../utils/dateUtils';

const initialFormState = {
  email: '',
  password: '',
  role: 'PATIENT',
  firstName: '',
  lastName: '',
  dob: '',
  specialization: '', 
  licenseNumber: '' 
};

const Register = () => {
  const [formData, setFormData] = useState(initialFormState);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Reset form on component mount
  useEffect(() => {
    setFormData(initialFormState);
    setError('');
    setErrors({});
    setShowPassword(false);
  }, []);

  // Password strength helper
  const getPasswordStrength = (pass) => {
    if (!pass) return { score: 0, label: '', class: '' };
    let score = 0;
    if (pass.length > 7) score++;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;

    if (score < 2) return { score, label: 'Weak', class: 'weak' };
    if (score < 4) return { score, label: 'Medium', class: 'medium' };
    return { score, label: 'Strong', class: 'strong' };
  };

  const strength = getPasswordStrength(formData.password);
  
  const { register } = useAuth();
  const navigate = useNavigate();

  // Dynamic date limits computed on each render
  const maxDate = getTodayString();
  const minDate = getMinDateString(120);

  // Evaluate date of birth live against role
  const dobValidation = validateDob(formData.dob, formData.role);
  const dobDisplay = formatDisplayDate(formData.dob);
  const activeDobError = errors.dob || (formData.dob && !dobValidation.valid ? dobValidation.error : null);
  const isDobInvalid = !formData.dob || !dobValidation.valid;

  // Handle switching between Patient and Doctor, preserving inputs and re-validating DOB
  const handleRoleChange = (newRole) => {
    if (newRole === formData.role) return;
    setFormData(prev => ({
      ...prev,
      role: newRole,
      ...(newRole === 'PATIENT' ? { specialization: '', licenseNumber: '' } : {})
    }));
    setError('');
    setShowPassword(false);

    // Re-validate DOB immediately for the newly selected role if already entered
    if (formData.dob) {
      const check = validateDob(formData.dob, newRole);
      setErrors(prev => {
        const next = { ...prev };
        if (!check.valid) {
          next.dob = check.error;
        } else {
          delete next.dob;
        }
        return next;
      });
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'role') {
      handleRoleChange(value);
      return;
    }

    setFormData(prev => ({ ...prev, [name]: value }));

    if (name === 'dob') {
      const check = validateDob(value, formData.role);
      setErrors(prev => {
        const next = { ...prev };
        if (!check.valid && value) {
          next.dob = check.error;
        } else {
          delete next.dob;
        }
        return next;
      });
    } else if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic validation
    const newErrors = {};
    if (!formData.firstName.trim()) newErrors.firstName = "Enter your first name";
    if (!formData.lastName.trim()) newErrors.lastName = "Enter your last name";
    if (!formData.email.trim() || !/^\S+@\S+\.\S+$/.test(formData.email.trim())) newErrors.email = "Enter a valid email address";
    if (!formData.password || formData.password.length < 6) newErrors.password = "Password must be at least 6 characters";
    
    // Date of birth validation for both Patient and Doctor
    const dobCheck = validateDob(formData.dob, formData.role);
    if (!dobCheck.valid) {
      newErrors.dob = dobCheck.error;
    }

    if (formData.role === 'DOCTOR') {
      if (!formData.specialization.trim()) newErrors.specialization = "Enter your medical specialty";
      if (!formData.licenseNumber.trim()) newErrors.licenseNumber = "Enter your license number";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const user = await register(formData);
      // Reset form state on successful registration
      setFormData(initialFormState);
      setErrors({});
      setShowPassword(false);
      
      navigate(getDashboardPath(user.role));
    } catch (err) {
      // Keep form data on server validation error so user doesn't lose inputs
      if (!err.response) {
        setError('Cannot reach server. Please check your connection or try again later.');
      } else {
        setError(err.response?.data?.message || err.message || 'Failed to register account');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-layout">
      {/* Banner Side (Desktop) */}
      <div className="auth-banner" style={{ background: 'linear-gradient(135deg, #2563EB 0%, #0EA5A4 100%)' }}>
        <div className="auth-banner-content" style={{ maxWidth: '500px' }}>
          <Shield size={64} style={{ marginBottom: '2rem' }} />
          <h1 style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '1.5rem', letterSpacing: '-0.02em' }}>Join SecureMed</h1>
          <p style={{ fontSize: '1.1rem', color: 'rgba(255,255,255,0.9)', marginBottom: '3rem', lineHeight: 1.6 }}>
            Create your SecureMed account to securely manage medical records with trusted verification.
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
              <div style={{ background: 'rgba(255,255,255,0.2)', padding: '0.75rem', borderRadius: '12px' }}>
                <User size={24} color="white" />
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.25rem' }}>Patient-Controlled Access</h3>
                <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.95rem' }}>Patients have complete control over who can access their medical history.</p>
              </div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
              <div style={{ background: 'rgba(255,255,255,0.2)', padding: '0.75rem', borderRadius: '12px' }}>
                <CheckCircle2 size={24} color="white" />
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.25rem' }}>Blockchain Integrity</h3>
                <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.95rem' }}>Every record is cryptographically anchored to ensure data hasn't been tampered with.</p>
              </div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
              <div style={{ background: 'rgba(255,255,255,0.2)', padding: '0.75rem', borderRadius: '12px' }}>
                <Activity size={24} color="white" />
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.25rem' }}>Full Audit Trail</h3>
                <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.95rem' }}>Comprehensive logging of every access request, approval, and record creation.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Form Side */}
      <div className="auth-form-container">
        <div className="auth-card" style={{ maxWidth: '500px' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', justifyContent: 'center' }}>
              <div style={{ background: 'linear-gradient(135deg, #2563EB, #0EA5A4)', padding: '0.5rem', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Shield size={24} color="white" />
              </div>
              <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.02em', fontFamily: 'var(--font-heading)' }}>SecureMed</span>
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>Create Account</h2>
            <p style={{ color: 'var(--text-muted)' }}>Select your role to get started.</p>
          </div>

          {error && (
            <div className="alert alert-error">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate autoComplete="off">
            {/* Role Selection */}
            <div className="role-selector" role="radiogroup" aria-label="Select Role">
              <input type="radio" id="role-patient" name="role" className="role-radio" value="PATIENT" checked={formData.role === 'PATIENT'} onChange={handleChange} />
              <label htmlFor="role-patient" className="role-label">
                <User className="role-label-icon" size={24} /> Patient
                <div className="role-check-badge"><CheckCircle2 size={14} strokeWidth={3} /></div>
              </label>
              
              <input type="radio" id="role-doctor" name="role" className="role-radio" value="DOCTOR" checked={formData.role === 'DOCTOR'} onChange={handleChange} />
              <label htmlFor="role-doctor" className="role-label">
                <HeartPulse className="role-label-icon" size={24} /> Doctor
                <div className="role-check-badge"><CheckCircle2 size={14} strokeWidth={3} /></div>
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="firstName">Legal First Name</label>
                <div className="input-wrapper">
                  <input id="firstName" type="text" name="firstName" placeholder="John" autoComplete="off" className="form-control" value={formData.firstName} onChange={handleChange} aria-invalid={!!errors.firstName} />
                  <User className="input-icon-leading" size={18} />
                </div>
                {errors.firstName && <span className="form-error">{errors.firstName}</span>}
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="lastName">Legal Last Name</label>
                <div className="input-wrapper">
                  <input id="lastName" type="text" name="lastName" placeholder="Doe" autoComplete="off" className="form-control" value={formData.lastName} onChange={handleChange} aria-invalid={!!errors.lastName} />
                  <User className="input-icon-leading" size={18} />
                </div>
                {errors.lastName && <span className="form-error">{errors.lastName}</span>}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="email">Email Address</label>
              <div className="input-wrapper">
                <input id="email" type="email" name="email" placeholder="name@hospital.org" autoComplete="off" className="form-control" value={formData.email} onChange={handleChange} aria-invalid={!!errors.email} />
                <Mail className="input-icon-leading" size={18} />
              </div>
              {errors.email && <span className="form-error">{errors.email}</span>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">Secure Password</label>
              <div className="input-wrapper">
                <input id="password" type={showPassword ? 'text' : 'password'} name="password" placeholder="••••••••" autoComplete="new-password" className="form-control" value={formData.password} onChange={handleChange} aria-invalid={!!errors.password} />
                <Lock className="input-icon-leading" size={18} />
                <div className="input-icon-trailing">
                  <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"}>
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              {formData.password && (
                <div className="password-strength-meter">
                  <div className={`strength-bar ${strength.score > 0 ? strength.class : ''}`} />
                  <div className={`strength-bar ${strength.score > 1 ? strength.class : ''}`} />
                  <div className={`strength-bar ${strength.score > 2 ? strength.class : ''}`} />
                </div>
              )}
              {formData.password && <div className={`strength-text strength-${strength.class.toLowerCase()}`}>{strength.label}</div>}
              {errors.password && <span className="form-error">{errors.password}</span>}
            </div>

            {/* Date of Birth Field (Rendered for both Patient and Doctor) */}
            <div className="form-group">
              <label className="form-label" htmlFor="dob">Date of Birth</label>
              <div className="input-wrapper">
                <input 
                  id="dob" 
                  type="date" 
                  name="dob" 
                  aria-label="Date of Birth"
                  autoComplete="off" 
                  className={`form-control ${activeDobError ? 'is-invalid' : formData.dob && dobValidation.valid ? 'is-valid' : ''}`} 
                  style={{ paddingLeft: '44px' }}
                  value={formData.dob} 
                  onChange={handleChange} 
                  aria-invalid={!!activeDobError} 
                  max={maxDate}
                  min={minDate}
                />
                <Calendar className="input-icon-leading" size={18} />
              </div>

              {/* Live feedback under the field */}
              {formData.dob && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '6px', fontSize: '0.875rem', color: '#475569' }}>
                  {dobDisplay && <span style={{ fontWeight: 500 }}>{dobDisplay}</span>}
                  {dobValidation.age !== null && (
                    <>
                      <span>•</span>
                      <span style={{ 
                        fontWeight: 600, 
                        color: activeDobError ? 'var(--danger, #EF4444)' : 'var(--primary, #2563EB)' 
                      }}>
                        Age: {dobValidation.age}
                      </span>
                    </>
                  )}
                </div>
              )}

              {/* Red error message when the rule fails */}
              {activeDobError && (
                <span className="form-error" style={{ color: 'var(--danger, #EF4444)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px', fontSize: '0.85rem' }}>
                  <AlertCircle size={14} />
                  {activeDobError}
                </span>
              )}
            </div>

            {formData.role === 'DOCTOR' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="specialization">Medical Specialty</label>
                  <div className="input-wrapper">
                    <input id="specialization" type="text" name="specialization" placeholder="Neurology" autoComplete="off" className="form-control" value={formData.specialization} onChange={handleChange} aria-invalid={!!errors.specialization} />
                    <Briefcase className="input-icon-leading" size={18} />
                  </div>
                  {errors.specialization && <span className="form-error">{errors.specialization}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="licenseNumber">License Number</label>
                  <div className="input-wrapper">
                    <input id="licenseNumber" type="text" name="licenseNumber" placeholder="State License ID" autoComplete="off" className="form-control" value={formData.licenseNumber} onChange={handleChange} aria-invalid={!!errors.licenseNumber} />
                    <Hash className="input-icon-leading" size={18} />
                  </div>
                  {errors.licenseNumber && <span className="form-error">{errors.licenseNumber}</span>}
                </div>
              </div>
            )}

            <button 
              type="submit" 
              className="btn-submit" 
              disabled={isLoading || isDobInvalid} 
              style={{ 
                marginTop: '32px',
                opacity: (isLoading || isDobInvalid) ? 0.6 : 1,
                cursor: (isLoading || isDobInvalid) ? 'not-allowed' : 'pointer'
              }}
              title={isDobInvalid ? (activeDobError || 'Please provide a valid date of birth') : 'Create Account'}
            >
              {isLoading ? (
                <>
                  <div className="loading-spinner" style={{ width: '18px', height: '18px', borderWidth: '2px', borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }}></div>
                  Creating Account...
                </>
              ) : 'Create Account'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Already have an account? <Link to="/login" className="auth-link">Sign In</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
