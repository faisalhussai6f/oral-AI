// ── Dashboard Page ──
function pageDashboard() {
  const user       = AppState.user || { name:'Demo User' };
  const firstName  = user.name.split(' ')[0];
  const allScans   = AppState.scans;
  const latestScan = allScans[0] || null;
  const score      = latestScan ? latestScan.score : 0;
  const sc         = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';
  const scLabel    = score >= 80 ? 'Good'    : score >= 60 ? 'Fair'    : score > 0 ? 'Poor' : '—';
  const circ = 339.3;
  const offset = circ - (score / 100) * circ;

  // ── Normalise findings ──
  const findings = latestScan
    ? (latestScan.findings || []).map(f =>
        typeof f === 'string' ? { condition:f, severity:'Mild', confidence:85 } : f)
    : [];

  const severityStyle = sev => ({
    Severe:'bg-red-500/10 border-red-500/20 text-red-300',
    Moderate:'bg-orange-500/10 border-orange-500/20 text-orange-300',
    Mild:'bg-yellow-500/10 border-yellow-500/20 text-yellow-300',
    Early:'bg-blue-500/10 border-blue-500/20 text-blue-300',
    Minimal:'bg-green-500/10 border-green-500/20 text-green-300',
  }[sev] || 'bg-gray-800 border-gray-700 text-gray-300');

  const dotColor = sev => ({
    Severe:'bg-red-400', Moderate:'bg-orange-400', Mild:'bg-yellow-400',
    Early:'bg-blue-400', Minimal:'bg-green-400',
  }[sev] || 'bg-gray-400');

  // ── Recommendations ──
  const recommendations = latestScan?.recommendations?.length
    ? latestScan.recommendations.slice(0,6).map((r,i) => {
        const icons = ['🦷','💧','🧴','🥗','💊','📅'];
        return [icons[i % icons.length], r, ''];
      })
    : [
        ['🦷','Schedule professional cleaning within 3 months','High Priority'],
        ['💧','Increase flossing frequency to twice daily','Medium Priority'],
        ['🧴','Use fluoride toothpaste for enamel protection','Recommended'],
        ['🥗','Reduce acidic food and drink intake','Lifestyle'],
        ['💊','Use antiseptic mouthwash 2× daily','Treatment'],
        ['📅','Next AI scan recommended in 30 days','Monitoring'],
      ];

  // ── IoT sensor cards ──
  const s = AppState.sensors;
  const sensorCards = [
    ['🧪','Saliva pH',  s.ph,                '6.5–7.5',    s.ph >= 6.5 && s.ph <= 7.5],
    ['🌡️','Oral Temp', s.temperature+'°C', '36.1–37.2°C', s.temperature >= 36.1 && s.temperature <= 37.2],
    ['🦠','Bacterial',  s.bacterial+'%',    '< 50%',       s.bacterial < 50],
    ['💧','Moisture',   s.moisture+'%',     '> 60%',       s.moisture > 60],
  ];

  // ── Greeting ──
  const hr = new Date().getHours();
  const greeting = hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening';

  // ── Health History Chart (SVG inline) ──
  // Use up to last 10 scans, oldest → newest
  const histScans  = allScans.slice(0, 10).reverse();
  let historyChart = '';
  if (histScans.length >= 2) {
    const W=460, H=110, PL=36, PR=12, PT=10, PB=26;
    const iW = W-PL-PR, iH = H-PT-PB;
    const scores = histScans.map(s2 => s2.score);
    const sMin   = Math.max(0,   Math.min(...scores) - 8);
    const sMax   = Math.min(100, Math.max(...scores) + 8);
    const toX = i  => (PL + (i / (scores.length-1)) * iW).toFixed(1);
    const toY = v  => (PT + iH - ((v-sMin)/(sMax-sMin||1)) * iH).toFixed(1);

    // Area fill path
    const pathPts  = scores.map((v,i) => `${toX(i)},${toY(v)}`).join(' ');
    const areaPath = `M${toX(0)},${toY(scores[0])} ` +
      scores.map((v,i) => `L${toX(i)},${toY(v)}`).join(' ') +
      ` L${toX(scores.length-1)},${H-PB} L${toX(0)},${H-PB} Z`;

    // Y grid lines
    const yVals = [60,70,80,90,100].filter(v => v >= sMin && v <= sMax);
    const yGrid = yVals.map(v => {
      const y = toY(v);
      return `<line x1="${PL}" y1="${y}" x2="${W-PR}" y2="${y}"
                stroke="#1e2a3a" stroke-width="1" stroke-dasharray="3,3"/>
              <text x="${PL-4}" y="${+y+3.5}" fill="#4b5563"
                font-size="8" text-anchor="end">${v}</text>`;
    }).join('');

    // Dots + labels + x-labels
    const dots = scores.map((v,i) => {
      const x = toX(i), y = toY(v);
      const c2 = v>=80?'#10b981':v>=60?'#f59e0b':'#ef4444';
      const lbl = histScans[i].date.replace(/,.*/, '').replace(/ \d{4}$/, '');
      return `<circle cx="${x}" cy="${y}" r="4" fill="${c2}" stroke="#0d1117" stroke-width="2"/>
              <text x="${x}" y="${+y-8}" fill="#e2e8f0" font-size="8"
                font-weight="600" text-anchor="middle">${v}</text>
              <text x="${x}" y="${H-5}" fill="#4b5563" font-size="7"
                text-anchor="middle">${lbl}</text>`;
    }).join('');

    // Trend arrow
    const first = scores[0], last = scores[scores.length-1];
    const trendDiff = last - first;
    const trendColor = trendDiff > 0 ? '#10b981' : trendDiff < 0 ? '#ef4444' : '#64748b';
    const trendArrow = trendDiff > 0 ? '↑' : trendDiff < 0 ? '↓' : '→';
    const trendLabel = trendDiff !== 0
      ? `${trendArrow} ${Math.abs(trendDiff)} pts over ${histScans.length} scans`
      : `→ Stable over ${histScans.length} scans`;

    historyChart = `
      <div class="card">
        <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h3 class="font-semibold text-white flex items-center gap-2">
            <svg class="w-4 h-4 text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
            </svg>
            Oral Health History
          </h3>
          <div class="flex items-center gap-3">
            <span class="text-xs font-semibold" style="color:${trendColor}">${trendLabel}</span>
            <button onclick="navigate('analytics')" class="text-xs text-brand-400 hover:text-brand-300 hover:underline">
              Full Analytics →
            </button>
          </div>
        </div>
        <div class="overflow-x-auto">
          <svg viewBox="0 0 ${W} ${H}" style="width:100%;min-width:320px;height:110px;display:block;">
            <!-- Area fill -->
            <defs>
              <linearGradient id="hist-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stop-color="#28a8ff" stop-opacity="0.25"/>
                <stop offset="100%" stop-color="#28a8ff" stop-opacity="0.02"/>
              </linearGradient>
            </defs>
            <path d="${areaPath}" fill="url(#hist-grad)"/>
            <!-- Grid -->
            ${yGrid}
            <!-- Axes -->
            <line x1="${PL}" y1="${PT}" x2="${PL}" y2="${H-PB}" stroke="#334155" stroke-width="1"/>
            <line x1="${PL}" y1="${H-PB}" x2="${W-PR}" y2="${H-PB}" stroke="#334155" stroke-width="1"/>
            <!-- Line -->
            <polyline points="${pathPts}" fill="none" stroke="#28a8ff"
              stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
            <!-- Dots + labels -->
            ${dots}
          </svg>
        </div>
        <div class="flex items-center justify-between mt-2 text-xs text-gray-600 px-1">
          <span>Oldest (${histScans[0].date.replace(/,.*/, '')})</span>
          <span>Latest (${histScans[histScans.length-1].date.replace(/,.*/, '')})</span>
        </div>
      </div>`;
  }

  return `
  <div class="max-w-6xl mx-auto space-y-6">

    <!-- Welcome banner -->
    <div class="card relative overflow-hidden" style="background:linear-gradient(135deg,#051428,#0a1f3c);border-color:#1e3a5f;">
      <div class="absolute -top-10 -right-10 w-48 h-48 rounded-full opacity-10"
           style="background:radial-gradient(circle,#28a8ff,transparent)"></div>
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 relative">
        <div>
          <p class="text-gray-400 text-sm">${greeting} 👋</p>
          <h1 class="text-2xl font-bold text-white mt-0.5">${firstName}</h1>
          <p class="text-gray-400 text-sm mt-1">
            ${latestScan
              ? `Last scan <span class="text-gray-300">${latestScan.date}</span> — Score:
                 <span style="color:${sc}" class="font-semibold">${score}</span>`
              : 'Upload your first scan to get started'}
          </p>
        </div>
        <div class="flex gap-2 flex-wrap self-start sm:self-auto">
          <button onclick="navigate('upload')" class="btn-primary text-sm">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
            </svg>
            Upload Scan
          </button>
          <button onclick="navigate('notifications')" class="btn-secondary text-sm relative" title="Notifications">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Score + Stats + Findings row -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

      <!-- Health Score Ring -->
      <div class="card flex flex-col items-center justify-center py-6">
        <p class="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-4">Oral Health Score</p>
        <div class="ring-container" style="width:156px;height:156px;">
          <svg width="156" height="156" viewBox="0 0 160 160">
            <circle class="ring-bg" cx="80" cy="80" r="54"/>
            <circle class="ring-fill" cx="80" cy="80" r="54"
              stroke="${sc}" stroke-dasharray="${circ}" stroke-dashoffset="${offset}"
              transform="rotate(-90 80 80)"/>
          </svg>
          <div class="ring-text">
            <div class="text-4xl font-black text-white" id="score-num">0</div>
            <div class="text-sm font-semibold" style="color:${sc}">${scLabel}</div>
          </div>
        </div>
        <p class="text-xs text-gray-500 mt-3 text-center">
          ${latestScan ? `Latest scan · ${latestScan.date}` : 'No scan yet'}
        </p>
        <div class="mt-3 w-full px-4 space-y-1">
          <div class="flex justify-between text-xs text-gray-600">
            <span>Poor</span><span>Fair</span><span>Good</span>
          </div>
          <div class="sensor-bar">
            <div class="sensor-fill" style="width:${score}%;background:${sc}"></div>
          </div>
        </div>
        ${latestScan ? `
          <button onclick="navigate('report',{id:'${latestScan.id}'})"
            class="mt-4 text-xs text-brand-400 hover:text-brand-300 hover:underline">
            View Full Report →
          </button>` : ''}
      </div>

      <!-- Stats + Findings -->
      <div class="lg:col-span-2 space-y-4">
        <!-- Stat cards -->
        <div class="grid grid-cols-3 gap-3">
          <div class="stat-card cursor-pointer" onclick="navigate('scans')">
            <div class="text-2xl">🦷</div>
            <div class="stat-num">${allScans.length}</div>
            <div class="stat-label">Total Scans</div>
          </div>
          <div class="stat-card cursor-pointer" onclick="navigate('scans')">
            <div class="text-2xl">✅</div>
            <div class="stat-num">${allScans.filter(s2=>s2.status==='analyzed').length}</div>
            <div class="stat-label">Analyzed</div>
          </div>
          <div class="stat-card cursor-pointer" onclick="navigate('telehealth')">
            <div class="text-2xl">📅</div>
            <div class="stat-num">${AppState.appointments.filter(a=>a.status==='confirmed').length}</div>
            <div class="stat-label">Appointments</div>
          </div>
        </div>

        <!-- Latest AI Findings -->
        <div class="card">
          <div class="flex items-center justify-between mb-3">
            <h3 class="font-semibold text-white flex items-center gap-2">
              <svg class="w-4 h-4 text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
              </svg>
              Latest AI Findings
            </h3>
            ${latestScan ? `<span class="text-xs text-gray-500">${latestScan.date}</span>` : ''}
          </div>

          ${findings.length > 0 ? `
            <div class="space-y-2">
              ${findings.slice(0,4).map(f => {
                const name = typeof f === 'string' ? f : (f.condition || f.name || 'Finding');
                const sev  = typeof f === 'string' ? 'Mild' : (f.severity || 'Mild');
                const conf = typeof f === 'object' ? f.confidence : null;
                return `
                <div class="flex items-center justify-between p-3 rounded-lg border ${severityStyle(sev)}">
                  <div class="flex items-center gap-2 min-w-0">
                    <div class="w-2 h-2 rounded-full flex-shrink-0 ${dotColor(sev)}"></div>
                    <span class="text-sm truncate">${name}</span>
                  </div>
                  <div class="flex items-center gap-2 flex-shrink-0">
                    ${conf ? `<span class="text-xs text-gray-500">${conf}%</span>` : ''}
                    <span class="badge-${sev==='Severe'?'severe':sev==='Moderate'?'moderate':sev==='Minimal'?'minimal':'mild'} text-xs">${sev}</span>
                  </div>
                </div>`;
              }).join('')}
            </div>
            ${latestScan ? `
              <button onclick="navigate('report',{id:'${latestScan.id}'})"
                class="btn-secondary w-full mt-3 text-sm">View Full Report →</button>` : ''}
          ` : latestScan ? `
            <div class="text-center py-4">
              <div class="text-3xl mb-2">✅</div>
              <p class="text-green-400 font-semibold text-sm">All Clear</p>
              <p class="text-gray-500 text-xs mt-1">No significant conditions detected</p>
            </div>
          ` : `
            <div class="text-center py-6">
              <div class="text-3xl mb-2">🦷</div>
              <p class="text-gray-400 text-sm">No scans yet — upload one to see your AI findings</p>
              <button onclick="navigate('upload')" class="btn-primary mt-3 text-sm">Upload First Scan</button>
            </div>
          `}
        </div>
      </div>
    </div>

    <!-- ★ HEALTH HISTORY CHART — injected only when ≥2 scans exist ★ -->
    ${historyChart}

    <!-- AI Recommendations -->
    <div class="card">
      <h3 class="font-semibold text-white flex items-center gap-2 mb-4">
        <svg class="w-4 h-4 text-mint-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
        </svg>
        AI Recommendations
        ${latestScan?.recommendations?.length
          ? '<span class="text-xs text-gray-500 font-normal ml-1">from latest scan</span>' : ''}
      </h3>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        ${recommendations.map(([icon,text,pri]) => `
          <div class="flex items-start gap-3 p-3 rounded-xl bg-gray-900 border border-gray-800 hover:border-brand-500/30 transition-colors">
            <span class="text-lg flex-shrink-0">${icon}</span>
            <div>
              <p class="text-sm text-gray-200">${text}</p>
              ${pri ? `<span class="text-xs text-gray-500">${pri}</span>` : ''}
            </div>
          </div>`).join('')}
      </div>
    </div>

    <!-- Recent Scans table -->
    <div class="card">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-semibold text-white">Recent Scans</h3>
        <div class="flex gap-3 items-center">
          ${allScans.length >= 2 ? `
            <button onclick="navigate('compare')" class="text-xs text-purple-400 hover:text-purple-300 hover:underline">
              Compare →
            </button>` : ''}
          <button onclick="navigate('scans')" class="text-xs text-brand-400 hover:text-brand-300 hover:underline">
            View all →
          </button>
        </div>
      </div>
      ${allScans.length === 0 ? `
        <div class="text-center py-8 text-gray-500 text-sm">
          No scans yet.
          <button onclick="navigate('upload')" class="text-brand-400 hover:underline">Upload your first scan</button>
        </div>` : `
        <div class="overflow-x-auto">
          <table class="data-table">
            <thead><tr><th>Report ID</th><th>Date</th><th>Type</th><th>Score</th><th>Status</th><th></th></tr></thead>
            <tbody>
              ${allScans.slice(0,5).map(sc2 => {
                const c2 = sc2.score>=80?'#10b981':sc2.score>=60?'#f59e0b':'#ef4444';
                return `
                <tr class="cursor-pointer" onclick="navigate('report',{id:'${sc2.id}'})">
                  <td class="font-mono text-xs text-brand-400">${sc2.id.slice(0,22)}…</td>
                  <td class="text-gray-400 text-xs">${sc2.date}</td>
                  <td><span class="px-2 py-0.5 rounded text-xs bg-gray-800 text-gray-300">${sc2.type}</span></td>
                  <td>
                    <div class="flex items-center gap-2">
                      <div class="sensor-bar w-14">
                        <div class="sensor-fill" style="width:${sc2.score}%;background:${c2}"></div>
                      </div>
                      <span class="text-sm font-bold tabular-nums" style="color:${c2}">${sc2.score}</span>
                    </div>
                  </td>
                  <td><span class="badge-minimal">${sc2.status}</span></td>
                  <td onclick="event.stopPropagation()">
                    <button onclick="navigate('report',{id:'${sc2.id}'})"
                      class="text-brand-400 text-xs hover:underline">View →</button>
                  </td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>`}
    </div>

    <!-- IoT quick-status -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
      ${sensorCards.map(([icon,label,val,normal,ok]) => `
        <div class="stat-card text-center cursor-pointer group" onclick="navigate('sensors')">
          <div class="text-2xl mb-1">${icon}</div>
          <div class="text-lg font-bold tabular-nums ${ok?'text-green-400':'text-red-400'}">${val}</div>
          <div class="stat-label">${label}</div>
          <div class="text-xs ${ok?'text-green-500':'text-red-500'} mt-1">${ok?'✓ Normal':'⚠ Check'}</div>
          <div class="text-xs text-gray-700 mt-0.5 group-hover:text-gray-500 transition-colors">${normal}</div>
        </div>`).join('')}
    </div>

    <!-- Quick Actions -->
    <div class="card">
      <h3 class="font-semibold text-white mb-4 flex items-center gap-2">
        ⚡ Quick Actions
      </h3>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        ${[
          ['📸','Camera Scan',    'camera',       'Guided photo capture'],
          ['🩺','Symptom Check',  'symptom',      '8-question risk quiz'],
          ['⏰','Reminders',      'reminders',    'Daily hygiene schedule'],
          ['👨‍👩‍👧‍👦','Family',   'family',       'Manage family profiles'],
          ['📈','Progress',       'progress',     'All-scan report'],
          ['🔬','IoT Health',     'iot_health',   'Device status'],
          ['🔒','Privacy',        'privacy',      'Data & consent'],
          ['🌐','Language',       'accessibility','A11y & language'],
        ].map(([icon,label,page,desc]) => `
          <button onclick="navigate('${page}')"
            class="flex flex-col items-center gap-2 p-3 rounded-xl bg-gray-900 border border-gray-800
                   hover:border-brand-500/40 hover:bg-brand-500/5 transition-all text-center group">
            <span class="text-2xl group-hover:scale-110 transition-transform">${icon}</span>
            <div>
              <div class="text-xs font-semibold text-gray-200">${label}</div>
              <div class="text-xs text-gray-600 mt-0.5">${desc}</div>
            </div>
          </button>`).join('')}
      </div>
    </div>

  </div>

  <script>
    (function() {
      const target = ${score};
      const el = document.getElementById('score-num');
      if (!el) return;
      let cur = 0;
      const step = Math.max(1, Math.ceil(target / 50));
      const t = setInterval(() => {
        cur = Math.min(cur + step, target);
        el.textContent = cur;
        if (cur >= target) clearInterval(t);
      }, 16);
    })();
  </script>
  `;
}
