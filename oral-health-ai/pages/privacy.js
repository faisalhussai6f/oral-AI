// ══════════════════════════════════════════════════════
//  Feature 17 — Privacy Controls
//  Audit trail, consent management, role-based access,
//  data export/delete
// ══════════════════════════════════════════════════════

const CONSENT_KEY = 'oralai_consent';
const ROLES_KEY   = 'oralai_roles';
const AUDIT_KEY   = 'oralai_audit';

function _loadConsent() {
  return Store.get(CONSENT_KEY) || {
    aiAnalysis: true, dataStorage: true, clinicSharing: false,
    researchAnonymous: false, thirdParty: false, agreedAt: null,
  };
}
function _saveConsent(c) { Store.set(CONSENT_KEY, c); }

function _loadRoles()  { return Store.get(ROLES_KEY)  || []; }
function _saveRoles(r) { Store.set(ROLES_KEY, r); }

function _loadAudit() { return Store.get(AUDIT_KEY) || []; }

function pagePrivacy() {
  const consent = _loadConsent();
  const roles   = _loadRoles();
  const audit   = _loadAudit();

  const CONSENT_ITEMS = [
    { key:'aiAnalysis',         label:'AI Image Analysis',          desc:'Allow AI to process your dental images for disease detection.',                              required:true  },
    { key:'dataStorage',        label:'Local Data Storage',         desc:'Store scan history, reports, and sensor data in your browser localStorage.',               required:true  },
    { key:'clinicSharing',      label:'Clinic/Dentist Sharing',     desc:'Allow generated reports to be shared with connected dental professionals.',                 required:false },
    { key:'researchAnonymous',  label:'Anonymous Research Data',    desc:'Contribute anonymised, de-identified scan data to improve AI model accuracy.',             required:false },
    { key:'thirdParty',         label:'Third-Party Integrations',   desc:'Allow integration with third-party dental software (EHR, billing systems).',              required:false },
  ];

  const ROLE_DEFS = [
    { role:'Patient',  desc:'Default. Can upload scans, view reports, and manage own data.',           color:'#28a8ff' },
    { role:'Dentist',  desc:'Can review, annotate, and correct AI reports for assigned patients.',     color:'#10b981' },
    { role:'Admin',    desc:'Full access: manage users, view clinic analytics, configure AI settings.',color:'#f59e0b' },
    { role:'Viewer',   desc:'Read-only access to assigned patient reports.',                           color:'#94a3b8' },
  ];

  return `
  <div class="max-w-3xl mx-auto space-y-6">

    <div>
      <h2 class="text-2xl font-bold text-white flex items-center gap-2">🔒 Privacy &amp; Data Controls</h2>
      <p class="text-gray-400 mt-1 text-sm">Manage consent, access roles, audit logs, and your right to data portability and deletion.</p>
    </div>

    <!-- Consent management -->
    <div class="card space-y-3">
      <h3 class="font-semibold text-white flex items-center gap-2">
        📜 Consent Management
        ${consent.agreedAt ? `<span class="text-xs text-green-400 font-normal">Agreed ${new Date(consent.agreedAt).toLocaleDateString()}</span>` : ''}
      </h3>
      ${CONSENT_ITEMS.map(item => `
        <div class="flex items-start justify-between gap-4 p-3 rounded-xl bg-gray-900 border border-gray-800">
          <div class="flex-1">
            <div class="flex items-center gap-2">
              <span class="text-sm font-semibold text-gray-200">${item.label}</span>
              ${item.required ? '<span class="text-xs text-red-400 border border-red-800/50 bg-red-900/20 px-1.5 py-0.5 rounded font-semibold">Required</span>' : ''}
            </div>
            <p class="text-xs text-gray-500 mt-0.5 leading-relaxed">${item.desc}</p>
          </div>
          <label class="relative inline-flex items-center cursor-pointer flex-shrink-0 mt-0.5 ${item.required?'opacity-50':''}" >
            <input type="checkbox" ${consent[item.key]?'checked':''} ${item.required?'disabled':''}
                   class="sr-only peer" onchange="updateConsent('${item.key}',this.checked)"/>
            <div class="w-10 h-5 bg-gray-700 peer-checked:bg-brand-500 rounded-full transition-colors duration-200
                        after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white
                        after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5"></div>
          </label>
        </div>`).join('')}
      <button onclick="saveConsentAll()" class="btn-primary text-sm w-full sm:w-auto justify-center">
        ✅ Save Consent Preferences
      </button>
    </div>

    <!-- Role-based access -->
    <div class="card space-y-4">
      <h3 class="font-semibold text-white">👥 Role-Based Access Control</h3>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        ${ROLE_DEFS.map(r => `
          <div class="p-3 rounded-xl bg-gray-900 border border-gray-800">
            <div class="flex items-center gap-2 mb-1">
              <span class="w-2.5 h-2.5 rounded-full flex-shrink-0" style="background:${r.color}"></span>
              <span class="font-semibold text-sm text-white">${r.role}</span>
              ${(AppState.user?.role||'Patient')===r.role?'<span class="badge-minimal text-xs ml-auto">You</span>':''}
            </div>
            <p class="text-xs text-gray-500 leading-relaxed">${r.desc}</p>
          </div>`).join('')}
      </div>
      <div class="p-3 rounded-xl bg-gray-900 border border-gray-800 text-sm">
        <span class="text-gray-400">Your current role: </span>
        <span class="font-semibold text-brand-300">${AppState.user?.role || 'Patient'}</span>
        <span class="text-gray-600 text-xs ml-2">(Contact your clinic administrator to change roles)</span>
      </div>
    </div>

    <!-- Data rights -->
    <div class="card space-y-4">
      <h3 class="font-semibold text-white">📦 Your Data Rights (DPDP / GDPR)</h3>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button onclick="exportAllData()" class="flex items-start gap-3 p-4 rounded-xl bg-gray-900 border border-gray-800 hover:border-brand-500/30 transition-colors text-left">
          <span class="text-2xl flex-shrink-0">📥</span>
          <div>
            <div class="font-semibold text-white text-sm">Export All Data</div>
            <div class="text-xs text-gray-500 mt-0.5">Download complete JSON archive of all your records, scans, and settings.</div>
          </div>
        </button>
        <button onclick="requestDataDeletion()" class="flex items-start gap-3 p-4 rounded-xl bg-gray-900 border border-red-900/30 hover:border-red-500/40 transition-colors text-left">
          <span class="text-2xl flex-shrink-0">🗑️</span>
          <div>
            <div class="font-semibold text-red-400 text-sm">Delete All My Data</div>
            <div class="text-xs text-gray-500 mt-0.5">Permanently erase all local records. This cannot be undone.</div>
          </div>
        </button>
        <button onclick="navigate('dentist')" class="flex items-start gap-3 p-4 rounded-xl bg-gray-900 border border-gray-800 hover:border-brand-500/30 transition-colors text-left">
          <span class="text-2xl flex-shrink-0">🔗</span>
          <div>
            <div class="font-semibold text-white text-sm">Manage Shared Links</div>
            <div class="text-xs text-gray-500 mt-0.5">Revoke or review active report sharing links.</div>
          </div>
        </button>
        <button onclick="navigate('audit')" class="flex items-start gap-3 p-4 rounded-xl bg-gray-900 border border-gray-800 hover:border-brand-500/30 transition-colors text-left">
          <span class="text-2xl flex-shrink-0">📋</span>
          <div>
            <div class="font-semibold text-white text-sm">View Audit Trail</div>
            <div class="text-xs text-gray-500 mt-0.5">See every action taken on your account with timestamps.</div>
          </div>
        </button>
      </div>
    </div>

    <!-- Audit trail preview -->
    <div class="card">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-semibold text-white">📋 Recent Audit Trail</h3>
        <span class="text-xs text-gray-500">${audit.length} events logged</span>
      </div>
      ${audit.length === 0 ? `
        <p class="text-gray-500 text-sm text-center py-4">No audit events yet.</p>` : `
        <div class="space-y-1.5 max-h-60 overflow-y-auto">
          ${audit.slice(0,20).map(e => `
            <div class="flex items-start gap-3 p-2.5 rounded-lg bg-gray-900 border border-gray-800 text-xs">
              <span class="text-gray-600 flex-shrink-0 tabular-nums">${new Date(e.ts).toLocaleString([],{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}</span>
              <span class="text-gray-300">${e.msg}</span>
            </div>`).join('')}
        </div>
        <p class="text-xs text-gray-600 mt-2 text-center">Showing last 20 of ${audit.length} events</p>`}
    </div>

    <!-- Privacy policy note -->
    <div class="card border-blue-500/20 bg-blue-500/5">
      <div class="flex items-start gap-3">
        <span class="text-2xl">🛡️</span>
        <div>
          <div class="font-semibold text-blue-300 mb-1">Data Protection Statement</div>
          <p class="text-sm text-gray-400 leading-relaxed">
            All data is processed and stored <strong class="text-gray-300">locally on your device</strong> in browser localStorage.
            No data is transmitted to external servers unless the Flask backend is active and you have given consent.
            OralAI complies with applicable data protection regulations including India's DPDP Act and GDPR principles.
            Your scan images are never shared without explicit consent.
          </p>
        </div>
      </div>
    </div>

  </div>
  `;
}

