// ── AppState — loaded from Store on boot ──
const AppState = {
  user: null,
  scans: [],
  sensors: {},
  settings: {},
  appointments: [],
};

// ── Hydrate AppState from localStorage ──
function hydrateState() {
  AppState.scans        = Store.loadScans();
  AppState.sensors      = Store.loadSensors();
  AppState.settings     = Store.loadSettings();
  AppState.appointments = Store.loadAppointments();
}

// ── Persist helpers (call after any mutation) ──
function saveScans()   { Store.saveScans(AppState.scans); }
function saveSensors() { Store.saveSensors(AppState.sensors); }
function saveSettings(){ Store.saveSettings(AppState.settings); }
function saveAppts()   { Store.saveAppointments(AppState.appointments); }

// ── App Shell ──
function renderShell() {
  const u    = AppState.user || { name:'Demo User', email:'demo@oralai.com', role:'patient' };
  const role = u.role || 'patient';
  const initials  = u.name.charAt(0).toUpperCase();
  const [ac1,ac2] = (u.avatarColor || '#00d4aa,#06b6d4').split(',');

  const roleMeta = {
    patient: { label:'Patient', bg:'bg-brand-500/15',  text:'text-brand-400',  border:'border-brand-500/30'  },
    doctor:  { label:'Doctor',  bg:'bg-accent-500/15', text:'text-accent-400', border:'border-accent-500/30' },
    admin:   { label:'Admin',   bg:'bg-yellow-500/15', text:'text-yellow-400', border:'border-yellow-500/30' },
  };
  const rm = roleMeta[role] || roleMeta.patient;

  const pendingReviews = role === 'doctor'
    ? Store.loadDoctorQueue(u.email).filter(q => !q.reviewed).length
    : 0;
  const pendingBadge = pendingReviews > 0
    ? `<span class="ml-auto text-xs bg-accent-500 text-white px-1.5 py-0.5 rounded-full font-bold">${pendingReviews}</span>`
    : '';

  const patientNav = `
    <div class="sidebar-section-label">My Health</div>
    <div class="nav-item" data-page="patient_dashboard" onclick="navigate('patient_dashboard')">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1" stroke-width="2"/><rect x="14" y="3" width="7" height="7" rx="1" stroke-width="2"/><rect x="3" y="14" width="7" height="7" rx="1" stroke-width="2"/><rect x="14" y="14" width="7" height="7" rx="1" stroke-width="2"/></svg>
      Dashboard
    </div>
    <div class="nav-item" data-page="upload" onclick="navigate('upload')">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
      Upload Scan
    </div>
    <div class="nav-item" data-page="scans" onclick="navigate('scans')">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
      My Scans
    </div>
    <div class="nav-item" data-page="compare" onclick="navigate('compare')">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
      Compare Scans
    </div>
    <div class="sidebar-section-label mt-3">Monitoring</div>
    <div class="nav-item" data-page="sensors" onclick="navigate('sensors')">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
      IoT Sensors
    </div>
    <div class="nav-item" data-page="analytics" onclick="navigate('analytics')">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
      Analytics
    </div>
    <div class="sidebar-section-label mt-3">Care</div>
    <div class="nav-item" data-page="telehealth" onclick="navigate('telehealth')">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.069A1 1 0 0121 8.868v6.264a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"/></svg>
      Tele-Dentistry
    </div>
    <div class="nav-item" data-page="symptom" onclick="navigate('symptom')">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
      Symptom Checker
    </div>
    <div class="nav-item" data-page="reminders" onclick="navigate('reminders')">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
      Reminders
    </div>
    <div class="nav-item" data-page="family" onclick="navigate('family')">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
      Family Profiles
    </div>
    <div class="nav-item" data-page="privacy" onclick="navigate('privacy')">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"/></svg>
      Privacy &amp; Sharing
    </div>
    <div class="nav-item" data-page="treatments" onclick="navigate('treatments')">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/></svg>
      Treatment Log
    </div>
    <div class="nav-item" data-page="calculator" onclick="navigate('calculator')">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
      Score Calculator
    </div>`;

  const doctorNav = `
    <div class="sidebar-section-label">Clinical</div>
    <div class="nav-item" data-page="doctor_dashboard" onclick="navigate('doctor_dashboard')">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1" stroke-width="2"/><rect x="14" y="3" width="7" height="7" rx="1" stroke-width="2"/><rect x="3" y="14" width="7" height="7" rx="1" stroke-width="2"/><rect x="14" y="14" width="7" height="7" rx="1" stroke-width="2"/></svg>
      Dashboard
    </div>
    <div class="nav-item" data-page="doctor_queue" onclick="navigate('doctor_queue')">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
      Review Queue ${pendingBadge}
    </div>
    <div class="nav-item" data-page="clinic" onclick="navigate('clinic')">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
      Clinic Analytics
    </div>
    <div class="nav-item" data-page="telehealth" onclick="navigate('telehealth')">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.069A1 1 0 0121 8.868v6.264a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"/></svg>
      Consultations
    </div>
    <div class="nav-item" data-page="iot_health" onclick="navigate('iot_health')">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"/></svg>
      IoT Device Health
    </div>`;

  const adminNav = `
    <div class="sidebar-section-label">Administration</div>
    <div class="nav-item" data-page="admin_dashboard" onclick="navigate('admin_dashboard')">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1" stroke-width="2"/><rect x="14" y="3" width="7" height="7" rx="1" stroke-width="2"/><rect x="3" y="14" width="7" height="7" rx="1" stroke-width="2"/><rect x="14" y="14" width="7" height="7" rx="1" stroke-width="2"/></svg>
      Dashboard
    </div>
    <div class="nav-item" data-page="clinic" onclick="navigate('clinic')">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
      Clinic Analytics
    </div>
    <div class="nav-item" data-page="audit" onclick="navigate('audit')">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
      Audit Logs
    </div>`;

  const sharedAccountNav = `
    <div class="sidebar-section-label mt-3">Account</div>
    <div class="nav-item" data-page="notifications" onclick="navigate('notifications')">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
      Notifications
      <span class="ml-auto text-xs bg-brand-500 text-white px-1.5 py-0.5 rounded-full font-bold" id="nav-notif-count" style="display:none">0</span>
    </div>
    <div class="nav-item" data-page="settings" onclick="navigate('settings')">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
      Settings
    </div>
    <div class="nav-item" data-page="accessibility" onclick="navigate('accessibility')">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"/></svg>
      Language &amp; A11y
    </div>
    <div class="nav-item" data-page="profile" onclick="navigate('profile')">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
      Profile
    </div>
    <div class="nav-item" onclick="handleLogout()">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
      Logout
    </div>`;

  const roleNav = role === 'doctor' ? doctorNav
               : role === 'admin'  ? adminNav
               :                     patientNav;

  const topbarAction = role === 'doctor'
    ? `<button onclick="navigate('doctor_queue')" class="btn-primary text-xs px-3 py-2 hidden sm:flex gap-1.5 items-center" style="background:linear-gradient(135deg,#a855f7,#6366f1)">
         <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
         Review Queue
       </button>`
    : `<button onclick="navigate('upload')" class="btn-primary text-xs px-3 py-2 hidden sm:flex gap-1.5 items-center">
         <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
         New Scan
       </button>`;

  document.getElementById('app').innerHTML = `
    <nav id="sidebar">
      <div style="padding:20px 16px 16px;border-bottom:1px solid var(--border)">
        <div class="flex items-center gap-3">
          <div style="width:36px;height:36px;border-radius:10px;background:var(--gradient);display:flex;align-items:center;justify-content:center;font-size:1.2rem;flex-shrink:0">🦷</div>
          <div>
            <div style="font-weight:800;font-size:.95rem;color:var(--text-base)">OralAI</div>
            <div style="font-size:.7rem;color:var(--text-dim)">${role === 'doctor' ? 'Doctor Portal' : role === 'admin' ? 'Admin Portal' : 'Patient Portal'}</div>
          </div>
        </div>
      </div>
      <div class="p-4 overflow-y-auto" style="max-height:calc(100vh - 180px);">
        <div class="flex items-center gap-3 p-3 rounded-xl bg-gray-900 mb-4 border border-gray-800">
          <div class="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0" id="nav-avatar" style="background:linear-gradient(135deg,${ac1},${ac2})">${initials}</div>
          <div class="min-w-0 flex-1">
            <div class="text-sm font-semibold text-gray-200 truncate" id="nav-username">${u.name}</div>
            <div class="text-xs text-gray-500 truncate">${u.email}</div>
          </div>
          <span class="text-xs px-2 py-0.5 rounded-full font-semibold border flex-shrink-0 ${rm.bg} ${rm.text} ${rm.border}">${rm.label}</span>
        </div>
        ${roleNav}
        ${sharedAccountNav}
      </div>
      <!-- IoT live badge (bottom of sidebar) -->
      <div class="mx-3 mb-3 p-3 rounded-xl" style="background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.10)">
        <div class="flex items-center gap-2 mb-1">
          <div class="w-2 h-2 rounded-full pulse-dot" style="background:#67B89B"></div>
          <span class="text-xs font-semibold" style="color:#9BA49E">IoT Device Online</span>
        </div>
        <div class="text-xs" style="color:#515856">Intraoral Camera OK &nbsp;pH Sensor OK &nbsp;Temp OK</div>
      </div>
    </nav>

    <div id="main-content">
      <div id="topbar">
        <div class="flex items-center gap-3">
          <button onclick="toggleSidebar()" class="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition-colors" aria-label="Toggle sidebar">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
          </button>
          <span class="text-gray-200 font-semibold text-sm" id="topbar-title">Dashboard</span>
          <span id="topbar-family-badge" class="hidden text-xs px-2 py-0.5 rounded-full font-semibold border" style="max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"></span>
        </div>
        <div class="flex items-center gap-2">
          <button id="pwa-install-btn" class="hidden btn-secondary text-xs px-3 py-1.5 flex items-center gap-1" onclick="installPWA()">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
            Install App
          </button>
          <div id="backend-status" class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gray-900 border border-gray-800 cursor-pointer" onclick="navigate('profile')" title="Backend status">
            <div class="w-1.5 h-1.5 rounded-full bg-gray-500" id="backend-dot"></div>
            <span class="text-xs text-gray-400" id="backend-label">Offline</span>
          </div>
          ${topbarAction}
          <button onclick="toggleTheme()" class="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-gray-800 transition-colors" aria-label="Toggle theme">
            <span id="theme-icon" class="text-base">☀</span>
          </button>
          <button onclick="navigate('settings')" class="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-gray-800 transition-colors" aria-label="Settings">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
          </button>
          <button class="relative text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-gray-800 transition-colors" onclick="openNotifications()" aria-label="Notifications">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
            <span class="absolute top-0.5 right-0.5 w-2 h-2 bg-brand-500 rounded-full border border-gray-900" id="notif-dot"></span>
          </button>
        </div>
      </div>
      <div id="page-content" class="overflow-y-auto" style="height:calc(100vh - 60px); padding:24px 20px;"></div>
    </div>

    <div id="toast"></div>
    <div id="sidebar-overlay" class="fixed inset-0 bg-black/60 z-40 hidden" onclick="toggleSidebar()"></div>
    <button id="back-to-top" onclick="scrollToTop()" aria-label="Back to top" title="Back to top">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 15l7-7 7 7"/>
      </svg>
    </button>
    <div id="notif-panel" class="hidden fixed top-16 right-4 z-50 w-80 shadow-2xl" style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-md)">
      <div class="flex items-center justify-between mb-3 p-4 pb-0">
        <span class="font-bold text-sm" style="font-family:Manrope,sans-serif;color:var(--text-base)">Notifications</span>
        <button onclick="closeNotifications()" class="text-xs px-2 py-1 rounded-lg transition-colors" style="color:var(--text-dim)">✕ Close</button>
      </div>
      <div class="space-y-1 p-3">
        ${[
          ['🦷','Scan reminder: Monthly scan due in 3 days','2 hours ago'],
          ['🤖','AI tip: Increase flossing frequency','Yesterday'],
          ['📅','Appointment confirmed: Dr. Arjun Sharma','2 days ago'],
          ['⚠','pH sensor reading slightly low (6.4)','3 days ago'],
        ].map(([icon,msg,time]) => `
          <div class="flex gap-3 p-2.5 rounded-xl cursor-pointer transition-colors hover:bg-opacity-50" style="background:transparent" onmouseover="this.style.background='var(--surface2)'" onmouseout="this.style.background='transparent'">
            <span class="text-base flex-shrink-0">${icon}</span>
            <div><p class="text-xs" style="color:var(--text-base)">${msg}</p><p class="text-xs mt-0.5" style="color:var(--text-dim)">${time}</p></div>
          </div>`).join('')}
      </div>
      <div class="p-3 pt-0">
        <button class="w-full text-center text-xs py-2 rounded-lg font-semibold transition-colors" style="color:var(--brand)" onclick="closeNotifications()">Mark all read</button>
      </div>
    </div>
  `;
}

