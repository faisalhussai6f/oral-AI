// ══════════════════════════════════════════════════════
//  Feature 10 — Family Profiles
// ══════════════════════════════════════════════════════

const FAMILY_KEY = 'oralai_family';

function _loadFamily()  { return Store.get(FAMILY_KEY) || []; }
function _saveFamily(f) { Store.set(FAMILY_KEY, f); }
function _activeMember(){ return Store.get('oralai_active_member') || null; }
function _setActiveMember(id){ Store.set('oralai_active_member', id); }

const RELATIONSHIPS = ['Self','Spouse/Partner','Child','Parent','Grandparent','Sibling','Other'];
const AGE_GROUPS    = ['0–12 (Child)','13–17 (Teen)','18–35 (Adult)','36–60 (Adult)','60+ (Senior)'];

function pageFamily() {
  const members = _loadFamily();
  const activeId = _activeMember();

  return `
  <div class="max-w-3xl mx-auto space-y-6">

    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h2 class="text-2xl font-bold text-white flex items-center gap-2">👨‍👩‍👧‍👦 Family Profiles</h2>
        <p class="text-gray-400 mt-1 text-sm">Manage oral health records for your whole family under one account.</p>
      </div>
      <button onclick="openFamilyModal()" class="btn-primary self-start text-sm">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
        Add Member
      </button>
    </div>

    <!-- Active member banner -->
    ${activeId ? (() => {
      const m = members.find(x=>x.id===activeId);
      return m ? `
        <div class="card border-brand-500/30 bg-brand-500/8 flex items-center gap-4">
          <div class="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-base flex-shrink-0"
               style="background:${m.color||'linear-gradient(135deg,#0a8aff,#0070eb)'}">
            ${m.name.charAt(0).toUpperCase()}
          </div>
          <div class="flex-1">
            <span class="text-xs text-brand-400 font-semibold uppercase tracking-wider">Currently Viewing</span>
            <div class="font-semibold text-white">${m.name} · ${m.relationship}</div>
          </div>
          <button onclick="switchToSelf()" class="btn-secondary text-xs px-3 py-2 flex-shrink-0">
            Switch to My Profile
          </button>
        </div>` : '';
    })() : ''}

    <!-- Member cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">

      <!-- "You" card -->
      <div class="card ${!activeId?'border-brand-500/30 bg-brand-500/5':'hover:border-gray-700'} cursor-pointer transition-all"
           onclick="switchToSelf()">
        <div class="flex items-center gap-4">
          <div class="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-black flex-shrink-0"
               style="background:linear-gradient(135deg,#0a8aff,#0070eb)">
            ${(AppState.user?.name||'?').charAt(0).toUpperCase()}
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="font-semibold text-white">${AppState.user?.name||'You'}</span>
              ${!activeId?'<span class="badge-minimal text-xs">Active</span>':''}
            </div>
            <div class="text-xs text-gray-500 mt-0.5">Self · ${AppState.scans.length} scan${AppState.scans.length!==1?'s':''}</div>
            <div class="text-xs text-gray-600 mt-0.5">${AppState.user?.email||''}</div>
          </div>
        </div>
        ${!activeId?'':`<button onclick="event.stopPropagation();switchToSelf()" class="btn-primary w-full mt-3 text-xs py-2 justify-center">Switch to This Profile</button>`}
      </div>

      ${members.map(m => {
        const isActive = m.id === activeId;
        const scans    = (Store.get('oralai_scans_'+m.id)||[]);
        return `
        <div class="card ${isActive?'border-brand-500/30 bg-brand-500/5':'hover:border-gray-700'} cursor-pointer transition-all"
             onclick="switchToMember('${m.id}')">
          <div class="flex items-start gap-4">
            <div class="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-black flex-shrink-0"
                 style="background:${m.color}">
              ${m.name.charAt(0).toUpperCase()}
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="font-semibold text-white">${m.name}</span>
                ${isActive?'<span class="badge-minimal text-xs">Active</span>':''}
                <span class="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-400">${m.relationship}</span>
              </div>
              <div class="text-xs text-gray-500 mt-0.5">${m.ageGroup} · ${scans.length} scan${scans.length!==1?'s':''}</div>
              ${m.notes?`<div class="text-xs text-gray-600 mt-0.5 truncate">${m.notes}</div>`:''}
            </div>
            <button onclick="event.stopPropagation();deleteFamilyMember('${m.id}')"
              class="text-gray-700 hover:text-red-400 transition-colors text-base flex-shrink-0" title="Remove">✕</button>
          </div>
          <div class="flex gap-2 mt-3">
            <button onclick="event.stopPropagation();switchToMember('${m.id}')"
              class="btn-primary flex-1 text-xs py-2 justify-center ${isActive?'opacity-70':''}">
              ${isActive?'Viewing Now':'Switch to Profile'}
            </button>
            <button onclick="event.stopPropagation();editFamilyMember('${m.id}')"
              class="btn-secondary text-xs px-3 py-2">Edit</button>
          </div>
        </div>`;
      }).join('')}
    </div>

    <!-- Why family profiles? -->
    <div class="card">
      <h3 class="font-semibold text-white mb-3 text-sm">About Family Profiles</h3>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        ${[
          ['👶','Children','Track deciduous and permanent tooth development. Early cavity detection for young teeth.'],
          ['🧓','Elderly','Monitor dry mouth, gum recession, and denture-related issues common in seniors.'],
          ['🤰','Pregnancy','Hormonal changes increase gum disease risk. Dedicated monitoring for expectant mothers.'],
        ].map(([icon,title,desc])=>`
          <div class="p-3 rounded-xl bg-gray-900 border border-gray-800">
            <div class="text-xl mb-1">${icon}</div>
            <div class="font-semibold text-gray-200 mb-1">${title}</div>
            <div class="text-gray-500 leading-relaxed">${desc}</div>
          </div>`).join('')}
      </div>
    </div>

  </div>

  <!-- Add/Edit Family Member Modal -->
  <div id="family-modal"
       class="hidden fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
    <div class="card max-w-md w-full space-y-4 border-brand-500/20">
      <div class="flex items-center justify-between">
        <h3 class="font-bold text-white" id="family-modal-title">Add Family Member</h3>
        <button onclick="closeFamilyModal()" class="text-gray-500 hover:text-white text-lg">✕</button>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div class="col-span-2">
          <label class="form-label">Full Name</label>
          <input id="fam-name" type="text" class="form-input" placeholder="e.g. Aisha Hussain" required/>
        </div>
        <div>
          <label class="form-label">Relationship</label>
          <select id="fam-rel" class="form-input">
            ${RELATIONSHIPS.map(r=>`<option>${r}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="form-label">Age Group</label>
          <select id="fam-age" class="form-input">
            ${AGE_GROUPS.map(a=>`<option>${a}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="form-label">Date of Birth</label>
          <input id="fam-dob" type="date" class="form-input"/>
        </div>
        <div>
          <label class="form-label">Avatar Colour</label>
          <div class="flex gap-1.5 flex-wrap mt-1" id="fam-color-opts">
            ${[
              'linear-gradient(135deg,#0a8aff,#0070eb)',
              'linear-gradient(135deg,#10b981,#059669)',
              'linear-gradient(135deg,#a78bfa,#7c3aed)',
              'linear-gradient(135deg,#f59e0b,#d97706)',
              'linear-gradient(135deg,#f472b6,#db2777)',
              'linear-gradient(135deg,#06b6d4,#0891b2)',
            ].map((c,i)=>`
              <button type="button" onclick="selectFamColor('${c}')"
                data-color="${c}"
                class="w-8 h-8 rounded-lg border-2 ${i===0?'border-white scale-110':'border-transparent'} transition-all hover:scale-110"
                style="background:${c}"></button>`).join('')}
          </div>
        </div>
        <div class="col-span-2">
          <label class="form-label">Medical Notes <span class="text-gray-600 font-normal">(optional)</span></label>
          <input id="fam-notes" type="text" class="form-input" placeholder="e.g. Braces, diabetes, allergies"/>
        </div>
      </div>
      <div class="flex gap-3">
        <button onclick="saveFamilyMember()" class="btn-primary flex-1 justify-center">Save Member</button>
        <button onclick="closeFamilyModal()" class="btn-secondary w-24 justify-center">Cancel</button>
      </div>
    </div>
  </div>
  `;
}

let _editingFamId   = null;
let _selectedFamColor = 'linear-gradient(135deg,#0a8aff,#0070eb)';

function openFamilyModal() {
  _editingFamId = null;
  _selectedFamColor = 'linear-gradient(135deg,#0a8aff,#0070eb)';
  document.getElementById('family-modal-title').textContent = 'Add Family Member';
  ['fam-name','fam-notes'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});
  document.getElementById('fam-dob').value='';
  document.getElementById('family-modal')?.classList.remove('hidden');
}

function editFamilyMember(id) {
  const m = _loadFamily().find(x=>x.id===id);
  if (!m) return;
  _editingFamId = id;
  _selectedFamColor = m.color;
  document.getElementById('family-modal-title').textContent = 'Edit Family Member';
  document.getElementById('fam-name').value  = m.name;
  document.getElementById('fam-rel').value   = m.relationship;
  document.getElementById('fam-age').value   = m.ageGroup;
  document.getElementById('fam-dob').value   = m.dob||'';
  document.getElementById('fam-notes').value = m.notes||'';
  document.getElementById('family-modal')?.classList.remove('hidden');
}

function closeFamilyModal() {
  document.getElementById('family-modal')?.classList.add('hidden');
}

function selectFamColor(c) {
  _selectedFamColor = c;
  document.querySelectorAll('#fam-color-opts button').forEach(btn => {
    const sel = btn.dataset.color === c;
    btn.classList.toggle('border-white',sel);
    btn.classList.toggle('scale-110',sel);
    btn.classList.toggle('border-transparent',!sel);
  });
}

function saveFamilyMember() {
  const name = document.getElementById('fam-name')?.value.trim();
  const rel  = document.getElementById('fam-rel')?.value;
  const age  = document.getElementById('fam-age')?.value;
  const dob  = document.getElementById('fam-dob')?.value;
  const note = document.getElementById('fam-notes')?.value.trim();
  if (!name) { showToast('Name is required','error'); return; }

  const list = _loadFamily();
  if (_editingFamId) {
    const idx = list.findIndex(x=>x.id===_editingFamId);
    if (idx>=0) list[idx] = {...list[idx], name, relationship:rel, ageGroup:age, dob, notes:note, color:_selectedFamColor};
  } else {
    list.push({ id:'FAM-'+Date.now().toString().slice(-8), name, relationship:rel, ageGroup:age, dob, notes:note, color:_selectedFamColor });
  }
  _saveFamily(list);
  closeFamilyModal();
  showToast(`${name} added to family profiles!`,'success');
  navigate('family');
}

function deleteFamilyMember(id) {
  if (!confirm('Remove this family member? Their scans will be kept but this profile will be deleted.')) return;
  _saveFamily(_loadFamily().filter(m=>m.id!==id));
  if (_activeMember()===id) { Store.set('oralai_active_member',null); }
  showToast('Family member removed','info');
  navigate('family');
}

function switchToMember(id) {
  const m = _loadFamily().find(x=>x.id===id);
  if (!m) return;
  _setActiveMember(id);
  // Load that member's scans into AppState
  AppState.scans = Store.get('oralai_scans_'+id) || [];
  showToast(`Switched to ${m.name}'s profile`,'success');
  navigate('dashboard');
}

function switchToSelf() {
  Store.set('oralai_active_member', null);
  AppState.scans = Store.loadScans ? Store.loadScans() : (Store.get('oralai_scans')||[]);
  showToast('Switched to your profile','info');
  navigate('dashboard');
}

// Save scans to active member's key if a family member is active
function saveScansForActiveProfile() {
  const id = _activeMember();
  if (id) { Store.set('oralai_scans_'+id, AppState.scans); }
  else { Store.saveScans(AppState.scans); }
}
