// ══════════════════════════════════════════════════════
//  Feature 13 — IoT Device Health Panel
// ══════════════════════════════════════════════════════

const IOT_DEVICE_KEY = 'oralai_iot_devices';

function _loadDevices() {
  return Store.get(IOT_DEVICE_KEY) || _defaultDevices();
}
function _saveDevices(d) { Store.set(IOT_DEVICE_KEY, d); }

function _defaultDevices() {
  const now = new Date().toISOString();
  return [
    { id:'DEV-001', name:'Intraoral Camera', type:'camera',     status:'connected', battery:87, calibrated:true, lastCalib:'2026-09-01', lastReading:now, firmware:'v2.3.1', signal:92, warnings:[] },
    { id:'DEV-002', name:'pH Biosensor',     type:'ph',         status:'active',    battery:61, calibrated:true, lastCalib:'2026-09-10', lastReading:now, firmware:'v1.8.0', signal:88, warnings:[] },
    { id:'DEV-003', name:'Temperature Probe',type:'temp',       status:'active',    battery:45, calibrated:true, lastCalib:'2026-09-08', lastReading:now, firmware:'v1.5.2', signal:95, warnings:['Low battery — charge soon'] },
    { id:'DEV-004', name:'Bacterial Sensor', type:'bacterial',  status:'active',    battery:72, calibrated:false,lastCalib:'2026-08-15', lastReading:now, firmware:'v1.2.4', signal:81, warnings:['Calibration overdue (>30 days)'] },
    { id:'DEV-005', name:'Moisture Sensor',  type:'moisture',   status:'standby',   battery:93, calibrated:true, lastCalib:'2026-09-12', lastReading:now, firmware:'v1.1.0', signal:0,  warnings:['Not connected — check Bluetooth'] },
  ];
}

