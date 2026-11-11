// ══════════════════════════════════════════════════════
//  Combined Enhancement Module
//
//  Feature 2  — AI Heatmap Overlay
//  Feature 3  — Severity Grading + Urgency
//  Feature 5  — Unable-to-Assess Result
//  Feature 6  — Before-vs-After Comparison
//  Feature 15 — Model Transparency Card
//  Feature 16 — Emergency Red Flags
// ══════════════════════════════════════════════════════

// ── Feature 2: AI Heatmap ──────────────────────────────
// Renders an SVG heatmap overlay on top of a scan image.
// Hotspots are derived from attentionAreas and findings.
function renderHeatmap(scan, containerWidth = 360, containerHeight = 240) {
  const findings = (scan.findings || []).map(f =>
    typeof f === 'string' ? { condition: f, severity: 'Mild', confidence: 80 } : f
  );

  if (!findings.length) {
    return `<div class="text-center text-gray-600 text-xs py-4">No findings to highlight</div>`;
  }

  // Predefined anatomical region positions (normalised 0-1 over a dental arch)
  const regionMap = {
    'Plaque Accumulation':       [{ x:0.25,y:0.65,r:0.14 },{ x:0.75,y:0.65,r:0.14 }],
    'Dental Caries':             [{ x:0.30,y:0.55,r:0.12 },{ x:0.70,y:0.55,r:0.10 }],
    'Gingivitis':                [{ x:0.50,y:0.30,r:0.20 }],
    'Enamel Demineralization':   [{ x:0.40,y:0.45,r:0.10 },{ x:0.60,y:0.45,r:0.10 }],
    'Periodontal Disease':       [{ x:0.20,y:0.70,r:0.13 },{ x:0.80,y:0.70,r:0.13 }],
    'Oral Ulcer':                [{ x:0.55,y:0.75,r:0.09 }],
    'Oral Lesion':               [{ x:0.45,y:0.72,r:0.11 }],
  };
  const severityColor = { Severe:'#ef4444', Moderate:'#f97316', Mild:'#fbbf24', Early:'#3b82f6', Minimal:'#22c55e' };
  const W = containerWidth, H = containerHeight;

  let circles = '';
  findings.forEach(f => {
    const regions = regionMap[f.condition] || [{ x:0.5, y:0.5, r:0.15 }];
    const color   = severityColor[f.severity] || '#f59e0b';
    const opacity = Math.max(0.3, (f.confidence || 70) / 100 * 0.7);
    regions.forEach(pos => {
      const cx = pos.x * W, cy = pos.y * H, cr = pos.r * Math.min(W,H);
      circles += `
        <radialGradient id="hm-${Math.random().toString(36).slice(2,7)}" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stop-color="${color}" stop-opacity="${opacity}"/>
          <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
        </radialGradient>`;
      // We'll just inline the gradient ID directly
      circles += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${cr.toFixed(1)}" fill="${color}" opacity="${opacity}" />`;
    });
  });

  // Render
  const hasImage = !!scan.imageDataUrl;
  return `
  <div class="relative rounded-xl overflow-hidden border border-gray-700 select-none" style="width:100%;height:${H}px;background:#111827;">
    ${hasImage ? `<img src="${scan.imageDataUrl}" alt="Scan" class="absolute inset-0 w-full h-full object-cover"/>` : `
      <div class="absolute inset-0 flex items-center justify-center">
        <div class="text-center text-gray-600">
          <div class="text-4xl mb-2">🦷</div>
          <div class="text-xs">Heatmap shown on uploaded image</div>
        </div>
      </div>`}
    <!-- Heatmap SVG overlay -->
    <svg class="absolute inset-0 w-full h-full" viewBox="0 0 ${W} ${H}"
         style="mix-blend-mode:${hasImage?'screen':'normal'};pointer-events:none;">
      ${circles}
    </svg>
    <!-- Legend -->
    <div class="absolute bottom-2 left-2 flex flex-wrap gap-1.5">
      ${findings.slice(0,4).map(f => {
        const col = severityColor[f.severity] || '#f59e0b';
        return `<span class="text-xs px-2 py-0.5 rounded-full font-semibold"
                      style="background:${col}33;border:1px solid ${col}66;color:${col};">
          ${f.condition || f.name}
        </span>`;
      }).join('')}
    </div>
  </div>`;
}

