# 🛡️ SentinelFlow: Zero-Trust Autonomous AI Workspace
## Product Requirements Document (PRD), Technical Requirements Document (TRD) & Implementation Plan

---

# PART 1: PRODUCT REQUIREMENTS DOCUMENT (PRD)

## 1. Executive Summary & Vision
Autonomous coding agents possess the power to read codebases, modify files, run bash commands, and install dependencies. However, in enterprise and security-sensitive environments, **unconstrained autonomy is a critical liability**:
* Context ingestion inadvertently exfiltrates secrets (API keys, bearer tokens, private credentials) into cloud model providers.
* Hallucinated, manipulated, or prompt-injected tool calls execute destructive filesystem modifications or dangerous shell invocations without verification.
* Developers lack a granular, auditable security timeline explaining *why* an agent took an action, what risk level it carried, and whether verification succeeded.

**SentinelFlow** transforms the open-source **openPly** web IDE into an enterprise-grade **Zero-Trust Autonomous AI Workspace**. SentinelFlow introduces an intelligent, deterministic **Security & Capability Control Gateway** wrapped around the reasoning agent (powered natively by **Google Gemini Flash**).

---

## 2. Problem Statement
| Vulnerability Vector | Current Agent Behavior | SentinelFlow Zero-Trust Behavior |
| :--- | :--- | :--- |
| **Secret Exfiltration** | `.env` variables and secrets are ingested directly into prompt context. | **Context Shield** detects and redacts secrets before prompt dispatch (`[REDACTED]`). |
| **Unchecked Mutations** | Agent modifies code files or executes git operations silently. | **Capability Gate** halts `HIGH` risk tool calls and requests human sign-off with visual diffs. |
| **Rogue Shell Invocations** | Blind bash execution can wipe disks or leak environments. | **Deterministic Risk Engine** blocks destructive patterns and restricts execution permissions. |
| **Missing Verification** | Agent claims a fix works without testing. | **Autonomous Verification Loop** runs localized tests automatically; fails trigger replanning. |
| **Zero Auditability** | Raw text logs provide no structured timeline of security actions. | **Live Security Replay** visualizes every event, scan, approval, and verification step in real time. |

---

## 3. User Personas
1. **Security Engineer / AppSec Lead**: Requires assurance that proprietary code and secrets never leak to external LLM logs and that destructive bash commands are provably blocked.
2. **Software Engineer**: Wants autonomous bug fixing and refactoring speed without the fear that an agent will silently introduce regressions or corrupt production configs.
3. **Hackathon Judge / Auditor**: Needs an immediate, visual, 90-second demonstration proving that the AI is safely constrained under an active security perimeter.

---

## 4. Key Functional Features

### F1: Sentinel Context Shield (Secret Scanner & Redactor)
* Ingests workspace context, file contents, and user messages.
* Identifies API keys (GitHub tokens, AWS keys, generic bearer tokens, private keys) via regex and entropy scanners.
* Redacts secrets in-memory prior to calling the Gemini Flash API, logging a `SECRET_SCAN` event to the security audit bus.

### F2: Deterministic Capability Gate & Risk Engine
* Intercepts every tool request emitted by Gemini Flash (`write_file`, `edit_file`, `run_command`, `read_files`, `search_code`).
* Evaluates action risk using deterministic, rule-based classification:
  * **LOW (Auto-Allowed)**: Read-only operations (`read_files`, `search_code`, `git_status`).
  * **MEDIUM (Sandbox-Allowed)**: Safe test and lint runs (`npm test`, `pytest`, `eslint`).
  * **HIGH (Approval Required)**: Code writes, file updates, git commits, outbound network calls.
  * **CRITICAL (Elevated / Blocked)**: File deletions (`rm`), disk utilities (`mkfs`, `dd`), credential access.

### F3: Human-in-the-Loop (HITL) Capability Approval Modal
* Intercepts high-risk operations and pauses agent execution.
* Presents an interactive UI dialog to the developer containing:
  * Capability requested (e.g., `CAPABILITY_WRITE_FILE`)
  * Target resource and rationale
  * Exact side-by-side or unified diff of intended changes
  * One-click **Approve** or **Deny with Feedback** buttons.

### F4: Live Security Replay & Audit Timeline
* A dedicated visual timeline panel embedded directly inside the SentinelFlow IDE.
* Displays animated, real-time status nodes with timestamps:
  * `11:37:01 👀 EVENT DETECTED (Vulnerability flagged)`
  * `11:37:02 🛡️ SECRET SCAN (Context sanitized: 1 secret redacted)`
  * `11:37:03 🧠 GEMINI REASONING (Patch formulated)`
  * `11:37:05 🔐 CAPABILITY GATE (WRITE_FILE classified as HIGH)`
  * `11:37:06 👤 USER APPROVED (Human authorization confirmed)`
  * `11:37:07 ⚡ TOOL EXECUTED (auth.py patched)`
  * `11:37:09 🧪 TEST EXECUTED (pytest running)`
  * `11:37:10 ✅ VERIFIED (All tests passing, audit committed)`

