const { sendEmail } = require('../config/email');

const emailTemplates = {
  otp: (name, otp, purpose) => ({
    subject: `AI Slop Detector - Your ${purpose === 'verify' ? 'Verification' : 'Password Reset'} Code`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Segoe UI', sans-serif; background: #0a0a0f; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; background: #0d1117; border-radius: 16px; overflow: hidden; border: 1px solid #1e2433; }
            .header { background: linear-gradient(135deg, #1a1f2e 0%, #0d1117 100%); padding: 40px 30px; text-align: center; border-bottom: 1px solid #1e2433; }
            .logo { font-size: 28px; font-weight: 800; color: #fff; letter-spacing: -1px; }
            .logo span { color: #ef4444; }
            .body { padding: 40px 30px; }
            .greeting { color: #94a3b8; font-size: 16px; margin-bottom: 24px; }
            .otp-container { background: #1a1f2e; border: 2px solid #ef4444; border-radius: 12px; padding: 30px; text-align: center; margin: 24px 0; }
            .otp-label { color: #94a3b8; font-size: 14px; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 12px; }
            .otp-code { font-size: 48px; font-weight: 900; color: #ef4444; letter-spacing: 16px; font-family: 'Courier New', monospace; }
            .expiry { color: #64748b; font-size: 13px; margin-top: 12px; }
            .warning { background: #1e1a1a; border-left: 4px solid #ef4444; padding: 16px; border-radius: 4px; color: #94a3b8; font-size: 13px; margin-top: 24px; }
            .footer { padding: 24px 30px; background: #070b10; border-top: 1px solid #1e2433; text-align: center; color: #475569; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">AI <span>SLOP</span> DETECTOR</div>
              <p style="color: #64748b; margin: 8px 0 0; font-size: 14px;">Real-time AI Content Analysis</p>
            </div>
            <div class="body">
              <div class="greeting">Hello ${name},</div>
              <p style="color: #94a3b8;">Your ${purpose === 'verify' ? 'email verification' : 'password reset'} code is:</p>
              <div class="otp-container">
                <div class="otp-label">One-Time Password</div>
                <div class="otp-code">${otp}</div>
                <div class="expiry">? Expires in 10 minutes</div>
              </div>
              <div class="warning">
                ?? <strong style="color: #ef4444;">Security Notice:</strong> Never share this code with anyone. AI Slop Detector will never ask for your OTP via phone or chat.
              </div>
            </div>
            <div class="footer">
              <p>© 2024 AI Slop Detector. All rights reserved.</p>
              <p>If you didn't request this, please ignore this email.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  }),

  welcome: (name) => ({
    subject: 'Welcome to AI Slop Detector! ??',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: 'Segoe UI', sans-serif; background: #0a0a0f; margin: 0; }
            .container { max-width: 600px; margin: 0 auto; background: #0d1117; border-radius: 16px; overflow: hidden; border: 1px solid #1e2433; }
            .header { background: linear-gradient(135deg, #ef4444 0%, #7f1d1d 100%); padding: 50px 30px; text-align: center; }
            .logo { font-size: 32px; font-weight: 900; color: #fff; }
            .body { padding: 40px 30px; }
            h2 { color: #f1f5f9; }
            p { color: #94a3b8; line-height: 1.8; }
            .feature { display: flex; align-items: center; margin: 16px 0; }
            .feature-icon { width: 40px; height: 40px; background: #1a1f2e; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 16px; font-size: 20px; }
            .btn { display: inline-block; background: linear-gradient(135deg, #ef4444, #dc2626); color: #fff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 700; margin-top: 24px; }
            .footer { padding: 24px; background: #070b10; text-align: center; color: #475569; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">?? Welcome!</div>
              <p style="color: rgba(255,255,255,0.8); margin-top: 8px;">Your AI content shield is ready</p>
            </div>
            <div class="body">
              <h2>Hello ${name}!</h2>
              <p>You've successfully joined AI Slop Detector. You're now protected from AI-generated slop content across the web.</p>
              <div class="feature"><div class="feature-icon">??</div><div><strong style="color:#f1f5f9;">Real-time Detection</strong><br><span>Instant analysis as you browse</span></div></div>
              <div class="feature"><div class="feature-icon">??</div><div><strong style="color:#f1f5f9;">Detailed Analytics</strong><br><span>Full dashboard with insights</span></div></div>
              <div class="feature"><div class="feature-icon">???</div><div><strong style="color:#f1f5f9;">Multi-platform</strong><br><span>Works on LinkedIn, Twitter & more</span></div></div>
              <a href="${process.env.FRONTEND_URL}/dashboard" class="btn">Open Dashboard ?</a>
            </div>
            <div class="footer">© 2024 AI Slop Detector. All rights reserved.</div>
          </div>
        </body>
      </html>
    `,
  }),
};

const sendOTPEmail = async (email, name, otp, purpose = 'verify') => {
  const template = emailTemplates.otp(name, otp, purpose);
  return await sendEmail({ to: email, ...template });
};

const sendWelcomeEmail = async (email, name) => {
  const template = emailTemplates.welcome(name);
  return await sendEmail({ to: email, ...template });
};

module.exports = { sendOTPEmail, sendWelcomeEmail };
