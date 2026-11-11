// ══════════════════════════════════════════════════════
//  Feature 7 — Treatment & Reminder Planner
// ══════════════════════════════════════════════════════

const REMINDERS_KEY = 'oralai_reminders';

const REMINDER_TYPES = [
  { id:'brush',    icon:'🪥', label:'Brushing',           color:'#28a8ff',  defaultFreq:'Twice daily',    desc:'2 min, fluoride toothpaste' },
  { id:'floss',    icon:'🧵', label:'Flossing',            color:'#10b981',  defaultFreq:'Once daily',     desc:'Interproximal cleaning' },
  { id:'mouthwash',icon:'💧', label:'Mouthwash',          color:'#a78bfa',  defaultFreq:'Twice daily',    desc:'Antiseptic or fluoride rinse' },
  { id:'medication',icon:'💊',label:'Medication',         color:'#f59e0b',  defaultFreq:'As prescribed',  desc:'Prescribed by dentist only' },
  { id:'scan',     icon:'📸', label:'Follow-up Scan',     color:'#f472b6',  defaultFreq:'Monthly',        desc:'AI oral health screening' },
  { id:'appt',     icon:'📅', label:'Dental Appointment', color:'#34d399',  defaultFreq:'Every 6 months', desc:'Professional check-up' },
];

function _loadReminders() { return Store.get(REMINDERS_KEY) || _defaultReminders(); }
function _saveReminders(r) { Store.set(REMINDERS_KEY, r); }

function _defaultReminders() {
  const now = new Date();
  return REMINDER_TYPES.map((t, i) => ({
    id:       'REM-' + t.id,
    type:     t.id,
    label:    t.label,
    freq:     t.defaultFreq,
    enabled:  t.id !== 'medication',         // medication off by default
    note:     t.id === 'medication' ? 'Only enable if prescribed by your dentist' : '',
    nextDue:  new Date(now.getTime() + i * 24*60*60*1000).toISOString().split('T')[0],
    streak:   0,
    lastDone: null,
  }));
}

