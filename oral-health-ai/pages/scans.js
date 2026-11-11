// ── My Scans Page ──
function pageScans() {
  const scans = AppState.scans;

  // Lazily load any images not yet stamped from IndexedDB
  const unloaded = scans.filter(s => !s.imageDataUrl);
  if (unloaded.length) {
    ImageDB.stampAll(unloaded).then(() => {
      // Only re-render if we actually got new images
      if (unloaded.some(s => s.imageDataUrl)) navigate('scans');
    }).catch(() => {});
  }
  // Search / filter state (persisted in module-level vars so refresh works)
  const q      = window._scanSearch  || '';
  const filter = window._scanFilter  || 'all';

  let filtered = scans.filter(s => {
    const matchQ = !q || s.id.toLowerCase().includes(q) ||
                   s.type.toLowerCase().includes(q) ||
                   (s.findings || []).join(' ').toLowerCase().includes(q) ||
                   s.date.toLowerCase().includes(q);
    const matchF = filter === 'all'  ? true
                 : filter === 'good' ? s.score >= 80
                 : filter === 'fair' ? (s.score >= 60 && s.score < 80)
                 : filter === 'poor' ? s.score < 60
                 : true;
    return matchQ && matchF;
  });

  const avgScore = scans.length
    ? Math.round(scans.reduce((a,s) => a + s.score, 0) / scans.length)
    : 0;
  const bestScore = scans.length ? Math.max(...scans.map(s => s.score)) : 0;

  return `
  <div class="max-w-5xl mx-auto space-y-5">

    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h2 class="text-2xl font-bold text-white flex items-center gap-2">
          My Scans
          ${(typeof _activeMember === 'function' && _activeMember()) ? (() => {
            const m = (Store.get('oralai_family')||[]).find(x=>x.id===_activeMember());
            return m ? `<span class="text-xs px-2.5 py-1 rounded-full font-semibold" style="background:${m.color}33;border:1px solid ${m.color}66;color:${m.color};">${m.name}</span>` : '';
          })() : ''}
        </h2>
        <p class="text-gray-400 mt-1">${scans.length} scan${scans.length !== 1 ? 's' : ''} on record</p>
      </div>
      <div class="flex gap-2 flex-wrap self-start">
        <button onclick="navigate('camera')" class="btn-secondary text-sm flex items-center gap-1.5">
          📸 Camera
        </button>
        <button onclick="navigate('upload')" class="btn-primary text-sm">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
          </svg>
          New Scan
        </button>
        ${scans.length > 0 ? `
        <button onclick="navigate('progress')" class="btn-secondary text-sm flex items-center gap-1.5">
          📈 Progress
        </button>
        <button onclick="toggleBulkMode()" id="bulk-toggle-btn"
          class="btn-secondary text-sm flex items-center gap-1.5">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
          </svg>
          Select
        </button>
        <button onclick="exportScansCSV()"
          class="btn-secondary text-sm flex items-center gap-1.5">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
          Export CSV
        </button>` : ''}
      </div>
    </div>

    <!-- Bulk action bar (hidden by default) -->
    <div id="bulk-action-bar" class="hidden items-center justify-between gap-3 p-3 rounded-xl
         bg-brand-500/10 border border-brand-500/30">
      <div class="flex items-center gap-3">
        <input type="checkbox" id="select-all-cb" class="accent-brand-500 w-4 h-4"
               onchange="selectAllScans(this.checked)" />
        <span class="text-sm text-brand-300 font-semibold" id="bulk-count">0 selected</span>
      </div>
      <div class="flex gap-2">
        <button onclick="bulkCompare()"
          class="btn-secondary text-xs px-3 py-2 flex items-center gap-1.5">
          ⚖️ Compare 2
        </button>
        <button onclick="bulkDelete()"
          class="text-xs px-3 py-2 rounded-lg border border-red-800 text-red-400
                 hover:bg-red-900/20 transition-colors flex items-center gap-1.5">
          🗑 Delete Selected
        </button>
        <button onclick="toggleBulkMode()" class="btn-secondary text-xs px-3 py-2">
          Cancel
        </button>
      </div>
    </div>

    <!-- Summary stats -->
    ${scans.length > 0 ? `
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
      ${[
        ['📊', scans.length,                                                    'Total',      'text-white'],
        ['🏆', bestScore,                                                        'Best Score', 'text-green-400'],
        ['📈', avgScore,                                                         'Avg Score',  avgScore>=80?'text-green-400':avgScore>=60?'text-yellow-400':'text-red-400'],
        ['🔍', scans.reduce((a,s) => a + (s.findings||[]).length, 0),          'Findings',   'text-brand-400'],
      ].map(([icon,val,label,clr]) => `
        <div class="card-sm text-center">
          <div class="text-xl">${icon}</div>
          <div class="text-xl font-black mt-1 ${clr}">${val}</div>
          <div class="text-xs text-gray-500 mt-0.5">${label}</div>
        </div>`).join('')}
    </div>` : ''}

    <!-- Search + Filter bar -->
    <div class="flex flex-col sm:flex-row gap-3">
      <div class="relative flex-1">
        <svg class="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
        </svg>
        <input type="text" placeholder="Search by ID, type, finding, date…"
          class="form-input pl-9"
          value="${q}"
          oninput="window._scanSearch=this.value; navigate('scans')" />
      </div>
      <div class="flex gap-2 flex-wrap">
        ${[['all','All'],['good','Good (80+)'],['fair','Fair (60–79)'],['poor','Poor (<60)']].map(([v,l]) => `
          <button onclick="window._scanFilter='${v}'; navigate('scans')"
            class="px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${filter===v
              ? 'bg-brand-500/20 text-brand-300 border-brand-500/40'
              : 'bg-gray-900 text-gray-400 border-gray-700 hover:border-gray-500'}">
            ${l}
          </button>`).join('')}
      </div>
    </div>

    <!-- Scan cards -->
    ${filtered.length === 0 ? `
      <div class="card text-center py-14">
        <div class="text-5xl mb-3">${scans.length === 0 ? '🦷' : '🔍'}</div>
        <h3 class="text-lg font-semibold text-white">
          ${scans.length === 0 ? 'No scans yet' : 'No results found'}
        </h3>
        <p class="text-gray-400 mt-2 text-sm">
          ${scans.length === 0 ? 'Upload your first dental scan to get started' : 'Try adjusting your search or filter'}
        </p>
        ${scans.length === 0 ? `
          <button onclick="navigate('upload')" class="btn-primary mt-4">Upload First Scan</button>` :
          `<button onclick="window._scanSearch=''; window._scanFilter='all'; navigate('scans')"
            class="btn-secondary mt-4 text-sm">Clear Filters</button>`}
      </div>
    ` : `
      <div class="space-y-3">
        ${filtered.map(s => _renderScanCard(s)).join('')}
      </div>
      ${filtered.length < scans.length ? `
        <p class="text-center text-xs text-gray-500">
          Showing ${filtered.length} of ${scans.length} scans
          <button onclick="window._scanSearch=''; window._scanFilter='all'; navigate('scans')"
            class="text-brand-400 hover:underline ml-1">Clear filters</button>
        </p>` : ''}
    `}

  </div>
  `;
}

