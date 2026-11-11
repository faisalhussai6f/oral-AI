// ── Settings Page ──
function pageSettings() {
  const s    = AppState.settings;
  const notif = s.notifications || {};
  const theme = s.theme || 'dark';
  const backendUrl = s.backendUrl || 'http://localhost:5000';

  const toggle = (key, checked, onchange) => `
    <label class="relative inline-flex items-center cursor-pointer flex-shrink-0">
      <input type="checkbox" ${checked ? 'checked' : ''} class="sr-only peer"
             onchange="${onchange}" />
      <div class="w-10 h-5 bg-gray-700 peer-checked:bg-brand-500 rounded-full transition-colors duration-200
                  after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white
                  after:rounded-full after:h-4 after:w-4 after:transition-all
                  peer-checked:after:translate-x-5"></div>
    </label>`;

  return `
  <div class="max-w-2xl mx-auto space-y-6">

    <div>
      <h2 class="text-2xl font-bold text-white">Settings</h2>
      <p class="text-gray-400 mt-1 text-sm">Personalise your OralAI experience</p>
    </div>

    <!-- ── Appearance ── -->
    <div class="card space-y-4">
      <h3 class="font-semibold text-white flex items-center gap-2">
        🎨 Appearance
      </h3>

      <div class="flex items-center justify-between p-3 rounded-xl bg-gray-900 border border-gray-800">
        <div>
          <div class="text-sm font-semibold text-gray-200">Theme</div>
          <div class="text-xs text-gray-500 mt-0.5">Switch between dark and light mode</div>
        </div>
        <div class="flex items-center gap-3">
          <span class="text-xs text-gray-400">☀️ Light</span>
          ${toggle('theme', theme === 'dark',
            "settingToggleTheme(this.checked)")}
          <span class="text-xs text-gray-400">🌙 Dark</span>
        </div>
      </div>

      <div class="flex items-center justify-between p-3 rounded-xl bg-gray-900 border border-gray-800">
        <div>
          <div class="text-sm font-semibold text-gray-200">Compact Sidebar</div>
          <div class="text-xs text-gray-500 mt-0.5">Collapse sidebar labels, show icons only</div>
        </div>
        ${toggle('compactSidebar', s.compactSidebar || false,
          "settingCompactSidebar(this.checked)")}
      </div>

      <div class="flex items-center justify-between p-3 rounded-xl bg-gray-900 border border-gray-800">
        <div>
          <div class="text-sm font-semibold text-gray-200">Reduce Motion</div>
          <div class="text-xs text-gray-500 mt-0.5">Disable entrance animations and transitions</div>
        </div>
        ${toggle('reduceMotion', s.reduceMotion || false,
          "settingReduceMotion(this.checked)")}
      </div>
    </div>

    <!-- ── AI Backend ── -->
    <div class="card space-y-4">
      <h3 class="font-semibold text-white flex items-center gap-2">
        ⚙️ AI Backend
        <span class="text-xs px-2 py-0.5 rounded-full font-semibold ${s.useBackend
          ? 'bg-green-500/20 text-green-300'
          : 'bg-yellow-500/20 text-yellow-300'}">
          ${s.useBackend ? '🟢 Online' : '🟡 Offline'}
        </span>
      </h3>

      <div>
        <label class="form-label">Flask Backend URL</label>
        <div class="flex gap-2 mt-1">
          <input id="settings-backend-url" type="url" class="form-input flex-1"
                 value="${backendUrl}"
                 placeholder="http://localhost:5000" />
          <button onclick="settingsTestBackend()" class="btn-secondary text-sm px-4 flex-shrink-0">
            Test
          </button>
        </div>
        <p class="text-xs text-gray-500 mt-1.5">
          Start the Flask server, then click Test to enable real CNN inference.
        </p>
      </div>

      <div class="p-3 rounded-xl bg-gray-950 border border-gray-800 font-mono text-xs text-green-400 space-y-1 select-all">
        <div>cd oral-health-ai\\backend</div>
        <div>python -m venv .venv</div>
        <div>.\.venv\Scripts\activate</div>
        <div>pip install -r requirements.txt</div>
        <div>python app.py</div>
      </div>

      <div class="flex items-center justify-between p-3 rounded-xl bg-gray-900 border border-gray-800">
        <div>
          <div class="text-sm font-semibold text-gray-200">Use Backend for Analysis</div>
          <div class="text-xs text-gray-500 mt-0.5">When off, mock CNN analysis is used</div>
        </div>
        ${toggle('useBackend', s.useBackend || false,
          "settingToggleBackend(this.checked)")}
      </div>
    </div>

    <!-- ── Notifications ── -->
    <div class="card space-y-3">
      <h3 class="font-semibold text-white flex items-center gap-2">
        🔔 Notifications
        <button onclick="navigate('notifications')" class="text-xs text-brand-400 hover:underline ml-auto">
          View inbox →
        </button>
      </h3>
      ${[
        ['scanReminders',     'Scan Reminders',              'Monthly scan due alerts'],
        ['aiRecommendations', 'AI Recommendations',          'Personalised oral health tips'],
        ['dentistAlerts',     'Dentist Consultation Alerts', 'When a dentist reviews your report'],
        ['sensorAlerts',      'IoT Sensor Alerts',           'When sensor readings are abnormal'],
      ].map(([key, title, desc]) => `
        <div class="flex items-center justify-between p-3 rounded-xl bg-gray-900 border border-gray-800">
          <div>
            <div class="text-sm font-semibold text-gray-200">${title}</div>
            <div class="text-xs text-gray-500 mt-0.5">${desc}</div>
          </div>
          ${toggle(key, notif[key] !== false,
            `settingToggleNotif('${key}', this.checked)`)}
        </div>`).join('')}
    </div>

    <!-- ── Privacy & Data ── -->
    <div class="card space-y-4">
      <h3 class="font-semibold text-white">🔒 Privacy &amp; Data</h3>

      <div class="flex items-center justify-between p-3 rounded-xl bg-gray-900 border border-gray-800">
        <div>
          <div class="text-sm font-semibold text-gray-200">Analytics Consent</div>
          <div class="text-xs text-gray-500 mt-0.5">Allow anonymous usage data to improve OralAI</div>
        </div>
        ${toggle('analytics', s.analyticsConsent !== false,
          "settingToggle('analyticsConsent', this.checked)")}
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button onclick="settingsExport()" class="btn-secondary text-sm flex items-center gap-2 justify-center">
          📥 Export All Data
        </button>
        <button onclick="settingsClearCache()" class="btn-secondary text-sm flex items-center gap-2 justify-center">
          🗑 Clear App Cache
        </button>
      </div>
      <button onclick="settingsClearAll()"
        class="w-full text-sm px-4 py-2.5 rounded-lg border border-red-900/50 text-red-400
               hover:bg-red-900/20 transition-colors flex items-center justify-center gap-2">
        ⚠️ Delete All Data &amp; Sign Out
      </button>
    </div>

    <!-- ── About ── -->
    <div class="card space-y-3">
      <h3 class="font-semibold text-white">ℹ️ About OralAI</h3>
      <div class="grid grid-cols-2 gap-3 text-xs">
        ${[
          ['Version',     'v2.0.0'],
          ['Build',       '2026-09-20'],
          ['Model',       s.useBackend ? (AppState.settings._backendModelId || 'oralai-efficientnet-b0-v1') : 'oralai-demo-mode'],
          ['Storage',     _calcStorage()],
          ['Scans',       AppState.scans.length + ' on record'],
          ['Theme',       theme === 'dark' ? '🌙 Dark' : '☀️ Light'],
        ].map(([k,v]) => `
          <div class="flex justify-between p-2.5 rounded-lg bg-gray-900 border border-gray-800">
            <span class="text-gray-500">${k}</span>
            <span class="text-gray-200 font-medium">${v}</span>
          </div>`).join('')}
      </div>
      <div class="flex gap-3 justify-center flex-wrap pt-1">
        <button onclick="resetOnboarding(); showOnboarding();"
          class="text-xs text-brand-400 hover:underline">🚀 Replay App Tour</button>
        <span class="text-gray-700">·</span>
        <a href="https://github.com" target="_blank"
          class="text-xs text-gray-500 hover:text-gray-300">GitHub</a>
        <span class="text-gray-700">·</span>
        <button onclick="navigate('404')"
          class="text-xs text-gray-500 hover:text-gray-300">Report a Bug</button>
      </div>
    </div>

  </div>
  `;
}

