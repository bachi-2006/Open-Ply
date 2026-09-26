#!/usr/bin/env node
// openPly MCP Server
// Exposes openPly agents as tools via Model Context Protocol (MCP)
// Works with Claude Desktop, Cursor, Windsurf, and other MCP clients

import { createInterface } from 'readline'
import { Orchestrator, LLMClient, type Config } from '@openply/core'

const rl = createInterface({ input: process.stdin })

let orchestrator: Orchestrator | null = null
let llm: LLMClient | null = null

function getApiKey(): string | undefined {
  return process.env.OPENROUTER_API_KEY || process.env.OPENPLY_API_KEY
}

function getConfig(): Config {
  return {
    model: process.env.OPENPLY_MODEL || 'deepseek/deepseek-v4-flash',
    localModel: process.env.OPENPLY_LOCAL_MODEL || 'deepseek-coder-v2',
    mode: 'cloud',
    theme: 'dark',
    adEnabled: false,
  }
}

// --- MCP Protocol ---

interface MCPRequest {
  jsonrpc: '2.0'
  id: number | string
  method: string
  params?: any
}

function respond(id: number | string, result: any) {
  const msg = { jsonrpc: '2.0', id, result }
  process.stdout.write(JSON.stringify(msg) + '\n')
}

function respondError(id: number | string, code: number, message: string) {
  const msg = { jsonrpc: '2.0', id, error: { code, message } }
  process.stdout.write(JSON.stringify(msg) + '\n')
}

// --- Tool Definitions ---

const TOOLS = [
  {
    name: 'openply_chat',
    description: 'Send a prompt to openPly and get a response. Multi-agent orchestration with planning, editing, and review.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        prompt: { type: 'string', description: 'The coding task or question' },
        mode: { type: 'string', enum: ['plan', 'build'], description: 'Plan mode (read-only) or build mode (read-write). Default: build' },
        model: { type: 'string', description: 'Override model for this request' },
      },
      required: ['prompt'],
    },
  },
  {
    name: 'openply_read_file',
    description: 'Read a file from the project',
    inputSchema: {
      type: 'object' as const,
      properties: {
        path: { type: 'string', description: 'File path relative to project root' },
      },
      required: ['path'],
    },
  },
  {
    name: 'openply_search',
    description: 'Search for files or code patterns in the project',
    inputSchema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Glob pattern or grep regex' },
      },
      required: ['query'],
    },
  },
  {
    name: 'openply_run_command',
    description: 'Execute a shell command in the project',
    inputSchema: {
      type: 'object' as const,
      properties: {
        command: { type: 'string', description: 'Shell command to execute' },
      },
      required: ['command'],
    },
  },
  {
    name: 'openply_agents',
    description: 'List available agents and their capabilities',
    inputSchema: {
      type: 'object' as const,
      properties: {},
    },
  },
]

// --- Request Handler ---

async function handleRequest(req: MCPRequest) {
  switch (req.method) {
    case 'initialize':
      respond(req.id, {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: {
          name: 'openply',
          version: '0.3.0',
        },
      })
      break

    case 'notifications/initialized':
      // No response needed for notifications
      break

    case 'tools/list':
      respond(req.id, { tools: TOOLS })
      break

    case 'tools/call':
      await handleToolCall(req)
      break

    case 'ping':
      respond(req.id, {})
      break

    default:
      respondError(req.id, -32601, `Method not found: ${req.method}`)
  }
}

async function handleToolCall(req: MCPRequest) {
  const { name, arguments: args } = req.params
  const cwd = process.env.OPENPLY_CWD || process.cwd()

  // Initialize LLM if needed
  if (!llm && (name === 'openply_chat' || name === 'openply_agents')) {
    const apiKey = getApiKey()
    const config = getConfig()

    if (name === 'openply_chat' && !apiKey) {
      respondError(req.id, -32000, 'OPENROUTER_API_KEY or OPENPLY_API_KEY environment variable required')
      return
    }

    if (apiKey) {
      llm = new LLMClient(args?.model || config.model, apiKey, { provider: 'openrouter' })
      orchestrator = new Orchestrator(llm, {
        cwd,
        files: [],
        prompt: '',
        history: [],
        config,
        mode: args?.mode || 'build',
      })
      await orchestrator.init()
    }
  }

  try {
    switch (name) {
      case 'openply_chat': {
        if (!orchestrator) {
          respondError(req.id, -32000, 'No API key configured')
          return
        }
        const result = await orchestrator.run(args.prompt)
        const text = result.edits.length > 0
          ? `Completed. ${result.edits.length} file(s) modified.\n${result.edits.map(e => `- ${e.filePath}`).join('\n')}${result.review ? `\nReview: ${result.review.approved ? 'Approved' : 'Issues found'}` : ''}`
          : 'Task completed.'
        respond(req.id, { content: [{ type: 'text', text }] })
        break
      }

      case 'openply_read_file': {
        const fs = await import('fs/promises')
        const path = await import('path')
        const fullPath = path.resolve(cwd, args.path)
        const content = await fs.readFile(fullPath, 'utf-8')
        respond(req.id, { content: [{ type: 'text', text: content }] })
        break
      }

      case 'openply_search': {
        const { searchFiles } = await import('@openply/core')
        const results = await searchFiles(args.query, cwd)
        respond(req.id, {
          content: [{ type: 'text', text: results.length > 0 ? results.join('\n') : 'No results found.' }],
        })
        break
      }

      case 'openply_run_command': {
        const { runBash } = await import('@openply/core')
        const result = runBash(args.command, cwd, { audit: true })
        const text = result.blocked
          ? `Blocked: ${result.blockReason}`
          : `Exit code: ${result.exitCode}\n${result.stdout}\n${result.stderr}`.trim()
        respond(req.id, { content: [{ type: 'text', text }] })
        break
      }

      case 'openply_agents': {
        const { getBuiltinAgents } = await import('@openply/core')
        const agents = getBuiltinAgents()
        const text = agents.map(a => `- **${a.id}** (${a.displayName}): ${a.instructionsPrompt.slice(0, 120)}`).join('\n')
        respond(req.id, { content: [{ type: 'text', text: `Available agents:\n${text}` }] })
        break
      }

      default:
        respondError(req.id, -32601, `Unknown tool: ${name}`)
    }
  } catch (err: any) {
    respondError(req.id, -32000, err.message || 'Tool execution failed')
  }
}

// --- Main Loop ---

process.stderr.write('openPly MCP server starting...\n')

rl.on('line', async (line) => {
  try {
    const req: MCPRequest = JSON.parse(line)
    await handleRequest(req)
  } catch (err: any) {
    process.stderr.write(`Error: ${err.message}\n`)
  }
})

rl.on('close', () => {
  process.exit(0)
})
