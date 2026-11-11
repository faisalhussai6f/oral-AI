// ── Register all pages with the router ──
function registerAllPages() {
  // ── Role guard helper ──────────────────────────────────────────────────────
  function guard(allowedRoles, renderFn, fallbackPage = 'patient_dashboard') {
    return (params) => {
      const role = AppState.user?.role || 'patient';
      if (!allowedRoles.includes(role)) {
        return `<div class="card max-w-md mx-auto mt-10 text-center py-12">
          <div class="text-5xl mb-3">🔒</div>
          <h3 class="text-lg font-semibold text-white mb-2">Access Restricted</h3>
          <p class="text-gray-400 text-sm mb-4">This section requires the <strong>${allowedRoles.join(' or ')}</strong> role.</p>
          <button onclick="navigate('${fallbackPage}')" class="btn-primary">Go to Dashboard</button>
        </div>`;
      }
      return renderFn(params);
    };
  }

  // ── Role-based dashboards ──────────────────────────────────────────────────
  Router.register('patient_dashboard', guard(['patient','admin'], () => pageDashboardPatient()));
  Router.register('doctor_dashboard',  guard(['doctor','admin'],  () => pageDashboardDoctor(), 'patient_dashboard'));
  Router.register('doctor_queue',      guard(['doctor','admin'],  () => pageDoctorQueue(),     'patient_dashboard'));
  Router.register('doctor_review',     guard(['doctor','admin'],  (p) => pageDoctorReview(p),  'patient_dashboard'));
  Router.register('admin_dashboard',   guard(['admin'],           () => pageAdminDashboard(),  'patient_dashboard'));

  // ── Legacy 'dashboard' → immediately resolve to role-specific home ──────────
  // Navigate function now intercepts 'dashboard' at the call site, but register
  // this as a safety net in case Router.navigate is called directly.
  Router.register('dashboard', (p) => {
    const role   = AppState.user?.role || 'patient';
    const target = role === 'doctor' ? 'doctor_dashboard'
                 : role === 'admin'  ? 'admin_dashboard'
                 :                    'patient_dashboard';
    navigate(target);   // navigate() intercepts 'dashboard' → this won't recurse
    return `<div class="flex items-center justify-center h-48 text-gray-500 text-sm">Redirecting...</div>`;
  });

  // ── Core patient pages ─────────────────────────────────────────────────────
  Router.register('upload',         ()  => pageUpload());
  Router.register('scans',          ()  => pageScans());
  Router.register('report',         (p) => pageReport(p));
  Router.register('printreport',    (p) => pagePrintReport(p));
  Router.register('sensors',        ()  => pageSensors());
  Router.register('analytics',      ()  => pageAnalytics());
  Router.register('telehealth',     ()  => pageTelehealth());
  Router.register('compare',        (p) => pageCompare(p));
  Router.register('progress',       ()  => pageProgress());
  Router.register('treatments',     ()  => pageTreatments());
  Router.register('calculator',     ()  => pageCalculator());
  Router.register('settings',       ()  => pageSettings());
  Router.register('notifications',  ()  => pageNotifications());
  Router.register('profile',        ()  => pageProfile());

  // ── Feature pages ──────────────────────────────────────────────────────────
  Router.register('camera',         ()  => pageCamera());
  Router.register('symptom',        ()  => pageSymptomChecker());
  Router.register('reminders',      ()  => pageReminders());
  Router.register('dentist',        ()  => pageDentistPanel());
  Router.register('family',         ()  => pageFamily());
  Router.register('accessibility',  ()  => pageAccessibility());
  Router.register('iot_health',     ()  => pageIoTHealth());
  Router.register('clinic',         ()  => pageClinicAnalytics());
  Router.register('privacy',        ()  => pagePrivacy());
  Router.register('audit',          ()  => pageAudit());

  // ── 404 fallback ───────────────────────────────────────────────────────────
  Router.register('404', () => page404());
}

// ── Admin Dashboard (minimal) ─────────────────────────────────────────────
function pageAdminDashboard() {
  const logs    = Store.loadAuditLogs().slice(0, 20);
  const reviews = Store.loadDoctorReviews();
  const shares  = Store.loadReportShares();
  return `
  <div class="max-w-4xl mx-auto space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-white">Admin Dashboard</h1>
      <span class="text-xs px-2 py-1 rounded-full bg-yellow-500/15 text-yellow-400 border border-yellow-500/30">System Admin</span>
    </div>

    <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
      ${[
        ['📋', 'Total Reviews', reviews.length],
        ['🔗', 'Active Shares', shares.filter(s=>!s.revoked).length],
        ['🔒', 'Revoked Shares', shares.filter(s=>s.revoked).length],
        ['📜', 'Audit Events', Store.loadAuditLogs().length],
      ].map(([icon,label,val]) => `
        <div class="card-sm text-center">
          <div class="text-2xl">${icon}</div>
          <div class="text-2xl font-black text-white mt-1">${val}</div>
          <div class="text-xs text-gray-500">${label}</div>
        </div>`).join('')}
    </div>

    <div class="card">
      <h3 class="font-semibold text-white mb-3">Recent Audit Logs</h3>
      ${logs.length === 0 ? '<p class="text-gray-500 text-sm">No audit events yet.</p>' : `
      <div class="space-y-2 text-xs">
        ${logs.map(l => `
          <div class="flex items-start gap-3 p-2 rounded-lg bg-gray-900 border border-gray-800">
            <span class="text-gray-600 flex-shrink-0 font-mono">${new Date(l.timestamp).toLocaleString()}</span>
            <span class="text-brand-400 flex-shrink-0">${l.action}</span>
            <span class="text-gray-300 truncate">${l.detail}</span>
            <span class="text-gray-600 flex-shrink-0">${l.userId || '—'}</span>
          </div>`).join('')}
      </div>`}
    </div>
  </div>
  `;
}
