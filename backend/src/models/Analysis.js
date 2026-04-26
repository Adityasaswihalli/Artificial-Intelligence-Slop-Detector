const mongoose = require('mongoose');

const analysisSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  contentHash: {
    type: String,
    index: true,
  },
  platform: {
    type: String,
    enum: ['linkedin', 'twitter', 'facebook', 'reddit', 'other'],
    default: 'other',
  },
  url: String,
  author: String,
  scores: {
    overall: { type: Number, min: 0, max: 100 },
    repetitiveStructure: { type: Number, min: 0, max: 100 },
    hollowVocabulary: { type: Number, min: 0, max: 100 },
    lackOfEvidence: { type: Number, min: 0, max: 100 },
    sentimentManipulation: { type: Number, min: 0, max: 100 },
    originality: { type: Number, min: 0, max: 100 },
  },
  classification: {
    type: String,
    enum: ['clean', 'low', 'medium', 'high', 'critical'],
  },
  flags: [{
    type: { type: String },
    severity: { type: String, enum: ['low', 'medium', 'high'] },
    description: String,
    examples: [String],
  }],
  aiResponse: {
    summary: String,
    details: String,
    suggestions: [String],
  },
  processingTime: Number,
  cached: { type: Boolean, default: false },
}, {
  timestamps: true,
});

analysisSchema.index({ userId: 1, createdAt: -1 });
analysisSchema.index({ contentHash: 1 });

module.exports = mongoose.model('Analysis', analysisSchema);
