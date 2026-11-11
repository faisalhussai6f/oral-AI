// ── Helper: normalise a finding entry to a plain object ──
function _normFinding(f) {
  if (typeof f === 'string') {
    return { name: f, condition: f, severity: 'Mild', confidence: 85, region: '—',
             description: 'Detected by CNN image analysis.' };
  }
  return {
    name:        f.condition || f.name || 'Finding',
    condition:   f.condition || f.name || 'Finding',
    severity:    f.severity  || 'Mild',
    confidence:  f.confidence != null ? f.confidence : 85,
    region:      f.region    || '—',
    description: f.description || 'Detected by CNN image analysis and IoT sensor fusion.',
  };
}

// ── Severity → badge class ──
function _sevBadge(sev) {
  return { Severe:'badge-severe', Moderate:'badge-moderate', Mild:'badge-mild',
           Early:'badge-moderate', Minimal:'badge-minimal' }[sev] || 'badge-mild';
}

// ── Report Page (Figure 3) ──
function pageReport(params) {
  const scan = AppState.scans.find(s => s.id === params.id) || AppState.scans[0];
  if (!scan) return _page404();

  // Load image from IndexedDB if not already in memory
  if (!scan.imageDataUrl) {
    ImageDB.load(scan.id).then(url => {
      if (url) { scan.imageDataUrl = url; navigate('report', params); }
    }).catch(() => {});
  }

  const sc     = scan.score >= 80 ? '#10b981' : scan.score >= 60 ? '#f59e0b' : '#ef4444';
  const scLbl  = scan.score >= 80 ? 'Good'    : scan.score >= 60 ? 'Fair'    : 'Needs Attention';
  const circ   = 339.3;
  const offset = circ - (scan.score / 100) * circ;

  const findings = (scan.findings || []).map(_normFinding);
  const recs     = scan.recommendations || [
    'Professional dental cleaning within 3 months',
    'Use fluoride toothpaste daily',
    'Increase flossing to twice daily',
    'Avoid acidic foods and beverages',
    'Follow-up AI scan in 30 days',
  ];

  // Use backend-provided model ID — never show stale demo labels
  const model = scan.model
    || AppState.settings._backendModelId
    || (scan.demoMode ? 'oralai-demo-mode' : 'oralai-efficientnet-b0-v1');

  const procTime  = scan.processingTime || '—';
  const isLowConf = scan.low_confidence === true || (scan.confidence || 0) < 60;
  const isDemoMode = scan.demoMode === true;

  // Logical consistency: if score says Good but findings include severe conditions, override label
  const worstSev = findings.reduce((acc, f) => {
    const rank = { Severe:3, Moderate:2, Mild:1, 0:0 };
    return (rank[f.severity] || 0) > (rank[acc] || 0) ? f.severity : acc;
  }, '');
  const effectiveScore = findings.length === 0 ? scan.score : scan.score;
  // If score>=80 but have Severe/Moderate findings, label overrides to be consistent
  const consistentLabel = (effectiveScore >= 80 && worstSev === 'Severe') ? 'Needs Attention'
    : (effectiveScore >= 80 && worstSev === 'Moderate') ? 'Fair'
    : scLbl;

  // Sensor snapshot stored with scan
  const snap = scan.sensorSnapshot || null;

  return `
  <div class="max-w-5xl mx-auto space-y-6">

    <!-- Breadcrumb -->
    <div class="flex items-center gap-2 text-sm text-gray-500">
      <button onclick="navigate('scans')" class="hover:text-brand-400 transition-colors">← Back to Scans</button>
      <span>/</span>
      <span class="text-gray-300 font-mono text-xs truncate max-w-xs">${scan.id}</span>
    </div>

    <!-- Demo mode warning -->
    ${isDemoMode ? `
    <div class="card border-yellow-500/40 bg-yellow-500/8 flex items-start gap-3 p-4">
      <span class="text-xl flex-shrink-0">⚠️</span>
      <div>
        <div class="text-sm font-bold text-yellow-300">Demo Mode — Results are Simulated</div>
        <div class="text-xs text-yellow-200/70 mt-0.5">This report was generated without a real AI model. The findings, score, and recommendations are randomly generated and do NOT reflect your actual oral health. Connect to the backend for real analysis.</div>
      </div>
    </div>` : ''}

    <!-- Low confidence warning -->
    ${isLowConf ? `
    <div class="card border-orange-500/40 bg-orange-500/8 flex items-start gap-3 p-4">
      <span class="text-xl flex-shrink-0">🔍</span>
      <div>
        <div class="text-sm font-bold text-orange-300">Low-Confidence Screening Result</div>
        <div class="text-xs text-orange-200/70 mt-0.5">Confidence: <strong>${scan.confidence}%</strong> — below the 60% reliability threshold. This result may not accurately reflect the condition shown. Please retake the image in better lighting or request a dentist review before acting on these findings.</div>
      </div>
    </div>` : ''}

    <!-- Header card -->
    <div class="card flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4"
         style="background:linear-gradient(135deg,#051428,#0a1f3c);border-color:#1e3a5f;">
      <div>
        <div class="flex items-center gap-2 mb-1">
          <span class="badge-minimal">✓ AI Analyzed</span>
          <span class="text-xs text-gray-500">${scan.date}</span>
          <span class="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-400">${model}</span>
        </div>
        <h2 class="text-xl font-bold text-white">Scan Analysis Report</h2>
        <p class="text-gray-400 text-xs font-mono mt-1">${scan.id}</p>
      </div>
      <div class="flex gap-2 flex-wrap">
        <button onclick="copyReportId('${scan.id}')" class="btn-secondary text-xs px-3 py-2 flex items-center gap-1.5">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
          </svg>Copy ID
        </button>
        <button onclick="shareDentist('${scan.id}')" class="btn-secondary text-xs px-3 py-2 flex items-center gap-1.5">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
          </svg>Share
        </button>
        <button onclick="navigate('printreport',{id:'${scan.id}'})" class="btn-primary text-xs px-3 py-2 flex items-center gap-1.5">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
          </svg>Download
        </button>
      </div>
    </div>

    <!-- Main grid -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">

      <!-- LEFT: score + meta -->
      <div class="space-y-4">

        <!-- Score ring -->
        <div class="card text-center py-5">
          <p class="text-xs text-gray-500 uppercase tracking-wider mb-3">Oral Health Score</p>
          <div class="ring-container mx-auto" style="width:130px;height:130px;">
            <svg width="130" height="130" viewBox="0 0 160 160">
              <circle class="ring-bg" cx="80" cy="80" r="54"/>
              <circle class="ring-fill" cx="80" cy="80" r="54"
                stroke="${sc}" stroke-dasharray="${circ}" stroke-dashoffset="${offset}"
                transform="rotate(-90 80 80)"/>
            </svg>
            <div class="ring-text">
              <div class="text-3xl font-black text-white">${scan.score}</div>
              <div class="text-xs font-semibold" style="color:${sc}">${consistentLabel}</div>
            </div>
          </div>
          <div class="flex justify-center gap-4 mt-3 text-xs text-gray-500">
            <span>Confidence: <strong class="text-white">${scan.confidence}%</strong></span>
            <span>Findings: <strong class="text-white">${findings.length}</strong></span>
          </div>
        </div>

        <!-- Scan meta -->
        <div class="card">
          <h4 class="text-sm font-semibold text-white mb-3">Scan Information</h4>
          <div class="space-y-2 text-xs">
            ${[
              ['Report ID',      scan.id,         true ],
              ['Scan Type',      scan.type,       false],
              ['Device',         scan.device,     false],
              ['Region',         scan.region || '—', false],
              ['Date',           scan.date,       false],
              ['Model',          model,           false],
              ['Processing',     procTime,        false],
              ['Sensor Fusion',  snap ? 'Yes ✓' : 'No', false],
            ].map(([k,v,mono]) => `
              <div class="flex justify-between gap-2 py-1 border-b border-gray-900 last:border-0">
                <span class="text-gray-500 flex-shrink-0">${k}</span>
                <span class="${mono?'font-mono text-brand-400 text-xs':'text-gray-200'} text-right truncate max-w-[140px]">${v}</span>
              </div>`).join('')}
          </div>
        </div>

        <!-- Sensor snapshot (if stored) -->
        ${snap ? `
        <div class="card">
          <h4 class="text-sm font-semibold text-white mb-3">IoT Snapshot at Scan</h4>
          <div class="grid grid-cols-2 gap-2 text-xs">
            ${[
              ['🧪','pH',        snap.ph,          6.5, 7.5,   ''],
              ['🌡️','Temp',     snap.temperature, 36.1,37.2, '°C'],
              ['🦠','Bacterial', snap.bacterial,   0,   50,   '%'],
              ['💧','Moisture',  snap.moisture,    60,  100,  '%'],
            ].map(([ic,lb,val,lo,hi,un]) => {
              const ok = val >= lo && val <= hi;
              return `
              <div class="p-2 rounded-lg bg-gray-900 border border-gray-800 text-center">
                <div class="text-base">${ic}</div>
                <div class="font-bold ${ok?'text-green-400':'text-red-400'} tabular-nums">${val}${un}</div>
                <div class="text-gray-600">${lb}</div>
              </div>`;
            }).join('')}
          </div>
        </div>` : ''}

      </div>

      <!-- RIGHT: image + findings + recs -->
      <div class="lg:col-span-2 space-y-4">

        <!-- Emergency red flags (top of report, before everything else) -->
        ${typeof renderEmergencyFlags === 'function' ? renderEmergencyFlags(scan) : ''}

        <!-- Unable-to-assess warning (low confidence) -->
        ${typeof renderUnableToAssess === 'function' ? renderUnableToAssess(scan) : ''}

        <!-- Severity grading + urgency -->
        ${typeof renderSeverityBadge === 'function' ? renderSeverityBadge(scan) : ''}

        <!-- Scanned image + AI Heatmap Overlay -->
        <div class="card">
          <div class="flex items-center justify-between mb-3">
            <h4 class="text-sm font-semibold text-white">Scanned Image</h4>
            <div class="flex items-center gap-2">
              ${scan.imageDataUrl ? `<span class="badge-minimal text-xs">Uploaded ✓</span>` : ''}
              <span class="text-xs text-gray-600">+ AI Heatmap</span>
            </div>
          </div>
          <!-- Heatmap overlay (shows image if available, always shows hotspot overlay) -->
          ${typeof renderHeatmap === 'function'
            ? renderHeatmap(scan, 360, 220)
            : (scan.imageDataUrl
                ? `<div class="rounded-xl overflow-hidden border border-gray-700"><img src="${scan.imageDataUrl}" alt="Dental scan" class="w-full object-cover max-h-52 rounded-xl" /></div>`
                : `<div class="rounded-xl bg-gray-900 border border-gray-800 flex items-center justify-center" style="height:160px;"><p class="text-xs text-gray-600">No image stored</p></div>`)
          }
          ${findings.length > 0 ? `<p class="text-xs text-gray-600 mt-2 text-center">Coloured regions indicate AI attention areas. Intensity = confidence level.</p>` : ''}
        </div>

        <!-- AI Analysis Complete banner -->
        <div class="p-4 rounded-xl border flex items-start gap-3"
             style="background:#081a0f;border-color:#166534;">
          <div class="w-9 h-9 rounded-xl bg-green-500/20 flex items-center justify-center flex-shrink-0">
            <svg class="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <div>
            <div class="font-semibold text-green-300 text-sm">AI Analysis Complete</div>
            <div class="text-xs text-gray-400 mt-0.5">
              Model: <strong class="text-gray-200">${model}</strong> ·
              Scan type: <strong class="text-gray-200">${scan.type}</strong> ·
              Processing: <strong class="text-gray-200">${procTime}</strong>
            </div>
            <div class="flex flex-wrap gap-4 mt-1.5 text-xs text-gray-400">
              <span>Confidence <strong class="text-white">${scan.confidence}%</strong></span>
              <span>Findings <strong class="text-white">${findings.length}</strong></span>
              <span>Attention areas <strong class="text-white">${scan.attentionAreas || findings.length}</strong></span>
              ${(() => {
                try {
                  const fullRisk = typeof computeFullRisk === 'function' ? computeFullRisk(scan) : null;
                  if (!fullRisk) return '';
                  const rc = fullRisk.combinedRisk >= 60 ? '#ef4444' : fullRisk.combinedRisk >= 30 ? '#f59e0b' : '#10b981';
                  return `<span>Combined Risk <strong style="color:${rc}">${fullRisk.combinedRisk}/100</strong></span>`;
                } catch(_) { return ''; }
              })()}
            </div>
          </div>
        </div>

        <!-- Diagnosis summary — dynamic -->
        <div class="card">
          <h4 class="text-sm font-semibold text-white mb-2 flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-brand-400 flex-shrink-0"></span>
            Exact Complaint / Diagnosis
            <span class="badge-minimal ml-auto">AI Module</span>
          </h4>
          <p class="text-sm text-yellow-200 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 leading-relaxed">
            ${scan.diagnosis || (
              findings.length
                ? findings.map(f => f.name).join(', ') + ' detected. Consult a dentist for professional evaluation.'
                : 'No significant oral conditions detected. Continue regular oral hygiene routine.'
            )}
          </p>
        </div>

        <!-- Detailed findings — DYNAMIC from scan -->
        <div class="card">
          <h4 class="text-sm font-semibold text-white mb-3">
            Detailed Findings
            <span class="text-gray-500 font-normal ml-1">(${findings.length})</span>
          </h4>
          ${findings.length === 0 ? `
            <div class="text-center py-6">
              <div class="text-3xl mb-2">✅</div>
              <p class="text-green-400 font-semibold">All Clear</p>
              <p class="text-gray-500 text-xs mt-1">No significant conditions detected</p>
            </div>
          ` : `
            <div class="space-y-3">
              ${findings.map(f => `
                <div class="p-3 rounded-xl bg-gray-900 border border-gray-800 hover:border-gray-700 transition-colors">
                  <div class="flex items-start justify-between gap-2 mb-2">
                    <span class="font-semibold text-sm text-white">${f.name}</span>
                    <span class="${_sevBadge(f.severity)} flex-shrink-0">${f.severity}</span>
                  </div>
                  <div class="flex flex-wrap gap-3 text-xs text-gray-500 mb-2">
                    <span>Region: <span class="text-gray-300">${f.region}</span></span>
                    <span>Confidence: <span class="text-gray-300">${f.confidence}%</span></span>
                  </div>
                  <div class="sensor-bar mb-2">
                    <div class="sensor-fill" style="width:${f.confidence}%;background:#28a8ff"></div>
                  </div>
                  <p class="text-xs text-gray-400 leading-relaxed">${f.description}</p>
                </div>`).join('')}
            </div>
          `}
        </div>

        <!-- Recommendations — dynamic -->
        <div class="card">
          <h4 class="text-sm font-semibold text-white mb-3">Treatment Recommendations</h4>
          <div class="space-y-2">
            ${recs.map((r, i) => {
              const icons  = ['🦷','💊','🪥','💧','🥗','📅','🧴','💉'];
              const pris   = ['High','Medium','High','Medium','Lifestyle','Monitoring','Recommended','Treatment'];
              const priClr = ['bg-red-500/20 text-red-300','bg-yellow-500/20 text-yellow-300','bg-red-500/20 text-red-300',
                              'bg-yellow-500/20 text-yellow-300','bg-green-500/20 text-green-300','bg-blue-500/20 text-blue-300',
                              'bg-purple-500/20 text-purple-300','bg-orange-500/20 text-orange-300'];
              const text = typeof r === 'string' ? r : (r.text || r);
              return `
              <div class="flex items-center gap-3 p-2.5 rounded-lg bg-gray-900 border border-gray-800">
                <span class="text-base flex-shrink-0">${icons[i % icons.length]}</span>
                <span class="text-sm text-gray-200 flex-1">${text}</span>
                <span class="text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${priClr[i % priClr.length]}">${pris[i % pris.length]}</span>
              </div>`;
            }).join('')}
          </div>
        </div>

        <!-- AI Disclaimer — always visible, clearly separated from clinical decisions -->
        <div class="card border-yellow-500/25" style="background:linear-gradient(135deg,#1a1200,#110e00)">
          <div class="flex items-start gap-3">
            <span class="text-2xl flex-shrink-0">⚕️</span>
            <div>
              <div class="text-sm font-bold text-yellow-300 mb-1">AI Screening Finding — Not a Clinical Diagnosis</div>
              <div class="text-xs text-yellow-200/70 leading-relaxed">
                This report is generated by an AI model trained on dental images. It is intended as a
                <strong>screening aid only</strong> and must not be used as a substitute for professional
                dental examination. Results depend on image quality and may not detect all conditions.
                <strong>Always consult a qualified dentist</strong> for diagnosis and treatment decisions.
              </div>
              <div class="flex flex-wrap gap-2 mt-2 text-xs text-yellow-400/60">
                <span>Model: ${model}</span>
                <span>·</span>
                <span>Confidence: ${scan.confidence || '—'}%${isLowConf ? ' ⚠ LOW' : ''}</span>
                <span>·</span>
                <span>Image quality: ${scan.imageQuality || 'Not assessed'}</span>
                ${isDemoMode ? '<span>· <strong class="text-orange-400">DEMO DATA</strong></span>' : ''}
              </div>
            </div>
          </div>
        </div>

        <!-- Doctor review status -->
        ${(() => {
          const reviews = Store.loadDoctorReviews().filter(r => r.scanId === scan.id);
          if (reviews.length === 0) return '';
          return reviews.map(r => `
          <div class="card border-green-500/25" style="background:linear-gradient(135deg,#001a0a,#000f06)">
            <div class="flex items-start gap-3">
              <span class="text-2xl flex-shrink-0">🩺</span>
              <div class="flex-1">
                <div class="text-sm font-bold text-green-300 mb-1">Clinical Review by ${r.doctorName}</div>
                <div class="text-xs text-gray-400">${r.doctorSpeciality || 'Dentist'} · Reviewed ${new Date(r.reviewed_at).toLocaleString()}</div>
                <div class="mt-2 grid grid-cols-2 gap-2 text-xs">
                  <div><span class="text-gray-500">AI Assessment: </span><span class="${r.ai_correct === true ? 'text-green-400' : r.ai_correct === false ? 'text-red-400' : 'text-yellow-400'}">${r.ai_correct === true ? '✅ Confirmed' : r.ai_correct === false ? '✏️ Corrected' : '⚠️ Partially Correct'}</span></div>
                  ${r.corrected_severity ? `<div><span class="text-gray-500">Severity: </span><span class="text-white">${r.corrected_severity}</span></div>` : ''}
                  ${r.corrected_labels ? `<div class="col-span-2"><span class="text-gray-500">Clinical Labels: </span><span class="text-white">${r.corrected_labels}</span></div>` : ''}
                  ${r.follow_up ? `<div class="col-span-2"><span class="text-gray-500">Follow-up: </span><span class="text-white">${r.follow_up}</span></div>` : ''}
                </div>
                ${r.review_notes ? `<div class="mt-2 p-2 rounded-lg bg-green-500/8 border border-green-500/20 text-sm text-gray-200">"${r.review_notes}"</div>` : ''}
                ${r.urgent_referral ? `<div class="mt-2 text-xs text-red-300 font-semibold">🚨 Urgent referral flagged by doctor</div>` : ''}
              </div>
            </div>
          </div>`).join('');
        })()}

        <!-- Share with Doctor panel (patient only) -->
        ${(AppState.user?.role !== 'doctor') ? `
        <div class="card">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h4 class="text-sm font-semibold text-white">Share with Doctor</h4>
              <p class="text-xs text-gray-500 mt-0.5">Let a doctor review this AI report clinically.</p>
            </div>
          </div>
          <form id="share-doctor-form" onsubmit="shareReportWithDoctor(event,'${scan.id}')" class="space-y-3">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="form-label text-xs">Doctor's Email <span class="text-red-400">*</span></label>
                <input type="email" id="share-doctor-email" class="form-input text-sm"
                  placeholder="doctor@clinic.com" required/>
              </div>
              <div>
                <label class="form-label text-xs">Doctor's Name</label>
                <input type="text" id="share-doctor-name" class="form-input text-sm"
                  placeholder="Dr. Smith"/>
              </div>
            </div>
            <div>
              <label class="form-label text-xs">Access Expires</label>
              <input type="date" id="share-expires" class="form-input text-sm"
                min="${new Date().toISOString().slice(0,10)}"/>
              <p class="text-xs text-gray-600 mt-1">Leave blank for no expiry. You can revoke access any time.</p>
            </div>
            <div class="flex items-center gap-2">
              <input type="checkbox" id="share-consent" class="rounded accent-brand-500 w-4 h-4" required/>
              <label for="share-consent" class="text-xs text-gray-400">
                I consent to this doctor viewing my AI scan report and sensor data for clinical review purposes.
              </label>
            </div>
            <button type="submit" class="btn-primary text-sm px-4 py-2.5 flex items-center gap-2">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/></svg>
              Share with Doctor
            </button>
          </form>
        </div>` : ''}

        <!-- Notes from patient (if stored) -->
        ${scan.notes ? `
          <div class="card">
            <h4 class="text-sm font-semibold text-white mb-2">Patient Notes</h4>
            <p class="text-sm text-gray-300 leading-relaxed bg-gray-900 rounded-lg p-3 border border-gray-800">
              ${scan.notes}
            </p>
          </div>` : ''}

        <!-- Before vs After comparison -->
        ${typeof renderBeforeAfter === 'function' ? renderBeforeAfter(scan) : ''}

        <!-- Model Transparency -->
        ${typeof renderTransparencyCard === 'function' ? renderTransparencyCard(scan) : ''}

        <!-- Symptom checker link -->
        <div class="card flex flex-col sm:flex-row sm:items-center gap-4 py-4">
          <div class="flex-1">
            <div class="font-semibold text-white text-sm">🩺 Run Symptom Checker</div>
            <div class="text-xs text-gray-500 mt-0.5">Combine your scan with reported symptoms for a fuller risk assessment</div>
          </div>
          <div class="flex gap-2 flex-shrink-0 flex-wrap">
            <button onclick="navigate('symptom')" class="btn-primary text-xs px-4 py-2">Check Symptoms →</button>
            <button onclick="navigate('dentist')" class="btn-secondary text-xs px-4 py-2">👨‍⚕️ Dentist Review</button>
          </div>
        </div>

      </div>
    </div>
  </div>
  `;
}

