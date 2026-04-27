// ============================================================
// AI SLOP DETECTOR — Background Service Worker v2.0
// Works on ALL pages including ChatGPT
// ============================================================

const API_BASE = 'http://localhost:5000/api';

let authToken      = null;
let extensionToken = null;
let isEnabled      = true;
let userSettings   = {
  autoScan:      true,
  showOverlay:   true,
  minScoreAlert: 60,
  scanAllSites:  true,
};

// ── Init ─────────────────────────────────────────────────────
async function init() {
  const data = await chrome.storage.local.get([
    'authToken','extensionToken','isEnabled','settings','scanCount'
  ]);
  authToken      = data.authToken      || null;
  extensionToken = data.extensionToken || null;
  isEnabled      = data.isEnabled !== false;
  if (data.settings) userSettings = { ...userSettings, ...data.settings };
  console.log('[BG] Init complete. enabled=', isEnabled);
}
init();

// ── Message Router ────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  handleMsg(msg, sender).then(sendResponse).catch(e => {
    console.error('[BG] Error:', e);
    sendResponse({ success: false, error: e.message });
  });
  return true; // async
});

async function handleMsg(msg, sender) {
  switch (msg.type) {

    case 'ANALYZE_TEXT': {
      if (!isEnabled) return { success: false, error: 'DISABLED' };
      const result = await runAnalysis(msg.text, msg.url);
      const s = await chrome.storage.local.get(['scanCount']);
      const newCount = (s.scanCount || 0) + 1;
      await chrome.storage.local.set({ scanCount: newCount });
      chrome.runtime.sendMessage({ type: 'SCAN_COUNT_UPDATE', count: newCount }).catch(() => {});
      return { success: true, result };
    }

    case 'FORCE_SCAN_TAB': {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) return { success: false, error: 'No active tab' };
      await chrome.tabs.sendMessage(tab.id, { type: 'FORCE_SCAN' });
      return { success: true };
    }

    case 'GET_STATE': {
      const stored = await chrome.storage.local.get(['scanCount','user']);
      return {
        isEnabled,
        isAuthenticated: !!(authToken || extensionToken),
        scanCount: stored.scanCount || 0,
        user:      stored.user || null,
        settings:  userSettings,
      };
    }

    case 'SET_ENABLED': {
      isEnabled = msg.value;
      await chrome.storage.local.set({ isEnabled });
      const tabs = await chrome.tabs.query({});
      for (const t of tabs) {
        chrome.tabs.sendMessage(t.id, { type: 'SET_ENABLED', value: isEnabled }).catch(() => {});
      }
      return { success: true, isEnabled };
    }

    case 'SET_AUTH': {
      authToken      = msg.authToken;
      extensionToken = msg.extensionToken;
      await chrome.storage.local.set({
        authToken:      msg.authToken,
        extensionToken: msg.extensionToken,
        user:           msg.user,
      });
      return { success: true };
    }

    case 'LOGOUT': {
      authToken = null; extensionToken = null;
      await chrome.storage.local.clear();
      return { success: true };
    }

    case 'UPDATE_SETTINGS': {
      userSettings = { ...userSettings, ...msg.settings };
      await chrome.storage.local.set({ settings: userSettings });
      return { success: true };
    }

    case 'OPEN_URL': {
      await chrome.tabs.create({ url: msg.url });
      return { success: true };
    }

    default:
      return { success: false, error: 'Unknown: ' + msg.type };
  }
}

// ── Core Analysis Engine ──────────────────────────────────────
async function runAnalysis(text, url) {
  if (!text || text.trim().length < 30) {
    throw new Error('Text too short');
  }

  if (authToken || extensionToken) {
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (authToken)      headers['Authorization']     = `Bearer ${authToken}`;
      if (extensionToken) headers['X-Extension-Token'] = extensionToken;

      const resp = await fetch(`${API_BASE}/analyze`, {
        method:  'POST',
        headers,
        body: JSON.stringify({ content: text.substring(0, 3000), url }),
        signal: AbortSignal.timeout(8000),
      });

      if (resp.ok) {
        const data = await resp.json();
        if (data.success) return { ...data, source: 'backend' };
      }
    } catch (e) {
      console.warn('[BG] Backend unavailable, using local engine:', e.message);
    }
  }

  return localEngine(text);
}

