// ── Public Landing Page ──
// Shown as the default route before login.
// Not part of the authenticated shell — rendered directly into #app.

function renderLandingPage() {
  document.getElementById('app').innerHTML = `
  <div class="min-h-screen bg-gray-950 text-gray-100" style="font-family:'Segoe UI',system-ui,sans-serif;">

    <!-- ── Navbar ── -->
    <nav style="position:sticky;top:0;z-index:50;background:rgba(3,7,18,0.92);backdrop-filter:blur(12px);border-bottom:1px solid #1e2a3a;">
      <div style="max-width:1100px;margin:0 auto;padding:0 24px;height:60px;display:flex;align-items:center;justify-content:space-between;">
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="width:34px;height:34px;border-radius:10px;background:linear-gradient(135deg,#0a8aff,#0070eb);display:flex;align-items:center;justify-content:center;font-size:1.1rem;">🦷</div>
          <span style="font-weight:800;font-size:1.1rem;color:#fff;">OralAI</span>
        </div>
        <div style="display:flex;align-items:center;gap:12px;">
          <a href="#features" onclick="smoothScroll('features')" style="color:#94a3b8;text-decoration:none;font-size:0.875rem;display:none;" class="sm-show">Features</a>
          <a href="#how" onclick="smoothScroll('how')" style="color:#94a3b8;text-decoration:none;font-size:0.875rem;display:none;" class="sm-show">How it Works</a>
          <button onclick="showLoginFromLanding()"
            style="background:#1e2a3a;border:1px solid #334155;color:#94a3b8;padding:7px 16px;border-radius:8px;cursor:pointer;font-size:0.85rem;font-weight:600;">
            Sign In
          </button>
          <button onclick="showRegisterFromLanding()"
            style="background:linear-gradient(135deg,#0a8aff,#0070eb);border:none;color:#fff;padding:7px 18px;border-radius:8px;cursor:pointer;font-size:0.85rem;font-weight:700;">
            Get Started
          </button>
        </div>
      </div>
    </nav>

    <!-- ── Hero ── -->
    <section style="max-width:1100px;margin:0 auto;padding:80px 24px 60px;text-align:center;">
      <!-- Badge -->
      <div style="display:inline-flex;align-items:center;gap:8px;background:#0a8aff18;border:1px solid #0a8aff44;border-radius:999px;padding:5px 14px;font-size:0.78rem;color:#50c3ff;font-weight:600;margin-bottom:24px;">
        <span style="width:7px;height:7px;border-radius:50%;background:#28a8ff;display:inline-block;animation:pulse-dot 1.5s ease-in-out infinite;"></span>
        Real-Time AI · IoT Integration · Edge Computing
      </div>

      <h1 style="font-size:clamp(2rem,5vw,3.5rem);font-weight:900;color:#fff;line-height:1.15;margin-bottom:20px;letter-spacing:-0.02em;">
        Detect Oral Diseases<br/>
        <span style="background:linear-gradient(135deg,#28a8ff,#10b981);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">
          Before They Become Serious
        </span>
      </h1>

      <p style="max-width:580px;margin:0 auto 36px;color:#94a3b8;font-size:1.05rem;line-height:1.7;">
        OralAI combines Convolutional Neural Networks with IoT biosensors to deliver
        instant, accurate oral disease detection — from anywhere, on any device.
      </p>

      <div style="display:flex;gap:14px;justify-content:center;flex-wrap:wrap;margin-bottom:48px;">
        <button onclick="quickDemoFromLanding()"
          style="background:linear-gradient(135deg,#0a8aff,#0070eb);border:none;color:#fff;
                 padding:13px 28px;border-radius:10px;cursor:pointer;font-size:1rem;font-weight:700;
                 display:inline-flex;align-items:center;gap:8px;box-shadow:0 4px 24px #0a8aff44;">
          🚀 Try Live Demo
        </button>
        <button onclick="smoothScroll('how')"
          style="background:#1e2a3a;border:1px solid #334155;color:#cbd5e1;
                 padding:13px 28px;border-radius:10px;cursor:pointer;font-size:1rem;font-weight:600;">
          See How It Works ↓
        </button>
      </div>

      <!-- Stats row -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:16px;max-width:680px;margin:0 auto;">
        ${[
          ['95.2%',  'Detection Accuracy'],
          ['< 2s',   'Analysis Time'],
          ['8',      'Disease Classes'],
          ['4',      'IoT Sensors'],
        ].map(([val,lbl]) => `
          <div style="background:#0d1117;border:1px solid #1e2a3a;border-radius:12px;padding:18px 12px;text-align:center;">
            <div style="font-size:1.6rem;font-weight:900;color:#28a8ff;">${val}</div>
            <div style="font-size:0.78rem;color:#64748b;margin-top:4px;">${lbl}</div>
          </div>`).join('')}
      </div>
    </section>

    <!-- ── Features ── -->
    <section id="features" style="max-width:1100px;margin:0 auto;padding:60px 24px;">
      <h2 style="text-align:center;font-size:1.9rem;font-weight:800;color:#fff;margin-bottom:8px;">
        Everything you need for oral health
      </h2>
      <p style="text-align:center;color:#64748b;margin-bottom:40px;font-size:0.95rem;">
        A complete AI-powered platform built on the latest research
      </p>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px;">
        ${[
          ['🧠','CNN Disease Classification',
           'EfficientNetB0 deep learning model classifies 8 oral disease classes with 95.2% accuracy from intraoral images.'],
          ['📡','IoT Biosensor Fusion',
           'Real-time pH, temperature, bacterial activity, and moisture readings fused with image analysis for higher accuracy.'],
          ['⚡','Edge + Cloud Computing',
           'Low-latency local inference via edge computing, with secure cloud storage for all patient records.'],
          ['📋','Detailed AI Reports',
           'Every scan generates a downloadable, printable screening report with score, findings, and personalised recommendations.'],
          ['📹','Tele-Dentistry',
           'Book video or in-person consultations with certified dental specialists directly from the app.'],
          ['📱','Progressive Web App',
           'Install OralAI on your home screen. Works offline with full scan history and reports available without internet.'],
        ].map(([icon, title, desc]) => `
          <div style="background:#0d1117;border:1px solid #1e2a3a;border-radius:14px;padding:24px;
                      transition:border-color 0.2s,transform 0.2s;"
               onmouseover="this.style.borderColor='#28a8ff44';this.style.transform='translateY(-2px)'"
               onmouseout="this.style.borderColor='#1e2a3a';this.style.transform='translateY(0)'">
            <div style="font-size:2rem;margin-bottom:12px;">${icon}</div>
            <div style="font-size:1rem;font-weight:700;color:#f1f5f9;margin-bottom:8px;">${title}</div>
            <div style="font-size:0.875rem;color:#64748b;line-height:1.65;">${desc}</div>
          </div>`).join('')}
      </div>
    </section>

    <!-- ── How it works ── -->
    <section id="how" style="background:#080d14;border-top:1px solid #1e2a3a;border-bottom:1px solid #1e2a3a;padding:60px 24px;">
      <div style="max-width:900px;margin:0 auto;">
        <h2 style="text-align:center;font-size:1.9rem;font-weight:800;color:#fff;margin-bottom:8px;">
          How OralAI Works
        </h2>
        <p style="text-align:center;color:#64748b;margin-bottom:48px;font-size:0.95rem;">
          From photo to diagnosis in under 2 seconds
        </p>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:0;">
          ${[
            ['1','📸','Capture','Take or upload an intraoral photo with your smartphone or IoT camera'],
            ['2','⚙️','Preprocess','Image is resized, normalised, and enhanced for optimal CNN input'],
            ['3','🧠','Analyse','CNN + sensor fusion detects and classifies oral disease conditions'],
            ['4','📋','Report','Receive your score, findings, and actionable recommendations instantly'],
          ].map(([n, icon, title, desc], i, arr) => `
            <div style="text-align:center;padding:0 20px;position:relative;">
              ${i < arr.length - 1 ? `<div style="position:absolute;top:28px;right:-2px;width:50%;height:2px;background:linear-gradient(90deg,#28a8ff44,transparent);z-index:0;"></div>` : ''}
              <div style="width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#0a8aff22,#0070eb22);
                          border:2px solid #28a8ff44;display:flex;align-items:center;justify-content:center;
                          font-size:1.4rem;margin:0 auto 16px;position:relative;z-index:1;">${icon}</div>
              <div style="font-size:0.7rem;color:#28a8ff;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;">Step ${n}</div>
              <div style="font-size:1rem;font-weight:700;color:#f1f5f9;margin-bottom:8px;">${title}</div>
              <div style="font-size:0.83rem;color:#64748b;line-height:1.6;">${desc}</div>
            </div>`).join('')}
        </div>
      </div>
    </section>

    <!-- ── Disease classes ── -->
    <section style="max-width:1100px;margin:0 auto;padding:60px 24px;">
      <h2 style="text-align:center;font-size:1.9rem;font-weight:800;color:#fff;margin-bottom:8px;">
        Detects 8 Oral Conditions
      </h2>
      <p style="text-align:center;color:#64748b;margin-bottom:36px;font-size:0.95rem;">
        All major oral diseases classified in a single scan
      </p>
      <div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center;">
        ${[
          ['🦷','Dental Caries','#28a8ff'],
          ['🔴','Gingivitis','#10b981'],
          ['🟡','Plaque Accumulation','#f59e0b'],
          ['⬜','Enamel Demineralization','#a78bfa'],
          ['🦷','Periodontal Disease','#f472b6'],
          ['🔵','Oral Ulcer','#34d399'],
          ['🟠','Oral Lesion','#ef4444'],
          ['✅','Healthy','#64748b'],
        ].map(([icon, name, color]) => `
          <div style="display:inline-flex;align-items:center;gap:8px;background:#0d1117;
                      border:1px solid #1e2a3a;border-radius:999px;padding:8px 16px;">
            <span style="width:8px;height:8px;border-radius:50%;background:${color};flex-shrink:0;"></span>
            <span style="font-size:0.85rem;color:#cbd5e1;font-weight:500;">${name}</span>
          </div>`).join('')}
      </div>
    </section>

    <!-- ── CTA ── -->
    <section style="background:linear-gradient(135deg,#051428,#0a1f3c);border-top:1px solid #1e3a5f;padding:60px 24px;text-align:center;">
      <div style="max-width:560px;margin:0 auto;">
        <div style="font-size:2.5rem;margin-bottom:16px;">🦷</div>
        <h2 style="font-size:1.9rem;font-weight:800;color:#fff;margin-bottom:12px;">
          Start monitoring today
        </h2>
        <p style="color:#94a3b8;margin-bottom:28px;font-size:0.95rem;line-height:1.7;">
          Free to use. No hardware required to get started — just a smartphone camera.
          Upload your first scan and get an AI report in seconds.
        </p>
        <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
          <button onclick="quickDemoFromLanding()"
            style="background:linear-gradient(135deg,#0a8aff,#0070eb);border:none;color:#fff;
                   padding:13px 30px;border-radius:10px;cursor:pointer;font-size:1rem;font-weight:700;">
            🚀 Try Free Demo
          </button>
          <button onclick="showRegisterFromLanding()"
            style="background:#1e2a3a;border:1px solid #334155;color:#cbd5e1;
                   padding:13px 26px;border-radius:10px;cursor:pointer;font-size:0.95rem;font-weight:600;">
            Create Account →
          </button>
        </div>
      </div>
    </section>

    <!-- ── Footer ── -->
    <footer style="background:#080d14;border-top:1px solid #1e2a3a;padding:32px 24px;text-align:center;">
      <div style="max-width:1100px;margin:0 auto;">
        <div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:12px;">
          <span style="font-size:1.3rem;">🦷</span>
          <span style="font-weight:700;color:#94a3b8;">OralAI</span>
        </div>
        <p style="color:#475569;font-size:0.8rem;margin-bottom:8px;">
          Real-Time Oral Disease Detection Using IoT &amp; AI
        </p>
        <p style="color:#334155;font-size:0.75rem;">
          Bearys Institute of Technology · Department of AI &amp; Data Science · Karnataka, India · 2026
        </p>
      </div>
    </footer>

    <style>
      @keyframes pulse-dot { 0%,100%{opacity:1} 50%{opacity:0.4} }
      @media (min-width:640px) { .sm-show { display:inline !important; } }
      html { scroll-behavior: smooth; }
    </style>
    <div id="toast"></div>
  </div>
  `;
}

function smoothScroll(id) {
  event.preventDefault();
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

function showLoginFromLanding() {
  document.getElementById('app').innerHTML = '';
  renderLoginPage();
}

function showRegisterFromLanding() {
  document.getElementById('app').innerHTML = '';
  renderLoginPage();
  // Flip to register panel after paint
  setTimeout(() => showPanel('register'), 50);
}

function quickDemoFromLanding() {
  // _bootApp is deferred so app.js functions are safe to call here
  if (typeof _bootApp === 'function') {
    _bootApp({ name:'Demo User', email:'demo@oralai.com', dob:'', joinedDate: new Date().toISOString() });
  } else {
    // Fallback: go to login page and auto-fill
    showLoginFromLanding();
    setTimeout(() => {
      const e = document.getElementById('login-email');
      const p = document.getElementById('login-pass');
      if (e) e.value = 'demo@oralai.com';
      if (p) p.value = 'demo1234';
    }, 100);
  }
}