function copyReportId(id) {
  navigator.clipboard?.writeText(id)
    .then(()  => showToast('Report ID copied!', 'success'))
    .catch(()  => showToast('ID: ' + id, 'info'));
}

function shareDentist(id) {
  if (typeof openShareModal === 'function') {
    openShareModal(id);
  } else {
    const url = `${location.origin}${location.pathname}#report/${id}`;
    navigator.clipboard?.writeText(url)
      .then(()  => showToast('Share link copied!', 'success'))
      .catch(()  => showToast('Share link: ' + url, 'info'));
  }
}

// ── Share report with doctor ───────────────────────────────────────────────
function shareReportWithDoctor(e, scanId) {
  e.preventDefault();
  const u           = AppState.user;
  if (!u) { showToast('Not logged in','error'); return; }

  const doctorEmail = document.getElementById('share-doctor-email')?.value.trim();
  const doctorName  = document.getElementById('share-doctor-name')?.value.trim() || doctorEmail;
  const expiresRaw  = document.getElementById('share-expires')?.value;
  const expiresAt   = expiresRaw ? new Date(expiresRaw + 'T23:59:59').toISOString() : null;

  if (!doctorEmail) { showToast('Enter the doctor\'s email','error'); return; }

  const share = {
    id:          'SHR-' + Date.now().toString().slice(-8) + '-' + Math.random().toString(36).slice(2,5).toUpperCase(),
    reportId:    scanId,
    scanId:      scanId,
    patientId:   u.email,
    patientName: u.name,
    doctorId:    doctorEmail,
    doctorEmail,
    doctorName,
    sharedAt:    new Date().toISOString(),
    expiresAt,
    revoked:     false,
    revokedAt:   null,
    lastAccessedAt: null,
    accessCount: 0,
  };

  // Grant consent record
  Store.grantConsent({
    id:         'CON-' + Date.now().toString().slice(-8),
    patientId:  u.email,
    doctorId:   doctorEmail,
    doctorEmail,
    granted:    true,
    grantedAt:  new Date().toISOString(),
    revokedAt:  null,
    scope:      'single_report',
  });

  Store.shareReport(share);
  showToast(`Report shared with ${doctorName}. They can now review it in their dashboard.`, 'success');

  // Reset form
  e.target.reset();
  // Re-render to show the new share
  navigate('report', { id: scanId });
}