function pageIoTHealth() {
  const devices = _loadDevices();
  const warnings = devices.flatMap(d => d.warnings.map(w => ({ device: d.name, msg: w })));

  const statusColor = s => ({
    connected: '#10b981', active: '#28a8ff', standby: '#f59e0b', disconnected: '#ef4444'
  }[s] || '#64748b');

  const deviceIcon = t => ({ camera:'📷', ph:'🧪', temp:'🌡️', bacterial:'🦠', moisture:'💧' }[t] || '📡');

  return `
  <div class="max-w-4xl mx-auto space-y-6">

    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h2 class="text-2xl font-bold text-white flex items-center gap-2">📡 IoT Device Health</h2>
        <p class="text-gray-400 mt-1 text-sm">Battery, calibration, connectivity, and abnormal-reading warnings for all biosensors.</p>
      </div>
      <button onclick="simulateDeviceRefresh()" class="btn-success self-start text-sm">
        🔄 Refresh Status
      </button>
    </div>

    <!-- Warning alerts -->
    ${warnings.length > 0 ? `
    <div class="card border-yellow-500/30 bg-yellow-500/5 space-y-2">
      <h3 class="font-semibold text-yellow-300 flex items-center gap-2">⚠️ Active Warnings (${warnings.length})</h3>
      ${warnings.map(w => `
        <div class="flex items-center gap-3 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
          <span class="text-yellow-400 flex-shrink-0">⚠️</span>
          <div>
            <div class="text-sm font-semibold text-yellow-200">${w.device}</div>
            <div class="text-xs text-yellow-400/80">${w.msg}</div>
          </div>
        </div>`).join('')}
    </div>` : `
    <div class="card border-green-500/20 bg-green-500/5 py-3 text-center">
      <p class="text-green-300 font-semibold text-sm">✅ All devices healthy — no warnings</p>
    </div>`}

    <!-- Device grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
      ${devices.map(d => {
        const sc = statusColor(d.status);
        const battColor = d.battery < 20 ? '#ef4444' : d.battery < 50 ? '#f59e0b' : '#10b981';
        const sigColor  = d.signal  < 30 ? '#ef4444' : d.signal  < 60 ? '#f59e0b' : '#10b981';
        const lastRead  = new Date(d.lastReading).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
        const calDays   = Math.floor((Date.now() - new Date(d.lastCalib).getTime()) / (1000*60*60*24));

        return `
        <div class="card space-y-4 ${d.warnings.length?'border-yellow-500/20':''}">
          <!-- Header -->
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3">
              <span class="text-3xl">${deviceIcon(d.type)}</span>
              <div>
                <div class="font-semibold text-white text-sm">${d.name}</div>
                <div class="flex items-center gap-1.5 mt-0.5">
                  <div class="w-2 h-2 rounded-full" style="background:${sc}"></div>
                  <span class="text-xs font-semibold capitalize" style="color:${sc}">${d.status}</span>
                </div>
              </div>
            </div>
            <div class="text-right text-xs text-gray-500 flex-shrink-0">
              <div>FW ${d.firmware}</div>
              <div class="mt-0.5">ID: ${d.id}</div>
            </div>
          </div>

          <!-- Battery -->
          <div>
            <div class="flex justify-between text-xs mb-1">
              <span class="text-gray-500">🔋 Battery</span>
              <span style="color:${battColor}" class="font-semibold">${d.battery}%</span>
            </div>
            <div class="sensor-bar h-2">
              <div class="sensor-fill h-2" style="width:${d.battery}%;background:${battColor};transition:width 1s"></div>
            </div>
            ${d.battery < 20 ? '<p class="text-xs text-red-400 mt-1">🔴 Critical — please charge immediately</p>'
              : d.battery < 50 ? '<p class="text-xs text-yellow-400 mt-1">⚠️ Low battery — charge soon</p>' : ''}
          </div>

          <!-- Signal strength -->
          <div>
            <div class="flex justify-between text-xs mb-1">
              <span class="text-gray-500">📶 Signal</span>
              <span style="color:${sigColor}" class="font-semibold">${d.signal}%</span>
            </div>
            <div class="sensor-bar h-2">
              <div class="sensor-fill h-2" style="width:${d.signal}%;background:${sigColor};transition:width 1s"></div>
            </div>
          </div>

          <!-- Calibration -->
          <div class="flex items-center justify-between text-xs p-2.5 rounded-lg bg-gray-900 border border-gray-800">
            <div>
              <span class="text-gray-400">Calibration: </span>
              <span class="${d.calibrated&&calDays<30?'text-green-400':d.calibrated?'text-yellow-400':'text-red-400'} font-semibold">
                ${d.calibrated ? (calDays < 30 ? '✓ Current' : `⚠️ ${calDays}d ago`) : '✗ Not calibrated'}
              </span>
            </div>
            <button onclick="calibrateDevice('${d.id}')" class="text-brand-400 hover:underline text-xs">Calibrate</button>
          </div>

          <!-- Last reading + warnings -->
          <div class="flex items-center justify-between text-xs text-gray-500">
            <span>Last reading: ${lastRead}</span>
            ${d.warnings.length ? `<span class="text-yellow-400">${d.warnings.length} warning${d.warnings.length>1?'s':''}</span>` : '<span class="text-green-500">✓ No warnings</span>'}
          </div>

          <!-- Abnormal reading warning -->
          ${d.warnings.map(w => `
            <div class="p-2.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-xs text-yellow-300">
              ${w}
            </div>`).join('')}
        </div>`;
      }).join('')}
    </div>

    <!-- Device summary table -->
    <div class="card">
      <h3 class="font-semibold text-white mb-4">Summary Table</h3>
      <div class="overflow-x-auto">
        <table class="data-table">
          <thead><tr><th>Device</th><th>Status</th><th>Battery</th><th>Signal</th><th>Calibrated</th><th>Last Reading</th><th>Action</th></tr></thead>
          <tbody>
            ${devices.map(d=>`
              <tr>
                <td class="font-medium text-gray-200">${deviceIcon(d.type)} ${d.name}</td>
                <td><span class="text-xs font-semibold capitalize" style="color:${statusColor(d.status)}">${d.status}</span></td>
                <td>
                  <div class="flex items-center gap-2">
                    <div class="sensor-bar w-14 h-1.5">
                      <div class="sensor-fill h-1.5" style="width:${d.battery}%;background:${d.battery<20?'#ef4444':d.battery<50?'#f59e0b':'#10b981'}"></div>
                    </div>
                    <span class="text-xs">${d.battery}%</span>
                  </div>
                </td>
                <td class="text-xs">${d.signal}%</td>
                <td><span class="${d.calibrated?'badge-minimal':'badge-severe'}">${d.calibrated?'✓':'✗'}</span></td>
                <td class="text-xs text-gray-500">${new Date(d.lastReading).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</td>
                <td><button onclick="calibrateDevice('${d.id}')" class="text-brand-400 text-xs hover:underline">Calibrate</button></td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>

  </div>
  `;
}

function calibrateDevice(id) {
  const devices = _loadDevices();
  const d = devices.find(x => x.id === id);
  if (!d) return;
  showToast(`Calibrating ${d.name}…`, 'info');
  setTimeout(() => {
    d.calibrated = true;
    d.lastCalib  = new Date().toISOString().split('T')[0];
    d.warnings   = d.warnings.filter(w => !w.includes('alibrat'));
    _saveDevices(devices);
    showToast(`${d.name} calibrated successfully!`, 'success');
    navigate('iot_health');
  }, 1800);
}

function simulateDeviceRefresh() {
  const devices = _loadDevices();
  devices.forEach(d => {
    d.lastReading = new Date().toISOString();
    d.battery     = Math.max(5, Math.min(100, d.battery + Math.floor(Math.random()*6-3)));
    d.signal      = d.status==='standby' ? 0 : Math.max(30, Math.min(100, d.signal + Math.floor(Math.random()*10-5)));
    // Auto-add/remove battery warning
    d.warnings = d.warnings.filter(w => !w.includes('attery'));
    if (d.battery < 20) d.warnings.push('Low battery — charge soon');
  });
  _saveDevices(devices);
  showToast('Device status refreshed', 'success');
  navigate('iot_health');
}
