const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendEmail = async ({ to, subject, html }) => {
  const mailOptions = {
    from: `"AI Slop Detector" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  };

  try {
    if (process.env.EMAIL_PASS === 'your_app_password' || !process.env.EMAIL_PASS) {
      console.log('--- MOCK EMAIL SENT ---');
      console.log(`To: ${to}`);
      console.log(`Subject: ${subject}`);
      // Extract OTP from HTML if possible for easy copying
      const otpMatch = html.match(/<div [^>]*letter-spacing:[^>]*>(\d{6})<\/div>/) || html.match(/>(\d{6})</);
      if (otpMatch) {
         console.log(`🔥 MOCK OTP CODE: ${otpMatch[1]} 🔥`);
      } else {
         console.log(`Mock HTML: \n${html}\n`);
      }
      console.log('-----------------------');
      return { success: true, messageId: 'mock-id' };
    }

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email error:', error);
    throw error;
  }
};

module.exports = { sendEmail };
