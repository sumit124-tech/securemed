import { Shield, Lock, FileText, Activity, Clock, ShieldCheck, UserCheck, File } from 'lucide-react';

const Features = () => {
  const features = [
    {
      icon: <FileText size={24} />,
      title: 'Secure Medical Records',
      description: 'Your clinical history is stored safely with enterprise-grade encryption. Access is strictly controlled through cryptographic validation.',
      color: 'var(--primary)',
      bg: 'var(--primary-light)'
    },
    {
      icon: <Lock size={24} />,
      title: 'Patient-Controlled Access',
      description: 'Patients have the final say. Approve or revoke access to your medical history instantly through the dashboard.',
      color: 'var(--accent)',
      bg: 'rgba(34, 211, 238, 0.15)'
    },
    {
      icon: <UserCheck size={24} />,
      title: 'Doctor Access Requests',
      description: 'Doctors can securely request access to a patient’s records. Requests are transparently logged and routed to the patient.',
      color: 'var(--secondary)',
      bg: 'var(--secondary-light)'
    },
    {
      icon: <Activity size={24} />,
      title: 'Medical Record History',
      description: 'View a comprehensive timeline of your diagnoses, treatments, and prescriptions authored by verified healthcare professionals.',
      color: '#818CF8',
      bg: 'rgba(129, 140, 248, 0.15)'
    },
    {
      icon: <Clock size={24} />,
      title: 'Audit Trail',
      description: 'Every record creation, view, and access modification is securely logged, giving you complete visibility over your data.',
      color: 'var(--warning)',
      bg: 'var(--warning-light)'
    },
    {
      icon: <ShieldCheck size={24} />,
      title: 'Blockchain Integrity Verification',
      description: 'Medical records are anchored to the blockchain to guarantee they have not been altered or tampered with since creation.',
      color: 'var(--success)',
      bg: 'var(--success-light)'
    },
    {
      icon: <Shield size={24} />,
      title: 'Role-Based Access',
      description: 'Strict separation of permissions between Patients and Doctors ensures that individuals can only access what they are authorized to see.',
      color: 'var(--primary)',
      bg: 'var(--primary-light)'
    },
    {
      icon: <File size={24} />,
      title: 'Secure Document Management',
      description: 'Underlying infrastructure supports attaching vital clinical documents directly to the immutable record securely.',
      color: 'var(--accent)',
      bg: 'rgba(34, 211, 238, 0.15)'
    }
  ];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-main)' }}>
      <section className="bg-grid-pattern" style={{ padding: '6rem 2rem 5rem 2rem', background: '#0B1220', color: 'white', textAlign: 'center', borderBottom: '1px solid var(--border-light)' }}>
        <div className="animate-fade-up" style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h1 style={{ fontSize: 'clamp(2.5rem, 5vw, 3.5rem)', fontWeight: 800, marginBottom: '1.5rem', lineHeight: 1.2, letterSpacing: '-0.02em' }}>
            Platform Features
          </h1>
          <p style={{ fontSize: '1.25rem', color: '#94A3B8', lineHeight: 1.6 }}>
            Discover how SecureMed uses modern technology to protect and manage your healthcare data.
          </p>
        </div>
      </section>

      <section style={{ padding: '6rem 2rem', background: 'var(--bg-main)' }}>
        <div className="features-grid">
            {features.map((feature, index) => (
              <div key={index} className="feature-card animate-fade-up" style={{ 
                '--accent': feature.color,
                padding: '2.5rem', 
                animationDelay: `${(index % 4) * 100}ms`
              }}>
                <div className="feature-icon" style={{ width: '56px', height: '56px', borderRadius: 'var(--radius-xl)', background: feature.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '2rem' }}>
                  {feature.icon}
                </div>
                <h3 className="feature-title" style={{ fontSize: '1.35rem', fontWeight: 700, marginBottom: '1rem' }}>{feature.title}</h3>
                <p className="feature-desc">{feature.description}</p>
              </div>
            ))}
        </div>
      </section>
    </div>
  );
};

export default Features;
