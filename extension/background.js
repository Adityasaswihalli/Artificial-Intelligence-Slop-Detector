// ============================================
// AI SLOP DETECTOR - Background Service Worker
// ============================================

const API_BASE = 'http://localhost:5000/api';

// ---- State ----
let authToken = null;
let extensionToken = null;
let isEnabled = true;
let userSettings = {
  autoScan: true,
  showOverlay: true,
  minScoreAlert: 70,
  platforms: {
    linkedin: true,
    twitter: true,
    facebook: true,
    reddit: true,
  }
};

// ============================================
// INIT — Load stored data on startup
// ============================================
async function init() {
  try {
    const data = await chrome.storage.local.get([
      'authToken',
      'extensionToken',
      'isEnabled',
      'settings',
      'user'
    ]);

    authToken       = data.authToken       || null;
    extensionToken  = data.extensionToken  || null;
    isEnabled       = data.isEnabled !== false; // default true
    userSettings    = { ...userSettings, ...(data.settings || {}) };

    console.log('[SlopDetector] Background initialized', {
      hasAuth: !!authToken,
      isEnabled
    });
  } catch (err) {
    console.error('[SlopDetector] Init error:', err);
  }
}

init();

// ============================================
// MESSAGE HANDLER
// ============================================
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Must return true for async response
  handleMessage(message, sender)
    .then(sendResponse)
    .catch(err => {
      console.error('[SlopDetector] Message error:', err);
      sendResponse({ success: false, error: err.message });
    });
  return true;
});

async function handleMessage(message, sender) {
  switch (message.type) {

    // ---- Analyze content from content script ----
    case 'ANALYZE_CONTENT': {
      if (!isEnabled) {
        return { success: false, error: 'Extension is disabled' };
      }

      try {
        const result = await analyzeContent(
          message.content,
          message.platform,
          message.url
        );
        return { success: true, data: result };
      } catch (err) {
        console.error('[SlopDetector] Analysis failed:', err);
        return { success: false, error: err.message };
      }
    }

    // ---- Get auth status ----
    case 'GET_AUTH_STATUS': {
      return {
        isAuthenticated: !!(authToken || extensionToken),
        isEnabled,
        extensionToken,
        settings: userSettings
      };
    }

    // ---- Set auth data (called from popup after login) ----
    case 'SET_AUTH': {
      authToken      = message.authToken;
      extensionToken = message.extensionToken;

      await chrome.storage.local.set({
        authToken:      message.authToken,
        extensionToken: message.extensionToken,
        user:           message.user
      });

      // Tell all tabs the extension is now active
      broadcastToAllTabs({ type: 'EXTENSION_TOGGLED', isEnabled: true });

      return { success: true };
    }

    // ---- Toggle extension on/off ----
    case 'TOGGLE_EXTENSION': {
      isEnabled = !isEnabled;
      await chrome.storage.local.set({ isEnabled });
      broadcastToAllTabs({ type: 'EXTENSION_TOGGLED', isEnabled });
      return { success: true, isEnabled };
    }

    // ---- Update settings ----
    case 'UPDATE_SETTINGS': {
      userSettings = { ...userSettings, ...message.settings };
      await chrome.storage.local.set({ settings: userSettings });
      broadcastToAllTabs({ type: 'SETTINGS_UPDATED', settings: userSettings });
      return { success: true };
    }

    // ---- Get settings ----
    case 'GET_SETTINGS': {
      return { success: true, settings: userSettings };
    }

    // ---- Open dashboard ----
    case 'OPEN_DASHBOARD': {
      await chrome.tabs.create({ url: 'http://localhost:3000/dashboard' });
      return { success: true };
    }

    // ---- Logout ----
    case 'LOGOUT': {
      authToken      = null;
      extensionToken = null;
      await chrome.storage.local.clear();
      broadcastToAllTabs({ type: 'EXTENSION_TOGGLED', isEnabled: false });
      return { success: true };
    }

    default:
      return { success: false, error: 'Unknown message type' };
  }
}