function pageReminders() {
  const reminders = _loadReminders();
  const today     = new Date().toISOString().split('T')[0];
  const dueToday  = reminders.filter(r => r.enabled && r.nextDue <= today);

  return `
  <div class="max-w-3xl mx-auto space-y-6">

    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h2 class="text-2xl font-bold text-white flex items-center gap-2">
          ⏰ Reminder Planner
        </h2>
        <p class="text-gray-400 mt-1 text-sm">
          Daily oral hygiene schedule, medication reminders, and follow-up alerts.
        </p>
      </div>
      <button onclick="openAddReminderModal()" class="btn-primary self-start text-sm">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
        Add Custom
      </button>
    </div>

    <!-- Due today banner -->
    ${dueToday.length > 0 ? `
    <div class="card border-brand-500/30 bg-brand-500/5">
      <div class="flex items-center gap-3 mb-3">
        <span class="text-2xl">📋</span>
        <div>
          <div class="font-semibold text-white">Due Today</div>
          <div class="text-xs text-gray-400">${dueToday.length} item${dueToday.length>1?'s':''} to complete</div>
        </div>
      </div>
      <div class="flex flex-wrap gap-2">
        ${dueToday.map(r => {
          const t = REMINDER_TYPES.find(x=>x.id===r.type) || REMINDER_TYPES[0];
          return `
          <button onclick="markDone('${r.id}')"
            class="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-700 bg-gray-900 hover:border-brand-500/50 transition-colors text-sm">
            <span>${t.icon}</span>
            <span class="text-gray-200">${r.label}</span>
            <span class="text-xs text-brand-400">Mark done</span>
          </button>`;
        }).join('')}
      </div>
    </div>` : `
    <div class="card border-green-500/20 bg-green-500/5 py-4 text-center">
      <div class="text-3xl mb-2">✅</div>
      <p class="text-green-300 font-semibold text-sm">All caught up! Nothing due today.</p>
    </div>`}

    <!-- Reminder cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      ${reminders.map(r => {
        const t   = REMINDER_TYPES.find(x => x.id === r.type) || { icon:'⏰', label:r.label, color:'#64748b' };
        const due = r.nextDue ? new Date(r.nextDue) : null;
        const overdue = due && due < new Date() && r.enabled;
        return `
        <div class="card space-y-3 ${overdue?'border-red-500/30':''} transition-all hover:border-gray-700">
          <div class="flex items-start justify-between gap-2">
            <div class="flex items-center gap-3">
              <span class="text-2xl">${t.icon}</span>
              <div>
                <div class="font-semibold text-white text-sm">${r.label}</div>
                <div class="text-xs text-gray-500">${r.freq}</div>
              </div>
            </div>
            <!-- Enable toggle -->
            <label class="relative inline-flex items-center cursor-pointer flex-shrink-0">
              <input type="checkbox" ${r.enabled?'checked':''} class="sr-only peer"
                     onchange="toggleReminder('${r.id}', this.checked)" />
              <div class="w-10 h-5 bg-gray-700 peer-checked:bg-brand-500 rounded-full transition-colors
                          after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white
                          after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5"></div>
            </label>
          </div>

          <!-- Streak + next due -->
          <div class="flex items-center justify-between text-xs">
            <div class="flex items-center gap-1.5">
              <span class="text-yellow-400">🔥</span>
              <span class="text-gray-400">${r.streak} day streak</span>
            </div>
            <span class="${overdue?'text-red-400':'text-gray-500'}">
              ${due ? `Next: ${due.toLocaleDateString('en-US',{month:'short',day:'numeric'})}` : '—'}
            </span>
          </div>

          <!-- Gauge bar for streak -->
          <div class="sensor-bar h-1.5">
            <div class="sensor-fill h-1.5" style="width:${Math.min(100, r.streak*10)}%;background:${t.color}"></div>
          </div>

          ${r.note ? `<p class="text-xs text-yellow-400/80 italic">${r.note}</p>` : ''}

          <div class="flex gap-2">
            <button onclick="markDone('${r.id}')" class="btn-success text-xs px-3 py-1.5 flex-1 justify-center ${!r.enabled?'opacity-40 cursor-not-allowed':''}"
                    ${!r.enabled?'disabled':''}>
              ✓ Done
            </button>
            <button onclick="editReminder('${r.id}')" class="btn-secondary text-xs px-3 py-1.5">
              Edit
            </button>
          </div>
        </div>`;
      }).join('')}
    </div>

    <!-- Weekly overview -->
    <div class="card">
      <h3 class="font-semibold text-white mb-4">This Week</h3>
      <div class="grid grid-cols-7 gap-1">
        ${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((day, i) => {
          const d   = new Date(); d.setDate(d.getDate() - d.getDay() + i);
          const str = d.toISOString().split('T')[0];
          const isToday = str === new Date().toISOString().split('T')[0];
          const done = reminders.filter(r => r.enabled && r.lastDone === str).length;
          const total= reminders.filter(r => r.enabled).length;
          const pct  = total ? Math.round((done/total)*100) : 0;
          return `
          <div class="text-center space-y-1">
            <div class="text-xs ${isToday?'text-brand-400 font-bold':'text-gray-600'}">${day}</div>
            <div class="h-12 rounded-lg relative overflow-hidden ${isToday?'border border-brand-500/40':''}"
                 style="background:#1e2a3a;">
              <div class="absolute bottom-0 left-0 right-0 rounded-b-lg transition-all"
                   style="height:${pct}%;background:#28a8ff44;"></div>
            </div>
            <div class="text-xs ${pct===100?'text-green-400':pct>0?'text-yellow-400':'text-gray-700'}">${pct}%</div>
          </div>`;
        }).join('')}
      </div>
    </div>

  </div>

  <!-- Add/Edit Modal -->
  <div id="reminder-modal"
       class="hidden fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
    <div class="card max-w-md w-full space-y-4 border-brand-500/20">
      <div class="flex items-center justify-between">
        <h3 class="font-bold text-white" id="rem-modal-title">Add Reminder</h3>
        <button onclick="closeReminderModal()" class="text-gray-500 hover:text-white text-lg">✕</button>
      </div>
      <div>
        <label class="form-label">Type</label>
        <select id="rem-type" class="form-input">
          ${REMINDER_TYPES.map(t=>`<option value="${t.id}">${t.icon} ${t.label}</option>`).join('')}
          <option value="custom">✏️ Custom</option>
        </select>
      </div>
      <div>
        <label class="form-label">Label</label>
        <input id="rem-label" type="text" class="form-input" placeholder="e.g. Take amoxicillin 500mg"/>
      </div>
      <div>
        <label class="form-label">Frequency</label>
        <select id="rem-freq" class="form-input">
          ${['Twice daily','Once daily','Every other day','Weekly','Monthly','As prescribed'].map(f=>`<option>${f}</option>`).join('')}
        </select>
      </div>
      <div>
        <label class="form-label">Next Due Date</label>
        <input id="rem-date" type="date" class="form-input"
               value="${new Date().toISOString().split('T')[0]}"/>
      </div>
      <div>
        <label class="form-label">Notes <span class="text-gray-600 font-normal">(optional)</span></label>
        <input id="rem-note" type="text" class="form-input" placeholder="e.g. 30 min after brushing"/>
      </div>
      <div class="flex gap-3">
        <button onclick="saveReminder()" class="btn-primary flex-1 justify-center">Save</button>
        <button onclick="closeReminderModal()" class="btn-secondary w-24 justify-center">Cancel</button>
      </div>
    </div>
  </div>
  `;
}

