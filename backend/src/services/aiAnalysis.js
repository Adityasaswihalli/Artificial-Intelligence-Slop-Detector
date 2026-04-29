const OpenAI = require('openai');
const crypto = require('crypto');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SLOP_INDICATORS = {
  hollowPhrases: [
    'in the tapestry', 'digital paradigm', 'synergy', 'leverage', 'disruptive',
    'game-changing', 'thought leader', 'holistic approach', 'cutting-edge',
    'paradigm shift', 'move the needle', 'circle back', 'deep dive',
    'value proposition', 'scalable solutions', 'innovative ecosystem',
    'catalyze', 'empower', 'transformative', 'unprecedented', 'revolutionary',
    'burgeoning', 'delve deep', 'it\'s a testament', 'commitment to',
    'at the end of the day', 'low-hanging fruit', 'boil the ocean',
    'think outside the box', 'best practices', 'core competencies',
    'strategic alignment', 'bandwidth', 'pivot', 'ideate', 'socialize',
    'unlock potential', 'drive engagement', 'foster collaboration',
  ],
  structurePatterns: [
    /^([\u{1F300}-\u{1F9FF}]).+/gmu,
    /^\d+\.\s+.+(\n\d+\.\s+.+){3,}/gm,
    /(Here's the thing|The truth is|Let me be honest|Hot take:|Unpopular opinion:)/gi,
    /(\n---\n|\n\*\*\*\n)/g,
  ],
  manipulativePhrases: [
    'you won\'t believe', 'this changed everything', 'game changer',
    'everyone needs to know', 'share this before', 'the secret to',
    'what nobody tells you', 'hidden truth', 'they don\'t want you to know',
  ],
};

const calculateLocalScores = (text) => {
  const words = text.split(/\s+/);
  const sentences = text.split(/[.!?]+/);

  let hollowCount = 0;
  const lowerText = text.toLowerCase();
  SLOP_INDICATORS.hollowPhrases.forEach(phrase => {
    if (lowerText.includes(phrase.toLowerCase())) hollowCount++;
  });

  let structureScore = 0;
  const emojiCount = (text.match(/[\u{1F300}-\u{1F9FF}]/gu) || []).length;
  const bulletPoints = (text.match(/^[•\-\*]\s/gm) || []).length;
  const numberedPoints = (text.match(/^\d+\.\s/gm) || []).length;
  structureScore = Math.min(100, (emojiCount * 5) + (bulletPoints * 3) + (numberedPoints * 4));

  let manipulationScore = 0;
  SLOP_INDICATORS.manipulativePhrases.forEach(phrase => {
    if (lowerText.includes(phrase.toLowerCase())) manipulationScore += 20;
  });
  manipulationScore = Math.min(100, manipulationScore);

  const avgSentenceLength = words.length / Math.max(sentences.length, 1);
  const sentenceVariation = Math.abs(avgSentenceLength - 15);
  const repetitivenessScore = Math.min(100, (hollowCount * 15) + (sentenceVariation > 10 ? 20 : 0));

  const hollowVocabScore = Math.min(100, (hollowCount / Math.max(words.length / 50, 1)) * 100);

  return {
    hollowVocabulary: Math.round(hollowVocabScore),
    repetitiveStructure: Math.round(repetitivenessScore),
    sentimentManipulation: Math.round(manipulationScore),
    structureScore: Math.round(structureScore),
  };
};

const analyzeWithAI = async (text) => {
  // First attempt to use the local Claude-Level Python Ensemble Model
  try {
    // Dynamically import node-fetch if needed, or use global fetch (Node 18+)
    const response = await fetch('http://localhost:8000/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    
    if (response.ok) {
      const data = await response.json();
      // Map the Python model response back to the format expected by the rest of the backend
      return {
        overallSlopScore: data.slop_score,
        originality: data.scores.originality,
        lackOfEvidence: data.scores.lackOfEvidence,
        classification: data.classification,
        flags: data.flags.map(f => ({
          type: f.type,
          severity: f.severity,
          description: f.description,
          examples: []
        })),
        summary: `Analyzed by Ensemble Model. AI Probability: ${(data.ai_probability * 100).toFixed(1)}%`,
        details: data.explanation,
        suggestions: ['Review flagged sections for authenticity.', 'Consider rephrasing overly uniform or predictable text.']
      };
    } else {
      console.warn('Local Python model returned error status:', response.status);
    }
  } catch (error) {
    console.warn('Local Python model not reachable, falling back to OpenAI...', error.message);
  }

  // Fallback to OpenAI if local Python model is down
  const prompt = `You are an expert at detecting AI-generated or low-quality "slop" content. Analyze the following text and provide a detailed assessment.

Text to analyze:
"""
${text.substring(0, 2000)}
"""

Provide a JSON response with exactly this structure:
{
  "overallSlopScore": <0-100 number>,
  "originality": <0-100 number, higher = more original>,
  "lackOfEvidence": <0-100 number>,
  "classification": "<clean|low|medium|high|critical>",
  "flags": [
    {
      "type": "<flag type>",
      "severity": "<low|medium|high>",
      "description": "<description>",
      "examples": ["<example from text>"]
    }
  ],
  "summary": "<2-3 sentence summary>",
  "details": "<detailed analysis paragraph>",
  "suggestions": ["<improvement suggestion>"]
}

Classification guide:
- clean: 0-20% slop score
- low: 21-40%
- medium: 41-60%
- high: 61-80%
- critical: 81-100%

Analyze for: repetitive structure, hollow buzzwords, lack of specific evidence, emotional manipulation, AI writing patterns, originality.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.3,
    max_tokens: 1000,
  });

  return JSON.parse(response.choices[0].message.content);
};

const analyzeContent = async (text, userId) => {
  const startTime = Date.now();
  const contentHash = crypto.createHash('sha256').update(text).digest('hex');

  try {
    const localScores = calculateLocalScores(text);
    let aiResult;

    try {
      aiResult = await analyzeWithAI(text);
    } catch (aiError) {
      console.error('OpenAI and Local fallback error, using local analysis:', aiError.message);
      const localOverall = Math.round(
        (localScores.hollowVocabulary + localScores.repetitiveStructure + localScores.sentimentManipulation) / 3
      );
      aiResult = {
        overallSlopScore: localOverall,
        originality: 100 - localOverall,
        lackOfEvidence: localScores.structureScore,
        classification: localOverall > 80 ? 'critical' : localOverall > 60 ? 'high' : localOverall > 40 ? 'medium' : localOverall > 20 ? 'low' : 'clean',
        flags: [
          localScores.hollowVocabulary > 50 && {
            type: 'Hollow Vocabulary',
            severity: 'high',
            description: 'Contains many hollow buzzwords and jargon',
            examples: [],
          },
          localScores.repetitiveStructure > 50 && {
            type: 'Repetitive Structure',
            severity: 'high',
            description: 'Shows repetitive sentence patterns',
            examples: [],
          },
        ].filter(Boolean),
        summary: 'Content analyzed using local detection. May contain AI-generated patterns.',
        details: 'Local analysis detected potential slop indicators based on vocabulary and structure.',
        suggestions: ['Add specific examples and data', 'Use more varied sentence structures', 'Include personal insights'],
      };
    }

    const finalScores = {
      overall: aiResult.overallSlopScore,
      repetitiveStructure: Math.round((localScores.repetitiveStructure + (aiResult.overallSlopScore * 0.5)) / 1.5),
      hollowVocabulary: Math.round((localScores.hollowVocabulary + (aiResult.overallSlopScore * 0.5)) / 1.5),
      lackOfEvidence: aiResult.lackOfEvidence || localScores.structureScore,
      sentimentManipulation: localScores.sentimentManipulation,
      originality: aiResult.originality || (100 - aiResult.overallSlopScore),
    };

    return {
      contentHash,
      scores: finalScores,
      classification: aiResult.classification,
      flags: aiResult.flags || [],
      aiResponse: {
        summary: aiResult.summary,
        details: aiResult.details,
        suggestions: aiResult.suggestions || [],
      },
      processingTime: Date.now() - startTime,
    };
  } catch (error) {
    console.error('Analysis error:', error);
    throw error;
  }
};

module.exports = { analyzeContent };

