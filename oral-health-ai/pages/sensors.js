// ── IoT Sensors Page ──
// Module-level ticker ID so we can clear it when navigating away
let _sensorTickerId = null;
let _sensorLiveMode = false;

function pageSensors() {
  const s = AppState.sensors;

  const cfg = [
    {
      key:'ph', icon:'🧪', label:'Saliva pH', value:s.ph, unit:'', min:0, max:14,
      normal:[6.5,7.5], color:'#28a8ff',
      desc:'Measures acidity/alkalinity of saliva. Normal range 6.5–7.5. Low pH indicates acid attack on enamel.',
      history: s.phHistory || [],
    },
    {
      key:'temperature', icon:'🌡️', label:'Oral Temperature', value:s.temperature, unit:'°C', min:35, max:40,
      normal:[36.1,37.2], color:'#f59e0b',
      desc:'Oral cavity temperature. Elevated readings may indicate inflammation or active bacterial infection.',
      history: s.tempHistory || [],
    },
    {
      key:'bacterial', icon:'🦠', label:'Bacterial Activity', value:s.bacterial, unit:'%', min:0, max:100,
      normal:[0,50], color:'#ef4444',
      desc:'Relative bacterial load. Values above 50 % suggest high activity requiring antiseptic intervention.',
      history: s.bacterialHistory || [],
    },
    {
      key:'moisture', icon:'💧', label:'Oral Moisture', value:s.moisture, unit:'%', min:0, max:100,
      normal:[60,100], color:'#10b981',
      desc:'Oral hydration level. Low moisture (xerostomia) increases caries and soft-tissue infection risk.',
      history: s.moistureHistory || [],
    },
  ];

  // Last-updated time display
  const lastUp = s.lastUpdated
    ? new Date(s.lastUpdated).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit', second:'2-digit' })
    : 'Unknown';

  return `
  <div class="max-w-5xl mx-auto space-y-6">

    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h2 class="text-2xl font-bold text-white">IoT Sensor Monitoring</h2>
        <p class="text-gray-400 mt-1">Real-time biochemical data from smart biosensors</p>
      </div>
      <div class="flex flex-wrap items-center gap-3">
        <div class="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-500/10 border border-green-500/20">
          <div class="w-2 h-2 rounded-full bg-green-400 pulse-dot"></div>
          <span class="text-xs text-green-300 font-semibold">Device Online</span>
        </div>
        <span class="text-xs text-gray-500" id="sensor-last-up">Updated: ${lastUp}</span>
        <!-- Live mode toggle -->
        <button id="live-toggle-btn" onclick="toggleSensorLive()"
          class="${_sensorLiveMode
            ? 'px-3 py-2 rounded-xl text-xs font-semibold border bg-red-500/10 border-red-500/30 text-red-300'
            : 'px-3 py-2 rounded-xl text-xs font-semibold border bg-brand-500/10 border-brand-500/30 text-brand-300'}">
          ${_sensorLiveMode ? '⏹ Stop Live' : '▶ Live Mode'}
        </button>
      </div>
    </div>

    <!-- Device status row -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
      ${[
        ['📷','Intraoral Camera','Connected','green'],
        ['🧪','pH Biosensor',    'Active',   'green'],
        ['🌡️','Temp Sensor',    'Active',   'green'],
        ['☁️','Cloud Sync',     'Synced',   'blue'],
      ].map(([icon,name,status,clr]) => `
        <div class="card-sm flex items-center gap-3">
          <span class="text-xl">${icon}</span>
          <div>
            <div class="text-xs text-gray-400 font-semibold">${name}</div>
            <div class="flex items-center gap-1 text-xs text-${clr}-400">
              <div class="w-1.5 h-1.5 rounded-full bg-${clr}-400 pulse-dot"></div>
              ${status}
            </div>
          </div>
        </div>`).join('')}
    </div>

    <!-- 4 Sensor cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-5" id="sensor-cards">
      ${cfg.map(sc => _renderSensorCard(sc)).join('')}
    </div>

    <!-- Readings table -->
    <div class="card">
      <h3 class="font-semibold text-white mb-4">Latest Readings Summary</h3>
      <div class="overflow-x-auto">
        <table class="data-table">
          <thead>
            <tr>
              <th>Sensor</th><th>Value</th><th>Normal Range</th>
              <th>Status</th><th>Trend</th><th>Last Updated</th>
            </tr>
          </thead>
          <tbody>
            ${cfg.map(sc => {
              const ok   = sc.value >= sc.normal[0] && sc.value <= sc.normal[1];
              const hist = sc.history;
              const trend = hist.length >= 2
                ? (hist[hist.length-1] > hist[hist.length-2] ? '↑ Rising' : hist[hist.length-1] < hist[hist.length-2] ? '↓ Falling' : '→ Stable')
                : '— No data';
              const trendColor = trend.startsWith('↑')
                ? (sc.key==='ph'||sc.key==='moisture' ? 'text-green-400' : 'text-red-400')
                : trend.startsWith('↓')
                  ? (sc.key==='ph'||sc.key==='moisture' ? 'text-red-400' : 'text-green-400')
                  : 'text-gray-400';
              return `
              <tr>
                <td class="flex items-center gap-2">${sc.icon} ${sc.label}</td>
                <td class="font-bold ${ok?'text-green-400':'text-red-400'}" id="sensor-table-val-${sc.key}">${sc.value}${sc.unit}</td>
                <td class="text-gray-400">${sc.normal[0]}–${sc.normal[1]}${sc.unit}</td>
                <td id="sensor-table-st-${sc.key}"><span class="${ok?'badge-minimal':'badge-severe'}">${ok?'Normal':'⚠ Alert'}</span></td>
                <td class="${trendColor} text-xs font-semibold">${trend}</td>
                <td class="text-gray-500 text-xs">${lastUp}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Actions -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <!-- Live mode card -->
      <div class="card text-center py-5 space-y-3">
        <div class="text-3xl" id="live-icon">${_sensorLiveMode ? '📡' : '▶️'}</div>
        <h4 class="font-semibold text-white">Auto Refresh</h4>
        <p class="text-gray-400 text-sm">
          ${_sensorLiveMode
            ? 'Updating every <span class="text-brand-300 font-semibold">5 seconds</span>'
            : 'Enable live mode to stream sensor data automatically'}
        </p>
        <button onclick="toggleSensorLive()" id="live-card-btn"
          class="${_sensorLiveMode ? 'btn-secondary' : 'btn-success'}">
          ${_sensorLiveMode ? '⏹ Stop Live' : '▶ Start Live Mode'}
        </button>
      </div>
      <!-- Simulate -->
      <div class="card text-center py-5 space-y-3">
        <div class="text-3xl">🔄</div>
        <h4 class="font-semibold text-white">Single Refresh</h4>
        <p class="text-gray-400 text-sm">Trigger one new IoT reading immediately</p>
        <button onclick="simulateSensorUpdate()" class="btn-success">
          Refresh Now
        </button>
      </div>
      <!-- Push to backend -->
      <div class="card text-center py-5 space-y-3">
        <div class="text-3xl">📡</div>
        <h4 class="font-semibold text-white">Push to API</h4>
        <p class="text-gray-400 text-sm">Send readings to the Flask backend</p>
        <button onclick="pushSensorsToBackend()" class="btn-primary">
          Sync with API
        </button>
      </div>
    </div>

  </div>
  `;
}

// ── Render one sensor card (also used for in-place refresh) ──
function _renderSensorCard(sc) {
  const pct  = Math.min(100, Math.max(0, ((sc.value - sc.min) / (sc.max - sc.min)) * 100));
  const nS   = Math.min(100, Math.max(0, ((sc.normal[0] - sc.min) / (sc.max - sc.min)) * 100));
  const nE   = Math.min(100, Math.max(0, ((sc.normal[1] - sc.min) / (sc.max - sc.min)) * 100));
  const ok   = sc.value >= sc.normal[0] && sc.value <= sc.normal[1];
  const sClr = ok ? '#10b981' : '#ef4444';
  const sTxt = ok ? 'Normal' : 'Out of Range';

  const hist = sc.history.length ? sc.history : [sc.value];
  const hMin = Math.min(...hist), hMax = Math.max(...hist);
  const hRange = hMax - hMin || 1;
  const W = 200, H = 44;
  const pts = hist.map((v,i) => {
    const x = (i / Math.max(hist.length - 1, 1)) * W;
    const y = H - 4 - ((v - hMin) / hRange) * (H - 8);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const dots = hist.map((v,i) => {
    const x = (i / Math.max(hist.length - 1, 1)) * W;
    const y = H - 4 - ((v - hMin) / hRange) * (H - 8);
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.5" fill="${sc.color}"/>`;
  }).join('');

  return `
  <div class="card space-y-4" id="sensor-card-${sc.key}">
    <div class="flex items-start justify-between">
      <div class="flex items-center gap-3">
        <span class="text-2xl">${sc.icon}</span>
        <div>
          <div class="font-semibold text-white">${sc.label}</div>
          <div class="text-xs text-gray-500">Range: ${sc.normal[0]}–${sc.normal[1]}${sc.unit}</div>
        </div>
      </div>
      <div class="text-right">
        <div class="text-2xl font-black tabular-nums sensor-live-value" style="color:${sClr}">${sc.value}${sc.unit}</div>
        <div class="text-xs font-semibold mt-0.5 sensor-live-status" style="color:${sClr}">${sTxt}</div>
      </div>
    </div>

    <!-- Gauge -->
    <div>
      <div class="relative h-3 bg-gray-800 rounded-full overflow-hidden">
        <div class="absolute h-full rounded-full opacity-20"
          style="left:${nS}%;width:${nE - nS}%;background:${sc.color}"></div>
        <div class="h-full rounded-full transition-all duration-700 sensor-live-gauge"
          style="width:${pct}%;background:${sClr}"></div>
      </div>
      <div class="flex justify-between text-xs text-gray-600 mt-1">
        <span>${sc.min}</span>
        <span class="text-gray-500 text-center">Normal ${sc.normal[0]}–${sc.normal[1]}</span>
        <span>${sc.max}${sc.unit}</span>
      </div>
    </div>

    <!-- Sparkline -->
    <div>
      <div class="flex items-center justify-between mb-1">
        <span class="text-xs text-gray-500">Recent trend (${hist.length} pts)</span>
        <span class="text-xs font-mono" style="color:${sc.color}">${sc.value}${sc.unit}</span>
      </div>
      <svg viewBox="0 0 ${W} ${H}" class="w-full" style="height:44px;display:block;">
        <polyline points="${pts}" fill="none" stroke="${sc.color}"
          stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        ${dots}
      </svg>
    </div>

    <p class="text-xs text-gray-500 border-t border-gray-800 pt-3 leading-relaxed">${sc.desc}</p>
  </div>`;
}

