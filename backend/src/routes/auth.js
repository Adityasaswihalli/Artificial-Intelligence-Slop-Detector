const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');
const { authenticate, generateTokens } = require('../middleware/auth');
const { authLimiter, otpLimiter } = require('../middleware/rateLimit');

// Register (OTP Flow Bypassed)
router.post('/register', authLimiter, async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'All fields required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    const user = await User.create({ name, email: email.toLowerCase(), password, isVerified: true });

    const { accessToken, refreshToken } = generateTokens(user._id);
    user.refreshTokens = [refreshToken];
    user.extensionToken = uuidv4();
    user.lastLogin = new Date();
    user.loginCount = 1;
    await user.save();

    res.status(201).json({
      success: true,
      message: 'Registration successful.',
      user: user.toSafeObject(),
      accessToken,
      refreshToken,
      extensionToken: user.extensionToken,
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, message: 'Registration failed' });
  }
});

// Login (OTP Flow Bypassed)
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (!user.isVerified) {
      user.isVerified = true;
      await user.save();
    }

    const { accessToken, refreshToken } = generateTokens(user._id);
    user.refreshTokens = [...(user.refreshTokens || []).slice(-4), refreshToken];
    
    if (!user.extensionToken) user.extensionToken = uuidv4();
    user.lastLogin = new Date();
    user.loginCount += 1;
    await user.save();

    res.json({
      success: true,
      message: 'Login successful',
      user: user.toSafeObject(),
      accessToken,
      refreshToken,
      extensionToken: user.extensionToken,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Login failed' });
  }
});

// Refresh Token
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(401).json({ success: false, message: 'Refresh token required' });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user || !user.refreshTokens.includes(refreshToken)) {
      return res.status(401).json({ success: false, message: 'Invalid refresh token' });
    }

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user._id);
    user.refreshTokens = user.refreshTokens.filter(t => t !== refreshToken);
    user.refreshTokens.push(newRefreshToken);
    await user.save();

    res.json({ success: true, accessToken, refreshToken: newRefreshToken });
  } catch (error) {
    res.status(401).json({ success: false, message: 'Token refresh failed' });
  }
});

// Get Current User
router.get('/me', authenticate, async (req, res) => {
  res.json({ success: true, user: req.user.toSafeObject() });
});

// Update Settings
router.put('/settings', authenticate, async (req, res) => {
  try {
    const { settings } = req.body;
    const user = await User.findById(req.user._id);
    user.settings = { ...user.settings, ...settings };
    await user.save();
    res.json({ success: true, settings: user.settings });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update settings' });
  }
});

// Logout
router.post('/logout', authenticate, async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const user = await User.findById(req.user._id);
    if (refreshToken) {
      user.refreshTokens = user.refreshTokens.filter(t => t !== refreshToken);
      await user.save();
    }
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Logout failed' });
  }
});

// Toggle Extension
router.post('/toggle-extension', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.extensionEnabled = !user.extensionEnabled;
    if (!user.extensionToken) user.extensionToken = uuidv4();
    await user.save();
    res.json({
      success: true,
      extensionEnabled: user.extensionEnabled,
      extensionToken: user.extensionToken,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Toggle failed' });
  }
});

module.exports = router;

