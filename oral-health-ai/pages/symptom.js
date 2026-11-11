// ══════════════════════════════════════════════════════
//  Feature 4 — Symptom Checker Wizard
//  Feature 12 — Risk Prediction Engine
// ══════════════════════════════════════════════════════

const SYMPTOM_STORE_KEY = 'oralai_symptoms';

const SYMPTOM_QUESTIONS = [
  {
    id:'pain',
    q:'Do you have tooth or gum pain?',
    options:[
      {label:'No pain at all',          val:0},
      {label:'Mild ache occasionally',  val:1},
      {label:'Moderate pain regularly', val:2},
      {label:'Severe or constant pain', val:3},
    ]
  },
  {
    id:'bleeding',
    q:'Do your gums bleed when brushing or flossing?',
    options:[
      {label:'Never',    val:0},
      {label:'Rarely',   val:1},
      {label:'Sometimes',val:2},
      {label:'Often',    val:3},
    ]
  },
  {
    id:'sensitivity',
    q:'Do you experience tooth sensitivity to hot, cold, or sweet?',
    options:[
      {label:'No sensitivity',            val:0},
      {label:'Mild — barely noticeable',  val:1},
      {label:'Moderate — causes discomfort',val:2},
      {label:'Severe — interferes with eating',val:3},
    ]
  },
  {
    id:'swelling',
    q:'Is there any swelling in your gums, jaw, or face?',
    options:[
      {label:'No swelling',             val:0},
      {label:'Slight puffiness',         val:1},
      {label:'Noticeable swelling',      val:2},
      {label:'Severe / rapidly increasing',val:3},
    ]
  },
  {
    id:'ulcer',
    q:'How long have any oral ulcers or sores been present?',
    options:[
      {label:'None',                    val:0},
      {label:'Less than 1 week',        val:1},
      {label:'1–3 weeks',               val:2},
      {label:'More than 3 weeks',       val:3},
    ]
  },
  {
    id:'tobacco',
    q:'Do you use tobacco (smoking, chewing, vaping)?',
    options:[
      {label:'Never',              val:0},
      {label:'Former user (quit)', val:1},
      {label:'Occasionally',       val:2},
      {label:'Daily',              val:3},
    ]
  },
  {
    id:'diabetes',
    q:'Have you been diagnosed with diabetes?',
    options:[
      {label:'No',                        val:0},
      {label:'Pre-diabetic / borderline', val:1},
      {label:'Type 2 (controlled)',        val:2},
      {label:'Type 1 or uncontrolled',    val:3},
    ]
  },
  {
    id:'history',
    q:'Do you have a history of oral disease (gum disease, cancer, root canal)?',
    options:[
      {label:'No previous issues',         val:0},
      {label:'Minor issues in the past',   val:1},
      {label:'Treated gum disease / caries',val:2},
      {label:'Oral cancer or major surgery',val:3},
    ]
  },
];

let _symptomStep = 0;
let _symptomAnswers = {};

function pageSymptomChecker(params) {
  const savedAnswers = Store.get(SYMPTOM_STORE_KEY);
  if (savedAnswers) _symptomAnswers = savedAnswers;

  return `
  <div class="max-w-2xl mx-auto space-y-6">

    <div>
      <h2 class="text-2xl font-bold text-white flex items-center gap-2">
        🩺 Symptom Checker
      </h2>
      <p class="text-gray-400 mt-1 text-sm">
        Answer 8 quick questions. Your symptoms are combined with AI scan results for a fuller risk picture.
        <strong class="text-yellow-400">This is not a diagnosis — always consult a dentist.</strong>
      </p>
    </div>

    <!-- Progress -->
    <div class="card py-4 space-y-2">
      <div class="flex justify-between text-xs text-gray-500">
        <span id="sym-step-label">Question 1 of ${SYMPTOM_QUESTIONS.length}</span>
        <span id="sym-pct-label">0%</span>
      </div>
      <div class="sensor-bar h-2">
        <div id="sym-progress" class="sensor-fill bg-brand-500 h-2" style="width:0%;transition:width 0.4s"></div>
      </div>
    </div>

    <!-- Question area -->
    <div id="sym-question-area">
      ${_renderSymptomQuestion(0)}
    </div>

    <!-- Result area (hidden until done) -->
    <div id="sym-result" class="hidden"></div>

  </div>
  `;
}

