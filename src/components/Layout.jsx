import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Factory, User as UserIcon, Shield, Menu, X } from 'lucide-react';
import './Layout.css';

const Layout = ({ children, role, sidebarContent }) => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    navigate('/login');
  };

  return (
    <div className="layout-root">
      {/* Navbar */}
      <nav className="layout-navbar glass-card">
        <div className="navbar-brand">
          <img src="/3.png" alt="Logo" className="navbar-logo-img" style={{ height: '32px', objectFit: 'contain' }} />
          <span className={`navbar-role-badge ${role}`}>{role}</span>
        </div>

        <div className="navbar-actions">
          <div className="navbar-user-info">
            {role === 'admin' ? <Shield size={18} /> : <UserIcon size={18} />}
            <span>{role === 'admin' ? 'Administrator' : 'Operator'}</span>
          </div>

          {role === 'admin' && (
            <button
              className="mobile-sidebar-toggle"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle sidebar"
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          )}

          <button className="btn-logout" onClick={handleLogout}>
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </nav>

      {/* Main Container */}
      <div className="layout-body">
        {role === 'admin' && (
          <aside className={`layout-sidebar glass-card ${sidebarOpen ? 'open' : ''}`}>
            {sidebarContent}
          </aside>
        )}

        <main className="layout-main">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
