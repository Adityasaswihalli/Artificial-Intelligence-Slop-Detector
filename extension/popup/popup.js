// ============================================================
// AI Slop Detector — Popup v2.0
// ============================================================

let S = {
  user: null, isAuth: false, isEnabled: true,
  scanCount: 0,
  settings: {
    autoScan: true, showOverlay: true, minScoreAlert: 60,
    platforms: { linkedin:true, twitter:true, reddit:true, facebook:true }
  },
};

async function boot() {
  const resp = await msg({ type: 'GET_STATE' });
  S.isEnabled  = resp.isEnabled !== false;
  S.isAuth     = resp.isAuthenticated;
  S.scanCount  = resp.scanCount || 0;
  S.user       = resp.user || null;
  S.settings   = resp.settings ? { ...S.settings, ...resp.settings } : S.settings;
  paint();
}

function paint() {
  document.getElementById('root').innerHTML =
    (S.isAuth && S.user) ? mainHTML() : authHTML();
  bind();
}

function hdr() {
  return `
    <div class="hd">
      <div class="logo">
        <div class="logo-icon">\uD83D\uDD0D</div>
        <div>
          <div class="logo-name">AI SLOP DETECTOR</div>
          <div class="logo-tag">Content Intelligence</div>
        </div>
      </div>
      <div class="tog-wrap">
        <span class="tog-lbl">${S.isEnabled?'ON':'OFF'}</span>
        <div class="tog ${S.isEnabled?'on':''}" id="mainTog">
          <div class="tok"></div>
        </div>
      </div>
    </div>
    <div class="status ${S.isEnabled?'on':'off'}">
      <div class="sdot"></div>
      <span>${S.isEnabled ? (S.isAuth ? 'Active \u2014 Scanning pages' : 'Active \u2014 Local mode') : 'Paused'}</span>
    </div>
  `;
}

function authHTML() {
  return `
    ${hdr()}
    <div class="auth">
      <div class="auth-emoji">\uD83D\uDEE1\uFE0F</div>
      <div class="auth-h">Sign in to activate</div>
      <div class="auth-p">
        Connect your account for GPT-4 powered analysis.<br>
        <strong style="color:#f59e0b">Works offline too \u2014 local engine active!</strong>
      </div>
      <button class="btn btn-r" id="bSign">Sign In / Register</button>
      <button class="btn btn-s" id="bScan">\uD83D\uDD0D Force Scan This Page</button>
    </div>
  `;
}

function mainHTML() {
  const u = S.user;
  const p = S.settings.platforms || {};

  return `
    ${hdr()}
    <div class="main">
      <div class="ucard">
        <div class="uav">${(u.name||'U')[0].toUpperCase()}</div>
        <div>
          <div class="uname">${u.name||'User'}</div>
          <div class="uemail">${u.email||''}</div>
        </div>
        <div class="uplan">${(u.plan||'FREE').toUpperCase()}</div>
      </div>

      <div class="sgrid">
        <div class="scard">
          <div class="sval" style="color:#ef4444">${S.scanCount}</div>
          <div class="slbl">Scanned</div>
        </div>
        <div class="scard">
          <div class="sval" style="color:#f59e0b">${u.stats?.slopDetected||0}</div>
          <div class="slbl">Slop Found</div>
        </div>
      </div>

      <button class="force-btn" id="bForce">
        \uD83D\uDD0D FORCE SCAN CURRENT PAGE
      </button>

      <div class="acts">
        <button class="abtn" id="bDash">
          <span class="aico">\uD83D\uDCCA</span><span>Open Dashboard</span><span class="ach">\u203A</span>
        </button>
        <button class="abtn" id="bHist">
          <span class="aico">\uD83D\uDCCB</span><span>Analysis History</span><span class="ach">\u203A</span>
        </button>
      </div>

      <div class="plats">
        <div class="plats-title">Active Platforms</div>
        ${[
          {id:'linkedin', n:'LinkedIn',    e:'\uD83D\uDCBC'},
          {id:'twitter',  n:'Twitter / X', e:'\uD83D\uDC26'},
          {id:'reddit',   n:'Reddit',      e:'\uD83E\uDD16'},
          {id:'facebook', n:'Facebook',    e:'\uD83D\uDCD8'},
        ].map(pl => `
          <div class="prow">
            <div class="pname">${pl.e} ${pl.n}</div>
            <div class="mt ${p[pl.id]!==false?'on':''}" data-plat="${pl.id}">
              <div class="mk"></div>
            </div>
          </div>
        `).join('')}
      </div>

      <div class="scan-hint" id="scanHint">
        ${S.isEnabled ? '\uD83D\uDD0D Scanning pages automatically' : '\u23F8 Detection paused'}
      </div>

      <div class="frow" style="margin-top:8px">
        <button class="fbtn" id="bSet">\u2699 Settings</button>
        <button class="fbtn d" id="bOut">\u21A9 Sign Out</button>
      </div>
    </div>
  `;
}

