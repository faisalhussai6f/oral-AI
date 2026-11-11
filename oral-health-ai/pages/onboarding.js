// ── Onboarding Wizard ──
// Shown once on first login. State stored in localStorage.

const ONBOARDING_KEY = 'oralai_onboarding_done';

function shouldShowOnboarding() {
  return !localStorage.getItem(ONBOARDING_KEY);
}

function markOnboardingDone() {
  localStorage.setItem(ONBOARDING_KEY, '1');
}

function resetOnboarding() {
  localStorage.removeItem(ONBOARDING_KEY);
}

// ── Slide definitions ──
const ONBOARDING_SLIDES = [
  {
    icon: '🦷',
    title: 'Welcome to OralAI',
    subtitle: 'Real-Time Oral Disease Detection',
    body: 'AI + IoT powered oral health monitoring built at Bearys Institute of Technology. Detect dental conditions early — from your home.',
    color: '#28a8ff',
    features: null,
  },
  {
    icon: '📸',
    title: 'Upload a Dental Scan',
    subtitle: 'Step 1 — Start with a photo',
    body: 'Take a clear intraoral photo with your smartphone or IoT intraoral camera and upload it for instant AI analysis.',
    color: '#10b981',
    features: [
      'Supports JPEG, PNG, WebP up to 10 MB',
      'Basic RGB (smartphone) or Advanced Spectral mode',
      'Drag-and-drop or click to upload',
    ],
  },
  {
    icon: '🧠',
    title: 'CNN AI Analysis',
    subtitle: 'Step 2 — Instant diagnosis',
    body: 'Our Convolutional Neural Network classifies oral diseases from your image in seconds — caries, gingivitis, plaque, enamel erosion and more.',
    color: '#a78bfa',
    features: [
      '95.2% accuracy on 8 disease classes',
      'Decision fusion with IoT biosensor data',
      'Detailed per-finding confidence scores',
    ],
  },
  {
    icon: '📡',
    title: 'IoT Sensor Monitoring',
    subtitle: 'Step 3 — Live biochemical data',
    body: 'Smart biosensors continuously measure your oral health parameters and feed into every AI analysis for higher accuracy.',
    color: '#f59e0b',
    features: [
      'Saliva pH (normal 6.5–7.5)',
      'Oral temperature (normal 36.1–37.2°C)',
      'Bacterial activity & moisture levels',
    ],
  },
  {
    icon: '📋',
    title: 'Detailed Reports',
    subtitle: 'Step 4 — Download & share',
    body: 'Every scan generates a full AI Screening Report you can download, print, and share directly with your dentist.',
    color: '#f472b6',
    features: [
      'Oral health score (0–100)',
      'Per-finding severity & confidence',
      'Personalized treatment recommendations',
    ],
  },
  {
    icon: '📹',
    title: 'Tele-Dentistry',
    subtitle: 'Step 5 — Consult from anywhere',
    body: 'Book video or in-person consultations with certified dental specialists. Your scan report is automatically shared with them.',
    color: '#34d399',
    features: [
      '6 specialist dentists available',
      'Video call or in-person booking',
      'Automatic report sharing',
    ],
  },
  {
    icon: '✅',
    title: "You're all set!",
    subtitle: 'Start monitoring your oral health',
    body: "Everything is ready. Upload your first scan to get your baseline oral health score, or explore the dashboard to see sample data.",
    color: '#10b981',
    features: null,
  },
];