// ── Audit page (standalone) ──
function pageAudit() {
  const audit = _loadAudit();
  return `
  <div class="max-w-3xl mx-auto space-y-5">
    <div class="flex items-center justify-between gap-4">
      <div>
        <h2 class="text-2xl font-bold text-white">📋 Audit Trail</h2>
        <p class="text-gray-400 mt-1 text-sm">${audit.length} events — complete history of all account actions</p>
      </div>
      <button onclick="clearAudit()" class="text-xs px-3 py-2 rounded-lg border border-red-800 text-red-400 hover:bg-red-900/20 transition-colors">
        Clear Log
      </button>
    </div>
    ${audit.length === 0 ? `
      <div class="card text-center py-12">
        <div class="text-4xl mb-3">📋</div>
        <p class="text-gray-400">No audit events yet.</p>
      </div>
    ` : `
      <div class="card space-y-1.5">
        ${audit.map((e,i) => `
          <div class="flex items-start gap-3 p-3 rounded-lg ${i%2===0?'bg-gray-900/50':'bg-transparent'} border-b border-gray-900 last:border-0 text-xs">
            <span class="text-brand-400 font-mono flex-shrink-0 tabular-nums">${String(i+1).padStart(3,'0')}</span>
            <span class="text-gray-500 flex-shrink-0 tabular-nums whitespace-nowrap">${new Date(e.ts).toLocaleString([],{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit'})}</span>
            <span class="text-gray-300 flex-1">${e.msg}</span>
            <span class="text-gray-600 flex-shrink-0 truncate max-w-[100px]">${e.user||'—'}</span>
          </div>`).join('')}
      </div>`}
  </div>`;
}

