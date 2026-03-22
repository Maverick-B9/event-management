# 📋 CHANGES — Ignited Minds Event Management Platform

> All changes made across development sessions.  
> Last updated: **22 March 2026**

---

## Session 1 — Excel Upload & Email Integration

### Excel-Based Student Upload System
- Built an Excel upload flow in `AdminStudents.tsx` matching the provided Google Sheets format
- Auto-creates Firebase Auth accounts for team leaders (phone number as password)
- Auto-creates teams in Firestore with proper member mapping
- Displays a data preview table before uploading
- Tracks success/failure of account creation in real-time
- Auto-generates email IDs for entries with invalid/missing emails
- Stores team size information from the Excel sheet

### Welcome Email System
- Created `emailService.ts` with a branded HTML email template (purple gradient header, dark card with credentials, team/domain info)
- Sends login credentials (email + password) to team leaders after account creation
- Tracks email send success/failure alongside account creation

---

## Session 2 — QR Code Scanner Enhancements

### QR Code Scan Popup Details
- Updated `CoordinatorScanner.tsx` entry scanner to display a team detail popup on scan (team name, leader name, team size)
- Updated food scanner to show similar popup with team info
- Improved scan UX with visual confirmation feedback

---

## Session 3 — Admin Feature Expansion *(Current Session)*

### 1. Leaderboard Authorization
- Added `leaderboardPublished` boolean field to `EventSettings` interface in `adminService.ts`
- Added "Publish Leaderboard" toggle in `AdminSettings.tsx` (Settings page)
- Updated `StudentLeaderboard.tsx` — conditionally shows scores or a locked message based on admin setting
- Real-time gating via Firestore `onSnapshot` on `settings/event`

**Files modified:**
- `src/services/adminService.ts`
- `src/app/components/admin/AdminSettings.tsx`
- `src/app/components/student/StudentLeaderboard.tsx`

---

### 2. Admin View & Edit Jury Scores
- Created `AdminEvaluations.tsx` — full evaluation management panel
  - Real-time view of all jury evaluations grouped by team
  - Shows jury member names resolved from the users collection
  - Displays average scores per team, sorted by ranking
  - Inline editing of individual score fields (Innovation, Feasibility, Technical, Presentation, Impact — each /10)
  - Auto-recalculates `totalScore` on save
  - Search functionality by team name or domain
- Added `updateEvaluation()` function in `evaluationService.ts` — allows editing specific fields and auto-recalculates total
- Added `subscribeEvaluations()` function — real-time listener for all evaluations
- Added "Evaluations" tab with `ClipboardList` icon to admin sidebar

**Files modified/created:**
- `src/services/evaluationService.ts` *(modified)*
- `src/app/components/admin/AdminEvaluations.tsx` *(new)*
- `src/app/components/admin/AdminDashboard.tsx` *(modified)*

---

### 3. Targeted Announcements
- Added `AnnouncementAudience` type: `"all"` | `"coordinator"` | `"jury"` | `"staff"`
- Rewrote `announcementService.ts` with audience support:
  - `createAnnouncement()` now accepts audience parameter
  - Added `subscribeAnnouncements(role)` for real-time, role-filtered announcements
- Added audience selector chips in `AdminSettings.tsx` announcement composer (Everyone / Coordinators Only / Jury Only / Staff)
- Updated `StudentAnnouncements.tsx` — students only see `"all"` audience
- Created `CoordinatorAnnouncements.tsx` — coordinators see `"all"` + `"coordinator"` + `"staff"`
- Created `JuryAnnouncements.tsx` — jury sees `"all"` + `"jury"` + `"staff"`
- Added "Announcements" tab to `CoordinatorDashboard.tsx` sidebar
- Added "Announcements" tab to `JuryDashboard.tsx` sidebar
- Audience badges displayed on admin's announcement list

**Files modified/created:**
- `src/services/announcementService.ts` *(rewritten)*
- `src/app/components/admin/AdminSettings.tsx` *(modified)*
- `src/app/components/student/StudentAnnouncements.tsx` *(modified)*
- `src/app/components/coordinator/CoordinatorAnnouncements.tsx` *(new)*
- `src/app/components/jury/JuryAnnouncements.tsx` *(new)*
- `src/app/components/coordinator/CoordinatorDashboard.tsx` *(modified)*
- `src/app/components/jury/JuryDashboard.tsx` *(modified)*