// ============================================
// CORE ANALYSIS FUNCTION
// ============================================
async function analyzeContent(content, platform, url) {
  // Build headers
  const headers = { 'Content-Type': 'application/json' };
  
  // If not authenticated, use local analysis immediately
  if (!authToken && !extensionToken) {
    console.log('[SlopDetector] No auth tokens, using local analysis');
    return localAnalyze(content, platform);
  }

  if (authToken)      headers['Authorization']    = `Bearer ${authToken}`;
  if (extensionToken) headers['X-Extension-Token'] = extensionToken;

  let response;
  try {
    response = await fetch(`${API_BASE}/analyze`, {
      method:  'POST',
      headers,
      body: JSON.stringify({ content, platform, url }),
    });
  } catch (networkErr) {
    // Backend unreachable — use local analysis
    console.warn('[SlopDetector] Backend unreachable, using local analysis');
    return localAnalyze(content, platform);
  }

  // Handle 401 — try refresh once
  if (response.status === 401) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      return analyzeContent(content, platform, url); // retry
    }
    throw new Error('NOT_AUTHENTICATED');
  }

  if (!response.ok) {
    throw new Error(`API error ${response.status}`);
  }

  const data = await response.json();

  // Show notification for high slop
  if (data.scores?.overall >= userSettings.minScoreAlert) {
    showNotification(data.scores.overall, platform);
  }

  // Increment scan count
  const stored = await chrome.storage.local.get(['scanCount']);
  await chrome.storage.local.set({ scanCount: (stored.scanCount || 0) + 1 });

  return data;
}

// ============================================
// LOCAL FALLBACK ANALYSIS (no backend needed)
// ============================================
function localAnalyze(text, platform) {
  const lower = text.toLowerCase();
  const words = text.split(/\s+/);

  // Hollow buzzword dictionary
  const buzzwords = [
    'synergy','leverage','paradigm','disruptive','innovative','scalable',
    'ecosystem','holistic','thought leader','game.changer','cutting.edge',
    'deep dive','move the needle','value proposition','transformative',
    'burgeoning','delve','testament','commitment to','catalyze','empower',
    'unprecedented','revolutionary','ideate','pivot','bandwidth',
    'circle back','low.hanging fruit','boil the ocean','best practices',
    'core competencies','strategic alignment','unlock potential',
    'drive engagement','foster','at the end of the day','it.s a',
    'in the tapestry','digital paradigm','ai.driven','going forward',
    'touch base','streamline','robust','key takeaway','actionable insights',
    'in conclusion','in summary','it is important to note','as an ai',
    'certainly','absolutely','of course','i hope this','happy to help',
  ];

  let buzzCount = 0;
  buzzwords.forEach(b => {
    const re = new RegExp(b.replace('.', '\\s?'), 'gi');
    if (re.test(lower)) buzzCount++;
  });

  // Emoji count
  const emojiCount = (text.match(/[\u{1F300}-\u{1F9FF}]/gu) || []).length;

  // List structure
  const bulletCount   = (text.match(/^[\s]*[•\-\*]\s/gm) || []).length;
  const numberedCount = (text.match(/^[\s]*\d+[\.\)]\s/gm) || []).length;

  // Sentence variety
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 3);
  const avgLen = words.length / Math.max(sentences.length, 1);

  // Manipulative openers
  const manipPhrases = [
    /you won.t believe/i, /this changed everything/i,
    /here.s the thing/i, /the truth is/i, /hot take/i,
    /unpopular opinion/i, /let me be honest/i,
    /\d+\s+things\s+/i, /the secret to/i,
  ];
  let manipCount = 0;
  manipPhrases.forEach(re => { if (re.test(text)) manipCount++; });

  // AI signature phrases
  const aiPhrases = [
    /in conclusion/i, /in summary/i, /to summarize/i,
    /it is (important|worth|crucial) to/i, /furthermore/i,
    /moreover/i, /in addition to/i, /it should be noted/i,
    /plays? a (crucial|vital|key|important) role/i,
    /in (today.s|the modern) (digital|world|era)/i,
    /with (the advent|the rise|widespread adoption)/i,
  ];
  let aiCount = 0;
  aiPhrases.forEach(re => { if (re.test(text)) aiCount++; });

  // --- Score computation ---
  const hollowVocab      = Math.min(100, Math.round((buzzCount / Math.max(words.length / 30, 1)) * 100));
  const repetitiveStruct = Math.min(100, Math.round((emojiCount * 4) + (bulletCount * 5) + (numberedCount * 6)));
  const sentimentManip   = Math.min(100, manipCount * 18);
  const aiSignature      = Math.min(100, aiCount * 15);

  // Weighted overall
  const overall = Math.min(100, Math.round(
    (hollowVocab * 0.30) +
    (repetitiveStruct * 0.20) +
    (sentimentManip * 0.20) +
    (aiSignature * 0.30)
  ));

  const originality = Math.max(0, 100 - overall);

  const classification =
    overall >= 80 ? 'critical' :
    overall >= 60 ? 'high'     :
    overall >= 40 ? 'medium'   :
    overall >= 20 ? 'low'      : 'clean';

  // Build flags
  const flags = [];
  if (hollowVocab > 40) flags.push({
    type: 'Hollow Vocabulary',
    severity: hollowVocab > 70 ? 'high' : 'medium',
    description: `Detected ${buzzCount} hollow buzzword(s)`
  });
  if (repetitiveStruct > 30) flags.push({
    type: 'Repetitive Structure',
    severity: repetitiveStruct > 60 ? 'high' : 'medium',
    description: 'Excessive list formatting or emoji usage'
  });
  if (sentimentManip > 20) flags.push({
    type: 'Sentiment Manipulation',
    severity: sentimentManip > 50 ? 'high' : 'medium',
    description: 'Clickbait or manipulative framing detected'
  });
  if (aiSignature > 20) flags.push({
    type: 'AI Writing Patterns',
    severity: aiSignature > 50 ? 'high' : 'medium',
    description: 'Common AI writing signatures detected'
  });

  return {
    success: true,
    scores: {
      overall,
      repetitiveStructure: repetitiveStruct,
      hollowVocabulary:    hollowVocab,
      lackOfEvidence:      Math.min(100, aiSignature + 10),
      sentimentManipulation: sentimentManip,
      originality,
    },
    classification,
    flags,
    aiResponse: {
      summary: overall > 60
        ? `This content shows strong indicators of AI generation (${overall}% slop score). Multiple AI writing patterns detected.`
        : overall > 30
        ? `This content shows some AI-like patterns (${overall}% slop score) but may be human-written.`
        : `This content appears mostly authentic (${overall}% slop score).`,
      details: `Local analysis detected ${buzzCount} buzzwords, ${aiCount} AI signature phrases, ${emojiCount} emojis.`,
      suggestions: [
        'Add specific personal examples or data',
        'Use varied sentence structures',
        'Include unique perspectives or insights',
      ]
    },
    processingTime: 0,
    cached: false,
    localAnalysis: true,
  };
}

