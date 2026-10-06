import { Shield, Key, Database, FileText, CheckCircle2, Lock, Activity, UserCheck } from 'lucide-react';

const Security = () => {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-main)' }}>
      
      {/* Hero Header */}
      <section className="bg-grid-pattern" style={{ padding: '6rem 2rem 5rem 2rem', background: '#0B1220', color: 'white', textAlign: 'center', borderBottom: '1px solid var(--border-light)' }}>
        <div className="animate-fade-up" style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#CBD5E1', padding: '0.5rem 1.25rem', borderRadius: 'var(--radius-full)', marginBottom: '2.5rem' }}>
            <Shield size={16} color="var(--accent)" /> 
            <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Enterprise-Grade Security</span>
          </div>
          <h1 style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 800, marginBottom: '1.5rem', lineHeight: 1.15, letterSpacing: '-0.02em' }}>
            Trust Built on Cryptography and Consensus.
          </h1>
          <p style={{ fontSize: '1.25rem', color: '#94A3B8', lineHeight: 1.6 }}>
            Our Blockchain-Based Secure Medical Record Management System combines strict access control with cryptographic verification.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section style={{ padding: '6rem 2rem', background: 'var(--bg-main)' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          
          <div className="animate-fade-up" style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '1.5rem', letterSpacing: '-0.02em' }}>How We Verify Record Integrity</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', maxWidth: '700px', margin: '0 auto', lineHeight: 1.7 }}>
              Sensitive medical data is <strong style={{ color: 'var(--text-main)' }}>never</strong> stored directly on the blockchain. Instead, we use blockchain to guarantee the integrity of data securely stored in our private databases.
            </p>
          </div>

          {/* Vertical Flow Diagram */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', marginBottom: '5rem' }}>
            
            <div className="delay-100 animate-fade-up" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', padding: '2.5rem', borderRadius: 'var(--radius-2xl)', display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: 'var(--shadow-glow)' }}>
                <span style={{ fontWeight: 700, fontSize: '1.25rem' }}>1</span>
              </div>
              <div>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FileText size={20} color="var(--primary)" /> Medical Record (Off-Chain)</h3>
                <p style={{ color: 'var(--text-muted)', lineHeight: 1.7, fontSize: '1.05rem' }}>When a doctor creates a record, the highly sensitive medical data (diagnoses, notes, files) is securely encrypted and stored in our compliant off-chain MongoDB database.</p>
              </div>
            </div>

            <div className="delay-200 animate-fade-up" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', padding: '2.5rem', borderRadius: 'var(--radius-2xl)', display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#CBD5E1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontWeight: 700, fontSize: '1.25rem' }}>2</span>
              </div>
              <div>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Key size={20} color="#CBD5E1" /> SHA-256 Hash Generation</h3>
                <p style={{ color: 'var(--text-muted)', lineHeight: 1.7, fontSize: '1.05rem' }}>The system instantly generates a cryptographic SHA-256 hash of the exact record contents. This hash is a unique digital fingerprint—it cannot be reversed to reveal the data, but if even a single comma changes in the record, the hash will change entirely.</p>
              </div>
            </div>

            <div className="delay-300 animate-fade-up" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', padding: '2.5rem', borderRadius: 'var(--radius-2xl)', display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--secondary-light)', color: 'var(--secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontWeight: 700, fontSize: '1.25rem' }}>3</span>
              </div>
              <div>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Lock size={20} color="var(--secondary)" /> Smart Contract Anchoring</h3>
                <p style={{ color: 'var(--text-muted)', lineHeight: 1.7, fontSize: '1.05rem' }}>The digital fingerprint (hash) is submitted to our Ethereum-compatible Smart Contract. The contract permanently anchors this hash to the immutable blockchain ledger alongside a timestamp.</p>
              </div>
            </div>

            <div className="delay-400 animate-fade-up" style={{ background: '#0B1220', border: '1px solid var(--primary)', padding: '2.5rem', borderRadius: 'var(--radius-2xl)', display: 'flex', gap: '2rem', alignItems: 'flex-start', color: 'white', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'radial-gradient(circle at 100% 0%, rgba(37,99,235,0.15) 0%, transparent 50%)', pointerEvents: 'none' }}></div>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontWeight: 700, fontSize: '1.25rem' }}>4</span>
              </div>
              <div style={{ position: 'relative', zIndex: 1 }}>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle2 size={20} color="var(--success)" /> Integrity Verification</h3>
                <p style={{ color: 'rgba(255,255,255,0.7)', lineHeight: 1.7, fontSize: '1.05rem' }}>When a user views the record, the system generates a new hash of the currently stored data and compares it to the original hash anchored on the blockchain.</p>
                <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1.25rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: 'var(--radius-lg)', color: '#34D399', fontWeight: 500 }}>
                    <CheckCircle2 size={20} /> If hashes match: "Integrity Verified"
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1.25rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 'var(--radius-lg)', color: '#F87171', fontWeight: 500 }}>
                    <Shield size={20} /> If hashes do not match: "Integrity Check Failed — Record Modified"
                  </div>
                </div>
              </div>
            </div>

          </div>

          <hr style={{ borderTop: '1px solid var(--border-light)', margin: '5rem 0' }} />

          <h2 className="animate-fade-up" style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '3rem', textAlign: 'center', letterSpacing: '-0.02em' }}>Beyond the Blockchain</h2>
          
          <div className="features-grid">
            <div className="feature-card delay-100 animate-fade-up" style={{ '--accent': 'var(--primary)', padding: '2.5rem' }}>
              <div className="feature-icon" style={{ width: '56px', height: '56px', borderRadius: 'var(--radius-xl)', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                <UserCheck size={28} />
              </div>
              <h4 className="feature-title" style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.75rem' }}>Authentication & Authorization</h4>
              <p className="feature-desc">Strict JSON Web Token (JWT) verification separates Patient and Doctor capabilities, ensuring users can only interact with authorized endpoints.</p>
            </div>
            
            <div className="feature-card delay-200 animate-fade-up" style={{ '--accent': 'var(--secondary)', padding: '2.5rem' }}>
              <div className="feature-icon" style={{ width: '56px', height: '56px', borderRadius: 'var(--radius-xl)', background: 'var(--secondary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                <Lock size={28} />
              </div>
              <h4 className="feature-title" style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.75rem' }}>Patient Consent & Access</h4>
              <p className="feature-desc">Doctors cannot unilaterally view records. Every access attempt requires explicit, revocable cryptographic consent granted by the patient.</p>
            </div>
            
            <div className="feature-card delay-300 animate-fade-up" style={{ '--accent': 'var(--warning)', padding: '2.5rem' }}>
              <div className="feature-icon" style={{ width: '56px', height: '56px', borderRadius: 'var(--radius-xl)', background: 'var(--warning-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                <Activity size={28} />
              </div>
              <h4 className="feature-title" style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.75rem' }}>Immutable Audit Trails</h4>
              <p className="feature-desc">Every significant action—from registering to requesting access to viewing a record—is permanently logged in an administrative audit trail.</p>
            </div>
          </div>

        </div>
      </section>
    </div>
  );
};

export default Security;