function bind() {
  document.getElementById('mainTog')?.addEventListener('click', async () => {
    const r = await msg({ type:'SET_ENABLED', value: !S.isEnabled });
    S.isEnabled = r.isEnabled;
    paint();
  });

  if (!S.isAuth || !S.user) {
    document.getElementById('bSign')?.addEventListener('click', () => {
      chrome.tabs.create({ url:'http://localhost:3000' });
      window.close();
    });
    document.getElementById('bScan')?.addEventListener('click', forceScan);
  } else {
    document.getElementById('bForce')?.addEventListener('click', forceScan);
    document.getElementById('bDash')?.addEventListener('click', () => {
      chrome.tabs.create({ url:'http://localhost:3000/dashboard' });
      window.close();
    });
    document.getElementById('bHist')?.addEventListener('click', () => {
      chrome.tabs.create({ url:'http://localhost:3000/history' });
      window.close();
    });
    document.getElementById('bSet')?.addEventListener('click', () => {
      chrome.tabs.create({ url:'http://localhost:3000/settings' });
      window.close();
    });
    document.getElementById('bOut')?.addEventListener('click', async () => {
      await msg({ type:'LOGOUT' });
      S = { user:null, isAuth:false, isEnabled:true, scanCount:0, settings:S.settings };
      paint();
    });

    document.querySelectorAll('[data-plat]').forEach(el => {
      el.addEventListener('click', async () => {
        const id  = el.dataset.plat;
        const cur = S.settings.platforms[id] !== false;
        S.settings.platforms[id] = !cur;
        el.classList.toggle('on', !cur);
        await msg({ type:'UPDATE_SETTINGS', settings: S.settings });
      });
    });
  }
}

async function forceScan() {
  const btn = document.getElementById('bForce') || document.getElementById('bScan');
  if (btn) {
    btn.textContent = '\u27F3 SCANNING...';
    btn.classList.add('scanning');
    btn.disabled = true;
  }
  try {
    await msg({ type:'FORCE_SCAN_TAB' });
    const hint = document.getElementById('scanHint');
    if (hint) hint.textContent = '\u2713 Scan triggered! Check page for badges.';
  } catch (e) {
    console.error('Force scan error:', e);
  }
  setTimeout(() => {
    if (btn) {
      btn.textContent = '\uD83D\uDD0D FORCE SCAN CURRENT PAGE';
      btn.classList.remove('scanning');
      btn.disabled = false;
    }
  }, 2500);
}

function msg(payload) {
  return new Promise((res, rej) => {
    chrome.runtime.sendMessage(payload, r => {
      if (chrome.runtime.lastError) rej(new Error(chrome.runtime.lastError.message));
      else res(r || {});
    });
  });
}

chrome.runtime.onMessage.addListener(m => {
  if (m.type === 'SCAN_COUNT_UPDATE') {
    S.scanCount = m.count;
    const el = document.querySelector('.sval');
    if (el) el.textContent = m.count;
  }
});

boot().catch(e => {
  console.error('Popup boot error:', e);
  document.getElementById('root').innerHTML = `
    <div style="padding:20px;text-align:center;color:#ef4444;font-family:sans-serif">
      <div style="font-size:24px;margin-bottom:10px">\u26A0\uFE0F</div>
      <div style="font-size:12px">Extension error. Reload Chrome.</div>
    </div>
  `;
});