// ── Inject onboarding overlay into DOM ──
function showOnboarding() {
  // Remove any existing overlay
  document.getElementById('onboarding-overlay')?.remove();

  let currentSlide = 0;
  const total = ONBOARDING_SLIDES.length;

  const overlay = document.createElement('div');
  overlay.id = 'onboarding-overlay';
  overlay.style.cssText = `
    position:fixed; inset:0; z-index:300;
    background:rgba(0,0,0,0.85);
    display:flex; align-items:center; justify-content:center;
    padding:20px; backdrop-filter:blur(6px);
  `;

  function renderSlide() {
    const s = ONBOARDING_SLIDES[currentSlide];
    const isLast = currentSlide === total - 1;
    const isFirst = currentSlide === 0;

    overlay.innerHTML = `
      <div style="
        background:#0d1117; border:1px solid #1e2a3a; border-radius:20px;
        width:100%; max-width:520px; overflow:hidden;
        box-shadow:0 30px 80px rgba(0,0,0,0.7);
        animation:onboardIn 0.35s cubic-bezier(0.34,1.56,0.64,1);
      ">
        <!-- Progress bar -->
        <div style="height:3px; background:#1e2a3a;">
          <div style="height:100%; width:${((currentSlide+1)/total)*100}%;
            background:linear-gradient(90deg,${s.color},${s.color}aa);
            transition:width 0.4s ease;"></div>
        </div>

        <!-- Header -->
        <div style="padding:32px 32px 0; text-align:center;">
          <div style="
            width:72px; height:72px; border-radius:50%; margin:0 auto 16px;
            background:${s.color}22; border:2px solid ${s.color}44;
            display:flex; align-items:center; justify-content:center;
            font-size:2.2rem;
          ">${s.icon}</div>
          <p style="color:${s.color}; font-size:0.75rem; font-weight:700;
            text-transform:uppercase; letter-spacing:0.1em; margin-bottom:6px;">
            ${s.subtitle}
          </p>
          <h2 style="color:#f1f5f9; font-size:1.5rem; font-weight:800; margin-bottom:12px;">
            ${s.title}
          </h2>
          <p style="color:#94a3b8; font-size:0.9rem; line-height:1.7; max-width:380px; margin:0 auto;">
            ${s.body}
          </p>
        </div>

        <!-- Features list -->
        ${s.features ? `
        <div style="padding:20px 32px 0;">
          <div style="background:#111827; border:1px solid #1e2a3a; border-radius:12px; padding:16px;">
            ${s.features.map(f => `
              <div style="display:flex; align-items:center; gap:10px; padding:6px 0;
                border-bottom:1px solid #1e2a3a; last-child:border:0;">
                <span style="color:${s.color}; font-size:1rem; flex-shrink:0;">✓</span>
                <span style="color:#cbd5e1; font-size:0.85rem;">${f}</span>
              </div>
            `).join('')}
          </div>
        </div>` : ''}

        <!-- Dot indicators -->
        <div style="display:flex; justify-content:center; gap:6px; padding:20px 32px 0;">
          ${ONBOARDING_SLIDES.map((_,i) => `
            <div onclick="goToSlide(${i})" style="
              width:${i===currentSlide?'20px':'8px'}; height:8px; border-radius:4px;
              background:${i===currentSlide?s.color:'#1e2a3a'};
              transition:all 0.3s ease; cursor:pointer;
            "></div>
          `).join('')}
        </div>

        <!-- Actions -->
        <div style="padding:20px 32px 28px; display:flex; gap:10px; justify-content:space-between; align-items:center;">
          <button onclick="skipOnboarding()"
            style="background:none; border:none; color:#64748b; cursor:pointer;
              font-size:0.85rem; padding:6px 0; text-decoration:underline;">
            ${isFirst ? 'Skip tour' : 'Skip'}
          </button>
          <div style="display:flex; gap:10px;">
            ${!isFirst ? `
            <button onclick="prevSlide()"
              style="background:#1e2a3a; border:1px solid #334155; color:#94a3b8;
                padding:10px 20px; border-radius:8px; cursor:pointer; font-size:0.875rem;
                font-weight:600; transition:all 0.2s;">
              ← Back
            </button>` : ''}
            <button onclick="${isLast ? 'finishOnboarding()' : 'nextSlide()'}"
              style="background:linear-gradient(135deg,${s.color},${s.color}cc);
                border:none; color:#fff; padding:10px 24px; border-radius:8px;
                cursor:pointer; font-size:0.875rem; font-weight:700;
                transition:all 0.2s; box-shadow:0 4px 14px ${s.color}44;">
              ${isLast ? '🚀 Get Started' : 'Next →'}
            </button>
          </div>
        </div>

        <!-- Step counter -->
        <div style="padding:0 32px 16px; text-align:center;">
          <span style="color:#475569; font-size:0.75rem;">
            ${currentSlide+1} of ${total}
          </span>
        </div>
      </div>

      <style>
        @keyframes onboardIn {
          from { opacity:0; transform:scale(0.92) translateY(16px); }
          to   { opacity:1; transform:scale(1) translateY(0); }
        }
      </style>
    `;
  }

  // Expose control functions on window so inline onclick works
  window.nextSlide = () => {
    if (currentSlide < total - 1) { currentSlide++; renderSlide(); }
  };
  window.prevSlide = () => {
    if (currentSlide > 0) { currentSlide--; renderSlide(); }
  };
  window.goToSlide = (i) => {
    currentSlide = i; renderSlide();
  };
  window.skipOnboarding = () => {
    markOnboardingDone();
    overlay.remove();
    showToast('Tour skipped — you can replay it from Profile', 'info');
  };
  window.finishOnboarding = () => {
    markOnboardingDone();
    overlay.remove();
    showToast('🎉 Welcome to OralAI! Upload your first scan to begin.', 'success');
    navigate('upload');
  };

  // Keyboard nav
  const onKey = (e) => {
    if (e.key === 'ArrowRight' || e.key === 'Enter') window.nextSlide();
    if (e.key === 'ArrowLeft')  window.prevSlide();
    if (e.key === 'Escape')     window.skipOnboarding();
  };
  document.addEventListener('keydown', onKey);
  // Clean up listener when overlay removed
  const obs = new MutationObserver(() => {
    if (!document.getElementById('onboarding-overlay')) {
      document.removeEventListener('keydown', onKey);
      obs.disconnect();
    }
  });
  obs.observe(document.body, { childList: true });

  renderSlide();
  document.body.appendChild(overlay);
}

// Called once from auth.js after first login
function maybeShowOnboarding() {
  if (shouldShowOnboarding()) {
    // Small delay so shell is fully rendered first
    setTimeout(showOnboarding, 600);
  }
}
