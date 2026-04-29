// ============================================================
// AI Slop Detector — Serverless Analysis API
// Vercel Serverless Function
// ============================================================

const SLOP_INDICATORS = {
  hollowPhrases: [
    'in the tapestry', 'digital paradigm', 'synergy', 'leverage', 'disruptive',
    'game-changing', 'thought leader', 'holistic approach', 'cutting-edge',
    'paradigm shift', 'move the needle', 'circle back', 'deep dive',
    'value proposition', 'scalable solutions', 'innovative ecosystem',
    'catalyze', 'empower', 'transformative', 'unprecedented', 'revolutionary',
    'burgeoning', 'delve deep', "it's a testament", 'commitment to',
    'at the end of the day', 'low-hanging fruit', 'boil the ocean',
    'think outside the box', 'best practices', 'core competencies',
    'strategic alignment', 'bandwidth', 'pivot', 'ideate', 'socialize',
    'unlock potential', 'drive engagement', 'foster collaboration',
    'seamless', 'frictionless', 'next-gen', 'hyper-personalized',
    'data-driven', 'future-proof', 'cloud-native', 'end-to-end',
    'cross-functional', 'stakeholder', 'deliverable', 'robust', 'streamline',
    'optimize', 'optimization', 'agile', 'mission-critical', 'bleeding edge',
    'thought leadership', 'reinvent', 'reimagine', 'reimagining',
    'redefine', 'digital transformation', 'ai-driven', 'ai-powered',
    'framework', 'architecture', 'ecosystem', 'vector', 'pathway',
    'orchestrate', 'orchestration', 'decentralized', 'resilience', 'agility',
    'exponential', 'exponential growth', 'immersive', 'cognitive', 'adaptive',
    'growth hacking', 'hyperconnected', 'friction-free', 'north star',
  ],
  manipulativePhrases: [
    "you won't believe", 'this changed everything', 'game changer',
    'everyone needs to know', 'share this before', 'the secret to',
    'what nobody tells you', 'hidden truth', "they don't want you to know",
    'thrilled to announce', 'proud to share', 'humbled', 'blessed',
    'excited to share', 'this will change everything',
  ],
};