// ── Printable / Downloadable Report (Figure 4) ──
function pagePrintReport(params) {
  const scan = AppState.scans.find(s => s.id === params.id) || AppState.scans[0];
  if (!scan) return _page404();

  const sc     = scan.score >= 80 ? '#10b981' : scan.score >= 60 ? '#f59e0b' : '#ef4444';
  const scLbl  = scan.score >= 80 ? 'Good'    : scan.score >= 60 ? 'Fair'    : 'Needs Attention';
  const model  = scan.model || AppState.settings._backendModelId || (scan.demoMode ? 'oralai-demo-mode' : 'oralai-efficientnet-b0-v1');
  const isLowConfPrint = scan.low_confidence === true || (scan.confidence || 0) < 60;
  const findings = (scan.findings || []).map(_normFinding);
  const recs     = scan.recommendations || [
    'Professional cleaning within 3 months',
    'Use fluoride toothpaste daily',
    'Increase flossing to twice daily',
    'Avoid acidic foods and drinks',
    'Schedule follow-up scan in 30 days',
  ];

  return `
  <div class="max-w-2xl mx-auto">

    <!-- Toolbar (hidden in print) -->
    <div class="flex items-center justify-between mb-4 no-print gap-3 flex-wrap">
      <button onclick="navigate('report',{id:'${scan.id}'})" class="btn-secondary text-sm flex items-center gap-2">
        ← Back to Report
      </button>
      <button onclick="window.print()" class="btn-primary text-sm flex items-center gap-2">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/>
        </svg>
        Print / Save PDF
      </button>
    </div>

    <!-- Printable report card -->
    <div class="card space-y-5" id="printable-report">

      <!-- Report header -->
      <div class="text-center pb-4 border-b border-gray-800">
        <div class="flex items-center justify-center gap-2 mb-2">
          <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
            <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
            </svg>
          </div>
          <span class="font-bold text-lg text-white">🦷 Dental AI Screening Report</span>
        </div>
        <div class="font-mono text-brand-400 font-bold">${scan.id}</div>
        <div class="text-xs text-gray-500 mt-1">Generated ${scan.date} · Share this ID with your dentist</div>
      </div>

      <!-- Meta grid -->
      <div class="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
        ${[
          ['Report ID',    scan.id,       true ],
          ['Scan Date',    scan.date,     false],
          ['Scan Type',    scan.type,     false],
          ['Model Version',model,         false],
          ['Device',       scan.device,   false],
          ['Analysis ID',  'analysis-'+scan.id.slice(-8), true],
        ].map(([k,v,mono]) => `
          <div>
            <div class="text-xs text-gray-500 uppercase tracking-wide mb-0.5">${k}</div>
            <div class="${mono?'font-mono text-brand-400 text-xs':'text-gray-200 font-semibold'} truncate">${v}</div>
          </div>`).join('')}
      </div>

      <!-- Image + Score row -->
      <div class="flex gap-4 p-4 rounded-xl bg-gray-900 border border-gray-800 items-center">
        ${scan.imageDataUrl ? `
          <img src="${scan.imageDataUrl}" alt="Dental scan"
            class="w-28 h-24 object-cover rounded-xl border border-gray-700 flex-shrink-0"/>
        ` : `
          <div class="w-28 h-24 rounded-xl border border-gray-800 bg-gray-950 flex items-center justify-center flex-shrink-0">
            <span class="text-gray-700 text-xs text-center leading-tight px-2">Image not available</span>
          </div>
        `}
        <div class="flex-1"></div>
        <div class="text-center flex-shrink-0">
          <div class="text-xs text-gray-500 mb-1">Health Score</div>
          <div class="text-5xl font-black tabular-nums" style="color:${sc}">${scan.score}</div>
          <div class="text-xs font-semibold mt-1" style="color:${sc}">${scLbl}</div>
          <div class="text-xs text-gray-500 mt-1">Confidence: ${scan.confidence}%</div>
        </div>
      </div>

      <!-- Diagnosis -->
      <div>
        <div class="text-xs text-gray-500 uppercase tracking-wide mb-2">AI Diagnosis Summary</div>
        <div class="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-sm text-yellow-200 leading-relaxed">
          ${scan.diagnosis || (findings.length
            ? findings.map(f=>f.name).join(', ') + ' detected. Professional dental evaluation recommended.'
            : 'No significant oral conditions detected. Continue regular oral hygiene.')}
        </div>
      </div>

      <!-- Metrics -->
      <div>
        <div class="text-xs text-gray-500 uppercase tracking-wide mb-2">Detection Metrics</div>
        <div class="grid grid-cols-3 gap-3">
          ${[
            ['Confidence',      scan.confidence+'%',   '#28a8ff'],
            ['Findings',        findings.length,        '#10b981'],
            ['Processing Time', scan.processingTime||'—','#f59e0b'],
          ].map(([k,v,c]) => `
            <div class="text-center p-3 rounded-xl bg-gray-900 border border-gray-800">
              <div class="text-xl font-black tabular-nums" style="color:${c}">${v}</div>
              <div class="text-xs text-gray-500 mt-1">${k}</div>
            </div>`).join('')}
        </div>
      </div>

      <!-- Findings list (compact) -->
      ${findings.length > 0 ? `
      <div>
        <div class="text-xs text-gray-500 uppercase tracking-wide mb-2">Detected Conditions</div>
        <div class="space-y-1.5">
          ${findings.map(f => `
            <div class="flex items-center justify-between p-2.5 rounded-lg bg-gray-900 border border-gray-800 text-sm">
              <span class="text-gray-200">${f.name}</span>
              <div class="flex items-center gap-2">
                <span class="text-xs text-gray-500">${f.region}</span>
                <span class="${_sevBadge(f.severity)}">${f.severity}</span>
              </div>
            </div>`).join('')}
        </div>
      </div>` : ''}

      <!-- Recommendations -->
      <div>
        <div class="text-xs text-gray-500 uppercase tracking-wide mb-2">Recommendations</div>
        <div class="space-y-1.5 text-sm">
          ${recs.map((r,i) => `
            <div class="flex items-start gap-2 text-gray-300">
              <span class="w-5 h-5 rounded-full bg-brand-500/20 text-brand-400 text-xs
                           flex items-center justify-center flex-shrink-0 mt-0.5">${i+1}</span>
              ${typeof r === 'string' ? r : (r.text || r)}
            </div>`).join('')}
        </div>
      </div>

      <!-- Footer -->
      <div class="pt-4 border-t border-gray-800 text-center text-xs text-gray-600 space-y-0.5">
        <p>Generated by <strong class="text-gray-500">OralAI</strong> — Real-Time Oral Disease Detection System</p>
        <p>Bearys Institute of Technology · AI &amp; Data Science · Karnataka, India</p>
        <p class="text-gray-700 mt-1">⚠️ For informational purposes only. Does not replace professional dental advice.</p>
      </div>
    </div>
  </div>
  `;
}