let _editingRemId = null;

function openAddReminderModal() {
  _editingRemId = null;
  document.getElementById('rem-modal-title').textContent = 'Add Reminder';
  ['rem-label','rem-note'].forEach(id => { const e=document.getElementById(id); if(e) e.value=''; });
  document.getElementById('rem-date').value = new Date().toISOString().split('T')[0];
  document.getElementById('reminder-modal')?.classList.remove('hidden');
}

function editReminder(id) {
  const r = _loadReminders().find(x => x.id === id);
  if (!r) return;
  _editingRemId = id;
  document.getElementById('rem-modal-title').textContent = 'Edit Reminder';
  document.getElementById('rem-type').value  = r.type;
  document.getElementById('rem-label').value = r.label;
  document.getElementById('rem-freq').value  = r.freq;
  document.getElementById('rem-date').value  = r.nextDue || new Date().toISOString().split('T')[0];
  document.getElementById('rem-note').value  = r.note || '';
  document.getElementById('reminder-modal')?.classList.remove('hidden');
}

function closeReminderModal() {
  document.getElementById('reminder-modal')?.classList.add('hidden');
}

function saveReminder() {
  const type  = document.getElementById('rem-type')?.value  || 'custom';
  const label = document.getElementById('rem-label')?.value.trim();
  const freq  = document.getElementById('rem-freq')?.value  || 'Once daily';
  const date  = document.getElementById('rem-date')?.value;
  const note  = document.getElementById('rem-note')?.value.trim() || '';
  if (!label) { showToast('Label is required','error'); return; }

  const list = _loadReminders();
  if (_editingRemId) {
    const idx = list.findIndex(r => r.id === _editingRemId);
    if (idx >= 0) { list[idx] = { ...list[idx], type, label, freq, nextDue: date, note }; }
  } else {
    list.push({ id:'REM-'+Date.now().toString().slice(-8), type, label, freq, enabled:true, note, nextDue:date, streak:0, lastDone:null });
  }
  _saveReminders(list);
  closeReminderModal();
  showToast('Reminder saved!', 'success');
  navigate('reminders');
}

function toggleReminder(id, enabled) {
  const list = _loadReminders();
  const idx  = list.findIndex(r => r.id === id);
  if (idx >= 0) { list[idx].enabled = enabled; _saveReminders(list); }
  showToast(enabled ? 'Reminder enabled' : 'Reminder disabled', 'info');
}

function markDone(id) {
  const list  = _loadReminders();
  const idx   = list.findIndex(r => r.id === id);
  if (idx < 0) return;
  const today = new Date().toISOString().split('T')[0];
  const r     = list[idx];

  // Increment streak if done on consecutive days
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate()-1);
  const yesterStr = yesterday.toISOString().split('T')[0];
  r.streak = r.lastDone === yesterStr ? r.streak + 1 : r.lastDone === today ? r.streak : 1;
  r.lastDone = today;

  // Advance next due based on frequency
  const advanceDays = {
    'Twice daily':1, 'Once daily':1, 'Every other day':2,
    'Weekly':7, 'Monthly':30, 'As prescribed':1,
  };
  const days   = advanceDays[r.freq] || 1;
  const nextD  = new Date(); nextD.setDate(nextD.getDate() + days);
  r.nextDue    = nextD.toISOString().split('T')[0];
  list[idx]    = r;
  _saveReminders(list);
  showToast(`${r.label} marked as done! 🔥 ${r.streak} day streak`, 'success');
  navigate('reminders');
}
