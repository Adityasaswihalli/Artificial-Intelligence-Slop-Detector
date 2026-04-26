import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { authPageStyle, authCardStyle, BackgroundGlow, AuthHeader, InputField, SubmitButton } from './LoginPage';

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const getStrength = (pass) => {
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    return score;
  };

  const strengthColors = ['#ef4444', '#f97316', '#f59e0b', '#10b981'];
  const strengthLabels = ['Weak', 'Fair', 'Good', 'Strong'];
  const strength = getStrength(form.password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/auth/register', {
        name: form.name, email: form.email, password: form.password,
      });
      if (res.data.success) {
        toast.success('Account created successfully!');
        login(res.data.accessToken, res.data.user);
        navigate('/dashboard');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    }
    setLoading(false);
  };

  return (
    <div style={authPageStyle}>
      <BackgroundGlow />
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        style={{ ...authCardStyle, maxWidth: 460 }}
      >
        <AuthHeader subtitle="Create your account" />

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <InputField label="Full Name" type="text" placeholder="John Doe" value={form.name}
            onChange={e => setForm(p => ({ ...p, name: e.target.value }))} icon="👤" />
          <InputField label="Email Address" type="email" placeholder="you@example.com" value={form.email}
            onChange={e => setForm(p => ({ ...p, email: e.target.value }))} icon="👤" />

          <div style={{ position: 'relative' }}>
            <InputField label="Password" type={showPass ? 'text' : 'password'} placeholder="••••••••" value={form.password}
              onChange={e => setForm(p => ({ ...p, password: e.target.value }))} icon="👤" />
            <button type="button" onClick={() => setShowPass(!showPass)}
              style={{ position: 'absolute', right: 14, bottom: 14, background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 14 }}>
              {showPass ? 'Hide' : 'Show'}
            </button>
          </div>

          {form.password && (
            <div style={{ padding: '0 4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#64748b', marginBottom: 4 }}>
                <span>Strength: <span style={{ color: strengthColors[Math.max(0, strength - 1)], fontWeight: 700 }}>{strengthLabels[Math.max(0, strength - 1)]}</span></span>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                {[1, 2, 3, 4].map(step => (
                  <div key={step} style={{ flex: 1, height: 3, borderRadius: 2, background: strength >= step ? strengthColors[strength - 1] : 'rgba(255,255,255,0.05)' }} />
                ))}
              </div>
            </div>
          )}

          <InputField label="Confirm Password" type="password" placeholder="••••••••" value={form.confirmPassword}
            onChange={e => setForm(p => ({ ...p, confirmPassword: e.target.value }))} icon="🛡️" />

          <SubmitButton loading={loading} text="Create Account" loadingText="Creating account..." />
        </form>

        <div style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: '#64748b' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: '#ef4444', fontWeight: 700 }}>Sign In</Link>
        </div>
      </motion.div>
    </div>
  );
}