### F5: Autonomous Verification & Self-Correction
* Upon tool execution, SentinelFlow runs test runners (e.g., `pytest` / `npm test`).
* If verification fails, failure output is routed back to Gemini with a replanning directive.
* Once verified, a cryptographic hash of the audit event is logged.

### F6: Native Google Gemini Flash Integration
* Connects directly to Google's Gemini Flash model family via structured tool-calling.
* Leverages Gemini's high-speed reasoning and massive context window for instant code auditing.

---

## 5. Non-Functional Requirements
* **Latency**: Context secret redaction and deterministic risk evaluation must execute in `< 10ms`.
* **Zero Dependencies on Heavy Infrastructure**: Runs entirely on the lightweight client-server architecture of openPly (Node.js/TypeScript Express server + React/Vite web client); no PostgreSQL, Redis, Docker, or external cloud databases required.
* **Explainability**: Every blocked or approved tool call must feature a human-readable explanation in the audit log.
* **Platform Compatibility**: Operates reliably on Windows, macOS, and Linux.

---

## 6. The 90-Second Demo Script
1. **Setup**: SentinelFlow workspace opens with a vulnerable repository (`demo-project/auth.py` containing an obvious SQL injection and hardcoded API token).
2. **Trigger**: Developer prompts: *"Audit auth.py for security vulnerabilities and patch them."*
3. **Observation 1 (Shield)**: Timeline highlights `🛡️ SECRET SCAN`. Token `ghp_live_938174` is redacted to `[REDACTED_GH_TOKEN]`.
4. **Observation 2 (Reasoning)**: Gemini Flash identifies the raw SQL query string interpolation and generates a parameterized query replacement.
5. **Observation 3 (Capability Gate)**: Agent issues `write_file(auth.py)`. The IDE immediately displays the **Capability Approval Modal** (`HIGH RISK: FILE_WRITE`).
6. **Observation 4 (HITL)**: User reviews the diff and clicks **Approve**.
7. **Observation 5 (Verification)**: `pytest demo-project/test_auth.py` runs automatically. Terminal flashes `3/3 PASSED`.
8. **Observation 6 (Security Replay)**: The Live Security Replay panel completes the entire chain with green checkmarks and timestamps.

---

# PART 2: TECHNICAL REQUIREMENTS DOCUMENT (TRD)

## 1. System Architecture Overview

```
                      ┌──────────────────────────────────────────────┐
                      │             SentinelFlow Web IDE             │
                      │  (React 18 + Vite + Monaco + Security Replay) │
                      └──────────────────────┬───────────────────────┘
                                             │ HTTP / SSE (/api/security/stream)
                                             ▼
                      ┌──────────────────────────────────────────────┐
                      │          SentinelFlow Web Server             │
                      │         (Express.js / Node.js Runtime)       │
                      └──────────────────────┬───────────────────────┘
                                             │
               ┌─────────────────────────────┴─────────────────────────────┐
               ▼                                                           ▼
┌──────────────────────────────┐                           ┌──────────────────────────────┐
│  🛡️ Sentinel Security Engine  │                           │   🧠 Gemini Flash Provider   │
│  - shield.ts (Secret Scrubber)│                           │   - Native Gemini 2.5/3.8    │
│  - capabilities.ts (Policies)│                           │   - Function Calling Schemas │
│  - risk.ts (Classifier)      │                           └──────────────┬───────────────┘
│  - approval.ts (HITL Interlock)│                                         │
│  - audit.ts (Event Emitter)  │                                         │
└──────────────┬───────────────┘                                         │
               │                                                         │
               ▼                                                         │
┌──────────────────────────────┐                                         │
│   🔐 Capability Gate Intercept│ ◄───────────────────────────────────────┘
│  (Evaluates LLM Tool Call)   │
└──────────────┬───────────────┘
               │
        ┌──────┴──────┐
        │ Risk Level? │
        └──────┬──────┘
       LOW /   │   HIGH /
     SANDBOX   │  CRITICAL
        ▼      ▼
    [ALLOW]  [PAUSE & DISPATCH APPROVAL EVENT TO UI]
        │              │
        │        (User Approves)
        │              │
        ▼              ▼
┌──────────────────────────────┐
│      ⚡ Tool Execution       │
│  (writeFile / runBash)       │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│    🔎 Verification Engine    │
│   (Automated Test Execution) │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│   📜 Live Security Replay    │
│     (SSE Broadcast to UI)    │
└──────────────────────────────┘
```

