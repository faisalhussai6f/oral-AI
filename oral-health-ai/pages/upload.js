// ── Upload Page — with integrated live camera capture ──────────────────────
//
// Image source is chosen via a two-tab switcher:
//   Tab A: "Upload File"  — existing drag-drop / file-picker flow (unchanged)
//   Tab B: "Live Camera"  — getUserMedia preview → capture → quality check
//
// After capture or file selection the same startAnalysis() path is used,
// preserving the existing backend call, sensor fusion, results display,
// severity badges, recommendations, confidence warnings and printable report.
//
// Camera permission is requested ONLY when the user clicks "Open Camera".
// All camera tracks are stopped on tab-switch, page-leave, or stopCamera().
//
// Camera access requires http://localhost (or HTTPS).  A clear notice is
// shown when the page is served from an insecure non-local origin.
// ─────────────────────────────────────────────────────────────────────────────

function pageUpload() {
  // Detect whether getUserMedia is available at all
  const camSupported = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  // Warn when served from an insecure non-local origin
  const isSecureCtx  = window.isSecureContext ||
                       location.hostname === 'localhost' ||
                       location.hostname === '127.0.0.1';

  return `
  <div class="max-w-3xl mx-auto space-y-6">

    <div>
      <h2 class="text-2xl font-bold text-white">Upload Dental Scan</h2>
      <p class="text-gray-400 mt-1">Upload an image or use your camera for AI-powered analysis</p>
    </div>

    <!-- Insecure-origin warning (camera won't work over plain HTTP on remote hosts) -->
    ${!isSecureCtx ? `
    <div class="flex items-start gap-3 p-3 rounded-xl border border-orange-500/40 bg-orange-500/8 text-sm text-orange-300">
      <span class="text-xl flex-shrink-0">🔒</span>
      <div>
        <span class="font-semibold">Camera requires a secure context.</span>
        Camera access is blocked by browsers on plain HTTP addresses other than
        <code class="text-orange-200 bg-orange-900/30 px-1 rounded">localhost</code>.
        Open the app at <code class="text-orange-200 bg-orange-900/30 px-1 rounded">http://localhost:8080</code>
        or serve it over HTTPS to enable the camera.
        You can still upload an image using the file picker below.
      </div>
    </div>` : ''}

    <!-- Backend status notices -->
    <div id="api-notice" class="hidden items-center gap-3 p-3 rounded-xl border border-green-500/30 bg-green-500/8 text-sm text-green-300">
      <span>🟢</span>
      <span>Flask AI backend is online — image will be analyzed by the real CNN model.</span>
    </div>
    <div id="mock-notice" class="flex items-center gap-3 p-3 rounded-xl border border-yellow-500/30 bg-yellow-500/8 text-sm text-yellow-300">
      <span>⚠️</span>
      <span>Backend offline — using mock AI analysis. Start the Flask server for real CNN inference.</span>
    </div>

    <div class="card space-y-6">

      <!-- ── Scan Type ──────────────────────────────────────────── -->
      <div>
        <label class="form-label text-base font-semibold text-white">Scan Type</label>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
          <label class="flex items-start gap-3 p-4 rounded-xl border border-brand-500 bg-brand-500/8 cursor-pointer scan-type-opt" data-type="Basic RGB">
            <input type="radio" name="scantype" value="Basic RGB" checked class="mt-1 accent-brand-500" onchange="selectScanType('Basic RGB')" />
            <div>
              <div class="font-semibold text-white text-sm">📱 Basic RGB</div>
              <div class="text-xs text-gray-400 mt-1">Smartphone or regular camera. For routine checkups, plaque and cavity detection.</div>
            </div>
          </label>
          <label class="flex items-start gap-3 p-4 rounded-xl border border-gray-700 bg-gray-900 cursor-pointer scan-type-opt" data-type="Advanced Spectral">
            <input type="radio" name="scantype" value="Advanced Spectral" class="mt-1 accent-brand-500" onchange="selectScanType('Advanced Spectral')" />
            <div>
              <div class="font-semibold text-white text-sm">🔬 Advanced Spectral</div>
              <div class="text-xs text-gray-400 mt-1">Multispectral imaging for enhanced diagnosis. Detects subsurface enamel changes.</div>
            </div>
          </label>
        </div>
      </div>

      <!-- ── Image Source — tab switcher ───────────────────────── -->
      <div>
        <label class="form-label text-base font-semibold text-white mb-3 block">Image Source</label>

        <!-- Tabs -->
        <div class="flex gap-2 mb-4">
          <button id="tab-upload-btn"
            onclick="switchUploadTab('file')"
            class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border transition-colors
                   bg-brand-500/20 text-brand-300 border-brand-500/40">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
            </svg>
            Upload File
          </button>
          <button id="tab-camera-btn"
            onclick="switchUploadTab('camera')"
            class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border transition-colors
                   bg-gray-900 text-gray-400 border-gray-700 hover:border-gray-500
                   ${!camSupported || !isSecureCtx ? 'opacity-50 cursor-not-allowed' : ''}"
            ${!camSupported || !isSecureCtx ? 'disabled title="Camera not available — see notice above"' : ''}>
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
            Live Camera
            ${!camSupported ? '<span class="text-xs opacity-70">(unavailable)</span>' : ''}
          </button>
        </div>

        <!-- ── Tab A: File Upload ──────────────────────────────── -->
        <div id="tab-file-panel">
          <div class="upload-zone" id="upload-zone"
               ondragover="handleDragOver(event)"
               ondragleave="handleDragLeave(event)"
               ondrop="handleDrop(event)"
               onclick="document.getElementById('file-input').click()">
            <input type="file" id="file-input" accept=".jpg,.jpeg,.png,.webp" class="hidden"
                   onchange="handleFileSelect(event)" />
            <div id="upload-placeholder">
              <svg class="w-14 h-14 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
              <p class="text-gray-300 font-semibold">Drag &amp; drop your dental scan</p>
              <p class="text-gray-500 text-sm mt-1">or click to select file</p>
              <p class="text-gray-600 text-xs mt-3">JPEG, PNG, or WebP · Max 10 MB</p>
            </div>
            <div id="upload-preview" class="hidden text-center">
              <img id="preview-img" class="max-h-48 mx-auto rounded-xl mb-3 border border-gray-700 object-cover" alt="Preview" />
              <p id="preview-name" class="text-gray-300 text-sm font-semibold"></p>
              <p id="preview-size" class="text-gray-500 text-xs"></p>
              <button onclick="clearUpload(event)"
                class="mt-3 text-red-400 text-xs hover:text-red-300 hover:underline">✕ Remove</button>
            </div>
          </div>
        </div>

        <!-- ── Tab B: Live Camera ─────────────────────────────── -->
        <div id="tab-camera-panel" class="hidden space-y-4">

          <!-- Error banner — hidden until an error occurs -->
          <div id="cam-error-banner" class="hidden flex items-start gap-3 p-3 rounded-xl
               border border-red-500/40 bg-red-500/8 text-sm text-red-300">
            <span class="text-xl flex-shrink-0">⚠️</span>
            <div>
              <div id="cam-error-title" class="font-semibold"></div>
              <div id="cam-error-body"  class="text-xs text-red-200/70 mt-0.5 leading-relaxed"></div>
            </div>
          </div>

          <!-- Viewfinder -->
          <div class="relative rounded-xl overflow-hidden bg-gray-950 border border-gray-800"
               style="aspect-ratio:4/3; max-height:380px;">

            <!-- Live video stream -->
            <video id="inl-cam-video" class="w-full h-full object-cover hidden"
                   autoplay muted playsinline></video>

            <!-- Off-screen canvas used for capture -->
            <canvas id="inl-cam-canvas" class="hidden" aria-hidden="true"></canvas>

            <!-- Captured still image (shown after capture, hides video) -->
            <img  id="inl-cam-captured" class="hidden absolute inset-0 w-full h-full object-cover"
                  alt="Captured dental scan" />

            <!-- Idle state — shown before camera starts -->
            <div id="inl-cam-idle"
                 class="absolute inset-0 flex flex-col items-center justify-center gap-3 select-none">
              <div class="w-20 h-20 rounded-full bg-gray-800 border border-gray-700
                           flex items-center justify-center text-4xl">📷</div>
              <p class="text-gray-400 text-sm font-medium">Click <strong>"Open Camera"</strong> to begin</p>
              <p class="text-xs text-gray-600">Permission is requested only when you click the button</p>
            </div>

            <!-- Mouth-guide overlay (shown while streaming) -->
            <svg id="inl-cam-guide"
                 class="absolute inset-0 w-full h-full hidden pointer-events-none"
                 viewBox="0 0 400 300">
              <!-- Animated guide ellipse -->
              <ellipse cx="200" cy="155" rx="130" ry="90"
                fill="none" stroke="#28a8ff" stroke-width="2.5"
                stroke-dasharray="8 4" opacity="0.8">
                <animate attributeName="opacity" values="0.8;0.4;0.8" dur="2s" repeatCount="indefinite"/>
              </ellipse>
              <text x="200" y="28" fill="#28a8ff" font-size="13"
                text-anchor="middle" font-family="system-ui,sans-serif">
                Position teeth inside the oval
              </text>
              <!-- Corner brackets -->
              <path d="M55,38 L55,62 L79,62"  fill="none" stroke="#28a8ff" stroke-width="2.5"/>
              <path d="M345,38 L345,62 L321,62" fill="none" stroke="#28a8ff" stroke-width="2.5"/>
              <path d="M55,262 L55,238 L79,238" fill="none" stroke="#28a8ff" stroke-width="2.5"/>
              <path d="M345,262 L345,238 L321,238" fill="none" stroke="#28a8ff" stroke-width="2.5"/>
            </svg>

            <!-- Live quality indicators (bottom of viewfinder) -->
            <div id="inl-cam-quality-overlay"
                 class="hidden absolute bottom-3 left-3 right-3 flex flex-wrap gap-1.5 pointer-events-none">
            </div>

            <!-- "Camera active" live dot -->
            <div id="inl-cam-live-dot"
                 class="hidden absolute top-3 right-3 flex items-center gap-1.5
                        px-2 py-1 rounded-full bg-black/60 text-xs text-red-400 font-semibold">
              <span class="w-2 h-2 rounded-full bg-red-500 pulse-dot inline-block"></span>
              LIVE
            </div>
          </div>

          <!-- Camera controls row -->
          <div class="flex items-center gap-2 flex-wrap">
            <!-- Open Camera (shown when camera is idle / stopped) -->
            <button id="inl-cam-open-btn"
              onclick="inlOpenCamera()"
              class="btn-primary text-sm flex items-center gap-2">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
              Open Camera
            </button>

            <!-- Capture (shown while streaming) -->
            <button id="inl-cam-capture-btn"
              onclick="inlCapturePhoto()"
              class="btn-success text-sm hidden flex items-center gap-2">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="3" stroke-width="2"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
              </svg>
              Capture Image
            </button>

            <!-- Retake (shown after capture) -->
            <button id="inl-cam-retake-btn"
              onclick="inlRetakePhoto()"
              class="btn-secondary text-sm hidden flex items-center gap-2">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
              Retake
            </button>

            <!-- Stop Camera (shown while streaming) -->
            <button id="inl-cam-stop-btn"
              onclick="inlStopCamera()"
              class="text-sm px-3 py-2 rounded-lg border border-gray-700 text-gray-400
                     hover:border-red-800 hover:text-red-400 transition-colors hidden
                     flex items-center gap-2">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="6" width="12" height="12" rx="2" stroke-width="2"/>
              </svg>
              Stop Camera
            </button>

            <!-- Torch / Flashlight toggle (shown while streaming, hidden on desktop) -->
            <button id="inl-torch-btn"
              onclick="inlToggleTorch()"
              class="text-sm px-3 py-2 rounded-lg border border-gray-700 text-gray-400
                     hover:border-yellow-600 hover:text-yellow-400 transition-colors hidden
                     flex items-center gap-2"
              title="Toggle flashlight (Android/mobile only)">
              🔦 Torch
            </button>
          </div>

          <!-- Quality bar (shown while camera is active or after capture) -->
          <div id="inl-cam-quality-bar" class="hidden space-y-1.5">
            <div class="flex items-center justify-between text-xs">
              <span class="text-gray-400 font-semibold">Image Quality</span>
              <span id="inl-cam-quality-num" class="font-black tabular-nums text-white">—</span>
            </div>
            <div class="sensor-bar h-2.5">
              <div id="inl-cam-quality-fill" class="sensor-fill h-2.5 transition-all duration-500"
                   style="width:0%;background:#28a8ff"></div>
            </div>
            <p id="inl-cam-quality-msg" class="text-xs text-gray-500"></p>
          </div>

          <!-- Captured image confirmation row -->
          <div id="inl-cam-confirm-row" class="hidden">
            <div class="flex items-center gap-3 p-3 rounded-xl bg-green-500/8 border border-green-500/20">
              <span class="text-xl flex-shrink-0">✅</span>
              <div class="flex-1 text-sm text-green-300">
                Photo captured and ready. Click <strong>Analyze with AI</strong> below,
                or <button onclick="inlRetakePhoto()"
                  class="underline hover:text-green-200">Retake</button> for a better shot.
              </div>
            </div>
          </div>

        </div><!-- /tab-camera-panel -->
      </div>

      <!-- ── Patient notes ──────────────────────────────────────── -->
      <div>
        <label class="form-label">Patient Notes
          <span class="text-gray-600 font-normal">(optional)</span>
        </label>
        <textarea id="scan-notes" class="form-input" rows="3"
          placeholder="Describe any symptoms, pain areas, or concerns..."></textarea>
      </div>

      <!-- ── Region + Device ───────────────────────────────────── -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label class="form-label">Tooth / Region</label>
          <select id="scan-region" class="form-input">
            <option value="">Select region</option>
            <option>Upper front teeth</option>
            <option>Lower front teeth</option>
            <option>Upper left molars</option>
            <option>Upper right molars</option>
            <option>Lower left molars</option>
            <option>Lower right molars</option>
            <option>Full arch</option>
          </select>
        </div>
        <div>
          <label class="form-label">Scan Device</label>
          <select id="scan-device" class="form-input">
            <option>Smartphone</option>
            <option value="IoT Intraoral Camera" id="device-camera-opt">IoT Intraoral Camera</option>
            <option>Multispectral Device</option>
            <option>DSLR Camera</option>
          </select>
        </div>
      </div>

      <!-- ── IoT Sensor snapshot ───────────────────────────────── -->
      <div class="p-3 rounded-xl bg-gray-900 border border-gray-800">
        <div class="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-2">
          IoT Sensor Snapshot (attached to scan)
        </div>
        <div class="grid grid-cols-4 gap-2 text-center text-xs">
          <div><div class="font-bold text-brand-400">${AppState.sensors.ph||'—'}</div><div class="text-gray-600">pH</div></div>
          <div><div class="font-bold text-yellow-400">${AppState.sensors.temperature||'—'}°C</div><div class="text-gray-600">Temp</div></div>
          <div><div class="font-bold text-red-400">${AppState.sensors.bacterial||'—'}%</div><div class="text-gray-600">Bacterial</div></div>
          <div><div class="font-bold text-green-400">${AppState.sensors.moisture||'—'}%</div><div class="text-gray-600">Moisture</div></div>
        </div>
      </div>

      <!-- ── Analyse / Cancel ──────────────────────────────────── -->
      <div class="flex flex-col sm:flex-row gap-3">
        <button onclick="startAnalysis()"
          class="btn-primary flex-1 justify-center py-3 text-base flex items-center gap-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3
                 m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547
                 A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531
                 c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
          </svg>
          Analyze with AI
        </button>
        <button onclick="navigate('dashboard')"
          class="btn-secondary sm:w-36 justify-center">Cancel</button>
      </div>
    </div>

    <!-- ── How it works ─────────────────────────────────────────── -->
    <div class="card">
      <h3 class="font-semibold text-white mb-4">How It Works</h3>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        ${[
          ['1','📸','Capture','Upload or shoot an intraoral image'],
          ['2','⚙️','Preprocess','Resize, normalise & enhance'],
          ['3','🧠','CNN Analysis','Deep learning classification'],
          ['4','📋','Report','Diagnosis + recommendations'],
        ].map(([n,icon,title,desc]) => `
          <div class="text-center p-3">
            <div class="w-7 h-7 rounded-full bg-brand-500/20 text-brand-400 text-xs font-bold
                        flex items-center justify-center mx-auto mb-2">${n}</div>
            <div class="text-xl mb-1">${icon}</div>
            <div class="text-sm font-semibold text-white">${title}</div>
            <div class="text-xs text-gray-500 mt-1">${desc}</div>
          </div>`).join('')}
      </div>
    </div>
  </div>

  <!-- ── Analysis progress modal (unchanged) ──────────────────── -->
  <div id="analysis-modal"
       class="hidden fixed inset-0 bg-black/75 z-50 flex items-center justify-center
              p-4 backdrop-blur-sm">
    <div class="card max-w-sm w-full text-center space-y-5 border-brand-500/30">
      <div class="w-16 h-16 rounded-full bg-brand-500/20 flex items-center justify-center mx-auto">
        <span class="text-3xl">🧠</span>
      </div>
      <div>
        <h3 class="text-lg font-bold text-white">AI Analysis in Progress</h3>
        <p class="text-gray-400 text-sm mt-1" id="analysis-status">Preprocessing image...</p>
      </div>
      <div class="w-full bg-gray-800 rounded-full h-2.5 overflow-hidden">
        <div id="analysis-progress"
             class="h-2.5 bg-gradient-to-r from-brand-500 to-mint-500 rounded-full
                    transition-all duration-500" style="width:0%"></div>
      </div>
      <div class="flex justify-between text-xs text-gray-600">
        <span id="analysis-mode">Edge Computing · oralai-efficientnet-b0-v1</span>
        <span id="analysis-pct">0%</span>
      </div>
    </div>
  </div>
  `;
}

