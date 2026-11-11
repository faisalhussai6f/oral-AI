// ── Persistent Store — wraps localStorage ──
// All AppState reads/writes go through here so data survives tab/browser close.

const Store = {
  KEYS: {
    USER:            'oralai_user',
    SCANS:           'oralai_scans',
    SENSORS:         'oralai_sensors',
    SETTINGS:        'oralai_settings',
    APPTS:           'oralai_appointments',
    // Role-based additions
    DOCTOR_REVIEWS:  'oralai_doctor_reviews',
    REPORT_SHARES:   'oralai_report_shares',
    AUDIT_LOGS:      'oralai_audit_logs',
    CONSENT_RECORDS: 'oralai_consent_records',
    DOCTOR_QUEUE:    'oralai_doctor_queue',
  },

  // ── Default seed data ──
  DEFAULTS: {
    scans: [
      {
        id:'RPT-20260512-ANALYSIS', date:'May 12, 2026', type:'Basic RGB',
        device:'Smartphone', region:'Upper front teeth', score:78, status:'analyzed',
        findings:['Mild plaque accumulation','Early enamel demineralization'],
        confidence:92, attentionAreas:2,
        imageDataUrl:null, notes:'Routine monthly check. No pain reported.',
        model:'oralai-demo-mode', processingTime:'1.2s',
        diagnosis:'Mild plaque accumulation and early enamel demineralization detected. No signs of severe periodontitis. Recommend professional cleaning and fluoride therapy.',
        recommendations:[
          'Schedule professional cleaning within 3 months',
          'Use fluoride toothpaste daily',
          'Increase flossing to twice daily',
          'Avoid acidic beverages',
          'Follow-up AI scan in 30 days',
        ],
        sensorSnapshot:{ ph:6.8, temperature:36.6, bacterial:42, moisture:71 },
      },
      {
        id:'RPT-20260430-ANALYSIS', date:'Apr 30, 2026', type:'Advanced Spectral',
        device:'Multispectral Device', region:'Full arch', score:65, status:'analyzed',
        findings:['Gingivitis detected','Moderate plaque','Early cavity on molar #16'],
        confidence:88, attentionAreas:3,
        imageDataUrl:null, notes:'Gum sensitivity noted on lower left side.',
        model:'oralai-demo-mode', processingTime:'1.5s',
        diagnosis:'Gingivitis and moderate plaque accumulation detected. Early cavity observed on molar #16. Immediate dental consultation recommended.',
        recommendations:[
          'Book dentist appointment within 2 weeks',
          'Use antiseptic chlorhexidine mouthwash twice daily',
          'Professional cleaning and root planing advised',
          'Reduce sugar intake',
          'Follow-up scan in 14 days',
        ],
        sensorSnapshot:{ ph:6.4, temperature:36.8, bacterial:58, moisture:63 },
      },
      {
        id:'RPT-20260415-ANALYSIS', date:'Apr 15, 2026', type:'Basic RGB',
        device:'Smartphone', region:'Lower front teeth', score:83, status:'analyzed',
        findings:['Minor plaque near gumline'],
        confidence:95, attentionAreas:1,
        imageDataUrl:null, notes:'',
        model:'oralai-demo-mode', processingTime:'0.9s',
        diagnosis:'Minor plaque accumulation near gumline. Overall oral health is good. Maintain current hygiene routine.',
        recommendations:[
          'Continue brushing twice daily',
          'Add interdental brushes to routine',
          'Maintain 6-monthly professional check-ups',
          'Next AI scan in 30 days',
        ],
        sensorSnapshot:{ ph:7.0, temperature:36.5, bacterial:35, moisture:74 },
      },
    ],
    sensors: {
      ph:6.8, temperature:36.6, bacterial:42, moisture:71,
      phHistory:   [6.4,6.5,6.7,6.8,6.9,7.0,6.8,6.7,6.8,6.8],
      tempHistory: [36.4,36.5,36.5,36.6,36.7,36.6,36.6,36.5,36.6,36.6],
      lastUpdated: new Date().toISOString(),
    },
    settings: {
      notifications: { scanReminders:true, aiRecommendations:true, dentistAlerts:false, sensorAlerts:true },
      theme: 'light',
      backendUrl: 'https://oral-ai-1.onrender.com',
      useBackend: true,    // live Render backend
    },
    appointments: [
      { id:'APT-001', dentist:'Dr. Arjun Sharma', specialty:'Periodontist',   date:'2026-10-05', time:'10:30 AM', mode:'video',    status:'confirmed', notes:'Follow-up on plaque findings', avatar:'AS' },
      { id:'APT-002', dentist:'Dr. Priya Nair',   specialty:'Orthodontist',   date:'2026-10-18', time:'02:00 PM', mode:'in-person', status:'pending',   notes:'Enamel demineralization review', avatar:'PN' },
      { id:'APT-003', dentist:'Dr. Rahul Mehta',  specialty:'Endodontist',    date:'2026-09-28', time:'11:00 AM', mode:'video',    status:'completed', notes:'Root sensitivity checkup', avatar:'RM' },
    ],
  },

  // ── Get ──
  get(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  },

  // ── Set ──
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch(e) { console.warn('localStorage write failed:', e); }
  },

  // ── Remove ──
  remove(key) { localStorage.removeItem(key); },

  // ── Clear all app data ──
  clearAll() { Object.values(this.KEYS).forEach(k => localStorage.removeItem(k)); },

  // ── Load or seed ──
  loadScans() {
    const saved = this.get(this.KEYS.SCANS);
    const base = (saved && saved.length) ? saved : this.DEFAULTS.scans;
    // Back-fill missing fields. imageDataUrl always starts null here —
    // images are stored in IndexedDB and loaded separately via ImageDB.stampAll()
    const migrated = base.map(s => ({
      region:         '',
      sensorSnapshot: null,
      diagnosis:      '',
      recommendations:[],
      model:          'oralai-demo-mode',
      processingTime: '—',
      notes:          '',
      imageDataUrl:   null,   // always null from localStorage; filled by ImageDB
      ...s,
      imageDataUrl:   null,   // enforce: never persist images in localStorage
    }));
    if (!saved || !saved.length) this.set(this.KEYS.SCANS, migrated);
    return migrated;
  },

  saveScans(scans) {
    // Strip imageDataUrl before writing — images live in IndexedDB only
    const stripped = scans.map(s => {
      const { imageDataUrl, ...meta } = s;
      return meta;
    });
    this.set(this.KEYS.SCANS, stripped);
  },

  loadSensors() {
    const saved = this.get(this.KEYS.SENSORS);
    return saved || this.DEFAULTS.sensors;
  },

  saveSensors(s) { this.set(this.KEYS.SENSORS, s); },

  loadSettings() {
    const saved = this.get(this.KEYS.SETTINGS);
    // Deep-merge with defaults so new keys always appear
    return Object.assign({}, this.DEFAULTS.settings, saved || {}, {
      notifications: Object.assign({}, this.DEFAULTS.settings.notifications, (saved || {}).notifications || {})
    });
  },

  saveSettings(s) { this.set(this.KEYS.SETTINGS, s); },

  loadAppointments() {
    const saved = this.get(this.KEYS.APPTS);
    if (saved && saved.length) return saved;
    this.set(this.KEYS.APPTS, this.DEFAULTS.appointments);
    return this.DEFAULTS.appointments;
  },

  saveAppointments(a) { this.set(this.KEYS.APPTS, a); },

  loadUser() { return this.get(this.KEYS.USER); },
  saveUser(u) { this.set(this.KEYS.USER, u); },
  clearUser() { this.remove(this.KEYS.USER); this.remove('oralai_loggedIn'); },

  isLoggedIn() { return !!localStorage.getItem('oralai_loggedIn'); },
  setLoggedIn(v) { if (v) localStorage.setItem('oralai_loggedIn','1'); else localStorage.removeItem('oralai_loggedIn'); },

  // ── Doctor Reviews ─────────────────────────────────────────────────────────
  // Shape: { id, reportId, scanId, patientId, patientName, doctorId, doctorName,
  //          ai_correct, corrected_labels, corrected_severity, review_notes,
  //          status, urgency, follow_up, reviewed_at, created_at }
  loadDoctorReviews() { return this.get(this.KEYS.DOCTOR_REVIEWS) || []; },
  saveDoctorReviews(r) { this.set(this.KEYS.DOCTOR_REVIEWS, r); },
  addDoctorReview(review) {
    const reviews = this.loadDoctorReviews();
    const idx = reviews.findIndex(r => r.id === review.id);
    if (idx >= 0) reviews[idx] = review; else reviews.unshift(review);
    this.saveDoctorReviews(reviews);
    this.addAuditLog({ action:'doctor_review', detail:`Review ${review.id} saved by ${review.doctorName}`, userId: review.doctorId });
  },

  // ── Report Shares ──────────────────────────────────────────────────────────
  // Shape: { id, reportId, scanId, patientId, patientName,
  //          doctorId, doctorEmail, doctorName, sharedAt, expiresAt,
  //          revoked, revokedAt, lastAccessedAt, accessCount }
  loadReportShares() { return this.get(this.KEYS.REPORT_SHARES) || []; },
  saveReportShares(s) { this.set(this.KEYS.REPORT_SHARES, s); },
  shareReport(share) {
    const shares = this.loadReportShares();
    shares.unshift({ accessCount:0, ...share });
    this.saveReportShares(shares);
    this.addAuditLog({ action:'report_shared', detail:`Report ${share.reportId} shared with ${share.doctorEmail}`, userId: share.patientId });
  },
  revokeShare(shareId, patientId) {
    const shares = this.loadReportShares();
    const idx = shares.findIndex(s => s.id === shareId);
    if (idx >= 0) {
      shares[idx].revoked   = true;
      shares[idx].revokedAt = new Date().toISOString();
      this.saveReportShares(shares);
      this.addAuditLog({ action:'share_revoked', detail:`Share ${shareId} revoked`, userId: patientId });
    }
  },
  getActiveSharesForDoctor(doctorEmail) {
    return this.loadReportShares().filter(s =>
      s.doctorEmail === doctorEmail &&
      !s.revoked &&
      (!s.expiresAt || new Date(s.expiresAt) > new Date())
    );
  },

  // ── Consent Records ────────────────────────────────────────────────────────
  // Shape: { id, patientId, doctorId, doctorEmail, granted, grantedAt, revokedAt, scope }
  loadConsentRecords() { return this.get(this.KEYS.CONSENT_RECORDS) || []; },
  saveConsentRecords(c) { this.set(this.KEYS.CONSENT_RECORDS, c); },
  grantConsent(record) {
    const records = this.loadConsentRecords();
    records.unshift(record);
    this.saveConsentRecords(records);
    this.addAuditLog({ action:'consent_granted', detail:`Consent granted to ${record.doctorEmail}`, userId: record.patientId });
  },

  // ── Audit Logs ─────────────────────────────────────────────────────────────
  // Shape: { id, action, detail, userId, timestamp }
  loadAuditLogs() { return this.get(this.KEYS.AUDIT_LOGS) || []; },
  saveAuditLogs(l) { this.set(this.KEYS.AUDIT_LOGS, l); },
  addAuditLog(entry) {
    const logs = this.loadAuditLogs();
    logs.unshift({
      id: 'AUD-' + Date.now() + '-' + Math.random().toString(36).slice(2,6).toUpperCase(),
      timestamp: new Date().toISOString(),
      ...entry,
    });
    // Keep last 500 entries
    this.saveAuditLogs(logs.slice(0, 500));
  },

  // ── Doctor Queue (pending reviews assigned to doctor) ─────────────────────
  // Items are scan summaries that patients have shared with the doctor
  loadDoctorQueue(doctorEmail) {
    const shares = this.getActiveSharesForDoctor(doctorEmail);
    const scans  = this.loadScans();
    const reviews = this.loadDoctorReviews();
    return shares.map(share => {
      const scan   = scans.find(s => s.id === share.scanId) || {};
      const review = reviews.find(r => r.reportId === share.reportId);
      return { ...share, scan, review, reviewed: !!review };
    }).sort((a, b) => {
      // Sort: unreviewed first, then by urgency, then by date
      if (a.reviewed !== b.reviewed) return a.reviewed ? 1 : -1;
      const urgencyOrder = { urgent:0, dentist:1, monitor:2, none:3 };
      const au = urgencyOrder[a.scan?.urgency] ?? 99;
      const bu = urgencyOrder[b.scan?.urgency] ?? 99;
      if (au !== bu) return au - bu;
      return new Date(b.sharedAt) - new Date(a.sharedAt);
    });
  },
};
