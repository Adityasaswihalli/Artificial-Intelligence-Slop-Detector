import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Navbar from '../components/Navbar';

const GaugeSVG = ({ score = 75, size = 200 }) => {
  const color = score > 80 ? '#ef4444' : score > 60 ? '#f97316' : score > 40 ? '#f59e0b' : '#10b981';
  const angle = (score / 100) * 180 - 90;
  const rad = (angle * Math.PI) / 180;
  const r = size * 0.42;
  const cx = size / 2, cy = size * 0.55;
  const nx = cx + r * Math.cos(rad), ny = cy + r * Math.sin(rad);

  return (
    <svg width={size} height={size * 0.65} viewBox={`0 0 ${size} ${size * 0.65}`}>
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={size * 0.08} strokeLinecap="round" />
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none" stroke={color} strokeWidth={size * 0.08} strokeLinecap="round"
        strokeDasharray={`${(score / 100) * Math.PI * r} ${Math.PI * r}`} opacity="0.9" />
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="white" strokeWidth="3" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="8" fill="white" />
      <circle cx={cx} cy={cy} r="5" fill={color} />
      <text x={cx} y={cy + 42} dominantBaseline="middle" textAnchor="middle" fill={color} fontSize={size * 0.16} fontWeight="900" fontFamily="monospace">{score}%</text>
      <text x={cx} y={cy + 60} dominantBaseline="middle" textAnchor="middle" fill="#64748b" fontSize={size * 0.065} letterSpacing="1">SLOP SCORE</text>
    </svg>
  );
};