// ═══════════════════════════════════════════════════════════════════════════
//  SHARED STATE
// ═══════════════════════════════════════════════════════════════════════════

let selectedScanType    = 'Basic RGB';
let selectedFile        = null;   // File object (from picker) OR synthetic object (from camera)
let selectedFileDataUrl = null;   // base64 data URL used for preview + backend upload

// Which tab is active: 'file' | 'camera'
let _uploadTab = 'file';

// ═══════════════════════════════════════════════════════════════════════════
//  INLINE CAMERA STATE
// ═══════════════════════════════════════════════════════════════════════════

let _inlStream       = null;   // MediaStream when camera is live
let _inlQualityTimer = null;   // setInterval id for live quality polling
let _inlCaptured     = false;  // true once a photo has been taken this session
let _torchOn         = false;  // current torch/flashlight state
let _torchSupported  = false;  // set true when torch capability is confirmed

// ───────────────────────────────────────────────────────────────────────────
//  TAB SWITCHER
// ───────────────────────────────────────────────────────────────────────────

function switchUploadTab(tab) {
  _uploadTab = tab;

  const filePanel   = document.getElementById('tab-file-panel');
  const camPanel    = document.getElementById('tab-camera-panel');
  const uploadBtn   = document.getElementById('tab-upload-btn');
  const cameraBtn   = document.getElementById('tab-camera-btn');

  const activeClass   = ['bg-brand-500/20','text-brand-300','border-brand-500/40'];
  const inactiveClass = ['bg-gray-900','text-gray-400','border-gray-700'];

  if (tab === 'file') {
    filePanel?.classList.remove('hidden');
    camPanel?.classList.add('hidden');
    uploadBtn?.classList.add(...activeClass);
    uploadBtn?.classList.remove(...inactiveClass);
    cameraBtn?.classList.remove(...activeClass);
    cameraBtn?.classList.add(...inactiveClass);
    // Stop any running camera when switching away
    inlStopCamera();
  } else {
    filePanel?.classList.add('hidden');
    camPanel?.classList.remove('hidden');
    cameraBtn?.classList.add(...activeClass);
    cameraBtn?.classList.remove(...inactiveClass);
    uploadBtn?.classList.remove(...activeClass);
    uploadBtn?.classList.add(...inactiveClass);
  }
}

