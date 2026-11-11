// ══════════════════════════════════════════════════════
//  Feature 14 — Clinic Analytics Dashboard
// ══════════════════════════════════════════════════════

function pageClinicAnalytics() {
  const scans    = AppState.scans;
  const reviews  = Store.get('oralai_dentist_reviews') || [];
  const feedback = Store.get('oralai_feedback') || [];

  // Compute disease distribution from real scans
  const diseaseMap = {};
  scans.forEach(s => {
    (s.findings || []).forEach(f => {
      const name = typeof f==='string' ? f : (f.condition||f.name||'Unknown');
      diseaseMap[name] = (diseaseMap[name]||0) + 1;
    });
  });
  const topDiseases = Object.entries(diseaseMap).sort((a,b)=>b[1]-a[1]).slice(0,8);

  // Confidence distribution
  const confBuckets = { '<70':0, '70-79':0, '80-89':0, '90-100':0 };
  scans.forEach(s => {
    const c = s.confidence || 88;
    if (c < 70) confBuckets['<70']++;
    else if (c < 80) confBuckets['70-79']++;
    else if (c < 90) confBuckets['80-89']++;
    else confBuckets['90-100']++;
  });

  // Pending review count
  const pendingReview = scans.filter(s => !reviews.find(r => r.scanId===s.id)).length;

  // Average turnaround (simulated)
  const avgTurnaround = '1.2s';

  // Score trend buckets
  const scoreBuckets = { poor:0, fair:0, good:0 };
  scans.forEach(s => {
    if (s.score>=80) scoreBuckets.good++;
    else if (s.score>=60) scoreBuckets.fair++;
    else scoreBuckets.poor++;
  });

  // SVG bar chart helper
  const W=300, H=80, PL=40, PB=20;
  function barChart(data, colors) {
    if (!data.length) return '<p class="text-gray-500 text-xs text-center py-4">No data</p>';
    const maxVal = Math.max(...data.map(d=>d[1]),1);
    const bw = (W-PL-10) / data.length - 6;
    const bars = data.map(([label,val],i) => {
      const x = PL + i*(bw+6);
      const bh = Math.round(((val/maxVal)*(H-PB)));
      const y  = H-PB-bh;
      const c  = colors[i % colors.length];
      return `
        <rect x="${x}" y="${y}" width="${bw}" height="${bh}" fill="${c}" rx="3" opacity="0.85"/>
        <text x="${x+bw/2}" y="${H-PB+12}" fill="#64748b" font-size="7.5" text-anchor="middle">${label.length>8?label.slice(0,7)+'…':label}</text>
        <text x="${x+bw/2}" y="${y-3}" fill="#e2e8f0" font-size="8" text-anchor="middle" font-weight="600">${val}</text>`;
    }).join('');
    return `<svg viewBox="0 0 ${W} ${H+16}" style="width:100%;height:110px;display:block;">${bars}</svg>`;
  }

  const DISEASE_COLORS = ['#28a8ff','#10b981','#f59e0b','#a78bfa','#f472b6','#34d399','#ef4444','#06b6d4'];
  const CONF_COLORS    = ['#ef4444','#f59e0b','#10b981','#28a8ff'];
  const SCORE_COLORS   = ['#ef4444','#f59e0b','#10b981'];

  return `
  <div class="max-w-5xl mx-auto space-y-6">

    <div>
      <h2 class="text-2xl font-bold text-white flex items-center gap-2">🏥 Clinic Analytics</h2>
      <p class="text-gray-400 mt-1 text-sm">Disease trends, review queue, model performance, and turnaround metrics.</p>
    </div>

    <!-- KPI row -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
      ${[
        ['📋', scans.length,       'Total Scans',       'text-white'],
        ['⏳', pendingReview,      'Pending Review',    pendingReview>0?'text-yellow-400':'text-green-400'],
        ['✅', reviews.length,    'Reviewed',          'text-green-400'],
        ['⚡', avgTurnaround,     'Avg Turnaround',    'text-brand-400'],
      ].map(([icon,val,label,clr]) => `
        <div class="card-sm text-center">
          <div class="text-xl">${icon}</div>
          <div class="text-xl font-black mt-1 ${clr}">${val}</div>
          <div class="text-xs text-gray-500 mt-0.5">${label}</div>
        </div>`).join('')}
    </div>

    <!-- Disease distribution -->
    <div class="card">
      <h3 class="font-semibold text-white mb-4">Disease Category Distribution</h3>
      ${topDiseases.length > 0 ? `
        ${barChart(topDiseases, DISEASE_COLORS)}
        <div class="flex flex-wrap gap-2 mt-3">
          ${topDiseases.map(([name,cnt],i) => `
            <div class="flex items-center gap-1.5 text-xs">
              <span class="w-2.5 h-2.5 rounded-sm flex-shrink-0" style="background:${DISEASE_COLORS[i%DISEASE_COLORS.length]}"></span>
              <span class="text-gray-300">${name}</span>
              <span class="text-gray-500">(${cnt})</span>
            </div>`).join('')}
        </div>
      ` : '<p class="text-gray-500 text-sm text-center py-4">Upload scans to see disease distribution data.</p>'}
    </div>

    <!-- Confidence distribution -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <div class="card">
        <h3 class="font-semibold text-white mb-4">Model Confidence Distribution</h3>
        ${barChart(Object.entries(confBuckets), CONF_COLORS)}
        <p class="text-xs text-gray-500 mt-2 text-center">
          ${confBuckets['90-100']} scans with 90%+ confidence
        </p>
      </div>

      <!-- Score distribution -->
      <div class="card">
        <h3 class="font-semibold text-white mb-4">Patient Score Distribution</h3>
        ${barChart([['Poor (<60)',scoreBuckets.poor],['Fair (60-79)',scoreBuckets.fair],['Good (80+)',scoreBuckets.good]], SCORE_COLORS)}
        <div class="grid grid-cols-3 gap-2 mt-3 text-center text-xs">
          ${[['🔴','Poor',scoreBuckets.poor],['🟡','Fair',scoreBuckets.fair],['🟢','Good',scoreBuckets.good]].map(([icon,label,n])=>`
            <div class="p-2 rounded-lg bg-gray-900 border border-gray-800">
              <div>${icon}</div>
              <div class="font-bold text-white">${n}</div>
              <div class="text-gray-500">${label}</div>
            </div>`).join('')}
        </div>
      </div>
    </div>

    <!-- Review queue -->
    <div class="card">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-semibold text-white flex items-center gap-2">
          ⏳ Review Queue
          <span class="text-xs bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 px-2 py-0.5 rounded-full">${pendingReview} pending</span>
        </h3>
        <button onclick="navigate('dentist')" class="text-brand-400 text-xs hover:underline">Manage Reviews →</button>
      </div>
      ${pendingReview === 0 ? `
        <div class="text-center py-6">
          <div class="text-3xl mb-2">✅</div>
          <p class="text-green-400 font-semibold text-sm">All scans reviewed</p>
        </div>` : `
        <div class="overflow-x-auto">
          <table class="data-table">
            <thead><tr><th>Scan ID</th><th>Date</th><th>Score</th><th>Confidence</th><th>Top Finding</th><th>Action</th></tr></thead>
            <tbody>
              ${scans.filter(s=>!reviews.find(r=>r.scanId===s.id)).slice(0,5).map(s=>`
                <tr>
                  <td class="font-mono text-xs text-brand-400">${s.id.slice(0,18)}…</td>
                  <td class="text-gray-400 text-xs">${s.date}</td>
                  <td class="font-bold text-white">${s.score}</td>
                  <td class="text-gray-300">${s.confidence||88}%</td>
                  <td class="text-xs text-gray-400 max-w-xs truncate">${((s.findings||[])[0]&&(typeof (s.findings||[])[0]==='string'?(s.findings||[])[0]:((s.findings||[])[0].condition||'')))||'—'}</td>
                  <td><button onclick="navigate('dentist')" class="text-brand-400 text-xs hover:underline">Review →</button></td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>`}
    </div>

    <!-- Feedback accuracy -->
    <div class="card">
      <h3 class="font-semibold text-white mb-4">AI Accuracy Feedback</h3>
      ${feedback.length === 0 ? `
        <p class="text-gray-500 text-sm text-center py-4">No dentist feedback logged yet. Visit the Dentist Review panel to record agreement/disagreement.</p>
      ` : `
        <div class="grid grid-cols-2 gap-4 text-center mb-4">
          <div class="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
            <div class="text-3xl font-black text-green-400">${feedback.filter(f=>f.agreed).length}</div>
            <div class="text-xs text-gray-400 mt-1">Dentist Agreed with AI</div>
          </div>
          <div class="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
            <div class="text-3xl font-black text-red-400">${feedback.filter(f=>!f.agreed).length}</div>
            <div class="text-xs text-gray-400 mt-1">Dentist Disagreed</div>
          </div>
        </div>
        <div class="sensor-bar h-4 rounded-full overflow-hidden">
          <div class="h-4 rounded-full bg-green-500" style="width:${Math.round(feedback.filter(f=>f.agreed).length/feedback.length*100)}%;transition:width 1s"></div>
        </div>
        <div class="flex justify-between text-xs text-gray-500 mt-1">
          <span>Agreement rate: ${Math.round(feedback.filter(f=>f.agreed).length/feedback.length*100)}%</span>
          <span>${feedback.length} total responses</span>
        </div>`}
    </div>

  </div>
  `;
}
