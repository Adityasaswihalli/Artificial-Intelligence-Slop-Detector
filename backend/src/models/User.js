const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: 2,
    maxlength: 50,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Invalid email'],
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 8,
    select: false,
  },
  avatar: {
    type: String,
    default: null,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  extensionEnabled: {
    type: Boolean,
    default: true,
  },
  extensionToken: {
    type: String,
    default: null,
  },
  plan: {
    type: String,
    enum: ['free', 'pro', 'enterprise'],
    default: 'free',
  },
  settings: {
    autoScan: { type: Boolean, default: true },
    showOverlay: { type: Boolean, default: true },
    minScoreAlert: { type: Number, default: 70 },
    platforms: {
      linkedin: { type: Boolean, default: true },
      twitter: { type: Boolean, default: true },
      facebook: { type: Boolean, default: true },
      reddit: { type: Boolean, default: true },
    },
    notifications: {
      email: { type: Boolean, default: true },
      browser: { type: Boolean, default: true },
    },
  },
  stats: {
    totalScanned: { type: Number, default: 0 },
    slopDetected: { type: Number, default: 0 },
    lastActive: { type: Date, default: Date.now },
  },
  refreshTokens: [String],
  lastLogin: Date,
  loginCount: { type: Number, default: 0 },
}, {
  timestamps: true,
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toSafeObject = function() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.refreshTokens;
  delete obj.extensionToken;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
