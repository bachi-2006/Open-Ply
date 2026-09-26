<p align="center">
  <img src="logo-horizontal.svg" alt="openPly" width="500">
</p>

<p align="center">
  <strong>Free, local-first AI coding assistant with a full web IDE.</strong>
  <br>
  Multi-session &middot; Multi-agent &middot; Design Partner &middot; Terminal &middot; File Editor &middot; Slash Commands
</p>

<p align="center">
  <a href="https://openply.pages.dev">Web App</a> &middot;
  <a href="#install">Install</a> &middot;
  <a href="#features">Features</a> &middot;
  <a href="#cli">CLI</a> &middot;
  <a href="#web-app">Web App</a> &middot;
  <a href="#vs-code">VS Code</a> &middot;
  <a href="#changelog">Changelog</a> &middot;
  <a href="#license">License</a>
</p>

---

openPly is an open-source AI coding assistant available as both a **CLI** and a **web IDE**. It combines a multi-agent architecture with a full-featured web interface — sessions, agents, design partner, terminal, file editor, and more. Free, private, and open (MIT).

## Install

```bash
npm install -g openply
```

```bash
# Start CLI
cd your-project
openply
```

```bash
# Open web IDE
openply web
```

Or just use the [hosted web app](https://openply.pages.dev/app) — no install needed.

## New in v0.2.0

- **Function calling** — agents use structured tool calls instead of JSON parsing for more reliable execution
- **Retry & fallback** — automatic retry with exponential backoff, configurable model fallback chains
- **Anthropic direct** — native Anthropic SDK support (not just via OpenRouter)
- **Security hardening** — input sanitization, path traversal protection, encrypted API keys, audit logging
- **Pipe support** — `cat file.ts | openply "explain this"` for shell integration
- **Non-interactive mode** — `openply exec "prompt"` and `--json` for CI/CD
- **Session resume** — `openply resume <id>` to continue past conversations
- **Git integration** — commit, stage, view status from the web IDE sidebar
- **Diff viewer** — proper side-by-side diffs in the web IDE
- **VS Code extension** — webview chat panel, code actions, diagnostics fix, model/mode switching
- **CI/CD** — automated build, test, publish, and deploy via GitHub Actions
- **Audit logging** — all file writes and terminal commands logged to `~/.config/openply/audit/`

## Web App

The openPly web IDE (`/app`) gives you everything:

### Layout
```
┌─ Top Bar ─────────────────────────────────────────────┐
├─ Agent Bar: [Plan|Build] | Agent ▼ | [YOLO] | model ──┤
├─ Tool Bar: [Search] [Web] [Todo] [Shortcuts] ─────────┤
├──────┬──────────────────────┬─────────────────────────┤
│      │                      │ Code | Edit | Git | Term │
│ Sess │     Chat Panel       │                         │
│ ions │  (markdown, slash    │   (right panel tabs)    │
│ +    │   cmds, streaming)   │                         │
│ File │                      │                         │
├──────┴──────────────────────┴─────────────────────────┤
├─ Status Bar: mode | model | msgs | files | 📊 ────────┤
```

### Key Features

| Feature | Description |
|---|---|
| **Multi-session** | Create, rename, switch sessions. Independent history per session. Auto-persisted to browser. |
| **5 Agents** | Planner (read-only), Editor, Explorer, Debugger, Reviewer. Switch with dropdown. |
| **Plan/Build modes** | Plan = read-only analysis. Build = full read/write/exec. Toggle instantly. |
| **Auto-accept (YOLO)** | Skip confirmations for rapid implementation. One-click toggle. |
| **17 Design modes** | `/design` — audit, recolor, redesign, typeset, accessibility, responsive, dark mode, motion, tokens, create, finish, and more. |
| **Git sidebar** | Stage, commit, view branch status, see diffs — all from the IDE. |
| **Diff viewer** | Proper line-by-line diffs with additions/deletions highlighted. |
| **Grep search** | `/search` or toolbar — ripgrep/findstr across your codebase. |
| **Web search** | `/web` or toolbar — search the web from within the IDE. |
| **Todo tracking** | `/todo` or toolbar — add, check, and manage tasks. |
| **Code viewer** | Read-only code view with syntax highlighting. |
| **File editor** | Edit files directly in the browser and save through the API. |
| **Terminal** | Run bash commands with real-time output. |
| **Checkpoints & Undo** | Auto-checkpoints before every response. `/undo` or `Esc` to rewind. |
| **Slash commands** | `/help`, `/model`, `/agent`, `/mode`, `/search`, `/web`, `/todo`, `/checkpoint`, `/undo`, `/design`, `/share`, `/export`, `/diagnostics` — autocomplete with Tab. |
| **Multi-provider** | OpenRouter (200+ models), OpenAI, Anthropic, Ollama local. Switch per session. |
| **Share & Export** | `/share` copies a shareable link. `/export` downloads as Markdown. |
| **Keyboard shortcuts** | `Esc`=undo, `Ctrl+K`=clear chat, `Ctrl+Shift+P`=toggle plan/build. |

### Slash Commands

| Command | Description |
|---|---|
| `/help` | Show all commands |
| `/model <name>` | Switch model |
| `/agent <name>` | Switch agent (planner/editor/explorer/debugger/reviewer) |
| `/mode <plan\|build>` | Switch mode |
| `/search <query>` | Grep search codebase |
| `/web <query>` | Search the web |
| `/todo <task>` | Add a todo |
| `/checkpoint` | Save a checkpoint |
| `/undo` | Undo to last checkpoint |
| `/design` | Open Design Partner (17 modes) |
| `/share` | Copy share link |
| `/export` | Export as Markdown |
| `/clear` | Clear chat |
| `/session` | Show session info |
| `/diagnostics` | Show full diagnostics |

## Design Partner

17 modes for design system management:

| Mode | Description |
|---|---|
| `audit` | Scan UI for issues, score, and prioritize |
| `checkup` | Traffic-light scores for layout, color, typography |
| `smell` | Detect visual inconsistencies |
| `recolor` | Build OKLCH color system with semantic roles |
| `typeset` | Typography scale, hierarchy, rhythm |
| `spacing` | Consistent spacing and layout grid |
| `icons` | Icon audit and consistency check |
| `redesign` | Complete visual transformation |
| `relayout` | Reorganize component tree and layout |
| `finish` | Final pre-ship polish and hardening |
| `create` | Design new page from brief |
| `access` | WCAG accessibility audit and fixes |
| `responsive` | Responsive design review |
| `dark` | Dark mode implementation |
| `motion` | Animation audit and performance |
| `tokens` | Extract patterns into design tokens |
| `review` | Full design review with feedback |

## CLI

```bash
openply                          # Start interactive session
openply "prompt"                 # Run a single prompt
cat file.ts | openply "explain"  # Pipe input support
openply exec "prompt"            # Non-interactive (exit code 0/1)
openply --json "prompt"          # JSON output for scripting
openply resume <session-id>      # Resume a past session
openply web                      # Open web IDE
openply web "<desc>" --preview   # Build a web app from description
openply agents                   # List built-in agents
openply config                   # View/update configuration
openply history                  # Browse past sessions
```

### CLI Slash Commands

| Command | Description |
|---|---|
| `/help` | Show help |
| `/init` | Create knowledge.md + .agents/ |
| `/bash <cmd>` | Run a terminal command |
| `/model` | List/switch models |
| `/config` | Show configuration |
| `/exit` | Quit |

### CLI Built-in Agents

Use `@AgentName` in prompts:
- `@git-committer` — Create meaningful git commits
- `@debugger` — Analyze and fix bugs
- `@refactorer` — Refactor code for maintainability
- `@documenter` — Generate documentation
- `@tester` — Write and run tests

## VS Code Extension

### Commands

| Command | Shortcut | Description |
|---|---|---|
| openPly: Start in Terminal | — | Launch openPly in terminal |
| openPly: Chat | `Ctrl+Shift+P Ctrl+Shift+O` | Quick chat input |
| openPly: Open Chat Panel | `Ctrl+Shift+P Ctrl+Shift+C` | Webview chat panel |
| openPly: Explain Selected Code | `Ctrl+Shift+P Ctrl+Shift+E` | Explain highlighted code |
| openPly: Refactor Selected Code | — | Refactor with instruction |
| openPly: Add Tests for File | — | Generate tests |
| openPly: Fix All Issues | — | Fix diagnostics |
| openPly: Toggle Plan/Build | `Ctrl+Shift+P Ctrl+Shift+M` | Switch mode |
| openPly: Select Model | — | Pick model from list |

### Code Actions

Right-click selected code for:
- **Explain this code** — get a detailed explanation
- **Refactor this code** — provide refactoring instructions
- **Fix all issues** — auto-fix diagnostics

### Installation

1. Download `.vsix` from GitHub Releases
2. VS Code > Extensions > ... > Install from VSIX
3. Or run: `code --install-extension openply-vscode-0.2.0.vsix`

## Models

### Cloud (OpenRouter)
DeepSeek V4 Pro/Flash, MiMo 2.5 Pro, Kimi K2.7 Code, MiniMax M3, GPT-4o, Claude Sonnet 4, and 200+ more.

### Cloud (Direct)
Anthropic Claude models via native SDK.

### Local (Ollama)
Llama 3.2, CodeLlama, Qwen 2.5 Coder, DeepSeek Coder, Mistral, and any Ollama model.

### Bring Your Own Key
OpenAI, Anthropic — configure in the web app Settings panel or CLI.

## MCP Server

Use openPly as a tool in Claude Desktop, Cursor, or any MCP client:

```bash
# Add to Claude Desktop config
{
  "mcpServers": {
    "openply": {
      "command": "npx",
      "args": ["-y", "@openply/mcp"],
      "env": { "OPENROUTER_API_KEY": "your-key" }
    }
  }
}
```

Available tools: `openply_chat`, `openply_read_file`, `openply_search`, `openply_run_command`, `openply_agents`.

## Plugins

Extend openPly with third-party plugins:

```bash
# Create a plugin
openply plugin create my-plugin

# List plugins
openply plugin list

# Install an npm plugin
npm install openply-plugin-docker
```

Plugins can add custom agents, tools, and lifecycle hooks. See [packages/mcp/README.md](packages/mcp/README.md) for details.

## Architecture

openPly uses **PlyMesh** — a mesh of specialized agents:

```
┌─────────────┐     ┌─────────────┐
│ File Finder │────▶│   Planner   │
│ (scans repo)│     │ (analyzes)  │
└─────────────┘     └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
       ┌──────────┐ ┌──────────┐ ┌──────────┐
       │  Editor  │ │   Bash   │ │  Search  │
       │(edits fs)│ │(commands)│ │(grep/glob)│
       └────┬─────┘ └──────────┘ └──────────┘
            ▼
       ┌──────────┐
       │ Reviewer │
       │(validates)│
       └──────────┘
```

## Security

- **Input sanitization** — all user inputs are sanitized before processing
- **Path traversal protection** — file operations blocked if resolved path is outside project root
- **Shell command filtering** — dangerous commands blocked (rm -rf /, curl|sh, etc.)
- **Encrypted API keys** — stored with AES-256-GCM encryption
- **Audit logging** — all file writes and commands logged to `~/.config/openply/audit/`
- **API keys stored client-side** — never sent to openPly servers

## SDK

```bash
npm install openply
```

```typescript
import { Orchestrator, LLMClient } from 'openply'

const llm = new LLMClient('deepseek/deepseek-v4-flash', apiKey, {
  provider: 'openrouter',
  fallbackChain: ['minimax/minimax-m2'],
  retry: { maxRetries: 3 },
})
const orchestrator = new Orchestrator(llm, { cwd: '/project', files: [], prompt: '', history: [], config })
await orchestrator.init()
const result = await orchestrator.run('Add error handling to all API endpoints')
```

## Changelog

### v0.3.0 (2026-07-24)
- **Monorepo** — Turborepo workspace: `packages/core`, `packages/cli`, `packages/mcp`
- **MCP server** — expose openPly as tools for Claude Desktop, Cursor, Windsurf (`npx @openply/mcp`)
- **Plugin system** — npm plugins (`openply-plugin-*`), `.openply/plugins/`, tools/agents/hooks API
- **Collaborative editing** — WebSocket server, multi-user sessions, cursor presence, live chat
- **Plugin CLI** — `openply plugin create`, `openply plugin list`, `openply plugin info`
- **Shared core** — `@openply/core` package with types, LLM client, orchestrator, security

### v0.2.0 (2026-07-24)
- Function calling support for more reliable agent execution
- Retry with exponential backoff and model fallback chains
- Anthropic direct SDK support
- Security hardening: input sanitization, path traversal protection, encrypted API keys, audit logging
- Pipe support in CLI
- Non-interactive exec mode and --json output
- Session resume command
- Git integration in web IDE (stage, commit, status)
- Diff viewer component
- VS Code extension: webview chat, code actions, diagnostics fix, model/mode switching
- CI/CD with GitHub Actions
- Health check endpoint

### v0.1.0 (2026-07-01)
- Initial release
- CLI with REPL and multi-agent orchestrator
- Web IDE with sessions, chat, file editor, terminal
- VS Code extension (basic)
- 17 Design Partner modes
- OpenRouter + Ollama model support
- Published on npm

## License

MIT
