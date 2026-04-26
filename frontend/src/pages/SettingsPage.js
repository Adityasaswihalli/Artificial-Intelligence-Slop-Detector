import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Bell, User, Monitor, Key, ExternalLink, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import toast from 'react-hot-toast';
import api from '../utils/api';

export default function SettingsPage() {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState(user?.settings || {
    autoScan: true,
    showOverlay: true,
    minScoreAlert: 70,
    platforms: { linkedin: true, twitter: true, facebook: true, reddit: true },
    notifications: { email: true, browser: true }
  });

  const saveSettings = async (newSettings) => {
    try {
      setSettings(newSettings);
      await api.put('/auth/settings', { settings: newSettings });
      updateUser({ settings: newSettings });
      toast.success('Settings updated');
    } catch (e) {
      toast.error('Failed to save settings');
    }
  };

  const toggleExtension = async () => {
    setLoading(true);
    try {
      const res = await api.post('/auth/toggle-extension');
      updateUser({
        extensionEnabled: res.data.extensionEnabled,
        extensionToken: res.data.extensionToken
      });
      toast.success(`Extension ${res.data.extensionEnabled ? 'enabled' : 'disabled'}`);
    } catch (e) {
      toast.error('Failed to toggle extension');
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#070b10', paddingTop: 90, paddingBottom: 40 }}>
      <Navbar />
      
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 24px' }}>
        <h1 style={{ fontSize: 32, fontWeight: 900, color: '#f1f5f9', marginBottom: 8 }}>Settings</h1>
        <p style={{ color: '#64748b', marginBottom: 32 }}>Manage your account and detection preferences</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Extension Status */}
          <section style={sectionStyle}>
            <div style={sectionHeaderStyle}>
              <div style={iconBoxStyle('#ef4444')}><Shield size={20} /></div>
              <div style={{ flex: 1 }}>
                <h3 style={sectionTitleStyle}>Browser Extension</h3>
                <p style={sectionDescStyle}>Manage your active real-time detection status</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                {user?.extensionEnabled && (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 }}>Access Token</div>
                    <code style={{ fontSize: 12, color: '#ef4444' }}>${user.extensionToken?.substring(0, 8)}...</code>
                  </div>
                )}
                <button 
                  onClick={toggleExtension}
                  disabled={loading}
                  style={user?.extensionEnabled ? toggleBtnOnStyle : toggleBtnOffStyle}
                >
                  <div style={user?.extensionEnabled ? toggleThumbOnStyle : toggleThumbOffStyle} />
                </button>
              </div>
            </div>
          </section>

          {/* Detection Preferences */}
          <section style={sectionStyle}>
            <div style={sectionHeaderStyle}><div style={iconBoxStyle('#f59e0b')}><Monitor size={20} /></div><h3 style={sectionTitleStyle}>Detection Preferences</h3></div>
            <div style={{ marginTop: 24 }}>
              <SettingItem 
                label="Auto-scan feeds" 
                desc="Automatically scan posts on supported social networks"
                checked={settings.autoScan} 
                onChange={v => saveSettings({ ...settings, autoScan: v })} 
              />
              <SettingItem 
                label="Show detection overlay" 
                desc="Display detailed floating analysis on hover"
                checked={settings.showOverlay} 
                onChange={v => saveSettings({ ...settings, showOverlay: v })} 
              />
              <div style={{ padding: '16px 0', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <label style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9' }}>Minimum Alert Score</label>
                  <span style={{ fontSize: 14, color: '#ef4444', fontWeight: 700 }}>{settings.minScoreAlert}%</span>
                </div>
                <input 
                  type="range" min="0" max="100" 
                  value={settings.minScoreAlert} 
                  onChange={e => saveSettings({ ...settings, minScoreAlert: parseInt(e.target.value) })}
                  style={rangeStyle}
                />
                <p style={sectionDescStyle}>Notify when a post's slop score exceeds this value</p>
              </div>
            </div>
          </section>

          {/* Notifications */}
          <section style={sectionStyle}>
            <div style={sectionHeaderStyle}><div style={iconBoxStyle('#10b981')}><Bell size={20} /></div><h3 style={sectionTitleStyle}>Notifications</h3></div>
            <div style={{ marginTop: 24 }}>
              <SettingItem 
                label="Browser Notifications" 
                desc="Get alerts for high slop scores while browsing"
                checked={settings.notifications.browser} 
                onChange={v => saveSettings({ ...settings, notifications: { ...settings.notifications, browser: v } })} 
              />
              <SettingItem 
                label="Weekly Summary Emails" 
                desc="Receive insights about the content you've consumed"
                checked={settings.notifications.email} 
                onChange={v => saveSettings({ ...settings, notifications: { ...settings.notifications, email: v } })} 
              />
            </div>
          </section>

          {/* Account */}
          <section style={sectionStyle}>
            <div style={sectionHeaderStyle}><div style={iconBoxStyle('#3b82f6')}><User size={20} /></div><h3 style={sectionTitleStyle}>Account Information</h3></div>
            <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={inputGroupStyle}>
                <label style={labelStyle}>Display Name</label>
                <div style={readOnlyInputStyle}>{user?.name}</div>
              </div>
              <div style={inputGroupStyle}>
                <label style={labelStyle}>Email Address</label>
                <div style={readOnlyInputStyle}>{user?.email}</div>
              </div>
              <div style={inputGroupStyle}>
                <label style={labelStyle}>Plan Status</label>
                <div style={{ ...readOnlyInputStyle, color: '#ef4444', fontWeight: 700, textTransform: 'uppercase' }}>{user?.plan}</div>
              </div>
              <div style={inputGroupStyle}>
                <label style={labelStyle}>Security</label>
                <button style={btnActionStyle}><Key size={14} /> Update Password</button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

const SettingItem = ({ label, desc, checked, onChange }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9' }}>{label}</div>
      <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{desc}</div>
    </div>
    <button onClick={() => onChange(!checked)} style={checked ? toggleBtnOnStyle : toggleBtnOffStyle}>
      <div style={checked ? toggleThumbOnStyle : toggleThumbOffStyle} />
    </button>
  </div>
);

const sectionStyle = { background: 'rgba(13, 17, 23, 0.8)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: 20, padding: 24 };
const sectionHeaderStyle = { display: 'flex', alignItems: 'center', gap: 16 };
const iconBoxStyle = (color) => ({ width: 44, height: 44, borderRadius: 12, background: `${color}15`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color });
const sectionTitleStyle = { fontSize: 18, fontWeight: 700, color: '#f1f5f9' };
const sectionDescStyle = { fontSize: 12, color: '#64748b', marginTop: 2 };
const toggleBtnOffStyle = { width: 44, height: 24, borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', position: 'relative', cursor: 'pointer', transition: 'all 0.2s', outline: 'none' };
const toggleBtnOnStyle = { ...toggleBtnOffStyle, background: 'linear-gradient(135deg, #10b981, #059669)', border: '1px solid rgba(16,185,129,0.3)' };
const toggleThumbOffStyle = { width: 18, height: 18, borderRadius: '50%', background: '#64748b', position: 'absolute', top: 2, left: 2, transition: 'all 0.2s' };
const toggleThumbOnStyle = { ...toggleThumbOffStyle, background: 'white', left: 22 };
const inputGroupStyle = { display: 'flex', flexDirection: 'column', gap: 8 };
const labelStyle = { fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 };
const readOnlyInputStyle = { padding: '12px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, color: '#94a3b8', fontSize: 14 };
const btnActionStyle = { padding: '12px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, color: '#ef4444', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', transition: 'all 0.2s' };
const rangeStyle = { width: '100%', accentColor: '#ef4444', cursor: 'pointer' };
