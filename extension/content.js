// ============================================================
// AI SLOP DETECTOR — Content Script v2.0
// Scans ANY webpage — no platform restrictions
// ============================================================

(function () {
  'use strict';

  if (window.__SLOP_DETECTOR_V2__) return;
  window.__SLOP_DETECTOR_V2__ = true;

  let isEnabled   = true;
  let scanTimeout = null;

  const scanned  = new WeakSet();
  const scanning = new WeakSet();

  const TEXT_SELECTORS = [
    '.markdown.prose', '.prose',
    '[data-message-author-role="assistant"] .markdown',
    '[data-message-author-role="user"] p',
    '.message-content', '.chat-message',
    '.feed-shared-update-v2', '.feed-shared-text', '.occludable-update',
    'article[data-testid="tweet"]', '[data-testid="tweetText"]',
    '[data-testid="post-container"]', '.Post', 'shreddit-post',
    '[role="article"]', 'article', '.post-content', '.article-body',
    '.entry-content', '.content-body', '.post-body', '.article-content',
    'main p', '.blog-post', '.story-body',
  ];

  const MIN_LEN = 80;

  async function init() {
    try {
      const resp = await bg({ type: 'GET_STATE' });
      isEnabled = resp.isEnabled !== false;
    } catch (e) { isEnabled = true; }
    if (!isEnabled) return;
    injectCSS();
    scheduleFullScan(1200);
    startObserver();
    console.log('[SlopDetector] Active on', location.hostname);
  }

  function fullScan() {
    if (!isEnabled) return;
    let found = 0;
    TEXT_SELECTORS.forEach(sel => {
      try {
        document.querySelectorAll(sel).forEach(el => {
          if (!scanned.has(el) && !scanning.has(el)) {
            const text = getCleanText(el);
            if (text && text.length >= MIN_LEN) { found++; processElement(el, text); }
          }
        });
      } catch (e) {}
    });
    if (found === 0) genericScan();
  }

  function genericScan() {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT, {
      acceptNode(node) {
        if (scanned.has(node) || scanning.has(node)) return NodeFilter.FILTER_SKIP;
        const style = window.getComputedStyle(node);
        if (style.display === 'none' || style.visibility === 'hidden') return NodeFilter.FILTER_SKIP;
        const rect = node.getBoundingClientRect();
        if (rect.width < 100 || rect.height < 20) return NodeFilter.FILTER_SKIP;
        const text = node.innerText?.trim() || '';
        if (text.length >= MIN_LEN && text.length <= 10000) {
          const tag = node.tagName?.toLowerCase();
          if (['p','div','article','section','blockquote','li'].includes(tag)) return NodeFilter.FILTER_ACCEPT;
        }
        return NodeFilter.FILTER_SKIP;
      }
    });
    let count = 0, node;
    while ((node = walker.nextNode()) && count < 30) {
      const text = getCleanText(node);
      if (text && text.length >= MIN_LEN && !hasScannedAncestor(node)) { count++; processElement(node, text); }
    }
  }

  function hasScannedAncestor(el) {
    let p = el.parentElement;
    while (p) { if (scanned.has(p) || scanning.has(p)) return true; p = p.parentElement; }
    return false;
  }

  function getCleanText(el) {
    const clone = el.cloneNode(true);
    clone.querySelectorAll('button,input,select,textarea,script,style,code,pre,svg,img,nav,footer,header,.slop-badge').forEach(e => e.remove());
    const text = (clone.innerText || clone.textContent || '').replace(/\s+/g, ' ').trim();
    return text.length >= MIN_LEN ? text : null;
  }

  async function processElement(el, text) {
    scanning.add(el);
    const pos = getComputedStyle(el).position;
    if (pos === 'static') el.style.position = 'relative';
    const badge = makeBadge('scanning', '\u27F3', 'Scanning...');
    el.appendChild(badge);
    try {
      const resp = await bg({ type: 'ANALYZE_TEXT', text: text.substring(0, 3000), url: location.href });
      badge.remove();
      if (!resp.success) { scanning.delete(el); return; }
      const { result } = resp;
      const score = result.scores?.overall ?? 0;
      const cls   = result.classification ?? 'clean';
      const ICONS = { clean:'\u2713', low:'\u25D1', medium:'\u26A0', high:'\u26A1', critical:'\uD83D\uDD34' };
      const rb = makeBadge(cls, ICONS[cls] || '?', `${score}%`);
      rb.title = `Slop Score: ${score}% \u2014 Click for details`;
      rb.addEventListener('click', e => { e.stopPropagation(); e.preventDefault(); showOverlay(result); });
      el.appendChild(rb);
      scanned.add(el);
    } catch (err) {
      badge.remove();
      scanning.delete(el);
    }
  }

  function makeBadge(cls, icon, label) {
    const b = document.createElement('div');
    b.className = `slop-badge slop-badge-${cls}`;
    b.setAttribute('data-slop-badge', 'true');
    b.innerHTML = `<span class="slop-b-icon">${icon}</span><span class="slop-b-label">${label}</span>`;
    return b;
  }

  function showOverlay(result) {
    document.querySelectorAll('.slop-overlay-root').forEach(e => e.remove());
    const { scores = {}, flags = [], aiResponse = {} } = result;
    const overall = scores.overall ?? 0;
    const color = scoreColor(overall);
    const prob  = probLabel(overall);
    const orig  = scores.originality ?? (100 - overall);

    const backdrop = document.createElement('div');
    backdrop.className = 'slop-overlay-root slop-backdrop';
    backdrop.addEventListener('click', () => backdrop.remove());
    document.body.appendChild(backdrop);

    const panel = document.createElement('div');
    panel.className = 'slop-panel-root';
    panel.addEventListener('click', e => e.stopPropagation());
    panel.innerHTML = `
      <div class="slop-panel-inner">
        <div class="slop-ph">
          <div class="slop-ph-l">
            <div class="slop-logo-box">\uD83D\uDD0D</div>
            <div>
              <div class="slop-ph-title">REAL-TIME DETECTOR <span style="color:#ef4444;margin:0 6px">|</span> Post Analysis</div>
              <div class="slop-ph-sub">AI Content Intelligence \u00B7 ${result.source === 'backend' ? 'GPT-4 Powered' : 'Local Engine'}</div>
            </div>
          </div>
          <button class="slop-close" id="slopClose">\u2715</button>
        </div>
        <div class="slop-pb">
          <div class="slop-gauge-panel">
            <div class="slop-pt">Score</div>
            ${buildGauge(overall, color)}
            <div class="slop-score" style="color:${color}">${overall}%</div>
            <div class="slop-score-sub">OVERALL SLOP SCORE</div>
            <div class="slop-score-prob" style="color:${prob.color}">(${prob.label})</div>
          </div>
          <div class="slop-flags-panel">
            <div class="slop-pt">Detection Summary</div>
            ${flags.length === 0
              ? '<div class="slop-no-flags">\u2713 No significant AI patterns found</div>'
              : flags.slice(0,4).map(f => `
                  <div class="slop-flag-row">
                    <div class="slop-flag-dot" style="background:${sevColor(f.severity)}"></div>
                    <div class="slop-flag-txt">${f.type} <span style="color:${sevColor(f.severity)};font-weight:800">(${cap(f.severity)})</span></div>
                  </div>`).join('')}
            <div style="margin-top:10px">
              ${[
                { l:'Hollow Vocabulary',   v: scores.hollowVocabulary    ?? 0 },
                { l:'Repetitive Structure', v: scores.repetitiveStructure ?? 0 },
                { l:'AI Patterns',          v: scores.sentimentManipulation ?? 0 },
              ].map(s => `
                <div class="slop-sb-row">
                  <div class="slop-sb-lbl"><span>${s.l}</span><span style="color:${scoreColor(s.v)}">${s.v}%</span></div>
                  <div class="slop-sb-track"><div class="slop-sb-fill" style="width:${s.v}%;background:${scoreColor(s.v)}"></div></div>
                </div>`).join('')}
            </div>
          </div>
          <div class="slop-orig-panel">
            <div class="slop-pt">Originality Score</div>
            <div class="slop-orig-val" style="color:${scoreColor(100-orig)}">${orig > 60 ? 'High' : orig > 30 ? 'Medium' : 'Low'}</div>
            <div class="slop-orig-sub">${orig}% originality<br><span style="color:#475569">${orig < 40 ? '(Possible Unoriginal Content)' : orig < 70 ? '(Partially Original)' : '(Likely Original)'}</span></div>
            ${aiResponse.summary ? `<div class="slop-summary"><div class="slop-summary-lbl">Analysis</div><div class="slop-summary-txt">${aiResponse.summary}</div></div>` : ''}
          </div>
        </div>
        <div class="slop-pf">
          <button class="slop-dash-btn" id="slopDashBtn">\uD83D\uDCCA VIEW FULL DASHBOARD ANALYSIS</button>
        </div>
      </div>`;
    backdrop.appendChild(panel);
    panel.querySelector('#slopClose').addEventListener('click', () => backdrop.remove());
    panel.querySelector('#slopDashBtn').addEventListener('click', () => {
      bg({ type: 'OPEN_URL', url: 'http://localhost:3000/dashboard' });
      backdrop.remove();
    });
  }

  function buildGauge(score, color) {
    const angle = (score / 100) * 180 - 90;
    const rad = angle * Math.PI / 180;
    const cx = 65, cy = 72, r = 52;
    const nx = cx + r * Math.cos(rad), ny = cy + r * Math.sin(rad);
    const arc = (score / 100) * 183;
    return `<svg viewBox="0 0 130 76" class="slop-gauge">
      <path d="M7 72 A58 58 0 0 1 123 72" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="11" stroke-linecap="round"/>
      <path d="M7 72 A58 58 0 0 1 123 72" fill="none" stroke="${color}" stroke-width="11" stroke-linecap="round" stroke-dasharray="${arc} 183" opacity="0.9"/>
      ${[0,25,50,75,100].map(t => {
        const a = ((t/100)*180-90)*Math.PI/180;
        return `<line x1="${(cx+54*Math.cos(a)).toFixed(1)}" y1="${(cy+54*Math.sin(a)).toFixed(1)}" x2="${(cx+60*Math.cos(a)).toFixed(1)}" y2="${(cy+60*Math.sin(a)).toFixed(1)}" stroke="rgba(255,255,255,0.2)" stroke-width="1.5"/>`;
      }).join('')}
      <line x1="${cx}" y1="${cy}" x2="${nx.toFixed(1)}" y2="${ny.toFixed(1)}" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
      <circle cx="${cx}" cy="${cy}" r="5.5" fill="#0d1117" stroke="white" stroke-width="1.5"/>
      <circle cx="${cx}" cy="${cy}" r="3" fill="${color}"/>
    </svg>`;
  }

  function scoreColor(s) {
    if (s <= 20) return '#10b981'; if (s <= 40) return '#f59e0b';
    if (s <= 60) return '#f97316'; return '#ef4444';
  }
  function sevColor(sev) { return sev === 'high' ? '#ef4444' : sev === 'medium' ? '#f59e0b' : '#10b981'; }
  function probLabel(s) {
    if (s <= 20) return { label:'Clean Content', color:'#10b981' };
    if (s <= 40) return { label:'Low Probability', color:'#f59e0b' };
    if (s <= 60) return { label:'Medium Probability', color:'#f97316' };
    if (s <= 80) return { label:'High Probability', color:'#ef4444' };
    return { label:'Critical \u2014 AI Slop', color:'#ef4444' };
  }
  function cap(s) { return s ? s[0].toUpperCase() + s.slice(1) : ''; }

  function bg(msg) {
    return new Promise((resolve, reject) => {
      try {
        chrome.runtime.sendMessage(msg, resp => {
          if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
          else resolve(resp || {});
        });
      } catch (e) { reject(e); }
    });
  }

  function scheduleFullScan(delay) {
    clearTimeout(scanTimeout);
    scanTimeout = setTimeout(fullScan, delay || 1000);
  }

  function startObserver() {
    const obs = new MutationObserver(mutations => {
      if (mutations.some(m => m.addedNodes.length > 0)) scheduleFullScan(1200);
    });
    obs.observe(document.body, { childList: true, subtree: true });
  }

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'SET_ENABLED') {
      isEnabled = msg.value;
      if (isEnabled) { injectCSS(); scheduleFullScan(500); startObserver(); }
      else {
        clearTimeout(scanTimeout);
        document.querySelectorAll('.slop-badge').forEach(b => b.remove());
        document.querySelectorAll('.slop-overlay-root').forEach(b => b.remove());
      }
    }
    if (msg.type === 'FORCE_SCAN') {
      document.querySelectorAll('.slop-badge').forEach(b => b.remove());
      scheduleFullScan(200);
    }
  });

  function injectCSS() {
    if (document.getElementById('slop-css-v2')) return;
    const s = document.createElement('style');
    s.id = 'slop-css-v2';
    s.textContent = `
      .slop-badge{position:absolute!important;top:6px!important;right:6px!important;z-index:2147483640!important;display:inline-flex!important;align-items:center!important;gap:4px!important;padding:3px 9px!important;border-radius:20px!important;font-size:10px!important;font-weight:800!important;font-family:'Segoe UI',system-ui,sans-serif!important;cursor:pointer!important;user-select:none!important;letter-spacing:.5px!important;text-transform:uppercase!important;transition:transform .2s,box-shadow .2s!important;border:1.5px solid rgba(255,255,255,.2)!important;box-shadow:0 3px 14px rgba(0,0,0,.4)!important;line-height:1.5!important;pointer-events:auto!important;backdrop-filter:blur(8px)!important;-webkit-backdrop-filter:blur(8px)!important}
      .slop-badge:hover{transform:scale(1.08)!important;box-shadow:0 5px 20px rgba(0,0,0,.55)!important}
      .slop-badge-scanning{background:rgba(99,102,241,.9)!important;color:#fff!important}
      .slop-badge-clean{background:rgba(16,185,129,.9)!important;color:#fff!important}
      .slop-badge-low{background:rgba(245,158,11,.9)!important;color:#fff!important}
      .slop-badge-medium{background:rgba(249,115,22,.9)!important;color:#fff!important}
      .slop-badge-high{background:rgba(239,68,68,.92)!important;color:#fff!important}
      .slop-badge-critical{background:rgba(220,38,38,.95)!important;color:#fff!important;animation:slop-pulse 1.8s ease-in-out infinite!important}
      @keyframes slop-pulse{0%,100%{box-shadow:0 3px 14px rgba(220,38,38,.5)!important}50%{box-shadow:0 3px 28px rgba(220,38,38,.9)!important}}
      .slop-backdrop{position:fixed!important;inset:0!important;background:rgba(0,0,0,.78)!important;z-index:2147483644!important;backdrop-filter:blur(6px)!important;-webkit-backdrop-filter:blur(6px)!important;display:flex!important;align-items:center!important;justify-content:center!important;animation:slop-fadein .2s ease!important}
      @keyframes slop-fadein{from{opacity:0}to{opacity:1}}
      .slop-panel-root{width:580px!important;max-width:94vw!important;animation:slop-slidein .32s cubic-bezier(.34,1.56,.64,1)!important}
      @keyframes slop-slidein{from{opacity:0;transform:scale(.88)}to{opacity:1;transform:scale(1)}}
      .slop-panel-inner{background:rgba(7,10,18,.98)!important;border:1px solid rgba(239,68,68,.3)!important;border-radius:20px!important;overflow:hidden!important;box-shadow:0 28px 80px rgba(0,0,0,.92),0 0 50px rgba(239,68,68,.07)!important;font-family:'Segoe UI',system-ui,sans-serif!important}
      .slop-ph{display:flex!important;align-items:center!important;justify-content:space-between!important;padding:15px 20px!important;background:rgba(18,23,38,.95)!important;border-bottom:1px solid rgba(239,68,68,.15)!important}
      .slop-ph-l{display:flex!important;align-items:center!important;gap:12px!important}
      .slop-logo-box{width:36px!important;height:36px!important;background:linear-gradient(135deg,#ef4444,#7f1d1d)!important;border-radius:10px!important;display:flex!important;align-items:center!important;justify-content:center!important;font-size:18px!important;flex-shrink:0!important;box-shadow:0 4px 14px rgba(239,68,68,.35)!important}
      .slop-ph-title{font-size:13px!important;font-weight:900!important;color:#f1f5f9!important;letter-spacing:1.2px!important;text-transform:uppercase!important;margin:0!important}
      .slop-ph-sub{font-size:10px!important;color:#475569!important;letter-spacing:.3px!important;margin-top:2px!important}
      .slop-close{width:30px!important;height:30px!important;border-radius:50%!important;background:rgba(255,255,255,.06)!important;border:1px solid rgba(255,255,255,.1)!important;color:#64748b!important;cursor:pointer!important;display:flex!important;align-items:center!important;justify-content:center!important;font-size:14px!important;transition:all .2s!important;outline:none!important;flex-shrink:0!important;line-height:1!important}
      .slop-close:hover{background:rgba(239,68,68,.2)!important;color:#ef4444!important;border-color:rgba(239,68,68,.5)!important}
      .slop-pb{display:grid!important;grid-template-columns:150px 1fr 1fr!important;gap:12px!important;padding:14px!important}
      .slop-gauge-panel,.slop-flags-panel,.slop-orig-panel{background:rgba(18,23,38,.75)!important;border:1px solid rgba(255,255,255,.07)!important;border-radius:14px!important;padding:14px!important;box-sizing:border-box!important}
      .slop-gauge-panel{display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important}
      .slop-pt{font-size:8.5px!important;font-weight:800!important;color:#475569!important;text-transform:uppercase!important;letter-spacing:2px!important;margin-bottom:10px!important;text-align:center!important;display:block!important}
      .slop-gauge{width:128px!important;height:74px!important;display:block!important}
      .slop-score{font-size:28px!important;font-weight:900!important;font-family:'Courier New',monospace!important;text-align:center!important;margin:5px 0 2px!important;line-height:1!important}
      .slop-score-sub{font-size:7.5px!important;color:#475569!important;text-transform:uppercase!important;letter-spacing:1px!important;text-align:center!important;margin:0!important}
      .slop-score-prob{font-size:10px!important;font-weight:700!important;text-align:center!important;margin:4px 0 0!important}
      .slop-no-flags{font-size:11px!important;color:#10b981!important;margin-bottom:8px!important}
      .slop-flag-row{display:flex!important;align-items:flex-start!important;gap:7px!important;margin-bottom:7px!important}
      .slop-flag-dot{width:7px!important;height:7px!important;border-radius:50%!important;flex-shrink:0!important;margin-top:3px!important}
      .slop-flag-txt{font-size:11px!important;color:#cbd5e1!important;line-height:1.5!important;margin:0!important}
      .slop-sb-row{margin-bottom:8px!important}
      .slop-sb-lbl{display:flex!important;justify-content:space-between!important;font-size:9px!important;color:#475569!important;margin-bottom:3px!important}
      .slop-sb-track{height:3px!important;background:rgba(255,255,255,.08)!important;border-radius:2px!important;overflow:hidden!important}
      .slop-sb-fill{height:100%!important;border-radius:2px!important;transition:width .9s ease!important}
      .slop-orig-val{font-size:22px!important;font-weight:900!important;margin:0 0 4px!important;line-height:1!important}
      .slop-orig-sub{font-size:11px!important;color:#94a3b8!important;line-height:1.6!important;margin:0!important}
      .slop-summary{margin-top:10px!important;padding-top:10px!important;border-top:1px solid rgba(255,255,255,.06)!important}
      .slop-summary-lbl{font-size:8px!important;color:#475569!important;text-transform:uppercase!important;letter-spacing:1px!important;margin-bottom:4px!important;display:block!important}
      .slop-summary-txt{font-size:10px!important;color:#64748b!important;line-height:1.65!important;margin:0!important}
      .slop-pf{padding:12px 14px!important;border-top:1px solid rgba(255,255,255,.05)!important}
      .slop-dash-btn{width:100%!important;padding:12px!important;background:linear-gradient(135deg,rgba(239,68,68,.22),rgba(127,29,29,.35))!important;border:1px solid rgba(239,68,68,.42)!important;border-radius:10px!important;color:#f1f5f9!important;font-size:11px!important;font-weight:800!important;letter-spacing:1px!important;cursor:pointer!important;transition:all .2s!important;text-transform:uppercase!important;outline:none!important;display:block!important;font-family:'Segoe UI',system-ui,sans-serif!important}
      .slop-dash-btn:hover{background:linear-gradient(135deg,rgba(239,68,68,.38),rgba(127,29,29,.52))!important;border-color:rgba(239,68,68,.65)!important;transform:translateY(-1px)!important;box-shadow:0 6px 20px rgba(239,68,68,.28)!important}
    `;
    document.head.appendChild(s);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
