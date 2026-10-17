import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getDashboardPath } from '../utils/navigation';

const Unauthorized = () => {
  const { user } = useAuth();
  const dashboardPath = user ? getDashboardPath(user.role) : '/login';

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      textAlign: 'center',
      padding: '2rem'
    }}>
      <div style={{
        background: 'rgba(239, 68, 68, 0.1)',
        padding: '1.5rem',
        borderRadius: '50%',
        marginBottom: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <ShieldAlert size={56} color="var(--danger, #EF4444)" />
      </div>
      <h1 style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-main, #F8FAFC)' }}>
        Access Denied
      </h1>
      <p style={{ fontSize: '1.1rem', color: 'var(--text-muted, #94A3B8)', maxWidth: '480px', marginBottom: '2rem' }}>
        You don't have access to this page.
      </p>
      <Link to={dashboardPath} className="btn btn-primary" style={{ padding: '0.75rem 1.5rem', fontWeight: 600 }}>
        {user ? 'Return to Dashboard' : 'Sign In'}
      </Link>
    </div>
  );
};

export default Unauthorized;