function _renderSymptomQuestion(step) {
  if (step >= SYMPTOM_QUESTIONS.length) {
    return _renderSymptomResult();
  }
  const q = SYMPTOM_QUESTIONS[step];
  const saved = _symptomAnswers[q.id];
  return `
  <div class="card space-y-4 page-enter">
    <h3 class="text-lg font-semibold text-white">${q.q}</h3>
    <div class="space-y-2">
      ${q.options.map((opt) => `
        <label class="flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all
                      ${saved !== undefined && saved === opt.val
                        ? 'border-brand-500 bg-brand-500/10'
                        : 'border-gray-700 bg-gray-900 hover:border-brand-500/50'}
                      sym-opt">
          <input type="radio" name="sym_${q.id}" value="${opt.val}" ${saved===opt.val?'checked':''}
                 class="accent-brand-500 flex-shrink-0"
                 onchange="_symptomAnswers['${q.id}']=${opt.val}; highlightSymOpt(this)"/>
          <span class="text-sm text-gray-200">${opt.label}</span>
        </label>`).join('')}
    </div>
    <div class="flex justify-between pt-2">
      <button onclick="symPrev()" class="btn-secondary text-sm ${step===0?'invisible':''}"
              ${step===0?'tabindex="-1"':''}>← Back</button>
      <button onclick="symNext(${step})" class="btn-primary text-sm">
        ${step === SYMPTOM_QUESTIONS.length-1 ? 'View Risk Report →' : 'Next →'}
      </button>
    </div>
  </div>`;
}

function highlightSymOpt(radio) {
  radio.closest('.card')?.querySelectorAll('.sym-opt').forEach(el => {
    const isSelected = el.querySelector('input')?.checked;
    el.classList.toggle('border-brand-500', isSelected);
    el.classList.toggle('bg-brand-500/10',  isSelected);
    el.classList.toggle('border-gray-700', !isSelected);
    el.classList.toggle('bg-gray-900',     !isSelected);
  });
}

function symNext(step) {
  const q = SYMPTOM_QUESTIONS[step];
  if (_symptomAnswers[q.id] === undefined) {
    showToast('Please select an answer', 'warning'); return;
  }
  _symptomStep = step + 1;
  _updateSymProgress(_symptomStep);
  const area = document.getElementById('sym-question-area');
  if (area) area.innerHTML = _renderSymptomQuestion(_symptomStep);
  if (_symptomStep >= SYMPTOM_QUESTIONS.length) {
    Store.set(SYMPTOM_STORE_KEY, _symptomAnswers);
    const area2 = document.getElementById('sym-question-area');
    if (area2) area2.innerHTML = _renderSymptomResult();
  }
}

function symPrev() {
  if (_symptomStep <= 0) return;
  _symptomStep--;
  _updateSymProgress(_symptomStep);
  const area = document.getElementById('sym-question-area');
  if (area) area.innerHTML = _renderSymptomQuestion(_symptomStep);
}

function _updateSymProgress(step) {
  const total = SYMPTOM_QUESTIONS.length;
  const pct   = Math.round((step / total) * 100);
  const bar   = document.getElementById('sym-progress');
  const lbl   = document.getElementById('sym-step-label');
  const pLbl  = document.getElementById('sym-pct-label');
  if (bar)  bar.style.width   = pct + '%';
  if (lbl)  lbl.textContent   = step >= total ? 'Complete' : `Question ${step+1} of ${total}`;
  if (pLbl) pLbl.textContent  = pct + '%';
}

