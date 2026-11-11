// ── Analytics Page ──
function pageAnalytics() {

  // ── LIVE data from AppState ──
  const allScans  = AppState.scans;
  const scanCount = allScans.length;

  // Score trend — oldest first
  const trendScores = allScans.map(s => s.score).reverse();
  const trendLabels = allScans.map(s => s.date.replace(/,.*/, '')).reverse();

  // Avg score
  const avgScore = scanCount
    ? (allScans.reduce((a,s) => a + s.score, 0) / scanCount).toFixed(1)
    : 0;

  // Avg confidence
  const avgConf = scanCount
    ? (allScans.reduce((a,s) => a + (s.confidence||0), 0) / scanCount).toFixed(1)
    : 0;

  // Most common finding
  const allFindings = allScans.flatMap(s => (s.findings||[]).map(f =>
    typeof f === 'string' ? f : (f.condition || f.name || '')));
  const findingFreq = {};
  allFindings.forEach(f => { findingFreq[f] = (findingFreq[f]||0) + 1; });
  const topFinding = Object.entries(findingFreq).sort((a,b)=>b[1]-a[1])[0]?.[0] || '—';

  // ── CNN training metrics (from paper) ──
  const metrics = [
    { name:'Accuracy',    value:95.2, formula:'(TP+TN)/(TP+TN+FP+FN)', color:'#28a8ff' },
    { name:'Precision',   value:93.8, formula:'TP/(TP+FP)',              color:'#10b981' },
    { name:'Recall',      value:94.5, formula:'TP/(TP+FN)',              color:'#f59e0b' },
    { name:'F1-Score',    value:88.0, formula:'2×(P×R)/(P+R)',           color:'#a78bfa' },
    { name:'Specificity', value:96.1, formula:'TN/(TN+FP)',              color:'#f472b6' },
    { name:'Sensitivity', value:94.5, formula:'TP/(TP+FN)',              color:'#34d399' },
  ];

  // ── Training curve data ──
  const epochAcc = [72,76,80,84,87,89,91,93,94,95,95.2];
  const epochF1  = [65,70,74,78,81,84,86,87,88,88,88];

  // ── Build SVG helpers ──
  const W=400, H=110, PL=34, PR=10, PT=8, PB=22;
  const iW = W-PL-PR, iH = H-PT-PB;

  function svgLine(data, yMin, yMax, color) {
    const pts = data.map((v,i) => {
      const x = (PL + (i/(data.length-1)) * iW).toFixed(1);
      const y = (PT + iH - ((v-yMin)/(yMax-yMin)) * iH).toFixed(1);
      return `${x},${y}`;
    }).join(' ');
    return `<polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2.5"
              stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  function svgDots(data, yMin, yMax, color) {
    return data.map((v,i) => {
      const x = (PL + (i/(data.length-1)) * iW).toFixed(1);
      const y = (PT + iH - ((v-yMin)/(yMax-yMin)) * iH).toFixed(1);
      return `<circle cx="${x}" cy="${y}" r="3" fill="${color}"/>`;
    }).join('');
  }
  function svgYGrid(vals, yMin, yMax) {
    return vals.map(v => {
      const y = (PT + iH - ((v-yMin)/(yMax-yMin)) * iH).toFixed(1);
      return `<line x1="${PL}" y1="${y}" x2="${W-PR}" y2="${y}" stroke="#1e2a3a" stroke-width="1"/>
              <text x="${PL-4}" y="${+y+3}" fill="#4b5563" font-size="8" text-anchor="end">${v}</text>`;
    }).join('');
  }
  function svgXLabels(labels, total) {
    return labels.map((l,i) => {
      const x = (PL + (i/(total-1)) * iW).toFixed(1);
      return `<text x="${x}" y="${H-5}" fill="#4b5563" font-size="7.5" text-anchor="middle">${l}</text>`;
    }).join('');
  }

  // ── Training chart ──
  const trainingChart = `
    <svg viewBox="0 0 ${W} ${H}" class="w-full" style="height:130px;">
      ${svgYGrid([60,70,80,90,100], 60,100)}
      <line x1="${PL}" y1="${PT}" x2="${PL}" y2="${H-PB}" stroke="#334155" stroke-width="1"/>
      <line x1="${PL}" y1="${H-PB}" x2="${W-PR}" y2="${H-PB}" stroke="#334155" stroke-width="1"/>
      ${svgXLabels(epochAcc.map((_,i)=>(i+1)*3), epochAcc.length)}
      ${svgLine(epochAcc, 60,100,'#28a8ff')}${svgDots(epochAcc, 60,100,'#28a8ff')}
      ${svgLine(epochF1,  60,100,'#a78bfa')}${svgDots(epochF1,  60,100,'#a78bfa')}
      <text x="${W-PR-18}" y="${(PT + iH - ((95.2-60)/40)*iH - 5).toFixed(1)}"
        fill="#28a8ff" font-size="8" font-weight="600">95.2%</text>
      <text x="${W-PR-18}" y="${(PT + iH - ((88-60)/40)*iH + 11).toFixed(1)}"
        fill="#a78bfa" font-size="8" font-weight="600">88%</text>
    </svg>`;

  // ── Personal score trend chart ──
  let personalChart = '<p class="text-gray-500 text-sm py-4">Upload at least 2 scans to see your trend.</p>';
  if (trendScores.length >= 2) {
    const sMin = Math.max(0,   Math.min(...trendScores) - 10);
    const sMax = Math.min(100, Math.max(...trendScores) + 10);
    const tw=300, th=90, tpl=30, tpr=8, tpt=8, tpb=20;
    const tiW=tw-tpl-tpr, tiH=th-tpt-tpb;
    const spts = trendScores.map((v,i) => {
      const x=(tpl+(i/(trendScores.length-1))*tiW).toFixed(1);
      const y=(tpt+tiH-((v-sMin)/(sMax-sMin||1))*tiH).toFixed(1);
      return `${x},${y}`;
    }).join(' ');
    const sdots = trendScores.map((v,i) => {
      const x=(tpl+(i/(trendScores.length-1))*tiW).toFixed(1);
      const y=(tpt+tiH-((v-sMin)/(sMax-sMin||1))*tiH).toFixed(1);
      const c=v>=80?'#10b981':v>=60?'#f59e0b':'#ef4444';
      return `<circle cx="${x}" cy="${y}" r="4" fill="${c}"/>
              <text x="${x}" y="${+y-6}" fill="#e2e8f0" font-size="8" text-anchor="middle" font-weight="600">${v}</text>`;
    }).join('');
    const gridVals=[Math.ceil(sMin/10)*10, 60,70,80,90,100].filter(v=>v>=sMin&&v<=sMax);
    const yGridS = gridVals.map(v => {
      const y=(tpt+tiH-((v-sMin)/(sMax-sMin||1))*tiH).toFixed(1);
      return `<line x1="${tpl}" y1="${y}" x2="${tw-tpr}" y2="${y}" stroke="#1e2a3a" stroke-width="1"/>
              <text x="${tpl-3}" y="${+y+3}" fill="#4b5563" font-size="7" text-anchor="end">${v}</text>`;
    }).join('');
    const xLabsS = trendLabels.map((l,i) => {
      const x=(tpl+(i/(trendLabels.length-1))*tiW).toFixed(1);
      return `<text x="${x}" y="${th-4}" fill="#4b5563" font-size="6.5" text-anchor="middle">${l}</text>`;
    }).join('');
    personalChart = `
      <svg viewBox="0 0 ${tw} ${th}" class="w-full" style="height:110px;">
        ${yGridS}
        <line x1="${tpl}" y1="${tpt}" x2="${tpl}" y2="${th-tpb}" stroke="#334155"/>
        <line x1="${tpl}" y1="${th-tpb}" x2="${tw-tpr}" y2="${th-tpb}" stroke="#334155"/>
        ${xLabsS}
        <polyline points="${spts}" fill="none" stroke="#28a8ff" stroke-width="2.5" stroke-linecap="round"/>
        ${sdots}
      </svg>`;
  }

  // ── Disease distribution donut ──
  // Count from real scans first; fall back to paper data
  const diseaseMap = {
    'Dental Caries':28,'Gingivitis':22,'Plaque Accumulation':20,
    'Enamel Demineralization':16,'Periodontal Disease':10,'Oral Lesions':4,
  };
  const diseaseColors = {
    'Dental Caries':'#28a8ff','Gingivitis':'#10b981','Plaque Accumulation':'#f59e0b',
    'Enamel Demineralization':'#a78bfa','Periodontal Disease':'#f472b6','Oral Lesions':'#ef4444',
  };
  // Override with real data if enough scans
  if (allFindings.length >= 3) {
    const total = allFindings.length;
    Object.keys(diseaseMap).forEach(k => { diseaseMap[k] = 0; });
    allFindings.forEach(f => {
      const key = Object.keys(diseaseMap).find(k => f.toLowerCase().includes(k.toLowerCase().split(' ')[0]));
      if (key) diseaseMap[key]++;
    });
    const sum = Object.values(diseaseMap).reduce((a,b)=>a+b,0) || 1;
    Object.keys(diseaseMap).forEach(k => { diseaseMap[k] = Math.round(diseaseMap[k]/sum*100); });
  }
  const diseases = Object.entries(diseaseMap).map(([name,pct])=>({name,pct,color:diseaseColors[name]||'#64748b'}));

  let cumAngle=-90;
  const CX=80,CY=80,R=60,r=36;
  const arcs = diseases.map(d => {
    if (!d.pct) return '';
    const start=cumAngle, angle=(d.pct/100)*360;
    cumAngle += angle;
    const sR=start*Math.PI/180, eR=(start+angle-0.5)*Math.PI/180;
    const x1=(CX+R*Math.cos(sR)).toFixed(2), y1=(CY+R*Math.sin(sR)).toFixed(2);
    const x2=(CX+R*Math.cos(eR)).toFixed(2), y2=(CY+R*Math.sin(eR)).toFixed(2);
    const ix1=(CX+r*Math.cos(eR)).toFixed(2),iy1=(CY+r*Math.sin(eR)).toFixed(2);
    const ix2=(CX+r*Math.cos(sR)).toFixed(2),iy2=(CY+r*Math.sin(sR)).toFixed(2);
    const lg=angle>180?1:0;
    return `<path d="M${x1},${y1} A${R},${R} 0 ${lg},1 ${x2},${y2} L${ix1},${iy1} A${r},${r} 0 ${lg},0 ${ix2},${iy2} Z"
              fill="${d.color}" opacity="0.9"/>`;
  }).join('');

  return `
  <div class="max-w-5xl mx-auto space-y-6">

    <div>
      <h2 class="text-2xl font-bold text-white">Analytics &amp; Performance</h2>
      <p class="text-gray-400 mt-1">AI model metrics, detection accuracy, and your oral health trends</p>
    </div>

    <!-- Live summary from user's own scans -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
      ${[
        ['📊', scanCount,   'Total Scans',    'text-white'],
        ['📈', avgScore,    'Avg Score',       avgScore>=80?'text-green-400':avgScore>=60?'text-yellow-400':'text-red-400'],
        ['🎯', avgConf+'%', 'Avg Confidence', 'text-brand-400'],
        ['🔍', topFinding.length>20?topFinding.slice(0,18)+'…':topFinding, 'Top Finding', 'text-purple-400'],
      ].map(([icon,val,label,clr])=>`
        <div class="card-sm text-center">
          <div class="text-xl">${icon}</div>
          <div class="text-base font-black mt-1 ${clr} leading-tight">${val}</div>
          <div class="text-xs text-gray-500 mt-0.5">${label}</div>
        </div>`).join('')}
    </div>

    <!-- CNN model performance metrics -->
    <div class="card">
      <h3 class="font-semibold text-white mb-4 flex items-center gap-2">
        <svg class="w-5 h-5 text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
        </svg>
        CNN Model Performance (from research paper)
      </h3>
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
        ${metrics.map(m => `
          <div class="card-sm space-y-2">
            <div class="flex items-start justify-between">
              <span class="text-sm font-semibold text-gray-300">${m.name}</span>
              <span class="text-lg font-black tabular-nums" style="color:${m.color}">${m.value}%</span>
            </div>
            <div class="sensor-bar">
              <div class="sensor-fill" style="width:${m.value}%;background:${m.color}"></div>
            </div>
            <div class="text-xs font-mono text-gray-600">${m.formula}</div>
          </div>`).join('')}
      </div>
    </div>

    <!-- Training chart -->
    <div class="card">
      <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h3 class="font-semibold text-white">Analytics for Oral Disease Detection System</h3>
        <div class="flex gap-4 text-xs flex-wrap">
          <span class="flex items-center gap-1.5">
            <span class="w-4 h-1 rounded bg-brand-400 inline-block"></span>Accuracy
          </span>
          <span class="flex items-center gap-1.5">
            <span class="w-4 h-1 rounded bg-purple-400 inline-block"></span>F1-Score
          </span>
        </div>
      </div>
      <div class="chart-container">${trainingChart}</div>
      <p class="text-xs text-gray-500 mt-2 text-center">
        Accuracy / F1-Score (%) vs. Number of Epochs — Improved Performance with More Training
      </p>
    </div>

    <!-- Personal trend + disease distribution -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">

      <!-- Personal health score trend — LIVE from scans -->
      <div class="card">
        <h3 class="font-semibold text-white mb-3">My Health Score Trend</h3>
        ${personalChart}
        ${trendScores.length >= 2 ? `
          <div class="flex justify-between text-xs text-gray-600 mt-2 px-1">
            <span>Oldest</span>
            <span class="${+avgScore>=80?'text-green-400':+avgScore>=60?'text-yellow-400':'text-red-400'} font-semibold">
              Avg: ${avgScore}
            </span>
            <span>Latest</span>
          </div>` : ''}
      </div>

      <!-- Disease distribution donut — live if enough data -->
      <div class="card">
        <h3 class="font-semibold text-white mb-3">
          Disease Distribution
          ${allFindings.length >= 3 ? '<span class="text-xs text-gray-500 font-normal ml-1">(from your scans)</span>'
                                    : '<span class="text-xs text-gray-500 font-normal ml-1">(reference data)</span>'}
        </h3>
        <div class="flex items-center gap-4">
          <div class="flex-shrink-0">
            <svg viewBox="0 0 160 160" style="width:130px;height:130px;">
              ${arcs}
              <text x="${CX}" y="${CY-5}" fill="#f1f5f9" font-size="13" font-weight="700"
                text-anchor="middle">${allFindings.length || 100}</text>
              <text x="${CX}" y="${CY+9}" fill="#64748b" font-size="8"
                text-anchor="middle">${allFindings.length>=3?'detected':'reference'}</text>
            </svg>
          </div>
          <div class="space-y-1.5 flex-1 text-xs">
            ${diseases.filter(d=>d.pct>0).map(d=>`
              <div class="flex items-center justify-between gap-2">
                <div class="flex items-center gap-2 min-w-0">
                  <span class="w-2.5 h-2.5 rounded-full flex-shrink-0" style="background:${d.color}"></span>
                  <span class="text-gray-300 truncate">${d.name}</span>
                </div>
                <span class="font-semibold text-white flex-shrink-0">${d.pct}%</span>
              </div>`).join('')}
          </div>
        </div>
      </div>
    </div>

    <!-- Per-class model evaluation table -->
    <div class="card">
      <h3 class="font-semibold text-white mb-4">Per-Class Model Evaluation</h3>
      <div class="overflow-x-auto">
        <table class="data-table">
          <thead>
            <tr>
              <th>Disease Class</th><th>Accuracy</th><th>Precision</th>
              <th>Recall</th><th>F1-Score</th><th>Samples</th>
            </tr>
          </thead>
          <tbody>
            ${[
              ['Dental Caries',           97.1,96.8,97.3,97.0,145],
              ['Gingivitis',              94.3,93.5,94.8,94.1,112],
              ['Plaque Accumulation',     95.8,95.2,96.1,95.6,103],
              ['Enamel Demineralization', 93.4,92.8,93.9,93.3, 84],
              ['Periodontal Disease',     96.2,95.7,96.5,96.1, 51],
              ['Oral Lesions',            91.8,90.4,92.3,91.3, 22],
            ].map(([name,acc,prec,rec,f1,n]) => `
              <tr>
                <td class="font-medium text-gray-200">${name}</td>
                <td><span class="text-green-400 font-semibold">${acc}%</span></td>
                <td class="text-gray-300">${prec}%</td>
                <td class="text-gray-300">${rec}%</td>
                <td class="text-gray-300">${f1}%</td>
                <td class="text-gray-500">${n}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>

  </div>
  `;
}