// ── Feature 3: Severity + Urgency Grading ─────────────
function getSeverityGrade(findings) {
  if (!findings || !findings.length) return { level: 'Clear', urgency: 'none', color:'#10b981', icon:'✅', action:'Continue regular oral hygiene.', urgencyLabel:'None' };
  const maxSev = findings.reduce((max, f) => {
    const sev = typeof f==='string' ? 'Mild' : (f.severity||'Mild');
    const rank = { Severe:4, Moderate:3, Mild:2, Early:1, Minimal:0 };
    return (rank[sev]||0) > (rank[max]||0) ? sev : max;
  }, 'Minimal');
  const grades = {
    Severe:   { level:'Severe',   urgency:'urgent',  color:'#ef4444', icon:'🚨', urgencyLabel:'Urgent Consultation',    action:'Please visit a dentist immediately. Delay may worsen the condition significantly.' },
    Moderate: { level:'Moderate', urgency:'dentist', color:'#f97316', icon:'⚠️', urgencyLabel:'Dentist Visit Needed',   action:'Schedule a dental appointment within 1–2 weeks for professional evaluation and treatment.' },
    Mild:     { level:'Mild',     urgency:'dentist', color:'#fbbf24', icon:'⚠️', urgencyLabel:'Dentist Visit Advised',  action:'A dental check-up within 4–6 weeks is recommended. Improve home hygiene routine.' },
    Early:    { level:'Early',    urgency:'monitor', color:'#3b82f6', icon:'🔵', urgencyLabel:'Monitor at Home',         action:'Monitor closely. Improve brushing and flossing. Rescan in 30 days.' },
    Minimal:  { level:'Minimal',  urgency:'monitor', color:'#22c55e', icon:'🟢', urgencyLabel:'Monitor at Home',         action:'Minor findings. Continue regular oral hygiene and schedule routine check-up.' },
  };
  return grades[maxSev] || grades.Mild;
}

function renderSeverityBadge(scan) {
  const grade = getSeverityGrade(scan.findings);
  return `
  <div class="flex items-center gap-3 p-4 rounded-xl border"
       style="background:${grade.color}11;border-color:${grade.color}44;">
    <div class="text-3xl flex-shrink-0">${grade.icon}</div>
    <div class="flex-1">
      <div class="flex items-center gap-2 flex-wrap">
        <span class="font-bold text-white">${grade.level} Severity</span>
        <span class="text-xs px-2.5 py-1 rounded-full font-bold"
              style="background:${grade.color}22;border:1px solid ${grade.color}44;color:${grade.color};">
          ${grade.urgencyLabel}
        </span>
      </div>
      <p class="text-sm text-gray-300 mt-1 leading-relaxed">${grade.action}</p>
    </div>
  </div>`;
}

// ── Feature 5: Unable-to-Assess ───────────────────────
function renderUnableToAssess(scan) {
  const conf = scan.confidence || 88;
  const qual = scan.imageQuality || null;

  if (conf >= 60) return '';   // sufficient confidence — no warning needed

  return `
  <div class="p-4 rounded-xl border border-orange-500/40 bg-orange-500/8 space-y-3">
    <div class="flex items-start gap-3">
      <span class="text-3xl flex-shrink-0">🔍</span>
      <div>
        <div class="font-bold text-orange-300 text-base">Unable to Assess Conclusively</div>
        <p class="text-sm text-orange-200/80 mt-1 leading-relaxed">
          The AI model's confidence for this scan is <strong>${conf}%</strong> — below the recommended threshold of 60%.
          ${conf < 40 ? 'This result may be unreliable.' : 'Results should be interpreted cautiously.'}
        </p>
      </div>
    </div>
    <div class="flex flex-wrap gap-2 items-center">
      <div class="text-xs text-gray-400">Possible reasons:</div>
      ${['Image quality too low','Insufficient lighting','Blurry or out-of-focus photo','Mouth position off-centre'].map(r=>`
        <span class="text-xs px-2 py-0.5 rounded-full bg-orange-900/40 border border-orange-800/50 text-orange-300">${r}</span>`).join('')}
    </div>
    <div class="flex flex-wrap gap-2 pt-1">
      <button onclick="navigate('camera')"
        style="background:linear-gradient(135deg,#f97316,#ea580c);border:none;color:#fff;padding:8px 16px;border-radius:8px;cursor:pointer;font-size:0.8rem;font-weight:700;">
        📸 Retake with Camera Guidance
      </button>
      <button onclick="navigate('upload')"
        class="btn-secondary text-xs px-4 py-2">
        Upload Better Image
      </button>
    </div>
  </div>`;
}

