// ── Login / Register Page ──
function renderLoginPage() {
  document.getElementById('app').innerHTML = `
  <div class="min-h-screen flex" style="background:var(--bg)">

    <!-- Left decorative panel — deep emerald -->
    <div class="hidden lg:flex lg:w-5/12 flex-col justify-between p-12"
         style="background:linear-gradient(160deg,#0F4D40 0%,#176B5B 55%,#1D7D6A 100%);">
      <div>
        <div class="flex items-center gap-3 mb-10">
          <div class="w-11 h-11 rounded-2xl bg-white/15 flex items-center justify-center backdrop-blur-sm border border-white/20">
            <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2"
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
            </svg>
          </div>
          <div>
            <div class="text-lg font-black text-white" style="font-family:Manrope,sans-serif;letter-spacing:-.02em">OralAI</div>
            <div class="text-xs text-white/50">Dental Health Platform</div>
          </div>
        </div>
        <h1 class="text-3xl font-black text-white mb-3 leading-tight" style="font-family:Manrope,sans-serif;letter-spacing:-.02em">
          Premium AI Oral<br/>Health Monitoring
        </h1>
        <p class="text-white/65 text-base mb-10 leading-relaxed">
          Clinically-informed AI screening, IoT biosensor integration,<br>
          and role-based patient &amp; doctor portals.
        </p>
        <div class="space-y-3">
          ${[
            ['🧠','CNN Disease Classification','Caries, gingivitis, plaque & more'],
            ['📡','IoT Biosensor Integration','Real-time pH, temperature & bacteria'],
            ['🩺','Doctor Review Portal','Structured clinical review workflow'],
            ['📱','Install as Mobile App','Works offline — Progressive Web App'],
          ].map(([i,t,s]) => `
            <div class="flex items-start gap-3 p-3 rounded-xl bg-white/8 border border-white/12">
              <span class="text-lg flex-shrink-0 mt-0.5">${i}</span>
              <div>
                <div class="text-sm font-semibold text-white/90" style="font-family:Manrope,sans-serif">${t}</div>
                <div class="text-xs text-white/45 mt-0.5">${s}</div>
              </div>
            </div>`).join('')}
        </div>
      </div>
      <div class="text-xs text-white/30" style="font-family:DM Sans,sans-serif">© 2026 Bearys Institute of Technology · AI &amp; Data Science</div>
    </div>

    <!-- Right form panel — warm ivory -->
    <div class="flex-1 flex items-center justify-center p-6 sm:p-10 overflow-y-auto" style="background:var(--bg)">
      <div class="w-full max-w-md">
        <!-- Mobile logo -->
        <div class="flex items-center gap-3 mb-8 lg:hidden">
          <div class="w-10 h-10 rounded-2xl flex items-center justify-center" style="background:#176B5B">
            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2"
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
            </svg>
          </div>
          <span class="text-xl font-black" style="font-family:Manrope,sans-serif;color:var(--text-base)">OralAI</span>
        </div>

        <!-- Login Panel -->
        <div id="login-panel">
          <h2 class="text-2xl font-black mb-1" style="font-family:Manrope,sans-serif;color:var(--text-base)">Welcome back</h2>
          <p class="mb-6 text-sm" style="color:var(--text-muted)">Sign in to your oral health account</p>
          <form onsubmit="handleLogin(event)" class="space-y-4" autocomplete="on">
            <div>
              <label class="form-label">Email address</label>
              <input id="login-email" type="email" class="form-input" placeholder="you@example.com"
                     value="demo@oralai.com" autocomplete="email" required />
            </div>
            <div>
              <label class="form-label">Password</label>
              <div class="relative">
                <input id="login-pass" type="password" class="form-input pr-10" placeholder="••••••••"
                       value="demo1234" autocomplete="current-password" required />
                <button type="button" onclick="togglePasswordVis('login-pass')"
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 text-xs">👁</button>
              </div>
            </div>
            <div class="flex items-center justify-between text-sm">
              <label class="flex items-center gap-2 cursor-pointer select-none" style="color:var(--text-muted)">
                <input type="checkbox" id="remember-me" class="rounded" style="accent-color:var(--brand)" checked />
                Remember me
              </label>
              <a href="#" onclick="showPanel('forgot')" class="text-sm font-semibold" style="color:var(--brand)">Forgot password?</a>
            </div>
            <button type="submit" class="btn-primary w-full justify-center py-3 text-base">
              Sign In
            </button>
          </form>

          <div class="relative my-5">
            <div class="absolute inset-0 flex items-center"><div class="w-full" style="border-top:1px solid var(--border)"></div></div>
            <div class="relative flex justify-center"><span class="text-xs px-3" style="background:var(--bg);color:var(--text-dim)">or continue as demo</span></div>
          </div>

          <div class="grid grid-cols-2 gap-2">
            <button onclick="quickDemo()" class="py-3 text-sm flex flex-col items-center justify-center gap-1 rounded-xl transition-colors" style="border:1.5px solid rgba(23,107,91,.35);background:rgba(23,107,91,.06);color:#176B5B">
              <span class="text-xl">🦷</span>
              <span class="font-bold text-xs" style="font-family:Manrope,sans-serif">Patient Portal</span>
              <span class="text-xs" style="color:var(--text-dim)">Demo login</span>
            </button>
            <button onclick="quickDemoDoctor()" class="py-3 text-sm flex flex-col items-center justify-center gap-1 rounded-xl transition-colors" style="border:1.5px solid rgba(232,123,98,.35);background:rgba(232,123,98,.06);color:#E87B62">
              <span class="text-xl">🩺</span>
              <span class="font-bold text-xs" style="font-family:Manrope,sans-serif">Doctor Portal</span>
              <span class="text-xs" style="color:var(--text-dim)">Demo login</span>
            </button>
          </div>
          <div class="mt-3 p-3 rounded-xl text-xs space-y-1" style="background:var(--surface2);border:1px solid var(--border)">
            <div class="font-bold mb-1" style="color:var(--text-muted);font-family:Manrope,sans-serif">Demo credentials</div>
            <div style="color:var(--text-dim)">Patient: <span class="font-mono" style="color:var(--brand)">patient@oralai.demo</span> / <span class="font-mono" style="color:var(--text-muted)">demo1234</span></div>
            <div style="color:var(--text-dim)">Doctor:&nbsp; <span class="font-mono" style="color:var(--coral)">doctor@oralai.demo</span> / <span class="font-mono" style="color:var(--text-muted)">demo1234</span></div>
          </div>

          <p class="mt-6 text-center text-sm" style="color:var(--text-dim)">
            No account?
            <a href="#" onclick="showPanel('register')" class="font-semibold" style="color:var(--brand)">Create one free</a>
          </p>
        </div>

        <!-- Register Panel -->
        <div id="register-panel" class="hidden">
          <h2 class="text-2xl font-black mb-1" style="font-family:Manrope,sans-serif;color:var(--text-base)">Create account</h2>
          <p class="mb-6 text-sm" style="color:var(--text-muted)">Start monitoring your oral health today</p>
          <form onsubmit="handleRegister(event)" class="space-y-4" autocomplete="on">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="form-label">First name</label>
                <input id="reg-first" type="text" class="form-input" placeholder="John" autocomplete="given-name" required />
              </div>
              <div>
                <label class="form-label">Last name</label>
                <input id="reg-last" type="text" class="form-input" placeholder="Doe" autocomplete="family-name" required />
              </div>
            </div>
            <div>
              <label class="form-label">Email</label>
              <input id="reg-email" type="email" class="form-input" placeholder="you@example.com" autocomplete="email" required />
            </div>
            <div>
              <label class="form-label">Password</label>
              <div class="relative">
                <input id="reg-pass" type="password" class="form-input pr-10" placeholder="Min 8 characters"
                       minlength="8" autocomplete="new-password" required />
                <button type="button" onclick="togglePasswordVis('reg-pass')"
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-xs" style="color:var(--text-dim)">👁</button>
              </div>
            </div>
            <div>
              <label class="form-label">Date of Birth</label>
              <input id="reg-dob" type="date" class="form-input" autocomplete="bday" />
            </div>
            <div>
              <label class="form-label">I am a</label>
              <div class="grid grid-cols-2 gap-3 mt-1">
                <label class="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:opacity-90 transition-opacity" style="border:1.5px solid var(--border);background:var(--surface2)">
                  <input type="radio" name="reg-role" value="patient" checked style="accent-color:var(--brand)" />
                  <div>
                    <div class="text-sm font-semibold" style="color:var(--text-base);font-family:Manrope,sans-serif">Patient</div>
                    <div class="text-xs" style="color:var(--text-dim)">Personal health tracking</div>
                  </div>
                </label>
                <label class="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:opacity-90 transition-opacity" style="border:1.5px solid var(--border);background:var(--surface2)">
                  <input type="radio" name="reg-role" value="doctor" style="accent-color:var(--coral)" />
                  <div>
                    <div class="text-sm font-semibold" style="color:var(--text-base);font-family:Manrope,sans-serif">Doctor</div>
                    <div class="text-xs" style="color:var(--text-dim)">Clinical review &amp; oversight</div>
                  </div>
                </label>
              </div>
            </div>
            <div id="reg-speciality-row" class="hidden">
              <label class="form-label">Speciality</label>
              <select id="reg-speciality" class="form-input">
                <option value="">Select speciality…</option>
                <option>General Dentistry</option>
                <option>Periodontology</option>
                <option>Orthodontics</option>
                <option>Oral Surgery</option>
                <option>Endodontics</option>
                <option>Paediatric Dentistry</option>
                <option>Oral Medicine</option>
              </select>
            </div>
            <button type="submit" class="btn-primary w-full justify-center py-3 text-base">
              Create Account
            </button>
          </form>
          <p class="mt-6 text-center text-sm" style="color:var(--text-dim)">
            Already have an account?
            <a href="#" onclick="showPanel('login')" class="font-semibold" style="color:var(--brand)">Sign in</a>
          </p>
        </div>
      </div>
    </div>
  </div>
  <div id="toast"></div>
  `;
}

