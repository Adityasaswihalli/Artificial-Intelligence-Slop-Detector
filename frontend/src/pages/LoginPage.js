import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/auth/login', form);
      if (res.data.success) {
        login(res.data.user, {
          accessToken: res.data.accessToken,
          refreshToken: res.data.refreshToken,
          extensionToken: res.data.extensionToken,
        });
        toast.success(`Welcome back, ${res.data.user.name}!`);
        navigate('/dashboard');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed';
      if (err.response?.data?.requiresVerification) {
        toast.error('Please verify your email first');
        navigate('/verify-otp', { state: { email: form.email, purpose: 'verify' } });
      } else {
        toast.error(msg);
      }
    }
    setLoading(false);
  };

  return (
    <div style={authPageStyle}>
      <BackgroundGlow />
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        style={authCardStyle}
      >
        <AuthHeader subtitle="Welcome back" />

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <InputField
            label="Email Address"
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
            icon="✉️"
          />
          <div style={{ position: 'relative' }}>
            <InputField
              label="Password"
              type={showPass ? 'text' : 'password'}
              placeholder="••••••••"
              value={form.password}
              onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
              icon="✉️"
            />
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              style={{ position: 'absolute', right: 14, bottom: 14, background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 14 }}
            >{showPass ? 'Hide' : 'Show'}</button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Link to="/forgot-password" style={{ fontSize: 12, color: '#ef4444', fontWeight: 600 }}>Forgot password?</Link>
          </div>

          <SubmitButton loading={loading} text="Sign In" loadingText="Signing in..." />
        </form>

        <div style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: '#64748b' }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color: '#ef4444', fontWeight: 700 }}>Create one</Link>
        </div>
      </motion.div>
    </div>
  );
}

// Shared components
export const authPageStyle = {
  minHeight: '100vh', background: '#070b10',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: 24, position: 'relative', overflow: 'hidden',
};

export const authCardStyle = {
  width: '100%', maxWidth: 440,
  background: 'rgba(13,17,23,0.95)',
  border: '1px solid rgba(239,68,68,0.2)',
  borderRadius: 24, padding: '40px 36px',
  position: 'relative', zIndex: 1,
  boxShadow: '0 30px 80px rgba(0,0,0,0.6), 0 0 40px rgba(239,68,68,0.06)',
};

export const BackgroundGlow = () => (
  <div style={{
    position: 'fixed', inset: 0, pointerEvents: 'none',
  }}>
    <div style={{
      position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%,-50%)',
      width: 600, height: 600, borderRadius: '50%',
      background: 'radial-gradient(circle, rgba(239,68,68,0.06) 0%, transparent 70%)',
    }} />
  </div>
);

export const AuthHeader = ({ subtitle }) => (
  <div style={{ textAlign: 'center', marginBottom: 36 }}>
    <Link to="/">
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <div style={{
          width: 44, height: 44,
          background: 'linear-gradient(135deg, #ef4444, #7f1d1d)',
          borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, boxShadow: '0 4px 20px rgba(239,68,68,0.4)',
        }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg></div>
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: 15, fontWeight: 900, color: '#f1f5f9', letterSpacing: 0.5 }}>AI SLOP DETECTOR</div>
          <div style={{ fontSize: 9, color: '#ef4444', letterSpacing: 3, fontWeight: 700 }}>BETA</div>
        </div>
      </div>
    </Link>
    <div style={{ fontSize: 13, color: '#64748b' }}>{subtitle}</div>
  </div>
);

export const InputField = ({ label, type, placeholder, value, onChange, icon }) => (
  <div>
    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
      {label}
    </label>
    <div style={{ position: 'relative' }}>
      {icon && <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 14 }}>{icon}</span>}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required
        style={{
          width: '100%', padding: `13px 14px 13px ${icon ? '40px' : '14px'}`,
          background: 'rgba(26,31,46,0.8)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 10, color: '#f1f5f9', fontSize: 14,
          outline: 'none', transition: 'border-color 0.2s',
        }}
        onFocus={e => { e.target.style.borderColor = 'rgba(239,68,68,0.5)'; }}
        onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; }}
      />
    </div>
  </div>
);

export const SubmitButton = ({ loading, text, loadingText }) => (
  <motion.button
    type="submit"
    disabled={loading}
    whileHover={!loading ? { scale: 1.02 } : {}}
    whileTap={!loading ? { scale: 0.98 } : {}}
    style={{
      width: '100%', padding: '15px',
      background: loading ? 'rgba(239,68,68,0.4)' : 'linear-gradient(135deg, #ef4444, #dc2626)',
      border: 'none', borderRadius: 12, color: 'white',
      fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
      boxShadow: loading ? 'none' : '0 8px 25px rgba(239,68,68,0.35)',
      transition: 'all 0.2s', marginTop: 8,
    }}
  >
    {loading ? (
      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <span style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        {loadingText}
      </span>
    ) : text}
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </motion.button>
);


