import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('React Error Boundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '2rem', textAlign: 'center', background: '#f8fafc' }}>
          <div style={{ background: 'white', padding: '3rem', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', maxWidth: '500px', width: '100%' }}>
            <AlertTriangle size={64} color="#ef4444" style={{ marginBottom: '1.5rem' }} />
            <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#0f172a', marginBottom: '1rem' }}>Something went wrong.</h1>
            <p style={{ color: '#64748b', marginBottom: '2rem', lineHeight: '1.5' }}>
              We've encountered an unexpected error. Please try reloading the page.
            </p>
            <button 
              onClick={() => window.location.reload()} 
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: '#2563eb', color: 'white', padding: '0.75rem 1.5rem', borderRadius: '0.5rem', fontWeight: 500, border: 'none', cursor: 'pointer', marginBottom: '1.5rem' }}
            >
              <RefreshCw size={18} />
              Reload Page
            </button>
            {import.meta.env.DEV && this.state.error && (
              <div style={{ textAlign: 'left', background: '#fee2e2', padding: '1rem', borderRadius: '0.5rem', overflow: 'auto', maxHeight: '400px' }}>
                <h3 style={{ color: '#b91c1c', marginBottom: '0.5rem', fontSize: '1rem' }}>{this.state.error.toString()}</h3>
                <pre style={{ fontSize: '0.75rem', color: '#7f1d1d', whiteSpace: 'pre-wrap' }}>
                  {this.state.errorInfo?.componentStack}
                </pre>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
