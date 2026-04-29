module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  res.status(200).json({
    success: true,
    status: 'operational',
    service: 'AI Slop Detector API',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    engine: 'serverless-v2',
  });
};
