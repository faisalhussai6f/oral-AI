// ── Doctor Dashboard ──────────────────────────────────────────────────────
function pageDashboardDoctor() {
  const u    = AppState.user || {};
  if (u.role !== 'doctor') {
    return `<div class="card text-center py-14">
      <div class="text-4xl mb-3">🔒</div>
      <h3 class="text-lg font-semibold text-white">Access Restricted</h3>
      <p class="text-gray-400 mt-2 text-sm">This dashboard is for verified doctors only.</p>
      <button onclick="navigate('patient_dashboard')" class="btn-primary mt-4">Go to Patient Dashboard</button>
    </div>`;
  }

  const queue   = Store.loadDoctorQueue(u.email);
  const reviews = Store.loadDoctorReviews().filter(r => r.doctorId === u.email);
  const pending = queue.filter(q => !q.reviewed);
  const urgent  = pending.filter(q => q.scan?.urgency === 'urgent' || q.scan?.severity === 'Poor');
  const today   = new Date().toLocaleDateString();
  const todayReviews = reviews.filter(r => new Date(r.reviewed_at).toLocaleDateString() === today);

  // Stats cards data
  const stats = [
    { icon:'📋', label:'Pending Reviews', val: pending.length,     sub:'Awaiting your review',      color:'text-yellow-400', border:'border-yellow-500/20', bg:'bg-yellow-500/8'  },
    { icon:'🚨', label:'Urgent Cases',    val: urgent.length,      sub:'Require immediate attention', color:'text-red-400',    border:'border-red-500/20',    bg:'bg-red-500/8'     },
    { icon:'✅', label:'Reviewed Today',  val: todayReviews.length, sub:'Completed today',            color:'text-green-400',  border:'border-green-500/20',  bg:'bg-green-500/8'   },
    { icon:'📊', label:'Total Reviews',   val: reviews.length,      sub:'All time',                   color:'text-brand-400',  border:'border-brand-500/20',  bg:'bg-brand-500/8'   },
  ];

  // Search/filter state
  const q        = window._dqSearch  || '';
  const filter   = window._dqFilter  || 'all';

  let displayed = queue.filter(item => {
    if (filter === 'pending'  && item.reviewed)          return false;
    if (filter === 'reviewed' && !item.reviewed)         return false;
    if (filter === 'urgent'   && !(item.scan?.urgency === 'urgent' || item.scan?.severity === 'Poor')) return false;
    if (q) {
      const haystack = [item.patientName, item.patientId, item.scan?.findings?.join(' '), item.scan?.date].join(' ').toLowerCase();
      if (!haystack.includes(q.toLowerCase())) return false;
    }
    return true;
  });

  return `
  <div class="max-w-5xl mx-auto space-y-6">

    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold text-white">Doctor Dashboard</h1>
        <p class="text-gray-400 text-sm mt-0.5">${u.name} · ${u.speciality || 'General Dentistry'} · ${today}</p>
      </div>
      <button onclick="navigate('doctor_queue')"
        class="btn-primary flex items-center gap-2 self-start sm:self-auto"
        style="background:linear-gradient(135deg,#a855f7,#6366f1)">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
        Open Review Queue ${pending.length > 0 ? `<span class="bg-white/20 text-white text-xs px-1.5 py-0.5 rounded-full">${pending.length}</span>` : ''}
      </button>
    </div>

    <!-- Stats row -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      ${stats.map(s => `
        <div class="card-sm ${s.bg} border ${s.border}">
          <div class="text-2xl mb-1">${s.icon}</div>
          <div class="text-2xl font-black ${s.color}">${s.val}</div>
          <div class="text-xs font-semibold text-gray-300">${s.label}</div>
          <div class="text-xs text-gray-500 mt-0.5">${s.sub}</div>
        </div>`).join('')}
    </div>

    <!-- Urgent cases banner -->
    ${urgent.length > 0 ? `
    <div class="card border-red-500/30 bg-red-500/5 flex items-center gap-4 p-4">
      <span class="text-3xl flex-shrink-0">🚨</span>
      <div class="flex-1">
        <div class="text-sm font-bold text-red-300">${urgent.length} Urgent Case${urgent.length > 1 ? 's' : ''} Require Immediate Review</div>
        <div class="text-xs text-red-400/70 mt-0.5">These patients may need urgent dental care.</div>
      </div>
      <button onclick="window._dqFilter='urgent'; navigate('doctor_queue')"
        class="text-xs px-3 py-2 rounded-lg bg-red-500/20 border border-red-500/40 text-red-300 hover:bg-red-500/30 transition-colors flex-shrink-0">
        Review Now
      </button>
    </div>` : ''}

    <!-- Review queue preview -->
    <div class="card">
      <div class="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <h3 class="font-semibold text-white flex-1">Review Queue</h3>
        <!-- Search -->
        <div class="relative">
          <svg class="w-3.5 h-3.5 text-gray-500 absolute left-2.5 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          <input type="text" placeholder="Search patient, finding…"
            class="form-input pl-8 text-xs py-1.5 w-48"
            value="${q}"
            oninput="window._dqSearch=this.value; navigate('doctor_dashboard')" />
        </div>
        <!-- Filter pills -->
        <div class="flex gap-1.5 flex-wrap">
          ${[['all','All'],['pending','Pending'],['urgent','Urgent'],['reviewed','Reviewed']].map(([v,l]) => `
            <button onclick="window._dqFilter='${v}'; navigate('doctor_dashboard')"
              class="px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${filter===v
                ? 'bg-accent-500/20 text-accent-300 border-accent-500/40'
                : 'bg-gray-900 text-gray-400 border-gray-700 hover:border-gray-500'}">
              ${l}
            </button>`).join('')}
        </div>
      </div>

      ${displayed.length === 0 ? `
        <div class="text-center py-10">
          <div class="text-4xl mb-2">📭</div>
          <p class="text-gray-400 text-sm">${queue.length === 0 ? 'No patients have shared reports with you yet.' : 'No cases match your filter.'}</p>
        </div>` : `
        <div class="space-y-3">
          ${displayed.slice(0, 6).map(item => _renderQueueCard(item)).join('')}
        </div>
        ${displayed.length > 6 ? `
          <button onclick="navigate('doctor_queue')" class="w-full mt-3 text-xs text-accent-400 hover:text-accent-300 text-center py-2 rounded-lg hover:bg-accent-500/5 transition-colors">
            View all ${displayed.length} cases →
          </button>` : ''}`}
    </div>

    <!-- Recent reviews -->
    ${reviews.length > 0 ? `
    <div class="card">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-semibold text-white">Recent Clinical Reviews</h3>
      </div>
      <div class="space-y-2">
        ${reviews.slice(0, 4).map(r => `
          <div class="flex items-center justify-between p-3 rounded-xl bg-gray-900 border border-gray-800">
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-2 h-2 rounded-full flex-shrink-0 ${r.status === 'urgent' ? 'bg-red-400' : 'bg-green-400'}"></div>
              <div class="min-w-0">
                <div class="text-sm text-white font-medium truncate">${r.patientName || r.patientId}</div>
                <div class="text-xs text-gray-500">${new Date(r.reviewed_at).toLocaleDateString()} · ${r.ai_correct === true ? '✅ AI Confirmed' : r.ai_correct === false ? '✏️ AI Corrected' : '⚠️ Partially Correct'}</div>
              </div>
            </div>
            <button onclick="navigate('doctor_review',{reviewId:'${r.id}',reportId:'${r.reportId}'})"
              class="text-xs text-accent-400 hover:text-accent-300 flex-shrink-0">View →</button>
          </div>`).join('')}
      </div>
    </div>` : ''}

  </div>
  `;
}