function _renderScanCard(s) {
  const c     = s.score >= 80 ? '#10b981' : s.score >= 60 ? '#f59e0b' : '#ef4444';
  const circ  = 339.3;
  const off   = circ - (s.score / 100) * circ;
  const label = s.score >= 80 ? 'Good' : s.score >= 60 ? 'Fair' : 'Poor';

  const topFindings = (s.findings || []).slice(0, 3).map(f =>
    typeof f === 'string' ? f : (f.condition || f.name || 'Finding')
  );

  return `
  <div class="card hover:border-brand-500/30 transition-all duration-200 cursor-pointer group"
       onclick="_bulkMode ? toggleScanCheck('${s.id}') : navigate('report',{id:'${s.id}'})">
    <div class="flex flex-col sm:flex-row sm:items-center gap-4">

      <!-- Bulk checkbox (hidden unless in bulk mode) -->
      <div class="bulk-checkbox hidden flex-shrink-0" onclick="event.stopPropagation()">
        <input type="checkbox" class="scan-cb w-4 h-4 accent-brand-500 cursor-pointer"
               data-id="${s.id}" onchange="updateBulkCount()" />
      </div>

      <!-- Mini score ring -->
      <div class="flex-shrink-0">
        <div class="ring-container" style="width:68px;height:68px;">
          <svg width="68" height="68" viewBox="0 0 160 160">
            <circle class="ring-bg" cx="80" cy="80" r="54"/>
            <circle class="ring-fill" cx="80" cy="80" r="54"
              stroke="${c}" stroke-dasharray="${circ}" stroke-dashoffset="${off}"
              transform="rotate(-90 80 80)"/>
          </svg>
          <div class="ring-text">
            <div class="text-xs font-black text-white">${s.score}</div>
            <div class="text-[9px]" style="color:${c}">${label}</div>
          </div>
        </div>
      </div>

      <!-- Thumbnail (if available) -->
      ${s.imageDataUrl ? `
        <div class="flex-shrink-0 hidden sm:block">
          <img src="${s.imageDataUrl}" alt="scan"
            class="w-16 h-14 object-cover rounded-lg border border-gray-700 group-hover:border-brand-500/40 transition-colors"/>
        </div>` : ''}

      <!-- Info -->
      <div class="flex-1 min-w-0">
        <div class="flex items-start justify-between gap-2 mb-1">
          <div>
            <div class="font-mono text-brand-400 text-xs font-semibold truncate">${s.id}</div>
            <div class="text-gray-400 text-xs mt-0.5">
              ${s.date} · ${s.type} · ${s.device}
              ${s.region ? ` · ${s.region}` : ''}
            </div>
          </div>
          <span class="badge-minimal flex-shrink-0 text-xs">${s.status}</span>
        </div>

        <!-- Finding tags -->
        <div class="flex flex-wrap gap-1.5 mt-2">
          ${topFindings.map(f => `
            <span class="text-xs px-2 py-0.5 rounded-md bg-gray-900 border border-gray-700 text-gray-300">${f}</span>
          `).join('')}
          ${(s.findings||[]).length > 3 ? `
            <span class="text-xs px-2 py-0.5 rounded-md bg-gray-900 border border-gray-700 text-gray-500">
              +${s.findings.length - 3} more
            </span>` : ''}
          ${(s.findings||[]).length === 0 ? `
            <span class="text-xs px-2 py-0.5 rounded-md bg-green-900/30 border border-green-800 text-green-400">All Clear</span>` : ''}
        </div>

        <!-- Confidence bar -->
        <div class="flex items-center gap-3 mt-2">
          <div class="sensor-bar flex-1 max-w-xs">
            <div class="sensor-fill" style="width:${s.confidence||0}%;background:#28a8ff"></div>
          </div>
          <span class="text-xs text-gray-500">Confidence <span class="text-gray-300">${s.confidence||0}%</span></span>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex gap-2 flex-shrink-0" onclick="event.stopPropagation()">
        <button onclick="navigate('report',{id:'${s.id}'})"
          class="btn-secondary text-xs px-3 py-2">View</button>
        <button onclick="navigate('printreport',{id:'${s.id}'})"
          class="btn-primary text-xs px-3 py-2">Download</button>
        <button onclick="deleteScan(event,'${s.id}')"
          class="text-xs px-2.5 py-2 rounded-lg border border-gray-700 text-gray-500 hover:border-red-800 hover:text-red-400 transition-colors"
          title="Delete scan">🗑</button>
      </div>
    </div>
  </div>`;
}

