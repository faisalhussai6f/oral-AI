// ── Oral Health Score Calculator ──
function pageCalculator() {
  return `
  <div class="max-w-2xl mx-auto space-y-6">

    <div>
      <h2 class="text-2xl font-bold text-white flex items-center gap-2">
        🧮 Health Score Calculator
      </h2>
      <p class="text-gray-400 mt-1 text-sm">
        Answer 8 quick questions to estimate your oral health score — no scan required.
      </p>
    </div>

    <div class="card space-y-6" id="calc-form">

      ${_calcQuestions().map((q, i) => `
        <div class="space-y-2" id="calc-q${i}">
          <div class="flex items-start gap-3">
            <span class="w-6 h-6 rounded-full bg-brand-500/20 text-brand-400 text-xs
                         font-bold flex items-center justify-center flex-shrink-0 mt-0.5">${i+1}</span>
            <div class="flex-1">
              <p class="text-sm font-semibold text-gray-200">${q.text}</p>
              <div class="mt-2 grid grid-cols-1 gap-1.5">
                ${q.options.map((opt, j) => `
                  <label class="flex items-center gap-3 p-2.5 rounded-lg cursor-pointer
                                border border-gray-800 bg-gray-900
                                hover:border-brand-500/40 hover:bg-brand-500/5
                                transition-all calc-opt" data-q="${i}" data-val="${opt.score}">
                    <input type="radio" name="calc_q${i}" value="${opt.score}"
                           class="accent-brand-500 flex-shrink-0"
                           onchange="calcUpdate()" />
                    <span class="text-sm text-gray-300">${opt.label}</span>
                    ${opt.flag ? `<span class="ml-auto text-xs px-2 py-0.5 rounded-full ${opt.flag === 'good' ? 'bg-green-500/20 text-green-400' : opt.flag === 'warn' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}">${opt.flag === 'good' ? '✓ Good' : opt.flag === 'warn' ? '⚠ Fair' : '✗ Risk'}</span>` : ''}
                  </label>`).join('')}
              </div>
            </div>
          </div>
        </div>`).join('')}

      <!-- Live result -->
      <div id="calc-result" class="hidden">
        <div class="border-t border-gray-800 pt-5">
          <div class="flex flex-col sm:flex-row sm:items-center gap-6">
            <!-- Score ring -->
            <div class="flex-shrink-0 mx-auto sm:mx-0">
              <div class="ring-container" style="width:120px;height:120px;">
                <svg width="120" height="120" viewBox="0 0 160 160">
                  <circle class="ring-bg" cx="80" cy="80" r="54"/>
                  <circle id="calc-ring" class="ring-fill" cx="80" cy="80" r="54"
                    stroke="#10b981" stroke-dasharray="339.3" stroke-dashoffset="339.3"
                    transform="rotate(-90 80 80)"/>
                </svg>
                <div class="ring-text">
                  <div class="text-3xl font-black text-white" id="calc-score-num">0</div>
                  <div class="text-xs font-semibold" id="calc-score-lbl" style="color:#10b981">—</div>
                </div>
              </div>
            </div>

            <!-- Verdict -->
            <div class="flex-1 space-y-3">
              <div>
                <p class="text-xs text-gray-500 uppercase tracking-wider font-semibold">Estimated Score</p>
                <p class="text-xl font-black text-white mt-0.5" id="calc-verdict">—</p>
              </div>
              <p class="text-sm text-gray-400 leading-relaxed" id="calc-advice">—</p>
              <div id="calc-flags" class="flex flex-wrap gap-2 text-xs"></div>
            </div>
          </div>

          <div class="flex flex-col sm:flex-row gap-3 mt-5">
            <button onclick="navigate('upload')" class="btn-primary flex-1 justify-center">
              📸 Get Real AI Scan
            </button>
            <button onclick="calcSaveToHistory()" class="btn-secondary flex-1 justify-center" id="calc-save-btn">
              💾 Save as Wellness Note
            </button>
            <button onclick="calcReset()" class="btn-secondary sm:w-32 justify-center">
              Reset
            </button>
          </div>
          <p class="text-xs text-gray-600 text-center mt-3">
            ⚠️ This is an estimate only. Upload a scan for AI-powered analysis.
          </p>
        </div>
      </div>

      <!-- Progress bar -->
      <div id="calc-progress-wrap" class="pt-2">
        <div class="flex justify-between text-xs text-gray-600 mb-1">
          <span id="calc-progress-label">0 of 8 answered</span>
          <span id="calc-progress-pct">0%</span>
        </div>
        <div class="sensor-bar">
          <div id="calc-progress-bar" class="sensor-fill bg-brand-500" style="width:0%"></div>
        </div>
      </div>
    </div>

    <!-- Tips card -->
    <div class="card">
      <h3 class="font-semibold text-white mb-3 text-sm">💡 How Scores Work</h3>
      <div class="grid grid-cols-3 gap-3 text-center text-xs">
        <div class="p-3 rounded-xl bg-gray-900 border border-gray-800">
          <div class="text-2xl mb-1">🟢</div>
          <div class="font-semibold text-green-400">80–100</div>
          <div class="text-gray-500 mt-0.5">Good</div>
          <div class="text-gray-600 mt-1">Excellent oral hygiene, low risk</div>
        </div>
        <div class="p-3 rounded-xl bg-gray-900 border border-gray-800">
          <div class="text-2xl mb-1">🟡</div>
          <div class="font-semibold text-yellow-400">60–79</div>
          <div class="text-gray-500 mt-0.5">Fair</div>
          <div class="text-gray-600 mt-1">Some areas need improvement</div>
        </div>
        <div class="p-3 rounded-xl bg-gray-900 border border-gray-800">
          <div class="text-2xl mb-1">🔴</div>
          <div class="font-semibold text-red-400">0–59</div>
          <div class="text-gray-500 mt-0.5">Poor</div>
          <div class="text-gray-600 mt-1">Dental attention recommended</div>
        </div>
      </div>
    </div>

  </div>
  `;
}