// ── Doctor Queue Page ─────────────────────────────────────────────────────
function pageDoctorQueue() {
  const u = AppState.user || {};
  if (u.role !== 'doctor') {
    return `<div class="card text-center py-14"><div class="text-4xl mb-3">🔒</div><h3 class="text-lg font-semibold text-white">Access Restricted</h3></div>`;
  }

  const queue  = Store.loadDoctorQueue(u.email);
  const q      = window._dqSearch || '';
  const filter = window._dqFilter || 'all';

  let displayed = queue.filter(item => {
    if (filter === 'pending'  && item.reviewed)  return false;
    if (filter === 'reviewed' && !item.reviewed)  return false;
    if (filter === 'urgent'   && !(item.scan?.urgency === 'urgent' || item.scan?.severity === 'Poor')) return false;
    if (q) {
      const h = [item.patientName, item.scan?.findings?.join(' '), item.scan?.date].join(' ').toLowerCase();
      if (!h.includes(q.toLowerCase())) return false;
    }
    return true;
  });

  return `
  <div class="max-w-4xl mx-auto space-y-5">
    <div class="flex flex-col sm:flex-row sm:items-center gap-3">
      <h1 class="font-bold text-white text-xl flex-1">Review Queue</h1>
      <div class="relative">
        <svg class="w-3.5 h-3.5 text-gray-500 absolute left-2.5 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
        <input type="text" placeholder="Search…" class="form-input pl-8 text-xs py-1.5 w-52"
          value="${q}" oninput="window._dqSearch=this.value; navigate('doctor_queue')"/>
      </div>
      <div class="flex gap-1.5 flex-wrap">
        ${[['all','All'],['pending','Pending'],['urgent','Urgent'],['reviewed','Reviewed']].map(([v,l]) => `
          <button onclick="window._dqFilter='${v}'; navigate('doctor_queue')"
            class="px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${filter===v
              ? 'bg-accent-500/20 text-accent-300 border-accent-500/40'
              : 'bg-gray-900 text-gray-400 border-gray-700 hover:border-gray-500'}">${l}</button>`).join('')}
      </div>
    </div>

    ${displayed.length === 0 ? `
      <div class="card text-center py-14">
        <div class="text-4xl mb-3">📭</div>
        <p class="text-gray-400 text-sm">${queue.length === 0
          ? 'No patients have shared reports with you yet. Patients can share via Privacy &amp; Data.'
          : 'No cases match your current filter.'}</p>
        ${queue.length === 0 ? '' : `<button onclick="window._dqFilter='all'; window._dqSearch=''; navigate('doctor_queue')" class="btn-secondary mt-4 text-xs">Clear filters</button>`}
      </div>` : `
      <div class="space-y-3">
        ${displayed.map(item => _renderQueueCard(item, true)).join('')}
      </div>`}
  </div>
  `;
}

// ── Shared queue card renderer ─────────────────────────────────────────────
function _renderQueueCard(item, showFull = false) {
  const scan    = item.scan || {};
  const sc      = scan.score >= 80 ? '#10b981' : scan.score >= 60 ? '#f59e0b' : '#ef4444';
  const scLbl   = scan.score >= 80 ? 'Good' : scan.score >= 60 ? 'Fair' : 'Needs Attention';
  const urgency = scan.urgency || 'monitor';
  const urgencyMap = { urgent:'🚨 Urgent', dentist:'⚠️ See Dentist', monitor:'🔵 Monitor', none:'✅ None' };
  const urgencyStr = urgencyMap[urgency] || urgency;
  const reviewed = item.reviewed;
  const review   = item.review;

  const findings = (scan.findings || []).slice(0, 2).map(f => {
    const cond = typeof f === 'string' ? f : (f.condition || 'Finding');
    const sev  = typeof f === 'object' ? f.severity : '';
    const cls  = sev === 'Severe' ? 'badge-severe' : sev === 'Moderate' ? 'badge-moderate' : 'badge-mild';
    return `<span class="${cls} text-xs">${cond}</span>`;
  }).join('');

  return `
  <div class="card hover:border-accent-500/30 transition-all">
    <div class="flex flex-col sm:flex-row gap-4">
      <!-- Patient + scan info -->
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 mb-2 flex-wrap">
          <div class="w-8 h-8 rounded-full bg-accent-500/20 flex items-center justify-center text-accent-400 font-bold text-sm flex-shrink-0">
            ${(item.patientName || item.patientId || '?')[0].toUpperCase()}
          </div>
          <div class="min-w-0">
            <div class="text-sm font-semibold text-white truncate">${item.patientName || item.patientId || 'Unknown Patient'}</div>
            <div class="text-xs text-gray-500">${scan.date || item.sharedAt?.slice(0,10) || '—'} · ${scan.type || 'Basic RGB'}</div>
          </div>
          <span class="ml-auto text-xs px-2 py-0.5 rounded-full font-semibold border ${
            reviewed ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
          }">${reviewed ? '✓ Reviewed' : '⏳ Pending'}</span>
        </div>

        <div class="flex flex-wrap gap-2 mb-2">
          ${findings || '<span class="text-xs text-gray-600">No findings recorded</span>'}
        </div>

        <div class="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
          <span>${urgencyStr}</span>
          ${scan.confidence ? `<span>Confidence: ${scan.confidence}%</span>` : ''}
          ${scan.model ? `<span class="text-gray-600">Model: ${scan.model}</span>` : ''}
        </div>

        ${reviewed && review ? `
        <div class="mt-2 p-2 rounded-lg bg-green-500/8 border border-green-500/20 text-xs text-green-300/80">
          ✅ Reviewed by ${review.doctorName} — ${review.ai_correct === true ? 'AI Confirmed' : review.ai_correct === false ? 'AI Corrected' : 'Partially Correct'}
          ${review.review_notes ? `<div class="mt-1 text-gray-400">"${review.review_notes.slice(0,80)}${review.review_notes.length>80?'…':''}"</div>` : ''}
        </div>` : ''}
      </div>

      <!-- Score + action -->
      <div class="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-3 flex-shrink-0">
        ${scan.score !== undefined ? `
        <div class="text-center">
          <div class="text-2xl font-black" style="color:${sc}">${scan.score}</div>
          <div class="text-xs font-semibold" style="color:${sc}">${scLbl}</div>
        </div>` : ''}
        <button onclick="navigate('doctor_review',{shareId:'${item.id}',scanId:'${item.scanId}',patientId:'${item.patientId}',patientName:'${encodeURIComponent(item.patientName||item.patientId||'')}'})"
          class="text-xs px-3 py-2 rounded-lg border transition-colors ${
            reviewed
              ? 'border-gray-700 text-gray-400 hover:border-accent-500/50 hover:text-accent-400'
              : 'border-accent-500/50 text-accent-300 bg-accent-500/10 hover:bg-accent-500/20'
          }">
          ${reviewed ? 'Edit Review' : 'Review Now →'}
        </button>
      </div>
    </div>
  </div>
  `;
}
