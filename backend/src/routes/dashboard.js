const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const Analysis = require('../models/Analysis');
const User = require('../models/User');

router.get('/overview', authenticate, async (req, res) => {
  try {
    const userId = req.user._id;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
      recentAnalyses,
      totalAnalyses,
      slopCount,
      avgScore,
      topFlags,
    ] = await Promise.all([
      Analysis.find({ userId }).sort({ createdAt: -1 }).limit(5).select('-content'),
      Analysis.countDocuments({ userId }),
      Analysis.countDocuments({ userId, 'scores.overall': { $gt: 60 } }),
      Analysis.aggregate([
        { $match: { userId } },
        { $group: { _id: null, avg: { $avg: '$scores.overall' } } },
      ]),
      Analysis.aggregate([
        { $match: { userId } },
        { $unwind: '$flags' },
        { $group: { _id: '$flags.type', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]),
    ]);

    res.json({
      success: true,
      overview: {
        recentAnalyses,
        totalAnalyses,
        slopCount,
        cleanCount: totalAnalyses - slopCount,
        avgSlopScore: avgScore[0]?.avg?.toFixed(1) || 0,
        topFlags,
        user: req.user.toSafeObject(),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Dashboard error' });
  }
});

module.exports = router;
