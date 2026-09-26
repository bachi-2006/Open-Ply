# openPly — Full Project Documentation

> **Version**: 0.1.0 | **License**: MIT | **Published**: npmjs.com/package/openply
> **Repository**: github.com/openply26/openply | **Web App**: openply.pages.dev | **API**: openply.onrender.com

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture](#2-architecture)
3. [CLI Application](#3-cli-application)
4. [Web IDE (site/)](#4-web-ide-site)
5. [VS Code Extension](#5-vs-code-extension)
6. [API Server](#6-api-server)
7. [State Management](#7-state-management)
8. [Components](#8-components)
9. [Slash Commands](#9-slash-commands)
10. [Design Partner](#10-design-partner)
11. [Configuration](#11-configuration)
12. [Build & Deploy](#12-build--deploy)
13. [Environment Variables](#13-environment-variables)
14. [Project Structure](#14-project-structure)

---

## 1. Project Overview

openPly is a free, local-first, open-source AI coding assistant available as both a CLI and a full web IDE. It uses a multi-agent mesh architecture (PlyMesh) where specialized agents (Planner, Editor, Explorer, Debugger, Reviewer) collaborate on every task.

### Key Principles
- **Privacy-first**: Your code never leaves your machine. Run local models via Ollama, or use cloud models via OpenRouter/OpenAI/Anthropic.
- **Free forever**: No subscription, no credit card, no data collection.
- **Multi-session**: Independent session history, agents, and model settings per session.
- **Multi-agent**: 5 specialized agents collaborate on every task with Plan (read-only) and Build (read-write) modes.

### Supported Models
| Model | Provider | Tag |
|-------|----------|-----|
| DeepSeek V4 Pro | OpenRouter | Full mode |
| MiMo 2.5 Pro | OpenRouter | Full mode |
| Kimi K2.7 Code | OpenRouter | Full mode |
| DeepSeek V4 Flash | OpenRouter | Limited |
| MiMo 2.5 | OpenRouter | Limited |
| MiniMax M3 | OpenRouter | Full mode |
| DeepSeek Coder V2 | Ollama (Local) | Local |
| Qwen 2.5 Coder | Ollama (Local) | Local |
| CodeLlama | Ollama (Local) | Local |

---

## 2. Architecture

### CLI Flow
```
User Input → REPL (readline) → Orchestrator.run(prompt)
  → loadKnowledge() + loadProjectAgents()
  → LLM.chat() with PLANNER_PROMPT → returns JSON Plan
  → executePlan() iterates steps:
     - search: glob/grep
     - bash: execSync (30s timeout)
     - edit: read → LLM edit → write → diff display
     - message: print content
  → reviewChanges() via LLM with REVIEWER_PROMPT
```

### Web IDE Flow
```
Browser (React) → Express API Server → Local filesystem
  /api/chat:     POST → OpenRouter/Ollama streaming → SSE → browser
  /api/files:    GET → walk project tree → JSON list
  /api/write:    POST → writeFileSync → JSON response
  /api/search:   POST → ripgrep/findstr/grep → JSON results
  /api/websearch: POST → DuckDuckGo scrape → text results
  /api/terminal: POST → execSync → stdout/stderr → JSON
```

### Agent Mesh (PlyMesh)
```
                    ┌──────────────┐
                    │  User Input  │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │  Orchestrator │
                    │  (plan + exec)│
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │ Planner   │ │ Editor   │ │ Explorer │
        │ (read)    │ │ (write)  │ │ (search) │
        └──────────┘ └──────────┘ └──────────┘
              │            │            │
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐
        │ Debugger │ │ Reviewer │
        │ (test)   │ │ (audit)  │
        └──────────┘ └──────────┘
```

---

## 3. CLI Application

### Entry Point
- **File**: `src/cli/index.ts`
- **Binary**: `openply` (via package.json `"bin"`)

### Commands
| Command | Description |
|---------|-------------|
| `openply [prompt]` | Start interactive REPL session. Optionally pass an initial prompt. |
| `openply config [--set key=val] [--reset] [--show-models]` | View/update configuration |
| `openply history [--delete <id>]` | Browse past sessions |
| `openply web "<desc>" [--stack] [--preview]` | Build a web app from a description |
| `openply agents` | List built-in agents |

### Options
- `--model <id>` — Override model for the session
- `--local` — Force local mode (Ollama)
- `--no-ads` — Disable sponsor ads

### REPL Slash Commands
| Command | Description |
|---------|-------------|
| `/help` | Show help |
| `/exit` | Exit REPL |
| `/new` | Start new session |
| `/init` | Scaffold project with .agents/ |
| `/bash <cmd>` | Run bash command |
| `/config` | Show config |
| `/model <id>` | Switch model |

### Built-in Agents
| ID | Name | Tools |
|----|------|-------|
| `git-committer` | Git Committer | read_files, run_terminal_command, end_turn |
| `debugger` | Debugger | read_files, run_terminal_command, edit_files, end_turn |
| `refactorer` | Code Refactorer | read_files, edit_files, run_terminal_command, end_turn |
| `documenter` | Documenter | read_files, edit_files, end_turn |
| `tester` | Test Writer | read_files, run_terminal_command, edit_files, end_turn |

### Custom Agents
Create `.js` files in `.agents/` directory at project root. Each file exports an agent definition:
```ts
interface AgentDefinition {
  id: string;
  displayName: string;
  model?: string;
  instructionsPrompt: string;
  toolNames: string[];
  handleSteps?: boolean;
}
```

---

## 4. Web IDE (site/)

### Tech Stack
- **Frontend**: React 18 + TypeScript + Vite 6 + Tailwind CSS 4
- **Backend**: Express 5 + tsx
- **Routing**: React Router 7
- **Markdown**: react-markdown + rehype-highlight + remark-gfm

### Layout
```
┌─ Top Header (logo, mobile menu, message count) ──────────┐
├─ AgentBar: [Plan|Build] [Agent ▼] [YOLO] [model] ───────┤
├─ ToolBar: [Search] [Web] [Todo] [Shortcuts] ─────────────┤
├──────┬────────────────────┬───────────────────────────────┤
│      │                    │ Code | Edit | Term | Settings │
│ Sess │   ChatPanel        │                               │
│ ions │   (markdown,       │   (right panel renders        │
│ +    │    streaming,      │    CodeView/FileEditor/        │
│ Files│    slash cmds)     │    TerminalPanel/ProviderConfig)│
├──────┴────────────────────┴───────────────────────────────┤
├─ StatusBar: mode | model | msgs | files | diagnostics ───┤
```

### Right Panel Tabs
| Tab | Icon | Component | Description |
|-----|------|-----------|-------------|
| Code | 📄 | CodeView | Read-only code viewer with syntax highlighting |
| Edit | ✏️ | FileEditor | Editable textarea with save to API |
| Terminal | >_ | TerminalPanel | Execute bash commands via API |
| Settings | ⚙ | ProviderConfig | API key inputs for OpenRouter/OpenAI/Anthropic/Ollama |

### Responsive Behavior
| Width | Sidebar | Right Panel |
|-------|---------|-------------|
| < 768px | Slide-out overlay (hamburger toggle) | Slide-out overlay (bottom toggle buttons) |
| 768px+ | Visible sidebar (200px) | Hidden (need responsive break) |
| 1024px+ | Visible sidebar (208px) | Visible panel (320px) |

---

## 5. VS Code Extension

### Package
- **Name**: `openply-vscode`
- **Version**: 0.1.0
- **Publisher**: openPly
- **VSIX**: `vscode/openply-vscode-0.1.0.vsix`

### Commands
| Command ID | Title | Behavior |
|------------|-------|----------|
| `openply.start` | openPly: Start in Terminal | Creates terminal, runs `npx openply` |
| `openply.chat` | openPly: Chat | Shows input box, runs `openply "prompt"` |
| `openply.explain` | openPly: Explain Selected Code | Gets selected text, pipes to openply |

### Installation
1. Download `.vsix` from GitHub Releases
2. VS Code → Extensions → ... → Install from VSIX
3. Or run: `code --install-extension openply-vscode-0.1.0.vsix`

---

## 6. API Server

**File**: `site/server.ts` | **Port**: 3001 | **Runtime**: tsx (TypeScript execution)

### Endpoints

#### POST /api/chat
Stream AI chat responses via Server-Sent Events.
```json
Request:  { "prompt": "string", "history": [{ "role": "user|assistant", "content": "string" }], "model": "string", "apiKey": "string" }
Response: data: { "content": "..." }  /  data: { "done": true }  /  data: { "error": "...", "details": "..." }
```

#### GET /api/files
List all project files recursively (excludes node_modules, dist, .git, .vscode).
```json
Response: { "files": ["src/index.ts", "package.json", ...] }
```

#### GET /api/files/{path}
Read a specific file's content. Path-traversal protected.
```json
Response: "file contents as text"
Error:    { "error": "Not found" } (404) / { "error": "Forbidden" } (403)
```

#### POST /api/write
Write content to a file. Path-traversal protected.
```json
Request:  { "path": "src/file.ts", "content": "file contents" }
Response: { "success": true, "path": "src/file.ts" }
```

#### POST /api/search
Grep search across the project. Tries ripgrep first, falls back to findstr (Windows) or grep (Unix).
```json
Request:  { "query": "search term" }
Response: { "results": ["file1.ts", "file2.ts", ...] }
```

#### POST /api/websearch
Search the web via DuckDuckGo HTML scraping.
```json
Request:  { "query": "search term" }
Response: { "results": "**Title**\nsnippet\nurl\n\n**Title2**\n..." }
```

#### POST /api/terminal
Execute a bash command (30s timeout, 1MB output limit).
```json
Request:  { "command": "ls -la" }
Response: { "output": "stdout here", "error": "stderr here (if any)" }
```

### Project Root
- Default: Parent directory of `site/`
- Override: `OPENPLY_ROOT` env var
- Config: `OPENPLY_ROOT` env or `--root` flag

### Privacy & Security
- All file operations are path-traversal protected (blocked if resolved path falls outside ROOT)
- API keys stored client-side in localStorage (never sent to server)
- AI calls go directly from server to OpenRouter/Ollama

---

## 7. State Management

**File**: `site/src/lib/store.tsx`
**Pattern**: React Context + useReducer
**Persistence**: localStorage for sessions and API keys

### State Shape
```ts
interface AppState {
  sessions: Session[]                // All user sessions
  activeSessionId: string | null     // Currently active session
  rightPanel: 'code'|'editor'|'terminal'|'settings'
  activeFile: string | null          // Currently viewed file
  fileContent: string | null         // Content of viewed file
  files: string[]                    // Project file list
  providers: { openrouter: string; openai: string; anthropic: string }
  loading: boolean                   // Loading indicator
  todos: Todo[]                      // Task list
  searchResults: string[]            // Grep search results
  webResults: string                 // Web search results
  diagnostics: Diagnostics           // Session diagnostics
}
```

### Session Model
```ts
interface Session {
  id: string             // crypto.randomUUID()
  name: string           // "openplysession N"
  messages: Message[]    // Chat history
  checkpoints: Message[][]  // Auto-saved states for undo
  agent: string          // Current agent
  mode: 'plan' | 'build' // Read-only or read-write
  autoAccept: boolean    // YOLO mode
  model: string          // Selected model ID
  createdAt: number      // Date.now()
  updatedAt: number
}
```

### Core Functions
| Function | Description |
|----------|-------------|
| `createSession()` | Creates new session with defaults |
| `deleteSession(id)` | Deletes session and all messages |
| `renameSession(id, name)` | Renames session |
| `sendChat(prompt)` | Auto-checkpoint → user msg → stream AI → checkpoint |
| `addMessage(msg)` | Appends message to active session |
| `updateMessage(id, content)` | Updates message content (for streaming) |
| `addCheckpoint(label?)` | Saves current messages as checkpoint |
| `undoToCheckpoint()` | Restores last checkpoint |
| `searchCode(query)` | Grep search via API |
| `webSearch(query)` | Web search via API |

---

## 8. Components

### Marketing Site (16 components)
All in `site/src/components/` — used by `pages/Home.tsx`

| Component | Purpose |
|-----------|---------|
| `Navbar` | Fixed top nav with links, mobile hamburger, CTA |
| `Hero` | Hero section with gradient text + 3 CTAs |
| `TerminalDemo` | Animated terminal mockup |
| `Features` | 12 feature cards grid |
| `HowItWorks` | 4-step process (Explore→Plan→Build→Design) |
| `Models` | 9 supported model cards |
| `Compare` | Pricing comparison (Claude Code vs openPly vs Cline) |
| `VSCodeInstall` | VS Code extension download + install instructions |
| `Contact` | Email contact section |
| `CTA` | Final call-to-action |
| `Footer` | Footer with MIT license + email |
| `DesignPartner` | Modal with 17 design mode buttons (also used in IDE) |

### Web IDE Components (9 components)
All in `site/src/components/` — used by `pages/AppPage.tsx`

| Component | Purpose |
|-----------|---------|
| `SessionSidebar` | Session list + file tree, CRUD operations |
| `AgentBar` | Plan/Build toggle, agent dropdown, YOLO toggle |
| `ChatPanel` | Main chat: markdown rendering, streaming, slash commands |
| `ToolBar` | Expandable search/web/todo/shortcuts panel |
| `StatusBar` | Bottom bar showing mode, model, message/file counts |
| `CodeView` | Read-only code viewer |
| `FileEditor` | Editable textarea with save |
| `TerminalPanel` | Web terminal |
| `ProviderConfig` | API key inputs |

---

## 9. Slash Commands

Available in the web IDE ChatPanel. Type `/` to trigger autocomplete.

| Command | Usage | Description |
|---------|-------|-------------|
| `/help` | `/help` | Show grouped command list |
| `/model` | `/model deepseek/deepseek-v4-flash` | Set session model |
| `/agent` | `/agent editor` | Set session agent |
| `/mode` | `/mode plan` or `/mode build` | Toggle mode |
| `/clear` | `/clear` | Clear all messages |
| `/session` | `/session` | Show session info (name, agent, mode, model, messages, checkpoints) |
| `/checkpoint` | `/checkpoint` | Save manual checkpoint |
| `/undo` | `/undo` | Restore last checkpoint |
| `/search` | `/search function foo` | Grep search codebase |
| `/web` | `/web react hooks tutorial` | Search the web |
| `/todo` | `/todo fix login bug` | Add todo item |
| `/design` | `/design` | Open Design Partner modal |
| `/share` | `/share` | Copy session link to clipboard |
| `/export` | `/export` | Download session as .md file |
| `/diagnostics` | `/diagnostics` | Show full diagnostics |

### Keyboard Shortcuts
| Key | Action |
|-----|--------|
| `Esc` | Undo to last checkpoint |
| `Ctrl+K` | Clear chat |
| `Ctrl+Shift+P` | Toggle Plan/Build mode |
| `Ctrl+Enter` | Send message (with newline) |
| `/` | Open slash command menu |
| `Tab` | Autocomplete current slash command |
| `↑` | Recall last message |

---

## 10. Design Partner

**Component**: `DesignPartner.tsx`
**Trigger**: `/design` slash command in chat

17 design modes:

| Mode | Description |
|------|-------------|
| **Audit** | Analyze current design for issues |
| **Recolor** | Generate a new color palette |
| **Redesign** | Full UI redesign |
| **Typeset** | Typography system |
| **Accessibility** | WCAG compliance audit |
| **Responsive** | Responsive layout suggestions |
| **Dark Mode** | Dark theme |
| **Motion** | Animation suggestions |
| **Tokens** | Design token extraction |
| **Create** | Create new component |
| **Finish** | Polish and finalize |
| **Grid** | Layout grid system |
| **Spacing** | Spacing/rhythm system |
| **Icon** | Icon set suggestions |
| **Shadow** | Elevation/shadow system |
| **Border** | Border/radius system |
| **Export** | Export design as CSS/JSON |

---

## 11. Configuration

### CLI Config
**File**: `~/.config/openply/config.json` (via `conf` npm package)
```ts
interface Config {
  model: string;           // Default: "deepseek/deepseek-v4-flash"
  localModel: string;      // Default: "deepseek-coder-v2"
  mode: 'local'|'cloud'|'auto';  // Default: "auto"
  theme: 'dark'|'light';   // Default: "dark"
  adEnabled: boolean;      // Default: true
  openRouterKey?: string;  // Optional
}
```
**Commands**:
- `openply config` — view current config
- `openply config --set model=anthropic/claude-sonnet-4-20250514` — update
- `openply config --reset` — reset to defaults
- `openply config --show-models` — list available models

### Web IDE Config
- **Provider keys**: Stored in `localStorage` keys: `openrouter_key`, `openai_key`, `anthropic_key`
- **Sessions**: Stored in `localStorage` key: `openply_sessions`
- **Set via**: ProviderConfig component (Settings tab in right panel)

---

## 12. Build & Deploy

### CLI Package
```bash
cd openPly
npm run build          # Builds dist/index.js + dist/cli/index.js
npm publish            # Publish to npm (requires --otp for 2FA)
npm install -g openply # Install globally
```

### Web IDE & Landing Page
```bash
cd openPly/site
npm run dev            # Vite dev server (port 5173)
npm run server         # Express API server (port 3001)
npm run dev:all        # Both concurrently
npm run build          # Production build to site/dist/
```

### Netlify Deploy
- **Base directory**: `site/`
- **Build command**: `npm run build`
- **Publish directory**: `dist/`
- **SPA routing**: `public/_redirects` → `/* /index.html 200`
- **Primary URL**: https://openply.pages.dev (Cloudflare Pages)
- **Fallback URL**: https://openply26.netlify.app (Netlify — credits reset Aug 21)
- **Backend API**: https://openply.onrender.com (Render)

### VS Code Extension
```bash
cd openPly/vscode
npm install -g @vscode/vsce
vsce package           # Creates .vsix file
vsce publish           # Publish to marketplace (blocked by undici bug on Node 22)
```

---

## 13. Environment Variables

| Variable | Scope | Description |
|----------|-------|-------------|
| `PORT` | Server | API server port (default: 3001) |
| `OPENPLY_ROOT` | Server | Project root path (default: parent of site/) |
| `OPENROUTER_KEY` | Server | Default OpenRouter API key |
| `OPENPLY_NO_ADS` | CLI | Disable sponsor ads |
| `OPENAI_KEY` | Web IDE | OpenAI API key (stored in localStorage) |
| `ANTHROPIC_KEY` | Web IDE | Anthropic API key (stored in localStorage) |

---

## 14. Project Structure

```
openPly/
├── package.json              # Root: CLI package config
├── tsconfig.json             # Root: TypeScript config
├── README.md                 # Project README
├── DOCUMENTATION.md          # This file
├── LICENSE                   # MIT License
├── .gitignore
├── netlify.toml              # Netlify deploy config
├── agents/                   # Placeholder for custom agents
├── dist/                     # Built CLI output (gitignored)
├── logo/                     # Logo assets
│   └── openPly logo.png
├── logo.svg                  # Square logo
├── logo-horizontal.svg       # Horizontal logo
│
├── src/                      # CLI source code
│   ├── index.ts              # Library entry point
│   ├── types/
│   │   └── index.ts          # All TypeScript interfaces
│   ├── cli/
│   │   ├── index.ts          # CLI entry (commander)
│   │   └── repl.ts           # Interactive REPL
│   ├── llm/
│   │   ├── client.ts         # LLMClient (OpenRouter/Ollama)
│   │   ├── models.ts         # Model definitions
│   │   └── prompts.ts        # System prompt templates
│   ├── agent/
│   │   ├── orchestrator.ts   # Agent mesh engine
│   │   └── loader.ts         # Custom agent loader
│   ├── fs/
│   │   ├── reader.ts         # File reading
│   │   ├── writer.ts         # File writing
│   │   └── search.ts         # Glob/grep search
│   ├── bash/
│   │   └── executor.ts       # Shell command execution
│   ├── storage/
│   │   ├── config.ts         # Config persistence (conf)
│   │   └── history.ts        # Session history (SQLite)
│   ├── utils/
│   │   ├── display.ts        # Colored console output
│   │   ├── diff.ts           # Diff generation
│   │   └── splash.ts         # Splash screen + animations
│   ├── ad/
│   │   └── engine.ts         # Sponsor ad engine
│   ├── registry/
│   │   └── registry.ts       # Built-in agent registry
│   ├── init/
│   │   └── scaffold.ts       # Project scaffolding
│   ├── knowledge/
│   │   └── loader.ts         # Knowledge file loader
│   └── web-builder/
│       └── generator.ts      # Web app generator
│
├── site/                     # Web IDE + Landing Page
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── index.html
│   ├── server.ts             # Express API server
│   ├── public/
│   │   ├── _redirects        # Netlify SPA redirect
│   │   └── logo.svg
│   ├── dist/                 # Vite build output
│   └── src/
│       ├── main.tsx          # React entry point
│       ├── App.tsx           # Router (Home | App)
│       ├── index.css         # Tailwind + custom theme
│       ├── lib/
│       │   ├── store.tsx     # State management
│       │   └── api.ts        # API client
│       ├── pages/
│       │   ├── Home.tsx      # Marketing landing page
│       │   └── AppPage.tsx   # Web IDE layout
│       └── components/
│           ├── Navbar.tsx
│           ├── Hero.tsx
│           ├── TerminalDemo.tsx
│           ├── Features.tsx
│           ├── HowItWorks.tsx
│           ├── Models.tsx
│           ├── Compare.tsx
│           ├── VSCodeInstall.tsx
│           ├── Contact.tsx
│           ├── CTA.tsx
│           ├── Footer.tsx
│           ├── ChatPanel.tsx
│           ├── AgentBar.tsx
│           ├── ToolBar.tsx
│           ├── StatusBar.tsx
│           ├── SessionSidebar.tsx
│           ├── FileTree.tsx
│           ├── CodeView.tsx
│           ├── FileEditor.tsx
│           ├── TerminalPanel.tsx
│           ├── ProviderConfig.tsx
│           ├── DesignPartner.tsx
│           └── SettingsPanel.tsx
│
└── vscode/                   # VS Code Extension
    ├── package.json
    ├── extension.ts          # Extension entry
    ├── CHANGELOG.md
    └── openply-vscode-0.1.0.vsix
```