// ───────────────────────────────────────────────────────────────────────────
//  INLINE CAMERA — open
// ───────────────────────────────────────────────────────────────────────────

async function inlOpenCamera() {
  _inlHideError();

  // Guard: getUserMedia not available (old browser / non-secure context)
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    _inlShowError(
      'Camera not supported',
      'Your browser does not support camera access via getUserMedia. ' +
      'Try Chrome, Edge, Firefox, or Safari 14+. ' +
      'Also ensure the page is opened at <code>http://localhost:8080</code> or over HTTPS.'
    );
    return;
  }

  // Prefer rear camera on mobile; fall back to any available camera
  const constraints = {
    video: {
      facingMode: { ideal: 'environment' },
      width:  { ideal: 1920 },
      height: { ideal: 1080 },
    }
  };

  try {
    _inlStream = await navigator.mediaDevices.getUserMedia(constraints);
  } catch (err) {
    _inlHandleCameraError(err);
    return;
  }

  // Wire stream to video element
  const vid = document.getElementById('inl-cam-video');
  if (!vid) return;
  vid.srcObject = _inlStream;
  await vid.play().catch(() => {});   // some browsers need an explicit play()

  // Check torch capability after a short delay (camera needs ~500ms to init)
  setTimeout(async () => {
    const track = _inlStream?.getVideoTracks()[0];
    if (!track) return;
    let caps = {};
    try { caps = track.getCapabilities ? track.getCapabilities() : {}; } catch (_) {}
    const torchBtn = document.getElementById('inl-torch-btn');
    if (caps.torch === true) {
      // Definitely supported — show button
      _torchSupported = true;
      if (torchBtn) torchBtn.classList.remove('hidden');
    } else if (caps.torch !== false) {
      // Unknown — show button anyway, _inlSetTorch() will hide it if it fails
      if (torchBtn) torchBtn.classList.remove('hidden');
    }
    // caps.torch === false → definitively unsupported, leave button hidden
  }, 500);

  // Show streaming UI
  _inlSetStreamingUI(true);

  // Start live quality loop (every 1.5 s)
  _inlQualityTimer = setInterval(_inlLiveQualityTick, 1500);
}

