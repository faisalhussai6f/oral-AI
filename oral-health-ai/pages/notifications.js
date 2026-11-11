// ── Notifications Page ──

// Seed default notifications if none exist
function _seedNotifications() {
  if (!Store.get('oralai_notifications')) {
    const defaults = [
      { id:'N001', type:'scan',      icon:'🦷', title:'Monthly scan due',           body:'Your next recommended scan is due in 3 days. Upload a new dental scan to track your progress.',  time: Date.now() - 2*60*60*1000,   read:false, action:'upload' },
      { id:'N002', type:'ai',        icon:'🤖', title:'AI tip: Increase flossing',   body:'Based on your last scan findings, increasing flossing to twice daily could significantly reduce plaque accumulation.', time: Date.now() - 24*60*60*1000,  read:false, action:'report' },
      { id:'N003', type:'appt',      icon:'📅', title:'Appointment confirmed',       body:'Your video consultation with Dr. Arjun Sharma on Oct 5 at 10:30 AM has been confirmed.',         time: Date.now() - 2*24*60*60*1000, read:true,  action:'telehealth' },
      { id:'N004', type:'sensor',    icon:'⚠️', title:'pH sensor reading low',       body:'Your saliva pH reading (6.4) is slightly below the normal range (6.5–7.5). Consider reducing acidic food intake.', time: Date.now() - 3*24*60*60*1000, read:true,  action:'sensors' },
      { id:'N005', type:'ai',        icon:'📊', title:'New AI insight available',    body:'Your oral health score has improved by 5 points over the last 30 days. View your analytics for details.', time: Date.now() - 4*24*60*60*1000, read:true,  action:'analytics' },
      { id:'N006', type:'system',    icon:'✅', title:'Scan analysis complete',      body:'Your scan RPT-20260512-ANALYSIS has been fully processed. Confidence: 92%. Click to view your report.', time: Date.now() - 5*24*60*60*1000, read:true,  action:'scans' },
      { id:'N007', type:'sensor',    icon:'🌡️', title:'Temperature slightly elevated',body:'Oral temperature reading of 37.1°C is within normal range but approaching the upper limit. Monitor closely.', time: Date.now() - 7*24*60*60*1000, read:true,  action:'sensors' },
      { id:'N008', type:'system',    icon:'🚀', title:'Welcome to OralAI!',          body:'Your account is set up and ready. Start by uploading your first dental scan for an AI-powered oral health assessment.', time: Date.now() - 30*24*60*60*1000,read:true,  action:'upload'  },
    ];
    Store.set('oralai_notifications', defaults);
  }
  return Store.get('oralai_notifications') || [];
}

function _saveNotifications(notifs) {
  Store.set('oralai_notifications', notifs);
}

function _timeAgo(ts) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1)   return 'Just now';
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7)   return `${d}d ago`;
  const w = Math.floor(d / 7);
  if (w < 5)   return `${w}w ago`;
  return new Date(ts).toLocaleDateString('en-US',{month:'short',day:'numeric'});
}