function showPanel(name) {
  ['login-panel', 'register-panel', 'forgot-panel'].forEach(id => {
    document.getElementById(id)?.classList.toggle('hidden', id !== name + '-panel');
  });
}

// ── Forgot Password Panel ──
// Inject it into the auth form area when showPanel('forgot') is called.
// Since renderLoginPage() has a fixed template, we inject the panel dynamically.
document.addEventListener('DOMContentLoaded', () => {
  // Panel is injected on demand via showPanel
});

function _injectForgotPanel() {
  if (document.getElementById('forgot-panel')) return;
  const container = document.querySelector('#auth-panel') || document.querySelector('.w-full.max-w-md > div');
  if (!container) return;
  const div = document.createElement('div');
  div.id = 'forgot-panel';
  div.className = 'hidden';
  div.innerHTML = `
    <h2 class="text-2xl font-bold text-white mb-1">Reset Password</h2>
    <p class="text-gray-400 mb-7 text-sm">
      Enter your email address and we'll send you a recovery link.<br/>
      <span class="text-gray-600">(In demo mode your password is reset instantly.)</span>
    </p>
    <div id="forgot-success" class="hidden p-4 rounded-xl bg-green-500/10 border border-green-500/30 text-green-300 text-sm mb-5 space-y-1">
      <div class="font-semibold">✅ Recovery email sent!</div>
      <div class="text-green-400/70">Check your inbox for a link to reset your password.</div>
    </div>
    <form onsubmit="handleForgotPassword(event)" class="space-y-4">
      <div>
        <label class="form-label">Email address</label>
        <input id="forgot-email" type="email" class="form-input"
               placeholder="you@example.com" autocomplete="email" required />
      </div>
      <button type="submit" class="btn-primary w-full justify-center py-3 text-base">
        Send Recovery Link
      </button>
    </form>
    <p class="mt-6 text-center text-sm text-gray-500">
      Remembered it?
      <a href="#" onclick="showPanel('login')" class="text-brand-400 hover:text-brand-300 font-semibold">Back to Sign In</a>
    </p>
  `;
  container.appendChild(div);
}

