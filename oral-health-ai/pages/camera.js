// ── Smart Camera Guidance Page ──
// Guides the user to capture a quality intraoral photo before uploading.

function pageCamera() {
  return `
  <div class="max-w-2xl mx-auto space-y-6">

    <div>
      <h2 class="text-2xl font-bold text-white flex items-center gap-2">
        📸 Smart Camera Guidance
      </h2>
      <p class="text-gray-400 mt-1 text-sm">
        Get a perfect dental scan before AI analysis. Follow the checklist below.
      </p>
    </div>

    <!-- Live camera preview -->
    <div class="card space-y-4">
      <div class="flex items-center justify-between flex-wrap gap-3">
        <h3 class="font-semibold text-white">Camera Preview</h3>
        <div class="flex gap-2">
          <button onclick="startCamera()" id="cam-start-btn" class="btn-primary text-sm">
            📷 Start Camera
          </button>
          <button onclick="capturePhoto()" id="cam-capture-btn" class="btn-success text-sm hidden">
            ✓ Capture
          </button>
          <button onclick="stopCamera()" id="cam-stop-btn" class="btn-secondary text-sm hidden">
            ✕ Stop
          </button>
        </div>
      </div>

      <!-- Video + overlay -->
      <div class="relative rounded-xl overflow-hidden bg-gray-900 border border-gray-800"
           style="aspect-ratio:4/3;max-height:360px;">
        <video id="cam-video" class="w-full h-full object-cover hidden"
               autoplay muted playsinline></video>
        <canvas id="cam-canvas" class="hidden"></canvas>

        <!-- Idle state -->
        <div id="cam-idle" class="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <div class="text-5xl">📷</div>
          <p class="text-gray-400 text-sm">Click "Start Camera" to begin</p>
          <p class="text-xs text-gray-600">or <button onclick="navigate('upload')" class="text-brand-400 hover:underline">upload an existing image</button></p>
        </div>

        <!-- Mouth-outline guide overlay (shown when camera active) -->
        <svg id="cam-guide" class="absolute inset-0 w-full h-full hidden pointer-events-none" viewBox="0 0 400 300">
          <!-- Guide ellipse for mouth positioning -->
          <ellipse cx="200" cy="155" rx="130" ry="90"
                   fill="none" stroke="#28a8ff" stroke-width="2"
                   stroke-dasharray="8 4" opacity="0.7"/>
          <text x="200" y="30" fill="#28a8ff" font-size="13" text-anchor="middle" font-family="system-ui">
            Position teeth inside the oval
          </text>
          <!-- Corner brackets -->
          <path d="M60,40 L60,60 L80,60" fill="none" stroke="#28a8ff" stroke-width="2"/>
          <path d="M340,40 L340,60 L320,60" fill="none" stroke="#28a8ff" stroke-width="2"/>
          <path d="M60,260 L60,240 L80,240" fill="none" stroke="#28a8ff" stroke-width="2"/>
          <path d="M340,260 L340,240 L320,240" fill="none" stroke="#28a8ff" stroke-width="2"/>
        </svg>

        <!-- Quality indicators overlay -->
        <div id="cam-quality-overlay"
             class="hidden absolute bottom-3 left-3 right-3 flex flex-wrap gap-1.5" >
        </div>

        <!-- Captured image preview -->
        <img id="cam-captured" class="hidden absolute inset-0 w-full h-full object-cover" alt="Captured scan"/>
      </div>

      <!-- Quality score bar -->
      <div id="cam-quality-bar" class="hidden space-y-2">
        <div class="flex items-center justify-between text-sm">
          <span class="text-gray-400 font-semibold">Image Quality Score</span>
          <span id="cam-quality-num" class="font-black text-white tabular-nums">—</span>
        </div>
        <div class="sensor-bar h-3">
          <div id="cam-quality-fill" class="sensor-fill h-3" style="width:0%;background:#28a8ff;transition:width 0.4s"></div>
        </div>
        <p id="cam-quality-msg" class="text-xs text-gray-500"></p>
      </div>

      <!-- Captured photo actions -->
      <div id="cam-actions" class="hidden flex gap-3 flex-wrap">
        <button onclick="retakePhoto()" class="btn-secondary text-sm">🔄 Retake</button>
        <button onclick="proceedWithCapture()" class="btn-primary text-sm">✓ Use This Photo → Analyse</button>
      </div>
    </div>

    <!-- Checklist -->
    <div class="card">
      <h3 class="font-semibold text-white mb-4 flex items-center gap-2">
        ✅ Pre-Scan Checklist
      </h3>
      <div class="space-y-3" id="checklist">
        ${[
          ['💡','Lighting',       'Use bright, direct natural or room light. Avoid shadows inside the mouth.', 'lighting'],
          ['🔍','Focus',          'Hold the camera 15–20 cm from your mouth. Ensure teeth are sharp, not blurry.', 'focus'],
          ['📐','Angle',          'Hold the camera straight (not tilted). Both upper and lower arches should be visible.', 'angle'],
          ['🪥','Clean Teeth',    'Rinse your mouth before scanning. Remove lipstick or food debris.', 'clean'],
          ['😮','Open Wide',      'Open mouth fully. Pull cheeks back gently for maximum visibility.', 'open'],
          ['🤳','Stable Hold',    'Brace your elbow against a surface to avoid camera shake.', 'stable'],
        ].map(([icon, title, desc, key]) => `
          <div class="flex items-start gap-3 p-3 rounded-xl bg-gray-900 border border-gray-800
                      cursor-pointer hover:border-brand-500/30 transition-colors checklist-item"
               data-key="${key}" onclick="toggleCheckItem(this)">
            <span class="text-xl flex-shrink-0">${icon}</span>
            <div class="flex-1">
              <div class="flex items-center gap-2">
                <span class="text-sm font-semibold text-gray-200">${title}</span>
                <span class="check-badge hidden text-xs text-green-400 font-bold">✓ Done</span>
              </div>
              <p class="text-xs text-gray-500 mt-0.5">${desc}</p>
            </div>
            <div class="w-5 h-5 rounded border border-gray-700 flex items-center justify-center flex-shrink-0 mt-0.5 check-box">
            </div>
          </div>`).join('')}
      </div>
      <div class="mt-4 flex items-center justify-between">
        <span class="text-xs text-gray-500" id="checklist-counter">0 / 6 completed</span>
        <button onclick="navigate('upload')" id="proceed-btn"
          class="btn-secondary text-sm opacity-50 cursor-not-allowed" disabled>
          Proceed to Upload →
        </button>
      </div>
    </div>

    <!-- Tips carousel -->
    <div class="card">
      <h3 class="font-semibold text-white mb-3 text-sm">📖 Common Mistakes to Avoid</h3>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        ${[
          ['❌','Too dark — enable flash or move to better light'],
          ['❌','Blurry — hold still and focus before capturing'],
          ['❌','Too close — step back 15–20 cm'],
          ['❌','Cropped teeth — widen your mouth and adjust angle'],
          ['❌','Glare/reflections — avoid direct flash on wet surfaces'],
          ['❌','Partial view — ensure both upper and lower teeth visible'],
        ].map(([icon,tip]) => `
          <div class="flex items-start gap-2 p-2.5 rounded-lg bg-red-900/15 border border-red-900/30">
            <span class="flex-shrink-0">${icon}</span>
            <span class="text-gray-300">${tip}</span>
          </div>`).join('')}
      </div>
    </div>

  </div>
  `;
}