// ───────────────────────────────────────────────────────────────────────────
//  INLINE CAMERA — capture
// ───────────────────────────────────────────────────────────────────────────

function inlCapturePhoto() {
  const vid    = document.getElementById('inl-cam-video');
  const canvas = document.getElementById('inl-cam-canvas');
  if (!vid || !canvas || !_inlStream) return;

  // Draw current video frame to canvas
  canvas.width  = vid.videoWidth  || 1280;
  canvas.height = vid.videoHeight || 960;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(vid, 0, 0, canvas.width, canvas.height);

  const dataUrl = canvas.toDataURL('image/jpeg', 0.92);

  // Run quality check on the video element (better accuracy than re-decoding JPEG)
  const qual = _inlAssessQuality(vid);
  _inlUpdateQualityUI(qual);

  if (qual.score < 40) {
    // Reject — tell user clearly but keep camera running so they can try again
    showToast('Image quality too low — please improve lighting or hold still, then retake.', 'warning');
    _inlUpdateQualityUI(qual);
    return;   // do NOT stop camera or accept image
  }

  // Accept the capture
  _inlCaptured    = true;
  selectedFileDataUrl = dataUrl;
  // Synthetic File-like object so startAnalysis() can build FormData
  selectedFile = _inlDataUrlToFile(dataUrl, 'camera-capture.jpg');

  // Show still image in viewfinder
  const capturedEl = document.getElementById('inl-cam-captured');
  if (capturedEl) { capturedEl.src = dataUrl; capturedEl.classList.remove('hidden'); }
  vid.classList.add('hidden');
  document.getElementById('inl-cam-guide')?.classList.add('hidden');

  // Stop camera tracks (save battery / privacy)
  inlStopCamera(/* keepUI= */ true);

  // Switch buttons: show Retake, hide Capture/Stop
  document.getElementById('inl-cam-capture-btn')?.classList.add('hidden');
  document.getElementById('inl-cam-stop-btn')?.classList.add('hidden');
  document.getElementById('inl-cam-retake-btn')?.classList.remove('hidden');
  document.getElementById('inl-cam-open-btn')?.classList.add('hidden');
  document.getElementById('inl-cam-confirm-row')?.classList.remove('hidden');
  document.getElementById('inl-cam-live-dot')?.classList.add('hidden');

  // Auto-select "IoT Intraoral Camera" device
  const deviceSel = document.getElementById('scan-device');
  if (deviceSel) deviceSel.value = 'IoT Intraoral Camera';

  showToast('Photo captured — click "Analyze with AI" to continue.', 'success');
}

// ───────────────────────────────────────────────────────────────────────────
//  INLINE CAMERA — retake
// ───────────────────────────────────────────────────────────────────────────

function inlRetakePhoto() {
  _inlCaptured        = false;
  selectedFile        = null;
  selectedFileDataUrl = null;

  // Hide still image, hide confirm row, hide retake button
  const capturedEl = document.getElementById('inl-cam-captured');
  if (capturedEl) { capturedEl.src = ''; capturedEl.classList.add('hidden'); }
  document.getElementById('inl-cam-retake-btn')?.classList.add('hidden');
  document.getElementById('inl-cam-confirm-row')?.classList.add('hidden');
  document.getElementById('inl-cam-quality-bar')?.classList.add('hidden');

  // Restart camera
  inlOpenCamera();
}

// ───────────────────────────────────────────────────────────────────────────
//  INLINE CAMERA — stop  (keepUI=true preserves the captured image display)
// ───────────────────────────────────────────────────────────────────────────

function inlStopCamera(keepUI = false) {
  // Stop all tracks
  if (_inlStream) {
    // Turn off torch before stopping (prevents it staying on)
    if (_torchOn) {
      const track = _inlStream.getVideoTracks()[0];
      if (track && track.getCapabilities?.()?.torch) {
        track.applyConstraints({ advanced: [{ torch: false }] }).catch(() => {});
      }
    }
    _inlStream.getTracks().forEach(t => t.stop());
    _inlStream = null;
  }
  _torchOn        = false;
  _torchSupported = false;
  _darkTickCount  = 0;
  // Kill quality loop
  if (_inlQualityTimer) {
    clearInterval(_inlQualityTimer);
    _inlQualityTimer = null;
  }

  if (!keepUI) {
    // Full reset — back to idle state
    const vid = document.getElementById('inl-cam-video');
    if (vid) { vid.srcObject = null; vid.classList.add('hidden'); }
    document.getElementById('inl-cam-captured')?.classList.add('hidden');
    document.getElementById('inl-cam-guide')?.classList.add('hidden');
    document.getElementById('inl-cam-idle')?.classList.remove('hidden');
    document.getElementById('inl-cam-quality-bar')?.classList.add('hidden');
    document.getElementById('inl-cam-confirm-row')?.classList.add('hidden');
    document.getElementById('inl-cam-live-dot')?.classList.add('hidden');
    // Reset buttons
    document.getElementById('inl-cam-open-btn')?.classList.remove('hidden');
    document.getElementById('inl-cam-capture-btn')?.classList.add('hidden');
    document.getElementById('inl-cam-retake-btn')?.classList.add('hidden');
    document.getElementById('inl-cam-stop-btn')?.classList.add('hidden');
    _inlCaptured = false;
  } else {
    // Partial stop — just hide streaming-only controls
    const vid = document.getElementById('inl-cam-video');
    if (vid) { vid.srcObject = null; vid.classList.add('hidden'); }
    document.getElementById('inl-cam-guide')?.classList.add('hidden');
    document.getElementById('inl-cam-live-dot')?.classList.add('hidden');
    document.getElementById('inl-cam-quality-overlay')?.classList.add('hidden');
  }
}

