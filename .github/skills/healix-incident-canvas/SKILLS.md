---
name: healix-incident-canvas
description: Guides the agent to construct the Healix Incident War Room & Public Landing in Next.js (App Router, Tailwind CSS, shadcn/ui). Implements a warm-charcoal and technical-amber engineering aesthetic with sharp, high-density layouts, clear typography hierarchy, and authentic forensic workflows.
---

# Healix Technical Incident Command & War Room Guidelines

When designing, scaffolding, or styling components, layouts, or pages for the Healix platform:

## 1. High-Density Scaling & Layout Sizing
- **Intentional Sizing**: Avoid tiny cramped text or generic rounded bubble sizing. The interface must feel tactile, dense, and engineered for high-resolution dev setups.
- **Base Typography Scale**:
  - Regular body text: `text-sm` (14px) or `text-base` (16px) warm neutral.
  - Code, metrics, & logs: Monospace `font-mono text-xs` (12px) or `text-sm` (14px).
  - Headings: `text-2xl` to `text-5xl` with tight tracking (`tracking-tight`).
  - Metadata / Status tags: `text-xs font-mono uppercase tracking-wider`.
- **Containers & Geometry**:
  - Crisp, structural radii: Avoid overly rounded squircles (`rounded-2xl` or `rounded-3xl`). Prefer sharp, deliberate borders (`rounded-md` or `rounded-lg`, 4px–8px max).
  - Card padding: `p-6 md:p-8` for major inspection panels; `p-4 md:p-5` for dense telemetry blocks.

## 2. Visual Theme & Color Palette (Warm Carbon & Industrial Amber)
Eliminate generic AI tropes: no blue/purple glassmorphism, no neon cyan glow drop-shadows, and no floating gradient blobs.
- **Base Canvas**: Deep warm carbon/charcoal background (`bg-[#121211]` or `bg-[#161614]`).
- **Surfaces & Panels**: Dark basalt/olive-charcoal cards (`bg-[#1B1B18]` or `bg-[#181816]`).
- **Borders & Dividers**: Crisp, hair-thin structural lines (`border-[#2B2A24]`), flat without outer neon glows.
- **Color Discipline**:
  - **Primary Warm Accent**: Industrial Amber / Ochre (`#F59E0B` / `#D97706`). Use strictly for active tabs, primary actions, and focal tags.
  - **System Normal / Healthy / Merged**: Terminal Emerald (`#10B981` / `border-emerald-500/30 text-emerald-400 bg-emerald-950/40`).
  - **Incident / Failure / Warning**: Coral Crimson (`#EF4444` / `border-rose-500/30 text-rose-400 bg-rose-950/40`).
  - **Body & Secondary Copy**: Muted warm off-white (`#E2E2DC` for headings, `#A1A19A` for secondary copy).

## 3. Structural Information Architecture

1. **Global Shell (`components/layout/Navbar.tsx`)**:
   - Healix monochrome text logo with subtle amber status indicator.
   - Clean navigation links: `Docs`, `Contact Us` (no session debug toggles in public view).
   - Single primary CTA button: `Get Started` (`bg-[#F59E0B] text-black font-medium` or crisp off-white `bg-[#EDEDED] text-black`).

2. **Public Guest Landing (`/`)**:
   - Long-form, content-dense developer tool landing page.
   - **Hero**: Clear technical value prop with authentic code artifacts (a compact, realistic unified Git diff / terminal log instead of abstract step cards).
   - **Architecture Section**: Asymmetrical technical flow detailing telemetry ingestion, AST git-blame mapping, test-runner execution, and automated PR drafting.
   - **Bento Feature Grid**: Deep dives into sandbox safety, deterministic guardrails, and telemetry reduction stats.
   - **Interactive Comparison**: Conventional on-call timeline vs. Healix automated remediation.
   - **Footer & Pre-Footer**: Clean multi-column technical sitemap with legal and documentation links.

3. **Unified Auth (`/auth`)**:
   - Clean dark-charcoal card featuring GitHub (primary branded) and Google buttons.
   - Developer bypass link for local mock testing.

4. **Logged-In Dashboard (`/dashboard`)**:
   - **Top Zone (Monitored Projects)**: Grid of project cards (e.g., `Payment Gateway`, `Auth Microservice`) displaying status indicators, repo links, and ingestion webhook configs.
   - **Bottom Zone (Live Incidents Table)**: Real-time table displaying severity, error signature, origin service, deduplicated volume count, timestamp, and an **Investigate** button linking to `/incidents/[id]`.

5. **Incident Forensic Workbench (`/incidents/[id]`)**:
   - Header with incident ID, service name, timestamp, and thread link.
   - **Hero Verdict Card**: Root-cause diagnostic hypothesis and recommended action tag (`REVERT_PR`, `APPLY_CONFIG_PATCH`).
   - **Approval Station**: Visual action station to review and approve/reject the generated branch.
   - **Forensic Tabs**:
     - *Tab 1: Culprit Commits*: Unified diff viewer showing suspect commits from the last 24h.
     - *Tab 2: Correlated Logs*: Chronological log stream around failure point.
     - *Tab 3: Raw Crash Stack Trace*: Monospace raw error payload.