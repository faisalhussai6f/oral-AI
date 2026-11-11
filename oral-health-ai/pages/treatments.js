// ── Treatment / Medication Log Page ──

const TREATMENTS_KEY = 'oralai_treatments';

const TREATMENT_TYPES = [
  '🦷 Dental Cleaning',
  '💊 Fluoride Treatment',
  '🔧 Filling / Restoration',
  '🦷 Root Canal',
  '🧲 Braces / Retainer',
  '💉 Local Anaesthesia',
  '🪥 Scaling & Root Planing',
  '🔬 Biopsy',
  '🦷 Extraction',
  '🌿 Antiseptic Mouthwash',
  '💊 Antibiotics',
  '💊 Pain Medication',
  '💧 Fluoride Supplement',
  '📋 Consultation / Check-up',
  '📝 Other',
];

function _loadTreatments() {
  return Store.get(TREATMENTS_KEY) || [];
}

function _saveTreatments(list) {
  Store.set(TREATMENTS_KEY, list);
}

function pageTreatments() {
  const list   = _loadTreatments();
  const filter = window._treatFilter || 'all';

  const filtered = filter === 'all' ? list
    : list.filter(t => t.type.toLowerCase().includes(filter));

  // Group by month
  const grouped = {};
  filtered.forEach(t => {
    const d   = new Date(t.date);
    const key = isNaN(d) ? 'Unknown date'
      : d.toLocaleDateString('en-US', { month:'long', year:'numeric' });
    (grouped[key] = grouped[key] || []).push(t);
  });

  const statusColor = s => ({
    completed:  'badge-minimal',
    ongoing:    'badge-mild',
    scheduled:  'badge-moderate',
    cancelled:  'badge-severe',
  }[s] || 'badge-minimal');

  return `
  <div class="max-w-3xl mx-auto space-y-6">

    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h2 class="text-2xl font-bold text-white flex items-center gap-2">
          💊 Treatment Log
        </h2>
        <p class="text-gray-400 mt-1 text-sm">
          ${list.length} record${list.length !== 1 ? 's' : ''} · Track medications and dental procedures
        </p>
      </div>
      <button onclick="openTreatmentModal()" class="btn-primary self-start text-sm">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
        </svg>
        Add Entry
      </button>
    </div>

    <!-- Filter chips -->
    <div class="flex flex-wrap gap-2">
      ${[
        ['all',     'All',       list.length],
        ['cleaning','Cleaning',  list.filter(t=>t.type.includes('Cleaning')).length],
        ['fluoride','Fluoride',  list.filter(t=>t.type.includes('Fluoride')).length],
        ['filling', 'Filling',   list.filter(t=>t.type.includes('Filling')).length],
        ['medication','Medication', list.filter(t=>t.type.includes('Medication')||t.type.includes('Antibiotics')||t.type.includes('Pain')||t.type.includes('Supplement')).length],
      ].map(([val,lbl,cnt]) => `
        <button onclick="window._treatFilter='${val}'; navigate('treatments')"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${filter===val
            ? 'bg-brand-500/20 text-brand-300 border-brand-500/40'
            : 'bg-gray-900 text-gray-400 border-gray-700 hover:border-gray-500'}">
          ${lbl}
          ${cnt > 0 ? `<span class="px-1.5 py-0.5 rounded-full text-xs ${filter===val?'bg-brand-500/30':'bg-gray-800'}">${cnt}</span>` : ''}
        </button>`).join('')}
    </div>

    <!-- Timeline -->
    ${filtered.length === 0 ? `
      <div class="card text-center py-16">
        <div class="text-5xl mb-3">💊</div>
        <h3 class="text-lg font-semibold text-white">No records yet</h3>
        <p class="text-gray-400 mt-2 text-sm">
          ${list.length === 0
            ? 'Start logging your dental treatments and medications.'
            : 'No records match this filter.'}
        </p>
        ${list.length === 0
          ? `<button onclick="openTreatmentModal()" class="btn-primary mt-4">Add First Entry</button>`
          : `<button onclick="window._treatFilter='all'; navigate('treatments')" class="btn-secondary mt-4 text-sm">Clear filter</button>`}
      </div>
    ` : Object.entries(grouped).map(([month, items]) => `
      <div>
        <h3 class="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 px-1">${month}</h3>
        <div class="space-y-3">
          ${items.map(t => `
            <div class="card hover:border-gray-700 transition-colors">
              <div class="flex items-start gap-4">
                <!-- Icon -->
                <div class="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20
                            flex items-center justify-center text-lg flex-shrink-0">
                  ${t.type.split(' ')[0]}
                </div>
                <!-- Content -->
                <div class="flex-1 min-w-0">
                  <div class="flex items-start justify-between gap-2 flex-wrap">
                    <div>
                      <span class="font-semibold text-sm text-white">${t.type.replace(/^[^\s]+\s/,'')}</span>
                      <span class="ml-2 ${statusColor(t.status)}">${t.status}</span>
                    </div>
                    <span class="text-xs text-gray-500 flex-shrink-0">${_formatDate(t.date)}</span>
                  </div>
                  ${t.dentist ? `<div class="text-xs text-gray-400 mt-1">👨‍⚕️ ${t.dentist}</div>` : ''}
                  ${t.dosage ? `<div class="text-xs text-gray-400 mt-0.5">💊 ${t.dosage}</div>` : ''}
                  ${t.notes ? `<p class="text-xs text-gray-400 mt-2 leading-relaxed border-t border-gray-900 pt-2">${t.notes}</p>` : ''}
                  ${t.linkedScanId ? `
                    <button onclick="navigate('report',{id:'${t.linkedScanId}'})"
                      class="text-xs text-brand-400 hover:underline mt-2 inline-flex items-center gap-1">
                      🔗 View linked scan
                    </button>` : ''}
                </div>
                <!-- Delete -->
                <button onclick="deleteTreatment(event,'${t.id}')"
                  class="text-gray-700 hover:text-red-400 transition-colors flex-shrink-0 text-base" title="Delete">✕</button>
              </div>
            </div>`).join('')}
        </div>
      </div>`).join('')}

    <!-- Summary card -->
    ${list.length > 0 ? `
    <div class="card">
      <h3 class="font-semibold text-white mb-3 text-sm">Treatment Summary</h3>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs">
        ${[
          ['📊', list.length,                                        'Total'],
          ['✅', list.filter(t=>t.status==='completed').length,     'Completed'],
          ['⏳', list.filter(t=>t.status==='ongoing').length,       'Ongoing'],
          ['📅', list.filter(t=>t.status==='scheduled').length,     'Scheduled'],
        ].map(([icon,val,lbl])=>`
          <div class="p-3 rounded-xl bg-gray-900 border border-gray-800">
            <div class="text-lg">${icon}</div>
            <div class="text-xl font-black text-white mt-1">${val}</div>
            <div class="text-gray-500 mt-0.5">${lbl}</div>
          </div>`).join('')}
      </div>
    </div>` : ''}

  </div>

  <!-- Add/Edit Modal -->
  <div id="treatment-modal"
       class="hidden fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
    <div class="card max-w-lg w-full space-y-4 max-h-[90vh] overflow-y-auto border-brand-500/20">
      <div class="flex items-center justify-between">
        <h3 class="font-bold text-white">Add Treatment Entry</h3>
        <button onclick="closeTreatmentModal()" class="text-gray-500 hover:text-white text-lg">✕</button>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div class="sm:col-span-2">
          <label class="form-label">Treatment / Medication Type</label>
          <select id="treat-type" class="form-input">
            ${TREATMENT_TYPES.map(t => `<option value="${t}">${t}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="form-label">Date</label>
          <input id="treat-date" type="date" class="form-input"
                 value="${new Date().toISOString().split('T')[0]}" />
        </div>
        <div>
          <label class="form-label">Status</label>
          <select id="treat-status" class="form-input">
            <option value="completed">✅ Completed</option>
            <option value="ongoing">⏳ Ongoing</option>
            <option value="scheduled">📅 Scheduled</option>
            <option value="cancelled">✕ Cancelled</option>
          </select>
        </div>
        <div>
          <label class="form-label">Dentist / Doctor <span class="text-gray-600 font-normal">(optional)</span></label>
          <input id="treat-dentist" type="text" class="form-input" placeholder="Dr. Arjun Sharma" />
        </div>
        <div>
          <label class="form-label">Dosage / Frequency <span class="text-gray-600 font-normal">(optional)</span></label>
          <input id="treat-dosage" type="text" class="form-input" placeholder="e.g. 500 mg twice daily" />
        </div>
        <div class="sm:col-span-2">
          <label class="form-label">Link to Scan <span class="text-gray-600 font-normal">(optional)</span></label>
          <select id="treat-scan" class="form-input">
            <option value="">— None —</option>
            ${AppState.scans.map(s => `<option value="${s.id}">${s.id} · ${s.date}</option>`).join('')}
          </select>
        </div>
        <div class="sm:col-span-2">
          <label class="form-label">Notes <span class="text-gray-600 font-normal">(optional)</span></label>
          <textarea id="treat-notes" class="form-input" rows="3"
            placeholder="Side effects, observations, follow-up instructions…"></textarea>
        </div>
      </div>

      <div class="flex gap-3">
        <button onclick="saveTreatmentEntry()" class="btn-primary flex-1 justify-center">Save Entry</button>
        <button onclick="closeTreatmentModal()" class="btn-secondary w-28 justify-center">Cancel</button>
      </div>
    </div>
  </div>
  `;
}

function _formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return isNaN(d) ? dateStr : d.toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric' });
}

function openTreatmentModal() {
  document.getElementById('treatment-modal')?.classList.remove('hidden');
  // Reset form
  ['treat-type','treat-status','treat-scan','treat-notes','treat-dentist','treat-dosage']
    .forEach(id => {
      const el = document.getElementById(id);
      if (el) { if (el.tagName === 'SELECT') el.selectedIndex = 0; else el.value = ''; }
    });
  const dateEl = document.getElementById('treat-date');
  if (dateEl) dateEl.value = new Date().toISOString().split('T')[0];
}

function closeTreatmentModal() {
  document.getElementById('treatment-modal')?.classList.add('hidden');
}

function saveTreatmentEntry() {
  const type    = document.getElementById('treat-type')?.value;
  const date    = document.getElementById('treat-date')?.value;
  const status  = document.getElementById('treat-status')?.value || 'completed';
  const dentist = document.getElementById('treat-dentist')?.value.trim() || '';
  const dosage  = document.getElementById('treat-dosage')?.value.trim() || '';
  const scan    = document.getElementById('treat-scan')?.value || '';
  const notes   = document.getElementById('treat-notes')?.value.trim() || '';

  if (!type || !date) { showToast('Type and date are required', 'error'); return; }

  const entry = {
    id:           'TRT-' + Date.now().toString().slice(-8),
    type, date, status, dentist, dosage, notes,
    linkedScanId: scan || null,
    createdAt:    new Date().toISOString(),
  };

  const list = _loadTreatments();
  list.unshift(entry);
  _saveTreatments(list);

  closeTreatmentModal();
  showToast('Treatment entry saved!', 'success');
  navigate('treatments');
}

function deleteTreatment(e, id) {
  e.stopPropagation();
  if (!confirm('Delete this treatment record?')) return;
  _saveTreatments(_loadTreatments().filter(t => t.id !== id));
  showToast('Record deleted', 'info');
  navigate('treatments');
}
