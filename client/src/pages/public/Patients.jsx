import { Link } from 'react-router-dom';
import { User, Activity, ShieldAlert, FileText, CheckCircle2 } from 'lucide-react';

const Patients = () => {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-main)' }}>
      <section className="bg-grid-pattern" style={{ padding: '6rem 2rem 5rem 2rem', background: '#0B1220', color: 'white', textAlign: 'center', borderBottom: '1px solid var(--border-light)' }}>
        <div className="animate-fade-up" style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#CBD5E1', padding: '0.5rem 1.25rem', borderRadius: 'var(--radius-full)', marginBottom: '2.5rem' }}>
            <User size={16} color="var(--accent)" /> 
            <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>For Patients</span>
          </div>
          <h1 style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 800, marginBottom: '1.5rem', lineHeight: 1.15, letterSpacing: '-0.02em' }}>
            Take absolute control over your healthcare data.
          </h1>
          <p style={{ fontSize: '1.25rem', color: '#94A3B8', lineHeight: 1.6 }}>
            SecureMed gives you the power to manage your privacy, approve doctor access, and view your verified medical history in one place.
          </p>
        </div>
      </section>

      <section style={{ padding: '6rem 2rem', background: 'var(--bg-main)' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div className="features-grid" style={{ marginBottom: '5rem' }}>
            
            <div className="feature-card delay-100 animate-fade-up" style={{ '--accent': 'var(--primary)', padding: '2.5rem' }}>
              <div className="feature-icon" style={{ width: '56px', height: '56px', borderRadius: 'var(--radius-xl)', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '2rem' }}>
                <FileText size={28} />
              </div>
              <h3 className="feature-title" style={{ fontSize: '1.35rem', fontWeight: 700, marginBottom: '1rem' }}>Manage Medical Records</h3>
              <p className="feature-desc">View your entire clinical history in one secure place. See diagnoses, treatments, and prescriptions authored by your doctors.</p>
            </div>
            
            <div className="feature-card delay-200 animate-fade-up" style={{ '--accent': 'var(--secondary)', padding: '2.5rem' }}>
              <div className="feature-icon" style={{ width: '56px', height: '56px', borderRadius: 'var(--radius-xl)', background: 'var(--secondary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '2rem' }}>
                <ShieldAlert size={28} />
              </div>
              <h3 className="feature-title" style={{ fontSize: '1.35rem', fontWeight: 700, marginBottom: '1rem' }}>Control Doctor Access</h3>
              <p className="feature-desc">Approve or reject incoming access requests from healthcare professionals. Revoke access instantly whenever you choose.</p>
            </div>
            
            <div className="feature-card delay-300 animate-fade-up" style={{ '--accent': 'var(--warning)', padding: '2.5rem' }}>
              <div className="feature-icon" style={{ width: '56px', height: '56px', borderRadius: 'var(--radius-xl)', background: 'var(--warning-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '2rem' }}>
                <Activity size={28} />
              </div>
              <h3 className="feature-title" style={{ fontSize: '1.35rem', fontWeight: 700, marginBottom: '1rem' }}>View Audit History</h3>
              <p className="feature-desc">Monitor an immutable audit log of exactly who requested access to your data and when records were created.</p>
            </div>
            
            <div className="feature-card delay-400 animate-fade-up" style={{ '--accent': 'var(--success)', padding: '2.5rem' }}>
              <div className="feature-icon" style={{ width: '56px', height: '56px', borderRadius: 'var(--radius-xl)', background: 'var(--success-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '2rem' }}>
                <CheckCircle2 size={28} />
              </div>
              <h3 className="feature-title" style={{ fontSize: '1.35rem', fontWeight: 700, marginBottom: '1rem' }}>Verify Record Integrity</h3>
              <p className="feature-desc">Rest assured knowing that your medical records are verified against the blockchain to prevent tampering.</p>
            </div>
            
          </div>

          <div className="delay-500 animate-fade-up" style={{ textAlign: 'center', background: 'var(--bg-surface)', border: '1px solid var(--border-light)', padding: '5rem 2rem', borderRadius: 'var(--radius-2xl)' }}>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '1.5rem', letterSpacing: '-0.02em' }}>Ready to take control?</h2>
            <Link to="/register" className="btn btn-primary" style={{ fontSize: '1.1rem', padding: '1rem 2.5rem', borderRadius: 'var(--radius-xl)', fontWeight: 600, boxShadow: 'var(--shadow-glow)' }}>
              <User size={20} style={{ marginRight: '0.5rem', display: 'inline' }} />
              Create Patient Account
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Patients;
