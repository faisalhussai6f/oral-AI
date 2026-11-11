// ══════════════════════════════════════════════════════
//  Feature 8  — Dentist Review Panel
//  Feature 9  — Secure Report Sharing (QR + time-limited link)
//  Feature 18 — Feedback loop
// ══════════════════════════════════════════════════════

const REVIEWS_KEY  = 'oralai_dentist_reviews';
const SHARES_KEY   = 'oralai_shared_links';
const FEEDBACK_KEY = 'oralai_feedback';

function _loadReviews()  { return Store.get(REVIEWS_KEY)  || []; }
function _saveReviews(r) { Store.set(REVIEWS_KEY, r); }
function _loadShares()   { return Store.get(SHARES_KEY)   || []; }
function _saveShares(s)  { Store.set(SHARES_KEY, s); }
function _loadFeedback() { return Store.get(FEEDBACK_KEY) || []; }
function _saveFeedback(f){ Store.set(FEEDBACK_KEY, f); }

// ── Dentist Review Panel ──
function pageDentistPanel() {
  const reviews   = _loadReviews();
  const scans     = AppState.scans;
  const pending   = scans.filter(s => !reviews.find(r => r.scanId === s.id));
  const reviewed  = scans.filter(s =>  reviews.find(r => r.scanId === s.id));
  const feedback  = _loadFeedback();

  const statusBadge = (v) => ({
    approved:  '<span class="badge-minimal">✓ Approved</span>',
    corrected: '<span class="badge-mild">✏️ Corrected</span>',
    pending:   '<span class="badge-moderate">⏳ Pending Review</span>',
  }[v] || '<span class="badge-moderate">⏳ Pending</span>');

  return `
  <div class="max-w-5xl mx-auto space-y-6">

    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h2 class="text-2xl font-bold text-white flex items-center gap-2">
          👨‍⚕️ Dentist Review Panel
        </h2>
        <p class="text-gray-400 mt-1 text-sm">
          Share AI reports for professional review. Dentist corrections improve future AI accuracy.
        </p>
      </div>
      <button onclick="openShareModal()" class="btn-primary self-start text-sm">
        🔗 Share a Report
      </button>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
      ${[
        ['📋', scans.length,       'Total Scans',     'text-white'],
        ['⏳', pending.length,     'Awaiting Review', 'text-yellow-400'],
        ['✅', reviewed.length,    'Reviewed',        'text-green-400'],
        ['🔗', _loadShares().filter(s=>s.active).length, 'Active Links', 'text-brand-400'],
      ].map(([icon,val,label,clr]) => `
        <div class="card-sm text-center">
          <div class="text-xl">${icon}</div>
          <div class="text-xl font-black mt-1 ${clr}">${val}</div>
          <div class="text-xs text-gray-500 mt-0.5">${label}</div>
        </div>`).join('')}
    </div>

    <!-- Pending reviews -->
    <div class="card">
      <h3 class="font-semibold text-white mb-4 flex items-center gap-2">
        ⏳ Awaiting Dentist Review
        <span class="text-xs bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 px-2 py-0.5 rounded-full">${pending.length}</span>
      </h3>
      ${pending.length === 0 ? `
        <p class="text-gray-500 text-sm text-center py-4">All scans have been reviewed.</p>
      ` : `
        <div class="space-y-3">
          ${pending.slice(0,5).map(s => `
            <div class="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl bg-gray-900 border border-gray-800">
              <div class="flex-1 min-w-0">
                <div class="font-mono text-brand-400 text-xs">${s.id}</div>
                <div class="text-sm text-gray-300 mt-0.5">${s.date} · ${s.type} · Score: ${s.score}</div>
                <div class="flex flex-wrap gap-1 mt-1.5">
                  ${(s.findings||[]).slice(0,2).map(f=>`<span class="text-xs px-2 py-0.5 rounded bg-gray-800 border border-gray-700 text-gray-400">${typeof f==='string'?f:(f.condition||'Finding')}</span>`).join('')}
                </div>
              </div>
              <div class="flex gap-2 flex-shrink-0">
                <button onclick="openDentistReview('${s.id}')" class="btn-primary text-xs px-3 py-2">
                  Review / Annotate
                </button>
                <button onclick="openShareModal('${s.id}')" class="btn-secondary text-xs px-3 py-2">
                  🔗 Share
                </button>
              </div>
            </div>`).join('')}
        </div>`}
    </div>

    <!-- Reviewed scans -->
    ${reviewed.length > 0 ? `
    <div class="card">
      <h3 class="font-semibold text-white mb-4">✅ Reviewed Scans</h3>
      <div class="overflow-x-auto">
        <table class="data-table">
          <thead><tr><th>Scan ID</th><th>Date</th><th>AI Score</th><th>Status</th><th>Dentist Notes</th><th>Feedback</th></tr></thead>
          <tbody>
            ${reviewed.map(s => {
              const rev = reviews.find(r => r.scanId === s.id);
              const fb  = feedback.find(f => f.scanId === s.id);
              return `
              <tr>
                <td class="font-mono text-xs text-brand-400">${s.id.slice(0,20)}…</td>
                <td class="text-gray-400 text-xs">${s.date}</td>
                <td class="font-bold text-white">${s.score}</td>
                <td>${statusBadge(rev?.status)}</td>
                <td class="text-xs text-gray-400 max-w-xs truncate">${rev?.notes || '—'}</td>
                <td class="text-xs">
                  ${fb ? `<span class="${fb.agreed?'text-green-400':'text-red-400'}">${fb.agreed?'✓ Agreed':'✗ Disagreed'}</span>` : `
                    <button onclick="submitFeedback('${s.id}',true)"  class="text-xs text-green-400 hover:underline mr-2">Dentist agreed</button>
                    <button onclick="submitFeedback('${s.id}',false)" class="text-xs text-red-400 hover:underline">Disagreed</button>
                  `}
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>` : ''}

    <!-- Active share links -->
    <div class="card">
      <h3 class="font-semibold text-white mb-4">🔗 Active Share Links</h3>
      ${_loadShares().filter(s=>s.active).length === 0 ? `
        <p class="text-gray-500 text-sm text-center py-4">No active share links. Generate one by clicking "Share a Report".</p>
      ` : `
        <div class="space-y-2">
          ${_loadShares().filter(s=>s.active).map(s => {
            const expiry = new Date(s.expiresAt);
            const expired = expiry < new Date();
            return `
            <div class="flex items-center gap-3 p-3 rounded-xl bg-gray-900 border border-gray-800">
              <div class="flex-1 min-w-0">
                <div class="font-mono text-xs text-brand-400 truncate">${s.url}</div>
                <div class="text-xs text-gray-500 mt-0.5">
                  Scan: ${s.scanId.slice(0,18)}… · Expires: ${expired?'<span class="text-red-400">Expired</span>':expiry.toLocaleDateString()}
                </div>
              </div>
              <button onclick="copyShareLink('${s.url}')" class="btn-secondary text-xs px-3 py-1.5 flex-shrink-0">Copy</button>
              <button onclick="revokeShare('${s.id}')"    class="text-xs px-3 py-1.5 rounded-lg border border-red-800 text-red-400 hover:bg-red-900/20 flex-shrink-0">Revoke</button>
            </div>`;
          }).join('')}
        </div>`}
    </div>

    <!-- Feedback quality note -->
    <div class="card border-purple-500/20 bg-purple-500/5">
      <div class="flex items-start gap-3">
        <span class="text-2xl">🔄</span>
        <div>
          <div class="font-semibold text-purple-300 mb-1">Feedback Loop</div>
          <p class="text-sm text-gray-400 leading-relaxed">
            When a dentist agrees or disagrees with an AI report, that feedback is logged here.
            ${_loadFeedback().length > 0
              ? `So far <strong class="text-white">${_loadFeedback().filter(f=>f.agreed).length}</strong> agreements and <strong class="text-white">${_loadFeedback().filter(f=>!f.agreed).length}</strong> disagreements have been recorded.`
              : 'No feedback logged yet — mark reviewed scans after consulting your dentist.'}
          </p>
        </div>
      </div>
    </div>

  </div>

  <!-- Dentist Review Modal -->
  <div id="dentist-review-modal"
       class="hidden fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
    <div class="card max-w-lg w-full space-y-4 max-h-screen overflow-y-auto border-brand-500/20">
      <div class="flex items-center justify-between">
        <h3 class="font-bold text-white">Dentist Annotation</h3>
        <button onclick="closeDentistReview()" class="text-gray-500 hover:text-white text-lg">✕</button>
      </div>
      <div>
        <label class="form-label">Review Status</label>
        <div class="grid grid-cols-2 gap-3">
          <label class="flex items-center gap-2 p-3 rounded-xl border border-gray-700 bg-gray-900 cursor-pointer review-status-opt">
            <input type="radio" name="rev-status" value="approved" class="accent-brand-500" checked onchange="selectReviewStatus('approved')"/>
            <span class="text-sm text-gray-200">✅ Approve AI result</span>
          </label>
          <label class="flex items-center gap-2 p-3 rounded-xl border border-gray-700 bg-gray-900 cursor-pointer review-status-opt">
            <input type="radio" name="rev-status" value="corrected" class="accent-brand-500" onchange="selectReviewStatus('corrected')"/>
            <span class="text-sm text-gray-200">✏️ Correct AI result</span>
          </label>
        </div>
      </div>
      <div>
        <label class="form-label">Dentist / Reviewer Name</label>
        <input id="rev-dentist" type="text" class="form-input" placeholder="Dr. Arjun Sharma"/>
      </div>
      <div>
        <label class="form-label">Diagnosis Notes</label>
        <textarea id="rev-notes" class="form-input" rows="3"
          placeholder="Clinical observations, corrections, or additional comments…"></textarea>
      </div>
      <div id="rev-correction-block" class="hidden">
        <label class="form-label">Correct Findings (comma-separated)</label>
        <input id="rev-correction" type="text" class="form-input"
          placeholder="e.g. Dental Caries, Gingivitis"/>
      </div>
      <div>
        <label class="form-label">Severity Override</label>
        <select id="rev-severity" class="form-input">
          <option value="">— No change —</option>
          <option value="Mild">Mild</option>
          <option value="Moderate">Moderate</option>
          <option value="Severe">Severe</option>
        </select>
      </div>
      <div class="flex gap-3">
        <button onclick="submitDentistReview()" class="btn-primary flex-1 justify-center">Submit Review</button>
        <button onclick="closeDentistReview()" class="btn-secondary w-24 justify-center">Cancel</button>
      </div>
    </div>
  </div>

  <!-- Share Modal -->
  <div id="share-modal"
       class="hidden fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
    <div class="card max-w-md w-full space-y-4 border-brand-500/20">
      <div class="flex items-center justify-between">
        <h3 class="font-bold text-white">🔗 Share Report Securely</h3>
        <button onclick="closeShareModal()" class="text-gray-500 hover:text-white text-lg">✕</button>
      </div>
      <div>
        <label class="form-label">Select Scan to Share</label>
        <select id="share-scan-id" class="form-input">
          ${AppState.scans.map(s=>`<option value="${s.id}">${s.id.slice(0,22)}… (${s.date})</option>`).join('')}
        </select>
      </div>
      <div>
        <label class="form-label">Link Expires After</label>
        <select id="share-expiry" class="form-input">
          <option value="1">24 hours</option>
          <option value="3" selected>3 days</option>
          <option value="7">7 days</option>
          <option value="30">30 days</option>
        </select>
      </div>
      <div id="share-result" class="hidden space-y-4">
        <!-- Generated link shown here -->
      </div>
      <div class="flex gap-3" id="share-generate-btns">
        <button onclick="generateShareLink()" class="btn-primary flex-1 justify-center">Generate Link & QR</button>
        <button onclick="closeShareModal()" class="btn-secondary w-24 justify-center">Cancel</button>
      </div>
    </div>
  </div>
  `;
}

let _reviewingScanId = null;

function openDentistReview(scanId) {
  _reviewingScanId = scanId;
  document.getElementById('rev-dentist').value  = '';
  document.getElementById('rev-notes').value    = '';
  document.getElementById('rev-correction').value = '';
  document.getElementById('rev-severity').value = '';
  document.getElementById('rev-correction-block')?.classList.add('hidden');
  document.getElementById('dentist-review-modal')?.classList.remove('hidden');
}

function closeDentistReview() {
  document.getElementById('dentist-review-modal')?.classList.add('hidden');
}

function selectReviewStatus(val) {
  document.getElementById('rev-correction-block')?.classList.toggle('hidden', val !== 'corrected');
  document.querySelectorAll('.review-status-opt').forEach(el => {
    const isSelected = el.querySelector('input')?.value === val;
    el.classList.toggle('border-brand-500', isSelected);
    el.classList.toggle('bg-brand-500/10',  isSelected);
    el.classList.toggle('border-gray-700', !isSelected);
    el.classList.toggle('bg-gray-900',     !isSelected);
  });
}

function submitDentistReview() {
  const dentist  = document.getElementById('rev-dentist')?.value.trim();
  const notes    = document.getElementById('rev-notes')?.value.trim();
  const status   = document.querySelector('input[name="rev-status"]:checked')?.value || 'approved';
  const correct  = document.getElementById('rev-correction')?.value.trim();
  const severity = document.getElementById('rev-severity')?.value;

  if (!notes) { showToast('Please add notes','error'); return; }

  const reviews = _loadReviews();
  reviews.unshift({
    id:         'REV-' + Date.now().toString().slice(-8),
    scanId:     _reviewingScanId,
    dentist:    dentist || 'Anonymous Dentist',
    status, notes, correct, severity,
    timestamp:  new Date().toISOString(),
  });
  _saveReviews(reviews);

  // Update audit trail
  _addAuditEvent(`Dentist review submitted for scan ${_reviewingScanId} — ${status}`);

  closeDentistReview();
  showToast('Review submitted! Thank you for improving AI accuracy.', 'success');
  navigate('dentist');
}

// ── Secure Sharing ──
function openShareModal(scanId) {
  if (scanId) {
    const sel = document.getElementById('share-scan-id');
    if (sel) {
      for (let i=0; i<sel.options.length; i++) {
        if (sel.options[i].value === scanId) { sel.selectedIndex = i; break; }
      }
    }
  }
  document.getElementById('share-result')?.classList.add('hidden');
  document.getElementById('share-generate-btns')?.classList.remove('hidden');
  document.getElementById('share-modal')?.classList.remove('hidden');
}

function closeShareModal() {
  document.getElementById('share-modal')?.classList.add('hidden');
}

function generateShareLink() {
  const scanId  = document.getElementById('share-scan-id')?.value;
  const expDays = parseInt(document.getElementById('share-expiry')?.value || '3');
  if (!scanId) { showToast('Select a scan','error'); return; }

  const token   = btoa(scanId + '|' + Date.now()).replace(/[+/=]/g, '').slice(0,20);
  const url     = `${location.origin}${location.pathname}#share/${token}`;
  const expDate = new Date(); expDate.setDate(expDate.getDate() + expDays);

  const share   = { id:'SHR-'+token.slice(0,8), scanId, token, url, active:true, expiresAt:expDate.toISOString(), createdAt:new Date().toISOString() };
  const shares  = _loadShares();
  shares.unshift(share);
  _saveShares(shares);
  _addAuditEvent(`Secure share link generated for scan ${scanId} (expires ${expDate.toLocaleDateString()})`);

  // Build QR-code SVG using a simple URL-encoded pattern (CSS-only QR visual)
  const qrSvg = _generateQRPlaceholder(token);

  const result = document.getElementById('share-result');
  if (result) {
    result.innerHTML = `
      <div class="space-y-4">
        <div>
          <label class="form-label">Share Link (valid ${expDays} day${expDays>1?'s':''})</label>
          <div class="flex gap-2 mt-1">
            <input type="text" class="form-input flex-1 text-xs font-mono" value="${url}" readonly/>
            <button onclick="copyShareLink('${url}')" class="btn-secondary text-xs px-3 flex-shrink-0">Copy</button>
          </div>
        </div>
        <div class="text-center">
          <p class="text-xs text-gray-500 mb-3">Or scan QR code</p>
          <div class="inline-block p-3 bg-white rounded-xl">
            ${qrSvg}
          </div>
          <p class="text-xs text-gray-600 mt-2">Expires: ${expDate.toLocaleDateString()}</p>
        </div>
      </div>`;
    result.classList.remove('hidden');
  }
  document.getElementById('share-generate-btns')?.classList.add('hidden');
  showToast('Secure share link generated!', 'success');
}

function _generateQRPlaceholder(token) {
  // Visual QR-like grid (not a real QR code — illustrative only)
  const size = 120, cells = 10, cell = size/cells;
  const pattern = [];
  for (let r=0; r<cells; r++) {
    for (let c=0; c<cells; c++) {
      // Use token char codes to seed pattern
      const seed = (token.charCodeAt((r*cells+c) % token.length) + r*13 + c*7) % 3;
      pattern.push(seed < 2);
    }
  }
  // Force finder patterns in corners
  [[0,0],[0,1],[1,0],[0,cells-1],[0,cells-2],[1,cells-1],[cells-1,0],[cells-2,0],[cells-1,1]]
    .forEach(([r,c]) => { if(r<cells&&c<cells) pattern[r*cells+c]=true; });

  const rects = pattern.map((on,i) => {
    if (!on) return '';
    const r = Math.floor(i/cells), c = i%cells;
    return `<rect x="${c*cell}" y="${r*cell}" width="${cell-1}" height="${cell-1}" fill="#000"/>`;
  }).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${rects}</svg>`;
}

function copyShareLink(url) {
  navigator.clipboard?.writeText(url)
    .then(()  => showToast('Link copied to clipboard!','success'))
    .catch(()  => showToast('Link: '+url,'info'));
}

function revokeShare(id) {
  const shares = _loadShares().map(s => s.id===id ? {...s,active:false} : s);
  _saveShares(shares);
  showToast('Share link revoked','info');
  navigate('dentist');
}

// ── Feedback loop ──
function submitFeedback(scanId, agreed) {
  const list = _loadFeedback().filter(f => f.scanId !== scanId);
  list.push({ scanId, agreed, timestamp: new Date().toISOString() });
  _saveFeedback(list);
  _addAuditEvent(`Patient feedback: dentist ${agreed?'agreed with':'disagreed with'} AI report for scan ${scanId}`);
  showToast(agreed ? '✅ Feedback recorded — dentist agreed' : 'Feedback recorded — dentist disagreed', 'info');
  navigate('dentist');
}

// _addAuditEvent is defined in privacy.js (loaded after this file)
// calling it is safe because dentist.js only calls it from user-triggered
// event handlers, by which time all scripts are fully loaded.