function _renderSymptomResult() {
  Store.set(SYMPTOM_STORE_KEY, _symptomAnswers);
  const result = _computeRisk(_symptomAnswers);
  const latest = AppState.scans[0];

  const urgencyConfig = {
    low:     { color:'#10b981', bg:'bg-green-500/10',  border:'border-green-500/30', label:'Monitor at Home',       icon:'✅' },
    medium:  { color:'#f59e0b', bg:'bg-yellow-500/10', border:'border-yellow-500/30',label:'Schedule Dentist Visit', icon:'⚠️' },
    high:    { color:'#ef4444', bg:'bg-red-500/10',    border:'border-red-500/30',   label:'Urgent Consultation',    icon:'🚨' },
  };
  const urg = urgencyConfig[result.urgency];

  return `
  <div class="space-y-5">
    <!-- Risk score -->
    <div class="card ${urg.bg} ${urg.border} border">
      <div class="flex flex-col sm:flex-row sm:items-center gap-5">
        <div class="ring-container flex-shrink-0 mx-auto sm:mx-0" style="width:110px;height:110px;">
          <svg width="110" height="110" viewBox="0 0 160 160">
            <circle class="ring-bg" cx="80" cy="80" r="54"/>
            <circle class="ring-fill" cx="80" cy="80" r="54"
              stroke="${urg.color}"
              stroke-dasharray="339.3"
              stroke-dashoffset="${(339.3 - (result.riskScore/100)*339.3).toFixed(1)}"
              transform="rotate(-90 80 80)"/>
          </svg>
          <div class="ring-text">
            <div class="text-2xl font-black" style="color:${urg.color}">${result.riskScore}</div>
            <div class="text-xs" style="color:${urg.color}">Risk</div>
          </div>
        </div>
        <div class="flex-1">
          <div class="text-lg font-bold text-white mb-1">${urg.icon} ${urg.label}</div>
          <div class="text-sm text-gray-300 leading-relaxed">${result.summary}</div>
          <div class="flex flex-wrap gap-2 mt-3">
            ${result.flags.map(f => `<span class="text-xs px-2.5 py-1 rounded-full bg-gray-800 border border-gray-700 text-gray-300">${f}</span>`).join('')}
          </div>
        </div>
      </div>
    </div>

    <!-- Symptom breakdown -->
    <div class="card">
      <h3 class="font-semibold text-white mb-3">Symptom Breakdown</h3>
      <div class="space-y-2">
        ${SYMPTOM_QUESTIONS.map(q => {
          const val = _symptomAnswers[q.id] ?? 0;
          const opt = q.options[val] || q.options[0];
          const col = val===0?'#10b981':val===1?'#f59e0b':val>=2?'#ef4444':'#64748b';
          return `
          <div class="flex items-center gap-3 p-2 rounded-lg bg-gray-900 border border-gray-800 text-sm">
            <span class="text-gray-400 flex-1 min-w-0 truncate">${q.q.replace('?','')}</span>
            <span class="font-semibold text-xs flex-shrink-0" style="color:${col}">${opt.label}</span>
          </div>`;
        }).join('')}
      </div>
    </div>

    <!-- Combined with scan -->
    ${latest ? `
    <div class="card">
      <h3 class="font-semibold text-white mb-3">Combined with Latest Scan</h3>
      <div class="grid grid-cols-2 gap-4 text-center">
        <div class="p-4 rounded-xl bg-gray-900 border border-gray-800">
          <div class="text-2xl font-black text-brand-400">${latest.score}</div>
          <div class="text-xs text-gray-500 mt-1">AI Scan Score</div>
        </div>
        <div class="p-4 rounded-xl bg-gray-900 border border-gray-800">
          <div class="text-2xl font-black" style="color:${urg.color}">${result.riskScore}</div>
          <div class="text-xs text-gray-500 mt-1">Symptom Risk</div>
        </div>
      </div>
      <p class="text-xs text-gray-500 mt-3 leading-relaxed">
        ${result.combined(latest.score)}
      </p>
    </div>` : ''}

    <!-- Recommendations -->
    <div class="card">
      <h3 class="font-semibold text-white mb-3">What To Do Next</h3>
      <div class="space-y-2">
        ${result.actions.map((a,i) => `
          <div class="flex items-start gap-3 p-3 rounded-lg bg-gray-900 border border-gray-800">
            <span class="w-5 h-5 rounded-full bg-brand-500/20 text-brand-400 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">${i+1}</span>
            <span class="text-sm text-gray-200">${a}</span>
          </div>`).join('')}
      </div>
    </div>

    <!-- Emergency warning if applicable -->
    ${result.emergency ? `
    <div class="card border-red-500/40 bg-red-500/8">
      <div class="flex items-start gap-3">
        <span class="text-3xl flex-shrink-0">🚨</span>
        <div>
          <div class="font-bold text-red-300 text-lg mb-1">Seek Immediate Professional Care</div>
          <p class="text-red-200/80 text-sm leading-relaxed">${result.emergencyMsg}</p>
          <button onclick="navigate('telehealth')" class="btn-primary mt-3 text-sm" style="background:linear-gradient(135deg,#ef4444,#dc2626);">
            Book Urgent Consultation →
          </button>
        </div>
      </div>
    </div>` : ''}

    <!-- Disclaimer -->
    <div class="card text-center py-4">
      <p class="text-xs text-gray-600 leading-relaxed">
        ⚠️ This symptom checker is for informational purposes only and does not replace a professional dental examination.
        AI risk scores are estimates based on self-reported data and should be validated by a qualified dentist.
      </p>
      <div class="flex justify-center gap-3 mt-3 flex-wrap">
        <button onclick="symReset()" class="btn-secondary text-sm">Start Over</button>
        <button onclick="navigate('upload')" class="btn-primary text-sm">Upload a Scan</button>
        <button onclick="navigate('telehealth')" class="btn-success text-sm">Book Dentist</button>
      </div>
    </div>
  </div>`;
}