// ── Camera state ──
let _camStream  = null;
let _camCapData = null; // base64 data URL of captured image

async function startCamera() {
  const vid     = document.getElementById('cam-video');
  const idle    = document.getElementById('cam-idle');
  const guide   = document.getElementById('cam-guide');
  const startBtn= document.getElementById('cam-start-btn');
  const stopBtn = document.getElementById('cam-stop-btn');
  const capBtn  = document.getElementById('cam-capture-btn');
  const qualBar = document.getElementById('cam-quality-bar');

  try {
    _camStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
    });
    vid.srcObject = _camStream;
    vid.classList.remove('hidden');
    idle?.classList.add('hidden');
    guide?.classList.remove('hidden');
    qualBar?.classList.remove('hidden');
    startBtn?.classList.add('hidden');
    stopBtn?.classList.remove('hidden');
    capBtn?.classList.remove('hidden');

    // Start quality analysis loop
    _startQualityLoop();
  } catch (err) {
    console.warn('[OralAI camera.js]', err.name, err.message);
    const n = err.name || '';
    const msg =
      (n === 'NotAllowedError' || n === 'PermissionDeniedError')
        ? 'Camera permission denied — click the camera icon in the address bar to allow access, then retry.' :
      (n === 'NotFoundError'   || n === 'DevicesNotFoundError')
        ? 'No camera found on this device. Use Upload Scan instead.' :
      (n === 'NotReadableError'|| n === 'TrackStartError')
        ? 'Camera is in use by another app — close it and retry.' :
      (n === 'SecurityError')
        ? 'Camera blocked on insecure origin — open the app at http://localhost:8080.' :
      (n === 'OverconstrainedError')
        ? 'Rear camera not available — trying front camera…' :
        'Camera unavailable. Use the Upload Scan page to select an image.';
    showToast(msg, 'error');

    // Rear-camera constraint failed — retry with any camera
    if (n === 'OverconstrainedError' || n === 'ConstraintNotSatisfiedError') {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
          _camStream = stream;
          vid.srcObject = stream;
          vid.classList.remove('hidden');
          idle?.classList.add('hidden');
          guide?.classList.remove('hidden');
          qualBar?.classList.remove('hidden');
          startBtn?.classList.add('hidden');
          stopBtn?.classList.remove('hidden');
          capBtn?.classList.remove('hidden');
          _startQualityLoop();
          showToast('Using front camera (rear camera not available).', 'info');
        })
        .catch(e2 => {
          showToast('No camera available on this device.', 'error');
          console.warn('[OralAI camera.js] retry error:', e2);
        });
    }
  }
}