export default function LandingPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#070b10' }}>
      <Navbar />

      {/* Hero */}
      <section style={{
        paddingTop: 140, paddingBottom: 100, textAlign: 'center',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Background glow */}
        <div style={{
          position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)',
          width: 800, height: 800, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(239,68,68,0.06) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '6px 16px', borderRadius: 20,
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            marginBottom: 32,
          }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', animation: 'pulse 2s infinite' }} />
            <span style={{ fontSize: 12, color: '#ef4444', fontWeight: 700, letterSpacing: 1 }}>REAL-TIME DETECTION ACTIVE</span>
          </div>

          <h1 style={{
            fontSize: 'clamp(42px, 7vw, 80px)',
            fontWeight: 900, lineHeight: 1.05,
            color: '#f1f5f9', marginBottom: 24,
            letterSpacing: -2,
          }}>
            Detect AI Slop<br />
            <span style={{
              background: 'linear-gradient(135deg, #ef4444, #f97316)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>In Real Time</span>
          </h1>

          <p style={{
            fontSize: 18, color: '#94a3b8', maxWidth: 560, margin: '0 auto 48px',
            lineHeight: 1.7,
          }}>
            The most advanced AI content detector. Works seamlessly across LinkedIn, Twitter, Facebook, and Reddit. Know what's real.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
            <Link to="/register">
              <motion.button
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.97 }}
                style={{
                  padding: '16px 36px',
                  background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                  border: 'none', borderRadius: 12,
                  color: 'white', fontSize: 16, fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 8px 30px rgba(239,68,68,0.4)',
                }}
              >Get Started Free →</motion.button>
            </Link>
            <motion.button
              whileHover={{ scale: 1.03 }}
              style={{
                padding: '16px 36px',
                background: 'rgba(26,31,46,0.8)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 12, color: '#f1f5f9', fontSize: 16, fontWeight: 600,
                cursor: 'pointer',
              }}
              onClick={() => document.getElementById('demo').scrollIntoView({ behavior: 'smooth' })}
            >See Demo</motion.button>
            <a href="brave://extensions" target="_blank" rel="noreferrer" onClick={(e) => { e.preventDefault(); alert('To install in Brave:\n1. Open brave://extensions\n2. Enable Developer mode (top right)\n3. Click \'Load unpacked\'\n4. Select the ai-slop-detector/extension folder.'); }}>
              <motion.button
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.97 }}
                style={{
                  padding: '16px 36px',
                  background: 'linear-gradient(135deg, #fb542b, #ff3000)',
                  border: 'none', borderRadius: 12,
                  color: 'white', fontSize: 16, fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 8px 30px rgba(251,84,43,0.4)',
                }}
              >Install on Brave 🦁</motion.button>
            </a>
          </div>
        </motion.div>
      </section>

      {/* Demo Section */}
      <section id="demo" style={{ padding: '80px 24px', maxWidth: 1100, margin: '0 auto' }}>
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={{
            background: 'rgba(13,17,23,0.9)',
            border: '1px solid rgba(239,68,68,0.25)',
            borderRadius: 24,
            overflow: 'hidden',
            boxShadow: '0 30px 80px rgba(0,0,0,0.6), 0 0 60px rgba(239,68,68,0.08)',
          }}
        >
          {/* Header */}
          <div style={{
            padding: '20px 28px',
            background: 'rgba(26,31,46,0.8)',
            borderBottom: '1px solid rgba(239,68,68,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 40, height: 40,
                background: 'linear-gradient(135deg, #ef4444, #7f1d1d)',
                borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, boxShadow: '0 4px 15px rgba(239,68,68,0.3)',
              }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg></div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, letterSpacing: 1, color: '#f1f5f9', textTransform: 'uppercase' }}>
                  REAL-TIME DETECTOR <span style={{ color: '#ef4444' }}>|</span> Post Analysis
                </div>
                <div style={{ fontSize: 11, color: '#64748b' }}>AI Content Intelligence</div>
              </div>
            </div>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#64748b', fontSize: 18, cursor: 'pointer',
            }}>?</div>
          </div>

          {/* Body */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1.5fr 1fr',
            gap: 20, padding: 28,
          }}>
            {/* Gauge */}
            <div style={{
              background: 'rgba(26,31,46,0.6)', borderRadius: 16, padding: '24px 16px',
              border: '1px solid rgba(255,255,255,0.06)',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
            }}>
              <GaugeSVG score={92} size={180} />
              <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, textAlign: 'center', marginTop: 8 }}>OVERALL SLOP SCORE</div>
              <div style={{ fontSize: 12, color: '#ef4444', fontWeight: 700, marginTop: 4 }}>(High Probability)</div>
            </div>

            {/* Detection Summary */}
            <div style={{
              background: 'rgba(26,31,46,0.6)', borderRadius: 16, padding: 20,
              border: '1px solid rgba(255,255,255,0.06)',
            }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 16 }}>Detection Summary</div>
              {[
                { label: 'Repetitive Structure', severity: 'High', color: '#ef4444' },
                { label: 'Hollow Vocabulary', severity: 'High', color: '#ef4444' },
                { label: 'Lack of Specific Evidence', severity: 'Medium', color: '#f59e0b' },
                { label: 'Sentiment Manipulation', severity: 'Low', color: '#10b981' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: '#cbd5e1' }}>{item.label} </span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: item.color }}>({item.severity})</span>
                </div>
              ))}
              <div style={{ marginTop: 16 }}>
                {[
                  { label: 'Repetitive Structure', val: 88 },
                  { label: 'Hollow Vocabulary', val: 95 },
                  { label: 'Evidence Score', val: 72 },
                ].map((item, i) => (
                  <div key={i} style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#64748b', marginBottom: 3 }}>
                      <span>{item.label}</span>
                      <span style={{ color: '#ef4444' }}>{item.val}%</span>
                    </div>
                    <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2 }}>
                      <div style={{ width: `${item.val}%`, height: '100%', background: '#ef4444', borderRadius: 2 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Originality */}
            <div style={{
              background: 'rgba(26,31,46,0.6)', borderRadius: 16, padding: 20,
              border: '1px solid rgba(255,255,255,0.06)',
              display: 'flex', flexDirection: 'column', gap: 12,
            }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 2 }}>Originality Score</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#ef4444' }}>Low</div>
              <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.6 }}>
                8% originality score<br />(Possible Unoriginal Content)
              </div>
              <div style={{ padding: '12px', background: 'rgba(239,68,68,0.08)', borderRadius: 8, border: '1px solid rgba(239,68,68,0.15)', marginTop: 'auto' }}>
                <div style={{ fontSize: 10, color: '#64748b', marginBottom: 4 }}>AI VERDICT</div>
                <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.5 }}>
                  Highly likely AI-generated with hollow corporate buzzwords and no specific evidence.
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{ padding: '16px 28px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <button style={{
              width: '100%', padding: 16,
              background: 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(127,29,29,0.25))',
              border: '1px solid rgba(239,68,68,0.35)',
              borderRadius: 12, color: '#f1f5f9',
              fontSize: 14, fontWeight: 700, cursor: 'pointer',
              letterSpacing: 0.5, textTransform: 'uppercase',
            }}>View Full Dashboard Analysis →</button>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section style={{ padding: '80px 24px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 60 }}>
          <h2 style={{ fontSize: 42, fontWeight: 900, color: '#f1f5f9', letterSpacing: -1 }}>
            Built for the <span style={{ color: '#ef4444' }}>Modern Web</span>
          </h2>
          <p style={{ color: '#94a3b8', fontSize: 16, marginTop: 16, maxWidth: 500, margin: '16px auto 0' }}>
            Powered by GPT-4 and proprietary detection algorithms
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
          {[
            { icon: '?', title: 'Real-Time Detection', desc: 'Posts are analyzed as you scroll. No manual action needed. Instant badges show slop scores.', color: '#f59e0b' },
            { icon: '?', title: 'GPT-4 Powered', desc: 'Advanced AI analysis detects hollow vocabulary, repetitive structures, and manipulation tactics.', color: '#8b5cf6' },
            { icon: '?', title: 'Multi-Platform', desc: 'Works on LinkedIn, Twitter/X, Facebook, and Reddit. One extension, full coverage.', color: '#3b82f6' },
            { icon: '?', title: 'Full Dashboard', desc: 'Detailed analytics, historical data, platform breakdowns, and trends over time.', color: '#10b981' },
            { icon: '?', title: 'Privacy First', desc: 'Content is analyzed securely. We never store your browsing history or personal data.', color: '#ef4444' },
            { icon: '?', title: 'Precision Scoring', desc: '5-dimensional scoring: structure, vocabulary, evidence, manipulation, and originality.', color: '#f97316' },
          ].map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              style={{
                padding: 28, borderRadius: 16,
                background: 'rgba(13,17,23,0.8)',
                border: '1px solid rgba(255,255,255,0.06)',
                transition: 'all 0.3s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = `${feature.color}33`; e.currentTarget.style.transform = 'translateY(-4px)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.transform = 'none'; }}
            >
              <div style={{ fontSize: 36, marginBottom: 16 }}>{feature.icon}</div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9', marginBottom: 10 }}>{feature.title}</h3>
              <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.7 }}>{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '80px 24px', textAlign: 'center' }}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={{
            maxWidth: 700, margin: '0 auto',
            padding: '60px 40px',
            background: 'linear-gradient(135deg, rgba(239,68,68,0.08), rgba(127,29,29,0.12))',
            border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: 24,
          }}
        >
          <h2 style={{ fontSize: 42, fontWeight: 900, color: '#f1f5f9', marginBottom: 16 }}>
            Start Detecting Today
          </h2>
          <p style={{ color: '#94a3b8', fontSize: 16, marginBottom: 36 }}>
            Join thousands of users protecting themselves from AI slop content. Free forever.
          </p>
          <Link to="/register">
            <motion.button
              whileHover={{ scale: 1.03 }}
              style={{
                padding: '16px 48px',
                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                border: 'none', borderRadius: 12,
                color: 'white', fontSize: 16, fontWeight: 700, cursor: 'pointer',
                boxShadow: '0 8px 30px rgba(239,68,68,0.4)',
              }}
            >Create Free Account →</motion.button>
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer style={{
        padding: '40px 24px', borderTop: '1px solid rgba(255,255,255,0.06)',
        textAlign: 'center', color: '#64748b', fontSize: 13,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{
            width: 28, height: 28, background: 'linear-gradient(135deg, #ef4444, #7f1d1d)',
            borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
          }}>??</div>
          <span style={{ fontWeight: 700, color: '#94a3b8' }}>AI Slop Detector</span>
        </div>
        <p>© 2024 AI Slop Detector. Built for truth on the internet.</p>
      </footer>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}