// ── Role-aware home navigation — never go to generic 'dashboard' ──
function navigateHome() {
  const role = AppState.user?.role || 'patient';
  const home = role === 'doctor' ? 'doctor_dashboard'
             : role === 'admin'  ? 'admin_dashboard'
             :                    'patient_dashboard';
  navigate(home);
}

// ── Unified navigate ──
function navigate(page, params = {}) {
  // Intercept generic 'dashboard' → always redirect to role-specific home
  if (page === 'dashboard') {
    const role = AppState.user?.role || 'patient';
    page = role === 'doctor' ? 'doctor_dashboard'
         : role === 'admin'  ? 'admin_dashboard'
         :                    'patient_dashboard';
  }
  Router.navigate(page, params);
  _syncNav(page);
}

function _syncNav(page) {
  const activeMap = {
    report:           'scans',
    printreport:      'scans',
    compare:          'compare',
    notifications:    'notifications',
    settings:         'settings',
    symptom:          'symptom',
    reminders:        'reminders',
    dentist:          'dentist',
    iot_health:       'iot_health',
    clinic:           'clinic',
    audit:            'privacy',
    camera:           'upload',
    family:           'family',
    accessibility:    'accessibility',
    privacy:          'privacy',
    progress:         'scans',
    patient_dashboard:'patient_dashboard',
    doctor_dashboard: 'doctor_dashboard',
    doctor_queue:     'doctor_queue',
    doctor_review:    'doctor_queue',
    admin_dashboard:  'admin_dashboard',
    '404':            '',
  };
  const activePage = activeMap[page] !== undefined ? activeMap[page] : page;
  document.querySelectorAll('.nav-item[data-page]').forEach(el => {
    el.classList.toggle('active', !!activePage && el.dataset.page === activePage);
  });
}

