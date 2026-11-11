// ══════════════════════════════════════════════════════
//  OralAI Assistant — floating chat panel + keyboard shortcuts
// ══════════════════════════════════════════════════════

// ── Inject FAB + Panel into DOM once shell is ready ──
function initAssistant() {
  if (document.getElementById('ai-chat-fab')) return; // already injected

  // FAB button
  const fab = document.createElement('button');
  fab.id = 'ai-chat-fab';
  fab.setAttribute('aria-label', 'Open AI Assistant');
  fab.title = 'AI Dental Assistant (press ?)';
  fab.innerHTML = '🦷';
  fab.onclick = toggleChat;
  document.body.appendChild(fab);

  // Chat panel
  const panel = document.createElement('div');
  panel.id = 'ai-chat-panel';
  panel.className = 'hidden';
  panel.innerHTML = `
    <!-- Header -->
    <div class="flex items-center justify-between px-4 py-3 border-b border-gray-800 flex-shrink-0">
      <div class="flex items-center gap-2">
        <div class="w-7 h-7 rounded-full bg-gradient-to-br from-brand-500 to-mint-500 flex items-center justify-center text-white text-sm flex-shrink-0">🦷</div>
        <div>
          <div class="text-sm font-semibold text-white">OralAI Assistant</div>
          <div class="text-xs text-green-400 flex items-center gap-1">
            <span class="w-1.5 h-1.5 rounded-full bg-green-400 pulse-dot inline-block"></span>Online
          </div>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <button onclick="clearChat()" class="text-gray-600 hover:text-gray-400 text-xs" title="Clear chat">🗑</button>
        <button onclick="toggleChat()" class="text-gray-500 hover:text-white text-lg leading-none" aria-label="Close">✕</button>
      </div>
    </div>

    <!-- Messages -->
    <div id="chat-messages">
      <!-- Welcome message injected by JS -->
    </div>

    <!-- Quick prompts -->
    <div id="quick-prompts" class="px-3 pb-2 flex flex-wrap gap-1.5">
      ${[
        'What is my oral health score?',
        'How to prevent cavities?',
        'What causes gingivitis?',
        'How often should I scan?',
      ].map(q => `
        <button onclick="sendQuickPrompt(this)"
          class="text-xs px-2.5 py-1 rounded-full bg-gray-900 border border-gray-700
                 text-gray-300 hover:border-brand-500 hover:text-brand-300 transition-colors">
          ${q}
        </button>`).join('')}
    </div>

    <!-- Input -->
    <div class="flex items-center gap-2 px-3 pb-3 pt-1 flex-shrink-0">
      <input id="chat-input" type="text"
        class="form-input flex-1 text-sm py-2"
        placeholder="Ask about oral health…"
        onkeydown="if(event.key==='Enter') sendChat()"
        autocomplete="off" />
      <button onclick="sendChat()" class="btn-primary px-3 py-2 text-sm flex-shrink-0">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
        </svg>
      </button>
    </div>

    <div class="px-3 pb-2 text-center">
      <span class="text-xs text-gray-700">Press <kbd class="kbd-key">?</kbd> to open · <kbd class="kbd-key">Esc</kbd> to close</span>
    </div>
  `;
  document.body.appendChild(panel);

  // Keyboard shortcut overlay
  const kbdOverlay = document.createElement('div');
  kbdOverlay.id = 'kbd-overlay';
  kbdOverlay.className = 'hidden';
  kbdOverlay.innerHTML = `
    <div class="card max-w-md w-full space-y-4">
      <div class="flex items-center justify-between">
        <h3 class="font-bold text-white">Keyboard Shortcuts</h3>
        <button onclick="closeKbd()" class="text-gray-500 hover:text-white text-lg">✕</button>
      </div>
      <div class="space-y-1 text-sm">
        ${[
          ['C',          'Compare Scans'],
          ['L',          'Treatment Log'],
          ['R',          'Reminders'],
          ['I',          'IoT Device Health'],
          ['F',          'Family Profiles'],
          ['Y',          'Symptom Checker'],
          ['P',          'Privacy Controls'],
          ['G',          'Settings'],
          ['D',          'Go to Dashboard'],
          ['N',          'New Scan (Upload)'],
          ['S',          'My Scans'],
          ['A',          'Analytics'],
          ['T',          'Tele-Dentistry'],
          ['/',          'Search scans (focus)'],
          ['?',          'Toggle AI Assistant'],
          ['K',          'Show this help'],
          ['Esc',        'Close modals / panels'],
          ['Ctrl+P',     'Print current report'],
          ['Ctrl+K',     'Copy last report ID'],
        ].map(([key, desc]) => `
          <div class="flex items-center justify-between py-2 border-b border-gray-900 last:border-0">
            <span class="text-gray-300">${desc}</span>
            <kbd class="kbd-key">${key}</kbd>
          </div>`).join('')}
      </div>
      <p class="text-xs text-gray-600 text-center">Shortcuts are disabled when typing in an input field.</p>
    </div>
  `;
  document.body.appendChild(kbdOverlay);

  // Show welcome message
  _addBubble('ai', `👋 Hi! I'm your OralAI dental assistant. I can answer questions about oral health, explain your scan results, and give hygiene tips. How can I help?`);
}

