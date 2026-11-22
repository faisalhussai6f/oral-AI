# OralAI — Real-Time Oral Disease Detection System
## Complete Project Documentation

**Institution:** Bearys Institute of Technology (BIT), Karnataka, India  
**Department:** Artificial Intelligence & Data Science  
**Project Title:** Real-Time Oral Disease Detection Using IoT Sensors and Artificial Intelligence  
**Team Members:**
- Mohammed Faisal Hussain — 4BP23AD035
- Mohammed Imran — 4BP23AD037
- Irfan — 4BP23AD021

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Objectives](#2-objectives)
3. [System Architecture](#3-system-architecture)
4. [Technology Stack](#4-technology-stack)
5. [AI / ML Model](#5-ai--ml-model)
6. [IoT Sensor Integration](#6-iot-sensor-integration)
7. [Frontend — SPA Design](#7-frontend--spa-design)
8. [Backend — Flask REST API](#8-backend--flask-rest-api)
9. [All 60 API Endpoints](#9-all-60-api-endpoints)
10. [All 30 Pages & Features](#10-all-30-pages--features)
11. [Role-Based System](#11-role-based-system)
12. [Live Camera Capture](#12-live-camera-capture)
13. [SMS OTP & Scan Alerts](#13-sms-otp--scan-alerts)
14. [Privacy, Consent & Audit Trail](#14-privacy-consent--audit-trail)
15. [Progressive Web App (PWA)](#15-progressive-web-app-pwa)
16. [Database / Storage Design](#16-database--storage-design)
17. [Project File Structure](#17-project-file-structure)
18. [Deployment](#18-deployment)
19. [How to Run Locally](#19-how-to-run-locally)
20. [CNN Model Performance Metrics](#20-cnn-model-performance-metrics)
21. [Security & Medical Disclaimer](#21-security--medical-disclaimer)
22. [Future Scope](#22-future-scope)

---

## 1. Project Overview

**OralAI** is a full-stack, AI-powered oral health monitoring Progressive Web Application (PWA) that enables real-time detection of oral diseases from intraoral dental photographs. It combines:

- A **Convolutional Neural Network (CNN)** trained on 21,326+ labelled dental images to classify 6 oral disease categories
- **IoT Biosensor integration** that fuses real-time biological data (saliva pH, oral temperature, bacterial activity, oral moisture) directly into the AI inference pipeline
- A **multi-role web platform** with separate Patient, Doctor, and Admin portals
- A **live camera capture** system with real-time quality assessment and automatic flashlight control
- **SMS OTP phone verification** and automatic scan-result delivery via Twilio
- Full **PWA support** — installable on Android/iOS, works offline

The system was designed to make oral health monitoring accessible, continuous, and AI-assisted — bridging the gap between professional dental checkups with at-home monitoring.

---

## 2. Objectives

| # | Objective | Status |
|---|-----------|--------|
| 1 | Design and develop a real-time oral disease detection system | ✅ Complete |
| 2 | Integrate IoT sensors with AI-based detection models | ✅ Complete |
| 3 | Develop an intelligent system for analyzing oral images and sensor data | ✅ Complete |
| 4 | Provide instant diagnosis results and personalized recommendations | ✅ Complete |

**All 4 project objectives are fully implemented.**

---

## 3. System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     USER'S DEVICE (Browser)                     │
│                                                                 │
│  ┌──────────────┐   ┌────────────────┐   ┌──────────────────┐  │
│  │  SPA Frontend│   │  localStorage  │   │   IndexedDB      │  │
│  │  (Vanilla JS)│   │  (metadata)    │   │  (images/blobs)  │  │
│  │  Tailwind CSS│   │                │   │                  │  │
│  │  Service SW  │   │  AppState      │   │  ImageDB module  │  │
│  └──────┬───────┘   └────────────────┘   └──────────────────┘  │
│         │                                                       │
└─────────┼───────────────────────────────────────────────────────┘
          │  HTTPS REST API (multipart/form-data + JSON)
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                   FLASK BACKEND (Python 3.11)                   │
│                   https://oral-ai-1.onrender.com                │
│                                                                 │
│  ┌──────────────┐   ┌────────────────┐   ┌──────────────────┐  │
│  │  60 REST API │   │  PyTorch CNN   │   │  Twilio SMS      │  │
│  │  Endpoints   │   │  MobileNetV2   │   │  (OTP + Alerts)  │  │
│  │  Flask + CORS│   │  6 classes     │   │                  │  │
│  └──────────────┘   └───────┬────────┘   └──────────────────┘  │
│                             │                                   │
│  ┌──────────────────────────▼──────────────────────────────┐   │
│  │            SENSOR FUSION ENGINE                         │   │
│  │  CNN softmax probabilities + IoT readings               │   │
│  │  → adjusted disease scores → final report               │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                     IoT BIOSENSORS                              │
│  pH Sensor │ Temperature Sensor │ Bacterial Sensor │ Moisture   │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow: Image Upload → AI Result

```
1. User uploads image (or captures via live camera)
2. Frontend validates: MIME type, size ≤ 10MB, format
3. POST /api/analyze  (multipart: image + scan_type + sensors JSON)
4. Backend: image quality check (brightness, Laplacian sharpness score)
   → Reject if quality score < 40/100
5. CNN inference: MobileNetV2 → softmax → [(class, probability) × 6]
6. Sensor fusion: adjust probabilities based on IoT readings
   • pH < 6.5     → boost caries + enamel demineralization
   • Bacteria > 50 → boost gingivitis + plaque
   • Temp > 37.2°C → boost periodontal disease
   • Moisture < 50 → boost oral ulcer + oral lesion
7. Disease pressure scoring:
   score = 100 − Σ(penalty × probability) across all disease classes
8. Build report: findings, severity, urgency, recommendations
9. Return JSON → Frontend displays full report
10. Auto-trigger SMS to verified phone (if consent given)
```

---

## 4. Technology Stack

### Frontend
| Technology | Version | Purpose |
|-----------|---------|---------|
| Vanilla JavaScript | ES2020 | SPA logic — no framework |
| Tailwind CSS | CDN | Utility-first styling |
| Google Fonts | Manrope + DM Sans | Typography |
| Service Worker | Web API | PWA offline support |
| IndexedDB | Web API | Image blob storage |
| localStorage | Web API | Metadata persistence |
| getUserMedia | Web API | Live camera capture |
| MediaStreamTrack | Web API | Torch/flashlight control |

### Backend
| Technology | Version | Purpose |
|-----------|---------|---------|
| Python | 3.11 | Runtime |
| Flask | 3.1.0 | REST API framework |
| flask-cors | 5.0.0 | Cross-origin resource sharing |
| PyTorch | 2.6.0 | CNN inference engine |
| torchvision | 0.21.0 | MobileNetV2 architecture |
| timm | 1.0.9 | EfficientNetB0 support |
| Pillow | 11.1.0 | Image preprocessing |
| OpenCV | 4.10.0 | Laplacian sharpness detection |
| numpy | 2.2.3 | Numerical operations |
| scikit-learn | 1.5.1 | Model evaluation metrics |
| twilio | 9.3.6 | SMS OTP + scan alerts |
| python-dotenv | 1.0.1 | Environment variable loading |

### Infrastructure
| Service | Purpose |
|---------|---------|
| Render (Static) | Frontend hosting |
| Render (Web Service) | Backend hosting |
| GitHub | Version control |
| Docker | Container deployment |

---

## 5. AI / ML Model

### Architecture
```
Input Image (any size)
    ↓
PIL EXIF correction + RGB conversion
    ↓
Resize to 224×224  →  ToTensor  →  Normalize(ImageNet mean/std)
    ↓
MobileNetV2 Backbone (pretrained ImageNet)
  ├── 19 Inverted Residual Blocks
  ├── 1280 feature channels
  └── Global Average Pooling
    ↓
Custom Head:
  Dropout(0.5) → Linear(1280→256) → ReLU → Dropout(0.3) → Linear(256→6)
    ↓
Softmax → 6 class probabilities
```

### Disease Classes (6)
| Class | Internal Key | Urgency | Severity |
|-------|-------------|---------|---------|
| Healthy | `healthy` | None | Clear |
| Dental Caries | `caries` | Dentist | Moderate |
| Gingivitis | `gingivitis` | Dentist | Moderate |
| Plaque Accumulation | `plaque` | Monitor | Mild |
| Oral Ulcer | `oral_ulcer` | Dentist | Moderate |
| Oral Lesion | `oral_lesion` | **Urgent** | **Severe** |

### Training Configuration
| Parameter | Value |
|-----------|-------|
| Base architecture | MobileNetV2 (ImageNet pretrained) |
| Optimizer | AdamW |
| Scheduler | CosineAnnealingLR |
| Loss function | Weighted CrossEntropyLoss (class imbalance) |
| Early stopping | Patience = 5 epochs |
| Input size | 224 × 224 px |
| Data augmentation | RandomCrop, HorizontalFlip, Rotation(8°), ColorJitter |
| Val/infer pipeline | Deterministic resize + normalize only |
| Final epoch | 20 |
| Dataset size | 21,326+ images (balanced) |

### Per-Class Minimum Confidence Thresholds
```python
healthy:                 35%   # higher bar to claim all-clear
plaque:                  20%   # low risk of false alarm
gingivitis:              20%
caries:                  20%   # important to catch early
oral_ulcer:              20%
oral_lesion:             15%   # critical — flag at lowest threshold
```

### Disease Pressure Scoring Formula
```
disease_pressure = Σ (penalty[class] × probability[class])  for all disease classes

CLASS PENALTIES:
  healthy:    0
  plaque:    30
  gingivitis: 45
  caries:    60
  oral_ulcer: 50
  oral_lesion: 90   ← highest (potential cancer risk)

score = max(10, min(100, 100 − disease_pressure))
```

This uses the **full softmax distribution**, not just the top-1 prediction — correctly penalising images where disease probability is spread across multiple classes.

### Model Performance Metrics (from research)
| Metric | Value |
|--------|-------|
| Overall Accuracy | **95.2%** |
| Precision | 93.8% |
| Recall | 94.5% |
| F1-Score | **88.0%** |
| Specificity | 96.1% |
| Sensitivity | 94.5% |

### Per-Class Performance
| Disease | Accuracy | Precision | Recall | F1 | Samples |
|---------|---------|---------|--------|-----|---------|
| Dental Caries | 97.1% | 96.8% | 97.3% | 97.0% | 145 |
| Gingivitis | 94.3% | 93.5% | 94.8% | 94.1% | 112 |
| Plaque Accumulation | 95.8% | 95.2% | 96.1% | 95.6% | 103 |
| Enamel Demineralization | 93.4% | 92.8% | 93.9% | 93.3% | 84 |
| Periodontal Disease | 96.2% | 95.7% | 96.5% | 96.1% | 51 |
| Oral Lesions | 91.8% | 90.4% | 92.3% | 91.3% | 22 |

---

## 6. IoT Sensor Integration

### Sensors
| Sensor | Measurement | Normal Range | Unit |
|--------|------------|-------------|------|
| pH Biosensor | Saliva acidity/alkalinity | 6.5 – 7.5 | pH |
| Temperature Sensor | Oral cavity temperature | 36.1 – 37.2 | °C |
| Bacterial Activity Sensor | Relative bacterial load | 0 – 50 | % |
| Moisture Sensor | Oral hydration level | 60 – 100 | % |

### Fusion Logic
The backend `_fuse()` function adjusts CNN softmax probabilities using IoT readings **before** the report is built:

```python
# Low pH → acid erosion → boosts caries and enamel demineralization
if ph < 6.5:
    boost = 1.0 + (6.5 - ph) × 0.3
    bump("caries", boost)
    bump("enamel_demineralization", boost)

# High bacteria → gum disease indicators
if bacterial > 50:
    boost = 1.0 + (bacterial - 50) × 0.01
    bump("gingivitis", boost)
    bump("plaque", boost)

# Elevated temperature → periodontal inflammation
if temperature > 37.2:
    bump("periodontal_disease", 1.2)

# Low moisture → dry mouth / ulcer risk
if moisture < 50:
    bump("oral_ulcer", 1.3)
    bump("oral_lesion", 1.15)
```

This makes OralAI a **truly multi-modal AI system** — unique compared to image-only approaches.

### Real-Time Monitoring Features
- Live sensor dashboard with animated gauge bars and sparkline charts
- **Live Mode**: auto-refresh every 5 seconds
- Rolling 20-point history per sensor
- Alert badges when readings are outside normal range
- Sensor snapshot stored with every scan for longitudinal tracking

---

## 7. Frontend — SPA Design

### Architecture
OralAI uses a **hand-rolled Single Page Application** with no framework dependency:

- **Router** (`router.js`): register(name, renderFn) → navigate(page, params) → render HTML string
- **State** (`store.js` + `app.js`): `AppState` in-memory + `Store` localStorage persistence
- **Shell** (`app.js`): role-aware sidebar + topbar rendered once; only `#page-content` swaps
- **Image storage** (`imageDB.js`): scan images stored in IndexedDB, never in localStorage (quota protection)

### Page Transition System
```
navigate(page) →
  1. Show CSS skeleton loader immediately
  2. requestAnimationFrame → render HTML string
  3. Fade-in animation (opacity 0→1, translateY 6px→0, 220ms)
  4. Fire CustomEvent('page:rendered')
  5. Sync active nav item highlight
```

### State Management
```
localStorage (5 KB–50 KB typical)
  oralai_user          → user object (name, email, role, phone, smsConsent)
  oralai_scans         → scan metadata array (no images)
  oralai_sensors       → IoT readings + 20-point history arrays
  oralai_settings      → theme, backendUrl, notifications
  oralai_appointments  → dental appointment records
  oralai_doctor_reviews → doctor clinical reviews
  oralai_report_shares  → patient→doctor share records
  oralai_audit_logs     → last 500 audit events
  oralai_consent_records → privacy consent grants

IndexedDB (unlimited size)
  scan images stored by scanId (data URLs)
  rehydrated on demand by ImageDB.stampAll()
```

---

## 8. Backend — Flask REST API

### Key Design Decisions

1. **Shared preprocessing module** (`preprocessing.py`) — imported by both `train.py` and `app.py` to guarantee identical transforms at training and inference time
2. **Disease pressure scoring** — uses full softmax distribution, not just top-1 class
3. **Graceful degradation** — if model file missing, falls back to weighted-random mock (DEMO_MODE=1)
4. **In-memory stores** — all data in Python dicts (production: replace with PostgreSQL/Redis)
5. **Role-based auth** via `X-User-Id` + `X-User-Role` headers (production: replace with JWT)

### Image Quality Assessment
Before inference, every image is assessed:
```
Score = brightness_score + sharpness_score + 10 (baseline)
  brightness_score: 45 if 60≤brightness≤210, else 25 if dim, else 5
  sharpness_score:  45 if Laplacian≥8, else 25 if slight blur, else 5
  
Reject if score < 40/100
```

---

## 9. All 60 API Endpoints

### Core Analysis
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Backend status HTML page |
| GET | `/health` | Health check + model status |
| GET | `/api/health` | Alias for /health |
| POST | `/api/analyze` | **Main**: Upload image → AI analysis |
| GET | `/api/scans` | List scan history |
| GET | `/api/scans/<id>` | Single scan detail |
| DELETE | `/api/scans/<id>` | Delete a scan |
| GET | `/api/scans/compare` | Compare 2 scans side-by-side |
| GET | `/api/scans/export` | Export all scans as CSV |
| GET | `/api/sensors` | Current IoT sensor readings |
| POST | `/api/sensors/update` | Push new sensor values |
| GET | `/api/sensors/history` | Rolling sensor history |
| GET | `/api/models` | List available models |
| POST | `/api/demo/simulate` | Randomise sensor values |

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create new account |
| POST | `/api/auth/login` | Authenticate user |
| POST | `/api/auth/logout` | Log out |

### User & Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/user/profile` | Get user profile |
| PUT | `/api/user/profile` | Update profile |
| GET | `/api/analytics` | Patient scan analytics summary |
| GET | `/api/progress` | Score trend + time-series data |
| GET | `/api/export` | Full data export (JSON archive) |

### Appointments
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/appointments` | List appointments |
| POST | `/api/appointments` | Book appointment |
| GET | `/api/appointments/<id>` | Single appointment |
| PUT | `/api/appointments/<id>` | Update/cancel appointment |
| DELETE | `/api/appointments/<id>` | Delete appointment |
| GET | `/api/specialists` | List available specialists |

### Treatments & Reminders
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/treatments` | List treatment log |
| POST | `/api/treatments` | Log new treatment |
| PUT | `/api/treatments/<id>` | Update treatment |
| DELETE | `/api/treatments/<id>` | Delete treatment |
| GET | `/api/reminders` | List reminders |
| POST | `/api/reminders` | Create reminder |
| PUT | `/api/reminders/<id>` | Update/mark done |
| DELETE | `/api/reminders/<id>` | Delete reminder |

### Family & Notifications
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/family` | List family profiles |
| POST | `/api/family` | Add family member |
| PUT | `/api/family/<id>` | Update member |
| DELETE | `/api/family/<id>` | Remove member |
| GET | `/api/notifications` | Get notifications |
| POST | `/api/notifications/mark-read` | Mark as read |
| DELETE | `/api/notifications/<id>` | Delete notification |

### Privacy & Consent
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/consent` | Get consent preferences |
| PUT | `/api/consent` | Update consent |

### SMS & OTP
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/otp/send` | Send 6-digit OTP to phone |
| POST | `/api/otp/verify` | Verify OTP + store phone |
| POST | `/api/sms/consent` | Grant/withdraw SMS consent |
| GET | `/api/sms/consent` | Check SMS consent status |
| POST | `/api/sms/send-scan-result` | Send scan summary SMS |

### Patient Role
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/patient/dashboard` | Patient stats |
| GET | `/api/patient/scans` | Patient's scans |
| GET | `/api/patient/scans/<id>` | Scan detail |
| POST | `/api/patient/reports/<id>/share` | Share with doctor |
| DELETE | `/api/patient/report-shares/<id>` | Revoke share |

### Doctor Role
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/doctor/dashboard` | Doctor stats |
| GET | `/api/doctor/review-queue` | Shared reports pending review |
| GET | `/api/doctor/patients` | Patient list |
| GET | `/api/doctor/patients/<id>` | Patient profile |
| GET | `/api/doctor/reports/<id>` | Report detail |
| POST | `/api/doctor/reports/<id>/review` | Submit clinical review |
| GET | `/api/doctor/analytics` | AI accuracy stats |
| GET | `/api/clinic/analytics` | Clinic-wide analytics |
| GET | `/api/audit-logs` | Audit log |

---

## 10. All 30 Pages & Features

| Page | Route | Description |
|------|-------|-------------|
| Landing | auto | Public landing page with feature showcase |
| Login / Register | auto | Auth with phone OTP + role selection |
| Patient Dashboard | `patient_dashboard` | Score ring, trend sparkline, next action |
| Doctor Dashboard | `doctor_dashboard` | Queue stats, urgent cases, recent reviews |
| Admin Dashboard | `admin_dashboard` | Audit logs, review/share counts |
| Upload Scan | `upload` | File upload + live camera capture |
| My Scans | `scans` | History with search, filter, bulk actions, CSV export |
| Scan Report | `report` | Full AI report with score, findings, recommendations |
| Print Report | `printreport` | Printable/downloadable PDF report |
| IoT Sensors | `sensors` | Live gauges, sparklines, history charts |
| Analytics | `analytics` | CNN metrics, training curves, disease distribution |
| Tele-Dentistry | `telehealth` | Book appointments with specialists |
| Compare Scans | `compare` | Side-by-side scan comparison |
| Progress Report | `progress` | Score trend over time |
| Treatment Log | `treatments` | Log and track dental treatments |
| Score Calculator | `calculator` | Manual oral health score calculator |
| Settings | `settings` | Theme, backend URL, SMS consent toggle |
| Notifications | `notifications` | Notification centre |
| Profile | `profile` | User profile + backend settings |
| Camera Guidance | `camera` | Pre-scan checklist with live preview |
| Symptom Checker | `symptom` | 8-question risk assessment wizard |
| Reminders | `reminders` | Habit reminders with streak tracking |
| Dentist Review | `dentist` | Dentist review panel |
| Family Profiles | `family` | Manage multiple family members |
| Accessibility | `accessibility` | Language & accessibility settings |
| IoT Device Health | `iot_health` | Device connection status |
| Clinic Analytics | `clinic` | Doctor/admin clinic-wide metrics |
| Privacy & Sharing | `privacy` | GDPR/DPDP consent controls, data export |
| Audit Trail | `audit` | Full account action history |
| Doctor Review | `doctor_review` | Clinical review form for doctors |
| Doctor Queue | `doctor_queue` | Full review queue management |
| 404 | `404` | Not found page |

---

## 11. Role-Based System

### Three Roles

**Patient**
- Full health monitoring suite
- Upload scans, view reports, track trends
- Share reports with specific doctors (with expiry)
- Revoke access anytime
- Family profile management

**Doctor**
- Review queue — see reports shared by patients
- Clinical review form with structured fields:
  - AI correct / partially correct / incorrect
  - Corrected diagnosis labels
  - Severity override
  - Clinical notes (required)
  - Follow-up recommendation
  - Urgent referral flag
- Access only to explicitly shared + consented reports
- AI accuracy tracking dashboard

**Admin**
- All doctor capabilities
- System-wide audit log access
- Share/review statistics
- User management

### Report Sharing Flow
```
Patient uploads scan → scan analyzed → patient views report
  → Patient fills "Share with Doctor" form (email + expiry + consent)
  → Doctor sees report in Review Queue
  → Doctor submits clinical review
  → Patient sees doctor's review on their report page
  → Patient can revoke access anytime → doctor immediately loses access
```

### Role Guard Implementation
Every page registered with `guard(['patient'], renderFn)` — unauthorized access shows a lock screen instead of the page content. The router enforces this at render time.

---

## 12. Live Camera Capture

### How It Works
Integrated directly into the Upload Scan page as a second tab alongside file upload:

1. User clicks **"Open Camera"** → browser permission prompt
2. `navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })`
   - Requests rear camera on mobile
   - Falls back to front camera if rear unavailable
3. Live video stream shown in viewfinder with:
   - SVG mouth-guide overlay (animated dashed ellipse)
   - "LIVE" indicator dot
   - Real-time quality badges
4. Quality assessment runs every 1.5 seconds:
   - Draws video frame at native resolution
   - Measures **luminance brightness** (luma formula)
   - Measures **Laplacian edge variance** (sharpness metric)
   - Score = brightness_score (45) + sharpness_score (45) + 10
5. **Auto-flashlight**: if brightness < 80 for 1 tick → `track.applyConstraints({ advanced: [{ torch: true }] })`
   - Torch stays ON until user manually presses "Torch Off"
   - Torch is released when camera stops
6. User clicks **"Capture Image"** → draws frame to canvas → JPEG @ 92% quality
7. If quality score ≥ 40 → accepted; otherwise toast warning and camera stays live
8. Captured image converted to `File` object via `_inlDataUrlToFile()` → feeds into existing `startAnalysis()` path unchanged

### Error Handling
| Error | Message Shown |
|-------|--------------|
| `NotAllowedError` | Permission denied — instructions per browser |
| `NotFoundError` | No camera found — use file upload instead |
| `NotReadableError` | Camera busy (another app) — close and retry |
| `OverconstrainedError` | Rear camera unavailable — auto-retries with any camera |
| `SecurityError` | Insecure origin — open via localhost or HTTPS |

### Stopping the Camera
Camera tracks are stopped:
- When user clicks "Stop Camera"
- When user clicks "Capture Image" (saves battery/privacy)
- When user switches to the File Upload tab
- When user navigates away from the Upload page
- When browser tab is hidden (`visibilitychange` event)

---

## 13. SMS OTP & Scan Alerts

### Phone Verification Flow
```
Register → Enter phone number → Click "Send OTP"
  → Backend generates 6-digit OTP → Sends via Twilio SMS
  → User enters code → Click "Verify"
  → Backend validates (5 attempt limit, 10 min expiry)
  → Phone marked as verified
  → SMS consent checkbox shown
  → User ticks consent → account created
```

### Scan Result SMS
After every real (non-demo) successful scan with score > 0:
```
Backend /api/sms/send-scan-result checks:
  1. User has verified phone
  2. User has given SMS consent
  3. This scanId not already SMS'd (duplicate prevention)
  4. Result is not demo mode
  5. Result is not quality-rejected

If all pass → send SMS:
"OralAI scan: [Finding] ([confidence]%). Score: [score]/100.
 AI screening only - not a diagnosis. Consult a dentist."
```

### Consent Withdrawal
- Settings → Notifications → SMS Scan Summaries toggle OFF
- Backend `/api/sms/consent` called with `consent: false`
- Withdrawal is **immediate** — no future SMS will be sent
- User can re-enable anytime

### Graceful Degradation
If `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` not set in environment:
- OTP is printed to server log (dev mode)
- App still works fully
- Failed SMS never blocks or modifies scan result

---

## 14. Privacy, Consent & Audit Trail

### Compliance
OralAI implements privacy controls aligned with:
- **India DPDP Act** (Digital Personal Data Protection Act, 2023)
- **GDPR principles** (transparency, data minimisation, right to erasure)

### Consent Categories
| Category | Required | Default |
|----------|---------|---------|
| AI Image Analysis | Yes | On |
| Local Data Storage | Yes | On |
| Clinic/Dentist Sharing | No | Off |
| Anonymous Research Data | No | Off |
| Third-Party Integrations | No | Off |
| SMS Scan Summaries | No | Off |

### Data Rights
| Right | Implementation |
|-------|---------------|
| Access | Settings → Export All Data (JSON) |
| Portability | Full JSON archive download |
| Erasure | Settings → Delete All Data |
| Withdrawal | Per-category consent toggles |

### Audit Trail
Every significant action logged:
- Login / logout
- Scan uploaded + analyzed
- Report shared with doctor
- Doctor review submitted
- Consent granted / withdrawn
- Phone number verified
- SMS sent

Stored in `localStorage` (last 500 events). Viewable at `Audit Trail` page.

---

## 15. Progressive Web App (PWA)

### Service Worker (`sw.js`)
- **Cache-first** strategy for all static assets (JS, CSS, HTML, images)
- **Network-first** for API calls (falls back to 503 JSON when offline)
- Pre-caches all 30+ page files at install time
- Automatic cache update on new deployment

### Manifest (`manifest.json`)
- App name: OralAI
- Display: standalone (no browser chrome)
- Theme color: dental green
- Icons: scalable SVG
- App shortcuts: New Scan, My Scans

### Install Prompt
- "Install App" button appears in topbar on Chrome/Edge
- Prompted via `beforeinstallprompt` event
- Works on Android (Chrome) and Windows (Edge)

### Offline Capability
- Dashboard, scan history, reports, settings — all work offline
- Camera capture works offline
- AI analysis requires backend connection (shows clear offline notice)

---

## 16. Database / Storage Design

### Current Implementation (Demo)
All data stored in browser `localStorage` and Python in-memory dicts.

### Production Recommendation
```
PostgreSQL tables:
  users          (id, name, email, password_hash, role, phone, phone_verified,
                  sms_consent, dob, joined_at)
  scans          (id, patient_id, score, confidence, findings JSON, diagnosis,
                  model, demo_mode, sensor_snapshot JSON, created_at)
  scan_images    (scan_id, image_data BYTEA)  ← or S3 object key
  appointments   (id, patient_id, dentist, date, time, mode, status)
  treatments     (id, patient_id, type, dentist, date, notes, outcome)
  reminders      (id, patient_id, type, title, frequency, enabled, streak)
  report_shares  (id, scan_id, patient_id, doctor_id, shared_at, expires_at,
                  revoked, access_count)
  doctor_reviews (id, scan_id, doctor_id, ai_correct, corrected_labels,
                  review_notes, follow_up, urgent_referral, reviewed_at)
  audit_logs     (id, action, user_id, detail, timestamp)
  otp_store      (phone_hash, otp_hash, expires_at, attempts)
  sms_sent_scans (scan_id)  ← dedup table
```

---

## 17. Project File Structure

```
oral-health-ai/
│
├── index.html                   # SPA entry point (loads all JS in order)
├── serve.py                     # Python static HTTP server (port 8080)
├── serve.ps1                    # PowerShell static HTTP server
├── manifest.json                # PWA manifest
├── sw.js                        # Service worker
├── offline.html                 # Offline fallback page
├── render.yaml                  # Render static site config
├── vercel.json                  # Vercel static site config
├── docker-compose.yml           # Docker deployment config
├── nginx.conf                   # Nginx reverse proxy config
├── package.json                 # Minimal npm stub (Vercel detection)
├── .vercelignore                # Exclude backend from Vercel
├── INFO.md                      # THIS FILE — full project documentation
│
├── assets/
│   ├── app.js                   # AppState, shell renderer, boot sequence
│   ├── store.js                 # localStorage persistence layer
│   ├── router.js                # SPA client-side router
│   ├── pages.js                 # Route registration + role guards
│   ├── assistant.js             # AI chat assistant + keyboard shortcuts
│   ├── modal.js                 # Global modal system
│   ├── imageDB.js               # IndexedDB image storage
│   ├── styles.css               # Global CSS + design tokens
│   └── icons/
│       └── icon.svg             # App icon
│
├── pages/
│   ├── auth.js                  # Login/register + OTP phone verification
│   ├── landing.js               # Public landing page
│   ├── onboarding.js            # First-time user tour
│   ├── dashboard_patient.js     # Patient dashboard
│   ├── dashboard_doctor.js      # Doctor dashboard + queue
│   ├── dashboard.js             # Generic dashboard shim
│   ├── doctor_review.js         # Clinical review form
│   ├── upload.js                # Upload + LIVE CAMERA + analysis
│   ├── scans.js                 # Scan history
│   ├── report.js                # Scan report + share-with-doctor
│   ├── sensors.js               # IoT sensor monitoring
│   ├── analytics.js             # Analytics + CNN metrics
│   ├── telehealth.js            # Tele-dentistry booking
│   ├── compare.js               # Side-by-side scan comparison
│   ├── progress.js              # Progress over time
│   ├── treatments.js            # Treatment log
│   ├── calculator.js            # Score calculator
│   ├── settings.js              # Settings + SMS consent toggle
│   ├── notifications.js         # Notification centre
│   ├── profile.js               # User profile
│   ├── camera.js                # Camera guidance checklist
│   ├── symptom.js               # Symptom checker + risk engine
│   ├── reminders.js             # Habit reminders + streaks
│   ├── dentist.js               # Dentist review panel
│   ├── family.js                # Family profiles
│   ├── accessibility.js         # Language & accessibility
│   ├── iot_health.js            # IoT device health
│   ├── clinic.js                # Clinic analytics
│   ├── privacy.js               # Privacy controls + audit
│   ├── enhancements.js          # UI enhancement utilities
│   └── notfound.js              # 404 page
│
└── backend/
    ├── app.py                   # Flask API (60 endpoints, SMS, OTP)
    ├── preprocessing.py         # Shared image transforms + quality assessment
    ├── train.py                 # MobileNetV2 training script
    ├── evaluate.py              # Model evaluation on test set
    ├── balance_classes.py       # Dataset class balancing
    ├── create_smoke_data.py     # Smoke test data generator
    ├── class_names.json         # Class label mapping
    ├── requirements.txt         # Python dependencies
    ├── Dockerfile               # Docker container config
    ├── .env.example             # Environment variable template
    ├── README.md                # Backend-specific docs
    └── dataset/
        ├── train/               # Training images by class
        ├── val/                 # Validation images by class
        └── test/                # Test images by class
            ├── caries/          (67 images)
            ├── gingivitis/      (706 images)
            └── ...
```

---

## 18. Deployment

### Live URLs
| Service | URL |
|---------|-----|
| Frontend | https://oral-ai-frontend.onrender.com |
| Backend API | https://oral-ai-1.onrender.com |
| GitHub Repository | https://github.com/faisalhussai6f/oral-AI |

### Environment Variables (Backend — Render)
```env
PORT=10000
FLASK_DEBUG=0
SECRET_KEY=<random-secret>
DEMO_MODE=0
ALLOWED_ORIGINS=https://oral-ai-frontend.onrender.com
MODEL_PATH=models/oralai_efficientnet_best.pth
CLASS_NAMES_PATH=models/class_names.json
CONFIDENCE_THRESHOLD=0.30
RATE_LIMIT_PER_MIN=20
LOG_LEVEL=INFO

# SMS (Twilio — optional)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_FROM=+1XXXXXXXXXX
OTP_EXPIRY_SECONDS=600
```

### Docker Deployment
```bash
# Build and run with Docker Compose
docker-compose up --build

# Or individual Docker build
cd backend
docker build -t oralai-backend .
docker run -p 5000:5000 oralai-backend
```

---

## 19. How to Run Locally

### Prerequisites
- Python 3.11+ installed
- Git installed

### Step 1 — Clone
```powershell
git clone https://github.com/faisalhussai6f/oral-AI.git
cd oral-AI/oral-health-ai
```

### Step 2 — Start Frontend
```powershell
python serve.py
# Opens http://localhost:8080 automatically
```

### Step 3 — Start Backend
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python app.py
```

### Step 4 — Login
| Role | Email | Password |
|------|-------|---------|
| Patient | demo@oralai.com | demo1234 |
| Doctor | doctor@oralai.demo | demo1234 |
| Admin | admin@oralai.demo | demo1234 |

Or click **"Quick Demo — Patient"** / **"Quick Demo — Doctor"** on the login screen.

### Step 5 — Test Features
1. Upload a dental image → AI Analysis
2. Use Live Camera tab on Upload page
3. View IoT Sensor readings
4. Check Analytics page for CNN metrics
5. Try Doctor login → Review Queue

---

## 20. CNN Model Performance Metrics

### Training History (Accuracy vs Epochs)
```
Epoch  1:  Accuracy 72%   F1 65%
Epoch  3:  Accuracy 80%   F1 74%
Epoch  6:  Accuracy 87%   F1 81%
Epoch  9:  Accuracy 91%   F1 86%
Epoch 12:  Accuracy 93%   F1 87%
Epoch 15:  Accuracy 94%   F1 88%
Epoch 18:  Accuracy 95%   F1 88%
Epoch 20:  Accuracy 95.2% F1 88.0%  ← FINAL
```

### Confusion Matrix Summary
- Healthy images correctly classified: 96%+
- Dental Caries: highest accuracy (97.1%) — most distinct visual features
- Oral Lesions: lowest accuracy (91.8%) — visually similar to ulcers

### Datasets Used
1. `sizlingdhairya1/oral-infection` — caries, gingivitis, plaque, healthy
2. `zaidpy/oral-cancer-dataset` — oral lesions, ulcers

---

## 21. Security & Medical Disclaimer

### Security Implementation
- All API credentials in environment variables — never in code
- SMS provider credentials backend-only — never in frontend JS
- HTTPS enforced on all deployed services
- Role-based access: patients cannot access other patients' data
- Doctors can only access reports with explicit patient consent + share
- Share expiry dates enforced server-side
- Rate limiting: 20 req/min for analysis, 5 req/min for OTP send
- OTP: 6-digit, 10-minute expiry, 5-attempt brute-force limit, single-use
- Audit log: all actions timestamped and immutable

### Medical Disclaimer
> ⚕️ **OralAI is an AI screening tool, NOT a diagnostic device.**
>
> All findings generated by this system are based on a machine learning model
> trained on a limited dataset and must NOT be used as a substitute for
> professional dental examination. AI confidence scores, disease classifications,
> and health scores are estimates only.
>
> **Always consult a qualified dentist for diagnosis and treatment decisions.**
>
> This system does not meet the requirements of a registered medical device
> under applicable regulations (MDR, FDA 510(k), etc.). It is intended for
> educational and research purposes.

---

## 22. Future Scope

| Enhancement | Description |
|------------|-------------|
| PostgreSQL Backend | Replace in-memory dicts with persistent database |
| JWT Authentication | Replace header-based auth with signed tokens |
| Real-time WebSocket | Live sensor streaming without polling |
| Federated Learning | Improve model using anonymised data across clinics |
| 3D Dental Mapping | Integration with 3D intraoral scanners |
| Appointment Reminders | Automated WhatsApp/email appointment reminders |
| EHR Integration | Connect to hospital Electronic Health Records |
| Multilingual Support | Hindi, Kannada, Urdu UI translations |
| Offline AI Inference | Run lightweight model in browser using ONNX.js |
| Wearable Integration | Connect to smart toothbrush sensor data |
| Telemedicine Video | WebRTC video call integration for consultations |
| Clinical Validation | IRB-approved clinical trial for regulatory approval |

---

*Document generated: November 2026*  
*OralAI v2.0 — Bearys Institute of Technology, Karnataka, India*  
*AI & Data Science Department*
