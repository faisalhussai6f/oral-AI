// ── Profile Page ──
function pageProfile() {
  const user       = AppState.user || { name:'Demo User', email:'demo@oralai.com' };
  const settings   = AppState.settings;
  const initials   = user.name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
  const notif      = settings.notifications || {};
  const backendUrl = settings.backendUrl || 'http://localhost:5000';

  // Avatar colour stored in user.avatarColor as "from,to"
  const AVATAR_COLORS = [
    ['#0a8aff','#0070eb'],
    ['#10b981','#059669'],
    ['#a78bfa','#7c3aed'],
    ['#f59e0b','#d97706'],
    ['#ef4444','#dc2626'],
    ['#ec4899','#db2777'],
    ['#06b6d4','#0891b2'],
    ['#f97316','#ea580c'],
  ];
  const currentColor = user.avatarColor || (AVATAR_COLORS[0][0] + ',' + AVATAR_COLORS[0][1]);
  const [c1, c2]     = currentColor.split(',');

  // Treatment count from localStorage
  const treatCount = (Store.get('oralai_treatments') || []).length;

  return `
  <div class="max-w-3xl mx-auto space-y-6">

    <h2 class="text-2xl font-bold text-white">My Profile</h2>

    <!-- Profile card with avatar colour picker -->
    <div class="card">
      <div class="flex flex-col sm:flex-row items-start sm:items-center gap-5">
        <div class="relative flex-shrink-0">
          <div id="profile-avatar"
               class="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-2xl font-black cursor-pointer select-none"
               style="background:linear-gradient(135deg,${c1},${c2})"
               onclick="toggleAvatarPicker()" title="Click to change colour">
            ${initials}
          </div>
          <span class="absolute -bottom-1 -right-1 w-5 h-5 bg-gray-800 border border-gray-700 rounded-full flex items-center justify-center text-xs cursor-pointer" onclick="toggleAvatarPicker()">🎨</span>
          <!-- Colour picker popup -->
          <div id="avatar-picker"
               class="hidden absolute left-0 top-24 z-20 bg-gray-900 border border-gray-700 rounded-xl p-3 shadow-2xl">
            <p class="text-xs text-gray-500 mb-2 font-semibold uppercase tracking-wide">Avatar Colour</p>
            <div class="grid grid-cols-4 gap-2">
              ${AVATAR_COLORS.map(([a,b]) => `
                <button onclick="setAvatarColor('${a},${b}')"
                  class="w-9 h-9 rounded-lg border-2 transition-all hover:scale-110 ${currentColor===a+','+b?'border-white scale-110':'border-transparent'}"
                  style="background:linear-gradient(135deg,${a},${b})" title="${a}">
                </button>`).join('')}
            </div>
            <button onclick="toggleAvatarPicker()" class="mt-2 text-xs text-gray-600 hover:text-gray-400 w-full text-center">Close</button>
          </div>
        </div>
        <div class="flex-1 min-w-0">
          <h3 class="text-xl font-bold text-white truncate">${user.name}</h3>
          <p class="text-gray-400 text-sm truncate">${user.email}</p>
          <p class="text-gray-500 text-xs mt-0.5">Joined: ${user.joinedDate
            ? new Date(user.joinedDate).toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'})
            : 'N/A'}</p>
          <div class="flex gap-2 mt-2 flex-wrap">
            <span class="px-2.5 py-1 rounded-full bg-brand-500/20 text-brand-300 text-xs font-semibold">Patient</span>
            <span class="px-2.5 py-1 rounded-full bg-green-500/20 text-green-300 text-xs font-semibold">Active</span>
            ${Store.isLoggedIn() ? '<span class="px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-semibold">Synced</span>' : ''}
          </div>
        </div>
        <div class="flex flex-col gap-2 flex-shrink-0">
          <button onclick="editProfile()" class="btn-secondary text-sm">Edit Profile</button>
          <button onclick="confirmLogout()"
            class="text-xs px-3 py-2 rounded-lg border border-gray-700 text-gray-500 hover:border-red-800 hover:text-red-400 transition-colors">
            Sign Out
          </button>
        </div>
      </div>
    </div>

    <!-- Personal info form -->
    <div class="card" id="profile-view">
      <h3 class="font-semibold text-white mb-4">Personal Information</h3>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label class="form-label">Full Name</label>
          <input id="pf-name"  class="form-input" value="${user.name}"  readonly />
        </div>
        <div>
          <label class="form-label">Email</label>
          <input id="pf-email" class="form-input" value="${user.email}" readonly />
        </div>
        <div>
          <label class="form-label">Date of Birth</label>
          <input id="pf-dob" type="date" class="form-input" value="${user.dob||''}" readonly />
        </div>
        <div>
          <label class="form-label">Language</label>
          <select id="pf-lang" class="form-input" disabled>
            <option>English</option><option>Hindi</option><option>Kannada</option>
          </select>
        </div>
      </div>
      <div class="flex gap-3 mt-4 hidden" id="profile-save-row">
        <button onclick="saveProfile()" class="btn-primary">Save Changes</button>
        <button onclick="cancelEdit()" class="btn-secondary">Cancel</button>
      </div>
    </div>

    <!-- Health summary stats (includes treatment count) -->
    <div class="card">
      <h3 class="font-semibold text-white mb-4">Health Summary</h3>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        ${[
          ['🦷', AppState.scans.length,
           'Scans',        'scans'],
          ['📊', Math.round(AppState.scans.reduce((a,s)=>a+s.score,0)/(AppState.scans.length||1)),
           'Avg Score',    'analytics'],
          ['📅', AppState.appointments.filter(a=>a.status!=='cancelled').length,
           'Appointments', 'telehealth'],
          ['💊', treatCount,
           'Treatments',   'treatments'],
        ].map(([icon, val, label, page]) => `
          <div class="text-center p-4 rounded-xl bg-gray-900 border border-gray-800 cursor-pointer hover:border-brand-500/30 transition-colors"
               onclick="navigate('${page}')">
            <div class="text-2xl mb-1">${icon}</div>
            <div class="text-2xl font-black text-white">${val}</div>
            <div class="text-xs text-gray-500 mt-1">${label}</div>
          </div>`).join('')}
      </div>
    </div>

    <!-- Backend settings -->
    <div class="card">
      <h3 class="font-semibold text-white mb-4 flex items-center gap-2">
        ⚙️ Backend &amp; AI Settings
        <span id="backend-badge" class="text-xs px-2 py-0.5 rounded-full ${settings.useBackend?'bg-green-500/20 text-green-300':'bg-yellow-500/20 text-yellow-300'}">
          ${settings.useBackend?'Online':'Offline'}
        </span>
      </h3>
      <div class="space-y-4">
        <div>
          <label class="form-label">Flask Backend URL</label>
          <div class="flex gap-2">
            <input id="backend-url-input" class="form-input flex-1" value="${backendUrl}" placeholder="http://localhost:5000" />
            <button onclick="testBackend()" class="btn-secondary text-sm px-4 flex-shrink-0">Test</button>
          </div>
          <p class="text-xs text-gray-500 mt-1.5">Start the Flask server, then click Test to enable real CNN inference.</p>
        </div>
        <div class="p-3 rounded-xl bg-gray-900 border border-gray-800 text-sm">
          <div class="font-semibold text-gray-200 mb-2">Start Flask backend:</div>
          <div class="font-mono text-xs text-green-400 bg-gray-950 p-2 rounded-lg select-all">cd oral-health-ai\backend<br/>python -m venv .venv<br/>.\.venv\Scripts\activate<br/>pip install -r requirements.txt<br/>python app.py</div>
        </div>
      </div>
    </div>

    <!-- Notification settings -->
    <div class="card">
      <h3 class="font-semibold text-white mb-4">Notification Settings</h3>
      <div class="space-y-3">
        ${[
          ['scanReminders',     'Scan Reminders',              'Monthly scan due alerts',                          notif.scanReminders],
          ['aiRecommendations', 'AI Recommendations',          'Personalised oral health tips',                    notif.aiRecommendations],
          ['dentistAlerts',     'Dentist Consultation Alerts', 'Alerts when a dentist reviews your report',        notif.dentistAlerts],
          ['sensorAlerts',      'IoT Sensor Alerts',           'Notifications when sensor readings are abnormal',  notif.sensorAlerts],
        ].map(([key,title,desc,checked]) => `
          <div class="flex items-center justify-between p-3 rounded-xl bg-gray-900 border border-gray-800">
            <div>
              <div class="text-sm font-semibold text-gray-200">${title}</div>
              <div class="text-xs text-gray-500 mt-0.5">${desc}</div>
            </div>
            <label class="relative inline-flex items-center cursor-pointer flex-shrink-0">
              <input type="checkbox" ${checked?'checked':''} class="sr-only peer"
                onchange="toggleNotif('${key}', this.checked)" />
              <div class="w-10 h-5 bg-gray-700 peer-checked:bg-brand-500 rounded-full transition-colors duration-200
                          after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white
                          after:rounded-full after:h-4 after:w-4 after:transition-all
                          peer-checked:after:translate-x-5"></div>
            </label>
          </div>`).join('')}
      </div>
    </div>

    <!-- Data management -->
    <div class="card">
      <h3 class="font-semibold text-white mb-4">Data Management</h3>
      <div class="flex flex-wrap gap-3">
        <button onclick="exportData()"       class="btn-secondary text-sm flex items-center gap-2">📥 Export JSON</button>
        <button onclick="navigate('progress')" class="btn-secondary text-sm flex items-center gap-2">📈 Progress Report</button>
        <button onclick="confirmClearData()"
          class="text-sm px-4 py-2 rounded-lg border border-red-800 text-red-400 hover:bg-red-900/20 transition-colors flex items-center gap-2">
          🗑️ Clear All Data
        </button>
      </div>
      <p class="text-xs text-gray-600 mt-3">All data is stored locally in your browser's localStorage. No data is sent to external servers unless the Flask backend is active.</p>
    </div>

    <!-- About -->
    <div class="card">
      <h3 class="font-semibold text-white mb-3">About OralAI</h3>
      <p class="text-sm text-gray-400 mb-3">Real-Time Oral Disease Detection System integrating IoT sensors with AI.</p>
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
        ${[
          ['CNN Model',     'Disease Classification'],
          ['IoT Sensors',   'Biosensor Data'],
          ['Edge Computing','Low-latency AI'],
          ['Flask Backend', 'REST API + CORS'],
          ['PWA',           'Offline Support'],
          ['localStorage',  'Persistent Data'],
        ].map(([t,s])=>`
          <div class="p-2.5 rounded-lg bg-gray-900 border border-gray-800">
            <div class="font-semibold text-gray-200">${t}</div>
            <div class="text-gray-600 mt-0.5">${s}</div>
          </div>`).join('')}
      </div>
      <div class="mt-4 pt-4 border-t border-gray-800 text-xs text-gray-600 text-center">
        OralAI v2.0 · Bearys Institute of Technology · AI &amp; Data Science · Karnataka, India
      </div>
      <div class="mt-3 flex justify-center gap-3 flex-wrap text-xs">
        <button onclick="replayTour()"             class="text-brand-400 hover:underline">🚀 App Tour</button>
        <span class="text-gray-700">·</span>
        <button onclick="navigate('notifications')" class="text-gray-400 hover:text-gray-300 hover:underline">🔔 Notifications</button>
        <span class="text-gray-700">·</span>
        <button onclick="navigate('settings')"      class="text-gray-400 hover:text-gray-300 hover:underline">⚙️ Settings</button>
      </div>
    </div>

  </div>
  `;
}