// ── AI Phrase Patterns (regex-based) ─────────────────────────
const AI_PATTERNS = [
  { re: /\bin conclusion\b/gi,                          w: 20 },
  { re: /\bin summary\b/gi,                             w: 18 },
  { re: /\bit is (important|crucial|worth|essential) to\b/gi, w: 14 },
  { re: /\bfurthermore\b/gi,                            w: 10 },
  { re: /\bmoreover\b/gi,                               w: 10 },
  { re: /\badditionally\b/gi,                           w: 6  },
  { re: /\bas an ai\b/gi,                               w: 50 },
  { re: /\bi am an ai\b/gi,                             w: 50 },
  { re: /\bai language model\b/gi,                      w: 50 },
  { re: /\bi hope this helps\b/gi,                      w: 25 },
  { re: /\bhappy to help\b/gi,                          w: 20 },
  { re: /\bcertainly[,!]?\s/gi,                         w: 15 },
  { re: /\bgreat question\b/gi,                         w: 20 },
  { re: /\bdelve (deep|deeper|into)\b/gi,               w: 20 },
  { re: /\bin today'?s? (digital|rapidly|world|landscape|era)\b/gi, w: 14 },
  { re: /\bplays? a (crucial|vital|key|important|pivotal) role\b/gi, w: 14 },
  { re: /\bthe (intersection|convergence|nexus) of\b/gi, w: 12 },
  { re: /\bunlock(ing)? (the |full |true )?potential\b/gi, w: 14 },
  { re: /\bas we navigate (the|these|this)\b/gi,        w: 12 },
  { re: /\brapidly evolving\b/gi,                       w: 12 },
  { re: /\bseamless(ly)? integrat/gi,                   w: 12 },
  { re: /\btransformative (power|impact|potential|journey)\b/gi, w: 14 },
  { re: /\bin a rapidly evolving\b/gi,                  w: 14 },
  { re: /\bthrough strategic\b/gi,                      w: 12 },
  { re: /\bby harnessing\b/gi,                          w: 14 },
  { re: /\bempowering (stakeholders|teams|organizations|individuals)\b/gi, w: 12 },
  { re: /\b(thrilled|excited|humbled|blessed|proud) to\b/gi, w: 12 },
];

function analyzeText(text) {
  const t = text.trim();
  const lower = t.toLowerCase();
  const words = t.split(/\s+/).filter(Boolean);
  const wordCount = Math.max(words.length, 1);
  const sentences = t.split(/[.!?]+/).filter(s => s.trim().length > 5);
  const sentCount = Math.max(sentences.length, 1);

  // ═══════════════════════════════════════════════════════════
  // 1. BUZZWORD DETECTION (0-100)
  // ═══════════════════════════════════════════════════════════
  let buzzHits = 0;
  let buzzUnique = 0;
  SLOP_INDICATORS.hollowPhrases.forEach(phrase => {
    if (lower.includes(phrase.toLowerCase())) {
      buzzHits += (lower.split(phrase.toLowerCase()).length - 1);
      buzzUnique++;
    }
  });
  const buzzDensity = buzzHits / wordCount;
  const buzzScore = Math.min(100, Math.round(buzzDensity * 800 + buzzUnique * 6));

  // ═══════════════════════════════════════════════════════════
  // 2. AI PHRASE PATTERNS (0-100)
  // ═══════════════════════════════════════════════════════════
  let aiWeight = 0;
  let aiPatternHits = 0;
  AI_PATTERNS.forEach(({ re, w }) => {
    const matches = t.match(re);
    if (matches) {
      aiPatternHits++;
      aiWeight += w * Math.min(matches.length, 5);
    }
  });
  const aiScore = Math.min(100, Math.round(aiWeight * 0.8));

  // ═══════════════════════════════════════════════════════════
  // 3. SENTENCE UNIFORMITY (0-100)
  // ═══════════════════════════════════════════════════════════
  const sentLengths = sentences.map(s => s.trim().split(/\s+/).length);
  const avgSentLen = sentLengths.reduce((a, b) => a + b, 0) / sentCount;
  let sentStd = 0;
  if (sentLengths.length > 1) {
    sentStd = Math.sqrt(sentLengths.reduce((sum, l) => sum + (l - avgSentLen) ** 2, 0) / sentLengths.length);
  }
  const uniformity = Math.max(0, 1 - (sentStd / Math.max(avgSentLen, 1)));
  const uniformScore = Math.min(100, Math.round(uniformity * 100));

  // ═══════════════════════════════════════════════════════════
  // 4. VOCABULARY DIVERSITY — Type-Token Ratio (0-100)
  // ═══════════════════════════════════════════════════════════
  const lowerWords = words.map(w => w.toLowerCase().replace(/[^a-z]/g, '')).filter(Boolean);
  const uniqueWords = new Set(lowerWords);
  const ttr = uniqueWords.size / Math.max(lowerWords.length, 1);
  // Low TTR = repetitive = more AI-like.  Human TTR is typically > 0.6
  const ttrPenalty = Math.min(100, Math.round(Math.max(0, (0.7 - ttr)) * 250));

  // ═══════════════════════════════════════════════════════════
  // 5. LACK OF SPECIFICITY (0-100)
  // ═══════════════════════════════════════════════════════════
  const hasNumbers = /\d/.test(t);
  const hasExamples = /(for example|e\.g\.|such as|case study|we did|i did|last year|yesterday|this morning)/i.test(t);
  const hasConcreteNouns = /(company|team|project|client|research|data|experiment|result|customer|product|revenue|user)/i.test(t);
  const hasPersonalVoice = /(I think|I believe|in my experience|honestly|frankly|personally)/i.test(t);
  let specPenalty = 0;
  if (!hasNumbers) specPenalty += 15;
  if (!hasExamples) specPenalty += 15;
  if (!hasConcreteNouns) specPenalty += 12;
  if (!hasPersonalVoice) specPenalty += 8;
  specPenalty = Math.min(100, specPenalty);

  // ═══════════════════════════════════════════════════════════
  // 6. MANIPULATION SCORE (0-100)
  // ═══════════════════════════════════════════════════════════
  let manipScore = 0;
  SLOP_INDICATORS.manipulativePhrases.forEach(phrase => {
    if (lower.includes(phrase.toLowerCase())) manipScore += 20;
  });
  manipScore = Math.min(100, manipScore);

  // ═══════════════════════════════════════════════════════════
  // 7. STRUCTURAL SIGNALS
  // ═══════════════════════════════════════════════════════════
  const lines = t.split('\n');
  const bulletLines   = lines.filter(l => /^\s*[•\-\*►▸]\s/.test(l)).length;
  const numberedLines = lines.filter(l => /^\s*\d+[.\)]\s/.test(l)).length;
  const emojiCount    = (t.match(/[\u{1F300}-\u{1F9FF}]/gu) || []).length;
  const hashtagCount  = (t.match(/#\w+/g) || []).length;
  const structScore   = Math.min(100, (emojiCount * 5) + (bulletLines * 3) + (numberedLines * 4) + (hashtagCount * 2));

  // ═══════════════════════════════════════════════════════════
  // FINAL ENSEMBLE SCORE
  // ═══════════════════════════════════════════════════════════
  const overall = Math.min(100, Math.round(
    buzzScore      * 0.25 +
    aiScore        * 0.25 +
    uniformScore   * 0.10 +
    ttrPenalty     * 0.10 +
    specPenalty    * 0.15 +
    manipScore     * 0.10 +
    structScore    * 0.05
  ));

  const originality = Math.max(0, 100 - overall);

  const classification =
    overall >= 80 ? 'critical' :
    overall >= 60 ? 'high' :
    overall >= 40 ? 'medium' :
    overall >= 20 ? 'low' :
    'clean';

  // Build flags
  const flags = [];
  if (buzzScore > 30) {
    flags.push({
      type: 'Hollow Vocabulary',
      severity: buzzScore > 60 ? 'high' : 'medium',
      description: `${buzzUnique} AI buzzwords detected (density: ${(buzzDensity * 100).toFixed(1)}%)`,
    });
  }
  if (aiScore > 25) {
    flags.push({
      type: 'AI Writing Patterns',
      severity: aiScore > 60 ? 'high' : 'medium',
      description: `${aiPatternHits} AI phrase patterns found`,
    });
  }
  if (uniformScore > 65) {
    flags.push({
      type: 'Uniform Sentence Structure',
      severity: uniformScore > 80 ? 'high' : 'medium',
      description: 'Suspiciously consistent sentence lengths',
    });
  }
  if (specPenalty >= 35) {
    flags.push({
      type: 'Lack of Specific Evidence',
      severity: 'high',
      description: 'No numbers, examples, or concrete references',
    });
  }
  if (manipScore >= 20) {
    flags.push({
      type: 'Emotional Manipulation',
      severity: manipScore >= 60 ? 'high' : 'medium',
      description: 'Uses attention-grabbing or engagement-bait phrases',
    });
  }

  // Summary
  let summary;
  if (overall >= 80) {
    summary = `Critical AI slop detected (${overall}%). Text is dominated by hollow buzzwords and formulaic AI patterns.`;
  } else if (overall >= 60) {
    summary = `High AI slop probability (${overall}%). Text shows significant AI-generated characteristics.`;
  } else if (overall >= 40) {
    summary = `Moderate slop indicators (${overall}%). Text may be AI-assisted or uses common AI phrasing.`;
  } else if (overall >= 20) {
    summary = `Low slop probability (${overall}%). Minor AI indicators detected, likely human-written.`;
  } else {
    summary = `Clean content (${overall}%). Text appears genuinely human-written.`;
  }

  return {
    success: true,
    source: 'serverless-v2',
    scores: {
      overall,
      hollowVocabulary: buzzScore,
      repetitiveStructure: uniformScore,
      lackOfEvidence: specPenalty,
      sentimentManipulation: manipScore,
      aiPatterns: aiScore,
      originality,
    },
    classification,
    flags: flags.sort((a, b) => {
      const sev = { high: 3, medium: 2, low: 1 };
      return (sev[b.severity] || 0) - (sev[a.severity] || 0);
    }),
    aiResponse: {
      summary,
      details: `Buzzword density: ${(buzzDensity * 100).toFixed(1)}% | AI patterns: ${aiPatternHits} | Sentence uniformity: ${uniformScore}% | Vocabulary diversity (TTR): ${(ttr * 100).toFixed(0)}%`,
      suggestions: [
        overall > 40 ? 'Replace abstract buzzwords with specific, concrete language' : null,
        specPenalty > 30 ? 'Add specific data, numbers, or real examples' : null,
        uniformScore > 60 ? 'Vary your sentence length and structure' : null,
        manipScore > 20 ? 'Remove engagement-bait phrases for authenticity' : null,
        aiScore > 30 ? 'Rewrite formulaic phrases in your own voice' : null,
      ].filter(Boolean),
    },
    processingTime: 0,
  };
}

// ── Vercel Serverless Handler ─────────────────────────────────
module.exports = async (req, res) => {
  // CORS headers for extension access
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Extension-Token');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { content, text } = req.body || {};
    const inputText = content || text;

    if (!inputText || inputText.trim().length < 10) {
      return res.status(400).json({ success: false, message: 'Content too short to analyze' });
    }

    const startTime = Date.now();
    const result = analyzeText(inputText.substring(0, 5000));
    result.processingTime = Date.now() - startTime;

    return res.status(200).json(result);
  } catch (error) {
    console.error('Analysis error:', error);
    return res.status(500).json({ success: false, message: 'Analysis failed' });
  }
};
