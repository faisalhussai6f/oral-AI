// ── Doctor Clinical Review Page ───────────────────────────────────────────
function pageDoctorReview(params) {
  const u = AppState.user || {};
  if (u.role !== 'doctor') {
    return `<div class="card text-center py-14">
      <div class="text-4xl mb-3">🔒</div>
      <h3 class="text-lg font-semibold text-white">Access Restricted</h3>
      <p class="text-gray-400 mt-2 text-sm">Only verified doctors can access clinical review.</p>
    </div>`;
  }

  const { shareId, scanId, patientId, patientName: rawName, reviewId } = params || {};
  const patientName = rawName ? decodeURIComponent(rawName) : (patientId || 'Unknown Patient');

  // Load the scan
  const allScans = AppState.scans || [];
  const scan = allScans.find(s => s.id === scanId) || allScans[0] || null;

  // Load image from IndexedDB if available
  if (scan && !scan.imageDataUrl) {
    ImageDB.load(scan?.id).then(url => {
      if (url) { scan.imageDataUrl = url; navigate('doctor_review', params); }
    }).catch(() => {});
  }

  // Load existing review
  const existingReview = reviewId
    ? Store.loadDoctorReviews().find(r => r.id === reviewId)
    : Store.loadDoctorReviews().find(r => r.scanId === scanId && r.doctorId === u.email);

  if (!scan) {
    return `
    <div class="max-w-3xl mx-auto space-y-5">
      <button onclick="navigate('doctor_queue')" class="text-sm text-gray-400 hover:text-brand-400 flex items-center gap-1">← Back to Queue</button>
      <div class="card text-center py-14">
        <div class="text-4xl mb-3">🔍</div>
        <h3 class="text-lg font-semibold text-white">Scan Not Available</h3>
        <p class="text-gray-400 mt-2 text-sm">This patient has not shared a scan or the scan could not be loaded.</p>
      </div>
    </div>`;
  }

  const sc    = scan.score >= 80 ? '#10b981' : scan.score >= 60 ? '#f59e0b' : '#ef4444';
  const scLbl = scan.score >= 80 ? 'Good' : scan.score >= 60 ? 'Fair' : 'Needs Attention';

  const findings = (scan.findings || []).map(f =>
    typeof f === 'string' ? { condition: f, severity: 'Mild', confidence: 0 } : f
  );

  const exFilled = (val) => existingReview ? (existingReview[val] ?? '') : '';

  return `
  <div class="max-w-4xl mx-auto space-y-6">

    <!-- Breadcrumb -->
    <div class="flex items-center gap-2 text-sm text-gray-500">
      <button onclick="navigate('doctor_queue')" class="hover:text-accent-400 transition-colors">← Review Queue</button>
      <span>/</span>
      <span class="text-gray-300 truncate">${patientName}</span>
    </div>

    <!-- Patient header -->
    <div class="card flex flex-col sm:flex-row sm:items-center gap-4"
         style="background:linear-gradient(135deg,#0d0630,#1a0a4a);border-color:#2d1b69">
      <div class="w-12 h-12 rounded-full bg-accent-500/20 flex items-center justify-center text-accent-400 font-bold text-xl flex-shrink-0">
        ${patientName[0].toUpperCase()}
      </div>
      <div class="flex-1 min-w-0">
        <div class="text-lg font-bold text-white">${patientName}</div>
        <div class="text-sm text-gray-400">${patientId || '—'}</div>
        <div class="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
          <span>Scan: ${scan.date}</span>
          <span>Type: ${scan.type}</span>
          ${scan.device ? `<span>Device: ${scan.device}</span>` : ''}
        </div>
      </div>
      <div class="text-center flex-shrink-0">
        <div class="text-3xl font-black" style="color:${sc}">${scan.score}</div>
        <div class="text-xs font-semibold" style="color:${sc}">${scLbl}</div>
        <div class="text-xs text-gray-600 mt-0.5">AI Score</div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">

      <!-- Left: Clinical viewer -->
      <div class="space-y-4">

        <!-- Scan image -->
        <div class="card">
          <h4 class="text-sm font-semibold text-white mb-3">Scanned Image</h4>
          ${scan.imageDataUrl
            ? `<div class="rounded-xl overflow-hidden border border-gray-700">
                 <img src="${scan.imageDataUrl}" alt="Dental scan" class="w-full object-cover max-h-56 rounded-xl"/>
               </div>`
            : `<div class="rounded-xl bg-gray-900 border border-gray-700 flex items-center justify-center h-40">
                 <p class="text-xs text-gray-600">No image available</p>
               </div>`}
          <div class="mt-2 text-xs text-gray-500">
            Image quality: <span class="text-gray-300">${scan.imageQuality || 'Not assessed'}</span>
          </div>
        </div>

        <!-- AI Findings (read-only, clearly labelled) -->
        <div class="card">
          <div class="flex items-center justify-between mb-3">
            <h4 class="text-sm font-semibold text-white">AI Screening Findings</h4>
            <span class="text-xs px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30">AI Output</span>
          </div>
          <div class="p-3 rounded-xl bg-blue-500/5 border border-blue-500/15 mb-3">
            <div class="text-xs text-blue-300/70 font-medium mb-1">⚠️ AI Screening — Not a Clinical Diagnosis</div>
            <div class="text-sm text-gray-200">${scan.diagnosis || 'No AI diagnosis recorded.'}</div>
          </div>
          ${findings.length > 0 ? `
          <div class="space-y-2">
            ${findings.map(f => {
              const cls = f.severity === 'Severe' ? 'badge-severe' : f.severity === 'Moderate' ? 'badge-moderate' : 'badge-mild';
              return `
              <div class="flex items-center justify-between p-2.5 rounded-lg bg-gray-900 border border-gray-800">
                <div class="flex items-center gap-2">
                  <span class="${cls} text-xs">${f.severity || 'Mild'}</span>
                  <span class="text-sm text-white">${f.condition}</span>
                </div>
                <div class="text-xs text-gray-500">
                  ${f.confidence > 0 ? `${f.confidence}% conf.` : ''}
                  ${f.region ? `· ${f.region}` : ''}
                </div>
              </div>`;
            }).join('')}
          </div>` : '<p class="text-xs text-gray-600">No specific findings recorded.</p>'}
          <div class="mt-3 text-xs text-gray-600">
            Model: ${scan.model || '—'} · Confidence: ${scan.confidence || '—'}% · Processing: ${scan.processingTime || '—'}
          </div>
        </div>

        <!-- IoT Sensor Snapshot -->
        ${scan.sensorSnapshot ? `
        <div class="card">
          <h4 class="text-sm font-semibold text-white mb-3">IoT Sensor Snapshot</h4>
          <div class="grid grid-cols-4 gap-2 text-center text-xs">
            ${[
              ['pH', scan.sensorSnapshot.ph, 'text-brand-400'],
              ['Temp', scan.sensorSnapshot.temperature + '°C', 'text-yellow-400'],
              ['Bacterial', scan.sensorSnapshot.bacterial + '%', 'text-red-400'],
              ['Moisture', scan.sensorSnapshot.moisture + '%', 'text-green-400'],
            ].map(([label, val, clr]) => `
              <div>
                <div class="font-bold ${clr}">${val ?? '—'}</div>
                <div class="text-gray-600">${label}</div>
              </div>`).join('')}
          </div>
        </div>` : ''}
      </div>

      <!-- Right: Review form -->
      <div class="card border-accent-500/20">
        <div class="flex items-center justify-between mb-4">
          <h4 class="text-sm font-semibold text-white">Clinical Review</h4>
          <span class="text-xs px-2 py-0.5 rounded-full bg-accent-500/15 text-accent-400 border border-accent-500/30">Doctor Input</span>
        </div>

        ${existingReview ? `
        <div class="mb-4 p-3 rounded-xl bg-green-500/8 border border-green-500/20 text-xs text-green-300">
          ✅ Previously reviewed on ${new Date(existingReview.reviewed_at).toLocaleString()} — you can update below.
        </div>` : ''}

        <form id="review-form" onsubmit="submitDoctorReview(event)" class="space-y-4">
          <input type="hidden" name="shareId"     value="${shareId || ''}"/>
          <input type="hidden" name="scanId"      value="${scan.id}"/>
          <input type="hidden" name="patientId"   value="${patientId || ''}"/>
          <input type="hidden" name="patientName" value="${patientName}"/>

          <!-- AI Assessment -->
          <div>
            <label class="form-label">AI Finding Assessment <span class="text-red-400">*</span></label>
            <div class="grid grid-cols-3 gap-2 mt-1">
              ${[
                ['true',              '✅ Correct',           'text-green-400', 'border-green-500/50', 'bg-green-500/10'],
                ['partially_correct', '⚠️ Partially',        'text-yellow-400','border-yellow-500/50','bg-yellow-500/10'],
                ['false',             '✏️ Incorrect',         'text-red-400',   'border-red-500/50',   'bg-red-500/10'],
              ].map(([val, label, tc, bc, bg]) => `
                <label class="cursor-pointer">
                  <input type="radio" name="ai_correct" value="${val}" class="sr-only"
                    ${exFilled('ai_correct') === val || (!exFilled('ai_correct') && val === 'true') ? 'checked' : ''}
                    onchange="document.querySelectorAll('.ai-opt').forEach(e=>e.classList.remove('ring-2','ring-accent-500')); this.closest('label').querySelector('.ai-opt').classList.add('ring-2','ring-accent-500')"/>
                  <div class="ai-opt p-2 rounded-xl border text-center text-xs font-semibold transition-all ${tc} ${bc} ${bg}
                    ${exFilled('ai_correct') === val ? 'ring-2 ring-accent-500' : ''}">
                    ${label}
                  </div>
                </label>`).join('')}
            </div>
          </div>

          <!-- Corrected diagnosis (shown when AI is wrong) -->
          <div>
            <label class="form-label">Corrected Diagnosis / Labels</label>
            <input type="text" name="corrected_labels" class="form-input text-sm"
              placeholder="e.g. Early caries, mild gingivitis"
              value="${exFilled('corrected_labels')}"/>
            <p class="text-xs text-gray-600 mt-1">Leave blank if AI findings are correct.</p>
          </div>

          <!-- Severity override -->
          <div>
            <label class="form-label">Clinical Severity</label>
            <select name="corrected_severity" class="form-input text-sm">
              ${['— Keep AI assessment —','Clear','Mild','Moderate','Severe','Critical'].map(v => `
                <option value="${v === '— Keep AI assessment —' ? '' : v}"
                  ${exFilled('corrected_severity') === v ? 'selected' : ''}>${v}</option>`).join('')}
            </select>
          </div>

          <!-- Clinical notes -->
          <div>
            <label class="form-label">Clinical Notes <span class="text-red-400">*</span></label>
            <textarea name="review_notes" class="form-input text-sm resize-none" rows="4"
              placeholder="Clinical observations, examination findings, context…" required>${exFilled('review_notes')}</textarea>
          </div>

          <!-- Follow-up -->
          <div>
            <label class="form-label">Recommended Follow-up</label>
            <select name="follow_up" class="form-input text-sm">
              ${[
                ['none',    'No follow-up needed'],
                ['30days',  'Follow-up in 30 days'],
                ['14days',  'Follow-up in 14 days'],
                ['7days',   'Follow-up in 7 days'],
                ['urgent',  '🚨 Urgent referral — contact patient immediately'],
              ].map(([v,l]) => `<option value="${v}" ${exFilled('follow_up')===v?'selected':''}>${l}</option>`).join('')}
            </select>
          </div>

          <!-- Urgency flag -->
          <div>
            <label class="form-label">Mark as Urgent Referral?</label>
            <label class="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" name="urgent_referral" class="rounded accent-red-500 w-4 h-4"
                ${exFilled('urgent_referral') ? 'checked' : ''}/>
              <span class="text-sm text-gray-300">Flag for urgent clinical attention</span>
            </label>
          </div>

          <!-- Action buttons -->
          <div class="flex gap-3 pt-2">
            <button type="submit"
              class="flex-1 py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2"
              style="background:linear-gradient(135deg,#a855f7,#6366f1);color:#fff;">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              ${existingReview ? 'Update Review' : 'Submit Review'}
            </button>
            <button type="button" onclick="navigate('doctor_queue')"
              class="btn-secondary px-4 py-3 text-sm">Cancel</button>
          </div>

          <!-- Disclaimer -->
          <div class="p-3 rounded-xl bg-gray-900 border border-gray-800 text-xs text-gray-500">
            By submitting this review, you confirm this is based on your professional clinical judgement.
            This review is logged in the audit trail and visible to the patient.
          </div>
        </form>
      </div>
    </div>
  </div>
  `;
}

