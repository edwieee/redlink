# REDLINK

### District Blood Donor Matching System

REDLINK is a privacy-focused blood donor matching prototype that connects urgent blood requests with eligible nearby donors based on **blood group, location, and donation eligibility**.

The system keeps donor contact details private until the donor accepts a request.

---

## The Problem

Blood requests are often shared through broad messaging groups, reaching many people who may:

- Have an incompatible blood group
- Be outside the required area
- Not currently be eligible to donate
- Receive unnecessary repeated requests

This creates manual filtering and coordination for people already dealing with an urgent requirement.

> **The request is specific. The broadcast is not.**

---

## What REDLINK Does

REDLINK transforms a broad blood request into an eligibility-based matching workflow:

```text
Request
   ↓
Eligibility Check
   ↓
Nearby Donor Matching
   ↓
Private Notification
   ↓
Donor Acceptance
   ↓
Contact Reveal
```

Matching considers:

- Blood group compatibility
- Locality / pincode
- Donation eligibility
- Contact privacy

---

## Key Features

### Blood Group Matching

Matches blood requests with compatible donor blood groups using defined compatibility rules.

### Location Matching

The current prototype matches donors using locality and pincode.

### Donation Eligibility

The prototype uses a 120-day donation interval rule to determine basic donor eligibility.

> The 120-day interval is a prototype rule and is not presented as a clinical or official blood-bank standard.

### Privacy-First Matching

Donor contact details remain private before the donor accepts a request.

### Request → Match → Notify → Accept

The prototype demonstrates the core workflow from creating a blood request to donor acceptance.

---

## Current Prototype

### What Works

- Blood group compatibility matching
- Locality / pincode matching
- Donation interval checking
- Donor registration
- Blood request creation
- Match generation
- In-app notification flow
- Donor acceptance flow
- Privacy-controlled contact reveal
- Supabase database with Row Level Security (RLS)

### Known Limitations

- Production authentication is not implemented
- SMS / WhatsApp / push notifications are not integrated
- Location matching currently uses locality / pincode instead of GPS distance
- Medical validation is simplified and is not a substitute for clinical blood-bank validation
- Demo uses synthetic donor and request records

---

## Tech Stack

**Frontend**

- Next.js
- React
- TypeScript
- Tailwind CSS

**Backend & Database**

- Supabase
- PostgreSQL
- Row Level Security (RLS)

**AI-Assisted Development**

- **Antigravity** — AI-assisted development, implementation, and debugging
- **Google Gemini** — coding assistance and implementation support
- **Claude** — architecture, code review, database, and privacy reasoning

---

## Architecture

```text
                    ┌──────────────────┐
                    │   REDLINK Web UI │
                    │   Next.js / React│
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │ Matching Engine  │
                    │                  │
                    │ Blood Group      │
                    │ Location         │
                    │ Eligibility      │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │    Supabase      │
                    │   PostgreSQL     │
                    │                  │
                    │ Donors           │
                    │ Requests         │
                    │ Matches          │
                    └──────────────────┘
```

---

## Matching Logic

REDLINK evaluates donors using three primary conditions:

```text
Blood Group
     +
Location
     +
Donation Eligibility
     ↓
Eligible Match
```

### Blood Group Compatibility

The prototype uses predefined blood-group compatibility rules to determine whether a donor can be considered for a request.

### Location

A donor is considered nearby when the donor and request share the required locality / pincode.

### Donation Interval

A donor is considered eligible when the time since their last recorded donation meets the prototype's 120-day interval rule.

---

## Privacy Model

REDLINK is designed around a simple privacy boundary:

```text
Before Acceptance
        ↓
Donor Contact Details
        ↓
      PRIVATE

After Valid Acceptance
        ↓
Authorized Contact Exchange
        ↓
      REVEALED
```

Donor contact details are not exposed in public matching results before acceptance.

Database access is protected using Supabase Row Level Security (RLS).

---

## Demo Data

The repository contains synthetic demo donor and request records for testing the matching workflow.

Example:

```text
Blood Request
O+
Koratty
Urgent

        ↓

Eligible Donor
O+
Koratty
Last donation: 180 days ago

        ↓

MATCH
```

The demo also includes records that demonstrate why donors may be excluded:

- Recent donation
- Incompatible blood group
- Different location

---

## Project Structure

```text
src/
├── app/
│   ├── donor/
│   ├── request/
│   └── ...
│
├── lib/
│   ├── supabase.ts
│   ├── database.types.ts
│   └── ...
│
└── tests/

supabase/
├── migrations/
│   └── 001_initial_schema.sql
└── seed.sql
```

---

## Getting Started

### 1. Clone the Repository

```bash
git clone <YOUR_REPOSITORY_URL>
cd <PROJECT_FOLDER>
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

> Never expose a Supabase service-role key in client-side code.

### 4. Run the Development Server

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

---

## Testing

Run the test suite:

```bash
npm test
```

Run TypeScript type checking:

```bash
npx tsc --noEmit
```

Build the project:

```bash
npm run build
```

---

## Roadmap

With additional development time, REDLINK can be extended with:

- Production authentication
- SMS / WhatsApp / push notifications
- GPS-based distance matching
- Hospital and blood-bank integrations
- Stronger donor and request verification
- Operational monitoring
- Real-world pilot testing

---

## What We Would Improve With Two More Weeks

The next development phase would focus on moving REDLINK from a working prototype toward real-world deployment:

1. **Real-time notifications**
   Add SMS, WhatsApp, and push notifications for matched donors.
2. **Secure donor-requester communication**
   Enable controlled contact exchange after donor acceptance.
3. **Hospital and blood-bank integration**
   Connect verified blood requests and availability information.
4. **Smarter location matching**
   Move from exact locality / pincode matching toward distance-based matching.
5. **Verification and monitoring**
   Add stronger donor/request verification, abuse prevention, and operational monitoring.
6. **Pilot testing**
   Test the complete workflow with real users and refine the system based on feedback.

---

## Important Note

REDLINK is a prototype developed to demonstrate a blood donor matching workflow.

It is **not** a medical decision-making system and should not replace professional blood-bank compatibility testing, clinical validation, or medical advice.

The donor and request records included in the prototype are synthetic demonstration data.

---

## Hackathon

**ANAVANDI 2026 — SC-12**

**Challenge:** District Blood Donor Matching

REDLINK focuses on connecting blood requests with eligible nearby donors while protecting donor contact information until acceptance.

---

## Team

**REDLINK Team**

Built for ANAVANDI 2026.

```text
REQUEST
   ↓
MATCH
   ↓
NOTIFY
   ↓
ACCEPT
   ↓
CONTACT REVEAL
```