// ───────────────────────────────────────────────────────────────────────────
//  TORCH / FLASHLIGHT
//  Works on Android Chrome/Edge (rear camera).
//  NOT supported on iOS Safari or desktop browsers.
//
//  Rules:
//  • Auto-ON  when brightness < 80  (after 1 dark reading ~1.5 s)
//  • Stays ON until user presses "Torch Off" or camera stops
//  • Never auto-turns off — user has full manual control
// ───────────────────────────────────────────────────────────────────────────

let _darkTickCount = 0;

async function _inlSetTorch(on) {
  if (!_inlStream) return false;
  const track = _inlStream.getVideoTracks()[0];
  if (!track) return false;

  // getCapabilities() can return {} immediately after stream opens — that's OK.
  // caps.torch === false (boolean) = definitively unsupported.
  // caps.torch === undefined       = unknown, still try.
  let caps = {};
  try { caps = track.getCapabilities ? track.getCapabilities() : {}; } catch (_) {}
  if (caps.torch === false) {
    _torchSupported = false;
    document.getElementById('inl-torch-btn')?.classList.add('hidden');
    return false;
  }

  try {
    await track.applyConstraints({ advanced: [{ torch: on }] });
    _torchOn        = on;
    _torchSupported = true;
    _inlUpdateTorchBtn(on);
    // Reveal torch button now that we know it works
    const btn = document.getElementById('inl-torch-btn');
    if (btn) btn.classList.remove('hidden');
    if (on) showToast('💡 Flashlight ON — press "Torch Off" to turn off', 'info');
    return true;
  } catch (e) {
    console.warn('[OralAI torch]', e.name, e.message);
    _torchSupported = false;
    document.getElementById('inl-torch-btn')?.classList.add('hidden');
    return false;
  }
}

// Auto-torch: called every quality tick.
// Once ON it is NEVER turned off automatically — only by user or camera stop.
function _inlAutoTorch(brightness) {
  if (!_inlStream) return;
  if (_torchOn)    return;   // already on, nothing to do

  if (brightness < 80) {
    _darkTickCount++;
    if (_darkTickCount >= 1) {   // fire on first dark tick (~1.5 s)
      _darkTickCount = 0;
      _inlSetTorch(true);
    }
  } else {
    _darkTickCount = 0;          // reset counter when bright
  }
}

function _inlUpdateTorchBtn(on) {
  const btn = document.getElementById('inl-torch-btn');
  if (!btn) return;
  if (on) {
    btn.innerHTML     = '🔦 Torch Off';
    btn.style.cssText = 'background:rgba(251,191,36,0.25);border-color:rgba(251,191,36,0.6);color:#fbbf24;';
  } else {
    btn.innerHTML     = '🔦 Torch';
    btn.style.cssText = '';
  }
}

// Manual toggle — when user turns it off, reset dark counter so auto won't
// immediately re-fire if the scene is still dark.
function inlToggleTorch() {
  if (_torchOn) {
    _inlSetTorch(false);
    _darkTickCount = 0;   // prevent instant re-trigger
  } else {
    _inlSetTorch(true);
  }
}

// ───────────────────────────────────────────────────────────────────────────
//  HELPERS — UI state
// ───────────────────────────────────────────────────────────────────────────

function _inlSetStreamingUI(isStreaming) {
  document.getElementById('inl-cam-video')?.classList.toggle('hidden', !isStreaming);
  document.getElementById('inl-cam-idle')?.classList.toggle('hidden',   isStreaming);
  document.getElementById('inl-cam-guide')?.classList.toggle('hidden',  !isStreaming);
  document.getElementById('inl-cam-live-dot')?.classList.toggle('hidden', !isStreaming);
  document.getElementById('inl-cam-quality-bar')?.classList.toggle('hidden', !isStreaming);
  document.getElementById('inl-cam-quality-overlay')?.classList.toggle('hidden', !isStreaming);
  document.getElementById('inl-cam-open-btn')?.classList.toggle('hidden',    isStreaming);
  document.getElementById('inl-cam-capture-btn')?.classList.toggle('hidden', !isStreaming);
  document.getElementById('inl-cam-stop-btn')?.classList.toggle('hidden',    !isStreaming);
  document.getElementById('inl-cam-retake-btn')?.classList.add('hidden');
  document.getElementById('inl-cam-confirm-row')?.classList.add('hidden');
  // Torch button: only show while streaming AND torch is supported
  if (!isStreaming) document.getElementById('inl-torch-btn')?.classList.add('hidden');
}

// ───────────────────────────────────────────────────────────────────────────
//  HELPERS — error display
// ───────────────────────────────────────────────────────────────────────────

function _inlShowError(title, body) {
  const banner = document.getElementById('cam-error-banner');
  const titleEl= document.getElementById('cam-error-title');
  const bodyEl = document.getElementById('cam-error-body');
  if (!banner) return;
  if (titleEl) titleEl.textContent = title;
  if (bodyEl)  bodyEl.innerHTML    = body;
  banner.classList.remove('hidden');
  banner.classList.add('flex');
}

function _inlHideError() {
  const banner = document.getElementById('cam-error-banner');
  if (!banner) return;
  banner.classList.add('hidden');
  banner.classList.remove('flex');
}

// ───────────────────────────────────────────────────────────────────────────
//  HELPERS — structured camera error handling
// ───────────────────────────────────────────────────────────────────────────