function toggleSidebar() {
  const sb = document.getElementById('sidebar');
  const ov = document.getElementById('sidebar-overlay');
  if (window.innerWidth < 768) {
    const open = sb.classList.toggle('open');
    ov.classList.toggle('hidden', !open);
  } else {
    sb.classList.toggle('collapsed');
    document.getElementById('main-content').classList.toggle('expanded');
  }
}

function openNotifications() {
  document.getElementById('notif-panel').classList.remove('hidden');
  document.getElementById('notif-dot').classList.add('hidden');
}
function closeNotifications() {
  document.getElementById('notif-panel').classList.add('hidden');
}

// ── Toast ──
function showToast(msg, type = 'info') {
  const t = document.getElementById('toast');
  if (!t) return;
  const icons = { success:'✓', error:'✕', info:'i', warning:'!' };
  const div = document.createElement('div');
  div.className = `toast-msg ${type}`;
  div.innerHTML = `<span style="font-weight:800;font-size:1rem">${icons[type] || 'i'}</span><span>${msg}</span>`;
  t.appendChild(div);
  setTimeout(() => { div.style.opacity='0'; div.style.transform='translateY(10px)'; setTimeout(()=>div.remove(),300); }, 3200);
}

// ── Logout ──
function handleLogout() {
  Store.setLoggedIn(false);
  AppState.user = null;
  document.getElementById('app').innerHTML = '';
  renderLoginPage();
}