// ── Simulate: randomise values, push to history, persist ──
function simulateSensorUpdate() {
  const s = AppState.sensors;

  const prev = {
    ph:          s.ph,
    temperature: s.temperature,
    bacterial:   s.bacterial,
    moisture:    s.moisture,
  };

  // New values with slight drift from previous
  s.ph          = +Math.min(8, Math.max(5,   (prev.ph          + (Math.random()*0.4 - 0.2))).toFixed(1));
  s.temperature = +Math.min(40, Math.max(35, (prev.temperature  + (Math.random()*0.4 - 0.2))).toFixed(1));
  s.bacterial   = Math.min(100, Math.max(0,  Math.round(prev.bacterial   + (Math.random()*8 - 4))));
  s.moisture    = Math.min(100, Math.max(0,  Math.round(prev.moisture    + (Math.random()*6 - 3))));
  s.lastUpdated = new Date().toISOString();

  // Append to rolling histories (keep last 20)
  const push = (arr, val) => { arr.push(val); if (arr.length > 20) arr.shift(); };
  s.phHistory        = s.phHistory        || [];
  s.tempHistory      = s.tempHistory      || [];
  s.bacterialHistory = s.bacterialHistory || [];
  s.moistureHistory  = s.moistureHistory  || [];
  push(s.phHistory,        s.ph);
  push(s.tempHistory,      s.temperature);
  push(s.bacterialHistory, s.bacterial);
  push(s.moistureHistory,  s.moisture);

  saveSensors();  // persist to localStorage

  showToast('Sensor data refreshed!', 'success');
  navigate('sensors');
}