function showPanel(name) {
  // Ensure forgot panel exists in DOM
  _injectForgotPanel();
  ['login-panel', 'register-panel', 'forgot-panel'].forEach(id => {
    document.getElementById(id)?.classList.toggle('hidden', id !== name + '-panel');
  });
}

function togglePasswordVis(id) {
  const el = document.getElementById(id);
  if (el) el.type = el.type === 'password' ? 'text' : 'password';
}

function _bootApp(user) {
  // Ensure role is always set
  if (!user.role) user.role = 'patient';

  hydrateState();
  AppState.user = user;
  Store.saveUser(user);
  Store.setLoggedIn(true);

  // Route to the correct default page based on role
  const defaultPage = user.role === 'doctor' ? 'doctor_dashboard'
                    : user.role === 'admin'   ? 'admin_dashboard'
                    :                          'patient_dashboard';
  localStorage.setItem('oralai_lastRoute', JSON.stringify({ page: defaultPage, params: {} }));

  renderShell();
  registerAllPages();
  navigate(defaultPage);

  // Update nav user display
  const av = document.getElementById('nav-avatar');
  const un = document.getElementById('nav-username');
  if (av) av.textContent = user.name.charAt(0).toUpperCase();
  if (un) un.textContent = user.name;

  setTimeout(() => {
    if (typeof initKeyboardShortcuts === 'function') initKeyboardShortcuts();
    if (typeof _initBackToTop        === 'function') _initBackToTop();
    if (typeof checkBackend          === 'function') {
      checkBackend();
      setInterval(checkBackend, 30000);
    }
    if (typeof _refreshNotifBadge === 'function') {
      document.addEventListener('page:rendered', _refreshNotifBadge);
      _refreshNotifBadge();
    }
    if (typeof applyTheme === 'function') {
      applyTheme(AppState.settings.theme || 'dark');
    }
    if (typeof maybeShowOnboarding === 'function') maybeShowOnboarding();
  }, 0);
}