function _calcQuestions() {
  return [
    {
      text: 'How often do you brush your teeth?',
      options: [
        { label: 'Twice daily or more',      score: 20, flag: 'good' },
        { label: 'Once daily',               score: 14, flag: 'warn' },
        { label: 'Every few days',           score:  7, flag: 'risk' },
        { label: 'Rarely',                   score:  2, flag: 'risk' },
      ],
    },
    {
      text: 'Do you floss or use interdental brushes?',
      options: [
        { label: 'Daily',                    score: 15, flag: 'good' },
        { label: '2–3 times a week',         score: 10, flag: 'warn' },
        { label: 'Occasionally',             score:  5, flag: 'risk' },
        { label: 'Never',                    score:  0, flag: 'risk' },
      ],
    },
    {
      text: 'When did you last visit a dentist?',
      options: [
        { label: 'Within the last 6 months', score: 15, flag: 'good' },
        { label: '6–12 months ago',          score: 10, flag: 'warn' },
        { label: '1–2 years ago',            score:  5, flag: 'warn' },
        { label: 'More than 2 years ago',    score:  2, flag: 'risk' },
      ],
    },
    {
      text: 'Do you currently have tooth pain or sensitivity?',
      options: [
        { label: 'No pain or sensitivity',   score: 15, flag: 'good' },
        { label: 'Mild sensitivity',         score:  9, flag: 'warn' },
        { label: 'Occasional pain',          score:  5, flag: 'warn' },
        { label: 'Regular or severe pain',   score:  1, flag: 'risk' },
      ],
    },
    {
      text: 'Do your gums bleed when brushing or flossing?',
      options: [
        { label: 'Never',                    score: 10, flag: 'good' },
        { label: 'Rarely',                   score:  7, flag: 'warn' },
        { label: 'Sometimes',                score:  4, flag: 'warn' },
        { label: 'Often',                    score:  1, flag: 'risk' },
      ],
    },
    {
      text: 'How would you describe your diet regarding sugary/acidic foods?',
      options: [
        { label: 'Low sugar & acid intake',  score: 10, flag: 'good' },
        { label: 'Moderate intake',          score:  7, flag: 'warn' },
        { label: 'High intake',              score:  3, flag: 'risk' },
        { label: 'Very high (daily sodas/sweets)', score: 1, flag: 'risk' },
      ],
    },
    {
      text: 'Do you smoke or use tobacco products?',
      options: [
        { label: 'Never',                    score:  8, flag: 'good' },
        { label: 'Former smoker (quit)',      score:  6, flag: 'warn' },
        { label: 'Occasionally',             score:  3, flag: 'risk' },
        { label: 'Daily',                    score:  1, flag: 'risk' },
      ],
    },
    {
      text: 'Do you use a fluoride toothpaste and/or mouthwash?',
      options: [
        { label: 'Both fluoride toothpaste and mouthwash', score: 7, flag: 'good' },
        { label: 'Fluoride toothpaste only',               score: 5, flag: 'warn' },
        { label: 'Non-fluoride products',                  score: 3, flag: 'warn' },
        { label: 'No specific oral care products',         score: 1, flag: 'risk' },
      ],
    },
  ];
}