function _inlHandleCameraError(err) {
  console.warn('[OralAI camera]', err.name, err.message);

  const errName = err.name || '';

  if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
    _inlShowError(
      'Camera permission denied',
      'You declined camera access. To enable it:<br>' +
      '• Chrome/Edge: click the camera icon in the address bar → Allow<br>' +
      '• Firefox: reload the page and click Allow when prompted<br>' +
      '• Safari: Settings → Safari → Camera → Allow<br>' +
      'You can still <strong>upload an image</strong> using the Upload File tab.'
    );
    showToast('Camera permission denied — use the Upload File tab instead.', 'error');

  } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
    _inlShowError(
      'No camera found',
      'No camera device was detected on this device or browser. ' +
      'Please plug in a webcam, or use the <strong>Upload File</strong> tab to select an image from disk.'
    );
    showToast('No camera found — use the Upload File tab.', 'error');

  } else if (errName === 'NotReadableError' || errName === 'TrackStartError') {
    _inlShowError(
      'Camera is in use by another app',
      'The camera is currently being used by another application (e.g. Zoom, Teams, another browser tab). ' +
      'Close other apps using the camera, then click <strong>Open Camera</strong> again.'
    );
    showToast('Camera busy — close other apps and retry.', 'warning');

  } else if (errName === 'OverconstrainedError' || errName === 'ConstraintNotSatisfiedError') {
    // Rear camera failed — retry with any camera
    console.info('[OralAI camera] Rear camera not found, retrying with any camera');
    navigator.mediaDevices.getUserMedia({ video: true })
      .then(stream => {
        _inlStream = stream;
        const vid = document.getElementById('inl-cam-video');
        if (vid) { vid.srcObject = stream; vid.play().catch(() => {}); }
        _inlSetStreamingUI(true);
        _inlQualityTimer = setInterval(_inlLiveQualityTick, 1500);
        showToast('Using front camera (rear camera not available).', 'info');
      })
      .catch(retryErr => _inlHandleCameraError(retryErr));

  } else if (errName === 'SecurityError') {
    _inlShowError(
      'Insecure context — camera blocked',
      'Camera access is only available on <code>localhost</code> or HTTPS pages. ' +
      'Open the app at <code>http://localhost:8080</code> or deploy over HTTPS. ' +
      'You can still <strong>upload an image</strong> using the Upload File tab.'
    );
    showToast('Camera blocked on insecure origin — use localhost or HTTPS.', 'error');

  } else {
    _inlShowError(
      'Camera unavailable',
      `An unexpected error occurred: <code>${errName}: ${err.message}</code>. ` +
      'Try refreshing the page. You can still <strong>upload an image</strong> using the Upload File tab.'
    );
    showToast('Camera error — see the notice above.', 'error');
  }
}

// ───────────────────────────────────────────────────────────────────────────
//  HELPERS — quality assessment (canvas pixel analysis)
// ───────────────────────────────────────────────────────────────────────────

function _inlAssessQuality(source) {
  // source is either a dataUrl string OR a live HTMLVideoElement
  // For live video we draw at full resolution to get accurate sharpness
  const canvas = document.createElement('canvas');
  const ctx    = canvas.getContext('2d');

  let brightness = 128, sharpness = 60, drawOk = false;

  try {
    if (source instanceof HTMLVideoElement) {
      // Use native video resolution for accuracy — cap at 320×240 for perf
      const W = Math.min(source.videoWidth  || 320, 320);
      const H = Math.min(source.videoHeight || 240, 240);
      canvas.width  = W;
      canvas.height = H;
      ctx.drawImage(source, 0, 0, W, H);
      drawOk = true;
    } else {
      // dataUrl path — draw at 320×240 (much better than 160×120)
      canvas.width = 320; canvas.height = 240;
      const img = new Image();
      img.src = source;
      ctx.drawImage(img, 0, 0, 320, 240);
      drawOk = true;
    }

    if (drawOk) {
      const px  = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      const len = px.length / 4;

      // ── Brightness: mean luminance ────────────────────────────
      let sum = 0;
      for (let i = 0; i < px.length; i += 4)
        sum += 0.299 * px[i] + 0.587 * px[i+1] + 0.114 * px[i+2]; // luma
      brightness = Math.round(sum / len);

      // ── Sharpness: Laplacian variance approximation ───────────
      // Sample every 2nd pixel row/col for speed; use 3-tap Laplacian
      const W = canvas.width, H = canvas.height;
      let lap = 0, lapCount = 0;
      for (let y = 1; y < H - 1; y += 2) {
        for (let x = 1; x < W - 1; x += 2) {
          const idx  = (y * W + x) * 4;
          const up   = ((y-1)*W + x) * 4;
          const dn   = ((y+1)*W + x) * 4;
          const lt   = (y*W + (x-1)) * 4;
          const rt   = (y*W + (x+1)) * 4;
          const luma = (i) => 0.299*px[i] + 0.587*px[i+1] + 0.114*px[i+2];
          const l = luma(idx);
          const d = Math.abs(4*l - luma(up) - luma(dn) - luma(lt) - luma(rt));
          lap += d; lapCount++;
        }
      }
      // Normalise: typical sharp image → 8–20, blurry → 0–4
      sharpness = lapCount > 0 ? Math.min(100, Math.round((lap / lapCount) * 5)) : 0;
    }
  } catch (_) { /* non-critical — fall through to defaults */ }

  // ── Scoring ───────────────────────────────────────────────────
  // Brightness 60–210 = good light.  Sharpness ≥ 8 = acceptable.
  const brightOk  = brightness >= 60  && brightness <= 210;
  const brightLow = brightness >= 30  && brightness < 60;   // dim but usable
  const sharpOk   = sharpness  >= 8;
  const sharpLow  = sharpness  >= 4   && sharpness  < 8;    // slightly blurry

  const brightScore = brightOk  ? 45 : brightLow ? 25 : 5;
  const sharpScore  = sharpOk   ? 45 : sharpLow  ? 25 : 5;
  const score       = Math.min(100, brightScore + sharpScore + 10); // 10 baseline

  return {
    score,
    brightness,
    sharpness,
    checks: {
      lighting: brightOk ? 'good' : brightness < 60 ? 'dark' : 'overexposed',
      focus:    sharpOk  ? 'good' : 'blurry',
    },
  };
}

function _inlLiveQualityTick() {
  const vid = document.getElementById('inl-cam-video');
  if (!vid || vid.paused || vid.ended || !_inlStream) return;
  // Pass video element directly — avoids JPEG recompression at tiny size
  const q = _inlAssessQuality(vid);
  _inlUpdateQualityUI(q);
  // Auto-torch: pass raw brightness value (0-255)
  _inlAutoTorch(q.brightness);
}

function _inlUpdateQualityUI(q) {
  const fill = document.getElementById('inl-cam-quality-fill');
  const num  = document.getElementById('inl-cam-quality-num');
  const msg  = document.getElementById('inl-cam-quality-msg');
  if (!fill) return;

  const color = q.score >= 70 ? '#10b981' : q.score >= 40 ? '#f59e0b' : '#ef4444';
  fill.style.width      = q.score + '%';
  fill.style.background = color;
  if (num) { num.textContent = q.score + '/100'; num.style.color = color; }
  if (msg) {
    const tips = [];
    if (q.checks.lighting === 'dark')        tips.push('💡 Too dark — improve lighting');
    if (q.checks.lighting === 'overexposed') tips.push('☀️ Overexposed — reduce glare');
    if (q.checks.focus    === 'blurry')      tips.push('🔍 Blurry — hold still');
    msg.textContent = tips.length
      ? tips.join('  ·  ')
      : q.score >= 70
        ? '✅ Good quality — press Capture Image'
        : '⚠️ Acceptable — improve if possible';
  }

  // Update live overlay badges in the viewfinder
  const overlay = document.getElementById('inl-cam-quality-overlay');
  if (overlay) {
    const badges = [];
    if (q.checks.lighting !== 'good') {
      badges.push(`<span class="text-xs px-2 py-0.5 rounded-full bg-yellow-900/80 text-yellow-300 border border-yellow-700/50">
        ${q.checks.lighting === 'dark' ? '💡 Dark' : '☀️ Bright'}</span>`);
    }
    if (q.checks.focus !== 'good') {
      badges.push(`<span class="text-xs px-2 py-0.5 rounded-full bg-red-900/80 text-red-300 border border-red-700/50">
        🔍 Blurry</span>`);
    }
    if (!badges.length) {
      badges.push(`<span class="text-xs px-2 py-0.5 rounded-full bg-green-900/80 text-green-300 border border-green-700/50">
        ✅ Good</span>`);
    }
    overlay.innerHTML = badges.join('');
  }
}