// ── Chat visibility ──
let _chatOpen = false;
function toggleChat() {
  _chatOpen = !_chatOpen;
  const p = document.getElementById('ai-chat-panel');
  const f = document.getElementById('ai-chat-fab');
  if (!p) return;
  p.classList.toggle('hidden', !_chatOpen);
  if (f) f.innerHTML = _chatOpen ? '✕' : '🦷';
  if (_chatOpen) {
    setTimeout(() => document.getElementById('chat-input')?.focus(), 100);
  }
}
function closeChat() { if (_chatOpen) toggleChat(); }

// ── Message bubbles ──
function _addBubble(role, text) {
  const el = document.getElementById('chat-messages');
  if (!el) return;
  const div = document.createElement('div');
  div.className = `chat-bubble ${role}`;
  div.textContent = text;
  el.appendChild(div);
  el.scrollTop = el.scrollHeight;
}

function _showTyping() {
  const el = document.getElementById('chat-messages');
  if (!el) return;
  const div = document.createElement('div');
  div.className = 'chat-typing';
  div.id = 'chat-typing-indicator';
  div.innerHTML = '<span></span><span></span><span></span>';
  el.appendChild(div);
  el.scrollTop = el.scrollHeight;
}

function _hideTyping() {
  document.getElementById('chat-typing-indicator')?.remove();
}

