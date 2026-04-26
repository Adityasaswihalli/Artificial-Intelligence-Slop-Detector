// ============================================
// AI SLOP DETECTOR - Content Script
// ============================================

(function () {
  'use strict';

  // Prevent double injection
  if (window.__slopDetectorInjected) return;
  window.__slopDetectorInjected = true;

  // ---- State ----
  let isEnabled     = true;
  let isAuth        = false;
  let settings      = { autoScan: true, showOverlay: true, minScoreAlert: 70 };
  let observer      = null;
  let activeOverlay = null;
  let scanTimeout   = null;

  // Track processed posts to avoid duplicate analysis
  const processedPosts   = new WeakSet();
  const processingPosts  = new WeakSet();

  // ============================================
  // PLATFORM DETECTION
  // ============================================
  const PLATFORMS = {
    linkedin: {
      match: () => location.hostname.includes('linkedin.com'),
      postSelectors: [
        '.feed-shared-update-v2',
        '.occludable-update',
        '[data-urn*="activity"]',
        '.ember-view.occludable-update',
      ],
      contentSelectors: [
        '.feed-shared-text .break-words',
        '.feed-shared-text',
        '.attributed-text-segment-list__content',
        '.feed-shared-update-v2__description',
        '.update-components-text',
        '[data-test-id="main-feed-activity-card"] .break-words',
      ],
    },
    twitter: {
      match: () => location.hostname.includes('twitter.com') || location.hostname.includes('x.com'),
      postSelectors: [
        'article[data-testid="tweet"]',
        '[data-testid="tweet"]',
      ],
      contentSelectors: [
        '[data-testid="tweetText"]',
        '.r-1qd0xha',
      ],
    },
    reddit: {
      match: () => location.hostname.includes('reddit.com'),
      postSelectors: [
        '[data-testid="post-container"]',
        'shreddit-post',
        '.Post',
        '[data-click-id="body"]',
      ],
      contentSelectors: [
        '[data-click-id="text"] .md',
        '[data-click-id="text"]',
        '.RichTextJSON-root',
        'shreddit-post [slot="text-body"]',
        '.usertext-body .md',
      ],
    },
    facebook: {
      match: () => location.hostname.includes('facebook.com'),
      postSelectors: [
        '[data-pagelet*="FeedUnit"]',
        '.kvgmc6g5.cxmmr5t8',
        '[role="article"]',
      ],
      contentSelectors: [
        '[data-ad-comet-preview="message"]',
        '.xdj266r',
        '[dir="auto"] span',
      ],
    },
  };

  // Detect current platform
  const platform = Object.entries(PLATFORMS).find(([, cfg]) => cfg.match())?.[0] || null;
  const platformCfg = platform ? PLATFORMS[platform] : null;

  // ============================================
  // INIT
  // ============================================
  async function init() {
    try {
      const status = await sendMessage({ type: 'GET_AUTH_STATUS' });
      isEnabled = status.isEnabled !== false;
      isAuth    = status.isAuthenticated;
      settings  = { ...settings, ...(status.settings || {}) };

      console.log(`[SlopDetector] Content init — platform: ${platform || 'unknown'}, enabled: ${isEnabled}, auth: ${isAuth}`);

      injectStyles();

      if (isEnabled) {
        // ---- AUTH SYNC (Only on our dashboard) ----
        if (location.hostname === 'localhost' && location.port === '3000') {
          syncAuthFromWebsite();
        }

        // Delay first scan to let page render
        setTimeout(() => {
          scanAll();
          startObserver();
        }, 1500);
      }
    } catch (err) {
      console.warn('[SlopDetector] Init failed, running in local mode');
      // Still work in local mode without backend
      isAuth = true;
      injectStyles();
      setTimeout(() => {
        scanAll();
        startObserver();
      }, 1500);
    }
  }

  // ============================================
  // AUTH SYNC — Get tokens from our dashboard
  // ============================================
  function syncAuthFromWebsite() {
    const accessToken = localStorage.getItem('accessToken');
    const extToken    = localStorage.getItem('extensionToken');
    
    if (accessToken || extToken) {
      console.log('[SlopDetector] Detected auth on dashboard, syncing with extension');
      sendMessage({
        type:           'SET_AUTH',
        authToken:      accessToken,
        extensionToken: extToken
      }).catch(err => console.error('[SlopDetector] Sync failed:', err));
    }
  }

  // ============================================
  // STYLES INJECTION
  // ============================================
  function injectStyles() {
    if (document.getElementById('slop-detector-styles')) return;

    const style = document.createElement('style');
    style.id = 'slop-detector-styles';
    style.textContent = `
      /* ===== BADGE ===== */
      .slop-badge {
        position: absolute !important;
        top: 10px !important;
        right: 10px !important;
        z-index: 9999 !important;
        display: inline-flex !important;
        align-items: center !important;
        gap: 5px !important;
        padding: 4px 10px !important;
        border-radius: 20px !important;
        font-size: 10px !important;
        font-weight: 800 !important;
        font-family: 'Segoe UI', system-ui, sans-serif !important;
        cursor: pointer !important;
        user-select: none !important;
        letter-spacing: 0.8px !important;
        text-transform: uppercase !important;
        transition: all 0.2s ease !important;
        backdrop-filter: blur(12px) !important;
        -webkit-backdrop-filter: blur(12px) !important;
        border: 1px solid rgba(255,255,255,0.15) !important;
        box-shadow: 0 4px 20px rgba(0,0,0,0.35) !important;
        line-height: 1.4 !important;
        pointer-events: auto !important;
      }
      .slop-badge:hover {
        transform: scale(1.05) !important;
        box-shadow: 0 6px 25px rgba(0,0,0,0.5) !important;
      }

      /* Badge color variants */
      .slop-badge-scanning  { background: rgba(99,102,241,0.85)  !important; color: #fff !important; border-color: rgba(99,102,241,0.5) !important; }
      .slop-badge-clean     { background: rgba(16,185,129,0.85)  !important; color: #fff !important; border-color: rgba(16,185,129,0.5) !important; }
      .slop-badge-low       { background: rgba(245,158,11,0.85)  !important; color: #fff !important; border-color: rgba(245,158,11,0.5) !important; }
      .slop-badge-medium    { background: rgba(249,115,22,0.85)  !important; color: #fff !important; border-color: rgba(249,115,22,0.5) !important; }
      .slop-badge-high      { background: rgba(239,68,68,0.88)   !important; color: #fff !important; border-color: rgba(239,68,68,0.5) !important; }
      .slop-badge-critical  { background: rgba(220,38,38,0.92)   !important; color: #fff !important; border-color: rgba(220,38,38,0.6) !important; animation: slopPulse 2s ease-in-out infinite !important; }
      .slop-badge-error     { background: rgba(100,116,139,0.8)  !important; color: #fff !important; border-color: rgba(100,116,139,0.3) !important; }

      @keyframes slopPulse {
        0%,100% { box-shadow: 0 4px 20px rgba(220,38,38,0.4) !important; }
        50%      { box-shadow: 0 4px 35px rgba(220,38,38,0.8) !important; }
      }

      /* ===== BACKDROP ===== */
      .slop-backdrop {
        position: fixed !important;
        inset: 0 !important;
        background: rgba(0,0,0,0.75) !important;
        z-index: 2147483645 !important;
        backdrop-filter: blur(5px) !important;
        -webkit-backdrop-filter: blur(5px) !important;
        animation: slopFadeIn 0.2s ease !important;
      }

      /* ===== OVERLAY PANEL ===== */
      .slop-overlay {
        position: fixed !important;
        top: 50% !important;
        left: 50% !important;
        transform: translate(-50%, -50%) !important;
        z-index: 2147483646 !important;
        width: 580px !important;
        max-width: 94vw !important;
        font-family: 'Segoe UI', system-ui, -apple-system, sans-serif !important;
        animation: slopSlideIn 0.35s cubic-bezier(0.34,1.56,0.64,1) !important;
        pointer-events: auto !important;
      }

      @keyframes slopFadeIn {
        from { opacity: 0; }
        to   { opacity: 1; }
      }
      @keyframes slopSlideIn {
        from { opacity: 0; transform: translate(-50%,-50%) scale(0.88); }
        to   { opacity: 1; transform: translate(-50%,-50%) scale(1); }
      }

      .slop-overlay-inner {
        background: rgba(8,12,20,0.97) !important;
        border: 1px solid rgba(239,68,68,0.3) !important;
        border-radius: 20px !important;
        overflow: hidden !important;
        box-shadow:
          0 30px 80px rgba(0,0,0,0.9),
          0 0 60px rgba(239,68,68,0.08),
          inset 0 1px 0 rgba(255,255,255,0.05) !important;
      }

      /* Header */
      .slop-header {
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        padding: 16px 20px !important;
        background: rgba(20,25,40,0.95) !important;
        border-bottom: 1px solid rgba(239,68,68,0.15) !important;
      }
      .slop-header-left {
        display: flex !important;
        align-items: center !important;
        gap: 12px !important;
      }
      .slop-logo {
        width: 36px !important; height: 36px !important;
        background: linear-gradient(135deg,#ef4444,#7f1d1d) !important;
        border-radius: 10px !important;
        display: flex !important; align-items: center !important; justify-content: center !important;
        font-size: 18px !important; flex-shrink: 0 !important;
        box-shadow: 0 4px 15px rgba(239,68,68,0.3) !important;
      }
      .slop-title {
        font-size: 13px !important; font-weight: 800 !important;
        color: #f1f5f9 !important; letter-spacing: 1.5px !important;
        text-transform: uppercase !important; line-height: 1.2 !important;
        margin: 0 !important;
      }
      .slop-subtitle {
        font-size: 10px !important; color: #475569 !important;
        letter-spacing: 0.5px !important; margin-top: 1px !important;
        margin: 0 !important;
      }
      .slop-close-btn {
        width: 30px !important; height: 30px !important;
        border-radius: 50% !important;
        background: rgba(255,255,255,0.06) !important;
        border: 1px solid rgba(255,255,255,0.1) !important;
        color: #64748b !important; cursor: pointer !important;
        display: flex !important; align-items: center !important; justify-content: center !important;
        font-size: 15px !important; transition: all 0.2s !important;
        flex-shrink: 0 !important; outline: none !important;
        line-height: 1 !important;
      }
      .slop-close-btn:hover {
        background: rgba(239,68,68,0.2) !important;
        color: #ef4444 !important;
        border-color: rgba(239,68,68,0.5) !important;
      }

      /* Body grid */
      .slop-body {
        display: grid !important;
        grid-template-columns: 155px 1fr 1fr !important;
        gap: 12px !important;
        padding: 16px !important;
      }
      .slop-panel {
        background: rgba(20,25,40,0.7) !important;
        border: 1px solid rgba(255,255,255,0.07) !important;
        border-radius: 14px !important;
        padding: 14px !important;
      }
      .slop-panel-title {
        font-size: 9px !important; font-weight: 800 !important;
        color: #475569 !important; text-transform: uppercase !important;
        letter-spacing: 2px !important; margin: 0 0 10px !important;
        display: block !important;
      }

      /* Gauge */
      .slop-gauge-wrap {
        display: flex !important; flex-direction: column !important;
        align-items: center !important; justify-content: center !important;
      }
      .slop-gauge-svg { width: 130px !important; height: 74px !important; display: block !important; }
      .slop-score-num {
        font-size: 28px !important; font-weight: 900 !important;
        font-family: 'Courier New', monospace !important;
        text-align: center !important; margin: 6px 0 2px !important;
        line-height: 1 !important;
      }
      .slop-score-lbl {
        font-size: 8px !important; color: #475569 !important;
        text-transform: uppercase !important; letter-spacing: 1px !important;
        text-align: center !important; margin: 0 !important;
      }
      .slop-score-prob {
        font-size: 10px !important; font-weight: 700 !important;
        text-align: center !important; margin: 3px 0 0 !important;
      }

      /* Flags */
      .slop-flag {
        display: flex !important; align-items: flex-start !important;
        gap: 7px !important; margin-bottom: 7px !important;
      }
      .slop-flag-dot {
        width: 7px !important; height: 7px !important;
        border-radius: 50% !important; flex-shrink: 0 !important;
        margin-top: 3px !important;
      }
      .slop-flag-text { font-size: 11px !important; color: #cbd5e1 !important; line-height: 1.4 !important; }
      .slop-flag-sev  { font-weight: 700 !important; }

      /* Progress bars */
      .slop-bar-wrap { margin-bottom: 7px !important; }
      .slop-bar-row {
        display: flex !important; justify-content: space-between !important;
        font-size: 9px !important; color: #475569 !important;
        margin-bottom: 3px !important;
      }
      .slop-bar-track {
        height: 3px !important; background: rgba(255,255,255,0.08) !important;
        border-radius: 2px !important; overflow: hidden !important;
      }
      .slop-bar-fill { height: 100% !important; border-radius: 2px !important; transition: width 0.8s ease !important; }

      /* Originality */
      .slop-orig-score {
        font-size: 22px !important; font-weight: 900 !important;
        margin: 0 0 4px !important; line-height: 1 !important;
      }
      .slop-orig-sub {
        font-size: 10px !important; color: #475569 !important;
        line-height: 1.5 !important; margin: 0 !important;
      }
      .slop-summary-box {
        margin-top: 10px !important; padding-top: 10px !important;
        border-top: 1px solid rgba(255,255,255,0.06) !important;
      }
      .slop-summary-lbl {
        font-size: 8px !important; color: #475569 !important;
        text-transform: uppercase !important; letter-spacing: 1px !important;
        margin-bottom: 4px !important; display: block !important;
      }
      .slop-summary-txt {
        font-size: 10px !important; color: #64748b !important;
        line-height: 1.6 !important; margin: 0 !important;
      }

      /* Footer button */
      .slop-footer {
        padding: 12px 16px !important;
        border-top: 1px solid rgba(255,255,255,0.05) !important;
      }
      .slop-dash-btn {
        width: 100% !important; padding: 12px !important;
        background: linear-gradient(135deg,rgba(239,68,68,0.2),rgba(127,29,29,0.3)) !important;
        border: 1px solid rgba(239,68,68,0.4) !important;
        border-radius: 10px !important; color: #f1f5f9 !important;
        font-size: 11px !important; font-weight: 800 !important;
        letter-spacing: 1px !important; cursor: pointer !important;
        transition: all 0.2s !important; text-transform: uppercase !important;
        outline: none !important; display: block !important;
        font-family: 'Segoe UI', system-ui, sans-serif !important;
      }
      .slop-dash-btn:hover {
        background: linear-gradient(135deg,rgba(239,68,68,0.35),rgba(127,29,29,0.5)) !important;
        border-color: rgba(239,68,68,0.65) !important;
        transform: translateY(-1px) !important;
        box-shadow: 0 6px 20px rgba(239,68,68,0.25) !important;
      }

      /* ===== Local badge indicator ===== */
      .slop-local-tag {
        font-size: 8px !important;
        opacity: 0.7 !important;
        margin-left: 2px !important;
      }
    `;
    document.head.appendChild(style);
  }

  // ============================================
  // SCAN ALL POSTS
  // ============================================
  function scanAll() {
    if (!isEnabled) return;

    // Use platform config or scan all text-heavy elements generically
    if (platformCfg) {
      platformCfg.postSelectors.forEach(sel => {
        document.querySelectorAll(sel).forEach(el => schedulePost(el));
      });
    } else {
      // Generic fallback — scan any large text block
      document.querySelectorAll('article, [role="article"], .post, .card, .entry').forEach(el => {
        if (el.innerText?.trim()?.length > 80) schedulePost(el);
      });
    }
  }

  // ============================================
  // SCHEDULE POST FOR ANALYSIS
  // ============================================
  function schedulePost(postEl) {
    if (processedPosts.has(postEl) || processingPosts.has(postEl)) return;

    const text = extractText(postEl);
    if (!text || text.length < 60) return;

    processingPosts.add(postEl);
    analyzePost(postEl, text);
  }

  // ============================================
  // EXTRACT TEXT FROM POST
  // ============================================
  function extractText(postEl) {
    if (platformCfg) {
      for (const sel of platformCfg.contentSelectors) {
        const el = postEl.querySelector(sel);
        const t  = el?.innerText?.trim();
        if (t && t.length > 60) return t;
      }
    }

    // Generic fallback
    const clone = postEl.cloneNode(true);
    // Remove buttons, nav, scripts
    clone.querySelectorAll('button, nav, script, style, svg, img, [aria-hidden="true"]').forEach(e => e.remove());
    const t = clone.innerText?.replace(/\s+/g, ' ')?.trim();
    return t?.length > 60 ? t : null;
  }

  // ============================================
  // ANALYZE A SINGLE POST
  // ============================================
  async function analyzePost(postEl, text) {
    // Ensure relative positioning for badge
    const pos = getComputedStyle(postEl).position;
    if (pos === 'static') postEl.style.position = 'relative';

    // Add scanning badge
    const badge = createBadge('scanning', '◌', 'Scanning...');
    postEl.appendChild(badge);

    try {
      const resp = await sendMessage({
        type:     'ANALYZE_CONTENT',
        content:  text.substring(0, 3000),
        platform: platform || 'other',
        url:      location.href,
      });

      badge.remove();

      if (!resp.success) {
        if (resp.error === 'NOT_AUTHENTICATED') {
          // Show login badge
          const loginBadge = createBadge('error', '🔒', 'Sign in');
          loginBadge.title = 'Click to sign in to AI Slop Detector';
          loginBadge.addEventListener('click', () => {
            chrome.runtime.sendMessage({ type: 'OPEN_DASHBOARD' });
          });
          postEl.appendChild(loginBadge);
          processedPosts.add(postEl);
          return;
        }
        throw new Error(resp.error || 'Analysis failed');
      }

      const data  = resp.data;
      const score = data.scores?.overall ?? 0;
      const cls   = data.classification  ?? 'clean';

      // Create result badge
      const icons = { clean:'✓', low:'◐', medium:'⚠', high:'⚡', critical:'🔴' };
      const resultBadge = createBadge(
        cls,
        icons[cls] || '?',
        `${score}% SLOP${data.localAnalysis ? ' ⚡' : ''}`
      );

      if (data.localAnalysis) {
        resultBadge.title = 'Local analysis (backend offline)';
      }

      // Click → show overlay
      resultBadge.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (settings.showOverlay !== false) showOverlay(data);
      });

      postEl.appendChild(resultBadge);
      processedPosts.add(postEl);

    } catch (err) {
      badge.remove();
      console.warn('[SlopDetector] Post analysis error:', err.message);

      // Add error badge for debugging
      const errBadge = createBadge('error', '!', 'Error');
      errBadge.title = err.message;
      postEl.appendChild(errBadge);
      processedPosts.add(postEl);
    }
  }

  // ============================================
  // CREATE BADGE ELEMENT
  // ============================================
  function createBadge(cls, icon, label) {
    const badge = document.createElement('div');
    badge.className = `slop-badge slop-badge-${cls}`;
    badge.innerHTML = `<span>${icon}</span><span>${label}</span>`;
    return badge;
  }

  // ============================================
  // SHOW ANALYSIS OVERLAY
  // ============================================
  function showOverlay(data) {
    closeOverlay();

    const { scores = {}, flags = [], aiResponse = {}, classification = 'clean' } = data;
    const overall = scores.overall ?? 0;

    const color = scoreColor(overall);
    const prob  = probLabel(overall);
    const orig  = scores.originality ?? (100 - overall);
    const origColor = scoreColor(100 - orig);
    const origLabel = orig > 60 ? 'High' : orig > 30 ? 'Medium' : 'Low';

    // Backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'slop-backdrop';
    backdrop.addEventListener('click', closeOverlay);

    // Overlay
    const overlay = document.createElement('div');
    overlay.className = 'slop-overlay';
    overlay.innerHTML = `
      <div class="slop-overlay-inner">
        <!-- Header -->
        <div class="slop-header">
          <div class="slop-header-left">
            <div class="slop-logo">🔍</div>
            <div>
              <p class="slop-title">REAL-TIME DETECTOR <span style="color:#ef4444">|</span> Post Analysis</p>
              <p class="slop-subtitle">AI Content Intelligence System${data.localAnalysis ? ' · Local Mode' : ''}</p>
            </div>
          </div>
          <button class="slop-close-btn" id="slopClose">✕</button>
        </div>

        <!-- Body -->
        <div class="slop-body">

          <!-- Gauge panel -->
          <div class="slop-panel slop-gauge-wrap">
            <span class="slop-panel-title" style="text-align:center">Score</span>
            ${buildGaugeSVG(overall, color)}
            <p class="slop-score-num" style="color:${color}">${overall}%</p>
            <p class="slop-score-lbl">OVERALL SLOP SCORE</p>
            <p class="slop-score-prob" style="color:${prob.color}">(${prob.label})</p>
          </div>

          <!-- Detection summary panel -->
          <div class="slop-panel">
            <span class="slop-panel-title">Detection Summary</span>

            ${flags.length === 0
              ? '<div style="color:#10b981;font-size:11px;margin-bottom:10px">✓ No significant issues detected</div>'
              : flags.slice(0,4).map(f => `
                  <div class="slop-flag">
                    <div class="slop-flag-dot" style="background:${sevColor(f.severity)}"></div>
                    <div class="slop-flag-text">
                      ${f.type}
                      <span class="slop-flag-sev" style="color:${sevColor(f.severity)}">
                        (${capitalize(f.severity)})
                      </span>
                    </div>
                  </div>
                `).join('')
            }

            <div style="margin-top:12px">
              ${[
                { label: 'Repetitive Structure', v: scores.repetitiveStructure ?? 0 },
                { label: 'Hollow Vocabulary',    v: scores.hollowVocabulary    ?? 0 },
                { label: 'Lack of Evidence',     v: scores.lackOfEvidence      ?? 0 },
              ].map(s => `
                <div class="slop-bar-wrap">
                  <div class="slop-bar-row">
                    <span>${s.label}</span>
                    <span style="color:${scoreColor(s.v)}">${s.v}%</span>
                  </div>
                  <div class="slop-bar-track">
                    <div class="slop-bar-fill" style="width:${s.v}%;background:${scoreColor(s.v)}"></div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Originality panel -->
          <div class="slop-panel">
            <span class="slop-panel-title">Originality Score</span>
            <p class="slop-orig-score" style="color:${origColor}">${origLabel}</p>
            <p class="slop-orig-sub">
              ${orig}% originality<br>
              ${orig < 40 ? '(Possible Unoriginal Content)' : orig < 70 ? '(Partially Original)' : '(Likely Original Content)'}
            </p>

            ${aiResponse.summary ? `
              <div class="slop-summary-box">
                <span class="slop-summary-lbl">AI Summary</span>
                <p class="slop-summary-txt">${aiResponse.summary.substring(0,150)}...</p>
              </div>
            ` : ''}
          </div>
        </div>

        <!-- Footer -->
        <div class="slop-footer">
          <button class="slop-dash-btn" id="slopDashBtn">
            📊 VIEW FULL DASHBOARD ANALYSIS
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);
    document.body.appendChild(overlay);

    overlay.querySelector('#slopClose').addEventListener('click', closeOverlay);
    overlay.querySelector('#slopDashBtn').addEventListener('click', () => {
      sendMessage({ type: 'OPEN_DASHBOARD' });
      closeOverlay();
    });

    activeOverlay = { backdrop, overlay };

    // Animate bars after render
    requestAnimationFrame(() => {
      overlay.querySelectorAll('.slop-bar-fill').forEach(el => {
        const w = el.style.width;
        el.style.width = '0';
        requestAnimationFrame(() => { el.style.width = w; });
      });
    });
  }

  function closeOverlay() {
    activeOverlay?.backdrop?.remove();
    activeOverlay?.overlay?.remove();
    activeOverlay = null;
  }

  // ============================================
  // GAUGE SVG
  // ============================================
  function buildGaugeSVG(score, color) {
    const angle = (score / 100) * 180 - 90;
    const rad   = angle * Math.PI / 180;
    const cx = 65, cy = 70, r = 50;
    const nx = cx + r * Math.cos(rad);
    const ny = cy + r * Math.sin(rad);
    const arcLen = (score / 100) * 175;

    return `
      <svg viewBox="0 0 130 74" class="slop-gauge-svg">
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2.5" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        <path d="M8 70 A57 57 0 0 1 122 70" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="10" stroke-linecap="round"/>
        <path d="M8 70 A57 57 0 0 1 122 70" fill="none" stroke="${color}" stroke-width="10" stroke-linecap="round"
              stroke-dasharray="${arcLen} 175" opacity="0.9" filter="url(#glow)"/>
        ${[0,25,50,75,100].map(t => {
          const a  = ((t / 100) * 180 - 90) * Math.PI / 180;
          const x1 = cx + 52 * Math.cos(a), y1 = cy + 52 * Math.sin(a);
          const x2 = cx + 58 * Math.cos(a), y2 = cy + 58 * Math.sin(a);
          return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="rgba(255,255,255,0.2)" stroke-width="1.5"/>`;
        }).join('')}
        <line x1="${cx}" y1="${cy}" x2="${nx.toFixed(1)}" y2="${ny.toFixed(1)}"
              stroke="white" stroke-width="2" stroke-linecap="round"/>
        <circle cx="${cx}" cy="${cy}" r="5" fill="#1a1f2e" stroke="white" stroke-width="1.5"/>
        <circle cx="${cx}" cy="${cy}" r="2.5" fill="${color}"/>
      </svg>
    `;
  }

  // ============================================
  // HELPERS
  // ============================================
  function scoreColor(s) {
    if (s <= 20) return '#10b981';
    if (s <= 40) return '#f59e0b';
    if (s <= 60) return '#f97316';
    return '#ef4444';
  }

  function sevColor(sev) {
    return sev === 'high' ? '#ef4444' : sev === 'medium' ? '#f59e0b' : '#10b981';
  }

  function probLabel(s) {
    if (s <= 20) return { label: 'Clean Content',       color: '#10b981' };
    if (s <= 40) return { label: 'Low Probability',     color: '#f59e0b' };
    if (s <= 60) return { label: 'Medium Probability',  color: '#f97316' };
    if (s <= 80) return { label: 'High Probability',    color: '#ef4444' };
    return               { label: 'Critical — AI Slop', color: '#ef4444' };
  }

  function capitalize(str) {
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
  }

  // ============================================
  // SEND MESSAGE TO BACKGROUND (Promise wrapper)
  // ============================================
  function sendMessage(msg) {
    return new Promise((resolve, reject) => {
      try {
        chrome.runtime.sendMessage(msg, (resp) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(resp || {});
          }
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  // ============================================
  // MUTATION OBSERVER — watch for new posts
  // ============================================
  function startObserver() {
    if (observer) observer.disconnect();

    observer = new MutationObserver((mutations) => {
      let hasNew = false;
      for (const m of mutations) {
        if (m.addedNodes.length > 0) { hasNew = true; break; }
      }
      if (!hasNew) return;

      clearTimeout(scanTimeout);
      scanTimeout = setTimeout(scanAll, 800);
    });

    observer.observe(document.body, {
      childList: true,
      subtree:   true,
    });
  }

  // ============================================
  // MESSAGES FROM BACKGROUND
  // ============================================
  chrome.runtime.onMessage.addListener((msg) => {
    switch (msg.type) {
      case 'EXTENSION_TOGGLED':
        isEnabled = msg.isEnabled;
        if (isEnabled) {
          injectStyles();
          setTimeout(() => { scanAll(); startObserver(); }, 500);
        } else {
          observer?.disconnect();
          closeOverlay();
          // Remove all badges
          document.querySelectorAll('.slop-badge').forEach(b => b.remove());
        }
        break;

      case 'SETTINGS_UPDATED':
        settings = { ...settings, ...msg.settings };
        break;

      case 'TAB_UPDATED':
        if (isEnabled) {
          setTimeout(() => scanAll(), 1000);
        }
        break;
    }
  });

  // ============================================
  // START
  // ============================================
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
