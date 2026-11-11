// ══════════════════════════════════════════════════════════════════
//  OralAI — Global Modal System
//  Usage: Modal.open({ title, subtitle, body, footer, size, icon })
//         Modal.close()
// ══════════════════════════════════════════════════════════════════

const Modal = {
  _el:   null,   // backdrop
  _box:  null,   // inner box
  _open: false,

  // ── Inject modal DOM once ────────────────────────────────────────
  init() {
    if (document.getElementById('modal-backdrop')) return;
    const backdrop = document.createElement('div');
    backdrop.id = 'modal-backdrop';
    backdrop.setAttribute('role', 'dialog');
    backdrop.setAttribute('aria-modal', 'true');
    backdrop.innerHTML = `<div id="modal-box" class="modal-box"></div>`;
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) Modal.close();
    });
    document.body.appendChild(backdrop);
    this._el  = backdrop;
    this._box = document.getElementById('modal-box');

    // Close on Escape (captured from keyboard shortcut handler too)
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && Modal._open) Modal.close();
    });
  },

  // ── Open with config object ──────────────────────────────────────
  open({ title = '', subtitle = '', icon = '', body = '', footer = '', size = 'md', accent = '' } = {}) {
    this.init();
    const maxW = { sm:'420px', md:'620px', lg:'780px', xl:'920px' }[size] || '620px';
    this._box.style.maxWidth = maxW;

    const accentBar = accent
      ? `style="background:${accent}"` : '';

    this._box.innerHTML = `
      <div class="modal-box" style="position:relative">
        <!-- Gradient top bar -->
        <div style="height:3px;background:var(--gradient);border-radius:28px 28px 0 0 ${accentBar ? ';background:'+accent : ''}"></div>

        <!-- Header -->
        <div class="modal-header">
          <div>
            ${icon ? `<div style="font-size:2rem;margin-bottom:8px">${icon}</div>` : ''}
            <div class="modal-title">${title}</div>
            ${subtitle ? `<div class="modal-subtitle">${subtitle}</div>` : ''}
          </div>
          <button class="modal-close" onclick="Modal.close()" aria-label="Close">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
        </div>

        <!-- Body -->
        <div class="modal-body">${body}</div>

        <!-- Footer -->
        ${footer ? `<div class="modal-footer">${footer}</div>` : ''}
      </div>`;

    this._open = true;
    this._el.classList.add('open');
    // Focus trap — focus the close button
    setTimeout(() => this._box.querySelector('.modal-close')?.focus(), 50);
  },

  // ── Update body content without reopening ──────────────────────
  setBody(html) {
    const body = this._box?.querySelector('.modal-body');
    if (body) body.innerHTML = html;
  },

  // ── Close ───────────────────────────────────────────────────────
  close() {
    if (!this._el) return;
    this._el.classList.remove('open');
    this._open = false;
    setTimeout(() => { if (this._box) this._box.innerHTML = ''; }, 300);
  },

  // ══ Convenience builders ════════════════════════════════════════

  // Scan detail modal
  scan(scan) {
    if (!scan) return;
    const sc = scan.score >= 80 ? '#00d4aa' : scan.score >= 60 ? '#f59e0b' : '#ef4444';
    const scLbl = scan.score >= 80 ? 'Good' : scan.score >= 60 ? 'Fair' : 'Needs Attention';
    const findings = (scan.findings || []).map(f =>
      typeof f === 'string' ? { condition:f, severity:'Mild', confidence:85 } : f
    );
    const circ = 339.3, offset = circ - (scan.score / 100) * circ;

    const findingsHtml = findings.length ? findings.map(f => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border)">
        <div style="display:flex;align-items:center;gap:10px">
          <div style="width:9px;height:9px;border-radius:50%;background:${f.severity==='Severe'?'#f87171':f.severity==='Moderate'?'#fb923c':'#fbbf24'};flex-shrink:0"></div>
          <span style="font-size:.875rem;color:var(--text-base);font-weight:500">${f.condition || f.name}</span>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          ${f.confidence ? `<span style="font-size:.75rem;color:var(--text-muted)">${f.confidence}%</span>` : ''}
          <span class="badge-${f.severity==='Severe'?'severe':f.severity==='Moderate'?'moderate':f.severity==='Minimal'?'minimal':'mild'}">${f.severity}</span>
        </div>
      </div>`).join('') : `<p style="color:var(--text-muted);text-align:center;padding:16px 0">✅ No significant findings</p>`;

    const recsHtml = (scan.recommendations || []).slice(0,5).map((r,i) => `
      <div style="display:flex;gap:10px;padding:7px 0">
        <span style="width:20px;height:20px;border-radius:50%;background:rgba(0,212,170,.15);color:var(--accent1);font-size:.72rem;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px">${i+1}</span>
        <span style="font-size:.84rem;color:var(--text-muted)">${typeof r==='string'?r:(r.text||r)}</span>
      </div>`).join('');

    Modal.open({
      title: 'Scan Report',
      subtitle: `${scan.id} · ${scan.date}`,
      icon: '🦷',
      size: 'lg',
      body: `
        <!-- Score + meta -->
        <div style="display:flex;gap:20px;align-items:center;margin-bottom:20px;padding:16px;background:var(--surface2);border-radius:12px;border:1px solid var(--border)">
          <div style="position:relative;width:90px;height:90px;flex-shrink:0">
            <svg width="90" height="90" viewBox="0 0 160 160">
              <circle cx="80" cy="80" r="54" fill="none" stroke="var(--border)" stroke-width="12"/>
              <circle cx="80" cy="80" r="54" fill="none" stroke="${sc}"
                stroke-width="12" stroke-linecap="round"
                stroke-dasharray="${circ}" stroke-dashoffset="${offset}"
                transform="rotate(-90 80 80)"/>
            </svg>
            <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center">
              <span style="font-size:1.4rem;font-weight:900;color:var(--text-base)">${scan.score}</span>
              <span style="font-size:.65rem;font-weight:700;color:${sc}">${scLbl}</span>
            </div>
          </div>
          <div style="flex:1">
            <div style="font-size:.72rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">Scan Details</div>
            ${[
              ['Type',       scan.type],
              ['Device',     scan.device],
              ['Confidence', (scan.confidence||'—')+'%'],
              ['Model',      scan.model || AppState.settings._backendModelId || 'oralai-efficientnet-b0-v1'],
              ['Processing', scan.processingTime||'—'],
            ].map(([k,v]) => `
              <div style="display:flex;justify-content:space-between;font-size:.8rem;padding:2px 0">
                <span style="color:var(--text-dim)">${k}</span>
                <span style="color:var(--text-base);font-weight:600">${v}</span>
              </div>`).join('')}
          </div>
        </div>

        <!-- Diagnosis -->
        ${scan.diagnosis ? `
        <div style="padding:12px;background:rgba(251,191,36,.07);border:1px solid rgba(251,191,36,.2);border-radius:10px;font-size:.84rem;color:#fde68a;margin-bottom:16px">
          ${scan.diagnosis}
        </div>` : ''}

        <!-- Findings -->
        <div class="modal-section-title">Findings (${findings.length})</div>
        ${findingsHtml}

        <!-- Recommendations -->
        ${recsHtml ? `<div class="modal-divider"></div><div class="modal-section-title">Recommendations</div>${recsHtml}` : ''}

        <!-- Sensor snapshot -->
        ${scan.sensorSnapshot ? `
        <div class="modal-divider"></div>
        <div class="modal-section-title">IoT Sensor Snapshot</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          ${[['🧪','pH',scan.sensorSnapshot.ph],['🌡️','Temp',scan.sensorSnapshot.temperature+'°C'],['🦠','Bacterial',scan.sensorSnapshot.bacterial+'%'],['💧','Moisture',scan.sensorSnapshot.moisture+'%']].map(([icon,label,val])=>`
          <div style="background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:10px;text-align:center">
            <div style="font-size:1.2rem">${icon}</div>
            <div style="font-size:1rem;font-weight:800;color:var(--text-base)">${val}</div>
            <div style="font-size:.7rem;color:var(--text-dim)">${label}</div>
          </div>`).join('')}
        </div>` : ''}`,
      footer: `
        <button class="btn-primary" onclick="navigate('report',{id:'${scan.id}'}); Modal.close()">View Full Report</button>
        <button class="btn-secondary" onclick="navigate('printreport',{id:'${scan.id}'}); Modal.close()">📄 Download</button>
        <button class="btn-secondary" onclick="Modal.close()">Close</button>`,
    });
  },

  // IoT sensor modal
  sensor(sensorCfg) {
    const { label, icon, value, unit, normal, desc, history = [], color } = sensorCfg;
    const ok = value >= normal[0] && value <= normal[1];
    const statusColor = ok ? '#00d4aa' : '#ef4444';

    const histMax = Math.max(...history, value), histMin = Math.min(...history, value);
    const range = histMax - histMin || 1;
    const W = 360, H = 60, pts = history.map((v,i) => {
      const x = (i / Math.max(history.length-1,1)) * W;
      const y = H - ((v - histMin) / range) * (H - 8) - 4;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');

    Modal.open({
      title: label,
      subtitle: `Current: ${value}${unit} · Normal: ${normal[0]}–${normal[1]}${unit}`,
      icon,
      body: `
        <!-- Gauge -->
        <div style="padding:16px;background:var(--surface2);border-radius:12px;margin-bottom:16px">
          <div style="display:flex;justify-content:space-between;margin-bottom:8px">
            <span style="font-size:2.4rem;font-weight:900;color:${statusColor}">${value}${unit}</span>
            <span style="padding:4px 14px;border-radius:99px;background:${ok?'rgba(0,212,170,.12)':'rgba(248,113,113,.12)'};color:${statusColor};font-size:.78rem;font-weight:700;align-self:center">${ok?'Normal':'Out of Range'}</span>
          </div>
          <div style="height:10px;background:var(--border);border-radius:99px;overflow:hidden">
            <div style="height:100%;width:${Math.min(100,Math.max(0,((value-sensorCfg.min)/(sensorCfg.max-sensorCfg.min))*100))}%;background:${statusColor};border-radius:99px;transition:width .8s ease"></div>
          </div>
          <div style="display:flex;justify-content:space-between;margin-top:4px;font-size:.72rem;color:var(--text-dim)">
            <span>${sensorCfg.min}</span><span>Normal ${normal[0]}–${normal[1]}</span><span>${sensorCfg.max}${unit}</span>
          </div>
        </div>

        <!-- Trend sparkline -->
        ${history.length >= 2 ? `
        <div class="modal-section-title">Recent Trend (${history.length} readings)</div>
        <div style="background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:12px;margin-bottom:16px">
          <svg viewBox="0 0 ${W} ${H}" style="width:100%;height:60px;display:block">
            <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2.5"
              stroke-linecap="round" stroke-linejoin="round"/>
            ${history.map((v,i)=>{
              const x=(i/Math.max(history.length-1,1))*W,y=H-((v-histMin)/range)*(H-8)-4;
              return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" fill="${color}"/>`;
            }).join('')}
          </svg>
        </div>` : ''}

        <!-- Description -->
        <p style="font-size:.875rem;color:var(--text-muted);line-height:1.65">${desc}</p>

        <!-- Advice -->
        <div style="margin-top:14px;padding:12px;background:rgba(0,212,170,.06);border:1px solid rgba(0,212,170,.18);border-radius:10px;font-size:.84rem;color:var(--text-muted)">
          ${ok
            ? '✅ <strong style="color:#00d4aa">Reading is normal.</strong> Continue regular monitoring.'
            : `⚠️ <strong style="color:#f87171">Reading is outside normal range.</strong> ${value < normal[0] ? 'Value is below the lower limit.' : 'Value is above the upper limit.'} Consult your dentist if this persists.`}
        </div>`,
      footer: `
        <button class="btn-primary" onclick="navigate('sensors'); Modal.close()">View All Sensors</button>
        <button class="btn-secondary" onclick="Modal.close()">Close</button>`,
    });
  },

  // Finding detail modal
  finding(finding, scanDate) {
    const f = typeof finding === 'string'
      ? { condition: finding, severity: 'Mild', confidence: 85, region: '—', description: '' }
      : finding;
    const sevColor = { Severe:'#f87171', Moderate:'#fb923c', Mild:'#fbbf24', Early:'#60a5fa', Minimal:'#00d4aa' }[f.severity] || '#94a3b8';

    Modal.open({
      title: f.condition || f.name,
      subtitle: `Detected ${scanDate || 'recently'}`,
      icon: '🔍',
      accent: sevColor,
      body: `
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px">
          <span class="badge-${f.severity==='Severe'?'severe':f.severity==='Moderate'?'moderate':f.severity==='Minimal'?'minimal':'mild'}" style="font-size:.85rem;padding:5px 16px">${f.severity}</span>
          ${f.confidence ? `<span style="font-size:.84rem;color:var(--text-muted)">Confidence: <strong style="color:var(--text-base)">${f.confidence}%</strong></span>` : ''}
          ${f.region ? `<span style="font-size:.84rem;color:var(--text-muted)">Region: <strong style="color:var(--text-base)">${f.region}</strong></span>` : ''}
        </div>
        <div style="margin-bottom:14px">
          <div style="height:8px;background:var(--border);border-radius:99px;overflow:hidden">
            <div style="height:100%;width:${f.confidence||75}%;background:${sevColor};border-radius:99px"></div>
          </div>
        </div>
        ${f.description ? `<p style="font-size:.875rem;color:var(--text-muted);line-height:1.65;margin-bottom:16px">${f.description}</p>` : ''}

        <!-- What it means -->
        <div class="modal-section-title">What this means</div>
        <p style="font-size:.875rem;color:var(--text-muted);line-height:1.65">${_findingExplanation(f.condition || f.name)}</p>

        <!-- Urgency -->
        <div style="margin-top:14px;padding:12px;background:rgba(0,212,170,.06);border:1px solid rgba(0,212,170,.18);border-radius:10px">
          <div style="font-size:.72rem;text-transform:uppercase;letter-spacing:.07em;color:var(--text-dim);font-weight:700;margin-bottom:5px">Recommended Action</div>
          <p style="font-size:.84rem;color:var(--text-muted)">${_findingAction(f.severity)}</p>
        </div>`,
      footer: `
        <button class="btn-primary" onclick="navigate('symptom'); Modal.close()">🩺 Symptom Checker</button>
        <button class="btn-secondary" onclick="navigate('telehealth'); Modal.close()">📅 Book Dentist</button>
        <button class="btn-secondary" onclick="Modal.close()">Close</button>`,
    });
  },

  // Appointment detail modal
  appointment(appt) {
    if (!appt) return;
    const statusColors = { confirmed:'#00d4aa', pending:'#f59e0b', completed:'#94a3b8', cancelled:'#f87171' };
    const sc = statusColors[appt.status] || '#94a3b8';
    Modal.open({
      title: appt.dentist,
      subtitle: `${appt.specialty} · ${appt.date} at ${appt.time}`,
      icon: '👨‍⚕️',
      body: `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">
          ${[
            ['Status',       `<span style="color:${sc};font-weight:700">${appt.status}</span>`],
            ['Mode',         appt.mode === 'video' ? '📹 Video Call' : '🏥 In-Person'],
            ['Date',         appt.date],
            ['Time',         appt.time],
          ].map(([k,v]) => `
            <div style="background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:12px">
              <div style="font-size:.7rem;color:var(--text-dim);text-transform:uppercase;font-weight:700;margin-bottom:4px">${k}</div>
              <div style="font-size:.9rem;color:var(--text-base);font-weight:600">${v}</div>
            </div>`).join('')}
        </div>
        ${appt.notes ? `
          <div class="modal-section-title">Notes</div>
          <p style="font-size:.875rem;color:var(--text-muted);background:var(--surface2);padding:12px;border-radius:8px;border:1px solid var(--border)">${appt.notes}</p>` : ''}`,
      footer: appt.mode === 'video' && appt.status === 'confirmed'
        ? `<button class="btn-primary" onclick="showToast('Launching secure video call…','info');Modal.close()">📹 Join Video Call</button>
           <button class="btn-secondary" onclick="Modal.close()">Close</button>`
        : `<button class="btn-secondary" onclick="Modal.close()">Close</button>`,
    });
  },

  // Reminder detail
  reminder(rem) {
    if (!rem) return;
    Modal.open({
      title: rem.label,
      subtitle: `${rem.freq} · Streak: 🔥 ${rem.streak} days`,
      icon: '⏰',
      body: `
        <div class="modal-row"><span class="modal-row-label">Frequency</span><span class="modal-row-value">${rem.freq}</span></div>
        <div class="modal-row"><span class="modal-row-label">Next Due</span><span class="modal-row-value">${rem.nextDue || '—'}</span></div>
        <div class="modal-row"><span class="modal-row-label">Last Done</span><span class="modal-row-value">${rem.lastDone || 'Never'}</span></div>
        <div class="modal-row"><span class="modal-row-label">Streak</span><span class="modal-row-value" style="color:#f59e0b">🔥 ${rem.streak} days</span></div>
        ${rem.note ? `<p style="margin-top:14px;font-size:.84rem;color:var(--text-muted);padding:10px;background:var(--surface2);border-radius:8px">${rem.note}</p>` : ''}`,
      footer: `
        <button class="btn-success" onclick="markDone('${rem.id}'); Modal.close()">✓ Mark Done</button>
        <button class="btn-secondary" onclick="editReminder('${rem.id}'); Modal.close()">Edit</button>
        <button class="btn-secondary" onclick="Modal.close()">Close</button>`,
    });
  },
};

