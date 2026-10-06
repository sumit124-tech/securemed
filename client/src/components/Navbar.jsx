import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, LogOut, User, Bell, Check, CheckCheck } from 'lucide-react';
import axios from 'axios';

const Navbar = () => {
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();
  
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    
    const fetchNotifications = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('/api/notifications', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setNotifications(res.data);
      } catch (err) {
        console.error('Failed to fetch notifications', err);
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // 30s poll

    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleMarkAsRead = async (id, e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/notifications/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(notifications.map(n => n._id === id ? { ...n, isRead: true } : n));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllAsRead = async (e) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.put('/api/notifications/read-all', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const handleNotificationClick = (notification) => {
    if (!notification.isRead) {
      handleMarkAsRead(notification._id);
    }
    setShowDropdown(false);
    
    // Navigate based on type
    if (user.role === 'PATIENT') {
      navigate('/patient-dashboard');
    } else {
      navigate('/doctor-dashboard');
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/" className="logo">
          <Shield className="logo-icon" />
          <span>SecureMed</span>
        </Link>
      </div>
      <div className="navbar-menu">
        {user ? (
          <>
            <div className="notification-container" ref={dropdownRef} style={{ position: 'relative', marginRight: '1rem' }}>
              <button 
                onClick={() => setShowDropdown(!showDropdown)} 
                style={{ background: 'none', border: 'none', cursor: 'pointer', position: 'relative', display: 'flex', alignItems: 'center' }}
              >
                <Bell size={20} color="var(--text-main)" />
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '-5px',
                    right: '-5px',
                    background: 'var(--danger)',
                    color: 'white',
                    borderRadius: '50%',
                    width: '18px',
                    height: '18px',
                    fontSize: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold'
                  }}>
                    {unreadCount}
                  </span>
                )}
              </button>

              {showDropdown && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '0.5rem',
                  background: 'white',
                  border: '1px solid var(--border-light)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  width: '320px',
                  maxHeight: '400px',
                  overflowY: 'auto',
                  zIndex: 1000,
                  display: 'flex',
                  flexDirection: 'column'
                }}>
                  <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-main)' }}>
                    <h4 style={{ margin: 0, fontSize: '0.875rem' }}>Notifications</h4>
                    {unreadCount > 0 && (
                      <button onClick={handleMarkAllAsRead} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <CheckCheck size={14} /> Mark all read
                      </button>
                    )}
                  </div>
                  
                  {notifications.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                      No notifications yet.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {notifications.slice(0, 10).map(n => (
                        <div 
                          key={n._id} 
                          onClick={() => handleNotificationClick(n)}
                          style={{ 
                            padding: '0.75rem 1rem', 
                            borderBottom: '1px solid var(--border-light)', 
                            background: n.isRead ? 'white' : 'var(--primary-light)',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.25rem'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <span style={{ fontSize: '0.875rem', color: 'var(--text-main)', fontWeight: n.isRead ? 400 : 500 }}>
                              {n.message}
                            </span>
                            {!n.isRead && (
                              <button onClick={(e) => handleMarkAsRead(n._id, e)} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: '0.25rem' }} title="Mark as read">
                                <Check size={14} />
                              </button>
                            )}
                          </div>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            {new Date(n.createdAt).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="user-info">
              <User className="user-icon" />
              <span className="user-name">
                {profile?.firstName} {profile?.lastName}
              </span>
              <span className="user-role badge">{user.role}</span>
            </div>
            <button onClick={handleLogout} className="btn-logout">
              <LogOut size={18} />
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="btn-link">Login</Link>
            <Link to="/register" className="btn-primary">Register</Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