// ── Knowledge base ──
const _KB = [
  // Greetings
  { match:/\b(hi|hello|hey|good\s*(morning|afternoon|evening))\b/i,
    reply:() => `Hello! 😊 I'm here to help with all things oral health. Ask me anything — scores, diseases, hygiene tips, or how OralAI works.` },

  // Score
  { match:/\b(my|oral|health)\s*(score|rating|result)\b/i,
    reply:() => {
      const s = AppState.scans[0];
      if (!s) return `You haven't uploaded a scan yet. Go to Upload Scan to get your first oral health score!`;
      const lbl = s.score>=80?'Good 🟢':s.score>=60?'Fair 🟡':'Needs Attention 🔴';
      return `Your latest oral health score is **${s.score}/100** (${lbl}), recorded on ${s.date}. ${s.score>=80?'Great work keeping up with your oral hygiene!':s.score>=60?'There\'s room for improvement — check your latest report for recommendations.':'I recommend booking a dental consultation soon.'}`;
    }},

  // Cavities / caries
  { match:/\b(cavit|caries|tooth decay|decay)\b/i,
    reply:() => `Dental caries (cavities) are caused by acids produced when bacteria break down sugars on tooth surfaces. Prevention tips:\n• Brush twice daily with fluoride toothpaste\n• Floss daily to remove plaque between teeth\n• Limit sugary and acidic foods\n• Use fluoride mouthwash\n• Get professional cleanings every 6 months` },

  // Gingivitis / gum disease
  { match:/\b(gingivit|gum\s*(disease|infection|bleed)|periodont)\b/i,
    reply:() => `Gingivitis is early-stage gum disease caused by plaque buildup along the gumline. Signs include red, swollen, or bleeding gums.\n\nTreatment: Improve brushing technique (angle bristles 45° toward gums), floss daily, and use antiseptic mouthwash. If untreated, it can progress to periodontitis — so see a dentist if symptoms persist.` },

  // Plaque
  { match:/\b(plaque|tartar|calculus)\b/i,
    reply:() => `Plaque is a sticky film of bacteria that forms on teeth. If not removed by brushing and flossing, it hardens into tartar (calculus) which can only be removed by a dentist.\n\nTip: Brush for at least 2 minutes twice daily and floss once a day to keep plaque under control.` },

  // Enamel
  { match:/\b(enamel|deminerali|erosion|white spot)\b/i,
    reply:() => `Enamel demineralization occurs when acids weaken tooth enamel, creating white spot lesions. Early stages can be reversed with:\n• Fluoride toothpaste and varnish\n• Cutting down on acidic drinks (soda, citrus juice)\n• Using a remineralizing mouthwash\n• Staying hydrated to maintain saliva flow` },

  // Brushing
  { match:/\b(brush|brushing|toothbrush|toothpaste)\b/i,
    reply:() => `Best brushing practices:\n• Brush for 2 minutes, twice daily\n• Use a soft-bristled toothbrush\n• Use fluoride toothpaste (1000–1450 ppm)\n• Hold the brush at a 45° angle to the gums\n• Replace your toothbrush every 3 months\n• Don't rinse immediately after brushing — spit but don't rinse to keep fluoride on teeth` },

  // Flossing
  { match:/\b(floss|interdental|flossing)\b/i,
    reply:() => `Flossing removes plaque and food from between teeth where your brush can't reach. Tips:\n• Floss once daily, ideally before bed\n• Use about 45 cm of floss, wind it around your fingers\n• Gently slide it between teeth in a C-shape around each tooth\n• Alternatives: water flossers, interdental brushes` },

  // pH / saliva
  { match:/\b(ph|saliva|acid|alkaline)\b/i,
    reply:() => {
      const ph = AppState.sensors?.ph;
      const cur = ph ? `Your current saliva pH is ${ph}.` : '';
      return `${cur} Normal oral pH is 6.5–7.5. Below 5.5, enamel starts to dissolve.\n\nTo raise low pH: drink water, chew sugar-free gum (stimulates saliva), reduce acidic foods, and rinse with a fluoride/bicarbonate mouthwash.`;
    }},

  // Scan / upload
  { match:/\b(scan|upload|how\s*(often|frequent))\b/i,
    reply:() => `OralAI recommends scanning once a month. For acute symptoms, scan immediately.\n\nOptions to start:\n• Click **Upload Scan** or press **N**\n• Use **Camera Guidance** (📸) for best image quality\n• Run the **Symptom Checker** (🩺 or press **Y**) before scanning for a fuller picture.` },

  // Camera guidance
  { match:/\b(camera|photo|capture|lighting|focus|blur|angle)\b/i,
    reply:() => `Use the Camera Guidance page (📸) for the best scan quality:\n• Bright, direct lighting — no shadows\n• Hold 15–20 cm from your mouth\n• Open wide — both arches visible\n• Complete the 6-item checklist before capturing\n\nImages scoring below 40/100 quality are rejected automatically.\n\nPress **N** to go to upload, then click "Open Camera Guide".` },

  // Symptom checker + risk
  { match:/\b(symptom|pain|bleeding|sensitivity|swelling|ulcer|risk)\b/i,
    reply:() => `The **Symptom Checker** (press **Y**) asks 8 questions about:\n• Pain, bleeding, sensitivity, swelling\n• Ulcer duration, tobacco use\n• Diabetes history and prior oral disease\n\nIt combines your answers with your scan score and IoT sensor readings to produce a 0–100 risk score with urgency: Monitor / Dentist Visit / Urgent Consultation.\n\nResults are shown in your scan reports automatically.` },

  // Reminders
  { match:/\b(remind|reminder|schedule|brush|floss|routine)\b/i,
    reply:() => `The **Reminder Planner** (press **R**) helps you stay on top of:\n• Brushing (twice daily)\n• Flossing (daily)\n• Mouthwash, medications, follow-up scans\n• Dental appointment scheduling\n\nIt tracks your streak for each habit and shows a weekly completion calendar. You can add custom reminders with your own frequency.` },

  // Family profiles
  { match:/\b(family|child|parent|elderly|member|profile)\b/i,
    reply:() => `**Family Profiles** (press **F**) lets one account manage oral health for your whole family:\n• Add members with relationship, age group, avatar\n• Switch the active profile — all scans are stored separately per member\n• Special notes for conditions like braces, diabetes, or pregnancy\n\nGo to Care → Family Profiles in the sidebar.` },

  // Privacy
  { match:/\b(privacy|data|consent|audit|gdpr|delete|export)\b/i,
    reply:() => `OralAI stores all data **locally in your browser** — nothing is sent externally unless the Flask backend is active.\n\n**Privacy Controls** (press **P**) gives you:\n• Granular consent toggles (AI analysis, clinic sharing, research)\n• Role-based access display\n• Full data export as JSON\n• Data deletion (right to erasure)\n• Audit trail of all account actions\n\nComplies with DPDP Act (India) and GDPR principles.` },

  // IoT sensors
  { match:/\b(sensor|iot|biosensor|temperature|bacterial|moisture)\b/i,
    reply:() => {
      const s = AppState.sensors;
      return `Your current IoT sensor readings:\n• Saliva pH: ${s.ph} (normal 6.5–7.5)\n• Oral Temp: ${s.temperature}°C (normal 36.1–37.2°C)\n• Bacterial Activity: ${s.bacterial}% (normal <50%)\n• Moisture: ${s.moisture}% (normal >60%)\n\nGo to **IoT Sensors** to see full trends and charts.`;
    }},

  // Tele-dentistry
  { match:/\b(dentist|appointment|consult|tele|book|specialist)\b/i,
    reply:() => `OralAI's Tele-Dentistry feature lets you book video or in-person consultations with certified specialists directly from the app.\n\nNavigate to **Tele-Dentistry** in the sidebar to see available dentists and book an appointment. Your latest scan report is automatically shared with the selected dentist.` },

  // Backend / Flask
  { match:/\b(backend|flask|api|model|cnn|tensorflow)\b/i,
    reply:() => `The OralAI Flask backend provides real CNN inference. To activate it:\n1. cd oral-health-ai/backend\n2. pip install -r requirements.txt\n3. python app.py\n\nOnce running, go to **Profile → Backend Settings** and click **Test** to enable real-time AI analysis. The status dot in the topbar will turn green.` },

  // Pain / toothache
  { match:/\b(pain|ache|hurt|sensitivity|sensitive)\b/i,
    reply:() => `Tooth pain or sensitivity can indicate cavities, cracked teeth, exposed roots, or gum disease. \n\n⚠️ If you're experiencing severe or persistent pain, please consult a dentist promptly — do not rely solely on AI diagnosis.\n\nIn the meantime: avoid very hot/cold foods, use desensitizing toothpaste, and rinse with warm salt water.` },

  // Oral cancer
  { match:/\b(cancer|lesion|lump|sore|ulcer)\b/i,
    reply:() => `Oral lesions or ulcers should be monitored carefully. Most minor ulcers heal in 1–2 weeks. See a dentist if:\n• An ulcer doesn't heal after 3 weeks\n• You notice a lump or white/red patch\n• There's unexplained bleeding\n\n⚠️ OralAI can flag suspicious areas but cannot diagnose oral cancer — always get a professional evaluation.` },

  // Thanks / goodbye
  { match:/\b(thank|thanks|bye|goodbye|ok|okay|great|cool|awesome)\b/i,
    reply:() => `You're welcome! 😊 Don't forget to keep up with your daily oral hygiene routine and upload a scan monthly. Stay healthy! 🦷` },

  // How does OralAI work
  { match:/\b(how\s*(does|do)|what\s*is|explain|oralai|this\s*app)\b/i,
    reply:() => `OralAI is a Real-Time Oral Disease Detection system that combines:\n\n🧠 **CNN (Convolutional Neural Networks)** — classifies oral diseases from dental images\n📡 **IoT Biosensors** — measures pH, temperature, bacterial activity & moisture\n⚡ **Edge Computing** — low-latency on-device inference\n☁️ **Cloud Storage** — secure scan history and report management\n📱 **PWA** — installable as a mobile app, works offline\n\nDeveloped at Bearys Institute of Technology, Karnataka, India.` },
];

