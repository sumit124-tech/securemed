import { Link } from 'react-router-dom';
import { HeartPulse, Search, FilePlus, UserCheck, ShieldCheck } from 'lucide-react';

const Doctors = () => {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-main)' }}>
      <section className="bg-grid-pattern" style={{ padding: '6rem 2rem 5rem 2rem', background: '#0B1220', color: 'white', textAlign: 'center', borderBottom: '1px solid var(--border-light)' }}>
        <div className="animate-fade-up" style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#CBD5E1', padding: '0.5rem 1.25rem', borderRadius: 'var(--radius-full)', marginBottom: '2.5rem' }}>
            <HeartPulse size={16} color="var(--accent)" /> 
            <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>For Doctors</span>
          </div>
          <h1 style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 800, marginBottom: '1.5rem', lineHeight: 1.15, letterSpacing: '-0.02em' }}>
            A secure platform for preserving clinical integrity.
          </h1>
          <p style={{ fontSize: '1.25rem', color: '#94A3B8', lineHeight: 1.6 }}>
            Efficiently manage patient records, request access cryptographically, and author verifiably authentic clinical data.
          </p>
        </div>
      </section>

      <section style={{ padding: '6rem 2rem', background: 'var(--bg-main)' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div className="features-grid" style={{ marginBottom: '5rem' }}>
            
            <div className="feature-card delay-100 animate-fade-up" style={{ '--accent': 'var(--primary)', padding: '2.5rem' }}>
              <div className="feature-icon" style={{ width: '56px', height: '56px', borderRadius: 'var(--radius-xl)', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '2rem' }}>
                <Search size={28} />
              </div>
              <h3 className="feature-title" style={{ fontSize: '1.35rem', fontWeight: 700, marginBottom: '1rem' }}>Request Patient Access</h3>
              <p className="feature-desc">Search for patients securely and dispatch access requests. Wait for cryptographic approval from the patient.</p>
            </div>
            
            <div className="feature-card delay-200 animate-fade-up" style={{ '--accent': 'var(--secondary)', padding: '2.5rem' }}>
              <div className="feature-icon" style={{ width: '56px', height: '56px', borderRadius: 'var(--radius-xl)', background: 'var(--secondary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '2rem' }}>
                <FilePlus size={28} />
              </div>
              <h3 className="feature-title" style={{ fontSize: '1.35rem', fontWeight: 700, marginBottom: '1rem' }}>Create Medical Records</h3>
              <p className="feature-desc">Author clinical notes, diagnoses, and treatments for authorized patients. All records are automatically anchored for integrity.</p>
            </div>
            
            <div className="feature-card delay-300 animate-fade-up" style={{ '--accent': 'var(--warning)', padding: '2.5rem' }}>
              <div className="feature-icon" style={{ width: '56px', height: '56px', borderRadius: 'var(--radius-xl)', background: 'var(--warning-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '2rem' }}>
                <UserCheck size={28} />
              </div>
              <h3 className="feature-title" style={{ fontSize: '1.35rem', fontWeight: 700, marginBottom: '1rem' }}>Manage Patients</h3>
              <p className="feature-desc">View your roster of authorized patients and seamlessly review their comprehensive medical history.</p>
            </div>
            
            <div className="feature-card delay-400 animate-fade-up" style={{ '--accent': 'var(--success)', padding: '2.5rem' }}>
              <div className="feature-icon" style={{ width: '56px', height: '56px', borderRadius: 'var(--radius-xl)', background: 'var(--success-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '2rem' }}>
                <ShieldCheck size={28} />
              </div>
              <h3 className="feature-title" style={{ fontSize: '1.35rem', fontWeight: 700, marginBottom: '1rem' }}>Verify Integrity</h3>
              <p className="feature-desc">Ensure the clinical data you are reading is authentic and has not been subjected to unauthorized modifications.</p>
            </div>
            
          </div>

          <div className="delay-500 animate-fade-up" style={{ textAlign: 'center', background: 'var(--bg-surface)', border: '1px solid var(--border-light)', padding: '5rem 2rem', borderRadius: 'var(--radius-2xl)' }}>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '1.5rem', letterSpacing: '-0.02em' }}>Join the network</h2>
            <Link to="/register" className="btn btn-primary" style={{ fontSize: '1.1rem', padding: '1rem 2.5rem', borderRadius: 'var(--radius-xl)', fontWeight: 600, boxShadow: 'var(--shadow-glow)' }}>
              <HeartPulse size={20} style={{ marginRight: '0.5rem', display: 'inline' }} />
              Create Doctor Account
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Doctors;