// ── Submit doctor review ───────────────────────────────────────────────────
function submitDoctorReview(e) {
  e.preventDefault();
  const u = AppState.user;
  if (!u || u.role !== 'doctor') { showToast('Unauthorised','error'); return; }

  const form   = e.target;
  const fd     = new FormData(form);
  const get    = (k) => fd.get(k) || '';

  const aiCorrectRaw = get('ai_correct');
  const ai_correct   = aiCorrectRaw === 'true' ? true
                     : aiCorrectRaw === 'false' ? false
                     : 'partially_correct';

  const reviewId = 'REV-' + Date.now().toString().slice(-8) + '-' + Math.random().toString(36).slice(2,6).toUpperCase();

  const review = {
    id:                 reviewId,
    reportId:           get('scanId'),    // using scanId as reportId
    scanId:             get('scanId'),
    patientId:          get('patientId'),
    patientName:        get('patientName'),
    doctorId:           u.email,
    doctorName:         u.name,
    doctorSpeciality:   u.speciality || 'General Dentistry',
    ai_correct,
    corrected_labels:   get('corrected_labels'),
    corrected_severity: get('corrected_severity'),
    review_notes:       get('review_notes'),
    follow_up:          get('follow_up'),
    urgent_referral:    !!form.querySelector('[name=urgent_referral]')?.checked,
    status:             form.querySelector('[name=urgent_referral]')?.checked ? 'urgent' : 'reviewed',
    reviewed_at:        new Date().toISOString(),
    created_at:         new Date().toISOString(),
  };

  Store.addDoctorReview(review);
  showToast('Clinical review saved successfully.', 'success');
  navigate('doctor_queue');
}
