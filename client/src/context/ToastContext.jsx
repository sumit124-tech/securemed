import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, X, ExternalLink } from 'lucide-react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(({ type = 'success', message, action, duration = 4000 }) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 9);
    const newToast = { id, type, message, action };

    setToasts((prev) => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }

    return id;
  }, [removeToast]);

  const success = useCallback((message, action, duration = 4000) => {
    return addToast({ type: 'success', message, action, duration });
  }, [addToast]);

  const error = useCallback((message, action, duration = 5000) => {
    return addToast({ type: 'error', message, action, duration });
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ addToast, removeToast, success, error }}>
      {children}
      {/* Toast Container fixed in top-right */}
      <div
        style={{
          position: 'fixed',
          top: '1.5rem',
          right: '1.5rem',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          pointerEvents: 'none',
          maxWidth: '420px',
          width: 'calc(100vw - 3rem)'
        }}
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            style={{
              pointerEvents: 'auto',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem',
              padding: '0.875rem 1rem',
              borderRadius: 'var(--radius-lg, 12px)',
              background: '#FFFFFF',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.08)',
              border: `1.5px solid ${t.type === 'error' ? '#FECACA' : '#BBF7D0'}`,
              borderLeft: `5px solid ${t.type === 'error' ? 'var(--danger, #DC2626)' : 'var(--success, #16A34A)'}`,
              animation: 'fadeUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
              color: 'var(--text-main, #0F172A)'
            }}
          >
            {/* Icon */}
            <div style={{ flexShrink: 0, marginTop: '2px' }}>
              {t.type === 'error' ? (
                <AlertCircle size={20} color="#DC2626" />
              ) : (
                <CheckCircle2 size={20} color="#16A34A" />
              )}
            </div>

            {/* Message Body & Optional Action */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  lineHeight: 1.45,
                  wordBreak: 'break-word',
                  color: t.type === 'error' ? '#991B1B' : '#14532D'
                }}
              >
                {t.message}
              </div>

              {t.action && (
                <button
                  type="button"
                  onClick={() => {
                    t.action.onClick?.();
                    removeToast(t.id);
                  }}
                  style={{
                    marginTop: '0.35rem',
                    background: 'transparent',
                    border: 'none',
                    padding: 0,
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    color: t.type === 'error' ? '#DC2626' : '#16A34A',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    textDecoration: 'underline'
                  }}
                >
                  {t.action.label}
                  <ExternalLink size={12} />
                </button>
              )}
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={() => removeToast(t.id)}
              aria-label="Close notification"
              style={{
                flexShrink: 0,
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted, #94A3B8)',
                cursor: 'pointer',
                padding: '2px',
                display: 'inline-flex',
                borderRadius: '4px',
                transition: 'color 0.15s ease'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-main, #0F172A)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted, #94A3B8)')}
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export default ToastContext;