function stopCamera() {
  _camStream?.getTracks().forEach(t => t.stop());
  _camStream = null;
  clearInterval(_qualityLoopId);
  document.getElementById('cam-video')?.classList.add('hidden');
  document.getElementById('cam-guide')?.classList.add('hidden');
  document.getElementById('cam-idle')?.classList.remove('hidden');
  document.getElementById('cam-start-btn')?.classList.remove('hidden');
  document.getElementById('cam-stop-btn')?.classList.add('hidden');
  document.getElementById('cam-capture-btn')?.classList.add('hidden');
  document.getElementById('cam-quality-bar')?.classList.add('hidden');
}

function capturePhoto() {
  const vid = document.getElementById('cam-video');
  const canvas = document.getElementById('cam-canvas');
  if (!vid || !canvas) return;
  canvas.width  = vid.videoWidth  || 640;
  canvas.height = vid.videoHeight || 480;
  canvas.getContext('2d').drawImage(vid, 0, 0);
  _camCapData = canvas.toDataURL('image/jpeg', 0.92);

  // Show captured image
  const captured = document.getElementById('cam-captured');
  if (captured) { captured.src = _camCapData; captured.classList.remove('hidden'); }
  document.getElementById('cam-video')?.classList.add('hidden');
  document.getElementById('cam-guide')?.classList.add('hidden');
  document.getElementById('cam-capture-btn')?.classList.add('hidden');

  const qual = _assessQuality(_camCapData);
  _updateQualityUI(qual);

  document.getElementById('cam-actions')?.classList.remove('hidden');
  stopCamera();

  if (qual.score < 40) {
    showToast('Image quality is too low — please retake.', 'warning');
  } else {
    showToast('Photo captured! Review quality then proceed.', 'success');
  }
}

function retakePhoto() {
  _camCapData = null;
  document.getElementById('cam-captured')?.classList.add('hidden');
  document.getElementById('cam-actions')?.classList.add('hidden');
  document.getElementById('cam-quality-bar')?.classList.add('hidden');
  startCamera();
}

function proceedWithCapture() {
  if (!_camCapData) { showToast('No photo captured', 'warning'); return; }
  const qual = _assessQuality(_camCapData);
  if (qual.score < 40) {
    showToast('Quality too low — please retake for accurate AI results.', 'error'); return;
  }
  // Pass image to upload page via module var
  window._cameraCapture = _camCapData;
  navigate('upload');
  showToast('Photo ready — click Analyse to run AI detection.', 'success');
}

