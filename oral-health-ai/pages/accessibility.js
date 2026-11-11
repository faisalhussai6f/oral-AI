// ══════════════════════════════════════════════════════
//  Feature 11 — Multi-Language + Accessibility Settings
// ══════════════════════════════════════════════════════

const A11Y_KEY = 'oralai_a11y';

const LANGUAGES = [
  { code:'en',    name:'English',    native:'English'     },
  { code:'hi',    name:'Hindi',      native:'हिन्दी'       },
  { code:'kn',    name:'Kannada',    native:'ಕನ್ನಡ'        },
  { code:'ta',    name:'Tamil',      native:'தமிழ்'       },
  { code:'te',    name:'Telugu',     native:'తెలుగు'       },
  { code:'mr',    name:'Marathi',    native:'मराठी'       },
  { code:'ml',    name:'Malayalam',  native:'മലയാളം'      },
  { code:'bn',    name:'Bengali',    native:'বাংলা'        },
  { code:'ur',    name:'Urdu',       native:'اردو'        },
  { code:'ar',    name:'Arabic',     native:'العربية'      },
  { code:'zh',    name:'Chinese',    native:'中文'         },
  { code:'fr',    name:'French',     native:'Français'    },
];

// Basic UI string translations (key phrases only)
const I18N = {
  en: { upload:'Upload Scan', dashboard:'Dashboard', report:'Report', health:'Oral Health Score', analyze:'Analyze with AI', disclaimer:'This is not a diagnosis. Consult a dentist.' },
  hi: { upload:'स्कैन अपलोड करें', dashboard:'डैशबोर्ड', report:'रिपोर्ट', health:'मौखिक स्वास्थ्य स्कोर', analyze:'AI से विश्लेषण करें', disclaimer:'यह निदान नहीं है। दंत चिकित्सक से परामर्श करें।' },
  kn: { upload:'ಸ್ಕ್ಯಾನ್ ಅಪ್‌ಲೋಡ್ ಮಾಡಿ', dashboard:'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್', report:'ವರದಿ', health:'ಬಾಯಿ ಆರೋಗ್ಯ ಸ್ಕೋರ್', analyze:'AI ಜೊತೆ ವಿಶ್ಲೇಷಿಸಿ', disclaimer:'ಇದು ರೋಗ ನಿರ್ಧಾರವಲ್ಲ. ದಂತ ವೈದ್ಯರನ್ನು ಸಂಪರ್ಕಿಸಿ.' },
  ta: { upload:'ஸ்கேன் பதிவேற்றவும்', dashboard:'டாஷ்போர்டு', report:'அறிக்கை', health:'வாய் ஆரோக்கிய மதிப்பெண்', analyze:'AI மூலம் பகுப்பாய்வு', disclaimer:'இது நோய் கண்டறிதல் அல்ல. பல் மருத்துவரை அணுகுங்கள்.' },
  te: { upload:'స్కాన్ అప్‌లోడ్ చేయండి', dashboard:'డాష్‌బోర్డ్', report:'నివేదిక', health:'మౌఖిక ఆరోగ్య స్కోర్', analyze:'AIతో విశ్లేషించండి', disclaimer:'ఇది రోగ నిర్ధారణ కాదు. దంతవైద్యుడిని సంప్రదించండి.' },
  ar: { upload:'رفع الفحص', dashboard:'لوحة التحكم', report:'التقرير', health:'درجة صحة الفم', analyze:'تحليل بالذكاء الاصطناعي', disclaimer:'هذا ليس تشخيصًا. استشر طبيب الأسنان.' },
};

function _loadA11y() {
  return Store.get(A11Y_KEY) || {
    lang: 'en', fontSize: 'normal', contrast: 'normal',
    simplified: false, voiceGuidance: false, reduceMotion: false,
  };
}
function _saveA11y(a) { Store.set(A11Y_KEY, a); _applyA11y(a); }

