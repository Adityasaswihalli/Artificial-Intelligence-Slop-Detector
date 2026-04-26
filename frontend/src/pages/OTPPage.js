import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { authPageStyle, authCardStyle, BackgroundGlow, AuthHeader, SubmitButton } from './LoginPage';

export default function OTPPage() {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const inputs = useRef([]);
  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const email = location.state?.email;
  const purpose = location.state?.purpose || 'verify';

  useEffect(() => {
    if (!email) {
      toast.error('Email missing. Please restart the process.');
      navigate('/login');
    }
  }, [email, navigate]);

  useEffect(() => {
    let timer;
    if (resendTimer > 0) {
      timer = setInterval(() => setResendTimer(p => p - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [resendTimer]);

  const handleChange = (e, index) => {
    const value = e.target.value;
    if (isNaN(value)) return;
    
    const newOtp = [...otp];
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);

    if (value && index < 5) {
      inputs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputs.current[index - 1].focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length < 6) return;
    
    setLoading(true);
    try {
      const res = await api.post('/auth/verify-otp', { email, otp: code, purpose });
      if (res.data.success) {
        if (purpose === 'verify') {
          login(res.data.user, {
            accessToken: res.data.accessToken,
            refreshToken: res.data.refreshToken,
            extensionToken: res.data.extensionToken,
          });
          toast.success('Email verified! Welcome aboard.');
          navigate('/dashboard');
        } else {
          toast.success('OTP verified! Reset your password.');
          navigate('/reset-password', { state: { email, otp: code } });
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Verification failed');
    }
    setLoading(false);
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    try {
      await api.post('/auth/resend-otp', { email, purpose });
      toast.success('New code sent to your email');
      setResendTimer(60);
    } catch (e) {
      toast.error('Failed to resend code');
    }
  };

  return (
    <div style={authPageStyle}>
      <BackgroundGlow />
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        style={authCardStyle}
      >
        <AuthHeader subtitle={`Verify your email: ${email}`} />

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={el => inputs.current[i] = el}
                type="text"
                value={digit}
                onChange={e => handleChange(e, i)}
                onKeyDown={e => handleKeyDown(e, i)}
                required
                style={{
                  width: 44, height: 54,
                  background: 'rgba(26,31,46,0.8)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 10, color: '#f1f5f9', fontSize: 20, fontWeight: 700,
                  textAlign: 'center', outline: 'none', transition: 'all 0.2s',
                }}
                onFocus={e => { e.target.style.borderColor = 'rgba(239,68,68,0.5)'; e.target.style.boxShadow = '0 0 15px rgba(239,68,68,0.15)'; }}
                onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.boxShadow = 'none'; }}
              />
            ))}
          </div>

          <SubmitButton loading={loading} text="Verify Code" loadingText="Verifying..." />
          
          <div style={{ textAlign: 'center', fontSize: 13, color: '#64748b' }}>
            Didn't receive code?{' '}
            <button
              type="button"
              onClick={handleResend}
              disabled={resendTimer > 0}
              style={{
                background: 'none', border: 'none', color: resendTimer > 0 ? '#475569' : '#ef4444',
                fontWeight: 700, cursor: resendTimer > 0 ? 'not-allowed' : 'pointer'
              }}
            >
              {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend Now'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
