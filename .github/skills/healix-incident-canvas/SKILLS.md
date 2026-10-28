---
name: healix-incident-canvas
description: Guides the agent to construct the Healix Incident War Room & Public Landing in Next.js (App Router, Tailwind CSS, shadcn/ui). Implements a cyber-dark neon-blue aesthetic with an enlarged, readable layout hierarchy (+20% base scale), mock auth toggles, monitored project cards, live incident rosters, and forensic triage views.
---

# Healix Neon-Blue Incident Command & War Room Guidelines

When designing, scaffolding, or styling components, layouts, or pages for the Healix platform:

## 1. High-Density Scaling & Layout Sizing (+20% Scale)
- **Eliminate Zoomed-Out Spacing**: Do NOT use tiny 11px/12px fonts or cramped padding. The interface must feel punchy, prominent, and readable on high-resolution displays.
- **Base Typography Scale**:
  - Regular body text: `text-base` (16px) or `text-lg` (18px).
  - Code & logs: `text-sm` (14px) or `text-base` (16px) mono (never unreadable 10px).
  - Component headings: `text-xl` (20px) to `text-2xl` (24px).
  - Page titles / Hero: `text-4xl` (36px) up to `text-6xl` (60px) with `font-extrabold`.
  - Uppercase tags/badges: `text-xs` (12px) or `text-sm` (14px) with `tracking-wider font-semibold`.
- **Containers & Spacing**:
  - Max page width: `max-w-7xl` or `max-w-[1600px]` with generous padding (`px-6 md:px-10 py-8`).
  - Card padding: `p-6 md:p-8` for panels; `p-5` for smaller grid widgets.
  - Interactive targets: Buttons must have `h-11` or `h-12` minimum height with `px-5` or `px-6`.

## 2. Visual Theme & Color Palette (Electric Neon / Cyber Dark)
- **Base Canvas**: Deep obsidian/midnight black background (`bg-[#050811]` or `bg-[#070b14]`) with subtle radial glow accents:
  `bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-950/30 via-[#070b14] to-[#050811]`.
- **Translucent Glass Panels**: Elevated dark navy cards (`bg-[#0c1427]/85` or `bg-[#0f1b33]/90`) with backdrop blur (`backdrop-blur-md`).
- **Borders & Dividers**: Crisp, glowing edges (`border-cyan-500/25` or `border-blue-500/25`) with hover transitions (`hover:border-cyan-400/60`).
- **Accent Lighting (Neon Cyan & Electric Blue)**:
  - Neon Cyan: `text-cyan-400`, `bg-cyan-500/10`, `border-cyan-500/30`, `shadow-[0_0_25px_rgba(6,182,212,0.2)]`.
  - Electric Blue: `text-sky-400`, `bg-blue-600/20`, `border-blue-500/30`.
- **Severity Badges**:
  - `CRITICAL`: `text-rose-400 bg-rose-950/50 border-rose-500/40 shadow-[0_0_15px_rgba(244,63,94,0.25)]`.
  - `HIGH`: `text-amber-400 bg-amber-950/50 border-amber-500/40`.
  - `DIAGNOSED / READY`: `text-cyan-300 bg-cyan-950/50 border-cyan-400/40 animate-pulse`.
  - `HEALTHY / RESOLVED`: `text-emerald-400 bg-emerald-950/50 border-emerald-500/40`.

## 3. Structural Information Architecture
1. **Global Shell (`components/layout/Navbar.tsx`)**:
   - Healix logo with an electric cyan accent.
   - **Dev Switch (temporary)**: Prominent interactive pill `[ Mode: Logged Out ⇄ Logged In ]` storing state in a shared React Context/Cookie so both experiences can be reviewed instantly.
   - If Logged Out: `Get Started` button linking to `/auth`.
   - If Logged In: User avatar (`MS`), workspace indicator, and a `Log Out` trigger.

2. **Public Landing (`/`)**:
   - Hero banner with headline, subline, and primary `Get Started` button.
   - Visual architecture flowchart: `Alert Ingestion → Culprit Git Diff → Gemini Diagnosis → Ready-to-Merge PR`.
   - Three feature cards detailing log correlation, blame mapping, and human-in-the-loop safeguards.

3. **Unified Auth (`/auth`)**:
   - Glassmorphic card featuring GitHub (primary branded) and Google buttons (stubs with disabled state/tooltips).
   - Direct developer bypass link: *"Developer Preview: Click here to enter dashboard as Mock Operator"*.

4. **Logged-In Dashboard (`/dashboard`)**:
   - **Top Zone (Monitored Projects)**: Grid of project cards (e.g., `Payment Gateway`, `Auth Microservice`) displaying status pills, repository links, three-dot action menus (stubs), a functional `Copy Ingestion Webhook` button, and a dashed `+ Add New Project` card that opens a modal.
   - **Bottom Zone (Live Incidents Table)**: Real-time table displaying severity, error signature, origin service, deduplicated volume count, timestamp, and an **Investigate** button linking to `/incidents/[id]`.

5. **Incident Forensic Workbench (`/incidents/[id]`)**:
   - Header with incident ID, service name, timestamp, and a `Copy Thread ID` button.
   - **Hero Verdict Card (Node C)**: Gemini's root cause hypothesis and recommended action badge (`REVERT_PR`, `APPLY_CONFIG_PATCH`, etc.).
   - **Human Approval Station (Node D Stub)**: Visual banner indicating paused execution with a disabled `Approve PR (Available in Phase 4)` button and `Reject / Dismiss` control.
   - **Forensic Tabs**:
     - *Tab 1: Culprit Commits (Node B)*: Diff viewer showing suspect commits from the last 24h.
     - *Tab 2: Correlated Logs (Node A)*: Temporal log window around the crash time.
     - *Tab 3: Raw Crash Stack Trace*: Monospace raw error payload.