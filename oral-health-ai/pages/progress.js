// ── Multi-Scan Progress Report Page ──
// PDF-ready, printable summary across all scans.

function pageProgress() {
  const scans   = AppState.scans;
  const user    = AppState.user || { name: 'Demo User', email: 'demo@oralai.com' };
  const sensors = AppState.sensors;

  if (scans.length === 0) {
    return `
    <div class="max-w-lg mx-auto text-center py-20 space-y-4">
      <div class="text-6xl">📈</div>
      <h2 class="text-2xl font-bold text-white">Progress Report</h2>
      <p class="text-gray-400">You need at least one scan to generate a progress report.</p>
      <button onclick="navigate('upload')" class="btn-primary">Upload First Scan</button>
    </div>`;
  }

  // ── Computed metrics ──
  const sorted      = [...scans].reverse();               // oldest → newest
  const latest      = scans[0];
  const first       = sorted[0];
  const avgScore    = Math.round(scans.reduce((a, s) => a + s.score, 0) / scans.length);
  const bestScore   = Math.max(...scans.map(s => s.score));
  const worstScore  = Math.min(...scans.map(s => s.score));
  const trend       = latest.score - first.score;
  const trendColor  = trend > 0 ? '#10b981' : trend < 0 ? '#ef4444' : '#64748b';
  const trendArrow  = trend > 0 ? '↑' : trend < 0 ? '↓' : '→';
  const trendLabel  = trend !== 0
    ? `${trendArrow} ${Math.abs(trend)} pts over ${scans.length} scan${scans.length > 1 ? 's' : ''}`
    : `Stable over ${scans.length} scan${scans.length > 1 ? 's' : ''}`;

  // All findings aggregated
  const allFindings = scans.flatMap(s =>
    (s.findings || []).map(f => typeof f === 'string' ? f : (f.condition || f.name || ''))
  ).filter(Boolean);
  const findingFreq = {};
  allFindings.forEach(f => { findingFreq[f] = (findingFreq[f] || 0) + 1; });
  const topFindings = Object.entries(findingFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  const scoreColor = s => s >= 80 ? '#10b981' : s >= 60 ? '#f59e0b' : '#ef4444';

  // ── Score trend SVG ──
  const tScores = sorted.map(s => s.score);
  const tLabels = sorted.map(s => s.date.replace(/,.*/, '').replace(/ \d{4}$/, ''));
  const W=500, H=120, PL=36, PR=12, PT=10, PB=26;
  const iW = W-PL-PR, iH = H-PT-PB;
  const sMin = Math.max(0, Math.min(...tScores) - 8);
  const sMax = Math.min(100, Math.max(...tScores) + 8);
  const tX = i => (PL + (i / Math.max(tScores.length-1,1)) * iW).toFixed(1);
  const tY = v => (PT + iH - ((v - sMin) / (sMax - sMin || 1)) * iH).toFixed(1);
  const pathPts   = tScores.map((v,i) => `${tX(i)},${tY(v)}`).join(' ');
  const areaPath  = `M${tX(0)},${tY(tScores[0])} ` +
    tScores.map((v,i) => `L${tX(i)},${tY(v)}`).join(' ') +
    ` L${tX(tScores.length-1)},${H-PB} L${tX(0)},${H-PB} Z`;
  const yVals     = [60,70,80,90,100].filter(v => v >= sMin && v <= sMax);
  const yGrid     = yVals.map(v => {
    const y = tY(v);
    return `<line x1="${PL}" y1="${y}" x2="${W-PR}" y2="${y}" stroke="#1e2a3a" stroke-width="1" stroke-dasharray="3,3"/>
            <text x="${PL-4}" y="${+y+3.5}" fill="#4b5563" font-size="8" text-anchor="end">${v}</text>`;
  }).join('');
  const dots = tScores.map((v,i) => {
    const x = tX(i), y = tY(v), c = scoreColor(v);
    const lbl = tLabels[i] || '';
    return `<circle cx="${x}" cy="${y}" r="4" fill="${c}" stroke="#0d1117" stroke-width="2"/>
            <text x="${x}" y="${+y-8}" fill="#e2e8f0" font-size="8" font-weight="600" text-anchor="middle">${v}</text>
            <text x="${x}" y="${H-5}" fill="#4b5563" font-size="7" text-anchor="middle">${lbl}</text>`;
  }).join('');

  const trendSVG = `
    <svg viewBox="0 0 ${W} ${H}" style="width:100%;height:130px;display:block;">
      <defs>
        <linearGradient id="pr-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#28a8ff" stop-opacity="0.28"/>
          <stop offset="100%" stop-color="#28a8ff" stop-opacity="0.02"/>
        </linearGradient>
      </defs>
      <path d="${areaPath}" fill="url(#pr-grad)"/>
      ${yGrid}
      <line x1="${PL}" y1="${PT}" x2="${PL}" y2="${H-PB}" stroke="#334155" stroke-width="1"/>
      <line x1="${PL}" y1="${H-PB}" x2="${W-PR}" y2="${H-PB}" stroke="#334155" stroke-width="1"/>
      <polyline points="${pathPts}" fill="none" stroke="#28a8ff" stroke-width="2.5"
        stroke-linecap="round" stroke-linejoin="round"/>
      ${dots}
    </svg>`;

  // ── Sensor summary ──
  const sensorRows = [
    ['🧪','Saliva pH',    sensors.ph,          '6.5–7.5',    ''],
    ['🌡️','Temperature', sensors.temperature, '36.1–37.2', '°C'],
    ['🦠','Bacterial',    sensors.bacterial,   '< 50',       '%'],
    ['💧','Moisture',     sensors.moisture,    '> 60',       '%'],
  ].map(([icon, name, val, normal, unit]) => {
    const ok = name === 'Saliva pH'     ? (val >= 6.5 && val <= 7.5)
              : name === 'Temperature'  ? (val >= 36.1 && val <= 37.2)
              : name === 'Bacterial'    ? val < 50
              : val > 60;
    return { icon, name, val: val + unit, normal: normal + unit, ok };
  });

  const generated = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  return `
  <div class="max-w-4xl mx-auto space-y-4">

    <!-- Toolbar (no-print) -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 no-print">
      <div>
        <h2 class="text-2xl font-bold text-white flex items-center gap-2">
          📈 Progress Report
        </h2>
        <p class="text-gray-400 mt-1 text-sm">Across all ${scans.length} scan${scans.length !== 1 ? 's' : ''}</p>
      </div>
      <div class="flex gap-2 flex-wrap">
        <button onclick="navigate('scans')" class="btn-secondary text-sm">← All Scans</button>
        <button onclick="window.print()" class="btn-primary text-sm flex items-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/>
          </svg>
          Print / Save PDF
        </button>
      </div>
    </div>

    <!-- ══ PRINTABLE REPORT ══ -->
    <div id="progress-report" class="space-y-5">

      <!-- Report header -->
      <div class="card" style="background:linear-gradient(135deg,#051428,#0a1f3c);border-color:#1e3a5f;">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-400 to-mint-500
                        flex items-center justify-center text-white text-xl font-black flex-shrink-0">
              ${user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 class="text-xl font-bold text-white">${user.name}</h1>
              <p class="text-gray-400 text-sm">${user.email}</p>
              <p class="text-gray-500 text-xs mt-0.5">Generated: ${generated}</p>
            </div>
          </div>
          <div class="text-right">
            <div class="text-xs text-gray-500 uppercase tracking-wider mb-1">OralAI Progress Report</div>
            <div class="font-mono text-brand-400 text-xs">PR-${Date.now().toString().slice(-10)}</div>
          </div>
        </div>
      </div>

      <!-- Key metrics row -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        ${[
          ['Latest Score', latest.score,  scoreColor(latest.score),  ''],
          ['Avg Score',    avgScore,       scoreColor(avgScore),       ''],
          ['Best Score',   bestScore,      '#10b981',                  ''],
          ['Total Scans',  scans.length,   '#28a8ff',                  ''],
        ].map(([label, val, color, _]) => `
          <div class="card text-center py-4">
            <div class="text-3xl font-black tabular-nums" style="color:${color}">${val}</div>
            <div class="text-xs text-gray-500 mt-1.5 uppercase tracking-wide font-semibold">${label}</div>
          </div>`).join('')}
      </div>

      <!-- Trend summary banner -->
      <div class="card flex items-center gap-4 py-4">
        <div class="text-4xl font-black tabular-nums flex-shrink-0" style="color:${trendColor}">
          ${trendArrow}${Math.abs(trend)}
        </div>
        <div>
          <div class="font-semibold text-white">${trendLabel}</div>
          <div class="text-sm text-gray-400 mt-0.5">
            ${trend > 5  ? '✅ Significant improvement detected. Keep up your current oral hygiene routine.'
            : trend < -5 ? '⚠️ Score has declined. Review your hygiene habits and consider a dental consultation.'
            : trend === 0 ? '→ Score is stable. Continue monitoring regularly.'
            : trend > 0  ? '📈 Slight improvement. Keep up the good work.'
            : '📉 Slight decline. Consider reviewing your oral hygiene routine.'}
          </div>
        </div>
      </div>

      <!-- Score trend chart -->
      <div class="card">
        <h3 class="font-semibold text-white mb-3 flex items-center gap-2">
          📊 Score Trend — All ${scans.length} Scans
          <span class="text-xs text-gray-500 font-normal">(oldest → newest)</span>
        </h3>
        <div class="overflow-x-auto">
          <div style="min-width:320px">${trendSVG}</div>
        </div>
      </div>

      <!-- Scan-by-scan table -->
      <div class="card">
        <h3 class="font-semibold text-white mb-4">Scan History</h3>
        <div class="overflow-x-auto">
          <table class="data-table">
            <thead>
              <tr>
                <th>#</th><th>Date</th><th>Type</th><th>Score</th>
                <th>Confidence</th><th>Top Finding</th><th>Model</th>
              </tr>
            </thead>
            <tbody>
              ${sorted.map((s, i) => {
                const topF = (s.findings || []).map(f => typeof f === 'string' ? f : (f.condition || f.name || '')).filter(Boolean)[0] || '—';
                const c    = scoreColor(s.score);
                return `
                <tr>
                  <td class="text-gray-500">${i + 1}</td>
                  <td class="text-gray-300">${s.date}</td>
                  <td><span class="text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-300">${s.type}</span></td>
                  <td>
                    <div class="flex items-center gap-2">
                      <div class="sensor-bar w-12">
                        <div class="sensor-fill" style="width:${s.score}%;background:${c}"></div>
                      </div>
                      <span class="font-bold tabular-nums" style="color:${c}">${s.score}</span>
                    </div>
                  </td>
                  <td class="text-gray-300">${s.confidence || '—'}%</td>
                  <td class="text-gray-400 text-xs max-w-xs truncate">${topF}</td>
                  <td class="text-gray-500 text-xs font-mono">${s.model || AppState.settings._backendModelId || 'oralai-efficientnet-b0-v1'}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Top findings -->
      ${topFindings.length > 0 ? `
      <div class="card">
        <h3 class="font-semibold text-white mb-4">Most Frequent Findings</h3>
        <div class="space-y-2">
          ${topFindings.map(([name, count]) => {
            const pct = Math.round((count / scans.length) * 100);
            return `
            <div class="flex items-center gap-3">
              <span class="text-sm text-gray-200 w-48 truncate flex-shrink-0">${name}</span>
              <div class="sensor-bar flex-1">
                <div class="sensor-fill bg-brand-500" style="width:${Math.min(100, pct)}%"></div>
              </div>
              <span class="text-xs text-gray-400 flex-shrink-0 w-16 text-right">${count}× (${pct}%)</span>
            </div>`;
          }).join('')}
        </div>
      </div>` : ''}

      <!-- IoT sensor snapshot -->
      <div class="card">
        <h3 class="font-semibold text-white mb-4">Current IoT Sensor Readings</h3>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          ${sensorRows.map(r => `
            <div class="text-center p-4 rounded-xl bg-gray-900 border ${r.ok ? 'border-green-800/40' : 'border-red-800/40'}">
              <div class="text-2xl mb-1">${r.icon}</div>
              <div class="text-xl font-black tabular-nums ${r.ok ? 'text-green-400' : 'text-red-400'}">${r.val}</div>
              <div class="text-xs text-gray-500 mt-0.5">${r.name}</div>
              <div class="text-xs mt-1 ${r.ok ? 'text-green-600' : 'text-red-600'}">${r.ok ? '✓ Normal' : '⚠ Check'}</div>
              <div class="text-xs text-gray-700 mt-0.5">Range: ${r.normal}</div>
            </div>`).join('')}
        </div>
      </div>

      <!-- Recommendations summary -->
      <div class="card">
        <h3 class="font-semibold text-white mb-4">Consolidated Recommendations</h3>
        <div class="space-y-2">
          ${_buildProgressRecommendations(scans, sensorRows).map((r, i) => `
            <div class="flex items-start gap-3 p-3 rounded-lg bg-gray-900 border border-gray-800">
              <span class="w-5 h-5 rounded-full bg-brand-500/20 text-brand-400 text-xs
                           flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">${i+1}</span>
              <span class="text-sm text-gray-200">${r}</span>
            </div>`).join('')}
        </div>
      </div>

      <!-- Report footer -->
      <div class="card text-center py-5 space-y-1">
        <p class="text-xs text-gray-500 font-semibold">OralAI — Real-Time Oral Disease Detection System</p>
        <p class="text-xs text-gray-600">Bearys Institute of Technology · AI &amp; Data Science Department · Karnataka, India</p>
        <p class="text-xs text-gray-700 mt-2">⚠️ This report is AI-generated and for informational purposes only. It does not replace professional dental advice.</p>
      </div>

    </div><!-- end #progress-report -->
  </div>
  `;
}

// ── Build personalised recommendations from all scans + sensor state ──
function _buildProgressRecommendations(scans, sensorRows) {
  const recs = new Set();
  const allFindings = scans.flatMap(s =>
    (s.findings || []).map(f => (typeof f === 'string' ? f : (f.condition || f.name || '')).toLowerCase())
  );

  if (allFindings.some(f => f.includes('plaque') || f.includes('calculus')))
    recs.add('Schedule a professional dental cleaning to remove plaque and tartar buildup.');
  if (allFindings.some(f => f.includes('caries') || f.includes('cavity') || f.includes('enamel')))
    recs.add('Use fluoride toothpaste (1000–1450 ppm) and consider a fluoride varnish treatment.');
  if (allFindings.some(f => f.includes('gingivitis') || f.includes('gum') || f.includes('periodontal')))
    recs.add('Improve gum health by flossing daily and using antiseptic mouthwash twice daily.');
  if (allFindings.some(f => f.includes('lesion') || f.includes('ulcer')))
    recs.add('Monitor any oral lesions or ulcers. Consult a dentist if they persist beyond 2 weeks.');
  if (!sensorRows.find(r => r.name === 'Saliva pH')?.ok)
    recs.add('Your saliva pH is below normal. Reduce acidic food/drink intake and rinse with water after meals.');
  if (!sensorRows.find(r => r.name === 'Bacterial')?.ok)
    recs.add('Bacterial activity is elevated. Use a chlorhexidine mouthwash for 2 weeks.');
  if (!sensorRows.find(r => r.name === 'Moisture')?.ok)
    recs.add('Low oral moisture detected. Drink more water and chew sugar-free gum to stimulate saliva.');

  // Always include
  recs.add('Brush for 2 minutes twice daily with a soft-bristled toothbrush.');
  recs.add('Book a professional dental check-up every 6 months.');
  recs.add('Upload your next AI scan in 30 days to track your progress.');

  return [...recs].slice(0, 8);
}
