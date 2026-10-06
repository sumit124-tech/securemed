import { UserPlus, FolderOpen, HeartPulse, ShieldCheck, Search, Activity, CheckCircle2 } from 'lucide-react';

const HowItWorks = () => {
  const steps = [
    { num: '01', icon: <UserPlus size={24} />, title: 'Patient Registration', desc: 'Patients securely register their identity on the platform and log into their personal dashboard.' },
    { num: '02', icon: <FolderOpen size={24} />, title: 'Medical Record Management', desc: 'Patients can view their encrypted medical history and manage who currently has access to their data.' },
    { num: '03', icon: <HeartPulse size={24} />, title: 'Doctor Requests Access', desc: 'When visiting a new doctor, the doctor logs into their dashboard and submits a formal request to access the patient\'s records.' },
    { num: '04', icon: <ShieldCheck size={24} />, title: 'Patient Approves Access', desc: 'The patient receives a notification and explicitly approves the doctor\'s access request, granting cryptographic consent.' },
    { num: '05', icon: <Search size={24} />, title: 'Doctor Views Authorized Record', desc: 'The doctor can now securely view the patient\'s history and add new medical records/diagnoses during the consultation.' },
    { num: '06', icon: <Activity size={24} />, title: 'Activity Is Recorded', desc: 'Every time a record is viewed or created, the action is logged in an immutable administrative audit trail.' },
    { num: '07', icon: <CheckCircle2 size={24} />, title: 'Record Integrity Can Be Verified', desc: 'Behind the scenes, the system anchors a SHA-256 hash of the record to the blockchain to prevent secret modifications.' },
  ];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-main)' }}>
      <section className="bg-grid-pattern" style={{ padding: '6rem 2rem 5rem 2rem', background: '#0B1220', color: 'white', textAlign: 'center', borderBottom: '1px solid var(--border-light)' }}>
        <div className="animate-fade-up" style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h1 style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 800, marginBottom: '1.5rem', lineHeight: 1.15, letterSpacing: '-0.02em' }}>
            How SecureMed Works
          </h1>
          <p style={{ fontSize: '1.25rem', color: '#94A3B8', lineHeight: 1.6 }}>
            Patients remain in control of who can access their medical records.
          </p>
        </div>
      </section>

      <section style={{ padding: '6rem 2rem', background: 'var(--bg-main)' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'relative' }}>
            <div style={{ position: 'absolute', left: '40px', top: '2rem', bottom: '2rem', width: '2px', background: 'var(--border-light)', zIndex: 0 }}></div>
            
            {steps.map((step, index) => (
              <div key={index} className="step-card animate-fade-up" style={{ 
                display: 'flex', gap: '2.5rem', alignItems: 'center', position: 'relative', zIndex: 10, 
                padding: '2rem',
                animationDelay: `${(index % 7) * 100}ms`
              }}>
                <div className="step-number" style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 700, fontSize: '1.1rem', border: '4px solid var(--bg-main)', boxShadow: 'var(--shadow-glow)' }}>
                  {step.num}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem', color: 'var(--text-main)' }}>
                    <div className="step-icon" style={{ color: 'var(--primary)' }}>{step.icon}</div>
                    <h3 className="step-title" style={{ fontSize: '1.35rem', fontWeight: 700 }}>{step.title}</h3>
                  </div>
                  <p className="step-desc" style={{ lineHeight: 1.6, fontSize: '1.05rem' }}>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>
    </div>
  );
};

export default HowItWorks;
