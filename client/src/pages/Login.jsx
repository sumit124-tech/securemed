import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Mail, Lock, AlertCircle, Eye, EyeOff, User, HeartPulse, CheckCircle2, FileText, Activity } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('PATIENT');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login, logout } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    let valid = true;
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) { setEmailError('Enter a valid email address'); valid = false; }
    else { setEmailError(''); }
    if (!password) { setPasswordError('Enter your password'); valid = false; }
    else { setPasswordError(''); }
    
    if (!valid) return;

    setError('');
    setIsLoading(true);

    try {
      const user = await login(email, password);
      
      // Security Check: Ensure selected role matches real backend role
      if (user.role !== role) {
        logout(); // immediately log them out if roles mismatch
        throw new Error(`Invalid role. This account is registered as a ${user.role.toLowerCase()}.`);
      }

      if (user.role === 'DOCTOR') navigate('/doctor-dashboard');
      else if (user.role === 'PATIENT') navigate('/patient-dashboard');
      else navigate('/');
    } catch (err) {
      if (!err.response) {
        setError('Cannot reach server. Please check your connection or try again later.');
      } else {
        setError(err.response?.data?.message || err.message || 'Invalid credentials');
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
          <h1 style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '1.5rem', letterSpacing: '-0.02em' }}>Welcome to SecureMed</h1>
          <p style={{ fontSize: '1.1rem', color: 'rgba(255,255,255,0.9)', marginBottom: '3rem', lineHeight: 1.6 }}>
            The enterprise healthcare platform for managing and verifying medical records with blockchain integrity.
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
        <div className="auth-card">
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', justifyContent: 'center' }}>
              <div style={{ background: 'linear-gradient(135deg, #2563EB, #0EA5A4)', padding: '0.5rem', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Shield size={24} color="white" />
              </div>
              <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.02em', fontFamily: 'var(--font-heading)' }}>SecureMed</span>
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>Sign In</h2>
            <p style={{ color: 'var(--text-muted)' }}>Sign in as {role === 'PATIENT' ? 'a Patient' : 'a Doctor'} to access your account.</p>
          </div>

          {error && (
            <div className="alert alert-error">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            {/* Role Selection */}
            <div className="role-selector" role="radiogroup" aria-label="Select Role">
              <input type="radio" id="role-patient" name="role" className="role-radio" value="PATIENT" checked={role === 'PATIENT'} onChange={(e) => setRole(e.target.value)} />
              <label htmlFor="role-patient" className="role-label">
                <User className="role-label-icon" size={24} /> Patient
                <div className="role-check-badge"><CheckCircle2 size={14} strokeWidth={3} /></div>
              </label>
              
              <input type="radio" id="role-doctor" name="role" className="role-radio" value="DOCTOR" checked={role === 'DOCTOR'} onChange={(e) => setRole(e.target.value)} />
              <label htmlFor="role-doctor" className="role-label">
                <HeartPulse className="role-label-icon" size={24} /> Doctor
                <div className="role-check-badge"><CheckCircle2 size={14} strokeWidth={3} /></div>
              </label>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="email">Email Address</label>
              <div className="input-wrapper">
                <input
                  id="email"
                  type="email"
                  placeholder="name@hospital.org"
                  className="form-control"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); if(emailError) setEmailError(''); }}
                  aria-invalid={!!emailError}
                  aria-describedby={emailError ? "email-error" : undefined}
                />
                <Mail className="input-icon-leading" size={18} />
              </div>
              {emailError && <span id="email-error" className="form-error">{emailError}</span>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">Password</label>
              <div className="input-wrapper">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="form-control"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); if(passwordError) setPasswordError(''); }}
                  aria-invalid={!!passwordError}
                  aria-describedby={passwordError ? "password-error" : undefined}
                />
                <Lock className="input-icon-leading" size={18} />
                <div className="input-icon-trailing">
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              {passwordError && <span id="password-error" className="form-error">{passwordError}</span>}
            </div>

            <button type="submit" className="btn-submit" disabled={isLoading} style={{ marginTop: '32px' }}>
              {isLoading ? (
                <>
                  <div className="loading-spinner" style={{ width: '18px', height: '18px', borderWidth: '2px', borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }}></div>
                  Signing in...
                </>
              ) : 'Sign In'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Don't have an account? <Link to="/register" className="auth-link">Create Account</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
