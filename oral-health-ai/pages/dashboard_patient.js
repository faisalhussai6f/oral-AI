// ── Patient Dashboard ──────────────────────────────────────────────────────
function pageDashboardPatient() {
  const u      = AppState.user || {};
  const scans  = AppState.scans || [];
  const latest = scans[0] || null;
  const prev   = scans[1] || null;

  // Score trend
  const trend  = latest && prev
    ? (latest.score > prev.score ? '▲' : latest.score < prev.score ? '▼' : '—')
    : '—';
  const trendClr = latest && prev
    ? (latest.score > prev.score ? 'text-green-400' : latest.score < prev.score ? 'text-red-400' : 'text-gray-400')
    : 'text-gray-400';
  const trendDiff = latest && prev ? Math.abs(latest.score - prev.score) : 0;

  // Oral health score ring
  const sc     = latest ? (latest.score >= 80 ? '#10b981' : latest.score >= 60 ? '#f59e0b' : '#ef4444') : '#6b7280';
  const scLbl  = latest ? (latest.score >= 80 ? 'Good' : latest.score >= 60 ? 'Fair' : 'Needs Attention') : 'No Data';
  const circ   = 226;
  const offset = latest ? circ - (latest.score / 100) * circ : circ;

  // Active shares
  const shares    = Store.loadReportShares().filter(s => !s.revoked && s.patientId === u.email);
  const consents  = Store.loadConsentRecords().filter(c => c.patientId === u.email && c.granted);

  // Next recommended action
  let nextAction = '✅ Upload your first scan to get started';
  if (latest) {
    const urgency = latest.urgency || 'monitor';
    if (urgency === 'urgent')  nextAction = '🚨 Urgent: book a dental appointment this week';
    else if (urgency === 'dentist') nextAction = '📅 Book a dentist appointment within 2 weeks';
    else if (latest.score < 70)    nextAction = '🔄 Schedule a follow-up scan in 14 days';
    else                           nextAction = '✅ Routine check-up in 30 days';
  }

  // Score history for mini sparkline (last 6 scans)
  const history = scans.slice(0, 6).reverse();
  const maxScore = 100;
  const sparkPoints = history.map((s, i) => {
    const x = (i / Math.max(history.length - 1, 1)) * 100;
    const y = 100 - (s.score / maxScore) * 100;
    return `${x},${y}`;
  }).join(' ');

  return `
  <div class="max-w-5xl mx-auto space-y-6">

    <!-- Welcome header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold text-white">Good ${_timeOfDay()}, ${u.name?.split(' ')[0] || 'there'} 👋</h1>
        <p class="text-gray-400 text-sm mt-0.5">Here's your oral health summary for today.</p>
      </div>
      <button onclick="navigate('upload')" class="btn-primary flex items-center gap-2 self-start sm:self-auto">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
        Upload Scan
      </button>
    </div>

    <!-- Top row: score + stats -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">

      <!-- Score ring -->
      <div class="card flex flex-col items-center justify-center gap-3 py-8"
           style="background:linear-gradient(135deg,#051428,#0a1f3c);border-color:#1e3a5f;">
        <div class="relative w-28 h-28">
          <svg class="w-full h-full -rotate-90" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="36" fill="none" stroke="#1e3a5f" stroke-width="7"/>
            <circle cx="40" cy="40" r="36" fill="none" stroke="${sc}" stroke-width="7"
              stroke-dasharray="${circ}" stroke-dashoffset="${offset}"
              stroke-linecap="round" style="transition:stroke-dashoffset .6s ease"/>
          </svg>
          <div class="absolute inset-0 flex flex-col items-center justify-center">
            <span class="text-3xl font-black text-white">${latest ? latest.score : '—'}</span>
            <span class="text-xs font-semibold" style="color:${sc}">${scLbl}</span>
          </div>
        </div>
        <div class="text-center">
          <div class="text-xs text-gray-500">Oral Health Score</div>
          ${latest ? `<div class="text-xs mt-1 ${trendClr}">${trend} ${trendDiff > 0 ? trendDiff + ' pts vs last scan' : 'No change'}</div>` : ''}
        </div>
        ${history.length >= 2 ? `
        <div class="w-full px-2">
          <svg viewBox="0 0 100 40" class="w-full h-8" preserveAspectRatio="none">
            <polyline points="${sparkPoints}" fill="none" stroke="${sc}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <div class="text-xs text-gray-600 text-center">6-scan trend</div>
        </div>` : ''}
      </div>

      <!-- Stats grid -->
      <div class="lg:col-span-2 grid grid-cols-2 sm:grid-cols-2 gap-4">
        ${[
          ['📊','Total Scans', scans.length, 'All time'],
          ['📅','Last Scan', latest ? latest.date : 'None', latest ? latest.type : ''],
          ['🔍','Findings', latest ? (latest.findings || []).length : '—', latest ? `Latest scan` : ''],
          ['🩺','Shared with',shares.length + ' doctor' + (shares.length !== 1 ? 's' : ''), consents.length + ' active consent' + (consents.length !== 1 ? 's' : '')],
        ].map(([icon, label, val, sub]) => `
          <div class="card-sm flex flex-col gap-1">
            <div class="text-xl">${icon}</div>
            <div class="text-xs text-gray-500 font-semibold uppercase tracking-wider mt-1">${label}</div>
            <div class="text-xl font-black text-white">${val}</div>
            <div class="text-xs text-gray-600">${sub}</div>
          </div>`).join('')}
      </div>
    </div>

    <!-- Next action banner -->
    <div class="card flex items-center gap-4 p-4 border-brand-500/30" style="background:linear-gradient(135deg,#001a0e,#00120a);">
      <div class="text-2xl flex-shrink-0">🎯</div>
      <div class="flex-1 min-w-0">
        <div class="text-xs text-brand-400 font-semibold uppercase tracking-wider mb-0.5">Next Recommended Action</div>
        <div class="text-sm text-white font-medium">${nextAction}</div>
      </div>
      <button onclick="navigate('upload')" class="btn-primary text-xs px-3 py-2 flex-shrink-0">Scan Now</button>
    </div>

    <!-- Latest scan report preview -->
    ${latest ? `
    <div class="card">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-semibold text-white">Latest Scan Report</h3>
        <button onclick="navigate('report',{id:'${latest.id}'})" class="text-xs text-brand-400 hover:text-brand-300">View Full →</button>
      </div>
      <div class="flex flex-col sm:flex-row gap-4">
        ${latest.imageDataUrl ? `<img src="${latest.imageDataUrl}" class="w-full sm:w-36 h-28 object-cover rounded-xl border border-gray-700 flex-shrink-0" alt="Scan"/>` : '<div class="w-36 h-28 rounded-xl bg-gray-800 border border-gray-700 flex-shrink-0 flex items-center justify-center text-gray-600 text-xs">No image</div>'}
        <div class="flex-1 min-w-0 space-y-2">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="badge-minimal text-xs">${latest.type || 'Basic RGB'}</span>
            <span class="text-xs text-gray-500">${latest.date}</span>
            ${latest.model ? `<span class="text-xs text-gray-600">Model: ${latest.model}</span>` : ''}
          </div>
          <p class="text-sm text-gray-300">${latest.diagnosis || 'No diagnosis recorded.'}</p>
          <div class="flex flex-wrap gap-2">
            ${(latest.findings || []).slice(0,3).map(f => {
              const cond = typeof f === 'string' ? f : (f.condition || 'Finding');
              const sev  = typeof f === 'object' ? f.severity : '';
              const cls  = sev === 'Severe' ? 'badge-severe' : sev === 'Moderate' ? 'badge-moderate' : 'badge-mild';
              return `<span class="${cls} text-xs">${cond}</span>`;
            }).join('')}
          </div>
          <!-- AI Disclaimer -->
          <div class="mt-2 p-2 rounded-lg bg-yellow-500/8 border border-yellow-500/20 text-xs text-yellow-300/80">
            ⚠️ <strong>AI Screening Finding</strong> — not a final clinical diagnosis. Consult a qualified dentist for professional evaluation.
          </div>
        </div>
      </div>
    </div>` : `
    <div class="card text-center py-14">
      <div class="text-5xl mb-3">🦷</div>
      <h3 class="text-lg font-semibold text-white mb-2">No scans yet</h3>
      <p class="text-gray-400 text-sm mb-4">Upload your first dental scan to get an AI screening report.</p>
      <button onclick="navigate('upload')" class="btn-primary">Upload First Scan</button>
    </div>`}

    <!-- Shared reports -->
    ${shares.length > 0 ? `
    <div class="card">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-semibold text-white">Reports Shared with Doctors</h3>
        <button onclick="navigate('privacy')" class="text-xs text-brand-400 hover:text-brand-300">Manage →</button>
      </div>
      <div class="space-y-2">
        ${shares.slice(0, 3).map(s => `
          <div class="flex items-center justify-between p-3 rounded-xl bg-gray-900 border border-gray-800">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-full bg-accent-500/20 flex items-center justify-center text-accent-400 font-bold text-sm">${(s.doctorName || s.doctorEmail)[0].toUpperCase()}</div>
              <div>
                <div class="text-sm text-white font-medium">${s.doctorName || s.doctorEmail}</div>
                <div class="text-xs text-gray-500">Shared ${new Date(s.sharedAt).toLocaleDateString()} ${s.expiresAt ? '· Expires ' + new Date(s.expiresAt).toLocaleDateString() : ''}</div>
              </div>
            </div>
            <button onclick="revokeReportShare('${s.id}')"
              class="text-xs text-red-400 hover:text-red-300 border border-red-400/30 px-2 py-1 rounded-lg hover:bg-red-500/10 transition-colors">
              Revoke
            </button>
          </div>`).join('')}
      </div>
    </div>` : ''}

    <!-- Quick actions -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
      ${[
        ['📸','New Scan',       "navigate('upload')"],
        ['📋','My Reports',    "navigate('scans')"],
        ['🩺','Share Report',  "navigate('privacy')"],
        ['📅','Book Appt',     "navigate('telehealth')"],
      ].map(([icon, label, action]) => `
        <button onclick="${action}"
          class="card-sm flex flex-col items-center gap-2 py-4 hover:border-brand-500/40 transition-colors cursor-pointer text-center">
          <span class="text-2xl">${icon}</span>
          <span class="text-xs font-semibold text-gray-300">${label}</span>
        </button>`).join('')}
    </div>

    <!-- Recent scans table -->
    ${scans.length > 1 ? `
    <div class="card">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-semibold text-white">Scan History</h3>
        <button onclick="navigate('scans')" class="text-xs text-brand-400 hover:text-brand-300">View All →</button>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-xs text-gray-500 uppercase border-b border-gray-800">
              <th class="pb-2 text-left font-semibold">Date</th>
              <th class="pb-2 text-left font-semibold">Type</th>
              <th class="pb-2 text-center font-semibold">Score</th>
              <th class="pb-2 text-left font-semibold">Top Finding</th>
              <th class="pb-2 text-center font-semibold"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-800/60">
            ${scans.slice(0, 5).map(s => {
              const sc2 = s.score >= 80 ? '#10b981' : s.score >= 60 ? '#f59e0b' : '#ef4444';
              const topFinding = (s.findings || [])[0];
              const topStr = topFinding ? (typeof topFinding === 'string' ? topFinding : topFinding.condition) : '—';
              return `
              <tr class="hover:bg-gray-900/50 cursor-pointer" onclick="navigate('report',{id:'${s.id}'})">
                <td class="py-2.5 text-gray-300">${s.date}</td>
                <td class="py-2.5 text-gray-400 text-xs">${s.type}</td>
                <td class="py-2.5 text-center font-bold" style="color:${sc2}">${s.score}</td>
                <td class="py-2.5 text-gray-400 text-xs truncate max-w-xs">${topStr}</td>
                <td class="py-2.5 text-center"><span class="text-xs text-brand-400">View →</span></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>` : ''}

  </div>
  `;
}

function _timeOfDay() {
  const h = new Date().getHours();
  return h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
}

function revokeReportShare(shareId) {
  const u = AppState.user;
  if (!u) return;
  if (!confirm('Revoke access? The doctor will no longer be able to view this report.')) return;
  Store.revokeShare(shareId, u.email);
  showToast('Report access revoked.', 'success');
  navigate('patient_dashboard');
}
