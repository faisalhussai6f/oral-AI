// ── OralAI SPA Router ──
const Router = {
  routes: {},
  currentPage: null,

  register(name, renderFn) {
    this.routes[name] = renderFn;
  },

  navigate(page, params = {}) {
    // Store page + params atomically so reload always restores both
    localStorage.setItem('oralai_lastRoute', JSON.stringify({ page, params }));
    this.render(page, params);
    this.currentPage = page;
  },

  render(page, params = {}) {
    const contentEl = document.getElementById('page-content');
    if (!contentEl) return;

    // 1. Show skeleton immediately
    _showSkeleton(contentEl);

    // 2. Scroll to top instantly
    contentEl.scrollTo({ top: 0, behavior: 'instant' });

    // 3. Small delay so skeleton is visible before potentially heavy render
    requestAnimationFrame(() => {
      let html;
      try {
        const fn = this.routes[page];
        html = fn ? fn(params) : page404();
      } catch (err) {
        console.error(`[OralAI Router] Error rendering page "${page}":`, err);
        html = _renderErrorPage(page, err);
      }

      try {
        contentEl.innerHTML = html;
      } catch (domErr) {
        console.error('[OralAI Router] DOM injection error:', domErr);
        contentEl.innerHTML = _renderErrorPage(page, domErr);
      }

      // 4. Entrance animation
      contentEl.style.opacity = '0';
      contentEl.style.transform = 'translateY(6px)';
      contentEl.offsetHeight; // reflow
      contentEl.style.transition = 'opacity 0.22s ease, transform 0.22s ease';
      contentEl.style.opacity = '1';
      contentEl.style.transform = 'translateY(0)';

      // 5. Fire render event
      document.dispatchEvent(new CustomEvent('page:rendered', {
        detail: { page, params }
      }));
    });
  },

  init() {
    try {
      const saved  = JSON.parse(localStorage.getItem('oralai_lastRoute') || '{}');
      const role   = AppState.user?.role || 'patient';
      // Never default to the generic 'dashboard' shim — always go to a real page
      const roleHome = role === 'doctor' ? 'doctor_dashboard'
                     : role === 'admin'  ? 'admin_dashboard'
                     :                    'patient_dashboard';
      const page   = (saved.page && saved.page !== 'dashboard') ? saved.page : roleHome;
      const params = saved.params || {};
      this.navigate(page, params);
    } catch {
      const role = AppState.user?.role || 'patient';
      this.navigate(role === 'doctor' ? 'doctor_dashboard' : 'patient_dashboard');
    }
  },
};

// ── Skeleton loader ──
function _showSkeleton(el) {
  el.innerHTML = `
    <div class="max-w-5xl mx-auto space-y-5 animate-pulse">
      <!-- Header skeleton -->
      <div class="h-7 bg-gray-800 rounded-xl w-64"></div>
      <div class="h-4 bg-gray-900 rounded-lg w-48"></div>

      <!-- Card row skeleton -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div class="bg-gray-900 border border-gray-800 rounded-xl h-56"></div>
        <div class="lg:col-span-2 space-y-4">
          <div class="grid grid-cols-3 gap-3">
            <div class="bg-gray-900 border border-gray-800 rounded-xl h-24"></div>
            <div class="bg-gray-900 border border-gray-800 rounded-xl h-24"></div>
            <div class="bg-gray-900 border border-gray-800 rounded-xl h-24"></div>
          </div>
          <div class="bg-gray-900 border border-gray-800 rounded-xl h-40"></div>
        </div>
      </div>

      <!-- Wide card skeleton -->
      <div class="bg-gray-900 border border-gray-800 rounded-xl h-36"></div>
      <div class="bg-gray-900 border border-gray-800 rounded-xl h-48"></div>
    </div>
  `;
  // Add pulse animation inline if Tailwind JIT hasn't run yet
  const style = document.getElementById('skeleton-style');
  if (!style) {
    const s = document.createElement('style');
    s.id = 'skeleton-style';
    s.textContent = `
      @keyframes _pulse { 0%,100%{opacity:1} 50%{opacity:.45} }
      .animate-pulse > * { animation: _pulse 1.6s ease-in-out infinite; }
    `;
    document.head.appendChild(s);
  }
}

// ── Error boundary page ──
function _renderErrorPage(page, err) {
  const msg     = err?.message || String(err) || 'Unknown error';
  const stack   = err?.stack   ? err.stack.split('\n').slice(0,4).join('\n') : '';
  const isDev   = location.hostname === 'localhost' || location.hostname === '127.0.0.1';

  return `
  <div class="max-w-lg mx-auto py-16 px-6 text-center space-y-5">
    <div class="text-6xl">⚠️</div>
    <h2 class="text-2xl font-bold text-white">Something went wrong</h2>
    <p class="text-gray-400 text-sm leading-relaxed">
      The page <span class="font-mono text-brand-400">${page}</span> failed to render.
      Your data is safe — try going back to the dashboard.
    </p>
    ${isDev ? `
    <details class="text-left bg-gray-900 border border-red-900/40 rounded-xl p-4 cursor-pointer">
      <summary class="text-red-400 text-xs font-semibold font-mono mb-2 outline-none">
        🐛 Error details (dev only)
      </summary>
      <pre class="text-xs text-red-300 overflow-x-auto whitespace-pre-wrap mt-2 font-mono leading-relaxed">${
        (msg + (stack ? '\n\n' + stack : '')).replace(/</g,'&lt;').replace(/>/g,'&gt;')
      }</pre>
    </details>` : ''}
    <div class="flex gap-3 justify-center flex-wrap">
      <button onclick="navigate('dashboard')"
        style="background:linear-gradient(135deg,#0a8aff,#0070eb);border:none;color:#fff;
               padding:10px 22px;border-radius:8px;cursor:pointer;font-weight:600;font-size:0.9rem;">
        Go to Dashboard
      </button>
      <button onclick="location.reload()"
        style="background:#1e2a3a;border:1px solid #334155;color:#94a3b8;
               padding:10px 22px;border-radius:8px;cursor:pointer;font-weight:600;font-size:0.9rem;">
        Reload App
      </button>
    </div>
    <p class="text-xs text-gray-700">
      If this keeps happening, try clearing app data from
      <button onclick="navigate('settings')" class="text-brand-600 hover:underline">Settings</button>.
    </p>
  </div>`;
}

// ── Global unhandled error catcher ──
// Catches JS errors outside the render cycle (e.g. event handlers, timers)
window.addEventListener('error', (e) => {
  // Ignore cross-origin script errors (browser extension noise)
  if (!e.filename || e.filename.includes('extension')) return;
  console.error('[OralAI] Unhandled error:', e.error || e.message);
  // Show a toast if the shell is loaded, otherwise let it fail silently
  if (typeof showToast === 'function') {
    showToast('An unexpected error occurred — check the console.', 'error');
  }
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('[OralAI] Unhandled promise rejection:', e.reason);
  if (typeof showToast === 'function') {
    showToast('An async operation failed — check the console.', 'error');
  }
});