function deleteScan(e, id) {
  e.stopPropagation();
  if (!confirm('Delete this scan? This cannot be undone.')) return;
  AppState.scans = AppState.scans.filter(s => s.id !== id);
  saveScans();
  showToast('Scan deleted', 'info');
  navigate('scans');
}

// ── Bulk mode state ──
let _bulkMode = false;

// Reset bulk mode whenever we navigate away from the scans page
document.addEventListener('page:rendered', (e) => {
  if (e.detail.page !== 'scans') _bulkMode = false;
});

function toggleBulkMode() {
  _bulkMode = !_bulkMode;
  const bar  = document.getElementById('bulk-action-bar');
  const btn  = document.getElementById('bulk-toggle-btn');
  const cbs  = document.querySelectorAll('.bulk-checkbox');
  bar?.classList.toggle('hidden',  !_bulkMode);
  bar?.classList.toggle('flex',     _bulkMode);
  cbs.forEach(cb => cb.classList.toggle('hidden', !_bulkMode));
  if (btn) btn.textContent = _bulkMode ? '✕ Cancel' : '☑ Select';
  if (!_bulkMode) {
    document.querySelectorAll('.scan-cb').forEach(c => { c.checked = false; });
    const cb = document.getElementById('select-all-cb');
    if (cb) cb.checked = false;
    updateBulkCount();
  }
}

