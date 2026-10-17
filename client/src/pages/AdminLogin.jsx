import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Mail, Lock, CheckCircle2, User, Activity, EyeOff, Eye } from 'lucide-react';
import { getDashboardPath } from '../utils/navigation';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
      
      // Security Check: Ensure returned user is actually an ADMIN
      if (user.role !== 'ADMIN') {
        logout(); // immediately log them out
        throw new Error(`Administrator access required. This account is registered as a ${user.role.toLowerCase()}.`);
      }

      navigate(getDashboardPath(user.role));
    } catch (err) {
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else if (err.message && !err.code) {
        setError(err.message);
      } else {
        setError('Cannot reach server. Please check your connection or try again later.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-layout">
      {/* Banner Side (Desktop) */}
      <div className="auth-banner" style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' }}>
        <div className="auth-banner-content" style={{ maxWidth: '500px' }}>
          <Shield size={64} style={{ marginBottom: '2rem', color: '#38bdf8' }} />
          <h1 style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '1.5rem', letterSpacing: '-0.02em', color: 'white' }}>SecureMed Administration</h1>
          <p style={{ fontSize: '1.1rem', color: 'rgba(255,255,255,0.7)', marginBottom: '3rem', lineHeight: 1.6 }}>
            Authorized personnel only. Manage doctor verifications, monitor system health, and oversee platform integrity.
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
              <div style={{ background: 'rgba(255,255,255,0.1)', padding: '0.75rem', borderRadius: '12px' }}>
                <CheckCircle2 size={24} color="#38bdf8" />
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.25rem', color: 'white' }}>Doctor Verification</h3>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.95rem' }}>Review and approve doctor registrations before they can access the platform.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Form Side */}
      <div className="auth-form-container">
        <div className="auth-form-wrapper">
          <div className="auth-header">
            <h2 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>
              Administrator Sign In
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>Enter your credentials to access the admin portal.</p>
          </div>

          {error && (
            <div className="alert-error" style={{ marginBottom: '2rem' }}>
              <Shield size={18} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="email">Email Address</label>
              <div className="input-wrapper">
                <input
                  id="email"
                  type="email"
                  placeholder="admin@securemed.com"
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

            <button type="submit" className="btn-submit" disabled={isLoading} style={{ marginTop: '32px', background: '#0f172a' }}>
              {isLoading ? (
                <>
                  <div className="loading-spinner" style={{ width: '18px', height: '18px', borderWidth: '2px', borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }}></div>
                  Signing in...
                </>
              ) : 'Sign In'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid var(--border-light)', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            <Link to="/login" className="auth-link">&larr; Back to User Login</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