// ── Push current readings to Flask /api/sensors/update ──
async function pushSensorsToBackend() {
  if (!AppState.settings.useBackend) {
    showToast('Backend offline — start Flask server first', 'warning');
    return;
  }
  try {
    const url = (AppState.settings.backendUrl || 'http://localhost:5000') + '/api/sensors/update';
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ph:          AppState.sensors.ph,
        temperature: AppState.sensors.temperature,
        bacterial:   AppState.sensors.bacterial,
        moisture:    AppState.sensors.moisture,
      }),
    });
    if (r.ok) {
      showToast('Sensor data synced with backend!', 'success');
    } else {
      throw new Error('HTTP ' + r.status);
    }
  } catch (err) {
    showToast('Sync failed: ' + err.message, 'error');
  }
}

// ── Live Mode ticker ──
function toggleSensorLive() {
  _sensorLiveMode = !_sensorLiveMode;
  if (_sensorLiveMode) {
    showToast('Live mode started — updating every 5s', 'success');
    _runSensorTick();                                 // immediate first tick
    _sensorTickerId = setInterval(_runSensorTick, 5000);
  } else {
    clearInterval(_sensorTickerId);
    _sensorTickerId = null;
    showToast('Live mode stopped', 'info');
  }
  // Update button states without full re-render
  const btn1 = document.getElementById('live-toggle-btn');
  const btn2 = document.getElementById('live-card-btn');
  const icon = document.getElementById('live-icon');
  if (btn1) {
    btn1.textContent = _sensorLiveMode ? '⏹ Stop Live' : '▶ Live Mode';
    btn1.className   = _sensorLiveMode
      ? 'px-3 py-2 rounded-xl text-xs font-semibold border bg-red-500/10 border-red-500/30 text-red-300'
      : 'px-3 py-2 rounded-xl text-xs font-semibold border bg-brand-500/10 border-brand-500/30 text-brand-300';
  }
  if (btn2) {
    btn2.textContent = _sensorLiveMode ? '⏹ Stop Live' : '▶ Start Live Mode';
    btn2.className   = _sensorLiveMode ? 'btn-secondary' : 'btn-success';
  }
  if (icon) icon.textContent = _sensorLiveMode ? '📡' : '▶️';
}