// ── Chat logic ──
function sendChat() {
  const input = document.getElementById('chat-input');
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;
  input.value = '';

  // Hide quick prompts after first message
  document.getElementById('quick-prompts')?.remove();

  _addBubble('user', text);
  _showTyping();

  // Simulate thinking delay
  const delay = 600 + Math.random() * 600;
  setTimeout(() => {
    _hideTyping();
    const reply = _getReply(text);
    _addBubble('ai', reply);
  }, delay);
}

function sendQuickPrompt(btn) {
  const input = document.getElementById('chat-input');
  if (input) input.value = btn.textContent.trim();
  sendChat();
}

function _getReply(text) {
  for (const { match, reply } of _KB) {
    if (match.test(text)) return reply();
  }
  // Fallback
  return `That's a great question about oral health! For the most accurate advice, I'd recommend:\n1. Uploading a scan for AI analysis\n2. Booking a tele-dentistry consultation\n3. Visiting a local dentist\n\nIs there anything specific about your scan results or OralAI features I can help with?`;
}

function clearChat() {
  const el = document.getElementById('chat-messages');
  if (el) el.innerHTML = '';
  _addBubble('ai', `Chat cleared! How can I help you with your oral health? 🦷`);
}

// ── Keyboard shortcut handler ──
function initKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Never fire when typing in an input / textarea / contenteditable
    const tag = document.activeElement?.tagName;
    const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable;

    // Esc — close everything
    if (e.key === 'Escape') {
      closeChat();
      closeKbd();
      document.getElementById('sidebar-overlay')?.classList.add('hidden');
      document.getElementById('sidebar')?.classList.remove('open');
      document.getElementById('booking-modal')?.classList.add('hidden');
      document.getElementById('analysis-modal')?.classList.add('hidden');
      return;
    }

    if (isInput) return;

    // ? — toggle AI chat
    if (e.key === '?') { e.preventDefault(); toggleChat(); return; }

    // K — keyboard shortcuts help
    if (e.key === 'k' || e.key === 'K') { e.preventDefault(); toggleKbd(); return; }

    // Ctrl+P — print (only on printreport page)
    if (e.ctrlKey && e.key === 'p') {
      if (Router.currentPage === 'printreport') { e.preventDefault(); window.print(); }
      return;
    }

    // Ctrl+K — copy last report ID
    if (e.ctrlKey && e.key === 'k') {
      e.preventDefault();
      const id = AppState.scans[0]?.id;
      if (id) navigator.clipboard?.writeText(id).then(() => showToast('Report ID copied!','success'));
      return;
    }

    // Single-key nav shortcuts
    const navMap = {
      'd': 'dashboard', 'D': 'dashboard',
      'n': 'upload',    'N': 'upload',
      's': 'scans',     'S': 'scans',
      'a': 'analytics', 'A': 'analytics',
      't': 'telehealth','T': 'telehealth',
      'c': 'compare',   'C': 'compare',
      'g': 'settings',  'G': 'settings',
      'l': 'treatments','L': 'treatments',
      'r': 'reminders', 'R': 'reminders',
      'i': 'iot_health','I': 'iot_health',
      'f': 'family',    'F': 'family',
      'p': 'privacy',   'P': 'privacy',
      'y': 'symptom',   'Y': 'symptom',
    };
    if (navMap[e.key]) { e.preventDefault(); navigate(navMap[e.key]); return; }

    // / — focus scan search
    if (e.key === '/') {
      e.preventDefault();
      navigate('scans');
      setTimeout(() => {
        const si = document.querySelector('#page-content input[type="text"]');
        if (si) { si.focus(); si.select(); }
      }, 350);
    }
  });
}

function toggleKbd() {
  document.getElementById('kbd-overlay')?.classList.toggle('hidden');
}
function closeKbd() {
  document.getElementById('kbd-overlay')?.classList.add('hidden');
}

// Close kbd overlay on backdrop click
document.addEventListener('click', (e) => {
  const overlay = document.getElementById('kbd-overlay');
  if (overlay && !overlay.classList.contains('hidden') && e.target === overlay) {
    overlay.classList.add('hidden');
  }
});

// Boot — called from app.js after renderShell()
document.addEventListener('page:rendered', () => {
  // Inject assistant only once, after shell exists
  if (document.getElementById('ai-chat-fab')) return;
  if (document.getElementById('sidebar')) initAssistant();
});
