import { Outlet, Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { Menu, X, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const PublicLayout = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth();

  const toggleMenu = () => setMobileMenuOpen(!mobileMenuOpen);

  const NavLinks = () => (
    <>
      <Link to="/how-it-works" className={location.pathname === '/how-it-works' ? 'active-link' : ''} style={{ color: location.pathname === '/how-it-works' ? '#F8FAFC' : '#CBD5E1', transition: 'color 0.2s', fontWeight: 500 }}>How It Works</Link>
      <Link to="/features" className={location.pathname === '/features' ? 'active-link' : ''} style={{ color: location.pathname === '/features' ? '#F8FAFC' : '#CBD5E1', transition: 'color 0.2s', fontWeight: 500 }}>Features</Link>
      <Link to="/security" className={location.pathname === '/security' ? 'active-link' : ''} style={{ color: location.pathname === '/security' ? '#F8FAFC' : '#CBD5E1', transition: 'color 0.2s', fontWeight: 500 }}>Security</Link>
      <Link to="/patients" className={location.pathname === '/patients' ? 'active-link' : ''} style={{ color: location.pathname === '/patients' ? '#F8FAFC' : '#CBD5E1', transition: 'color 0.2s', fontWeight: 500 }}>Patients</Link>
      <Link to="/doctors" className={location.pathname === '/doctors' ? 'active-link' : ''} style={{ color: location.pathname === '/doctors' ? '#F8FAFC' : '#CBD5E1', transition: 'color 0.2s', fontWeight: 500 }}>Doctors</Link>
      <Link to="/about" className={location.pathname === '/about' ? 'active-link' : ''} style={{ color: location.pathname === '/about' ? '#F8FAFC' : '#CBD5E1', transition: 'color 0.2s', fontWeight: 500 }}>About</Link>
    </>
  );

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-main)' }}>
      {/* Navigation */}
      <nav style={{ 
        padding: '0 2rem', 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        background: 'rgba(11, 18, 32, 0.8)', 
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)', 
        position: 'sticky', 
        top: 0, 
        zIndex: 100,
        height: '76px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', maxWidth: '1200px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '3rem' }}>
            <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
              <div style={{ background: 'linear-gradient(135deg, #2563EB, #22D3EE)', padding: '0.4rem', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Shield size={20} color="white" />
              </div>
              <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'white', letterSpacing: '-0.02em', fontFamily: 'var(--font-heading)' }}>SecureMed</span>
            </Link>
            <div className="desktop-nav" style={{ display: 'flex', gap: '2rem', fontSize: '0.95rem' }}>
              <NavLinks />
            </div>
          </div>
          <div className="desktop-nav-auth" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            {user ? (
              <>
                <Link to={user.role === 'DOCTOR' ? '/doctor-dashboard' : '/patient-dashboard'} style={{ color: '#CBD5E1', fontWeight: 500, padding: '0.5rem 1rem', transition: 'color 0.2s' }}>Dashboard</Link>
                <button onClick={logout} className="btn btn-primary" style={{ padding: '0.6rem 1.25rem', borderRadius: 'var(--radius-xl)', fontWeight: 600, boxShadow: 'var(--shadow-glow)', border: 'none', cursor: 'pointer' }}>Logout</button>
              </>
            ) : (
              <>
                <Link to="/login" style={{ color: '#CBD5E1', fontWeight: 500, padding: '0.5rem 1rem', transition: 'color 0.2s' }}>Sign In</Link>
                <Link to="/register" className="btn btn-primary" style={{ padding: '0.6rem 1.25rem', borderRadius: 'var(--radius-xl)', fontWeight: 600, boxShadow: 'var(--shadow-glow)' }}>Get Started</Link>
              </>
            )}
          </div>
          <div className="mobile-menu-btn" style={{ display: 'none', cursor: 'pointer', color: 'white' }} onClick={toggleMenu}>
            {mobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div style={{ position: 'fixed', top: '76px', left: 0, right: 0, bottom: 0, background: 'var(--bg-main)', zIndex: 99, padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', fontSize: '1.1rem', fontWeight: 500 }}>
          <NavLinks />
          <hr style={{ borderTop: '1px solid var(--border-light)', margin: '0.5rem 0' }} />
          {user ? (
            <>
              <Link to={user.role === 'DOCTOR' ? '/doctor-dashboard' : '/patient-dashboard'} style={{ color: '#F8FAFC', textAlign: 'center', padding: '0.75rem' }} onClick={toggleMenu}>Dashboard</Link>
              <button onClick={() => { logout(); toggleMenu(); }} className="btn btn-primary" style={{ textAlign: 'center', padding: '0.75rem', borderRadius: 'var(--radius-xl)', border: 'none', cursor: 'pointer', background: 'transparent' }}>Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" style={{ color: '#F8FAFC', textAlign: 'center', padding: '0.75rem' }} onClick={toggleMenu}>Sign In</Link>
              <Link to="/register" className="btn btn-primary" style={{ textAlign: 'center', padding: '0.75rem', borderRadius: 'var(--radius-xl)' }} onClick={toggleMenu}>Get Started</Link>
            </>
          )}
        </div>
      )}

      {/* Main Content */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Outlet />
      </main>

      {/* Footer */}
      <footer style={{ background: '#070B14', color: 'var(--text-muted)', padding: '5rem 2rem 2rem 2rem', fontSize: '0.9rem', borderTop: '1px solid var(--border-light)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '3rem', marginBottom: '4rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <div style={{ background: 'rgba(255,255,255,0.1)', padding: '0.4rem', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Shield size={20} color="#94A3B8" />
              </div>
              <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#94A3B8', letterSpacing: '-0.02em', fontFamily: 'var(--font-heading)' }}>SecureMed</span>
            </div>
            <p style={{ lineHeight: 1.6 }}>Secure, private, and verified medical record management platform designed for the future of healthcare.</p>
          </div>
          <div>
            <h4 style={{ color: 'var(--text-main)', marginBottom: '1.25rem', fontSize: '1rem' }}>Platform</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <Link to="/how-it-works" style={{ color: 'var(--text-muted)' }}>How It Works</Link>
              <Link to="/features" style={{ color: 'var(--text-muted)' }}>Features</Link>
              <Link to="/security" style={{ color: 'var(--text-muted)' }}>Security</Link>
            </div>
          </div>
          <div>
            <h4 style={{ color: 'var(--text-main)', marginBottom: '1.25rem', fontSize: '1rem' }}>Solutions</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <Link to="/patients" style={{ color: 'var(--text-muted)' }}>For Patients</Link>
              <Link to="/doctors" style={{ color: 'var(--text-muted)' }}>For Doctors</Link>
              <Link to="/about" style={{ color: 'var(--text-muted)' }}>About Us</Link>
            </div>
          </div>
          <div>
            <h4 style={{ color: 'var(--text-main)', marginBottom: '1.25rem', fontSize: '1rem' }}>Access</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <Link to="/login" style={{ color: 'var(--text-muted)' }}>Sign In</Link>
              <Link to="/register" style={{ color: 'var(--text-muted)' }}>Create Account</Link>
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '2rem' }}>
          <p>© 2026 SecureMed Healthcare Platform. Final Year Project.</p>
        </div>
      </footer>
    </div>
  );
};

export default PublicLayout;