// ============================================
// REFRESH TOKEN
// ============================================
async function tryRefreshToken() {
  const stored = await chrome.storage.local.get(['refreshToken']);
  if (!stored.refreshToken) return false;

  try {
    const resp = await fetch(`${API_BASE}/auth/refresh`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ refreshToken: stored.refreshToken }),
    });

    if (!resp.ok) return false;

    const data = await resp.json();
    authToken = data.accessToken;
    await chrome.storage.local.set({
      authToken:    data.accessToken,
      refreshToken: data.refreshToken,
    });
    return true;
  } catch {
    return false;
  }
}

// ============================================
// NOTIFICATION
// ============================================
function showNotification(score, platform) {
  chrome.notifications.create({
    type:     'basic',
    iconUrl:  'icons/icon48.png',
    title:    '⚠️ High Slop Detected!',
    message:  `${score}% slop score on ${platform || 'this page'}`,
    priority: 2,
  });
}

// ============================================
// BROADCAST TO ALL TABS
// ============================================
async function broadcastToAllTabs(message) {
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    if (tab.id) {
      chrome.tabs.sendMessage(tab.id, message).catch(() => {});
    }
  }
}

// ============================================
// STORAGE CHANGE LISTENER
// ============================================
chrome.storage.onChanged.addListener((changes) => {
  if (changes.isEnabled)       isEnabled       = changes.isEnabled.newValue;
  if (changes.authToken)       authToken       = changes.authToken.newValue;
  if (changes.extensionToken)  extensionToken  = changes.extensionToken.newValue;
  if (changes.settings)        userSettings    = { ...userSettings, ...changes.settings.newValue };
});

// ============================================
// TAB UPDATE LISTENER — re-inject on navigation
// ============================================
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && isEnabled) {
    chrome.tabs.sendMessage(tabId, { type: 'TAB_UPDATED' }).catch(() => {});
  }
});
