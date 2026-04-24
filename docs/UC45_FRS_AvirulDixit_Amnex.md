# UC45 — Artificial Intelligence Pet Health Monitor & Vet Telemedicine Platform
## Functional Requirements & Solution Document

---

| Field | Details |
|---|---|
| **Document Reference** | UC45-FRS-v1.0 |
| **Domain** | Pet Care — Mobile + API + Admin |
| **Complexity** | Med-High |
| **Version** | 1.0 — Initial Release |
| **Prepared by** | Avirul Dixit, Senior Business Analyst |
| **Organisation** | Amnex Infotechnologies Pvt Ltd |
| **Date** | April 2026 |
| **Classification** | Confidential — Internal Use Only |

**Intended Audience:** Internal Pre-Sales Lead &nbsp;|&nbsp; Marketing Team &nbsp;|&nbsp; Customer &nbsp;|&nbsp; Development Team &nbsp;|&nbsp; QA / Testing Team

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Product Overview](#2-product-overview)
3. [Functional Requirements](#3-functional-requirements)
4. [Solution Architecture](#4-solution-architecture)
5. [Module Detail — Development Specification](#5-module-detail--development-specification)
   - 5.1 [Module 1: Mobile Application](#51-module-1-mobile-application-react-native)
   - 5.2 [Module 2: Backend API](#52-module-2-backend-api-python-fastapi)
   - 5.3 [Module 3: Admin Panel](#53-module-3-admin-panel)
6. [Acceptance Criteria](#6-acceptance-criteria)
7. [Non-Functional Requirements](#7-non-functional-requirements)
8. [Glossary](#8-glossary)
9. [Appendix](#9-appendix)

---

## 1. Executive Summary

India is home to over 30 million pets. Despite this, the vast majority of pet owners have no reliable way to evaluate whether a symptom — a limp, eye discharge, sudden lethargy, or loss of appetite — is a life-threatening emergency or a minor self-resolving condition. The gap leads to two equally damaging outcomes: panic-driven expensive emergency vet visits, or dangerous delays when genuine emergencies are dismissed.

> **The Core Problem**
>
> 30M+ Indian pets. Owners cannot distinguish emergencies from minor issues.
>
> - **Result A — Panic visit:** owner rushes to vet for a minor issue. Cost: money, time, pet stress.
> - **Result B — Dangerous delay:** owner waits on a genuine emergency. Cost: pet health, or worse.
> - **Root cause:** no intelligent first-filter exists in the Indian market today.

UC45 is Amnex Infotechnologies' answer to this problem. It is a three-tier, Artificial Intelligence (AI)-powered platform that places an intelligent triage layer between the pet owner's anxiety and the veterinarian's expertise. Using GPT-4o Vision — OpenAI's multimodal AI model — the platform analyses a photo of the pet's symptom alongside a text description, assesses urgency, cross-references breed-specific risks, and returns a confidence-scored, plain-language result in under five seconds.

When the AI is confident (score ≥ 0.6), the owner receives a clear recommendation. When confidence is low, the system escalates gracefully — either to a human veterinarian via a live WebRTC (Web Real-Time Communication) video call, or with a transparent "unable to determine" message that does not mislead. Nothing is ever returned unvetted.

| For Pre-Sales & Marketing | For the Customer | For the Development Team |
|---|---|---|
| First-mover AI pet health platform in India. Defensible IP via audit trail and confidence gating. | Know in seconds: emergency or not. Talk to a vet live if needed. All from your phone. | Clear 3-tier architecture: React Native app, FastAPI backend, Admin panel. PostgreSQL data store. Docker deployment. |

---

## 2. Product Overview

### 2.1 Vision Statement

To become India's most trusted Artificial Intelligence-first platform for pet health triage and veterinary access — giving every pet owner the confidence to make the right decision at the right time, from anywhere.

### 2.2 Platform Scope

UC45 is a three-tier system. Each tier is independently deployable and communicates with adjacent tiers over secured HTTPS (HyperText Transfer Protocol Secure) REST (Representational State Transfer) Application Programming Interfaces (APIs).

| Tier | Module | Technology | Primary Audience |
|---|---|---|---|
| 1 | Mobile Application | React Native (iOS & Android) | Pet Owner |
| 2 | Backend API + AI Modules | Python (FastAPI) + OpenAI | Dev / AI Processing |
| 3 | Admin Panel | Web (React/HTML) | Platform Administrator |

### 2.3 Key Value Propositions

#### 2.3.1 For Pre-Sales Lead

- First-mover advantage: no comparable AI triage + telemedicine product exists in the Indian pet market
- Defensible moat: versioned AI prompts, tamper-evident audit log, and confidence gating create trust and compliance credentials
- Estimated development: 7 hours hackathon scope, extendable to full commercial product
- Revenue streams: subscription (owners), per-consultation fee (vets), enterprise licensing (vet clinics, pet insurance)

#### 2.3.2 For Marketing Team

- Headline: *"Your pet's health, assessed in under 5 seconds — by AI, backed by vets"*
- Differentiator: not a chatbot — a photo + description gets a confidence-scored, breed-aware triage result
- Trust signal: every result shows exactly how it was generated — four AI modules, each with its own output
- Safety net: if AI is unsure, a real vet is one tap away via live video

#### 2.3.3 For the Customer

- Take a photo of your pet's symptom and describe what you see
- The app analyses the image and description using Artificial Intelligence
- You receive one of four results: Emergency, Urgent, Monitor at home, or Safe
- Each result comes with a plain-English explanation and a confidence level
- If the AI is not confident enough, you are connected to a qualified veterinarian for a live video call
- All your pet's health history is saved and accessible anytime

### 2.4 Users and Roles

| Actor | Role | Primary Interactions |
|---|---|---|
| Pet Owner | End user (mobile) | Register, create pet profile, submit symptoms + photo, view AI triage result, book & join vet video call, view health history |
| Veterinarian / Trainer | Service provider | Accept consultation requests, review pet records and prior triage results, conduct WebRTC video call, add post-call notes |
| Platform Administrator | Operations & compliance | Monitor real-time metrics, tune AI thresholds at runtime, export audit logs as CSV, manage users |
| System (Automated) | AI processor | Runs all four AI modules in parallel, writes every decision to audit log, enforces confidence threshold, triggers fallback |

---

## 3. Functional Requirements

### 3.1 Onboarding and Registration

| ID | Requirement | Acceptance Criterion | Priority |
|---|---|---|---|
| FR-01 | New user can register with name, email, phone number, and password | Account created; on-screen confirmation with unique reference ID displayed within 2 seconds | Must Have |
| FR-02 | User can create a pet profile: name, species, breed, age, weight, pre-existing conditions | Profile saved to database; accessible from home screen; breed stored for AI breed risk module | Must Have |
| FR-03 | Input validation: all form fields validate in real time; malformed or out-of-range entries rejected with a clear inline error message | Submitting blank or invalid data never crashes the app; error messages appear at field level | Must Have |
| FR-04 | Login via email/password; optional biometric authentication (fingerprint/Face ID) | Successful login returns a JWT (JSON Web Token); biometric toggle available in settings | Must Have |
| FR-05 | Forgot password: user receives a reset link by email within 60 seconds | Reset email arrives; link expires after 30 minutes | Should Have |

### 3.2 Core AI Processing — The Four Modules

The backend implements four distinct AI modules. Each is exposed as an independent, testable endpoint. All four run **in parallel** on every triage request — not in sequence — so the total response time equals the slowest single module, not their sum.

> **Analogy for non-technical readers (Pre-Sales, Marketing, Customer)**
>
> Think of the four AI modules as a panel of four specialist doctors reviewing your pet simultaneously:
>
> - **Doctor 1 (Symptom Classification)** reads your written description and says: *"This sounds like X."*
> - **Doctor 2 (Image Condition Detection)** examines the photo and says: *"I can see Y on the skin/eye/limb."*
> - **Doctor 3 (Breed Risk)** checks the breed records and says: *"Labradors are prone to Z — worth noting."*
> - **Doctor 4 (Urgency Prediction)** listens to all three and gives a single verdict: *"This is Urgent. Confidence: 82%."*
>
> All four opinions are delivered in under 5 seconds — not a 3-week referral queue.

| Module | Function | Input | Output |
|---|---|---|---|
| Symptom Classification | Classifies text description into known condition categories using GPT-4o Vision | Owner's text description (20–500 chars) | `condition_category` + `confidence_score` |
| Image Condition Detection | Identifies visible conditions in the uploaded photo (skin lesions, eye discharge, swelling, wounds) | Base64-encoded JPEG/PNG image + text | `condition_label` + `confidence_score` + `area_description` |
| Breed Risk Model | Looks up pet breed in the health risk database; flags known hereditary or breed-specific conditions | Breed from pet profile (PostgreSQL lookup) | `risk_flags[]` + `breed_note` (plain language) |
| Urgency Prediction | Aggregates the three module outputs using weighted scoring; assigns a final urgency tier | Outputs of the above three modules | `urgency_tier` + `combined_confidence_score` |

> **Confidence Score Rule — Critical Business Logic**
>
> - Every AI-generated decision must include a confidence score from `0.0` (no confidence) to `1.0` (full confidence).
> - **Default threshold: `0.6`.** Configurable at runtime via the Admin Panel without redeployment.
> - If `combined_confidence_score >= 0.6` → return the triage result to the user normally.
> - If `combined_confidence_score < 0.6` → trigger fallback: escalate to vet review OR display a graceful "unable to determine" screen. **Never return an unvetted low-confidence answer.**
> - If any individual module timed out or errored → final confidence is **auto-capped at 0.7** to prevent false confidence on incomplete data.

### 3.3 External Integrations

| Integration | Purpose | Reliability Requirement |
|---|---|---|
| OpenAI GPT-4o Vision API | Powers all four AI modules; analyses text + photos | Retry with exponential backoff (1s, 2s, 4s); circuit-breaker pattern on 3 consecutive failures within 60 seconds |
| WebRTC via PeerJS (free) | Enables live peer-to-peer video call between pet owner and vet — no media server cost | Graceful degradation: if WebRTC peer connection fails, display clear error and offer asynchronous text consultation |
| Breed Health Database (free online) | Provides breed-specific health risk data for the Breed Risk module | Cache refreshed every 24 hours; fallback to last-known cached data if external source is unavailable |

### 3.4 Output and User Experience Requirements

- Every AI result screen must be clearly labelled with the urgency tier, a confidence score visual (progress bar or badge), and a plain-language explanation of how the result was derived
- Every screen must expand abbreviations on first use: Artificial Intelligence (AI), Machine Learning (ML), Application Programming Interface (API), Web Real-Time Communication (WebRTC)
- Results below the confidence threshold must **never** be presented as valid triage outcomes — the fallback path must be clearly and consistently triggered
- All call-to-action (CTA) buttons must use positive, action-oriented language ("Book a vet now", "Monitor at home") — never vague labels ("OK", "Continue")

### 3.5 Administrator Requirements

- Real-time dashboard: total requests, average confidence score, fallback rate %, active vet sessions
- Threshold tuning: modify confidence threshold, rate limits, and timeouts at runtime via a web form — values stored in database `config` table, read on each API request
- Audit log viewer: date-range filter, urgency/fallback filters, paginated results preview, CSV export
- All admin actions logged with admin username, timestamp, and before/after values for config changes

### 3.6 Audit, Logging, and Compliance

- Every AI-generated decision logged to `audit_log` table: `timestamp`, `input_hash` (SHA-256), `output_hash`, `model_version`, `prompt_version_id`, `confidence_score`, `urgency_tier`, `fallback_triggered`
- Personally Identifiable Information (PII) — name, email, phone — is **never** written to the audit log; only hashed identifiers
- Audit log is **append-only**: no UPDATE or DELETE permitted on `audit_log` table; row-level checksum column for tamper detection
- Logs retained for minimum 90 days; exportable as CSV for compliance review

### 3.7 Performance and Deployment

- End-to-end triage flow (user submits → AI result displayed) must complete in **< 5 seconds** for typical inputs, excluding external API latency
- Backend deployable using `docker-compose.prod.yml` — the shared hackathon portal standard entrypoint
- System must remain stable under representative load during a 15-minute demonstration run: no crashes, no memory leaks, no hardware budget overrun
- Hardware requirement: standard laptop; no Graphics Processing Unit (GPU) required

---

## 4. Solution Architecture

### 4.1 Technology Stack

| Layer | Technology | Developer Notes |
|---|---|---|
| Mobile App | React Native | Single codebase for iOS and Android. Expo or bare workflow. State management via Redux or Zustand. |
| Backend API | Python 3.11 + FastAPI | Async by default. Auto-generates OpenAPI documentation at `/docs`. Pydantic models for request/response validation. |
| Database | PostgreSQL 15 | Primary data store. `audit_log` table is append-only (enforced by trigger). `config` table read on every request (no restart needed). |
| AI / Vision | OpenAI GPT-4o Vision API | All four modules call the same endpoint with different versioned system prompts. `PROMPT_VERSION_ID` in each request enables reproducible, auditable outputs. |
| Video Calls | WebRTC via PeerJS (free) | Peer-to-peer. No media server. PeerJS handles signalling. Mobile app uses `react-native-webrtc`. |
| Deployment | Docker Compose | `docker-compose.prod.yml` defines services: `api`, `db`, `admin`. Single command startup: `docker-compose -f docker-compose.prod.yml up`. |
| Auth | JWT (JSON Web Tokens) | Access token: 1-hour expiry. Refresh token: 7-day expiry. Stored in device secure keychain (not AsyncStorage). |

### 4.2 Three-Tier Architecture

The three tiers are independent services that communicate only via defined API contracts. Any tier can be updated, tested, or redeployed without breaking the others — as long as the API contract is preserved.

> **Architecture analogy for non-technical stakeholders**
>
> Think of the platform as a hospital system with three departments:
>
> - **Mobile App = Reception:** the patient (pet owner) walks in, fills a form, and gets a result ticket.
> - **FastAPI Backend = Diagnostics Lab:** the form is processed by four specialist lab machines simultaneously. The combined result is stamped with a confidence level.
> - **Admin Panel = Hospital Management:** the administration team monitors throughput, adjusts sensitivity settings, and pulls audit reports — without ever entering the lab.
>
> Each department works independently. Reception does not need to know how the lab runs its tests.

### 4.3 Primary Triage Data Flow — Step by Step

> This is the most important flow in the system. Developers must implement and test this end-to-end before building anything else.

1. Pet owner opens the app, selects the active pet, taps **"Check symptoms"**.
2. User types a description (min 20, max 500 characters) and optionally captures or uploads a photo. App validates locally before enabling the "Analyse symptoms" button.
3. On submit, the mobile app compresses the image (max 1024×1024 px, JPEG < 500 KB) and sends a `multipart/form-data` `POST` request to `/api/v1/triage` with: `pet_id`, `description`, `image` (optional).
4. The FastAPI gateway receives the request, validates the JWT, checks the per-user rate limit from the `config` table, and — if all checks pass — dispatches all four AI module coroutines simultaneously using `asyncio.gather()`.
5. **Module 1 (Symptom Classification)** sends the description text to GPT-4o Vision with `PROMPT_V1_SYMPTOM` system prompt. Parses JSON response for `condition_category` and `confidence`.
6. **Module 2 (Image Condition Detection)** sends the image (base64) + description to GPT-4o Vision with `PROMPT_V1_IMAGE` system prompt. If no image provided, returns `condition='not_assessed'`, `confidence=null`.
7. **Module 3 (Breed Risk)** queries the local breed health database cache using the pet's breed from PostgreSQL. Returns `risk_flags` array and plain-language `breed_note`. Cache miss falls back to last-known data.
8. **Module 4 (Urgency Prediction)** receives the three module outputs. Applies weighted scoring: Image=0.4, Symptom=0.4, Breed=0.2. Calculates `combined_confidence` as weighted average of non-null confidence values. If any module returned `confidence=0.0` due to error/timeout, caps final confidence at **0.7**.
9. Before returning any response, the backend writes a complete `audit_log` row: `triage_id`, `input_hash`, `output_hash`, `model_version`, `prompt_version_id`, `confidence_score`, `urgency_tier`, `fallback_triggered`, `timestamp`.
10. **Confidence gate:** if `combined_confidence >= threshold` (default `0.6`): return triage result JSON. If `combined_confidence < threshold`: set `fallback_triggered=true`, return fallback response. Mobile app routes to MOB-09 fallback screen.
11. Mobile app receives response (< 5 seconds). Routes to **MOB-08** (Triage Result) or **MOB-09** (Fallback). Displays urgency banner, confidence bar, explanation, and appropriate CTA buttons.

> ✅ **Testing checkpoint — Primary Triage Flow**
>
> - **TC-TRIAGE-01 (Happy path):** Submit clear photo of swollen paw + description. Expect: `urgency_tier` = URGENT or EMERGENCY, `confidence >= 0.6`, MOB-08 shown.
> - **TC-TRIAGE-02 (Low confidence / no image):** Submit text only, vague description. Expect: `fallback_triggered = true`, MOB-09 shown. Audit log row written.
> - **TC-TRIAGE-03 (API timeout):** Mock OpenAI to take > 4 seconds. Expect: module returns `confidence = 0.0`, final confidence capped at `0.7`, result returned without crash.
> - **TC-TRIAGE-04 (Rate limit):** Submit 11 triage requests within 1 hour from same user. Expect: 11th request returns HTTP 429 with user-readable error message.
> - **TC-TRIAGE-05 (No network):** Turn off network before submit. Expect: inline "No internet connection" banner; Analyse button disabled.

---

## 5. Module Detail — Development Specification

This section is the primary reference for the development team and QA engineers. Each sub-section covers: what the module does, internal logic and decision rules, wireframe layout descriptions, and specific test cases with expected outcomes.

---

### 5.1 Module 1: Mobile Application (React Native)

#### 5.1.1 Screen Inventory

| Screen ID | Screen Name | Description & Key Logic |
|---|---|---|
| MOB-01 | Splash / Onboarding | 3-step carousel (What is AI triage? / How it works / Privacy). "Get started" CTA. Skip available from step 2. |
| MOB-02 | Registration | Fields: Full name, Email, Phone (with country code picker), Password (min 8 chars, 1 uppercase, 1 number), Confirm password. Real-time validation. On success → MOB-05. |
| MOB-03 | Login | Email + password. Biometric toggle. Forgot password link. On success: JWT stored in secure keychain → MOB-04. |
| MOB-04 | Home Dashboard | Top bar: greeting + notification bell. Active pet card (photo, name, breed, age). Quick-action buttons: Check Symptoms, Book Vet, Health History. Recent activity feed. |
| MOB-05 | Pet Profile Setup | Name, Species (dog/cat/bird/other — picker), Breed (searchable picker, filtered by species), Age (months/years toggle), Weight (kg), Pre-existing conditions (multi-select). Save stores to `/pets` API. |
| MOB-06 | Symptom Checker — Input | Description textarea (20–500 chars with live counter), 3-slot photo picker, Analyse button (disabled until description ≥ 20 chars). Footer disclaimer expands AI abbreviation. |
| MOB-07 | Symptom Checker — Processing | Animated progress screen showing: "Analysing your description...", "Examining the photo...", "Checking breed risk profile...", "Calculating urgency...". Estimated wait shown. |
| MOB-08 | Triage Result | Full-width urgency banner (colour + icon + text). Confidence progress bar with % label. Explanation card. Optional breed note card. Book Vet / Monitor at Home CTAs. Expandable "How was this generated?" section. |
| MOB-09 | Fallback Screen | Shown when `fallback_triggered = true`. Message: "Our Artificial Intelligence could not assess this with confidence. Please provide a clearer photo or connect with a vet." Buttons: Retry, Talk to a Vet. |
| MOB-10 | Vet Call — Booking | List of available vets with rating, specialty, next available slot. Filter by species specialty. Time slot picker. Confirm booking → `POST /calls/initiate`. |
| MOB-11 | Vet Call — Session | Full-screen WebRTC video. Controls: mute, camera flip, end call, text chat overlay. Call duration timer. On end: rate vet (1–5 stars) + optional note. |
| MOB-12 | Health History | Chronological timeline of triage events and vet calls. Each entry: date, pet, urgency tier (colour badge), confidence score, "View details" link. |

#### 5.1.2 Wireframe Specification — MOB-06: Symptom Checker Input

This is the highest-traffic screen. Every design decision here directly affects AI accuracy.

- **Header bar:** back arrow (left), title "Symptom checker" (centre), active pet chip showing pet name (right)
- **Instruction label:** "Describe what you have noticed. The more detail you provide, the more accurate the result."
- **Text area:** multi-line, 5 visible rows, auto-expands. Placeholder: *"e.g. limping on left front leg since this morning, not bearing weight"*. Live character counter: `0 / 500`. If > 500: counter turns red, submit disabled.
- **Photo section header:** "Add a photo for best results (optional)"
- **Photo strip:** 3 equal slots in a row. Empty slot 1 = camera icon (opens native camera). Slots 2–3 = gallery icon (opens gallery picker). Filled slot shows thumbnail + red ✕ delete icon.
- **Photo quality hint:** appears after any photo is added — *"Tip: ensure the area is well-lit and in focus for accurate analysis."*
- **Analyse button:** full-width, primary brand colour. **Disabled** (greyed) with label "Analyse symptoms" until `description.length >= 20`. Enabled state is active blue.
- **Secondary link:** "Analyse without photo" — triggers confirmation dialog: *"Adding a photo significantly improves accuracy. Continue without photo?"*
- **Footer** (12pt, muted, centred): *"Artificial Intelligence (AI)-generated results are not a substitute for professional veterinary diagnosis."*

> ✅ **Testing — MOB-06**
>
> | Test Case | Input | Expected Result |
> |---|---|---|
> | TC-MOB-06-01 | Submit with 0 characters | Analyse button disabled |
> | TC-MOB-06-02 | Submit with 19 characters | Analyse button disabled |
> | TC-MOB-06-03 | Submit with 20 characters, no photo | Analyse button enabled; submits; navigates to MOB-07 |
> | TC-MOB-06-04 | Submit with 501 characters | Character counter turns red; Analyse button disabled |
> | TC-MOB-06-05 | Upload a 6 MB image | Error: "Image too large. Please use a photo under 5 MB." App does not crash. |
> | TC-MOB-06-06 | Take photo via camera | Thumbnail appears in slot 1; ✕ delete icon visible; tapping ✕ removes thumbnail |
> | TC-MOB-06-07 | No network before tapping Analyse | Inline "No internet connection" banner; Analyse button disabled |

#### 5.1.3 Wireframe Specification — MOB-08: Triage Result

This screen must communicate urgency clearly to an anxious pet owner. Colour, icon, and text must all convey the same message — **never rely on colour alone**.

| Urgency Tier | Banner Colour | Icon | Message Shown to User |
|---|---|---|---|
| EMERGENCY | Red `#DC2626` | ⚠ Alert triangle | "Seek emergency veterinary care immediately" |
| URGENT | Amber `#D97706` | 🕐 Clock | "See a vet within 24 hours" |
| MONITOR | Blue `#2563EB` | 👁 Eye | "Watch closely — see a vet if symptoms worsen" |
| SAFE | Green `#16A34A` | ✓ Checkmark | "Likely minor — home care advice provided" |

- **Confidence section:** label "Artificial Intelligence (AI) confidence", horizontal progress bar (0–100%), percentage at right end.
- **Card 1 — "What our AI found":** 2–4 sentences. Plain English. No medical jargon. Derived from `explanation` field in API response.
- **Card 2 — "Breed note"** *(conditional):* shown only if `breed_risk_note` is non-null. Explains breed-specific risk in plain language.
- **CTA buttons:** Primary = "Book a vet now" (always visible, full-width). Secondary = "Monitor at home with guidance" (visible only if `urgency_tier = MONITOR or SAFE`).
- **Collapsible section "How was this result generated?":** when expanded, shows four rows — Symptom analysis, Image analysis, Breed risk check, Urgency assessment — each with individual module output and confidence score.
- **Footer disclaimer** (11pt, muted, italic): *"This result is generated by an Artificial Intelligence model and does not constitute a medical diagnosis. Always consult a qualified veterinarian for treatment decisions."*

> ✅ **Testing — MOB-08**
>
> | Test Case | Scenario | Expected Result |
> |---|---|---|
> | TC-MOB-08-01 | EMERGENCY result | Red banner; only "Book a vet now" CTA visible; no "Monitor at home" button |
> | TC-MOB-08-02 | SAFE result | Green banner; both CTA buttons visible |
> | TC-MOB-08-03 | `breed_risk_note` is null | Breed note card does not render |
> | TC-MOB-08-04 | `breed_risk_note` is non-null | Breed note card renders with correct text |
> | TC-MOB-08-05 | Expand "How was this generated?" | All four module rows visible with individual outputs |
> | TC-MOB-08-06 | Tap "Book a vet now" | Navigates to MOB-10 |
> | TC-MOB-08-07 | Screen reader (VoiceOver/TalkBack) | Urgency tier and explanation announced correctly |

#### 5.1.4 Mobile Application Logic Rules

- **Image compression:** before upload, resize all images to max 1024×1024 pixels; compress to JPEG format with quality 80% and max 500 KB. Use `react-native-image-resizer` or equivalent.
- **Token refresh:** JWT access token has a 1-hour expiry. App must silently refresh using the refresh token at 45 minutes (15 minutes before expiry). If refresh fails → navigate to login screen: *"Your session has expired. Please log in again."*
- **Offline state:** detect network loss using `NetInfo` library. Show persistent orange banner "No internet connection" across all screens. Disable all API-dependent buttons. Resume automatically when network is restored.
- **Error mapping:** all HTTP errors must map to user-readable messages:
  - HTTP 401 → *"Session expired. Please log in again."*
  - HTTP 429 → *"Too many requests. Please wait a moment and try again."*
  - HTTP 500 → *"Something went wrong on our end. Please try again in a moment."*
  - Timeout → *"This is taking longer than expected. Please check your connection."*
- **Accessibility:** all interactive elements must meet 44×44 pt minimum touch target. Urgency tiers communicated via colour AND icon shape AND text. Dynamic text sizing must not break layout up to 200% of default.
- **Analytics:** log `screen_view`, `triage_submitted`, `triage_result_viewed`, `vet_call_initiated` events. **No PII in any analytics event payload.**

#### 5.1.5 Navigation Flow

```
MOB-01 (Splash)
  ├── MOB-02 (Register)  ──────────────────────────► MOB-05 (Pet Profile Setup)
  └── MOB-03 (Login)                                           │
                                                               ▼
                                                        MOB-04 (Home Dashboard)
                                                        ├── MOB-06 (Symptom Input)
                                                        │     └── MOB-07 (Processing)
                                                        │           ├── MOB-08 (Result) ──► MOB-10
                                                        │           └── MOB-09 (Fallback)
                                                        │                 ├── Retry ──► MOB-06
                                                        │                 └── Talk to Vet ──► MOB-10
                                                        ├── MOB-10 (Vet Booking) ──► MOB-11 (Vet Call)
                                                        └── MOB-12 (Health History)
```

---

### 5.2 Module 2: Backend API (Python FastAPI)

#### 5.2.1 Full Endpoint Reference

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/auth/register` | None | Create new user. Returns `user_id` and confirmation message. |
| POST | `/api/v1/auth/login` | None | Authenticate user. Returns `access_token` (1hr) and `refresh_token` (7 days). |
| POST | `/api/v1/auth/refresh` | Refresh JWT | Exchange refresh token for new access token. |
| POST | `/api/v1/auth/forgot-password` | None | Send password reset email. Always returns 200 (prevents email enumeration). |
| GET | `/api/v1/pets` | JWT | List all pet profiles for the authenticated user. |
| POST | `/api/v1/pets` | JWT | Create a new pet profile. Returns `pet_id`. |
| PUT | `/api/v1/pets/{pet_id}` | JWT | Update a pet profile. Owner only. |
| POST | `/api/v1/triage` | JWT | Submit symptoms + optional image. Runs all four AI modules in parallel. Returns triage result. |
| GET | `/api/v1/triage/{triage_id}` | JWT | Retrieve a specific past triage result by ID. |
| GET | `/api/v1/triage/history` | JWT | List all triage events for authenticated user's pets. Supports pagination. |
| POST | `/api/v1/calls/initiate` | JWT | Create a WebRTC session. Returns `peer_id` and `signalling_token`. |
| PUT | `/api/v1/calls/{call_id}/end` | JWT | Mark a vet session as ended. Records end timestamp. |
| GET | `/api/v1/admin/metrics` | Admin JWT | Real-time dashboard data: volumes, confidence distribution, error rates, active sessions. |
| PUT | `/api/v1/admin/config` | Admin JWT | Update runtime config values. Writes to `config` table. No restart needed. |
| GET | `/api/v1/admin/audit-log` | Admin JWT | Query audit log with date range, urgency tier, and fallback filters. Paginated. |
| GET | `/api/v1/admin/audit-log/export` | Admin JWT | Export filtered audit log as CSV. Streams response. |

#### 5.2.2 POST /api/v1/triage — Full Contract

**Request (`multipart/form-data`)**

| Field | Type | Required | Validation Rules |
|---|---|---|---|
| `pet_id` | UUID string | Yes | Must exist in `pets` table and belong to authenticated user |
| `description` | string | Yes | Min 20 chars, max 500 chars. Sanitised for prompt injection before passing to GPT-4o. |
| `image` | file (JPEG or PNG) | No | Max 5 MB. Server validates MIME type; converts to base64 for GPT-4o Vision API call. |

**Response (`application/json`) — Success**

| Field | Type | Description |
|---|---|---|
| `triage_id` | UUID | Unique ID for this triage event. Also the audit log row ID. |
| `urgency_tier` | string | One of: `EMERGENCY`, `URGENT`, `MONITOR`, `SAFE` |
| `confidence_score` | float 0.0–1.0 | Combined weighted confidence from all four modules |
| `explanation` | string | Plain-language explanation generated by GPT-4o. Max 400 chars. |
| `breed_risk_note` | string \| null | Breed-specific note if risk flag raised. Null if no risk or breed not found. |
| `fallback_triggered` | boolean | `true` if confidence < threshold. When `true`, `urgency_tier = UNDETERMINED`. |
| `module_outputs` | object | Individual outputs of all four AI modules (for the expandable UI section). |
| `timestamp` | ISO 8601 datetime | Server-side timestamp. Same as audit log row. |

**Response — Error Cases**

| HTTP Status | Meaning and Required Action |
|---|---|
| `400` | Bad request: validation failed (description too short, invalid `pet_id`, unsupported image MIME type). Response body includes field-level error details. |
| `401` | Unauthorized: JWT missing, expired, or invalid. Mobile app must redirect to login. |
| `403` | Forbidden: authenticated user does not own the specified `pet_id`. |
| `429` | Too Many Requests: per-user rate limit exceeded. Response includes `Retry-After` header (seconds until reset). |
| `500` | Internal Server Error: unhandled exception. Audit log row still attempted. Response: `{ "error": "Internal error. Please try again." }` |
| `503` | Service Unavailable: circuit breaker is open (OpenAI API is failing). Response includes `fallback_triggered: true`. |

#### 5.2.3 AI Module Internal Logic — Detailed

> **Developer mental model — How the four modules work together**
>
> Think of it as a **parallel sprint, not a relay race:**
>
> - `asyncio.gather()` is the starting gun — all four runners leave the blocks simultaneously.
> - Modules 1, 2, and 3 each run **independently**. They do **NOT** wait for each other.
> - Module 4 (Urgency Prediction) is the **only** module that depends on the others.
> - Module 4 starts only **after** `asyncio.gather()` resolves — i.e., after the slowest of modules 1/2/3 completes.
> - **Total wall time = max(module_1_time, module_2_time, module_3_time) + module_4_time.**
> - This is why a 5-second SLA is achievable despite four separate GPT-4o calls.

---

**Module 1 — Symptom Classification: Internal Logic**

1. Construct the GPT-4o Vision prompt: system prompt = `PROMPT_V1_SYMPTOM` (versioned string loaded from `config` table); user message = sanitised description text.
2. **Sanitisation steps:** strip HTML tags → remove prompt injection patterns (e.g. *"Ignore all previous instructions"*) → truncate to 500 chars.
3. Call OpenAI `/v1/chat/completions` with `model=gpt-4o`, `response_format=json_object`.
4. Parse response JSON for fields: `condition_category` (string), `confidence` (float 0.0–1.0), `reasoning` (string, used in explanation).
5. On JSON parse failure: log raw response, set `confidence=0.0`, `condition_category='parse_error'`.
6. On API timeout (> 4 seconds): set `confidence=0.0`, `condition_category='timeout'`. Do **NOT** retry here — retry is handled by the outer reliability wrapper.

---

**Module 2 — Image Condition Detection: Internal Logic**

1. If **no image provided:** immediately return `{ condition: 'not_assessed', confidence: null, area_description: null }`. Log that image was not submitted.
2. If **image provided:** validate MIME type server-side (accept `image/jpeg` and `image/png` only). Convert to base64 string.
3. Construct GPT-4o Vision prompt: system prompt = `PROMPT_V1_IMAGE`; user message includes both the text description **AND** the base64 image as a vision message.
4. Parse response JSON for: `condition_label`, `confidence`, `area_description` (plain language description of where and what was observed).
5. On timeout or parse failure: set `confidence=0.0`, `condition_label='error'`.

---

**Module 3 — Breed Risk Model: Internal Logic**

1. Look up pet breed from the `pets` table (already retrieved when validating `pet_id` — do **NOT** make a second DB query).
2. Query the in-memory breed health database cache: `breed_cache[breed_name]`. Cache is a Python dictionary loaded from the breed health database JSON file at server startup and refreshed every 24 hours via a background `async` task.
3. If breed found: return `{ risk_flags: ['hip_dysplasia', 'obesity'], breed_note: 'Labrador Retrievers are prone to...' }`.
4. If breed not found (e.g. "Mixed breed", "Unknown"): return `{ risk_flags: [], breed_note: null }`. This is **not** an error — it means the breed risk factor is not applied.
5. This module **never calls an external API.** It reads from a local cache. Confidence is always `1.0` if a breed is found, or `null` if not found.

---

**Module 4 — Urgency Prediction: Internal Logic**

1. Receive outputs: `m1` (symptom), `m2` (image), `m3` (breed risk).
2. **Compute weighted confidence:**
   - If `m2.confidence` is not null (image was submitted): use weights — Image `0.4`, Symptom `0.4`, Breed `0.2` (treating breed confidence as `1.0` if `risk_flags` non-empty, else `null`).
   - If `m2.confidence` is null (no image submitted): redistribute weights — Symptom `0.7`, Breed `0.3`.
   - Exclude any module with `confidence=0.0` (errored/timed out) from weight calculation. Redistribute their weight proportionally to remaining modules.
   - **Cap rule:** if any module had `confidence=0.0` due to error/timeout, final `combined_confidence` cannot exceed `0.7`.
3. Map weighted score to urgency tier: compute composite severity score from `m1.condition_category`, `m2.condition_label`, and `m3.risk_flags`. Map score ranges to tiers (exact thresholds defined in `PROMPT_V1_URGENCY`, versioned in `config` table).
4. Return: `{ urgency_tier, combined_confidence, explanation (from GPT-4o), breed_risk_note (from m3.breed_note) }`.

> ✅ **Testing — AI Module Logic**
>
> | Test Case | Scenario | Expected Result |
> |---|---|---|
> | TC-API-01 | Submit with image and text. All four modules return valid outputs. | `urgency_tier` set, `confidence >= 0.0`, `audit_log` row written, `fallback_triggered = false` (if `confidence >= 0.6`) |
> | TC-API-02 | Submit text only (no image) | Module 2 returns `not_assessed`, confidence `null`. Module 4 redistributes weights (Symptom=0.7, Breed=0.3). Valid triage result returned. |
> | TC-API-03 | Mock Module 1 to timeout | Module 1 `confidence = 0.0`. Final confidence capped at `0.7`. Result returned without crash. Audit log records capped confidence. |
> | TC-API-04 | Mock all three parallel modules to timeout | `fallback_triggered = true`. No urgency tier returned. Graceful 503 response. |
> | TC-API-05 | Submit breed "Labrador Retriever" | `breed_note` non-null, `risk_flags` non-empty in `module_outputs` |
> | TC-API-06 | Submit breed "Mixed breed" | `breed_note = null`, `risk_flags = []`. Urgency Prediction uses null for breed confidence. |
> | TC-API-07 | Mock OpenAI to return malformed JSON | `confidence = 0.0` for that module; raw response logged; system does not crash. |

#### 5.2.4 Reliability Patterns — Implementation Detail

| Pattern | How It Works | Developer Implementation Note |
|---|---|---|
| **Exponential Backoff** | First failure: wait 1s. Second: wait 2s. Third: wait 4s. After 3 failures: return `confidence=0.0`. | Use `tenacity` library: `@retry(wait=wait_exponential(min=1, max=4), stop=stop_after_attempt(3))`. Apply to the OpenAI API call only — not to the whole module function. |
| **Circuit Breaker** | If OpenAI returns errors 3 times in a 60-second window, circuit **OPENS**. For 30 seconds, all requests skip GPT-4o and return `fallback_triggered=true`. After 30 seconds: circuit goes **HALF-OPEN**. One test request is allowed. If it succeeds → circuit **CLOSES**. | Use `pybreaker` library. One circuit breaker instance per module (4 total) to allow partial degradation. Log all state changes (OPEN / HALF-OPEN / CLOSED). |
| **Request Timeout** | Each GPT-4o call must time out after 4 seconds (configurable via `config` table). A slow OpenAI response must never hold up the entire triage request beyond the 5-second SLA. | Pass `timeout=4.0` to the `httpx.AsyncClient` call. Catch `asyncio.TimeoutError` and return `confidence=0.0`. |
| **Rate Limiting** | Per-user limit: 10 triage requests per hour (configurable). Enforced at the API gateway level **before** AI modules are invoked. | Use `slowapi` library with a Redis-backed counter keyed by `user_id`. Read limit from `config` table on each check. Return HTTP 429 with `Retry-After` header. |

> ⚠️ **Critical developer note — Reliability**
>
> The 5-second SLA and the circuit breaker are not optional quality features. They are acceptance criteria (AC-06) and are explicitly tested.
>
> - Do **NOT** allow a slow or failed OpenAI call to propagate as an unhandled exception. Every GPT-4o call must be wrapped in a `try/except` that returns a structured error result — never raises to the caller.
> - The circuit breaker must be tested explicitly: mock OpenAI to fail 3 times, assert circuit opens, assert subsequent requests return fallback without calling OpenAI.

#### 5.2.5 Database Schema — Full Reference

| Table | Key Columns | Notes |
|---|---|---|
| `users` | `id` (UUID PK), `email` (unique), `phone`, `password_hash` (bcrypt), `created_at`, `is_active` | PII table. Never referenced in `audit_log`. Soft-delete via `is_active` flag. |
| `pets` | `id` (UUID PK), `user_id` (FK → users), `name`, `species`, `breed`, `age_months`, `weight_kg`, `conditions` (text[]), `created_at` | `breed` column is the key input to the Breed Risk module. Indexed on `user_id`. |
| `triage_events` | `id` (UUID PK), `pet_id` (FK → pets), `urgency_tier` (enum), `confidence_score` (numeric 3,2), `fallback_triggered` (bool), `module_outputs` (JSONB), `created_at` | Core result store. `module_outputs` JSONB holds all four module outputs for the expandable UI section. |
| `audit_log` | `id` (UUID PK), `triage_id` (FK), `event_type`, `input_hash` (char 64), `output_hash` (char 64), `model_version`, `prompt_version_id`, `confidence_score`, `urgency_tier`, `fallback_triggered`, `timestamp`, `row_checksum` (char 64) | **APPEND-ONLY.** Enforced via PostgreSQL trigger: `BEFORE UPDATE OR DELETE ON audit_log → RAISE EXCEPTION`. `row_checksum = SHA-256(all column values concatenated)`. No PII ever written here. |
| `config` | `key` (varchar PK), `value` (text), `updated_at`, `updated_by` (FK → users) | Runtime config. Read on every triage request. Keys: `confidence_threshold`, `rate_limit_per_hour`, `gpt4o_timeout_seconds`, `circuit_breaker_reset_seconds`, `prompt_version_id`. |
| `vet_sessions` | `id` (UUID PK), `pet_owner_id` (FK), `vet_id` (FK), `triage_id` (FK, nullable), `peer_id`, `signalling_token`, `started_at`, `ended_at`, `status` (enum), `rating` (1–5, nullable), `call_note` (text, nullable) | WebRTC session tracking. `triage_id` links the call to the triage that triggered it (nullable for direct bookings). |

> ✅ **Testing — Database**
>
> | Test Case | Action | Expected Result |
> |---|---|---|
> | TC-DB-01 | Attempt to DELETE a row from `audit_log` | Exception: *"Audit log is append-only. Deletions are not permitted."* |
> | TC-DB-02 | Attempt to UPDATE `confidence_score` on an `audit_log` row | Same exception as above |
> | TC-DB-03 | After a triage request, verify `row_checksum` | Must equal SHA-256 of the row's column values |
> | TC-DB-04 | Inspect all columns in `audit_log` | No raw email address, phone number, or pet owner name present in any cell |

---

### 5.3 Module 3: Admin Panel

The Admin Panel is a web-based dashboard for internal platform administrators. It reads from PostgreSQL directly (not via the triage API) and provides three core capabilities: monitoring, threshold tuning, and audit log export.

#### 5.3.1 Dashboard Screen — Wireframe Specification

- **Top navigation bar:** Amnex Infotechnologies logo (left), section tabs: Dashboard | Thresholds | Audit Log | Users | Logs (centre), admin username + avatar + logout (right)
- **Page title row:** "Platform Dashboard" (H1), date/time last refreshed (auto-refreshes every 30 seconds), manual Refresh button
- **Metric cards row — 4 equal columns:**
  - Card 1: "Triage requests today" — large number, delta vs yesterday (+12% green / −5% red)
  - Card 2: "Average AI confidence" — percentage with visual gauge (arc/dial)
  - Card 3: "Fallback rate" — percentage of requests where `fallback_triggered = true`. If > 20%: card border turns amber as a warning.
  - Card 4: "Active vet sessions" — live count; green pulse indicator if > 0
- **Confidence distribution chart:** horizontal bar chart. X-axis = volume. Y-axis = confidence bands: 0.0–0.2, 0.2–0.4, 0.4–0.6 *(below threshold, amber fill)*, 0.6–0.8, 0.8–1.0. Threshold drawn as a vertical dashed line.
- **AI error rate trend:** line chart. X-axis = last 24 hours in 1-hour buckets. Y-axis = error count. Series: OpenAI timeouts (amber), circuit breaker trips (red), parse failures (blue).
- **Urgency distribution:** donut chart showing proportion of EMERGENCY / URGENT / MONITOR / SAFE results today.
- **Recent triage table:** Triage ID (truncated), Species (icon), Urgency tier (badge), Confidence (%), Fallback (yes/no), Timestamp. Clickable rows open a read-only detail drawer.

#### 5.3.2 Threshold Tuning Screen — Wireframe Specification

> Changes here affect the **live system immediately** — no redeployment, no downtime.

| Parameter | Default | Allowed Range | Effect of Changing |
|---|---|---|---|
| Confidence threshold | `0.60` | `0.30` – `0.90`, step `0.05` | Raising means more results trigger fallback (safer but more escalations). Lowering means fewer fallbacks (more results shown, higher risk of inaccurate results being displayed). |
| Rate limit (requests/user/hour) | `10` | `1` – `100` | Prevents abuse. Lowering reduces API costs but may frustrate legitimate users. |
| GPT-4o timeout (seconds) | `4` | `2` – `10` | Lowering improves SLA performance but increases module timeouts. Raising improves accuracy for slow API responses but risks breaching the 5-second SLA. |
| Circuit breaker reset (seconds) | `30` | `10` – `120` | Lower = faster recovery. Higher = more protection during API instability. |
| Active prompt version ID | `PROMPT_V1` | String | Switches which versioned GPT-4o system prompt is used for all four modules. Enables prompt A/B testing without code deployment. |

- Each parameter is displayed as a labelled input field with its current live value, allowed range as hint text, and a brief description of its effect.
- **"Save changes" button:** on click, shows a confirmation dialog: *"You are about to change [parameter] from [old value] to [new value]. This will take effect immediately on all live requests. Confirm?"*
- On confirmation: `PUT /api/v1/admin/config`. Success toast: *"Configuration updated. New value is live."* Failure toast: *"Failed to save. Please try again."*
- **Change history table** below the form: last 10 config changes. Columns: Parameter, Old value, New value, Changed by, Timestamp.

> ✅ **Testing — Threshold Tuning**
>
> | Test Case | Action | Expected Result |
> |---|---|---|
> | TC-ADMIN-01 | Set `confidence_threshold` to `0.95`. Submit a triage that previously returned a non-fallback result. | `fallback_triggered = true` on the new request |
> | TC-ADMIN-02 | Set `confidence_threshold` back to `0.60`. Repeat the same triage. | `fallback_triggered = false`, normal result returned |
> | TC-ADMIN-03 | Change any config value | Change history table has correct row: old value, new value, admin username, timestamp |
> | TC-ADMIN-04 | Set `gpt4o_timeout_seconds` to `2`. Mock OpenAI to respond in 3 seconds. | Module returns `confidence = 0.0` within 2 seconds |
> | TC-ADMIN-05 | Non-admin user attempts `PUT /api/v1/admin/config` | HTTP 403 Forbidden |

#### 5.3.3 Audit Log Export Screen — Wireframe Specification

**Filters section:**
- Date range: two date pickers (From / To). Preset chips: Today, Last 7 days, Last 30 days, Custom.
- Urgency tier: multi-select checkboxes: EMERGENCY, URGENT, MONITOR, SAFE, UNDETERMINED (fallback).
- Fallback triggered: radio buttons: All, Yes only, No only.
- Confidence band: range slider (0.0 to 1.0). Only show results within selected band.

**Preview table:** first 20 matching rows. Columns: Triage ID, Event Type, Model Version, Prompt Version, Confidence, Urgency, Fallback, Timestamp. Note: *"Showing first 20 of [N] matching records."*

**Export:** "Export all [N] matching records as CSV" button. Calls `GET /api/v1/admin/audit-log/export` with same filter parameters. CSV columns:

```
triage_id, event_type, input_hash, output_hash, model_version,
prompt_version_id, confidence_score, urgency_tier, fallback_triggered, timestamp
```

> ⚠️ Note displayed near export button: *"This export contains hashed identifiers only. No personally identifiable information is included. Suitable for compliance review."*

> ✅ **Testing — Audit Log Export**
>
> | Test Case | Action | Expected Result |
> |---|---|---|
> | TC-ADMIN-06 | Export with date range covering 5 known triage events | Exactly 5 rows (+ header); correct columns; no email/name/phone in any cell |
> | TC-ADMIN-07 | Filter by urgency = EMERGENCY, then export | Only rows where `urgency_tier = EMERGENCY` present in CSV |
> | TC-ADMIN-08 | Filter by fallback = Yes only, then export | All rows have `fallback_triggered = true` |
> | TC-ADMIN-09 | Filter date range where no records exist | "No records match the selected filters" message; Export button disabled |

---

## 6. Acceptance Criteria

All acceptance criteria below are mandatory for delivery sign-off. Each is directly verifiable by the QA team using the test cases documented in Section 5.

| # | Acceptance Criterion | Linked Test Cases | Priority |
|---|---|---|---|
| AC-01 | A new user completes the full end-to-end flow (registration → pet profile → symptom submission → AI result) in a single session, without any instructions beyond what is visible on the user interface. | TC-MOB-06-03, TC-MOB-08-01 | Must Have |
| AC-02 | The Symptom Classification module returns a measurable, testable output on a representative sample input within 3 seconds. | TC-API-01 | Must Have |
| AC-03 | Every AI-generated triage decision is returned with a confidence score. The user interface displays a plain-language explanation derived from that decision on screen MOB-08. | TC-MOB-08-01 to 07 | Must Have |
| AC-04 | A confidence score below the configured threshold (default 0.6) triggers the documented fallback path (screen MOB-09) and does not return an unvetted result. | TC-MOB-06, TC-API-04 | Must Have |
| AC-05 | Every AI invocation is written to the audit log with: timestamp, input hash, output hash, model version, prompt version ID, and confidence score. Audit log is tamper-evident (append-only with row checksum). | TC-DB-01 to 04 | Must Have |
| AC-06 | The backend withstands a 15-minute demonstration run under representative load without crashes, memory leaks, or exceeding hardware budget. | Load test (k6 or Locust) | Must Have |
| AC-07 | All user-facing text expands Artificial Intelligence (AI), Machine Learning (ML), Application Programming Interface (API), and Web Real-Time Communication (WebRTC) on their first occurrence on each screen. | Manual UI review | Must Have |
| AC-08 | When the OpenAI API is temporarily unavailable, the system either degrades gracefully (`fallback_triggered = true`) or returns a user-readable error message. The user is never left in an unresponsive state. | TC-API-04, Circuit breaker test | Must Have |
| AC-09 | Admin can change the confidence threshold at runtime via the Admin Panel. The new threshold takes effect on the next triage request without any server restart or redeployment. | TC-ADMIN-01 to 02 | Must Have |
| AC-10 | Audit log CSV export contains no raw Personally Identifiable Information (PII). Only hashed identifiers are present. | TC-ADMIN-06 | Must Have |

---

## 7. Non-Functional Requirements

| Category | Requirement | Target / Specification |
|---|---|---|
| Performance | End-to-end triage response time | < 5 seconds for typical input (text + one photo), excluding external OpenAI API network latency |
| Performance | Symptom Classification module | Returns testable output in < 3 seconds on representative input |
| Reliability | OpenAI API failure handling | Retry ×3 with exponential backoff; circuit breaker; graceful fallback to MOB-09 |
| Reliability | WebRTC call failure | Display clear user error message; offer asynchronous text consultation as fallback |
| Security | Authentication | JWT access tokens (1hr expiry); refresh tokens (7 days); stored in device secure keychain |
| Security | Input sanitisation | All description text sanitised before passing to GPT-4o (strip HTML, prompt injection patterns) |
| Privacy | PII in audit log | Raw PII never written; SHA-256 hashed identifiers only |
| Privacy | Analytics events | No PII in any analytics event payload |
| Compliance | Audit tamper-evidence | Append-only table enforced by PostgreSQL trigger; row-level SHA-256 checksum |
| Compliance | Log retention | Minimum 90 days; CSV export available for any date range |
| Scalability | Hardware budget | Standard laptop; no GPU required; Docker Compose deployment |
| Accessibility | Touch targets | Minimum 44×44 pt for all interactive elements |
| Accessibility | Urgency communication | Colour + icon shape + text — never colour alone |
| Deployability | Deployment entrypoint | `docker-compose.prod.yml` (shared hackathon portal standard) |

---

## 8. Glossary

| Term / Abbreviation | Definition |
|---|---|
| **AI — Artificial Intelligence** | Computer systems that perform tasks that typically require human intelligence — such as recognising images, understanding language, and making decisions. |
| **API — Application Programming Interface** | A defined contract that allows two software systems to communicate. In this platform, the mobile app talks to the FastAPI backend via a REST API. |
| **Confidence Score** | A number from 0.0 to 1.0 representing how certain the AI is of its result. 1.0 = fully confident. Scores below the configured threshold (default 0.6) trigger the fallback path. |
| **Circuit Breaker** | A software reliability pattern. When an external service (e.g. OpenAI API) fails repeatedly, the circuit "opens" and stops sending requests to it for a recovery period, preventing cascading failures. |
| **Docker / Docker Compose** | Tools that package software and all its dependencies into portable containers. `docker-compose.prod.yml` defines how all services (API, database, admin) start together with one command. |
| **Exponential Backoff** | A retry strategy: wait 1 second before the first retry, 2 seconds before the second, 4 before the third. Prevents overwhelming a struggling service with immediate repeated requests. |
| **FastAPI** | A modern Python web framework for building APIs. Chosen for its async-first architecture (enabling parallel AI module calls) and automatic OpenAPI documentation generation. |
| **FRS — Functional Requirements Specification** | A document that describes the intended behaviour, features, inputs, outputs, and constraints of a software system. |
| **GPT-4o** | OpenAI's multimodal Generative Pre-trained Transformer 4 model, capable of processing and generating both text and images (Vision). Used for all four AI modules in UC45. |
| **JWT — JSON Web Token** | A compact, digitally signed token used to verify a user's identity. Consists of three base64-encoded parts: header, payload (`user_id`, expiry), signature. |
| **ML — Machine Learning** | A subset of Artificial Intelligence where systems learn from data to improve performance without being explicitly re-programmed. |
| **PII — Personally Identifiable Information** | Any data that can identify a specific individual: name, email, phone number, address. PII must never be written to the audit log. |
| **PostgreSQL** | An open-source relational database. The `audit_log` table is enforced as append-only via a database-level trigger. |
| **React Native** | A JavaScript framework for building native mobile apps for iOS and Android from a single codebase. |
| **Urgency Tier** | The primary output of the Urgency Prediction module. One of four values: `EMERGENCY` (immediate vet care), `URGENT` (vet within 24hrs), `MONITOR` (watch at home), `SAFE` (likely minor). |
| **WebRTC — Web Real-Time Communication** | An open standard for real-time audio, video, and data exchange between browsers or mobile apps, directly peer-to-peer without needing a media server. |

---

## 9. Appendix

### 9.1 Document Control

| Version | Date | Author | Changes |
|---|---|---|---|
| 1.0 | April 2026 | Avirul Dixit, Senior Business Analyst, Amnex Infotechnologies Pvt Ltd | Initial release — comprehensive FRS for UC45 covering all four audience groups |

### 9.2 Quick Reference — Who Should Read What

| Audience | Recommended Sections |
|---|---|
| **Internal Pre-Sales Lead** | Sections 1 (Executive Summary), 2 (Product Overview — 2.3 Differentiators, 2.4 Users), 6 (Acceptance Criteria), 7 (Non-Functional Requirements) |
| **Marketing Team** | Sections 1, 2.1 (Vision), 2.3.1–2.3.2 (Value Propositions), 2.4 (Users and Roles) |
| **Customer** | Sections 1, 2.3.3 (For the Customer), 3.1–3.4 (What the platform does), 8 (Glossary) |
| **Development Team** | Sections 3 (all), 4 (all), 5 (all), 6 (Acceptance Criteria with test cases), 7 (Non-Functional Requirements), 8 (Glossary) |
| **QA / Testing Team** | Section 5 (all test cases embedded in each module), Section 6 (Acceptance Criteria), Section 7 (NFRs) |

### 9.3 Estimated Development Effort

| Component | Estimated Hours | Notes |
|---|---|---|
| Mobile App — Onboarding, Login, Pet Profile | 1.5 hrs | MOB-01 to MOB-05 |
| Mobile App — Symptom Checker + Result screens | 1.5 hrs | MOB-06 to MOB-09 — most complex mobile work |
| Mobile App — Vet Call (WebRTC) + History | 0.5 hrs | MOB-10 to MOB-12 |
| Backend API — Auth, Pets, Triage endpoint | 1.5 hrs | Includes all four AI modules and `asyncio.gather()` setup |
| Backend API — Reliability patterns + Audit log | 0.5 hrs | Circuit breaker, retry, rate limiting, append-only trigger |
| Admin Panel — Dashboard + Thresholds + Export | 1.0 hrs | Web UI + `/admin` endpoints |
| **Total** | **7.0 hrs** | Hackathon scope |

### 9.4 Library Quick Reference for Developers

| Need | Recommended Library | Usage |
|---|---|---|
| Exponential retry on OpenAI calls | `tenacity` | `@retry(wait=wait_exponential(min=1, max=4), stop=stop_after_attempt(3))` |
| Circuit breaker | `pybreaker` | One `CircuitBreaker` instance per AI module (4 total) |
| Rate limiting (FastAPI) | `slowapi` | Redis-backed counter keyed by `user_id` |
| HTTP client with timeout | `httpx` (async) | `AsyncClient(timeout=4.0)` for all OpenAI calls |
| Image resize/compress (mobile) | `react-native-image-resizer` | Max 1024×1024 px, JPEG quality 80, max 500 KB |
| Network state detection (mobile) | `@react-native-community/netinfo` | Subscribe to network state changes for offline banner |
| Secure token storage (mobile) | `react-native-keychain` | Store JWT access and refresh tokens — never AsyncStorage |
| WebRTC (mobile) | `react-native-webrtc` | Combined with PeerJS signalling server |

---

*This document is the property of Amnex Infotechnologies Pvt Ltd. Confidential — Internal Use Only.*
*Prepared by Avirul Dixit, Senior Business Analyst. Reproduction without written authorisation is prohibited.*
