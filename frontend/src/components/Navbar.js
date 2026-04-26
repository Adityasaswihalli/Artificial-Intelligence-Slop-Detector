import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    toast.success('Signed out successfully');
    navigate('/');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
      background: 'rgba(7, 11, 16, 0.95)',
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(239, 68, 68, 0.15)',
      padding: '0 24px',
      height: 64,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 36, height: 36,
          background: 'linear-gradient(135deg, #ef4444, #7f1d1d)',
          borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, boxShadow: '0 4px 15px rgba(239,68,68,0.3)',
        }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg></div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 900, color: '#f1f5f9', letterSpacing: 0.5 }}>AI SLOP DETECTOR</div>
          <div style={{ fontSize: 9, color: '#ef4444', letterSpacing: 3, fontWeight: 700 }}>ACTIVE PROTECTION</div>
        </div>
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {user ? (
          <>
            <NavLink to="/dashboard" active={isActive('/dashboard')}>Dashboard</NavLink>
            <NavLink to="/settings" active={isActive('/settings')}>Settings</NavLink>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 8 }}>
              <div style={{
                width: 34, height: 34, borderRadius: '50%',
                background: 'linear-gradient(135deg, #ef4444, #7f1d1d)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 700,
              }}>{user?.name?.charAt(0) || 'U'}</div>
              <button onClick={handleLogout} style={{
                padding: '7px 14px', borderRadius: 8,
                background: 'transparent',
                border: '1px solid rgba(239,68,68,0.3)',
                color: '#ef4444', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                transition: 'all 0.2s',
              }}
                onMouseEnter={e => { e.target.style.background = 'rgba(239,68,68,0.1)'; }}
                onMouseLeave={e => { e.target.style.background = 'transparent'; }}
              >Sign Out</button>
            </div>
          </>
        ) : (
          <>
            <Link to="/login">
              <button style={{
                padding: '8px 18px', borderRadius: 8,
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#94a3b8', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                transition: 'all 0.2s',
              }}>Sign In</button>
            </Link>
            <Link to="/register">
              <button style={{
                padding: '8px 18px', borderRadius: 8,
                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                border: 'none',
                color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                boxShadow: '0 4px 15px rgba(239,68,68,0.3)',
                transition: 'all 0.2s',
              }}>Get Started</button>
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}

const NavLink = ({ to, children, active }) => (
  <Link to={to}>
    <button style={{
      padding: '7px 14px', borderRadius: 8,
      background: active ? 'rgba(239,68,68,0.1)' : 'transparent',
      border: active ? '1px solid rgba(239,68,68,0.3)' : '1px solid transparent',
      color: active ? '#ef4444' : '#94a3b8',
      fontSize: 13, fontWeight: 600, cursor: 'pointer',
      transition: 'all 0.2s',
    }}>{children}</button>
  </Link>
);