function clearAudit() {
  if (!confirm('Clear the full audit log? This cannot be undone.')) return;
  Store.set(AUDIT_KEY, []);
  showToast('Audit log cleared','info');
  navigate('audit');
}

function updateConsent(key, val) {
  // Live preview — will be saved when "Save" is clicked
  window._pendingConsent = window._pendingConsent || { ..._loadConsent() };
  window._pendingConsent[key] = val;
}

function saveConsentAll() {
  const existing = _loadConsent();
  const updated  = { ...existing, ...(window._pendingConsent || {}), agreedAt: new Date().toISOString() };
  _saveConsent(updated);
  window._pendingConsent = null;
  _addAuditEvent('Consent preferences updated');
  showToast('Consent preferences saved', 'success');
}

function exportAllData() {
  const data = {
    user:         AppState.user,
    scans:        AppState.scans,
    sensors:      AppState.sensors,
    appointments: AppState.appointments,
    treatments:   Store.get('oralai_treatments') || [],
    reminders:    Store.get('oralai_reminders')  || [],
    reviews:      Store.get('oralai_dentist_reviews') || [],
    feedback:     Store.get('oralai_feedback')   || [],
    consent:      _loadConsent(),
    audit:        _loadAudit(),
    exportedAt:   new Date().toISOString(),
    version:      '2.0',
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type:'application/json' });
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = `oralai-full-export-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  _addAuditEvent('Full data export downloaded');
  showToast('Complete data export downloaded', 'success');
}

function requestDataDeletion() {
  if (!confirm('⚠️ PERMANENTLY DELETE all your data?\n\nThis includes scans, reports, appointments, treatments, sensor history, and account information.\n\nThis action is irreversible.')) return;
  // Clear everything
  const keys = ['oralai_user','oralai_scans','oralai_sensors','oralai_settings','oralai_appointments',
                 'oralai_notifications','oralai_treatments','oralai_reminders','oralai_dentist_reviews',
                 'oralai_feedback','oralai_symptoms','oralai_consent','oralai_family','oralai_active_member',
                 'oralai_shared_links','oralai_iot_devices','oralai_loggedIn','oralai_lastRoute',
                 'oralai_onboarding_done','oralai_audit'];
  keys.forEach(k => localStorage.removeItem(k));
  showToast('All data deleted. You will be signed out.', 'info');
  setTimeout(() => location.reload(), 1500);
}

// Expose _addAuditEvent globally (used by dentist.js, settings.js, etc.)
function _addAuditEvent(msg) {
  const log  = Store.get(AUDIT_KEY) || [];
  log.unshift({ msg, ts: new Date().toISOString(), user: AppState.user?.email || 'unknown' });
  if (log.length > 500) log.pop();
  Store.set(AUDIT_KEY, log);
}