// ── Quality assessment (brightness, sharpness heuristic via canvas) ──
function _assessQuality(dataUrl) {
  // Parse via canvas
  const canvas = document.createElement('canvas');
  const img    = new Image();
  img.src = dataUrl;
  let brightness = 128, sharpness = 60, blurScore = 80;
  try {
    canvas.width = img.width || 200; canvas.height = img.height || 150;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, 100, 75);
    const px = ctx.getImageData(0, 0, 100, 75).data;
    let sum = 0;
    for (let i = 0; i < px.length; i += 4) sum += (px[i] + px[i+1] + px[i+2]) / 3;
    brightness  = Math.round(sum / (px.length / 4));
    // Variance as sharpness proxy
    let vsum = 0;
    const avg = brightness;
    for (let i = 0; i < px.length; i += 4) vsum += Math.pow((px[i]+px[i+1]+px[i+2])/3 - avg, 2);
    sharpness = Math.min(100, Math.round(Math.sqrt(vsum / (px.length/4))));
    blurScore = sharpness;
  } catch (_) { /* fallback: no canvas access */ }

  const brightOk  = brightness > 60 && brightness < 220;
  const sharpOk   = sharpness > 20;
  const score = Math.round((
    (brightOk  ? 40 : brightness > 30 ? 20 : 0) +
    (sharpOk   ? 40 : sharpness > 10  ? 20 : 0) +
    20 // baseline for having any image
  ));

  return {
    score,
    brightness,
    sharpness,
    checks: {
      lighting:  brightOk  ? 'good' : brightness < 60 ? 'dark' : 'overexposed',
      focus:     sharpOk   ? 'good' : 'blurry',
      size:      'good',
    },
    reject: score < 40,
  };
}

let _qualityLoopId = null;
function _startQualityLoop() {
  _qualityLoopId = setInterval(() => {
    const vid = document.getElementById('cam-video');
    if (!vid || vid.paused || vid.ended) return;
    const canvas = document.createElement('canvas');
    canvas.width = 160; canvas.height = 120;
    canvas.getContext('2d').drawImage(vid, 0, 0, 160, 120);
    const q = _assessQuality(canvas.toDataURL());
    _updateQualityUI(q);
  }, 1500);
}

function _updateQualityUI(q) {
  const fill = document.getElementById('cam-quality-fill');
  const num  = document.getElementById('cam-quality-num');
  const msg  = document.getElementById('cam-quality-msg');
  if (!fill || !num || !msg) return;

  const color = q.score >= 70 ? '#10b981' : q.score >= 40 ? '#f59e0b' : '#ef4444';
  fill.style.width      = q.score + '%';
  fill.style.background = color;
  num.textContent       = q.score + '/100';
  num.style.color       = color;

  const tips = [];
  if (q.checks.lighting === 'dark')        tips.push('💡 Too dark — improve lighting');
  if (q.checks.lighting === 'overexposed') tips.push('☀️ Overexposed — reduce glare');
  if (q.checks.focus    === 'blurry')      tips.push('🔍 Blurry — hold still');
  msg.textContent = tips.length ? tips.join('  ·  ') : q.score >= 70 ? '✅ Good quality — ready to capture' : '⚠️ Acceptable quality — try to improve';
}

// ── Checklist toggle ──
let _checkCount = 0;
function toggleCheckItem(el) {
  const isChecked = el.classList.toggle('border-green-500/50');
  el.classList.toggle('bg-green-500/5', isChecked);
  el.classList.toggle('bg-gray-900', !isChecked);
  const badge = el.querySelector('.check-badge');
  const box   = el.querySelector('.check-box');
  if (badge) badge.classList.toggle('hidden', !isChecked);
  if (box)   box.innerHTML = isChecked ? '<svg class="w-3 h-3 text-green-400" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/></svg>' : '';

  _checkCount = document.querySelectorAll('.checklist-item.border-green-500\\/50').length;
  const counter = document.getElementById('checklist-counter');
  const btn     = document.getElementById('proceed-btn');
  if (counter) counter.textContent = `${_checkCount} / 6 completed`;
  if (btn) {
    const ready = _checkCount >= 4;
    btn.disabled = !ready;
    btn.classList.toggle('opacity-50', !ready);
    btn.classList.toggle('cursor-not-allowed', !ready);
    btn.classList.toggle('btn-primary', ready);
    btn.classList.toggle('btn-secondary', !ready);
  }
}

// ── Stop camera whenever the user leaves this page ──
document.addEventListener('page:rendered', (e) => {
  if (e.detail.page !== 'camera' && _camStream) stopCamera();
});

// ── Also stop on browser tab hide / window close ──
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && _camStream) stopCamera();
});