// ───────────────────────────────────────────────────────────────────────────
//  HELPERS — convert base64 data URL to a File object for FormData
// ───────────────────────────────────────────────────────────────────────────

function _inlDataUrlToFile(dataUrl, filename) {
  // dataUrl: "data:image/jpeg;base64,/9j/..."
  const [header, b64] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)[1];
  const binary = atob(b64);
  const bytes  = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], filename, { type: mime });
}

// ═══════════════════════════════════════════════════════════════════════════
//  PAGE:RENDERED handler
//  — restores camera-capture passed from camera.js (window._cameraCapture)
//  — resets stale state on fresh navigation
//  — stops any leaked camera stream when leaving the upload page
// ═══════════════════════════════════════════════════════════════════════════

document.addEventListener('page:rendered', (e) => {
  if (e.detail.page === 'upload') {
    // If the standalone camera guidance page passed a captured image, load it
    if (window._cameraCapture) {
      selectedFileDataUrl   = window._cameraCapture;
      selectedFile          = _inlDataUrlToFile(selectedFileDataUrl, 'camera-capture.jpg');
      window._cameraCapture = null;

      // Show it in the file-upload preview so the user sees what they captured
      requestAnimationFrame(() => {
        // Switch to file tab so the preview is visible
        switchUploadTab('file');
        const ph  = document.getElementById('upload-placeholder');
        const pv  = document.getElementById('upload-preview');
        const img = document.getElementById('preview-img');
        const nm  = document.getElementById('preview-name');
        const sz  = document.getElementById('preview-size');
        if (ph)  ph.classList.add('hidden');
        if (pv)  pv.classList.remove('hidden');
        if (img) img.src = selectedFileDataUrl;
        if (nm)  nm.textContent = 'Camera capture';
        if (sz)  sz.textContent = 'From camera guidance';
      });
    } else {
      // Fresh navigation — reset all state
      selectedFile        = null;
      selectedFileDataUrl = null;
      selectedScanType    = 'Basic RGB';
      _inlCaptured        = false;
    }

    // Show/hide backend notices
    const online = AppState.settings.useBackend;
    document.getElementById('api-notice')?.classList.toggle('hidden', !online);
    document.getElementById('api-notice')?.classList.toggle('flex',    online);
    document.getElementById('mock-notice')?.classList.toggle('hidden',  online);

  } else {
    // Navigated away from upload — always stop camera to free the hardware
    inlStopCamera();
  }
});

// ═══════════════════════════════════════════════════════════════════════════
//  SCAN TYPE SELECTOR
// ═══════════════════════════════════════════════════════════════════════════

function selectScanType(type) {
  selectedScanType = type;
  document.querySelectorAll('.scan-type-opt').forEach(el => {
    const sel = el.dataset.type === type;
    el.classList.toggle('border-brand-500', sel);
    el.classList.toggle('bg-brand-500/8',   sel);
    el.classList.toggle('border-gray-700', !sel);
    el.classList.toggle('bg-gray-900',     !sel);
  });
}

// ═══════════════════════════════════════════════════════════════════════════
//  FILE UPLOAD HANDLERS  (completely unchanged from original)
// ═══════════════════════════════════════════════════════════════════════════

function handleDragOver(e)   { e.preventDefault(); document.getElementById('upload-zone')?.classList.add('dragover'); }
function handleDragLeave()   { document.getElementById('upload-zone')?.classList.remove('dragover'); }
function handleDrop(e)       { e.preventDefault(); document.getElementById('upload-zone')?.classList.remove('dragover'); const f = e.dataTransfer.files[0]; if (f) processFile(f); }
function handleFileSelect(e) { const f = e.target.files[0]; if (f) processFile(f); }

function processFile(file) {
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowed.includes(file.type)) { showToast('Only JPEG, PNG, WebP allowed', 'error'); return; }
  if (file.size > 10 * 1024 * 1024)  { showToast('File must be under 10 MB', 'error');  return; }
  selectedFile = file;
  const reader = new FileReader();
  reader.onload = ev => {
    selectedFileDataUrl = ev.target.result;
    document.getElementById('upload-placeholder')?.classList.add('hidden');
    document.getElementById('upload-preview')?.classList.remove('hidden');
    const img = document.getElementById('preview-img');
    const nm  = document.getElementById('preview-name');
    const sz  = document.getElementById('preview-size');
    if (img) img.src         = selectedFileDataUrl;
    if (nm)  nm.textContent  = file.name;
    if (sz)  sz.textContent  = (file.size / 1024).toFixed(1) + ' KB';
  };
  reader.readAsDataURL(file);
}

function clearUpload(e) {
  e.stopPropagation();
  selectedFile        = null;
  selectedFileDataUrl = null;
  const img  = document.getElementById('preview-img');
  if (img) img.src = '';
  document.getElementById('upload-preview')?.classList.add('hidden');
  document.getElementById('upload-placeholder')?.classList.remove('hidden');
  const fi = document.getElementById('file-input');
  if (fi) fi.value = '';
}

// ═══════════════════════════════════════════════════════════════════════════
//  ANALYSIS  (completely unchanged — uses selectedFile / selectedFileDataUrl)
// ═══════════════════════════════════════════════════════════════════════════

