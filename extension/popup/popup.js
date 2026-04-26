// ============================================
// AI SLOP DETECTOR - Popup Script
// ============================================

const API_BASE = 'http://localhost:5000/api';

let state = {
  user:            null,
  isAuthenticated: false,
  isEnabled:       true,
  scanCount:       0,
  settings: {
    autoScan:    true,
    showOverlay: true,
    minScoreAlert: 70,
    platforms: { linkedin: true, twitter: true, reddit: true, facebook: true }
  },
};

// ============================================
// INIT
// ============================================
async function initPopup() {
  try {
    // Load from storage
    const stored = await chrome.storage.local.get([
      'authToken', 'extensionToken', 'user',
      'isEnabled', 'scanCount', 'settings'
    ]);

    state.isEnabled      = stored.isEnabled !== false;
    state.scanCount      = stored.scanCount || 0;
    state.isAuthenticated = !!(stored.authToken || stored.extensionToken);

    if (stored.settings) {
      state.settings = { ...state.settings, ...stored.settings };
    }

    if (stored.user) {
      state.user = stored.user;
    } else if (stored.authToken) {
      // Try fetch user from API
      try {
        const resp = await fetch(`${API_BASE}/auth/me`, {
          headers: { Authorization: `Bearer ${stored.authToken}` }
        });
        if (resp.ok) {
          const data = await resp.json();
          state.user = data.user;
          await chrome.storage.local.set({ user: data.user });
        }
      } catch { /* offline */ }
    }

    render();
  } catch (err) {
    console.error('Popup init error:', err);
    render();
  }
}

// ============================================
// RENDER
// ============================================
function render() {
  const root = document.getElementById('root');
  
  if (state.isAuthenticated && state.user) {
    root.innerHTML = renderMain();
  } else if (state.isEnabled) {
    root.innerHTML = renderLocalMode();
  } else {
    root.innerHTML = renderAuth();
  }

  attachListeners();
}

// ---- LOCAL MODE SCREEN ----
function renderLocalMode() {
  return `
    ${renderHeader()}
    <div class="status-bar active">
      <div class="status-dot"></div>
      <span>Active (Local Mode) — ⚡ No account needed</span>
    </div>
    <div class="main-screen">
      <div class="user-card" style="border-color: rgba(245,158,11,0.3)">
        <div class="user-avatar" style="background: #f59e0b">L</div>
        <div>
          <div class="user-name">Local Hub</div>
          <div class="user-email">Basic analysis active</div>
        </div>
        <div class="user-plan" style="color:#f59e0b; border-color:rgba(245,158,11,0.3)">LOCAL</div>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-val" style="color:#f59e0b">${state.scanCount || 0}</div>
          <div class="stat-lbl">Local Scans</div>
        </div>
        <div class="stat-card">
          <div class="stat-val" style="color:#64748b">—</div>
          <div class="stat-lbl">Slop History</div>
        </div>
      </div>

      <div class="auth-screen" style="padding: 10px 0; border-top: 1px solid rgba(255,255,255,0.05); margin-top: 10px;">
        <div class="auth-sub" style="margin-bottom: 12px; font-size: 10px;">
          Sign in to unlock AI-powered summaries, personalized history, and cross-device syncing.
        </div>
        <button class="btn btn-primary" id="btnSignIn" style="padding: 8px; font-size: 11px;">Sign In to Unlock All Features</button>
      </div>

      <div class="platforms">
        <div class="platforms-title">Active Platforms</div>
        ${[
          { id: 'linkedin', name: 'LinkedIn',    icon: '💼' },
          { id: 'twitter',  name: 'Twitter / X', icon: '🐦' },
        ].map(p => `
          <div class="plat-row">
            <div class="plat-name">${p.icon} ${p.name}</div>
            <div class="mini-toggle ${state.settings.platforms?.[p.id] !== false ? 'on' : ''}"
                 data-platform="${p.id}">
              <div class="mini-knob"></div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}
