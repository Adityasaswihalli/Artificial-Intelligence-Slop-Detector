const { getClient } = require('../config/redis');
const crypto = require('crypto');

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const storeOTP = async (email, otp, purpose = 'verify') => {
  const client = getClient();
  const key = `otp:${purpose}:${email}`;
  const attemptsKey = `otp:attempts:${email}`;
  
  await client.setEx(key, parseInt(process.env.OTP_EXPIRY || 600), otp);
  await client.setEx(attemptsKey, 900, '0');
  
  return otp;
};

const verifyOTP = async (email, otp, purpose = 'verify') => {
  const client = getClient();
  const key = `otp:${purpose}:${email}`;
  const attemptsKey = `otp:attempts:${email}`;
  
  const attempts = await client.get(attemptsKey);
  if (attempts && parseInt(attempts) >= 5) {
    return { valid: false, error: 'Too many attempts. Please request a new OTP.' };
  }
  
  const storedOTP = await client.get(key);
  
  if (!storedOTP) {
    return { valid: false, error: 'OTP expired or not found' };
  }
  
  if (storedOTP !== otp) {
    await client.incr(attemptsKey);
    return { valid: false, error: 'Invalid OTP' };
  }
  
  await client.del(key);
  await client.del(attemptsKey);
  
  return { valid: true };
};

const deleteOTP = async (email, purpose = 'verify') => {
  const client = getClient();
  await client.del(`otp:${purpose}:${email}`);
};

module.exports = { generateOTP, storeOTP, verifyOTP, deleteOTP };
