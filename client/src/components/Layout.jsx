import { useState, useEffect, useRef } from 'react';
import { Outlet, Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { 
  Shield, 
  Menu, 
  X, 
  LogOut, 
  Home, 
  FileText, 
  Users, 
  Bell, 
  User as UserIcon,
  ShieldCheck,
  Activity,
  Check,
  CheckCheck
} from 'lucide-react';

const Layout = () => {
  const { user, profile, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 1024);
  const location = useLocation();
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
        setNotifications(Array.isArray(res.data) ? res.data : []);
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
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setShowDropdown(false);
        setSidebarOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

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
    
    if (user.role === 'PATIENT') {
      navigate('/patient-dashboard');
    } else if (user.role === 'DOCTOR') {
      navigate('/doctor-dashboard');
    } else {
      navigate('/admin-dashboard');
    }
  };

  const safeNotifications = Array.isArray(notifications) ? notifications : [];
  const unreadCount = safeNotifications.filter(n => !n?.isRead).length;

  if (!user) {
    return <Outlet />;
  }

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="app-container">
      {/* Mobile Backdrop */}
      <div className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`} onClick={closeSidebar} />

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'collapsed'}`}>
        <div className="sidebar-header" style={{ padding: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: 'center' }}>
          <div style={{ background: 'linear-gradient(135deg, #2563EB, #0EA5A4)', padding: '0.4rem', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={20} color="white" />
          </div>
          <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.02em', fontFamily: 'var(--font-heading)' }}>SecureMed</span>
        </div>
        
        <nav className="sidebar-nav">
          <NavLink 
            to={user.role === 'DOCTOR' ? '/doctor-dashboard' : user.role === 'ADMIN' ? '/admin-dashboard' : '/patient-dashboard'} 
            className={({isActive}) => isActive ? "sidebar-link active" : "sidebar-link"}
            end
            onClick={() => window.innerWidth <= 1024 && closeSidebar()}
            title="Dashboard"
          >
            <Home size={20} />
            <span>Dashboard</span>
          </NavLink>

          {user.role === 'DOCTOR' && (
            <NavLink to="/my-patients" className={({isActive}) => isActive ? "sidebar-link active" : "sidebar-link"} onClick={() => window.innerWidth <= 1024 && closeSidebar()} title="My Patients">
              <Users size={20} />
              <span>My Patients</span>
            </NavLink>
          )}

          {user.role === 'PATIENT' && (
            <>
              <NavLink to="/medical-records" className={({isActive}) => isActive ? "sidebar-link active" : "sidebar-link"} onClick={() => window.innerWidth <= 1024 && closeSidebar()} title="Medical Records">
                <FileText size={20} />
                <span>Medical Records</span>
              </NavLink>
              
              <NavLink to="/access-requests" className={({isActive}) => isActive ? "sidebar-link active" : "sidebar-link"} onClick={() => window.innerWidth <= 1024 && closeSidebar()} title="Access Requests">
                <ShieldCheck size={20} />
                <span>Access Requests</span>
              </NavLink>
            </>
          )}

          <NavLink to="/audit-trail" className={({isActive}) => isActive ? "sidebar-link active" : "sidebar-link"} onClick={() => window.innerWidth <= 1024 && closeSidebar()} title="Audit Trail">
            <Activity size={20} />
            <span>Audit Trail</span>
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <button onClick={() => { logout(); navigate('/login'); closeSidebar(); }} className="sidebar-link" style={{width: '100%', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', padding: '0.75rem 0'}}>
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="main-wrapper">
        {/* Topbar */}
        <header className="topbar">
          <button type="button" aria-expanded={sidebarOpen} className="btn-outline" onClick={toggleSidebar} style={{border: 'none', display: 'flex', alignItems: 'center'}}>
            <Menu size={24} />
          </button>
          
          <div className="topbar-right">
            
            <div className="notification-container" ref={dropdownRef} style={{ position: 'relative' }}>
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
                  marginTop: '1rem',
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
                  
                  {safeNotifications.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                      No notifications yet.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {safeNotifications.slice(0, 10).map(n => (
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

            <div className="user-profile" style={{ marginLeft: '1rem' }}>
              <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  {user.role === 'DOCTOR' ? 'Dr. ' : ''}{profile?.firstName} {profile?.lastName}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  {user.role}
                </span>
              </div>
              <div className="avatar">
                {profile?.firstName?.charAt(0)}{profile?.lastName?.charAt(0)}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