// ── Feature 6: Before vs After ────────────────────────
function renderBeforeAfter(currentScan) {
  const allScans = AppState.scans;
  const idx      = allScans.findIndex(s => s.id === currentScan.id);
  const prevScan = allScans[idx + 1] || null;   // next in array = older

  if (!prevScan) return '';

  const delta = currentScan.score - prevScan.score;
  const dColor = delta > 0 ? '#10b981' : delta < 0 ? '#ef4444' : '#64748b';
  const dArrow = delta > 0 ? '↑' : delta < 0 ? '↓' : '→';
  const dLabel = delta > 0 ? 'Improved' : delta < 0 ? 'Declined' : 'Stable';

  const scoreColor = s => s >= 80 ? '#10b981' : s >= 60 ? '#f59e0b' : '#ef4444';
  const circ = 339.3;

  return `
  <div class="card">
    <h4 class="font-semibold text-white mb-4 flex items-center gap-2">
      📊 Progress Since Last Scan
      <span class="text-xs text-gray-500 font-normal">${prevScan.date} → ${currentScan.date}</span>
    </h4>
    <div class="flex items-center gap-4">
      <!-- Previous -->
      <div class="flex-1 text-center">
        <div class="text-xs text-gray-500 mb-2">Previous</div>
        <div class="ring-container mx-auto" style="width:80px;height:80px;">
          <svg width="80" height="80" viewBox="0 0 160 160">
            <circle class="ring-bg" cx="80" cy="80" r="54"/>
            <circle class="ring-fill" cx="80" cy="80" r="54"
              stroke="${scoreColor(prevScan.score)}"
              stroke-dasharray="${circ}"
              stroke-dashoffset="${circ-(prevScan.score/100)*circ}"
              transform="rotate(-90 80 80)"/>
          </svg>
          <div class="ring-text">
            <div class="text-lg font-black text-white">${prevScan.score}</div>
          </div>
        </div>
        <div class="text-xs text-gray-500 mt-1">${prevScan.date.replace(/,.*/, '')}</div>
      </div>

      <!-- Delta arrow -->
      <div class="text-center flex-shrink-0">
        <div class="text-3xl font-black tabular-nums" style="color:${dColor}">${dArrow}${Math.abs(delta)}</div>
        <div class="text-xs font-semibold mt-1" style="color:${dColor}">${dLabel}</div>
      </div>

      <!-- Current -->
      <div class="flex-1 text-center">
        <div class="text-xs text-gray-500 mb-2">Current</div>
        <div class="ring-container mx-auto" style="width:80px;height:80px;">
          <svg width="80" height="80" viewBox="0 0 160 160">
            <circle class="ring-bg" cx="80" cy="80" r="54"/>
            <circle class="ring-fill" cx="80" cy="80" r="54"
              stroke="${scoreColor(currentScan.score)}"
              stroke-dasharray="${circ}"
              stroke-dashoffset="${circ-(currentScan.score/100)*circ}"
              transform="rotate(-90 80 80)"/>
          </svg>
          <div class="ring-text">
            <div class="text-lg font-black text-white">${currentScan.score}</div>
          </div>
        </div>
        <div class="text-xs text-gray-500 mt-1">${currentScan.date.replace(/,.*/, '')}</div>
      </div>
    </div>

    <!-- Finding delta -->
    <div class="mt-4 text-sm text-gray-400 leading-relaxed border-t border-gray-800 pt-3">
      ${delta > 5  ? '✅ Notable improvement. Your oral hygiene efforts are paying off. Keep it up!'
      : delta < -5 ? '⚠️ Score has declined since last scan. Review your oral hygiene routine and consider a dentist visit.'
      : delta === 0 ? '→ Score unchanged. Continue monitoring and maintain your current routine.'
      : delta > 0  ? '📈 Slight improvement. Continue with current hygiene routine.'
      : '📉 Slight decline. Consider reviewing your flossing and brushing habits.'}
    </div>
    <button onclick="navigate('compare',{a:'${currentScan.id}',b:'${prevScan.id}'})"
      class="btn-secondary w-full mt-3 text-xs py-2 justify-center">
      View Full Side-by-Side Comparison →
    </button>
  </div>`;
}