// ── Helper: explain a finding ──────────────────────────────────────
function _findingExplanation(name = '') {
  const n = name.toLowerCase();
  if (n.includes('caries') || n.includes('cavity'))
    return 'Dental caries (cavities) occur when bacteria produce acid that erodes tooth enamel. Without treatment, they can progress to deeper layers of the tooth causing pain and potential tooth loss.';
  if (n.includes('gingivitis') || n.includes('gum'))
    return 'Gingivitis is early-stage gum disease caused by plaque buildup at the gumline. It is reversible with improved oral hygiene and professional cleaning.';
  if (n.includes('plaque'))
    return 'Plaque is a sticky film of bacteria. If not removed by brushing and flossing, it hardens into tartar which requires professional cleaning to remove.';
  if (n.includes('enamel'))
    return 'Enamel demineralization is an early stage of tooth decay where minerals are lost from the enamel surface. At this stage, the process can often be reversed with fluoride treatment.';
  if (n.includes('periodontal'))
    return 'Periodontal disease is an advanced gum infection that damages the soft tissue and bone supporting the teeth. It requires professional treatment.';
  if (n.includes('ulcer') || n.includes('lesion'))
    return 'Oral ulcers or lesions should be monitored carefully. Most minor ulcers heal within 2 weeks. Persistent lesions require professional evaluation.';
  return 'This condition was detected by the AI model during image analysis. Consult a dentist for professional evaluation and diagnosis.';
}

function _findingAction(severity) {
  const actions = {
    Severe:   'Seek dental consultation immediately. Delay may significantly worsen the condition.',
    Moderate: 'Schedule a dental appointment within 1–2 weeks for professional evaluation.',
    Mild:     'Book a dental check-up within 4–6 weeks. Improve your home oral hygiene routine.',
    Early:    'Monitor closely. Improve brushing and flossing habits. Rescan in 30 days.',
    Minimal:  'Continue regular oral hygiene. Schedule a routine check-up within 6 months.',
  };
  return actions[severity] || actions.Mild;
}

// ── Auto-init on DOM ready ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => Modal.init());
document.addEventListener('page:rendered',    () => Modal.init());