// ── Avatar colour picker ──
function toggleAvatarPicker() {
  document.getElementById('avatar-picker')?.classList.toggle('hidden');
}

function setAvatarColor(colorPair) {
  const [c1, c2] = colorPair.split(',');
  AppState.user  = { ...AppState.user, avatarColor: colorPair };
  Store.saveUser(AppState.user);
  // Update avatar in profile and nav instantly (no full re-render)
  const profileAvatar = document.getElementById('profile-avatar');
  if (profileAvatar) profileAvatar.style.background = `linear-gradient(135deg,${c1},${c2})`;
  const navAvatar = document.getElementById('nav-avatar');
  if (navAvatar)     navAvatar.style.background     = `linear-gradient(135deg,${c1},${c2})`;
  document.getElementById('avatar-picker')?.classList.add('hidden');
  showToast('Avatar colour updated!', 'success');
}

// Close picker on outside click
document.addEventListener('click', (e) => {
  const picker = document.getElementById('avatar-picker');
  const avatar = document.getElementById('profile-avatar');
  if (picker && !picker.classList.contains('hidden') &&
      !picker.contains(e.target) && !avatar?.contains(e.target)) {
    picker.classList.add('hidden');
  }
});

// ── Profile edit / save ──
function editProfile() {
  ['pf-name','pf-email','pf-dob','pf-lang'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.removeAttribute('readonly'); el.removeAttribute('disabled'); }
  });
  document.getElementById('profile-save-row')?.classList.remove('hidden');
}