// ── Page title + active nav sync on render ──
document.addEventListener('page:rendered', (e) => {
  const titles = {
    dashboard:        'Dashboard',
    patient_dashboard:'Patient Dashboard',
    doctor_dashboard: 'Doctor Dashboard',
    doctor_queue:     'Review Queue',
    doctor_review:    'Clinical Review',
    admin_dashboard:  'Admin Dashboard',
    upload:           'Upload Scan',
    scans:            'My Scans',
    sensors:          'IoT Sensors',
    analytics:        'Analytics',
    profile:          'Profile',
    report:           'Scan Report',
    printreport:      'Printable Report',
    telehealth:       'Tele-Dentistry',
    calculator:       'Score Calculator',
    treatments:       'Treatment Log',
    progress:         'Progress Report',
    compare:          'Compare Scans',
    camera:           'Camera Guidance',
    symptom:          'Symptom Checker',
    reminders:        'Reminders',
    dentist:          'Dentist Review',
    family:           'Family Profiles',
    accessibility:    'Language & Accessibility',
    iot_health:       'IoT Device Health',
    clinic:           'Clinic Analytics',
    privacy:          'Privacy Controls',
    audit:            'Audit Trail',
    notifications:    'Notifications',
    settings:         'Settings',
    '404':            'Not Found',
  };
  const el = document.getElementById('topbar-title');
  if (el) el.textContent = titles[e.detail.page] || 'OralAI';
  _syncNav(e.detail.page);
});

// ── Theme ──
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  document.body.classList.toggle('theme-dark',  theme === 'dark');
  document.body.classList.toggle('theme-light', theme !== 'dark');
  const icon = document.getElementById('theme-icon');
  if (icon) icon.textContent = theme === 'dark' ? '☀' : '🌙';
}
function toggleTheme() {
  const current = AppState.settings.theme || 'dark';
  const next    = current === 'dark' ? 'light' : 'dark';
  AppState.settings.theme = next;
  saveSettings();
  applyTheme(next);
  showToast(`Switched to ${next} mode`, 'info');
}