function calcUpdate() {
  const qs   = _calcQuestions();
  const total = qs.length;
  let answered = 0, scoreSum = 0, maxSum = 0;
  const flags = [];

  qs.forEach((q, i) => {
    const sel = document.querySelector(`input[name="calc_q${i}"]:checked`);
    maxSum += Math.max(...q.options.map(o => o.score));
    if (sel) {
      answered++;
      const val = parseInt(sel.value);
      scoreSum += val;
      // Collect risk flags
      const opt = q.options.find(o => o.score === val);
      if (opt?.flag === 'risk') flags.push(`Q${i+1}`);
      // Visual highlight selected
      document.querySelectorAll(`label.calc-opt[data-q="${i}"]`).forEach(el => {
        const isChosen = el.querySelector('input')?.checked;
        el.classList.toggle('border-brand-500/60', isChosen);
        el.classList.toggle('bg-brand-500/10',     isChosen);
        el.classList.toggle('border-gray-800',    !isChosen);
        el.classList.toggle('bg-gray-900',        !isChosen);
      });
    }
  });

  // Progress bar
  const pct = Math.round((answered / total) * 100);
  document.getElementById('calc-progress-bar').style.width  = pct + '%';
  document.getElementById('calc-progress-label').textContent = `${answered} of ${total} answered`;
  document.getElementById('calc-progress-pct').textContent   = pct + '%';

  if (answered < total) {
    document.getElementById('calc-result').classList.add('hidden');
    return;
  }

  // Compute score 0–100
  const score = Math.round((scoreSum / maxSum) * 100);
  const color  = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';
  const label  = score >= 80 ? 'Good' : score >= 60 ? 'Fair' : 'Needs Attention';
  const advice = score >= 80
    ? 'Excellent oral hygiene! Keep up your routine and schedule a check-up within 6 months.'
    : score >= 60
    ? 'Your oral health is fair. Focus on flossing daily and reducing sugary food intake.'
    : 'Your oral health needs attention. Please book a dental consultation soon and consider uploading a scan for a detailed AI assessment.';

  // Animate ring
  const circ = 339.3;
  const ring = document.getElementById('calc-ring');
  if (ring) {
    ring.setAttribute('stroke', color);
    ring.setAttribute('stroke-dashoffset', (circ - (score / 100) * circ).toString());
  }

  // Animate counter
  const numEl = document.getElementById('calc-score-num');
  if (numEl) {
    let cur = 0;
    const target = score;
    const step   = Math.max(1, Math.ceil(target / 40));
    const t = setInterval(() => {
      cur = Math.min(cur + step, target);
      numEl.textContent = cur;
      if (cur >= target) clearInterval(t);
    }, 18);
  }

  const lblEl = document.getElementById('calc-score-lbl');
  if (lblEl) { lblEl.textContent = label; lblEl.style.color = color; }

  const verdictEl = document.getElementById('calc-verdict');
  if (verdictEl) verdictEl.textContent = `Estimated Score: ${score}/100 — ${label}`;

  const adviceEl = document.getElementById('calc-advice');
  if (adviceEl) adviceEl.textContent = advice;

  const flagsEl = document.getElementById('calc-flags');
  if (flagsEl) {
    flagsEl.innerHTML = flags.length
      ? `<span class="text-gray-500">Risk indicators:</span> ` +
        flags.map(f => `<span class="px-2 py-0.5 rounded-full bg-red-500/15 border border-red-800 text-red-400">${f}</span>`).join('')
      : `<span class="text-green-400">✓ No major risk indicators</span>`;
  }

  document.getElementById('calc-result').classList.remove('hidden');
  // Scroll result into view
  document.getElementById('calc-result').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function calcReset() {
  document.querySelectorAll('.calc-opt input[type="radio"]').forEach(r => { r.checked = false; });
  document.querySelectorAll('label.calc-opt').forEach(el => {
    el.classList.remove('border-brand-500/60', 'bg-brand-500/10');
    el.classList.add('border-gray-800', 'bg-gray-900');
  });
  document.getElementById('calc-result').classList.add('hidden');
  document.getElementById('calc-progress-bar').style.width = '0%';
  document.getElementById('calc-progress-label').textContent = '0 of 8 answered';
  document.getElementById('calc-progress-pct').textContent  = '0%';
}

function calcSaveToHistory() {
  const score = parseInt(document.getElementById('calc-score-num')?.textContent || '0');
  if (!score) { showToast('Complete the quiz first', 'warning'); return; }
  const note = {
    id:     'CALC-' + Date.now().toString().slice(-8),
    date:   new Date().toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric'}),
    type:   'Self-Assessment',
    device: 'Quiz',
    score,
    status:         'analyzed',
    confidence:     72,
    attentionAreas: 0,
    findings:       ['Self-reported assessment — no image scan'],
    diagnosis:      'Estimated score from oral health quiz.',
    recommendations:['Upload an intraoral scan for AI-powered diagnosis.'],
    model:          'quiz-v1.0',
  };
  AppState.scans.unshift(note);
  saveScans();
  showToast('Wellness note saved to scan history!', 'success');
  navigate('scans');
}