// ── Settings action handlers ──
function settingToggleTheme(isDark) {
  const theme = isDark ? 'dark' : 'light';
  AppState.settings.theme = theme;
  saveSettings();
  applyTheme(theme);
  showToast(`Switched to ${theme} mode`, 'info');
}

function settingCompactSidebar(on) {
  AppState.settings.compactSidebar = on;
  saveSettings();
  // Toggle compact class on sidebar labels
  document.querySelectorAll('.sidebar-section-label, .nav-item span:not(svg)')
    .forEach(el => el.classList.toggle('hidden', on));
  showToast(on ? 'Compact sidebar enabled' : 'Full sidebar restored', 'info');
}

function settingReduceMotion(on) {
  AppState.settings.reduceMotion = on;
  saveSettings();
  document.documentElement.style.setProperty(
    '--transition-speed', on ? '0s' : '0.2s'
  );
  showToast(on ? 'Animations disabled' : 'Animations enabled', 'info');
}

function settingToggleBackend(on) {
  AppState.settings.useBackend = on;
  saveSettings();
  const dot   = document.getElementById('backend-dot');
  const label = document.getElementById('backend-label');
  if (on) {
    if (dot)   dot.className   = 'w-1.5 h-1.5 rounded-full bg-green-400';
    if (label) label.textContent = 'API Online';
    showToast('Backend enabled — make sure Flask is running', 'info');
  } else {
    if (dot)   dot.className   = 'w-1.5 h-1.5 rounded-full bg-yellow-400';
    if (label) label.textContent = 'Offline';
    showToast('Switched to mock analysis mode', 'info');
  }
}