async function startAnalysis() {
  if (!selectedFile && !selectedFileDataUrl) {
    showToast('Please upload or capture an image first.', 'warning');
    return;
  }

  const modal    = document.getElementById('analysis-modal');
  const progress = document.getElementById('analysis-progress');
  const status   = document.getElementById('analysis-status');
  const pctEl    = document.getElementById('analysis-pct');
  const modeEl   = document.getElementById('analysis-mode');
  if (modal) modal.classList.remove('hidden');

  const setProgress = (pct, msg) => {
    if (progress) progress.style.width = pct + '%';
    if (status)   status.textContent   = msg;
    if (pctEl)    pctEl.textContent    = pct + '%';
  };

  let result = null;

  // ── Attempt real Flask backend first ────────────────────────────────────
  const backendUrl = (AppState.settings.backendUrl || 'http://localhost:5000').replace(/\/$/, '');
  if (selectedFile) {
    try {
      if (modeEl) modeEl.textContent = 'Flask CNN Backend · real-time';
      setProgress(10, 'Sending to Flask backend...');
      const form = new FormData();
      form.append('image', selectedFile);
      form.append('scan_type', selectedScanType);
      form.append('sensors', JSON.stringify({
        ph:          AppState.sensors.ph,
        temperature: AppState.sensors.temperature,
        bacterial:   AppState.sensors.bacterial,
        moisture:    AppState.sensors.moisture,
      }));
      setProgress(35, 'Running CNN inference...');
      const resp = await fetch(backendUrl + '/api/analyze', {
        method: 'POST',
        body:   form,
        signal: AbortSignal.timeout(30000),
      });
      if (!resp.ok) throw new Error('API error ' + resp.status);
      setProgress(75, 'Processing results...');
      result = await resp.json();
      setProgress(100, 'Done!');
      AppState.settings.useBackend = true;
    } catch (err) {
      console.error('[OralAI] Backend error:', err);
      showToast('Backend unavailable — using local analysis', 'warning');
      AppState.settings.useBackend = false;
      result = null;
    }
  }

  // ── Mock pipeline (backend unavailable or no File object) ───────────────
  if (!result) {
    if (modeEl) modeEl.textContent = 'Local analysis · demo mode';
    const steps = [
      [10,  'Preprocessing image...'],
      [28,  'Enhancing contrast & normalizing...'],
      [46,  'Extracting CNN features...'],
      [62,  'Running disease classification...'],
      [78,  'Fusing IoT sensor data...'],
      [90,  'Generating diagnosis report...'],
      [100, 'Analysis complete!'],
    ];
    for (const [pct, msg] of steps) {
      setProgress(pct, msg);
      await new Promise(r => setTimeout(r, 600));
    }
    const score = Math.floor(45 + Math.random() * 50);
    const MOCK_CONDITIONS = [
      { condition: 'Plaque Accumulation',     severity: 'Mild',     region: 'Interproximal spaces' },
      { condition: 'Gingivitis',              severity: 'Moderate', region: 'Gingival margin' },
      { condition: 'Dental Caries',           severity: 'Moderate', region: 'Posterior molars' },
      { condition: 'Enamel Demineralization', severity: 'Mild',     region: 'Upper incisors' },
      { condition: 'Periodontal Disease',     severity: 'Severe',   region: 'Periodontal pockets' },
      { condition: 'Oral Ulcer',              severity: 'Moderate', region: 'Buccal mucosa' },
    ];
    const seed       = selectedFile ? (selectedFile.size % MOCK_CONDITIONS.length) : Math.floor(Math.random() * MOCK_CONDITIONS.length);
    const nFindings  = score < 60 ? 3 : score < 75 ? 2 : 1;
    const mockFindings = [];
    for (let i = 0; i < nFindings; i++) {
      mockFindings.push({
        ...MOCK_CONDITIONS[(seed + i) % MOCK_CONDITIONS.length],
        confidence: Math.floor(30 + Math.random() * 55),
      });
    }
    result = {
      score,
      confidence:      Math.floor(55 + Math.random() * 40),
      attentionAreas:  mockFindings.length,
      findings:        mockFindings,
      diagnosis:       score >= 80
        ? 'Oral health looks generally good. Continue regular hygiene routine.'
        : score >= 60
          ? `${mockFindings[0].condition} detected. Professional cleaning recommended.`
          : `Multiple conditions detected including ${mockFindings.map(f => f.condition).join(', ')}. Dental consultation advised.`,
      processingTime:  (0.4 + Math.random() * 0.8).toFixed(2) + 's',
      model:           'oralai-demo-mode',
      demoMode:        true,
      severity:        score >= 80 ? 'Good' : score >= 60 ? 'Fair' : 'Needs Attention',
      urgency:         score >= 80 ? 'none' : score >= 60 ? 'monitor' : 'dentist',
      low_confidence:  false,
      primaryDiagnosis: mockFindings[0]?.condition || 'Unknown',
      recommendations: [
        '[DEMO] This is a demo result — backend not connected.',
        'Connect to the Flask backend for real AI analysis.',
        'Schedule a professional dental check-up.',
      ],
      disclaimer: 'DEMO MODE: Results are randomly generated and not based on your image.',
    };
  }

  await new Promise(r => setTimeout(r, 500));
  if (modal) modal.classList.add('hidden');

  // ── Build and persist new scan ───────────────────────────────────────────
  const newId   = 'RPT-' + Date.now().toString().slice(-8) + '-ANALYSIS';
  const today   = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  const modelId = result.model
    || AppState.settings._backendModelId
    || (result.demoMode ? 'oralai-demo-mode' : 'oralai-efficientnet-b0-v1');
  const isLowConf = (result.confidence || 0) < 60 || result.low_confidence === true;

  const newScan = {
    id:              newId,
    date:            today,
    type:            selectedScanType,
    device:          document.getElementById('scan-device')?.value || 'Smartphone',
    region:          document.getElementById('scan-region')?.value || '',
    notes:           document.getElementById('scan-notes')?.value  || '',
    score:           result.score,
    confidence:      result.confidence,
    attentionAreas:  result.attentionAreas,
    findings:        result.findings,
    diagnosis:       result.diagnosis,
    processingTime:  result.processingTime || '—',
    model:           modelId,
    demoMode:        !!result.demoMode,
    low_confidence:  isLowConf,
    primaryDiagnosis: result.primaryDiagnosis || result.findings?.[0]?.condition || 'Unknown',
    urgency:         result.urgency   || 'monitor',
    severity:        result.severity  || 'Unknown',
    imageQuality:    result.imageQuality || (selectedFile ? 'Not assessed' : 'No image'),
    disclaimer:      result.disclaimer || 'AI screening finding — not a clinical diagnosis.',
    top_3_predictions: result.top_3_predictions || [],
    status:          'analyzed',
    imageDataUrl:    selectedFileDataUrl || null,
    sensorSnapshot:  {
      ph:          AppState.sensors.ph,
      temperature: AppState.sensors.temperature,
      bacterial:   AppState.sensors.bacterial,
      moisture:    AppState.sensors.moisture,
    },
    recommendations: result.recommendations || [],
  };

  AppState.scans.unshift(newScan);

  // Save image to IndexedDB (keeps it off localStorage quota)
  if (selectedFileDataUrl) {
    ImageDB.save(newId, selectedFileDataUrl).catch(() => {});
  }

  // Persist metadata WITHOUT image to localStorage
  const scansForStorage = AppState.scans.map(s => {
    const { imageDataUrl, ...meta } = s;
    return meta;
  });
  try { Store.set(Store.KEYS.SCANS, scansForStorage); } catch (e) {
    console.warn('[OralAI] Could not save scans to localStorage:', e);
  }

  if (typeof _addAuditEvent === 'function') {
    _addAuditEvent(`New scan analysed: ${newId} — score ${newScan.score}, model ${newScan.model}`);
  }

  showToast('Analysis complete!', 'success');
  setTimeout(() => navigate('report', { id: newId }), 500);
}
