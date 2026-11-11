// ── Scan Comparison Page ──
function pageCompare(params) {
  const scans = AppState.scans;
  if (scans.length < 2) {
    return `
    <div class="max-w-lg mx-auto text-center py-20 space-y-4">
      <div class="text-6xl">⚖️</div>
      <h2 class="text-2xl font-bold text-white">Scan Comparison</h2>
      <p class="text-gray-400">You need at least 2 scans to compare. Upload another scan first.</p>
      <button onclick="navigate('upload')" class="btn-primary">Upload Scan</button>
    </div>`;
  }

  // Default: compare newest two, or use params
  const idA = params.a || scans[0]?.id;
  const idB = params.b || scans[1]?.id;
  const scanA = scans.find(s => s.id === idA) || scans[0];
  const scanB = scans.find(s => s.id === idB) || scans[1];

  function scoreColor(s) { return s >= 80 ? '#10b981' : s >= 60 ? '#f59e0b' : '#ef4444'; }
  function ringHtml(scan, size=120) {
    const circ = 339.3, sc = scoreColor(scan.score);
    const off  = circ - (scan.score / 100) * circ;
    return `
      <div class="ring-container mx-auto" style="width:${size}px;height:${size}px;">
        <svg width="${size}" height="${size}" viewBox="0 0 160 160">
          <circle class="ring-bg" cx="80" cy="80" r="54"/>
          <circle class="ring-fill" cx="80" cy="80" r="54"
            stroke="${sc}" stroke-dasharray="${circ}" stroke-dashoffset="${off}"
            transform="rotate(-90 80 80)"/>
        </svg>
        <div class="ring-text">
          <div class="font-black text-white" style="font-size:${size>100?'1.75rem':'1.1rem'}">${scan.score}</div>
          <div class="text-xs" style="color:${sc}">${scan.score>=80?'Good':scan.score>=60?'Fair':'Poor'}</div>
        </div>
      </div>`;
  }

  function metaRow(scan) {
    return [
      ['Date',        scan.date],
      ['Type',        scan.type],
      ['Device',      scan.device],
      ['Model',       scan.model || AppState.settings._backendModelId || 'oralai-efficientnet-b0-v1'],
      ['Confidence',  scan.confidence + '%'],
      ['Attention',   scan.attentionAreas || (scan.findings||[]).length],
    ].map(([k,v]) => `
      <div class="flex justify-between py-1.5 border-b border-gray-900 last:border-0 text-xs">
        <span class="text-gray-500">${k}</span>
        <span class="text-gray-200 font-medium">${v}</span>
      </div>`).join('');
  }

  function findingsHtml(scan) {
    const fs = (scan.findings||[]).map(f => typeof f === 'string' ? f : (f.condition||f.name||'Finding'));
    if (!fs.length) return `<div class="text-green-400 text-sm text-center py-3">✅ All Clear</div>`;
    return fs.map(f => `
      <div class="text-xs px-2.5 py-1.5 rounded-lg bg-gray-900 border border-gray-800 text-gray-300">${f}</div>
    `).join('');
  }

  // Delta indicator
  const delta   = scanA.score - scanB.score;
  const deltaAbs = Math.abs(delta);
  const deltaColor = delta > 0 ? 'text-green-400' : delta < 0 ? 'text-red-400' : 'text-gray-400';
  const deltaIcon  = delta > 0 ? '↑' : delta < 0 ? '↓' : '→';
  const deltaMsg   = delta > 0
    ? `Score improved by ${deltaAbs} points from scan B to scan A`
    : delta < 0
    ? `Score declined by ${deltaAbs} points from scan B to scan A`
    : 'Scores are identical';

  // Sensor comparison
  const sA = scanA.sensorSnapshot, sB = scanB.sensorSnapshot;

  return `
  <div class="max-w-5xl mx-auto space-y-5">

    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h2 class="text-2xl font-bold text-white flex items-center gap-2">⚖️ Scan Comparison</h2>
        <p class="text-gray-400 mt-1">Side-by-side analysis of two scan results</p>
      </div>
      <div class="flex gap-2">
        <button onclick="navigate('scans')" class="btn-secondary text-sm">← All Scans</button>
        <button onclick="navigate('analytics')" class="btn-secondary text-sm">View Analytics</button>
      </div>
    </div>

    <!-- Scan selectors -->
    <div class="card">
      <h3 class="font-semibold text-white mb-3 text-sm">Select Scans to Compare</h3>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label class="form-label">Scan A</label>
          <select class="form-input text-sm" onchange="navigate('compare',{a:this.value,b:'${scanB.id}'})">
            ${scans.map(s => `
              <option value="${s.id}" ${s.id===scanA.id?'selected':''}>
                ${s.id.slice(0,20)}… — ${s.date} (${s.score})
              </option>`).join('')}
          </select>
        </div>
        <div>
          <label class="form-label">Scan B</label>
          <select class="form-input text-sm" onchange="navigate('compare',{a:'${scanA.id}',b:this.value})">
            ${scans.map(s => `
              <option value="${s.id}" ${s.id===scanB.id?'selected':''}>
                ${s.id.slice(0,20)}… — ${s.date} (${s.score})
              </option>`).join('')}
          </select>
        </div>
      </div>
    </div>

    <!-- Delta banner -->
    <div class="card flex items-center gap-4 py-4" style="background:linear-gradient(135deg,#051428,#0a1f3c);border-color:#1e3a5f;">
      <div class="text-4xl font-black ${deltaColor} tabular-nums flex-shrink-0">
        ${deltaIcon}${deltaAbs}
      </div>
      <div>
        <div class="font-semibold text-white">Score Delta</div>
        <div class="text-sm text-gray-400 mt-0.5">${deltaMsg}</div>
      </div>
      <div class="ml-auto flex gap-6 text-center flex-shrink-0 hidden sm:flex">
        <div>
          <div class="text-xs text-gray-500 mb-1">Scan A</div>
          <div class="text-2xl font-black tabular-nums" style="color:${scoreColor(scanA.score)}">${scanA.score}</div>
        </div>
        <div class="text-gray-700 flex items-center">vs</div>
        <div>
          <div class="text-xs text-gray-500 mb-1">Scan B</div>
          <div class="text-2xl font-black tabular-nums" style="color:${scoreColor(scanB.score)}">${scanB.score}</div>
        </div>
      </div>
    </div>

    <!-- Side-by-side columns -->
    <div class="flex gap-0 sm:gap-4 overflow-x-auto">
      <!-- Scan A -->
      <div class="compare-col min-w-[280px]">
        <div class="card space-y-4">
          <!-- Label -->
          <div class="flex items-center gap-2">
            <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-brand-500/20 text-brand-300 border border-brand-500/30">SCAN A</span>
            <span class="text-xs text-gray-500 font-mono truncate">${scanA.id}</span>
          </div>

          <!-- Score ring -->
          ${ringHtml(scanA, 120)}

          <!-- Image -->
          ${scanA.imageDataUrl ? `
            <img src="${scanA.imageDataUrl}" alt="Scan A"
              class="w-full h-32 object-cover rounded-xl border border-gray-700"/>
          ` : `
            <div class="h-24 rounded-xl bg-gray-900 border border-gray-800 flex items-center justify-center">
              <span class="text-gray-600 text-xs">No image</span>
            </div>
          `}

          <!-- Meta -->
          <div>${metaRow(scanA)}</div>

          <!-- Findings -->
          <div>
            <div class="text-xs text-gray-500 uppercase tracking-wider mb-2">Findings</div>
            <div class="space-y-1.5">${findingsHtml(scanA)}</div>
          </div>

          <button onclick="navigate('report',{id:'${scanA.id}'})"
            class="btn-primary w-full justify-center text-xs py-2">
            View Full Report →
          </button>
        </div>
      </div>

      <!-- Divider -->
      <div class="compare-divider hidden sm:block"></div>

      <!-- Scan B -->
      <div class="compare-col min-w-[280px]">
        <div class="card space-y-4">
          <div class="flex items-center gap-2">
            <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">SCAN B</span>
            <span class="text-xs text-gray-500 font-mono truncate">${scanB.id}</span>
          </div>

          ${ringHtml(scanB, 120)}

          ${scanB.imageDataUrl ? `
            <img src="${scanB.imageDataUrl}" alt="Scan B"
              class="w-full h-32 object-cover rounded-xl border border-gray-700"/>
          ` : `
            <div class="h-24 rounded-xl bg-gray-900 border border-gray-800 flex items-center justify-center">
              <span class="text-gray-600 text-xs">No image</span>
            </div>
          `}

          <div>${metaRow(scanB)}</div>

          <div>
            <div class="text-xs text-gray-500 uppercase tracking-wider mb-2">Findings</div>
            <div class="space-y-1.5">${findingsHtml(scanB)}</div>
          </div>

          <button onclick="navigate('report',{id:'${scanB.id}'})"
            class="btn-primary w-full justify-center text-xs py-2">
            View Full Report →
          </button>
        </div>
      </div>
    </div>

    <!-- Sensor comparison (if both have snapshots) -->
    ${sA && sB ? `
    <div class="card">
      <h3 class="font-semibold text-white mb-4">IoT Sensor Comparison</h3>
      <div class="overflow-x-auto">
        <table class="data-table">
          <thead>
            <tr>
              <th>Sensor</th>
              <th>Scan A <span class="text-brand-400">(${scanA.date})</span></th>
              <th>Scan B <span class="text-purple-400">(${scanB.date})</span></th>
              <th>Change</th>
              <th>Normal Range</th>
            </tr>
          </thead>
          <tbody>
            ${[
              ['🧪 Saliva pH',    sA.ph,          sB.ph,          '', [6.5,7.5],  ''],
              ['🌡️ Temperature', sA.temperature, sB.temperature, '', [36.1,37.2],'°C'],
              ['🦠 Bacterial',   sA.bacterial,   sB.bacterial,   '', [0,50],     '%'],
              ['💧 Moisture',    sA.moisture,    sB.moisture,    '', [60,100],   '%'],
            ].map(([label, vA, vB, _x, normal, unit]) => {
              const diff   = (vA - vB).toFixed(1);
              const diffAbs = Math.abs(diff);
              const better = label.includes('pH') || label.includes('Moisture')
                ? diff > 0 : diff < 0;
              const dColor = diff == 0 ? 'text-gray-400'
                           : better   ? 'text-green-400' : 'text-red-400';
              const dArrow = diff > 0 ? '↑' : diff < 0 ? '↓' : '→';
              const okA = vA >= normal[0] && vA <= normal[1];
              const okB = vB >= normal[0] && vB <= normal[1];
              return `
              <tr>
                <td>${label}</td>
                <td class="${okA?'text-green-400':'text-red-400'} font-semibold">${vA}${unit}</td>
                <td class="${okB?'text-green-400':'text-red-400'} font-semibold">${vB}${unit}</td>
                <td class="${dColor} font-semibold">${dArrow} ${diffAbs}${unit}</td>
                <td class="text-gray-500">${normal[0]}–${normal[1]}${unit}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>` : ''}

    <!-- AI Summary -->
    <div class="card" style="background:linear-gradient(135deg,#081a0f,#0a1f0f);border-color:#166534;">
      <div class="flex items-start gap-3">
        <div class="text-2xl flex-shrink-0">🤖</div>
        <div>
          <div class="font-semibold text-green-300 mb-2">AI Comparison Summary</div>
          <p class="text-sm text-gray-300 leading-relaxed">
            ${delta > 5
              ? `Scan A shows a significant improvement of ${deltaAbs} points compared to Scan B. This suggests your oral hygiene routine is having a positive effect. Continue the recommended treatment plan and maintain regular scans.`
              : delta < -5
              ? `Scan A shows a decline of ${deltaAbs} points compared to Scan B. This may indicate worsening oral conditions. Review the findings from Scan A carefully and consider booking a tele-dentistry consultation.`
              : delta === 0
              ? `Both scans show identical scores. While stability is good, continue monitoring — some conditions can progress without visible score changes.`
              : `Scores between Scan A and Scan B are similar (${deltaAbs} point difference). Continue regular monitoring and maintain your hygiene routine.`}
          </p>
          <div class="flex gap-3 mt-3 flex-wrap">
            <button onclick="navigate('telehealth')" class="btn-primary text-xs px-3 py-2">Book Consultation</button>
            <button onclick="navigate('upload')"     class="btn-secondary text-xs px-3 py-2">New Scan</button>
          </div>
        </div>
      </div>
    </div>

  </div>
  `;
}