// ── LOCAL ANALYSIS ENGINE ─────────────────────────────────────
function localEngine(text) {
  const t = text.trim();
  const lower = t.toLowerCase();

  const words = t.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  // ===== 1. STRONG BUZZWORD DETECTION =====
  const buzzwords = [
    'synergy','leverage','paradigm','disruptive','innovation',
    'scalable','ecosystem','holistic','transformative',
    'strategic alignment','next-gen','future-proof',
    'hyper-personalized','cloud-native','unlock potential',
    'drive engagement','stakeholders','resilience',
    'optimization','framework','architecture',
    'seamless','convergence','vertical expansion',
    'cognitive automation','immersive analytics',
    'exponential growth','cross-functional',
    'always-on','impact','value creation'
  ];

  let buzzScore = 0;
  let buzzHits = 0;

  buzzwords.forEach(b => {
    if (lower.includes(b)) {
      buzzHits++;
      buzzScore += 8; // stronger penalty per buzzword
    }
  });

  buzzScore = Math.min(100, buzzScore);

  // ===== 2. ABSTRACT NOUN STACKING =====
  const abstractWords = [
    'alignment','transformation','innovation','optimization',
    'integration','orchestration','collaboration',
    'engagement','visibility','strategy','architecture',
    'capability','infrastructure','ecosystem','impact'
  ];

  let abstractCount = 0;
  abstractWords.forEach(w => {
    const regex = new RegExp('\\b' + w + '\\b','gi');
    const matches = t.match(regex);
    if (matches) abstractCount += matches.length;
  });

  let abstractScore = Math.min(100, abstractCount * 6);

  // ===== 3. LACK OF SPECIFICITY =====
  const hasNumbers = /\d/.test(t);
  const hasExamples = /(for example|e\.g\.|such as|case study|we did|i did|last year)/i.test(t);
  const hasConcreteNouns = /(company|team|project|client|research|data|experiment|result)/i.test(t);

  let specificityPenalty = 0;
  if (!hasNumbers) specificityPenalty += 15;
  if (!hasExamples) specificityPenalty += 15;
  if (!hasConcreteNouns) specificityPenalty += 15;

  // ===== 4. AI-LIKE RHETORICAL PATTERNS =====
  const aiPatterns = [
    /in a rapidly evolving/i,
    /through strategic/i,
    /the intersection of/i,
    /by harnessing/i,
    /our approach/i,
    /empowering stakeholders/i,
    /unlock exponential/i
  ];

  let aiScore = 0;
  aiPatterns.forEach(r => {
    if (r.test(t)) aiScore += 15;
  });

  aiScore = Math.min(100, aiScore);

  // ===== 5. REPETITIVE CORPORATE TONE =====
  let corporateTone = 0;
  if (buzzHits >= 3) corporateTone += 25;
  if (abstractCount >= 4) corporateTone += 25;

  corporateTone = Math.min(100, corporateTone);

  // ===== FINAL COMBINATION =====
  const overall = Math.min(100, Math.round(
    buzzScore * 0.30 +
    abstractScore * 0.20 +
    specificityPenalty * 0.25 +
    aiScore * 0.15 +
    corporateTone * 0.10
  ));

  const originality = Math.max(0, 100 - overall);

  const classification =
    overall >= 80 ? 'critical' :
    overall >= 60 ? 'high' :
    overall >= 40 ? 'medium' :
    overall >= 20 ? 'low' :
    'clean';

  return {
    success: true,
    source: 'local-v2',
    scores: {
      overall,
      hollowVocabulary: buzzScore,
      repetitiveStructure: corporateTone,
      lackOfEvidence: specificityPenalty,
      sentimentManipulation: aiScore,
      originality
    },
    classification,
    flags: [
      ...(buzzHits > 2 ? [{
        type: 'Buzzword Overload',
        severity: 'high',
        description: `${buzzHits} corporate buzzwords detected`
      }] : []),
      ...(abstractCount > 3 ? [{
        type: 'Abstract Noun Stacking',
        severity: 'high',
        description: `${abstractCount} abstract nouns detected`
      }] : []),
      ...(specificityPenalty >= 30 ? [{
        type: 'Lack of Specific Evidence',
        severity: 'high',
        description: 'No numbers, examples, or concrete references'
      }] : [])
    ],
    aiResponse: {
      summary: overall >= 60
        ? `High AI-slop probability (${overall}%). Text relies heavily on abstract buzzwords and lacks specificity.`
        : `Low slop probability (${overall}%).`
    }
  };
}

// ── Storage sync ──────────────────────────────────────────────
chrome.storage.onChanged.addListener(changes => {
  if (changes.isEnabled)      isEnabled      = changes.isEnabled.newValue;
  if (changes.authToken)      authToken      = changes.authToken.newValue;
  if (changes.extensionToken) extensionToken = changes.extensionToken.newValue;
});
