// ── 404 / Not-Found page — callable anywhere ──
function _page404(msg) {
  return `
  <div class="max-w-lg mx-auto text-center py-20 space-y-5">
    <div class="text-7xl">🦷</div>
    <h2 class="text-3xl font-black text-white">404 — Not Found</h2>
    <p class="text-gray-400">${msg || 'The page or resource you\'re looking for doesn\'t exist.'}</p>
    <div class="flex gap-3 justify-center flex-wrap">
      <button onclick="navigate('dashboard')" class="btn-primary">Go to Dashboard</button>
      <button onclick="history.back()" class="btn-secondary">Go Back</button>
    </div>
  </div>`;
}

// ── Page for unknown routes ──
function page404() {
  return `
  <div class="max-w-lg mx-auto text-center py-20 space-y-6">

    <!-- Animated tooth -->
    <div class="relative inline-block">
      <div class="text-8xl" style="animation:wobble 2s ease-in-out infinite">🦷</div>
    </div>

    <div>
      <h2 class="text-4xl font-black text-white mb-2">404</h2>
      <h3 class="text-xl font-semibold text-gray-300">Page Not Found</h3>
      <p class="text-gray-400 mt-3 text-sm leading-relaxed">
        Looks like this page got a cavity — it doesn't exist anymore.<br/>
        Let's get you back on track.
      </p>
    </div>

    <!-- Quick nav links -->
    <div class="grid grid-cols-2 gap-3 max-w-xs mx-auto">
      ${[
        ['🏠','Dashboard','dashboard'],
        ['📤','Upload Scan','upload'],
        ['📋','My Scans','scans'],
        ['📡','IoT Sensors','sensors'],
      ].map(([icon,label,page])=>`
        <button onclick="navigate('${page}')"
          class="flex items-center gap-2 p-3 rounded-xl bg-gray-900 border border-gray-800
                 hover:border-brand-500/40 transition-all text-sm text-gray-300 hover:text-white">
          <span>${icon}</span>${label}
        </button>`).join('')}
    </div>

    <div class="flex gap-3 justify-center">
      <button onclick="navigate('dashboard')" class="btn-primary">Go to Dashboard</button>
      <button onclick="history.back()" class="btn-secondary">Go Back</button>
    </div>

  </div>

  <style>
    @keyframes wobble {
      0%,100%{transform:rotate(-5deg)}
      50%{transform:rotate(5deg)}
    }
  </style>`;
}