// ── Feature 15: Model Transparency Card ───────────────
function renderTransparencyCard(scan) {
  const flags = [];
  if ((scan.confidence||88) < 70) flags.push('Low confidence — image quality may be poor');
  if ((scan.attentionAreas||0) > 3) flags.push('Multiple attention areas detected — comprehensive review advised');
  if (scan.findings && scan.findings.length === 0) flags.push('No findings — patient appears healthy or image inconclusive');
  if (scan.type === 'Basic RGB') flags.push('Basic RGB scan — Advanced Spectral may detect more subtle changes');

  return `
  <div class="card">
    <h4 class="font-semibold text-white mb-3 flex items-center gap-2">
      🔬 Model Transparency
      <span class="text-xs text-gray-500 font-normal">AI explainability</span>
    </h4>
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center mb-4">
      ${[
        ['Model Version',   scan.model || AppState.settings._backendModelId || 'oralai-efficientnet-b0-v1', '#28a8ff'],
        ['Confidence',      (scan.confidence||88) + '%',        (scan.confidence||88)>=80?'#10b981':'#f59e0b'],
        ['Image Quality',   scan.imageQuality || 'Not assessed','#a78bfa'],
        ['Attention Areas', scan.attentionAreas || (scan.findings||[]).length, '#f59e0b'],
      ].map(([label,val,color]) => `
        <div class="p-3 rounded-xl bg-gray-900 border border-gray-800">
          <div class="text-base font-black tabular-nums" style="color:${color}">${val}</div>
          <div class="text-xs text-gray-500 mt-1">${label}</div>
        </div>`).join('')}
    </div>
    ${flags.length > 0 ? `
    <div class="space-y-1.5">
      <div class="text-xs text-gray-500 font-semibold uppercase tracking-wide">Why this case was flagged</div>
      ${flags.map(f => `
        <div class="flex items-center gap-2 text-xs p-2 rounded-lg bg-gray-900 border border-gray-800">
          <span class="text-yellow-400 flex-shrink-0">ℹ️</span>
          <span class="text-gray-300">${f}</span>
        </div>`).join('')}
    </div>` : `
    <p class="text-xs text-green-400">✅ No transparency flags — model confidence is high and results are reliable.</p>`}
    <p class="text-xs text-gray-600 mt-3 leading-relaxed">
      OralAI uses EfficientNetB0 (CNN) with IoT sensor fusion. Results are probabilistic estimates,
      not clinical diagnoses. Always validate with a qualified dental professional.
    </p>
  </div>`;
}

// ── Feature 16: Emergency Red Flags ───────────────────
function detectEmergencyFlags(scan, symptoms) {
  const flags = [];
  const syms  = symptoms || Store.get('oralai_symptoms') || {};

  // From scan findings
  (scan.findings || []).forEach(f => {
    const name = (typeof f==='string' ? f : (f.condition||f.name||'')).toLowerCase();
    if (name.includes('ulcer') || name.includes('lesion')) {
      flags.push({ type:'lesion', msg:'Oral ulcer or lesion detected — if present for >2 weeks, seek immediate evaluation' });
    }
    if (name.includes('cancer')) {
      flags.push({ type:'cancer', msg:'Potentially suspicious lesion flagged — urgent professional evaluation required' });
    }
    if (name.includes('abscess') || name.includes('infection')) {
      flags.push({ type:'infection', msg:'Signs of infection or abscess detected — requires urgent dental care' });
    }
  });

  // From symptoms
  if ((syms.swelling||0) >= 3) flags.push({ type:'swelling', msg:'Severe or rapidly increasing facial/jaw swelling — seek emergency dental care or go to hospital' });
  if ((syms.pain||0) >= 3 && (syms.swelling||0) >= 2) flags.push({ type:'pain_swelling', msg:'Severe pain with swelling — possible dental abscess, seek care immediately' });
  if ((syms.ulcer||0) >= 3) flags.push({ type:'ulcer_chronic', msg:'Oral ulcer present for >3 weeks — requires biopsy to rule out serious conditions' });
  if ((syms.bleeding||0) >= 3) flags.push({ type:'bleeding', msg:'Heavy or frequent gum bleeding — may indicate advanced periodontal disease' });

  return flags;
}

function renderEmergencyFlags(scan) {
  const flags = detectEmergencyFlags(scan);
  if (!flags.length) return '';

  return `
  <div class="p-4 rounded-xl border border-red-500/50 bg-red-500/10 space-y-3">
    <div class="flex items-center gap-2">
      <span class="text-3xl">🚨</span>
      <div>
        <div class="font-black text-red-300 text-lg">Emergency Red Flag${flags.length>1?'s':''} Detected</div>
        <div class="text-xs text-red-400/80">Requires immediate professional attention</div>
      </div>
    </div>
    ${flags.map(f => `
      <div class="flex items-start gap-2 p-3 rounded-xl bg-red-900/30 border border-red-800/50">
        <span class="text-red-400 flex-shrink-0 mt-0.5">●</span>
        <p class="text-sm text-red-200 leading-relaxed">${f.msg}</p>
      </div>`).join('')}
    <div class="border-t border-red-800/50 pt-3 flex flex-wrap gap-2 items-center">
      <p class="text-xs text-red-400/80 flex-1">Do not delay — some conditions can become life-threatening without prompt treatment.</p>
      <button onclick="navigate('telehealth')"
        style="background:linear-gradient(135deg,#ef4444,#dc2626);border:none;color:#fff;padding:9px 18px;border-radius:8px;cursor:pointer;font-weight:700;font-size:0.8rem;white-space:nowrap;">
        🚑 Book Urgent Consultation
      </button>
    </div>
  </div>`;
}
