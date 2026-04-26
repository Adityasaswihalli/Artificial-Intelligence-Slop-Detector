import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { authPageStyle, authCardStyle, BackgroundGlow, AuthHeader, InputField, SubmitButton } from './LoginPage';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { email });
      if (res.data.success) {
        toast.success('Password reset code sent!');
        navigate('/verify-otp', { state: { email, purpose: 'reset' } });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send reset code');
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
        <AuthHeader subtitle="Reset your password" />

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <p style={{ fontSize: 13, color: '#64748b', textAlign: 'center', padding: '0 20px' }}>
            Enter your email and we'll send you a 6-digit code to reset your password.
          </p>
          <InputField label="Email Address" type="email" placeholder="you@example.com" value={email}
            onChange={e => setEmail(e.target.value)} icon="✉️" />
          <SubmitButton loading={loading} text="Send Reset Code" loadingText="Sending..." />
        </form>

        <div style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: '#64748b' }}>
          Remember your password?{' '}
          <Link to="/login" style={{ color: '#ef4444', fontWeight: 700 }}>Back to Sign In</Link>
        </div>
      </motion.div>
    </div>
  );
}

