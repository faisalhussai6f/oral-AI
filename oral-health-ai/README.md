# OralAI — AI-Powered Oral Health Monitoring System

Real-time oral disease detection using CNN (MobileNetV2) + IoT sensors.  
Supports **Patient** and **Doctor** role-based dashboards with clinical review workflow.

---

## Quick Start (Windows — PowerShell)

### 1. Start the Frontend (port 8080)
```powershell
cd "C:\Users\faisa\OneDrive\Desktop\major\oral-health-ai"
python3.13 serve.py
# Open: http://localhost:8080
```

### 2. Start the Backend (port 5000)
```powershell
cd "C:\Users\faisa\OneDrive\Desktop\major\oral-health-ai\backend"
.\.venv\Scripts\python.exe app.py
```

### 3. (Optional) Retrain the model
```powershell
cd "C:\Users\faisa\OneDrive\Desktop\major\oral-health-ai\backend"
# Balance dataset first
.\.venv\Scripts\python.exe balance_classes.py
# Retrain (takes ~3 hours on CPU)
.\.venv\Scripts\python.exe rebalance_and_train.py
```

---

## Demo Login Credentials

| Role    | Email                    | Password  |
|---------|--------------------------|-----------|
| Patient | `patient@oralai.demo`    | `demo1234`|
| Doctor  | `doctor@oralai.demo`     | `demo1234`|
| Admin   | `admin@oralai.demo`      | `demo1234`|
| Quick   | `demo@oralai.com`        | `demo1234`|

> Click **"Quick Demo — Patient"** or **"Quick Demo — Doctor"** on the login page  
> to sign in instantly without typing credentials.

---

## Role-Based Dashboards

### Patient Dashboard (`/patient_dashboard`)
- Oral health score ring with trend sparkline
- Upload Scan → AI analysis
- Scan history table
- **Share report with doctor** — enter doctor's email, set expiry, grant consent
- Revoke doctor access at any time from dashboard or Privacy page
- AI findings with clear disclaimer: *"AI Screening Finding — not a clinical diagnosis"*

### Doctor Dashboard (`/doctor_dashboard`)
- Overview: pending reviews, urgent cases, reviews today, total reviews
- **Review Queue** — sorted by urgency and submission date
- Search + filter by patient, status, urgency
- Clinical scan viewer with original image, AI findings, sensor snapshot
- **Review form** with structured fields:
  - AI correct / partially correct / incorrect
  - Corrected labels and severity
  - Clinical notes (required)
  - Follow-up recommendation
  - Urgent referral flag
- Doctor review clearly separated from AI output
- Audit log: every review action is logged

### Admin Dashboard (`/admin_dashboard`)
- System stats: total reviews, shares, audit events
- Full audit log view

---

## Role-Based API Endpoints

All role-based endpoints require `X-User-Id` and `X-User-Role` headers.

| Method | Endpoint | Role |
|--------|----------|------|
| GET | `/api/patient/dashboard` | patient |
| GET | `/api/patient/scans` | patient |
| GET | `/api/patient/scans/<id>` | patient, doctor |
| POST | `/api/patient/reports/<id>/share` | patient |
| DELETE | `/api/patient/report-shares/<id>` | patient |
| GET | `/api/doctor/dashboard` | doctor |
| GET | `/api/doctor/review-queue` | doctor |
| GET | `/api/doctor/patients/<id>` | doctor |
| GET | `/api/doctor/reports/<id>` | doctor |
| POST | `/api/doctor/reports/<id>/review` | doctor |
| GET | `/api/doctor/analytics` | doctor |
| GET | `/api/audit-logs` | admin, doctor |

---

## Security Notes

- Patients can only access their own scans
- Doctors can only access reports explicitly shared with them (with patient consent)
- Patients can revoke access at any time — revoked shares immediately block doctor access
- Every share, revoke, and review action is written to the audit log
- All AI outputs include a medical disclaimer
- Backend uses `X-User-Role` header for authorisation (replace with JWT for production)

---

## AI Model

- Architecture: MobileNetV2 (PyTorch)
- Classes: caries, gingivitis, healthy, oral_lesion, oral_ulcer, plaque
- Val accuracy: **90.6%** on 21,326 balanced images
- Datasets: `sizlingdhairya1/oral-infection` + `zaidpy/oral-cancer-dataset`
- Model path: `backend/oralai_best.pth`

---

## Project Structure

```
oral-health-ai/
├── index.html                  # SPA entry point
├── serve.py                    # Python HTTP server (port 8080)
├── assets/
│   ├── app.js                  # AppState, renderShell, boot
│   ├── store.js                # localStorage persistence + role-based stores
│   ├── router.js               # SPA router
│   ├── pages.js                # Route registration + role guards
│   └── imageDB.js              # IndexedDB image storage
├── pages/
│   ├── auth.js                 # Login/register with role selection
│   ├── dashboard_patient.js    # Patient dashboard
│   ├── dashboard_doctor.js     # Doctor dashboard + review queue
│   ├── doctor_review.js        # Clinical review form
│   ├── report.js               # Scan report + share-with-doctor
│   └── [26 other page files]
└── backend/
    ├── app.py                  # Flask API (AI inference + role-based routes)
    ├── train.py                # MobileNetV2 training
    ├── rebalance_and_train.py  # Balanced retraining script
    ├── balance_classes.py      # Dataset balancing
    ├── oralai_best.pth         # Trained model weights
    └── class_names.json        # Class labels
```

---

## Changed Files (Role Dashboard Feature)

| File | Change |
|------|--------|
| `pages/auth.js` | Added role field, demo accounts, `_bootApp` routing by role, doctor quick-demo |
| `assets/store.js` | Added DOCTOR_REVIEWS, REPORT_SHARES, AUDIT_LOGS, CONSENT_RECORDS keys + CRUD |
| `assets/app.js` | `renderShell` rewritten with role-specific sidebars, topbar action, role badge |
| `assets/pages.js` | Route registration with `guard()` HOF, new routes, admin dashboard inline |
| `pages/dashboard_patient.js` | New: patient-focused dashboard |
| `pages/dashboard_doctor.js` | New: doctor dashboard + queue page |
| `pages/doctor_review.js` | New: clinical scan viewer + structured review form |
| `pages/report.js` | Added AI disclaimer, doctor review display, share-with-doctor panel |
| `backend/app.py` | Added 12 role-based API endpoints with ownership/consent validation |
| `index.html` | Added `<script>` tags for new page files |

---

## Remaining Setup for Production

1. Replace `X-User-Id` / `X-User-Role` header auth with proper JWT
2. Move scan/review/share data from in-memory dicts to a database (SQLite/PostgreSQL)
3. Add real email verification for doctor role registration
4. Set `FLASK_DEBUG=0` and use a WSGI server (gunicorn) in production
5. Add HTTPS — never run patient data over HTTP in production