function toggleScanCheck(id) {
  const cb = document.querySelector(`.scan-cb[data-id="${id}"]`);
  if (cb) { cb.checked = !cb.checked; updateBulkCount(); }
}

function updateBulkCount() {
  const checked = document.querySelectorAll('.scan-cb:checked').length;
  const el = document.getElementById('bulk-count');
  if (el) el.textContent = `${checked} selected`;
  // Sync select-all state
  const total = document.querySelectorAll('.scan-cb').length;
  const allCb = document.getElementById('select-all-cb');
  if (allCb) allCb.checked = checked > 0 && checked === total;
}

function selectAllScans(checked) {
  document.querySelectorAll('.scan-cb').forEach(cb => { cb.checked = checked; });
  updateBulkCount();
}

function bulkDelete() {
  const ids = [...document.querySelectorAll('.scan-cb:checked')].map(c => c.dataset.id);
  if (!ids.length) { showToast('No scans selected', 'warning'); return; }
  if (!confirm(`Delete ${ids.length} scan${ids.length > 1 ? 's' : ''}? This cannot be undone.`)) return;
  AppState.scans = AppState.scans.filter(s => !ids.includes(s.id));
  saveScans();
  _bulkMode = false;
  showToast(`${ids.length} scan${ids.length > 1 ? 's' : ''} deleted`, 'info');
  navigate('scans');
}

function bulkCompare() {
  const ids = [...document.querySelectorAll('.scan-cb:checked')].map(c => c.dataset.id);
  if (ids.length !== 2) { showToast('Select exactly 2 scans to compare', 'warning'); return; }
  _bulkMode = false;
  navigate('compare', { a: ids[0], b: ids[1] });
}

function exportScansCSV() {
  if (!AppState.scans.length) { showToast('No scans to export', 'warning'); return; }
  const headers = ['ID','Date','Type','Device','Score','Confidence','Status','Findings','Diagnosis'];
  const rows = AppState.scans.map(s => [
    s.id, s.date, s.type, s.device, s.score, s.confidence || '',
    s.status,
    `"${(s.findings || []).map(f => typeof f === 'string' ? f : (f.condition || '')).join('; ')}"`,
    `"${(s.diagnosis || '').replace(/"/g, '""')}"`,
  ]);
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = `oralai-scans-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
  showToast(`Exported ${AppState.scans.length} scans as CSV`, 'success');
}
