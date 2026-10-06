const About = () => {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-main)' }}>
      <section className="bg-grid-pattern" style={{ padding: '6rem 2rem 5rem 2rem', background: '#0B1220', color: 'white', textAlign: 'center', borderBottom: '1px solid var(--border-light)' }}>
        <div className="animate-fade-up" style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h1 style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 800, marginBottom: '1.5rem', lineHeight: 1.15, letterSpacing: '-0.02em' }}>
            About SecureMed
          </h1>
          <p style={{ fontSize: '1.25rem', color: '#94A3B8', lineHeight: 1.6 }}>
            The academic final-year project bridging the gap between absolute data privacy and clinical accessibility.
          </p>
        </div>
      </section>

      <section style={{ padding: '6rem 2rem', background: 'var(--bg-main)' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          
          <div className="delay-100 animate-fade-up" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', padding: '4rem', borderRadius: 'var(--radius-2xl)' }}>
            <h3 style={{ color: 'var(--text-main)', fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>The Healthcare Problem</h3>
            <p style={{ marginBottom: '3rem', color: 'var(--text-muted)', lineHeight: 1.7, fontSize: '1.05rem' }}>
              Traditional electronic medical record (EMR) systems often suffer from fragmented data silos, poor interoperability, and a lack of patient control. Security breaches and unauthorized data modifications pose significant risks to patient privacy and clinical integrity.
            </p>

            <h3 style={{ color: 'var(--text-main)', fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>Our Proposed Solution</h3>
            <p style={{ marginBottom: '3rem', color: 'var(--text-muted)', lineHeight: 1.7, fontSize: '1.05rem' }}>
              SecureMed aims to bridge the gap between absolute data privacy and clinical accessibility. By placing the patient at the center of the authorization loop, we ensure that individuals have complete sovereignty over who views their medical history.
            </p>

            <h3 style={{ color: 'var(--text-main)', fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>Why Blockchain?</h3>
            <p style={{ marginBottom: '3rem', color: 'var(--text-muted)', lineHeight: 1.7, fontSize: '1.05rem' }}>
              We utilize blockchain technology exclusively for <strong style={{ color: 'var(--text-main)' }}>integrity verification</strong>, not for data storage. Medical data is far too sensitive and voluminous to store on a public ledger. Instead, SecureMed generates a one-way cryptographic hash (SHA-256) of the medical record and anchors this hash to an Ethereum-based blockchain. When a doctor later views the record, the system recalculates the hash and compares it to the blockchain anchor, immediately detecting any unauthorized tampering.
            </p>

            <h3 style={{ color: 'var(--text-main)', fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>Technology Stack</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '3.5rem' }}>
              <div style={{ background: 'var(--bg-main)', padding: '1.25rem', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(255,255,255,0.03)' }}>
                <strong style={{ display: 'block', color: 'var(--text-main)', marginBottom: '0.25rem', fontSize: '0.95rem' }}>Frontend</strong>
                <span style={{ color: 'var(--primary)', fontWeight: 500 }}>React + Vite</span>
              </div>
              <div style={{ background: 'var(--bg-main)', padding: '1.25rem', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(255,255,255,0.03)' }}>
                <strong style={{ display: 'block', color: 'var(--text-main)', marginBottom: '0.25rem', fontSize: '0.95rem' }}>Backend</strong>
                <span style={{ color: 'var(--success)', fontWeight: 500 }}>Node.js + Express</span>
              </div>
              <div style={{ background: 'var(--bg-main)', padding: '1.25rem', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(255,255,255,0.03)' }}>
                <strong style={{ display: 'block', color: 'var(--text-main)', marginBottom: '0.25rem', fontSize: '0.95rem' }}>Database</strong>
                <span style={{ color: 'var(--success)', fontWeight: 500 }}>MongoDB</span>
              </div>
              <div style={{ background: 'var(--bg-main)', padding: '1.25rem', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(255,255,255,0.03)' }}>
                <strong style={{ display: 'block', color: 'var(--text-main)', marginBottom: '0.25rem', fontSize: '0.95rem' }}>Authentication</strong>
                <span style={{ color: 'var(--warning)', fontWeight: 500 }}>JWT + bcrypt</span>
              </div>
              <div style={{ background: 'var(--bg-main)', padding: '1.25rem', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(255,255,255,0.03)' }}>
                <strong style={{ display: 'block', color: 'var(--text-main)', marginBottom: '0.25rem', fontSize: '0.95rem' }}>Blockchain</strong>
                <span style={{ color: 'var(--accent)', fontWeight: 500 }}>Ethereum-compatible local</span>
              </div>
              <div style={{ background: 'var(--bg-main)', padding: '1.25rem', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(255,255,255,0.03)' }}>
                <strong style={{ display: 'block', color: 'var(--text-main)', marginBottom: '0.25rem', fontSize: '0.95rem' }}>Smart Contract</strong>
                <span style={{ color: 'var(--text-muted)' }}>Solidity</span>
              </div>
              <div style={{ background: 'var(--bg-main)', padding: '1.25rem', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(255,255,255,0.03)' }}>
                <strong style={{ display: 'block', color: 'var(--text-main)', marginBottom: '0.25rem', fontSize: '0.95rem' }}>Integrity</strong>
                <span style={{ color: 'var(--text-muted)' }}>SHA-256</span>
              </div>
            </div>

            <h3 style={{ color: 'var(--text-main)', fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>Project Objectives</h3>
            <p style={{ color: 'var(--text-muted)', lineHeight: 1.7, fontSize: '1.05rem' }}>
              SecureMed was developed as an academic final-year engineering project to demonstrate the practical, secure application of hybrid Web2/Web3 architectures in highly regulated domains like healthcare. (Note: SecureMed is a demonstration platform and does not contain real hospital deployment or actual patient data.)
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;