function pageNotifications() {
  const notifs  = _seedNotifications();
  const filter  = window._notifFilter || 'all';
  const unread  = notifs.filter(n => !n.read).length;

  const typeConfig = {
    scan:   { label:'Scans',     color:'text-brand-400',  bg:'bg-brand-500/10 border-brand-500/20'  },
    ai:     { label:'AI Tips',   color:'text-purple-400', bg:'bg-purple-500/10 border-purple-500/20'},
    appt:   { label:'Appointments',color:'text-green-400',bg:'bg-green-500/10 border-green-500/20' },
    sensor: { label:'Sensors',   color:'text-yellow-400', bg:'bg-yellow-500/10 border-yellow-500/20'},
    system: { label:'System',    color:'text-gray-400',   bg:'bg-gray-800 border-gray-700'          },
  };

  const filtered = filter === 'all'    ? notifs
                 : filter === 'unread' ? notifs.filter(n => !n.read)
                 : notifs.filter(n => n.type === filter);

  return `
  <div class="max-w-3xl mx-auto space-y-5">

    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <h2 class="text-2xl font-bold text-white flex items-center gap-2">
          Notifications
          ${unread > 0 ? `<span class="text-sm px-2 py-0.5 rounded-full bg-brand-500 text-white font-bold">${unread}</span>` : ''}
        </h2>
        <p class="text-gray-400 mt-1 text-sm">${notifs.length} total · ${unread} unread</p>
      </div>
      <div class="flex gap-2 flex-wrap">
        <button onclick="markAllRead()" class="btn-secondary text-xs px-3 py-2 flex items-center gap-1.5">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
          </svg>
          Mark all read
        </button>
        <button onclick="clearAllNotifications()" class="text-xs px-3 py-2 rounded-lg border border-gray-700 text-gray-500 hover:border-red-800 hover:text-red-400 transition-colors flex items-center gap-1.5">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
          </svg>
          Clear all
        </button>
      </div>
    </div>

    <!-- Filter tabs -->
    <div class="flex gap-2 flex-wrap">
      ${[
        ['all',    'All',          notifs.length],
        ['unread', 'Unread',       unread],
        ['scan',   'Scans',        notifs.filter(n=>n.type==='scan').length],
        ['ai',     'AI Tips',      notifs.filter(n=>n.type==='ai').length],
        ['appt',   'Appointments', notifs.filter(n=>n.type==='appt').length],
        ['sensor', 'Sensors',      notifs.filter(n=>n.type==='sensor').length],
        ['system', 'System',       notifs.filter(n=>n.type==='system').length],
      ].map(([val, lbl, cnt]) => `
        <button onclick="window._notifFilter='${val}'; navigate('notifications')"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${filter===val
            ? 'bg-brand-500/20 text-brand-300 border-brand-500/40'
            : 'bg-gray-900 text-gray-400 border-gray-700 hover:border-gray-500'}">
          ${lbl}
          ${cnt > 0 ? `<span class="px-1.5 py-0.5 rounded-full text-xs ${filter===val?'bg-brand-500/30':'bg-gray-800'}">${cnt}</span>` : ''}
        </button>`).join('')}
    </div>

    <!-- Notification list -->
    ${filtered.length === 0 ? `
      <div class="card text-center py-16">
        <div class="text-5xl mb-3">🔔</div>
        <h3 class="text-lg font-semibold text-white">No notifications</h3>
        <p class="text-gray-400 text-sm mt-2">
          ${filter === 'unread' ? 'All caught up! No unread notifications.' : "Nothing here for this filter yet."}
        </p>
        ${filter !== 'all' ? `
          <button onclick="window._notifFilter='all'; navigate('notifications')"
            class="btn-secondary mt-4 text-sm">View All</button>` : ''}
      </div>
    ` : `
      <div class="space-y-2">
        ${filtered.map(n => {
          const tc = typeConfig[n.type] || typeConfig.system;
          return `
          <div class="card p-0 overflow-hidden transition-all hover:border-gray-700 cursor-pointer ${!n.read ? 'border-l-4 border-l-brand-500' : ''}"
               onclick="openNotification('${n.id}')">
            <div class="flex items-start gap-4 p-4">
              <!-- Icon -->
              <div class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-xl border ${tc.bg}">
                ${n.icon}
              </div>

              <!-- Content -->
              <div class="flex-1 min-w-0">
                <div class="flex items-start justify-between gap-2">
                  <div>
                    <div class="flex items-center gap-2 flex-wrap">
                      <span class="font-semibold text-sm ${n.read ? 'text-gray-300' : 'text-white'}">${n.title}</span>
                      ${!n.read ? '<span class="w-2 h-2 rounded-full bg-brand-500 flex-shrink-0"></span>' : ''}
                      <span class="text-xs px-2 py-0.5 rounded-full bg-gray-900 border border-gray-800 ${tc.color}">${tc.label}</span>
                    </div>
                    <p class="text-xs text-gray-400 mt-1 leading-relaxed">${n.body}</p>
                  </div>
                  <div class="flex items-center gap-2 flex-shrink-0 ml-2">
                    <span class="text-xs text-gray-600 whitespace-nowrap">${_timeAgo(n.time)}</span>
                    <button onclick="deleteNotification(event,'${n.id}')"
                      class="text-gray-700 hover:text-red-400 transition-colors text-base leading-none" title="Delete">✕</button>
                  </div>
                </div>
                <!-- Action button -->
                <div class="mt-2">
                  <button onclick="notifAction(event,'${n.action}','${n.id}')"
                    class="text-xs text-brand-400 hover:text-brand-300 hover:underline font-semibold">
                    ${n.action === 'upload'     ? 'Upload a scan →'
                    : n.action === 'report'     ? 'View report →'
                    : n.action === 'scans'      ? 'View scans →'
                    : n.action === 'sensors'    ? 'View sensors →'
                    : n.action === 'analytics'  ? 'View analytics →'
                    : n.action === 'telehealth' ? 'View appointments →'
                    : 'View →'}
                  </button>
                </div>
              </div>
            </div>
          </div>`;
        }).join('')}
      </div>
    `}

    <!-- Summary card -->
    <div class="card">
      <h3 class="font-semibold text-white mb-4 text-sm">Notification Summary</h3>
      <div class="grid grid-cols-2 sm:grid-cols-5 gap-3">
        ${Object.entries(typeConfig).map(([type, cfg]) => {
          const cnt = notifs.filter(n=>n.type===type).length;
          const unr = notifs.filter(n=>n.type===type && !n.read).length;
          return `
          <div class="text-center p-3 rounded-xl bg-gray-900 border border-gray-800 cursor-pointer hover:border-gray-700 transition-colors"
               onclick="window._notifFilter='${type}'; navigate('notifications')">
            <div class="text-xl mb-1">${{scan:'🦷',ai:'🤖',appt:'📅',sensor:'📡',system:'⚙️'}[type]}</div>
            <div class="text-base font-black text-white">${cnt}</div>
            <div class="text-xs text-gray-500">${cfg.label}</div>
            ${unr > 0 ? `<div class="text-xs text-brand-400 font-semibold mt-0.5">${unr} new</div>` : ''}
          </div>`;
        }).join('')}
      </div>
    </div>

    <!-- Notification preferences shortcut -->
    <div class="card flex items-center justify-between gap-4 py-4">
      <div>
        <p class="font-semibold text-white text-sm">Notification Preferences</p>
        <p class="text-xs text-gray-500 mt-0.5">Configure which alerts you receive</p>
      </div>
      <button onclick="navigate('profile')" class="btn-secondary text-sm flex-shrink-0">
        Manage →
      </button>
    </div>

  </div>
  `;
}

function openNotification(id) {
  const notifs = _seedNotifications();
  const n = notifs.find(x => x.id === id);
  if (!n) return;
  // Mark as read
  n.read = true;
  _saveNotifications(notifs);
}

function notifAction(e, action, id) {
  e.stopPropagation();
  openNotification(id);
  navigate(action === 'report' ? 'scans' : action);
}

function deleteNotification(e, id) {
  e.stopPropagation();
  const notifs = _seedNotifications().filter(n => n.id !== id);
  _saveNotifications(notifs);
  showToast('Notification removed', 'info');
  navigate('notifications');
}

function markAllRead() {
  const notifs = _seedNotifications().map(n => ({ ...n, read: true }));
  _saveNotifications(notifs);
  showToast('All notifications marked as read', 'success');
  navigate('notifications');
}

function clearAllNotifications() {
  if (!confirm('Clear all notifications? This cannot be undone.')) return;
  _saveNotifications([]);
  window._notifFilter = 'all';
  showToast('All notifications cleared', 'info');
  navigate('notifications');
}