---

### 4. Room Allocation
- Created `roomService.ts` with full Firestore CRUD:
  - `createRoom()` — adds room with name, floor, capacity
  - `deleteRoom()` — removes a room
  - `updateRoomAssignments()` — assigns teams, jury, coordinators to rooms
  - `subscribeRooms()` — real-time listener for all rooms
- Created `AdminRooms.tsx` — room management panel:
  - Create new rooms with name, floor, and capacity fields
  - Expandable room cards with checkbox assignment UI for teams, jury, and coordinators
  - Dirty change tracking with "Unsaved" badge and highlighted border
  - Save and delete functionality per room
  - All data updated in real-time via `onSnapshot`
- Added "Rooms" tab with `DoorOpen` icon to admin sidebar

**Files created:**
- `src/services/roomService.ts` *(new)*
- `src/app/components/admin/AdminRooms.tsx` *(new)*
- `src/app/components/admin/AdminDashboard.tsx` *(modified)*

---

### 5. Live Scoreboard Notifications
- Added real-time `onSnapshot` listener for `leaderboardPublished` in all dashboards:
  - `StudentDashboard.tsx` — toast: "🏆 Leaderboard is now LIVE!" / "Leaderboard has been hidden"
  - `CoordinatorDashboard.tsx` — same toast notification
  - `JuryDashboard.tsx` — same toast notification
- Uses `useRef` to skip initial load and only notify on actual changes (not first render)
- When admin publishes leaderboard → all connected users get instant toast notification
- When admin hides leaderboard → all users notified immediately

**Files modified:**
- `src/app/components/student/StudentDashboard.tsx`
- `src/app/components/coordinator/CoordinatorDashboard.tsx`
- `src/app/components/jury/JuryDashboard.tsx`

---

### 6. Secure Email via Vercel Serverless + Gmail SMTP
- **Security fix:** Moved email sending from client-side (API key exposed in browser) to server-side Vercel function
- Created `api/send-email.ts` — Vercel serverless function using Nodemailer + Gmail SMTP
  - Input validation (email format, required fields)
  - CORS headers for cross-origin requests
  - Server-side credentials (never exposed to browser)
- Created `vercel.json` — routes `/api/*` to serverless functions, everything else to SPA
- Rewrote `emailService.ts` — now calls `/api/send-email` instead of Resend API directly
- Switched from Resend to Gmail SMTP (no custom domain needed, 500 emails/day free)
- Moved env vars from `VITE_RESEND_*` (client-exposed) to `GMAIL_*` (server-only)
- Installed `nodemailer` and `@types/nodemailer`
- Installed `@vercel/node` for serverless function types

**Files created/modified:**
- `api/send-email.ts` *(new)*
- `vercel.json` *(new)*
- `src/services/emailService.ts` *(rewritten)*
- `.env` *(updated — Resend keys replaced with Gmail SMTP)*
- `package.json` *(new dependencies)*

---

### Bug Fixes
- **Fixed dynamic Tailwind class purging** in `AdminSettings.tsx` — audience selector was using template literal class names (`border-${color}-500`) which get purged at build time. Replaced with static full class strings.

---

## Vercel Environment Variables (Required for Production)

| Variable | Value | Purpose |
|----------|-------|---------|
| `GMAIL_USER` | `yashas1519@gmail.com` | Gmail account for sending |
| `GMAIL_APP_PASSWORD` | *(App Password)* | Gmail App Password (not regular password) |
| `FROM_NAME` | `Ignited Minds` | Sender display name |

---

## Tech Stack Summary

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite + TypeScript |
| Styling | Tailwind CSS + Radix UI (shadcn) |
| Database | Firebase Firestore (Spark plan) |
| Auth | Firebase Auth (email/password) |
| Storage | Firebase Storage |
| Hosting | Vercel |
| Email | Gmail SMTP via Nodemailer (Vercel serverless) |
| Real-time | Firestore `onSnapshot` listeners |

---

## 👨‍💻 Developed By

- **Balaram B** — Department of Computer Science and Engineering
- **Yashas** — Department of Computer Science and Engineering

