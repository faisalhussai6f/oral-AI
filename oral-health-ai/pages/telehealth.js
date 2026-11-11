// ── Tele-Dentistry / Appointments Page ──
function pageTelehealth() {
  const appts = AppState.appointments || [];
  const upcoming  = appts.filter(a => a.status !== 'completed');
  const completed = appts.filter(a => a.status === 'completed');

  const statusBadge = s => ({
    confirmed: '<span class="badge-minimal">✓ Confirmed</span>',
    pending:   '<span class="badge-mild">⏳ Pending</span>',
    completed: '<span class="px-2 py-1 rounded-full text-xs bg-gray-800 text-gray-400 border border-gray-700">Completed</span>',
    cancelled: '<span class="badge-severe">✕ Cancelled</span>',
  }[s] || s);

  const modeIcon = m => m === 'video' ? '📹 Video Call' : '🏥 In-Person';

  const dentists = [
    { name:'Dr. Arjun Sharma',   specialty:'Periodontist',    rating:4.9, reviews:142, avatar:'AS', available:['Mon','Wed','Fri'], nextSlot:'Oct 5, 10:30 AM' },
    { name:'Dr. Priya Nair',     specialty:'Orthodontist',    rating:4.8, reviews:98,  avatar:'PN', available:['Tue','Thu'],       nextSlot:'Oct 18, 2:00 PM' },
    { name:'Dr. Rahul Mehta',    specialty:'Endodontist',     rating:4.7, reviews:76,  avatar:'RM', available:['Mon','Tue','Thu'], nextSlot:'Oct 22, 11:00 AM' },
    { name:'Dr. Sneha Kulkarni', specialty:'General Dentist', rating:4.9, reviews:203, avatar:'SK', available:['Mon–Fri'],         nextSlot:'Sep 25, 9:00 AM' },
    { name:'Dr. Farhan Ali',     specialty:'Oral Surgeon',    rating:4.6, reviews:61,  avatar:'FA', available:['Wed','Fri'],       nextSlot:'Oct 8, 3:00 PM' },
    { name:'Dr. Meera Iyer',     specialty:'Pedodontist',     rating:5.0, reviews:88,  avatar:'MI', available:['Mon','Wed'],       nextSlot:'Oct 1, 10:00 AM' },
  ];

  return `
  <div class="max-w-5xl mx-auto space-y-6">

    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h2 class="text-2xl font-bold text-white flex items-center gap-2">
          📹 Tele-Dentistry
        </h2>
        <p class="text-gray-400 mt-1">Connect with certified dentists remotely — anytime, anywhere</p>
      </div>
      <button onclick="openBookingModal()" class="btn-primary self-start">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
        </svg>
        Book Appointment
      </button>
    </div>

    <!-- Stats row -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
      ${[
        ['📅', upcoming.length,  'Upcoming',    'text-brand-400'],
        ['✅', completed.length, 'Completed',   'text-green-400'],
        ['👨‍⚕️', dentists.length, 'Specialists', 'text-purple-400'],
        ['⚡', '< 5 min',        'Avg Wait',    'text-yellow-400'],
      ].map(([icon,val,label,color]) => `
        <div class="stat-card text-center">
          <div class="text-2xl">${icon}</div>
          <div class="text-xl font-black ${color}">${val}</div>
          <div class="stat-label">${label}</div>
        </div>`).join('')}
    </div>

    <!-- Upcoming Appointments -->
    <div class="card">
      <h3 class="font-semibold text-white mb-4 flex items-center gap-2">
        <svg class="w-5 h-5 text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
        </svg>
        Upcoming Appointments
      </h3>
      ${upcoming.length === 0 ? `
        <div class="text-center py-8">
          <div class="text-4xl mb-3">📅</div>
          <p class="text-gray-400">No upcoming appointments. Book one below!</p>
        </div>
      ` : `
        <div class="space-y-3">
          ${upcoming.map(a => `
            <div class="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl bg-gray-900 border border-gray-800 hover:border-brand-500/30 transition-colors">
              <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500/30 to-mint-500/30 border border-brand-500/20 flex items-center justify-center text-white font-bold flex-shrink-0 text-sm">
                ${a.avatar}
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex flex-wrap items-center gap-2 mb-1">
                  <span class="font-semibold text-white text-sm">${a.dentist}</span>
                  ${statusBadge(a.status)}
                </div>
                <div class="flex flex-wrap gap-3 text-xs text-gray-400">
                  <span>🏷️ ${a.specialty}</span>
                  <span>📅 ${a.date} · ${a.time}</span>
                  <span>${modeIcon(a.mode)}</span>
                </div>
                ${a.notes ? `<p class="text-xs text-gray-500 mt-1">💬 ${a.notes}</p>` : ''}
              </div>
              <div class="flex gap-2 flex-shrink-0">
                ${a.mode === 'video' ? `
                  <button onclick="joinCall('${a.id}')" class="btn-success text-xs px-3 py-2 flex items-center gap-1">
                    📹 Join Call
                  </button>` : ''}
                <button onclick="cancelAppt('${a.id}')" class="btn-secondary text-xs px-3 py-2">Cancel</button>
              </div>
            </div>`).join('')}
        </div>
      `}
    </div>

    <!-- Available Specialists -->
    <div class="card">
      <h3 class="font-semibold text-white mb-4 flex items-center gap-2">
        <svg class="w-5 h-5 text-mint-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
        </svg>
        Available Specialists
      </h3>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        ${dentists.map(d => `
          <div class="p-4 rounded-xl bg-gray-900 border border-gray-800 hover:border-brand-500/40 transition-all hover:-translate-y-0.5">
            <div class="flex items-start gap-3 mb-3">
              <div class="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-600 to-mint-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                ${d.avatar}
              </div>
              <div class="min-w-0">
                <div class="font-semibold text-white text-sm truncate">${d.name}</div>
                <div class="text-xs text-gray-400">${d.specialty}</div>
                <div class="flex items-center gap-1 mt-0.5">
                  <span class="text-yellow-400 text-xs">★</span>
                  <span class="text-xs text-gray-300 font-semibold">${d.rating}</span>
                  <span class="text-xs text-gray-600">(${d.reviews})</span>
                </div>
              </div>
            </div>
            <div class="space-y-1 text-xs text-gray-500 mb-3">
              <div>📅 Available: <span class="text-gray-300">${d.available.join(', ')}</span></div>
              <div>⚡ Next slot: <span class="text-green-400 font-semibold">${d.nextSlot}</span></div>
            </div>
            <button onclick="bookWith('${d.name}','${d.specialty}')" class="btn-primary w-full text-xs py-2 justify-center">
              Book Consultation
            </button>
          </div>`).join('')}
      </div>
    </div>

    <!-- How Tele-Dentistry works -->
    <div class="card">
      <h3 class="font-semibold text-white mb-4">How Tele-Dentistry Works</h3>
      <div class="grid grid-cols-1 sm:grid-cols-4 gap-4">
        ${[
          ['1','📤','Share Report','Your AI scan report is automatically shared with the selected dentist'],
          ['2','📅','Pick a Slot','Choose a convenient time for video or in-person consultation'],
          ['3','📹','Consult Online','Connect via secure video call from your device'],
          ['4','💊','Get Prescription','Receive diagnosis, treatment plan, and e-prescription'],
        ].map(([n,icon,t,d]) => `
          <div class="text-center p-3">
            <div class="w-7 h-7 rounded-full bg-brand-500/20 text-brand-400 text-xs font-bold flex items-center justify-center mx-auto mb-2">${n}</div>
            <div class="text-xl mb-1">${icon}</div>
            <div class="text-sm font-semibold text-white">${t}</div>
            <div class="text-xs text-gray-500 mt-1">${d}</div>
          </div>`).join('')}
      </div>
    </div>

    <!-- Completed history -->
    ${completed.length > 0 ? `
    <div class="card">
      <h3 class="font-semibold text-white mb-4 text-sm">Consultation History</h3>
      <div class="overflow-x-auto">
        <table class="data-table">
          <thead><tr><th>Dentist</th><th>Specialty</th><th>Date</th><th>Mode</th><th>Status</th><th>Report</th></tr></thead>
          <tbody>
            ${completed.map(a => `
              <tr>
                <td class="font-medium text-gray-200">${a.dentist}</td>
                <td class="text-gray-400">${a.specialty}</td>
                <td>${a.date} · ${a.time}</td>
                <td>${modeIcon(a.mode)}</td>
                <td>${statusBadge(a.status)}</td>
                <td><button onclick="navigate('scans')" class="text-brand-400 text-xs hover:underline">View scans →</button></td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>` : ''}

  </div>

  <!-- Booking Modal -->
  <div id="booking-modal" class="hidden fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
    <div class="card max-w-lg w-full space-y-5 border-brand-500/30 max-h-[90vh] overflow-y-auto">
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-bold text-white">Book Appointment</h3>
        <button onclick="closeBookingModal()" class="text-gray-500 hover:text-white text-lg">✕</button>
      </div>

      <div>
        <label class="form-label">Select Dentist</label>
        <select id="book-dentist" class="form-input">
          ${dentists.map(d => `<option value="${d.name}|${d.specialty}">${d.name} — ${d.specialty}</option>`).join('')}
        </select>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="form-label">Date</label>
          <input id="book-date" type="date" class="form-input" min="${new Date().toISOString().split('T')[0]}" />
        </div>
        <div>
          <label class="form-label">Time</label>
          <select id="book-time" class="form-input">
            ${['09:00 AM','09:30 AM','10:00 AM','10:30 AM','11:00 AM','11:30 AM','02:00 PM','02:30 PM','03:00 PM','03:30 PM','04:00 PM']
              .map(t => `<option>${t}</option>`).join('')}
          </select>
        </div>
      </div>
      <div>
        <label class="form-label">Consultation Mode</label>
        <div class="grid grid-cols-2 gap-3">
          <label class="flex items-center gap-2 p-3 rounded-xl border border-brand-500 bg-brand-500/8 cursor-pointer" id="mode-video-opt">
            <input type="radio" name="appt-mode" value="video" checked class="accent-brand-500" onchange="selectApptMode('video')" />
            <span class="text-sm">📹 Video Call</span>
          </label>
          <label class="flex items-center gap-2 p-3 rounded-xl border border-gray-700 bg-gray-900 cursor-pointer" id="mode-inperson-opt">
            <input type="radio" name="appt-mode" value="in-person" class="accent-brand-500" onchange="selectApptMode('in-person')" />
            <span class="text-sm">🏥 In-Person</span>
          </label>
        </div>
      </div>
      <div>
        <label class="form-label">Notes for Dentist <span class="text-gray-600 font-normal">(optional)</span></label>
        <textarea id="book-notes" class="form-input" rows="2" placeholder="Describe your concern..."></textarea>
      </div>
      <!-- Attach latest scan -->
      <div class="flex items-center gap-3 p-3 rounded-xl bg-gray-900 border border-gray-800">
        <input type="checkbox" id="attach-scan" class="accent-brand-500" checked />
        <label for="attach-scan" class="text-sm text-gray-300 cursor-pointer">
          Attach latest AI scan report (${AppState.scans[0]?.id || 'No scans yet'})
        </label>
      </div>
      <div class="flex gap-3">
        <button onclick="confirmBooking()" class="btn-primary flex-1 justify-center">Confirm Booking</button>
        <button onclick="closeBookingModal()" class="btn-secondary w-28 justify-center">Cancel</button>
      </div>
    </div>
  </div>
  `;
}

let _bookingDentist = '';
let _bookingMode    = 'video';

function openBookingModal(dentistStr) {
  document.getElementById('booking-modal').classList.remove('hidden');
  if (dentistStr) {
    const sel = document.getElementById('book-dentist');
    if (sel) {
      for (let i = 0; i < sel.options.length; i++) {
        if (sel.options[i].value.startsWith(dentistStr)) { sel.selectedIndex = i; break; }
      }
    }
  }
  // Set default date to tomorrow
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate()+1);
  const df = document.getElementById('book-date');
  if (df) df.value = tomorrow.toISOString().split('T')[0];
}

function closeBookingModal() {
  document.getElementById('booking-modal').classList.add('hidden');
}

function bookWith(name, specialty) {
  openBookingModal(name);
}

function selectApptMode(mode) {
  _bookingMode = mode;
  document.getElementById('mode-video-opt')?.classList.toggle('border-brand-500', mode === 'video');
  document.getElementById('mode-video-opt')?.classList.toggle('bg-brand-500/8',   mode === 'video');
  document.getElementById('mode-video-opt')?.classList.toggle('border-gray-700', mode !== 'video');
  document.getElementById('mode-video-opt')?.classList.toggle('bg-gray-900',     mode !== 'video');
  document.getElementById('mode-inperson-opt')?.classList.toggle('border-brand-500', mode === 'in-person');
  document.getElementById('mode-inperson-opt')?.classList.toggle('bg-brand-500/8',   mode === 'in-person');
  document.getElementById('mode-inperson-opt')?.classList.toggle('border-gray-700', mode !== 'in-person');
  document.getElementById('mode-inperson-opt')?.classList.toggle('bg-gray-900',     mode !== 'in-person');
}

function confirmBooking() {
  const sel   = document.getElementById('book-dentist')?.value || '';
  const date  = document.getElementById('book-date')?.value;
  const time  = document.getElementById('book-time')?.value;
  const notes = document.getElementById('book-notes')?.value || '';
  const mode  = document.querySelector('input[name="appt-mode"]:checked')?.value || 'video';

  if (!date || !time) { showToast('Please select date and time','error'); return; }

  const [dentist, specialty] = sel.split('|');
  const avatarStr = dentist.split(' ').filter((_,i)=>i>0&&i<3).map(w=>w[0]).join('').toUpperCase();

  const newAppt = {
    id: 'APT-' + Date.now().toString().slice(-6),
    dentist, specialty, avatar: avatarStr,
    date: new Date(date).toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric'}),
    time, mode, status: 'confirmed', notes,
  };

  AppState.appointments.unshift(newAppt);
  saveAppts();
  closeBookingModal();
  showToast(`Appointment booked with ${dentist}!`, 'success');
  navigate('telehealth');
}

function cancelAppt(id) {
  const appt = AppState.appointments.find(a => a.id === id);
  if (!appt) return;
  appt.status = 'cancelled';
  saveAppts();
  showToast('Appointment cancelled', 'info');
  navigate('telehealth');
}

function joinCall(id) {
  showToast('Launching secure video call... (demo mode)', 'info');
  // In production: open a WebRTC / Jitsi / Twilio URL here
}
