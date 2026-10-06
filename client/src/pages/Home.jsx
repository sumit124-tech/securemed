import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Lock, CheckCircle2, ChevronRight, Activity, ArrowRight, FileText } from 'lucide-react';

const Home = () => {
  const { user } = useAuth();



  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, background: 'var(--bg-main)' }}>
      {/* Hero Section - Premium Dark Navy */}
      <section className="bg-grid-pattern" style={{ 
        padding: '8rem 2rem 10rem 2rem',
        background: '#0B1220',
        color: 'white',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center'
      }}>
        {/* Soft radial blue glow */}
        <div style={{ position: 'absolute', top: '20%', left: '50%', transform: 'translate(-50%, -50%)', width: '60vw', height: '40vw', background: 'radial-gradient(circle, rgba(37,99,235,0.15) 0%, rgba(11,18,32,0) 70%)', zIndex: 0, pointerEvents: 'none' }}></div>
        
        <div className="animate-fade-up" style={{ position: 'relative', zIndex: 10, maxWidth: '1000px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#CBD5E1', padding: '0.5rem 1.25rem', borderRadius: 'var(--radius-full)', fontSize: '0.875rem', fontWeight: 600, marginBottom: '2.5rem' }}>
            <Shield size={16} color="var(--accent)" /> 
            <span>Enterprise Healthcare Security</span>
          </div>
          
          <h1 style={{ fontSize: 'clamp(3.5rem, 7vw, 5.5rem)', fontWeight: 800, color: 'white', lineHeight: 1.1, marginBottom: '1.5rem', letterSpacing: '-0.03em' }}>
            Your Medical Records.<br/>
            Secure, Private, <span style={{ background: 'linear-gradient(135deg, #2563EB, #22D3EE)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Verified.</span>
          </h1>
          
          <p className="delay-100 animate-fade-up" style={{ fontSize: '1.25rem', color: '#94A3B8', maxWidth: '700px', margin: '0 auto 3.5rem auto', lineHeight: 1.6 }}>
            SecureMed helps patients and doctors securely manage medical records while providing trusted blockchain-based record integrity verification.
          </p>
          
          <div className="delay-200 animate-fade-up" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <Link to="/register" className="btn btn-primary" style={{ padding: '1rem 2.5rem', fontSize: '1.1rem', borderRadius: 'var(--radius-xl)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: 'var(--shadow-glow)' }}>
              Get Started <ArrowRight size={20} />
            </Link>
            <Link to="/how-it-works" className="btn btn-outline" style={{ padding: '1rem 2.5rem', fontSize: '1.1rem', background: 'transparent', color: 'white', borderColor: 'rgba(255,255,255,0.2)', borderRadius: 'var(--radius-xl)', fontWeight: 600 }}>
              See How It Works
            </Link>
          </div>
          
          {/* Glassmorphism Product Preview Card */}
          <div className="delay-300 animate-fade-up" style={{ marginTop: '5rem', background: 'rgba(17, 26, 46, 0.4)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 'var(--radius-2xl)', padding: '2rem', width: '100%', maxWidth: '800px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(255,255,255,0.03)', padding: '1rem 1.5rem', borderRadius: 'var(--radius-xl)', border: '1px solid rgba(255,255,255,0.05)' }}>
               <FileText color="#94A3B8" size={24} />
               <div style={{ textAlign: 'left' }}>
                 <div style={{ fontSize: '0.75rem', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Data</div>
                 <div style={{ fontSize: '1rem', color: 'white', fontWeight: 500 }}>Medical Record</div>
               </div>
             </div>
             
             <ChevronRight color="#475569" />
             
             <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(255,255,255,0.03)', padding: '1rem 1.5rem', borderRadius: 'var(--radius-xl)', border: '1px solid rgba(255,255,255,0.05)' }}>
               <Lock color="#94A3B8" size={24} />
               <div style={{ textAlign: 'left' }}>
                 <div style={{ fontSize: '0.75rem', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Hash</div>
                 <div style={{ fontSize: '1rem', color: 'white', fontWeight: 500 }}>SHA-256</div>
               </div>
             </div>
             
             <ChevronRight color="#475569" />
             
             <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(16, 185, 129, 0.1)', padding: '1rem 1.5rem', borderRadius: 'var(--radius-xl)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
               <CheckCircle2 color="#10B981" size={24} />
               <div style={{ textAlign: 'left' }}>
                 <div style={{ fontSize: '0.75rem', color: '#10B981', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Blockchain</div>
                 <div style={{ fontSize: '1rem', color: 'white', fontWeight: 600 }}>Integrity Verified</div>
               </div>
             </div>
          </div>
        </div>
      </section>

      {/* Feature Section */}
      <section style={{ padding: '6rem 2rem', background: 'var(--bg-main)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', position: 'relative', zIndex: 20 }}>
          
          <div className="features-grid">
            {/* Feature 1 */}
            <div className="feature-card delay-200 animate-fade-up" style={{ '--accent': 'var(--primary)', padding: '2.5rem' }}>
              <div className="feature-icon" style={{ width: '56px', height: '56px', borderRadius: 'var(--radius-xl)', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                <Lock size={28} />
              </div>
              <h3 className="feature-title" style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>Patient-Controlled Access</h3>
              <p className="feature-desc">Patients maintain full control over their data, granting or revoking doctor access securely and instantly.</p>
            </div>
            
            {/* Feature 2 */}
            <div className="feature-card delay-300 animate-fade-up" style={{ '--accent': 'var(--secondary)', padding: '2.5rem' }}>
              <div className="feature-icon" style={{ width: '56px', height: '56px', borderRadius: 'var(--radius-xl)', background: 'var(--secondary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                <Activity size={28} />
              </div>
              <h3 className="feature-title" style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>Secure Off-Chain Storage</h3>
              <p className="feature-desc">Sensitive medical information is safely stored off-chain in compliant databases, never directly on the public ledger.</p>
            </div>

            {/* Feature 3 */}
            <div className="feature-card delay-400 animate-fade-up" style={{ '--accent': 'var(--success)', padding: '2.5rem' }}>
              <div className="feature-icon" style={{ width: '56px', height: '56px', borderRadius: 'var(--radius-xl)', background: 'var(--success-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                <CheckCircle2 size={28} />
              </div>
              <h3 className="feature-title" style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>Blockchain Verification</h3>
              <p className="feature-desc">We use smart contracts to anchor SHA-256 hashes of medical records, enabling cryptographic proof of integrity.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section style={{ padding: '6rem 2rem', background: 'var(--bg-surface)', textAlign: 'center', borderTop: '1px solid var(--border-light)' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '3rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '1.5rem', letterSpacing: '-0.02em' }}>Ready to secure your medical data?</h2>
          <p style={{ fontSize: '1.25rem', color: 'var(--text-muted)', marginBottom: '3rem' }}>Join the platform that puts patients in control and gives doctors the verified information they need.</p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <Link to="/register" className="btn btn-primary" style={{ padding: '1rem 2.5rem', fontSize: '1.1rem', borderRadius: 'var(--radius-xl)', fontWeight: 600, boxShadow: 'var(--shadow-glow)' }}>Create Account</Link>
            <Link to="/login" className="btn btn-outline" style={{ padding: '1rem 2.5rem', fontSize: '1.1rem', borderRadius: 'var(--radius-xl)', fontWeight: 600, color: 'var(--text-main)', borderColor: 'var(--border-light)' }}>Sign In</Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
