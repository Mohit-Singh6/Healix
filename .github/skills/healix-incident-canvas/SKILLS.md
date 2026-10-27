---
name: healix-incident-canvas
description: Guides the agent to construct the Healix Incident Triage interface in Next.js using Tailwind CSS and shadcn/ui. Emphasizes an electric neon-cyan and deep navy-blue aesthetic across global navigation, auth blueprints, an operations overview feed, and a deep forensic triage workbench reflecting active LangGraph states through Node C with an interactive Node D approval gate.
---

# Healix Neon-Blue Incident Command Interface Guidelines

When building layouts, components, or screens for Healix, adhere to this information architecture, current pipeline boundaries, and cyber-minimalist visual identity.

## 1. Visual Theme & Style Tokens (Neon Blue / Dark Slate)
- **Backgrounds**: Deep obsidian canvas (`bg-[#050811]` or `bg-[#070b14]`) with subtle radial glow accents (`bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-950/25 via-[#070b14] to-[#050811]`).
- **Surfaces**: Elevated translucent navy cards (`bg-[#0d1527]/85` or `bg-[#0f172a]/90`) with backdrop blur (`backdrop-blur-md`).
- **Borders & Dividers**: Crisp translucent lines (`border-cyan-500/20` or `border-blue-500/20`) with glowing hover states (`hover:border-cyan-400/50`).
- **Accent Tokens**:
  - Neon Cyan: `text-cyan-400`, `bg-cyan-500/10`, `border-cyan-500/30`, `shadow-[0_0_20px_rgba(6,182,212,0.18)]`.
  - Electric Blue / Sky: `text-sky-400`, `bg-blue-600/20`, `border-blue-500/30`.
- **Status Badges**:
  - P1 Critical: `text-rose-400 bg-rose-950/40 border-rose-500/30`.
  - In Progress / Diagnosing: `text-cyan-300 bg-cyan-950/40 border-cyan-400/40 animate-pulse`.
  - Awaiting Decision (Node D Gate): `text-amber-400 bg-amber-950/40 border-amber-400/30`.
- **Typography**: Clean sans (`Inter` or `Geist`) for layout and labels; crisp monospace (`JetBrains Mono` or `ui-monospace`) for timestamps, error traces, Git SHAs, and payloads.

## 2. Architectural Scope & Current State
The pipeline is actively functional through **Node C**. The UI must display live data for completed stages and explicit staging states for upcoming stages:
- **Node A (Telemetry & Context)**: Fully rendered log window, deduplicated cluster volume, and raw stack trace metadata.
- **Node B (Code Forensics)**: Suspect commits, author attribution, commit notes, and code diff highlights.
- **Node C (Executive Verdict)**: Gemini's root-cause hypothesis, risk score, and suggested action (`REVERT_PR`, `APPLY_CODE_PATCH`, `APPLY_CONFIG_PATCH`, or `MANUAL_INTERVENTION`).
- **Node D (Approval Anchor)**: Interactive holding station showing the graph execution is paused at `interrupt()`. Includes placeholder action controls (`Approve & Stage Fix`, `Reject with Feedback`) ready for API wiring.

## 3. Screen Requirements & Functional Map

### A. Global Shell & Navigation
- **App Header**: Brand identity with subtle cyan glow, real-time listener pulse indicator, service/incident switcher, and profile anchor (toggleable between guest and authenticated operator).

### B. Authentication Views (Visual Blueprints)
- Developer-first Sign-In and Sign-Up cards (GitHub, Google, Email).
- Non-blocking: visually complete to demonstrate the user journey without locking local routes behind strict session guards.

### C. Operations Overview (Incident Feed)
- **High-Level Pulse**: Glanceable metrics showing total raw errors ingested vs. unique grouped clusters (highlighting `pgvector` deduplication).
- **Filtering Controls**: Quick filters by service origin, severity (P1/P2/P3), and pipeline status.
- **Incident Roster**: Feed of clustered incidents showing incident ID, blast radius (occurrence counter), root service, pipeline stage, and drill-down links.

### D. Deep Forensic & Triage View (Core Deliverable)
Structured as a multi-pane or tabbed workspace containing:
1. **Executive Summary & Verdict (Node C)**: Prominent primary card detailing Gemini's diagnosis and the suggested resolution parameters.
2. **Human Approval Station (Node D)**: Prominent decision bar indicating paused execution with action buttons and a feedback input.
3. **Code Forensics (Node B)**: Git diff explorer matching the error frame against commits from the previous 24-hour window.
4. **Telemetry Stream & Raw Ingestion (Node A)**: Monospace log window showing surrounding event context and the raw error stack trace.