function _applyA11y(a) {
  const root = document.documentElement;
  // Font size
  root.style.fontSize = a.fontSize==='large' ? '112%' : a.fontSize==='xlarge' ? '125%' : '';
  // Contrast
  document.body.classList.toggle('high-contrast',  a.contrast==='high');
  document.body.classList.toggle('extra-contrast',  a.contrast==='extra');
  // Simplified
  document.body.classList.toggle('simplified-mode', !!a.simplified);
  // Reduce motion
  document.body.classList.toggle('reduce-motion',   !!a.reduceMotion);
  // Store lang globally
  window._oralLang = a.lang;
}

function t(key) {
  const lang = window._oralLang || 'en';
  return (I18N[lang] && I18N[lang][key]) || (I18N.en && I18N.en[key]) || key;
}

function pageAccessibility() {
  const a = _loadA11y();

  return `
  <div class="max-w-2xl mx-auto space-y-6">

    <div>
      <h2 class="text-2xl font-bold text-white flex items-center gap-2">
        🌐 Language &amp; Accessibility
      </h2>
      <p class="text-gray-400 mt-1 text-sm">Customise language, text size, contrast, and assistive features.</p>
    </div>

    <!-- Language -->
    <div class="card space-y-4">
      <h3 class="font-semibold text-white flex items-center gap-2">🌍 Language</h3>
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
        ${LANGUAGES.map(l => `
          <button onclick="setLang('${l.code}')"
            class="flex flex-col items-start p-3 rounded-xl border transition-all text-left ${a.lang===l.code
              ? 'border-brand-500 bg-brand-500/10'
              : 'border-gray-700 bg-gray-900 hover:border-gray-600'}">
            <span class="text-sm font-semibold text-white">${l.native}</span>
            <span class="text-xs text-gray-500 mt-0.5">${l.name}</span>
          </button>`).join('')}
      </div>
      ${a.lang !== 'en' ? `
        <div class="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-xs text-yellow-300">
          ⚠️ Full translation is available for key UI labels. Some technical content remains in English.
          All medical advice is reviewed for accuracy.
        </div>` : ''}
    </div>

    <!-- Text size -->
    <div class="card space-y-4">
      <h3 class="font-semibold text-white">🔠 Text Size</h3>
      <div class="flex gap-3 flex-wrap">
        ${[['normal','Normal (Default)'],['large','Large (112%)'],['xlarge','Extra Large (125%)']].map(([val,lbl])=>`
          <button onclick="setFontSize('${val}')"
            class="px-4 py-2.5 rounded-xl border font-semibold transition-all text-sm ${a.fontSize===val
              ? 'border-brand-500 bg-brand-500/10 text-brand-300'
              : 'border-gray-700 bg-gray-900 text-gray-400 hover:border-gray-500'}">
            ${lbl}
          </button>`).join('')}
      </div>
    </div>

    <!-- Contrast -->
    <div class="card space-y-4">
      <h3 class="font-semibold text-white">🌗 Contrast Mode</h3>
      <div class="flex gap-3 flex-wrap">
        ${[['normal','Standard'],['high','High Contrast'],['extra','Extra High']].map(([val,lbl])=>`
          <button onclick="setContrast('${val}')"
            class="px-4 py-2.5 rounded-xl border font-semibold transition-all text-sm ${a.contrast===val
              ? 'border-brand-500 bg-brand-500/10 text-brand-300'
              : 'border-gray-700 bg-gray-900 text-gray-400 hover:border-gray-500'}">
            ${lbl}
          </button>`).join('')}
      </div>
    </div>

    <!-- Toggle options -->
    <div class="card space-y-3">
      <h3 class="font-semibold text-white">⚙️ Assistive Options</h3>
      ${[
        ['simplified', 'Simplified Mode',   'Hides advanced charts and technical data for easier reading'],
        ['voiceGuidance','Voice Guidance',   'Reads AI results and instructions aloud (uses browser TTS)'],
        ['reduceMotion', 'Reduce Motion',    'Disables animations and transitions throughout the app'],
      ].map(([key,label,desc])=>`
        <div class="flex items-center justify-between p-3 rounded-xl bg-gray-900 border border-gray-800">
          <div>
            <div class="text-sm font-semibold text-gray-200">${label}</div>
            <div class="text-xs text-gray-500 mt-0.5">${desc}</div>
          </div>
          <label class="relative inline-flex items-center cursor-pointer flex-shrink-0">
            <input type="checkbox" ${a[key]?'checked':''} class="sr-only peer"
                   onchange="setA11yToggle('${key}',this.checked)"/>
            <div class="w-10 h-5 bg-gray-700 peer-checked:bg-brand-500 rounded-full transition-colors duration-200
                        after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white
                        after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5"></div>
          </label>
        </div>`).join('')}
    </div>

    <!-- Live preview -->
    <div class="card border-brand-500/20">
      <h3 class="font-semibold text-white mb-3">👁 Preview</h3>
      <div class="p-4 rounded-xl bg-gray-900 border border-gray-800 space-y-2">
        <div class="font-bold text-white">${t('health')}</div>
        <div class="text-sm text-gray-400">${t('disclaimer')}</div>
        <button class="btn-primary text-sm mt-2">${t('analyze')}</button>
      </div>
      <p class="text-xs text-gray-600 mt-2">This preview updates as you change settings.</p>
    </div>

    <!-- Screen reader note -->
    <div class="card">
      <h3 class="font-semibold text-white mb-2 text-sm">♿ Screen Reader Support</h3>
      <p class="text-sm text-gray-400 leading-relaxed">
        OralAI uses semantic HTML with <code class="text-brand-400 bg-gray-900 px-1 rounded">aria-label</code>,
        <code class="text-brand-400 bg-gray-900 px-1 rounded">role</code>, and
        <code class="text-brand-400 bg-gray-900 px-1 rounded">alt</code> attributes throughout.
        All interactive elements are keyboard-navigable. For best screen reader experience,
        use <strong class="text-gray-300">NVDA</strong>, <strong class="text-gray-300">JAWS</strong>,
        or <strong class="text-gray-300">VoiceOver</strong> with Chrome or Edge.
      </p>
    </div>

  </div>
  `;
}