async function settingsTestBackend() {
  const rawUrl = (document.getElementById('settings-backend-url')?.value.trim()
                 || AppState.settings.backendUrl
                 || 'http://localhost:5000').replace(/\/$/, '');
  AppState.settings.backendUrl = rawUrl;
  saveSettings();
  showToast('Testing connection…', 'info');
  try {
    const r = await fetch(rawUrl + '/health', { signal: AbortSignal.timeout(4000) });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const data = await r.json();
    AppState.settings.useBackend = true;
    saveSettings();
    const modelTxt = data.model_loaded ? data.model : `mock (${data.model || 'v1'})`;
    showToast(`✅ Backend online — model: ${modelTxt}`, 'success');
    // Update topbar badge immediately
    const dot   = document.getElementById('backend-dot');
    const label = document.getElementById('backend-label');
    if (dot)   dot.className    = 'w-1.5 h-1.5 rounded-full bg-green-400';
    if (label) label.textContent = 'API Online';
    navigate('settings');
  } catch (err) {
    AppState.settings.useBackend = false;
    saveSettings();
    showToast(`❌ Cannot reach ${rawUrl} — start Flask first`, 'error');
    const dot   = document.getElementById('backend-dot');
    const label = document.getElementById('backend-label');
    if (dot)   dot.className    = 'w-1.5 h-1.5 rounded-full bg-gray-500';
    if (label) label.textContent = 'Offline';
    navigate('settings');
  }
}

function settingToggleNotif(key, value) {
  AppState.settings.notifications[key] = value;
  saveSettings();
  showToast(`${value ? 'Enabled' : 'Disabled'} ${key}`, 'info');
}

function settingToggle(key, value) {
  AppState.settings[key] = value;
  saveSettings();
}

function settingsExport() {
  const data = {
    user: AppState.user, scans: AppState.scans,
    sensors: AppState.sensors, appointments: AppState.appointments,
    exportedAt: new Date().toISOString(), version: '2.0',
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = `oralai-export-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  showToast('Data exported successfully!', 'success');
}

function settingsClearCache() {
  if ('caches' in window) {
    caches.keys().then(keys => keys.forEach(k => caches.delete(k)));
  }
  showToast('App cache cleared — reload to re-cache', 'success');
}

function settingsClearAll() {
  if (!confirm('⚠️ Delete ALL data and sign out?\n\nThis removes scans, settings, appointments, and your account. This cannot be undone.')) return;
  Store.clearAll();
  Store.setLoggedIn(false);
  AppState.user = null;
  location.reload();
}

function _calcStorage() {
  try {
    let bytes = 0;
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('oralai')) bytes += (localStorage[key]?.length || 0) * 2;
    }
    return bytes > 1024 * 1024
      ? (bytes / 1024 / 1024).toFixed(1) + ' MB'
      : (bytes / 1024).toFixed(0) + ' KB';
  } catch { return '—'; }
}