// ---- AUTH SCREEN ----
function renderAuth() {
  return `
    ${renderHeader()}
    <div class="status-bar inactive">
      <div class="status-dot"></div>
      <span>Sign in to activate detection</span>
    </div>
    <div class="auth-screen">
      <div class="auth-icon">🛡️</div>
      <div class="auth-title">Sign in to activate</div>
      <div class="auth-sub">
        Connect your account to start detecting AI-generated content across LinkedIn, Twitter, Reddit & more.
      </div>
      <button class="btn btn-primary" id="btnSignIn">Sign In / Create Account</button>
      <button class="btn btn-secondary" id="btnLearn">Learn More</button>
    </div>
  `;
}
// ---- MAIN SCREEN ----
function renderMain() {
  const u   = state.user;
  const s   = state.settings;
  const avg = u?.stats?.totalScanned
    ? Math.round((u.stats.slopDetected / u.stats.totalScanned) * 100)
    : 0;

  return `
    ${renderHeader()}
    <div class="status-bar ${state.isEnabled ? 'active' : 'inactive'}">
      <div class="status-dot"></div>
      <span>${state.isEnabled ? 'Active — Scanning your feed' : 'Detection paused'}</span>
    </div>
    <div class="main-screen">

      <!-- User card -->
      <div class="user-card">
        <div class="user-avatar">${(u?.name || 'U')[0].toUpperCase()}</div>
        <div>
          <div class="user-name">${u?.name || 'User'}</div>
          <div class="user-email">${u?.email || ''}</div>
        </div>
        <div class="user-plan">${(u?.plan || 'FREE').toUpperCase()}</div>
      </div>

      <!-- Stats -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-val" style="color:#ef4444">${state.scanCount || u?.stats?.totalScanned || 0}</div>
          <div class="stat-lbl">Scanned</div>
        </div>
        <div class="stat-card">
          <div class="stat-val" style="color:#f59e0b">${u?.stats?.slopDetected || 0}</div>
          <div class="stat-lbl">Slop Found</div>
        </div>
      </div>

      <!-- Actions -->
      <div class="actions">
        <button class="action-btn" id="btnDash">
          <span class="action-icon">📊</span>
          <span>Open Dashboard</span>
          <span class="action-chevron">›</span>
        </button>
        <button class="action-btn" id="btnHistory">
          <span class="action-icon">📋</span>
          <span>Analysis History</span>
          <span class="action-chevron">›</span>
        </button>
      </div>

      <!-- Platforms -->
      <div class="platforms">
        <div class="platforms-title">Active Platforms</div>
        ${[
          { id: 'linkedin', name: 'LinkedIn',    icon: '💼' },
          { id: 'twitter',  name: 'Twitter / X', icon: '🐦' },
          { id: 'reddit',   name: 'Reddit',      icon: '🤖' },
          { id: 'facebook', name: 'Facebook',    icon: '📘' },
        ].map(p => `
          <div class="plat-row">
            <div class="plat-name">${p.icon} ${p.name}</div>
            <div class="mini-toggle ${s.platforms?.[p.id] !== false ? 'on' : ''}"
                 data-platform="${p.id}" id="pt-${p.id}">
              <div class="mini-knob"></div>
            </div>
          </div>
        `).join('')}
      </div>

      <div class="scan-info">
        ${state.isEnabled ? '🔍 Actively scanning current page' : '⏸ Detection paused'}
      </div>

      <!-- Footer -->
      <div class="footer-row" style="margin-top:8px">
        <button class="footer-btn" id="btnSettings">⚙ Settings</button>
        <button class="footer-btn danger" id="btnLogout">↩ Sign Out</button>
      </div>
    </div>
  `;
}

// ---- HEADER (shared) ----
function renderHeader() {
  return `
    <div class="header">
      <div class="header-row">
        <div class="logo-wrap">
          <div class="logo-icon">🔍</div>
          <div>
            <div class="logo-name">AI SLOP DETECTOR</div>
            <div class="logo-sub">Content Intelligence</div>
          </div>
        </div>
        <div class="toggle-group">
          <span class="toggle-label">${state.isEnabled ? 'ON' : 'OFF'}</span>
          <div class="toggle ${state.isEnabled ? 'on' : ''}" id="mainToggle">
            <div class="toggle-knob"></div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ============================================
// ATTACH EVENT LISTENERS
// ============================================
function attachListeners() {
  // Main toggle
  document.getElementById('mainToggle')?.addEventListener('click', toggleExtension);

  if (!state.isAuthenticated || !state.user) {
    // Auth screen
    document.getElementById('btnSignIn')?.addEventListener('click', () => {
      chrome.tabs.create({ url: 'http://localhost:3000' });
      window.close();
    });
    document.getElementById('btnLearn')?.addEventListener('click', () => {
      chrome.tabs.create({ url: 'http://localhost:3000' });
      window.close();
    });
  } else {
    // Main screen
    document.getElementById('btnDash')?.addEventListener('click', () => {
      chrome.tabs.create({ url: 'http://localhost:3000/dashboard' });
      window.close();
    });
    document.getElementById('btnHistory')?.addEventListener('click', () => {
      chrome.tabs.create({ url: 'http://localhost:3000/history' });
      window.close();
    });
    document.getElementById('btnSettings')?.addEventListener('click', () => {
      chrome.tabs.create({ url: 'http://localhost:3000/settings' });
      window.close();
    });
    document.getElementById('btnLogout')?.addEventListener('click', logout);

    // Platform toggles
    document.querySelectorAll('[data-platform]').forEach(el => {
      el.addEventListener('click', () => togglePlatform(el.dataset.platform, el));
    });
  }
}

// ============================================
// TOGGLE EXTENSION
// ============================================
async function toggleExtension() {
  try {
    const resp = await chrome.runtime.sendMessage({ type: 'TOGGLE_EXTENSION' });
    state.isEnabled = resp.isEnabled;
    await chrome.storage.local.set({ isEnabled: state.isEnabled });
    render();
  } catch (err) {
    console.error('Toggle error:', err);
  }
}

// ============================================
// TOGGLE PLATFORM
// ============================================
async function togglePlatform(platformId, el) {
  const current = state.settings.platforms[platformId] !== false;
  state.settings.platforms[platformId] = !current;

  el.classList.toggle('on', !current);

  await chrome.storage.local.set({ settings: state.settings });
  await chrome.runtime.sendMessage({
    type:     'UPDATE_SETTINGS',
    settings: state.settings
  });
}

// ============================================
// LOGOUT
// ============================================
async function logout() {
  await chrome.runtime.sendMessage({ type: 'LOGOUT' });
  state = {
    ...state,
    user: null, isAuthenticated: false,
    isEnabled: false, // Turn off on logout to show auth screen
    scanCount: 0,
  };
  render();
}

// ============================================
// STORAGE CHANGE LISTENER
// ============================================
chrome.storage.onChanged.addListener((changes) => {
  let needsRender = false;
  if (changes.scanCount) { state.scanCount = changes.scanCount.newValue; needsRender = true; }
  if (changes.user)      { state.user      = changes.user.newValue;      needsRender = true; }
  if (changes.isEnabled) { state.isEnabled = changes.isEnabled.newValue; needsRender = true; }
  if (needsRender && document.getElementById('root')) render();
});

// ============================================
// START
// ============================================
initPopup();