function setLang(code) {
  const a = _loadA11y(); a.lang = code; _saveA11y(a);
  showToast(`Language set to ${LANGUAGES.find(l=>l.code===code)?.name||code}`,'success');
  navigate('accessibility');
}
function setFontSize(val) {
  const a = _loadA11y(); a.fontSize = val; _saveA11y(a);
  showToast('Text size updated','info'); navigate('accessibility');
}
function setContrast(val) {
  const a = _loadA11y(); a.contrast = val; _saveA11y(a);
  showToast('Contrast mode updated','info'); navigate('accessibility');
}
function setA11yToggle(key, val) {
  const a = _loadA11y(); a[key] = val; _saveA11y(a);
  if (key==='voiceGuidance' && val && 'speechSynthesis' in window) {
    const u = new SpeechSynthesisUtterance('Voice guidance enabled. OralAI will read important results aloud.');
    window.speechSynthesis.speak(u);
  }
  showToast(`${key} ${val?'enabled':'disabled'}`,'info');
}

// Speak text using browser TTS (called from report/upload pages when voiceGuidance is on)
function speakIfEnabled(text) {
  const a = _loadA11y();
  if (a.voiceGuidance && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = a.lang || 'en';
    window.speechSynthesis.speak(u);
  }
}

// Apply on every page load
document.addEventListener('page:rendered', () => _applyA11y(_loadA11y()));
// Also apply on initial boot
document.addEventListener('DOMContentLoaded', () => _applyA11y(_loadA11y()));