function handleLogin(e) {
  e.preventDefault();
  const email    = document.getElementById('login-email').value.trim();
  const pass     = document.getElementById('login-pass').value;
  const remember = document.getElementById('remember-me').checked;

  if (!email || pass.length < 4) {
    showAuthToast('Enter valid email and password (min 4 chars)', 'error'); return;
  }

  // ── Built-in demo accounts ────────────────────────────────────────────────
  const DEMO_ACCOUNTS = {
    'patient@oralai.demo':  { name:'Alex Patient',   email:'patient@oralai.demo',  role:'patient', dob:'1990-05-14', joinedDate:'2026-01-01T00:00:00Z', avatarColor:'#00d4aa,#06b6d4' },
    'doctor@oralai.demo':   { name:'Dr. Sarah Chen',  email:'doctor@oralai.demo',   role:'doctor',  dob:'1985-03-22', joinedDate:'2026-01-01T00:00:00Z', avatarColor:'#a855f7,#6366f1', speciality:'Periodontology', licenseNo:'DDS-2024-7821' },
    'admin@oralai.demo':    { name:'Admin User',      email:'admin@oralai.demo',    role:'admin',   dob:'', joinedDate:'2026-01-01T00:00:00Z', avatarColor:'#f59e0b,#ef4444' },
    'demo@oralai.com':      { name:'Demo User',       email:'demo@oralai.com',      role:'patient', dob:'', joinedDate:'2026-01-01T00:00:00Z', avatarColor:'#00d4aa,#06b6d4' },
  };

  if (DEMO_ACCOUNTS[email]) {
    _bootApp(DEMO_ACCOUNTS[email]);
    if (!remember) sessionStorage.setItem('noRemember','1');
    return;
  }

  // Check stored user
  const saved = Store.loadUser();
  if (saved && saved.email === email) {
    _bootApp(saved);
  } else {
    const name = email.split('@')[0].replace(/[._]/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
    _bootApp({ name, email, dob:'', joinedDate: new Date().toISOString(), role:'patient' });
  }
  if (!remember) sessionStorage.setItem('noRemember','1');
}

function handleRegister(e) {
  e.preventDefault();
  const first      = document.getElementById('reg-first').value.trim();
  const last       = document.getElementById('reg-last').value.trim();
  const email      = document.getElementById('reg-email').value.trim();
  const dob        = document.getElementById('reg-dob').value;
  const roleEl     = document.querySelector('input[name="reg-role"]:checked');
  const role       = roleEl ? roleEl.value : 'patient';
  const speciality = document.getElementById('reg-speciality')?.value || '';
  if (!first || !email) { showAuthToast('Please fill all required fields','error'); return; }
  const user = {
    name: `${first} ${last}`.trim(),
    email, dob, role, speciality,
    joinedDate: new Date().toISOString(),
    avatarColor: role === 'doctor' ? '#a855f7,#6366f1' : '#00d4aa,#06b6d4',
  };
  _bootApp(user);
  showToast(`Welcome, ${first}! Your ${role} account is ready.`, 'success');
}

// Show/hide speciality field based on role selection
document.addEventListener('change', (e) => {
  if (e.target.name === 'reg-role') {
    const row = document.getElementById('reg-speciality-row');
    if (row) row.classList.toggle('hidden', e.target.value !== 'doctor');
  }
});

function quickDemo() {
  _bootApp({ name:'Demo User', email:'demo@oralai.com', role:'patient', dob:'', joinedDate: new Date().toISOString(), avatarColor:'#00d4aa,#06b6d4' });
}

function quickDemoDoctor() {
  _bootApp({ name:'Dr. Sarah Chen', email:'doctor@oralai.demo', role:'doctor', dob:'1985-03-22', joinedDate:'2026-01-01T00:00:00Z', avatarColor:'#a855f7,#6366f1', speciality:'Periodontology', licenseNo:'DDS-2024-7821' });
}

function showAuthToast(msg, type) {
  const t = document.getElementById('toast');
  if (!t) return;
  const div = document.createElement('div');
  div.className = `toast-msg ${type}`;
  div.innerHTML = `<span>${type==='error'?'❌':'✅'}</span><span>${msg}</span>`;
  t.appendChild(div);
  setTimeout(() => div.remove(), 3500);
}

function handleForgotPassword(e) {
  e.preventDefault();
  const email = document.getElementById('forgot-email')?.value.trim();
  if (!email) return;

  const btn = e.target.querySelector('button[type="submit"]');
  if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }

  // Simulate API call delay
  setTimeout(() => {
    // In demo mode: if the email matches the stored user, show success + auto-reset hint
    const stored = Store.loadUser();
    const success = document.getElementById('forgot-success');
    if (success) {
      success.classList.remove('hidden');
      if (stored && stored.email === email) {
        success.innerHTML = `
          <div class="font-semibold">✅ Recovery email sent to ${email}</div>
          <div class="text-green-400/70 text-xs mt-1">
            <strong>Demo mode:</strong> Your password has been reset to <code class="bg-green-900/40 px-1 rounded">demo1234</code>
          </div>`;
      } else {
        success.innerHTML = `
          <div class="font-semibold">✅ If that email exists, a recovery link has been sent.</div>
          <div class="text-green-400/70 text-xs mt-1">Check your inbox and spam folder.</div>`;
      }
    }
    if (btn) { btn.disabled = false; btn.textContent = 'Resend Link'; }
    // Auto-return to login after 3.5 s
    setTimeout(() => showPanel('login'), 3500);
  }, 1200);
}