function cancelEdit() {
  ['pf-name','pf-email','pf-dob','pf-lang'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.setAttribute('readonly',''); el.setAttribute('disabled',''); }
  });
  document.getElementById('profile-save-row')?.classList.add('hidden');
}

function saveProfile() {
  const name  = document.getElementById('pf-name')?.value.trim();
  const email = document.getElementById('pf-email')?.value.trim();
  const dob   = document.getElementById('pf-dob')?.value;
  if (!name || !email) { showToast('Name and email are required','error'); return; }
  AppState.user = { ...AppState.user, name, email, dob };
  Store.saveUser(AppState.user);
  const av = document.getElementById('nav-avatar');
  const un = document.getElementById('nav-username');
  if (av) av.textContent = name.charAt(0).toUpperCase();
  if (un) un.textContent = name;
  showToast('Profile saved!', 'success');
  cancelEdit();
}

// ── Logout with confirmation ──
function confirmLogout() {
  const overlay = document.createElement('div');
  overlay.id = 'logout-confirm';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:300;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px);';
  overlay.innerHTML = `
    <div style="background:#0d1117;border:1px solid #1e2a3a;border-radius:16px;padding:28px;max-width:360px;width:100%;text-align:center;space-y:16px;">
      <div style="font-size:2.5rem;margin-bottom:12px;">👋</div>
      <h3 style="color:#f1f5f9;font-size:1.2rem;font-weight:700;margin-bottom:8px;">Sign out of OralAI?</h3>
      <p style="color:#94a3b8;font-size:0.875rem;margin-bottom:20px;line-height:1.6;">
        Your data is saved locally. You can sign back in anytime.
      </p>
      <div style="display:flex;gap:10px;justify-content:center;">
        <button onclick="document.getElementById('logout-confirm').remove()"
          style="background:#1e2a3a;border:1px solid #334155;color:#94a3b8;padding:10px 20px;border-radius:8px;cursor:pointer;font-weight:600;font-size:0.875rem;">
          Stay
        </button>
        <button onclick="document.getElementById('logout-confirm').remove(); handleLogout();"
          style="background:linear-gradient(135deg,#ef4444,#dc2626);border:none;color:#fff;padding:10px 22px;border-radius:8px;cursor:pointer;font-weight:700;font-size:0.875rem;">
          Sign Out
        </button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
}

// ── Notification toggle ──
function toggleNotif(key, value) {
  AppState.settings.notifications[key] = value;
  saveSettings();
  showToast(`${value ? 'Enabled' : 'Disabled'} ${key}`, 'info');
}

// ── Backend test ──
async function testBackend() {
  const urlInput = document.getElementById('backend-url-input');
  const url      = (urlInput?.value.trim() || 'http://localhost:5000').replace(/\/$/, '');
  AppState.settings.backendUrl = url;
  saveSettings();
  showToast('Testing connection…', 'info');
  try {
    const r = await fetch(url + '/health', { signal: AbortSignal.timeout(4000) });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const data = await r.json();
    AppState.settings.useBackend = true;
    saveSettings();
    const modelTxt = data.model_loaded
      ? `✅ Backend online — model: ${data.model}`
      : `✅ Backend online — mock mode (${data.model})`;
    showToast(modelTxt, 'success');
    const badge = document.getElementById('backend-badge');
    const dot   = document.getElementById('backend-dot');
    const label = document.getElementById('backend-label');
    if (badge) { badge.className = 'text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-300'; badge.textContent = 'Online'; }
    if (dot)   dot.className   = 'w-1.5 h-1.5 rounded-full bg-green-400';
    if (label) label.textContent = 'API Online';
    // Re-render settings page with updated state
    navigate('settings');
  } catch (err) {
    AppState.settings.useBackend = false;
    saveSettings();
    showToast('❌ Backend unreachable — is Flask running on ' + url + '?', 'error');
    const dot   = document.getElementById('backend-dot');
    const label = document.getElementById('backend-label');
    if (dot)   dot.className   = 'w-1.5 h-1.5 rounded-full bg-gray-500';
    if (label) label.textContent = 'Offline';
  }
}

// ── Data export / clear ──
function exportData() {
  const data = {
    user: AppState.user, scans: AppState.scans,
    sensors: AppState.sensors, appointments: AppState.appointments,
    exportedAt: new Date().toISOString(), version: '2.0',
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type:'application/json' });
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = `oralai-export-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  showToast('Data exported successfully!', 'success');
}

function confirmClearData() {
  if (confirm('⚠️ Delete ALL data including scans, appointments, and settings?\n\nThis cannot be undone.')) {
    Store.clearAll();
    Store.setLoggedIn(false);
    AppState.user = null;
    location.reload();
  }
}

// ── Replay tour ──
function replayTour() {
  if (typeof resetOnboarding === 'function') resetOnboarding();
  if (typeof showOnboarding  === 'function') showOnboarding();
}