---

## 2. Directory Structure & File Manifest

Within the `openply` repository:

```
openply/
├── packages/
│   ├── core/
│   │   └── src/
│   │       ├── security/
│   │       │   ├── index.ts          # Core security exports
│   │       │   ├── shield.ts         # In-memory secret detection & token redaction
│   │       │   ├── capabilities.ts   # Capability declarations & permission schemas
│   │       │   ├── risk.ts           # Deterministic risk engine (LOW, MED, HIGH, CRIT)
│   │       │   ├── approval.ts       # HITL async interlock & approval bus
│   │       │   ├── audit.ts          # Security timeline event logger & SSE broadcaster
│   │       │   └── verifier.ts       # Test execution & regression validator
│   │       ├── llm/
│   │       │   ├── gemini.ts         # Direct Google Gemini Flash provider client
│   │       │   └── models.ts         # Model catalog updated with Gemini Flash models
│   │       └── agent/
│   │           └── orchestrator.ts   # Wrapped tool dispatcher with Capability Gate
├── site/
│   ├── server.ts                     # Express server: added /api/security endpoints & SSE
│   └── src/
│       ├── components/
│       │   ├── SecurityReplay.tsx    # Live visual security timeline panel
│       │   ├── CapabilityModal.tsx   # Interactive HITL approval dialog with diff viewer
│       │   ├── Navbar.tsx            # Rebranded SentinelFlow header & zero-trust badge
│       │   └── ChatPanel.tsx         # Integrated with security timeline & model picker
└── demo-project/
    ├── app.py                        # Minimal Python web application
    ├── auth.py                       # Deliberately vulnerable file (SQLi + secret token)
    └── test_auth.py                  # Pytest verification suite
```

---

## 3. Module Specifications & Interfaces

### 3.1 Security Shield (`shield.ts`)
Scans any text payload (prompt context, file reads, tool parameters) against a library of high-precision secret signatures.

```typescript
export interface SecretPattern {
  name: string
  pattern: RegExp
  replacement: string
}

export interface ScanResult {
  hasSecrets: boolean
  redactedText: string
  matchesFound: Array<{ type: string; index: number }>
}

export function scanAndSanitize(input: string): ScanResult
```

### 3.2 Capability & Risk Engine (`capabilities.ts`, `risk.ts`)
Maps tool names and parameter payloads to deterministic risk categories:

```typescript
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export interface CapabilityCheck {
  tool: string
  args: Record<string, any>
  riskLevel: RiskLevel
  requiresApproval: boolean
  reason: string
  suggestedAction: 'ALLOW' | 'PROMPT_APPROVAL' | 'BLOCK'
}

export function evaluateCapability(tool: string, args: Record<string, any>): CapabilityCheck
```

### 3.3 Approval Bus (`approval.ts`)
Manages pending authorization requests through an asynchronous promise dictionary:

```typescript
export interface ApprovalRequest {
  id: string
  timestamp: number
  tool: string
  args: Record<string, any>
  riskLevel: RiskLevel
  reason: string
  diffPreview?: string
}

export class ApprovalManager {
  createRequest(details: Omit<ApprovalRequest, 'id' | 'timestamp'>): Promise<boolean>
  resolveRequest(id: string, approved: boolean): void
  getPending(): ApprovalRequest[]
}
```

### 3.4 Live Security Replay Bus (`audit.ts`)
Broadcaster for server-sent events (SSE) feeding the frontend timeline:

```typescript
export interface SecurityTimelineEvent {
  id: string
  timestamp: string
  type: 
    | 'EVENT_DETECTED'
    | 'SECRET_SCAN'
    | 'CONTEXT_SANITIZED'
    | 'GEMINI_REASONING'
    | 'CAPABILITY_REQUESTED'
    | 'USER_APPROVAL'
    | 'USER_REJECTED'
    | 'EXECUTION_STARTED'
    | 'EXECUTION_COMPLETED'
    | 'TEST_EXECUTED'
    | 'VERIFICATION_PASSED'
    | 'VERIFICATION_FAILED'
  details: string
  level: 'info' | 'warn' | 'success' | 'danger'
  metadata?: Record<string, any>
}
```

---

## 4. API Endpoints Specification

1. `GET /api/security/events` (SSE Stream)
   * Streams `SecurityTimelineEvent` payloads in real time using Server-Sent Events.
2. `GET /api/security/pending`
   * Returns list of currently pending approval requests.
