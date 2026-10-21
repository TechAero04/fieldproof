# FieldProof — Field Inspection & Compliance SaaS

**FieldProof** is a full-stack, enterprise-grade Field Inspection & Compliance Software-as-a-Service (SaaS) application built for safety auditors, facility directors, and field operations teams.

---

## 🚀 Key Features

- **Role-Based Workspaces**:
  - **Manager / Director Workspace**: Executive KPI analytics, OSHA/safety audit templates builder, inspection scheduling, inspector assignment, live submission review queue, change request / revision tracking, and certified PDF report downloads.
  - **Inspector Field Station**: Mobile-friendly checklist conduct interface, quick Pass / Fail / N/A triage, photo evidence capture with captions, on-device GPS geolocation verification, digital signature attestation, draft auto-saving, and resubmission.
- **Dynamic Digital Checklists**:
  - Configurable question types: Pass / Fail / N/A, 1-5 Star Ratings, Numeric thresholds, and Freeform text observations.
  - Section categorization and regulatory citations (e.g. OSHA 1910 standards).
- **Certified PDF Compliance Reporting**:
  - Branded executive audit certificates generated on-the-fly.
  - Embedded audit findings, pass/fail percentages, high-precision GPS coordinates with timestamp, inspector digital signature, and manager certification notes.
- **Relational Integrity & Audit Logging**:
  - Full relational schema (Users, Templates, Questions, Inspections, Responses, Photos, GPS Locations, Signatures, Reviews, Activity Logs).
  - Cryptographic audit trail of all field actions.

---

## 🔑 Default Initial System Accounts

FieldProof is initialized with the following verified administrative accounts:

| Role | Email | Password | Responsibilities |
|---|---|---|---|
| **Manager / Admin** | `manager@fieldproof.com` | `admin123` | Create templates, schedule audits, review findings, approve/request changes, download certified PDF reports |
| **Field Inspector** | `inspector@fieldproof.com` | `inspector123` | Conduct on-site audits, mark Pass/Fail, upload photos, record GPS coordinates, sign digitally, save drafts |

---

## 🛠️ Technology Stack

- **Framework**: Next.js 14 (App Router, Server & Client Components)
- **Language**: TypeScript
- **Styling**: Tailwind CSS, Modern Blue SaaS Design System
- **Icons**: Lucide Icons
- **Database & ORM**: Prisma ORM with SQLite (local development) / PostgreSQL & Supabase (production ready)
- **Authentication**: Secure Session-based JWT with `jose` and `bcryptjs` password hashing
- **PDF Engine**: `jspdf` & `jspdf-autotable`
- **Geolocation**: HTML5 Geolocation API with high-precision site coordinate fallback
- **Digital Signatures**: HTML5 Canvas with touch-screen and stylus support

---

## ⚡ Quick Start (Local Development)

### 1. Prerequisites
- Node.js 18+ (tested on Node v22)
- npm 9+

### 2. Install Dependencies
```bash
npm install
```

### 3. Initialize & Seed Database
```bash
# Push schema to SQLite database
npm run db:push

# Seed demo users, templates, and sample inspections
npm run db:seed
```

### 4. Run Automated Test Suite
```bash
npm test
```
*Executes all 22 automated end-to-end unit and integration tests across database persistence, auth, templates, assignments, draft saving, photos, GPS, signatures, approvals, and PDF generation.*

### 5. Launch Development Server
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 🌐 Production Deployment Guide (Supabase / PostgreSQL)

FieldProof is architected for zero-friction deployment to Vercel and Supabase:

1. **Create a Supabase Project**:
   - Go to [database.new](https://database.new) and create a free project.
   - Copy your PostgreSQL connection string from **Project Settings > Database**.

2. **Update `.env`**:
   Change `DATABASE_URL` in your `.env` or Vercel environment variables:
   ```env
   DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?sslmode=require"
   JWT_SECRET="generate-a-random-secure-32-character-secret"
   NEXT_PUBLIC_APP_URL="https://your-domain.vercel.app"
   ```

3. **In `prisma/schema.prisma`**:
   Change `provider = "sqlite"` to `provider = "postgresql"`.

4. **Deploy Migrations & Seed**:
   ```bash
   npx prisma db push
   node prisma/seed.js
   ```

5. **Deploy to Vercel**:
   ```bash
   npx vercel
   ```

---

## 📁 Project Architecture

```
fieldproof-saas/
├── prisma/
│   ├── schema.prisma       # Relational models & indexes
│   └── seed.js             # Realistic demo data seed script
├── scripts/
│   └── run-tests.js        # 22-step automated integration test runner
├── src/
│   ├── app/
│   │   ├── api/            # REST API Routes
│   │   │   ├── auth/       # Login, Logout, Me
│   │   │   ├── templates/  # Templates CRUD
│   │   │   ├── inspections/# Inspections, Draft, Submit, Review, PDF
│   │   │   ├── inspectors/ # Team management & stats
│   │   │   └── stats/      # Dashboard metrics & analytics
│   │   ├── login/          # Split authentication page with 1-click logins
│   │   ├── manager/        # Manager Workspace (Dashboard, Audits, Templates, Team, Reports)
│   │   └── inspector/      # Inspector Station (Dashboard, My Audits, Conduct Checklist, Profile)
│   ├── components/         # Reusable UI components
│   │   ├── Navbar.tsx      # Header with role switcher
│   │   ├── Sidebar.tsx     # Role-aware sidebar
│   │   ├── StatusBadge.tsx # High-contrast status badges
│   │   ├── PriorityBadge.tsx
│   │   ├── SignaturePad.tsx# HTML5 signature canvas
│   │   ├── GpsCapture.tsx  # GPS coordinate acquisition
│   │   └── PhotoUpload.tsx # Multi-image file uploader
│   └── lib/
│       ├── prisma.ts       # Prisma singleton
│       ├── auth.ts         # JWT & bcrypt authentication
│       ├── utils.ts        # Styling & formatting helpers
│       └── pdf-generator.ts# Branded PDF report engine
├── package.json
└── tailwind.config.js
```

---

## 📄 License
FieldProof SaaS is licensed under the Apache 2.0 License.