// ── Backend health check ──
async function checkBackend() {
  const base  = AppState.settings.backendUrl || 'http://localhost:5000';
  const url   = base.replace(/\/$/, '') + '/health';
  const dot   = document.getElementById('backend-dot');
  const label = document.getElementById('backend-label');
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (r.ok) {
      const data = await r.json().catch(() => ({}));
      const isReal  = data.model_loaded === true;
      const modelId = data.model || 'unknown';
      if (dot)   dot.className    = 'w-1.5 h-1.5 rounded-full bg-green-400';
      if (label) label.textContent = isReal ? 'API Online' : 'API Demo';
      const el = document.getElementById('backend-status');
      if (el) el.title = `Backend online — model: ${modelId}`;
      // Auto-enable real inference when backend is reachable
      AppState.settings.useBackend = true;
      AppState.settings._backendModelId = modelId;
      AppState.settings._backendModelLoaded = isReal;
    } else {
      if (dot)   dot.className    = 'w-1.5 h-1.5 rounded-full bg-yellow-400';
      if (label) label.textContent = 'API Error';
      AppState.settings.useBackend = false;
    }
  } catch {
    if (dot)   dot.className    = 'w-1.5 h-1.5 rounded-full bg-gray-500';
    if (label) label.textContent = 'Offline';
    AppState.settings.useBackend = false;
  }
}

// ── PWA install prompt ──
let _pwaPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  _pwaPrompt = e;
  const btn = document.getElementById('pwa-install-btn');
  if (btn) btn.classList.remove('hidden');
});
async function installPWA() {
  if (!_pwaPrompt) { showToast('Open in Chrome/Edge to install as app','info'); return; }
  _pwaPrompt.prompt();
  const { outcome } = await _pwaPrompt.userChoice;
  if (outcome === 'accepted') showToast('OralAI installed successfully!','success');
  _pwaPrompt = null;
  const btn = document.getElementById('pwa-install-btn');
  if (btn) btn.classList.add('hidden');
}

// ── Boot ──
window.addEventListener('DOMContentLoaded', () => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  hydrateState();
  // Migrate: if user had old 'dark' default, reset to 'light' for new warm theme
  if (!Store.get('oralai_theme_v4_migrated')) {
    if (AppState.settings.theme === 'dark') {
      AppState.settings.theme = 'light';
      Store.saveSettings(AppState.settings);
    }
    Store.set('oralai_theme_v4_migrated', true);
  }
  ImageDB.stampAll(AppState.scans).then(() => {
    const cur = Router?.current?.page;
    if (cur === 'scans' || cur === 'report' || cur === 'compare') {
      navigate(cur, Router?.current?.params || {});
    }
  }).catch(() => {});

  applyTheme(AppState.settings.theme || 'light');
  if (typeof _applyA11y === 'function') {
    const a11y = Store.get('oralai_a11y');
    if (a11y) _applyA11y(a11y);
  }

  if (Store.isLoggedIn()) {
    AppState.user = Store.loadUser() || { name:'Demo User', email:'demo@oralai.com', role:'patient' };
    renderShell();
    registerAllPages();
    initKeyboardShortcuts();
    Router.init();
    _initBackToTop();
    checkBackend();
    setInterval(checkBackend, 30000);
    document.addEventListener('page:rendered', _refreshNotifBadge);
    maybeShowOnboarding();
  } else {
    if (typeof renderLandingPage === 'function') {
      renderLandingPage();
    } else {
      renderLoginPage();
    }
  }
});

// ── Back to top ──
function scrollToTop() {
  document.getElementById('page-content')?.scrollTo({ top: 0, behavior: 'smooth' });
}

function _initBackToTop() {
  const content = document.getElementById('page-content');
  const btn     = document.getElementById('back-to-top');
  if (!content || !btn) return;
  content.addEventListener('scroll', () => {
    btn.classList.toggle('visible', content.scrollTop > 300);
  }, { passive: true });
}

// ── Notification badge refresh ──
function _refreshNotifBadge() {
  try {
    const notifs = Store.get('oralai_notifications') || [];
    const unread = notifs.filter(n => !n.read).length;
    const badge  = document.getElementById('nav-notif-count');
    const dot    = document.getElementById('notif-dot');
    if (badge) {
      badge.textContent = unread > 9 ? '9+' : unread;
      badge.style.display = unread > 0 ? 'inline-flex' : 'none';
    }
    if (dot) dot.style.display = unread > 0 ? 'block' : 'none';
  } catch (_) {}
}