function _computeRisk(answers) {
  const pain        = answers.pain        ?? 0;
  const bleeding    = answers.bleeding    ?? 0;
  const sensitivity = answers.sensitivity ?? 0;
  const swelling    = answers.swelling    ?? 0;
  const ulcer       = answers.ulcer       ?? 0;
  const tobacco     = answers.tobacco     ?? 0;
  const diabetes    = answers.diabetes    ?? 0;
  const history     = answers.history     ?? 0;

  // Weighted risk score 0-100
  const raw = (
    pain        * 12 +
    bleeding    * 10 +
    sensitivity *  8 +
    swelling    * 15 +
    ulcer       * 15 +
    tobacco     * 10 +
    diabetes    *  8 +
    history     *  7
  );
  const maxRaw = 3 * (12+10+8+15+15+10+8+7);
  const riskScore = Math.round((raw / maxRaw) * 100);

  const urgency = riskScore >= 60 ? 'high' : riskScore >= 30 ? 'medium' : 'low';

  const flags = [];
  if (pain        >= 2) flags.push('🔴 Pain');
  if (bleeding    >= 2) flags.push('🩸 Gum Bleeding');
  if (swelling    >= 2) flags.push('🔴 Swelling');
  if (ulcer       >= 2) flags.push('⚠️ Ulcer >1w');
  if (tobacco     >= 2) flags.push('🚬 Tobacco Use');
  if (diabetes    >= 2) flags.push('💉 Diabetes');
  if (sensitivity >= 2) flags.push('❄️ Sensitivity');
  if (history     >= 2) flags.push('📋 Prior Disease');

  const emergency = swelling >= 3 || (ulcer >= 3) || (pain >= 3 && swelling >= 2);
  const emergencyMsg = swelling >= 3
    ? 'Severe or rapidly increasing swelling can indicate a dental abscess or serious infection. Please visit an emergency dentist or hospital immediately.'
    : ulcer >= 3
    ? 'Oral ulcers lasting more than 3 weeks require immediate professional evaluation to rule out serious conditions.'
    : 'Severe pain combined with swelling may indicate an advanced infection. Seek professional care today.';

  const summaryMap = {
    low:    'Your symptom profile suggests low immediate risk. Continue regular oral hygiene and schedule a routine check-up.',
    medium: 'Moderate symptoms detected. A dentist visit within 2–4 weeks is recommended for professional evaluation.',
    high:   'High-risk symptom profile. Please consult a dentist as soon as possible — some symptoms may indicate serious conditions.',
  };

  const actionsMap = {
    low:    ['Continue brushing twice daily with fluoride toothpaste','Floss daily to prevent plaque buildup','Schedule a routine dental check-up within 6 months','Monitor symptoms and use this checker again if anything changes'],
    medium: ['Book a dentist appointment within 2–4 weeks','Avoid irritants: alcohol, tobacco, acidic foods','Use antiseptic mouthwash twice daily','Take over-the-counter pain relief if needed (follow dosage instructions)','Upload a dental scan for AI analysis'],
    high:   ['Contact your dentist today or visit an emergency dental clinic','Do not delay — some conditions worsen rapidly without treatment','If severe swelling or difficulty breathing/swallowing, go to emergency services (911)','Upload a dental scan and share the report with your dentist immediately'],
  };

  return {
    riskScore,
    urgency,
    flags,
    summary: summaryMap[urgency],
    actions: actionsMap[urgency],
    emergency,
    emergencyMsg,
    combined: (scanScore) => {
      const combined = Math.round((riskScore * 0.5) + ((100 - scanScore) * 0.5));
      return combined >= 60
        ? `Combined risk is HIGH (${combined}%). Your scan and symptoms both indicate concern. Please consult a dentist promptly.`
        : combined >= 35
        ? `Combined risk is MODERATE (${combined}%). Your symptoms or scan shows some concern. A dentist check-up is advised.`
        : `Combined risk is LOW (${combined}%). Your scan and symptoms look relatively stable. Maintain regular hygiene.`;
    }
  };
}

function symReset() {
  _symptomAnswers = {};
  _symptomStep    = 0;
  Store.set(SYMPTOM_STORE_KEY, {});
  const area = document.getElementById('sym-question-area');
  if (area) area.innerHTML = _renderSymptomQuestion(0);
  _updateSymProgress(0);
}

// ── Risk Prediction standalone helper (used by report.js) ──
function computeFullRisk(scan) {
  const symptoms = Store.get(SYMPTOM_STORE_KEY) || {};
  const sensors  = AppState.sensors;
  const base     = _computeRisk(symptoms);
  // Blend with scan score and sensor readings
  const pHRisk   = sensors.ph < 6.5 ? 15 : 0;
  const bacRisk  = sensors.bacterial > 60 ? 15 : sensors.bacterial > 50 ? 8 : 0;
  const combined = Math.min(100, Math.round(
    base.riskScore * 0.5 +
    (100 - (scan?.score || 75)) * 0.35 +
    pHRisk + bacRisk
  ));
  return { ...base, combinedRisk: combined };
}
// Explicit global export so report.js can call it safely regardless of load order
window.computeFullRisk = computeFullRisk;