// Stop ticker whenever user leaves the sensors page
document.addEventListener('page:rendered', (e) => {
  if (e.detail.page !== 'sensors' && _sensorTickerId) {
    clearInterval(_sensorTickerId);
    _sensorTickerId = null;
    _sensorLiveMode = false;
  }
});

// ── Single tick: mutate AppState, persist, then update DOM in-place ──
function _runSensorTick() {
  const s = AppState.sensors;

  // Drift values slightly
  const drift = (val, range, min, max, decimals) => {
    const next = val + (Math.random() * range - range / 2);
    return +Math.min(max, Math.max(min, next)).toFixed(decimals);
  };

  const newPh    = drift(s.ph,          0.3, 5.0, 8.0, 1);
  const newTemp  = drift(s.temperature, 0.3, 35,  40,  1);
  const newBact  = Math.round(drift(s.bacterial, 6, 0, 100, 0));
  const newMoist = Math.round(drift(s.moisture,  5, 0, 100, 0));

  // Commit
  s.ph          = newPh;
  s.temperature = newTemp;
  s.bacterial   = newBact;
  s.moisture    = newMoist;
  s.lastUpdated = new Date().toISOString();

  // Append histories
  const push = (arr, val) => { arr.push(val); if (arr.length > 20) arr.shift(); };
  s.phHistory        = s.phHistory        || [];
  s.tempHistory      = s.tempHistory      || [];
  s.bacterialHistory = s.bacterialHistory || [];
  s.moistureHistory  = s.moistureHistory  || [];
  push(s.phHistory,        s.ph);
  push(s.tempHistory,      s.temperature);
  push(s.bacterialHistory, s.bacterial);
  push(s.moistureHistory,  s.moisture);

  saveSensors();

  // Update last-updated timestamp label (no full re-render)
  const lastUpEl = document.getElementById('sensor-last-up');
  const now      = new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit', second:'2-digit' });
  if (lastUpEl) lastUpEl.textContent = `Updated: ${now}`;

  // Re-render only the 4 sensor cards in-place
  const cardsCfg = [
    { key:'ph',          icon:'🧪',  label:'Saliva pH',          value:s.ph,          unit:'',   min:0,  max:14,  normal:[6.5,7.5],   color:'#28a8ff', history:s.phHistory,        desc:'Measures acidity/alkalinity of saliva. Normal range 6.5–7.5. Low pH indicates acid attack on enamel.' },
    { key:'temperature', icon:'🌡️', label:'Oral Temperature',   value:s.temperature, unit:'°C', min:35, max:40,  normal:[36.1,37.2], color:'#f59e0b', history:s.tempHistory,      desc:'Oral cavity temperature. Elevated readings may indicate inflammation or active bacterial infection.' },
    { key:'bacterial',   icon:'🦠',  label:'Bacterial Activity', value:s.bacterial,   unit:'%',  min:0,  max:100, normal:[0,50],      color:'#ef4444', history:s.bacterialHistory, desc:'Relative bacterial load. Values above 50 % suggest high activity requiring antiseptic intervention.' },
    { key:'moisture',    icon:'💧',  label:'Oral Moisture',      value:s.moisture,    unit:'%',  min:0,  max:100, normal:[60,100],    color:'#10b981', history:s.moistureHistory,  desc:'Oral hydration level. Low moisture (xerostomia) increases caries and soft-tissue infection risk.' },
  ];

  const container = document.getElementById('sensor-cards');
  if (container) {
    // Flash animation on changed cards
    cardsCfg.forEach(sc => {
      const el = document.getElementById(`sensor-card-${sc.key}`);
      if (el) {
        // Pulse highlight
        el.style.transition = 'border-color 0.3s';
        el.style.borderColor = sc.color + '66';
        setTimeout(() => { if (el) el.style.borderColor = ''; }, 600);
        // Update the value display inside card without tearing down SVG
        const valueEl = el.querySelector('.sensor-live-value');
        const statusEl = el.querySelector('.sensor-live-status');
        const gaugeEl  = el.querySelector('.sensor-live-gauge');
        const ok       = sc.value >= sc.normal[0] && sc.value <= sc.normal[1];
        const sClr     = ok ? '#10b981' : '#ef4444';
        if (valueEl)  { valueEl.textContent  = sc.value + sc.unit; valueEl.style.color = sClr; }
        if (statusEl) { statusEl.textContent = ok ? 'Normal' : 'Out of Range'; statusEl.style.color = sClr; }
        const pct = Math.min(100, Math.max(0, ((sc.value - sc.min) / (sc.max - sc.min)) * 100));
        if (gaugeEl)  { gaugeEl.style.width = pct + '%'; gaugeEl.style.background = sClr; }
      } else {
        // Card not found — full re-render
        container.innerHTML = cardsCfg.map(c => _renderSensorCard(c)).join('');
      }
    });
  }

  // Update readings table rows
  cardsCfg.forEach(sc => {
    const ok      = sc.value >= sc.normal[0] && sc.value <= sc.normal[1];
    const valCell = document.getElementById(`sensor-table-val-${sc.key}`);
    const stCell  = document.getElementById(`sensor-table-st-${sc.key}`);
    if (valCell) { valCell.textContent = sc.value + sc.unit; valCell.className = `font-bold ${ok ? 'text-green-400' : 'text-red-400'}`; }
    if (stCell)  stCell.innerHTML = `<span class="${ok ? 'badge-minimal' : 'badge-severe'}">${ok ? 'Normal' : '⚠ Alert'}</span>`;
  });
}
