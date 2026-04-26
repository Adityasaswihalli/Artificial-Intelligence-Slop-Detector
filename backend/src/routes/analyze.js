const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { analysisLimiter } = require('../middleware/rateLimit');
const { analyzeContent } = require('../services/aiAnalysis');
const Analysis = require('../models/Analysis');
const User = require('../models/User');
const { getClient } = require('../config/redis');

router.post('/', authenticate, analysisLimiter, async (req, res) => {
  try {
    const { content, platform = 'other', url, author } = req.body;

    if (!content || content.trim().length < 10) {
      return res.status(400).json({ success: false, message: 'Content too short to analyze' });
    }

    // Check cache
    const crypto = require('crypto');
    const contentHash = crypto.createHash('sha256').update(content).digest('hex');
    
    try {
      const redisClient = getClient();
      const cached = await redisClient.get(`analysis:${contentHash}`);
      if (cached) {
        const cachedResult = JSON.parse(cached);
        // Save to DB
        await Analysis.create({
          userId: req.user._id,
          content: content.substring(0, 5000),
          contentHash,
          platform,
          url,
          author,
          ...cachedResult,
          cached: true,
        });
        
        await User.findByIdAndUpdate(req.user._id, {
          $inc: {
            'stats.totalScanned': 1,
            'stats.slopDetected': cachedResult.scores.overall > 60 ? 1 : 0,
          },
          'stats.lastActive': new Date(),
        });

        return res.json({ success: true, ...cachedResult, cached: true });
      }
    } catch (redisError) {
      console.error('Redis cache error:', redisError);
    }

    const result = await analyzeContent(content, req.user._id);

    // Cache result
    try {
      const redisClient = getClient();
      await redisClient.setEx(
        `analysis:${contentHash}`,
        3600,
        JSON.stringify({
          scores: result.scores,
          classification: result.classification,
          flags: result.flags,
          aiResponse: result.aiResponse,
          processingTime: result.processingTime,
        })
      );
    } catch (e) {}

    // Save to DB
    const analysis = await Analysis.create({
      userId: req.user._id,
      content: content.substring(0, 5000),
      contentHash,
      platform,
      url,
      author,
      scores: result.scores,
      classification: result.classification,
      flags: result.flags,
      aiResponse: result.aiResponse,
      processingTime: result.processingTime,
    });

    await User.findByIdAndUpdate(req.user._id, {
      $inc: {
        'stats.totalScanned': 1,
        'stats.slopDetected': result.scores.overall > 60 ? 1 : 0,
      },
      'stats.lastActive': new Date(),
    });

    res.json({
      success: true,
      analysisId: analysis._id,
      scores: result.scores,
      classification: result.classification,
      flags: result.flags,
      aiResponse: result.aiResponse,
      processingTime: result.processingTime,
      cached: false,
    });
  } catch (error) {
    console.error('Analysis route error:', error);
    res.status(500).json({ success: false, message: 'Analysis failed' });
  }
});

router.get('/history', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20, platform, classification } = req.query;
    const query = { userId: req.user._id };
    if (platform) query.platform = platform;
    if (classification) query.classification = classification;

    const [analyses, total] = await Promise.all([
      Analysis.find(query)
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit))
        .select('-content'),
      Analysis.countDocuments(query),
    ]);

    res.json({
      success: true,
      analyses,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch history' });
  }
});

router.get('/stats', authenticate, async (req, res) => {
  try {
    const userId = req.user._id;
    
    const [totalAnalyses, classificationBreakdown, platformBreakdown, recentTrend] = await Promise.all([
      Analysis.countDocuments({ userId }),
      Analysis.aggregate([
        { $match: { userId } },
        { $group: { _id: '$classification', count: { $sum: 1 } } },
      ]),
      Analysis.aggregate([
        { $match: { userId } },
        { $group: { _id: '$platform', count: { $sum: 1 } } },
      ]),
      Analysis.aggregate([
        { $match: { userId, createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
            avgScore: { $avg: '$scores.overall' },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const avgScore = await Analysis.aggregate([
      { $match: { userId } },
      { $group: { _id: null, avg: { $avg: '$scores.overall' } } },
    ]);

    res.json({
      success: true,
      stats: {
        total: totalAnalyses,
        avgSlopScore: avgScore[0]?.avg?.toFixed(1) || 0,
        classificationBreakdown,
        platformBreakdown,
        recentTrend,
        user: req.user.stats,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch stats' });
  }
});

module.exports = router;