3. `POST /api/security/approve`
   * Body: `{ id: string, approved: boolean }`
   * Resolves the suspended tool execution in `approval.ts`.
4. `POST /api/security/scan`
   * Body: `{ text: string }`
   * Returns sanitized text and detected secret types.
5. `POST /api/chat` (Extended)
   * Added native support for Gemini Flash (`gemini-2.5-flash` / `gemini-3.8-flash`) using direct Google Generative AI API calls when `GEMINI_API_KEY` is present.

---

# PART 3: STEP-BY-STEP IMPLEMENTATION PLAN

## Phase 1: Environment Setup & Clean Baseline Checkpoint
- [ ] **Step 1.1**: Run `npm install` across the openPly monorepo to resolve root, core, cli, and site dependencies.
- [ ] **Step 1.2**: Inspect and test start commands:
  * Start the backend/web IDE (`npm run dev` or `cd site && npm run dev`).
  * Verify clean startup on `http://localhost:5173` and `http://localhost:3001`.
  * Ensure no build breaks or missing native bindings.

## Phase 2: Core Security Gateway Engine (`packages/core/src/security/`)
- [ ] **Step 2.1**: Implement `shield.ts` with regex/entropy detectors and secret sanitization functions.
- [ ] **Step 2.2**: Implement `capabilities.ts` and `risk.ts` defining the deterministic risk matrix.
- [ ] **Step 2.3**: Implement `approval.ts` providing an async promise-based approval queue for interactive tool execution.
- [ ] **Step 2.4**: Implement `audit.ts` with in-memory ring buffer and event subscription mechanism for live telemetry.
- [ ] **Step 2.5**: Update `packages/core/src/security/index.ts` to export all new security modules.

## Phase 3: Gemini Flash Integration
- [ ] **Step 3.1**: Create `packages/core/src/llm/gemini.ts` implementing the Gemini client supporting system instructions and tool definitions.
- [ ] **Step 3.2**: Register `gemini-2.5-flash` / `gemini-3.8-flash` in `packages/core/src/llm/models.ts` as primary recommended models.
- [ ] **Step 3.3**: Ensure `site/server.ts` recognizes `GEMINI_API_KEY` and handles Gemini streaming / tool call formatting.

## Phase 4: Intercepting the Agent Execution Loop
- [ ] **Step 4.1**: In `packages/core/src/agent/orchestrator.ts`, wrap `executeToolCall`:
  * Pre-execution: Evaluate risk via `evaluateCapability`.
  * If `HIGH` or `CRITICAL`, trigger `approvalManager.createRequest` and await human decision.
  * Emit corresponding `CAPABILITY_REQUESTED` and `USER_APPROVAL` events to `audit.ts`.
- [ ] **Step 4.2**: Add post-execution verification:
  * If file was modified, run quick verification checks (`npm test` or `pytest`) and emit `VERIFICATION_PASSED` / `VERIFICATION_FAILED`.

## Phase 5: Server APIs & SSE Security Bus
- [ ] **Step 5.1**: In `site/server.ts`, wire up:
  * `/api/security/events` SSE endpoint for streaming security events to the browser.
  * `/api/security/approve` endpoint for responding to pending approval requests.
  * `/api/security/pending` endpoint for fetching active modals.

## Phase 6: Frontend UI: SentinelFlow Branding & Security Replay
- [ ] **Step 6.1**: Update visible branding in `site/src/components/Navbar.tsx` and `site/index.html` to **🛡️ SentinelFlow: Zero-Trust Autonomous AI Workspace**.
- [ ] **Step 6.2**: Build `site/src/components/SecurityReplay.tsx`:
  * A sleek, modern HUD timeline displaying live security events with status icons, timestamps, and glowing pulse animations.
- [ ] **Step 6.3**: Build `site/src/components/CapabilityModal.tsx`:
  * Displays when high-risk operations occur, showing file diffs and allowing instant Approve/Deny.
- [ ] **Step 6.4**: Embed `SecurityReplay` and `CapabilityModal` into `site/src/pages/AppPage.tsx`.

## Phase 7: Demo Repository & 90-Second Walkthrough Validation
- [ ] **Step 7.1**: Create `demo-project/`:
  * `app.py`: Simple Python HTTP service.
  * `auth.py`: Insecure SQL string concatenation + dummy secret token.
  * `test_auth.py`: Pytest suite that fails initially and passes once sanitized and parameterized.
- [ ] **Step 7.2**: Perform complete dry run:
  1. Trigger audit $\to$ 2. Secret scan $\to$ 3. Capability intercept $\to$ 4. HITL Approval $\to$ 5. Automated test verification $\to$ 6. Replay timeline.
- [ ] **Step 7.3**: Final verification & documentation polish.
