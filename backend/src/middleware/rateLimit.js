const rateLimit = require('express-rate-limit');

const createLimiter = (windowMs, max, message) => rateLimit({
  windowMs,
  max,
  message: { success: false, message },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = createLimiter(15 * 60 * 1000, 10, 'Too many auth attempts. Try again in 15 minutes.');
const analysisLimiter = createLimiter(60 * 1000, 30, 'Analysis rate limit exceeded. Max 30/minute.');
const generalLimiter = createLimiter(15 * 60 * 1000, 200, 'Too many requests.');
const otpLimiter = createLimiter(5 * 60 * 1000, 3, 'Too many OTP requests. Try again in 5 minutes.');

module.exports = { authLimiter, analysisLimiter, generalLimiter, otpLimiter };
