#!/usr/bin/env node
import { Command } from 'commander'
import * as fs from 'fs'
import * as path from 'path'
import { startRepl } from './repl'
import { getConfig, updateConfig, resetConfig } from '../storage/config'
import { getSessions, deleteSession, getSession } from '../storage/history'
import { getAvailableModels } from '../llm/models'
import { generateApp, startPreview } from '../web-builder/generator'
import { LLMClient } from '../llm/client'
import { getBuiltinAgents, formatAgentList } from '../registry/registry'

const VERSION = '0.2.0'

function readStdinSync(): string {
  if (process.stdin.isTTY) return ''
  const chunks: Buffer[] = []
  // Synchronous read for pipe support
  const fd = fs.openSync('/dev/stdin', 'r')
  const buf = Buffer.alloc(65536)
  let n: number
  while ((n = fs.readSync(fd, buf, 0, buf.length, null)) > 0) {
    chunks.push(buf.subarray(0, n))
  }
  fs.closeSync(fd)
  return Buffer.concat(chunks).toString('utf-8')
}

const program = new Command()

program
  .name('openply')
  .description('openPly — free, local-first AI coding assistant')
  .version(VERSION)
  .argument('[prompt]', 'Prompt to execute (starts interactive session if empty)')
  .option('--model <model>', 'Specify model to use')
  .option('--local', 'Force local-only mode')
  .option('--no-ads', 'Disable ads')
  .option('--json', 'Output as JSON (for scripting)')
  .action(async (prompt: string | undefined, opts: { model?: string; local?: boolean; ads?: boolean; json?: boolean }) => {
    const config = getConfig()

    if (opts.model) config.model = opts.model
    if (opts.local) config.mode = 'local'
    if (opts.ads === false) config.adEnabled = false

    // Pipe support: cat file.ts | openply "explain this"
    const pipedInput = readStdinSync()
    if (pipedInput && prompt) {
      prompt = `${prompt}\n\n--- Piped input ---\n${pipedInput}`
    } else if (pipedInput && !prompt) {
      prompt = pipedInput
    }

    if (opts.json) {
      // Non-interactive JSON output mode
      if (!prompt) {
        console.error('Error: --json requires a prompt argument')
        process.exit(1)
      }
      const apiKey = config.openRouterKey || process.env.OPENROUTER_API_KEY
      if (!apiKey) {
        console.error('Error: API key required. Run `openply config --set openRouterKey=<key>`')
        process.exit(1)
      }
      const llm = new LLMClient(config.model, apiKey, { provider: 'openrouter' })
      const { Orchestrator } = await import('../agent/orchestrator')
      const orch = new Orchestrator(llm, {
        cwd: process.cwd(),
        files: [],
        prompt,
        history: [],
        config,
      })
      await orch.init()
      const result = await orch.run(prompt)
      console.log(JSON.stringify({
        success: true,
        edits: result.edits.length,
        review: result.review,
        model: config.model,
      }, null, 2))
      process.exit(result.review?.approved ? 0 : 1)
    }

    await startRepl(config, prompt)
  })

program
  .command('exec')
  .description('Non-interactive single-shot execution (returns exit code)')
  .argument('<prompt>', 'Prompt to execute')
  .option('--model <model>', 'Specify model to use')
  .option('--local', 'Force local-only mode')
  .action(async (prompt: string, opts: { model?: string; local?: boolean }) => {
    const config = getConfig()
    if (opts.model) config.model = opts.model
    if (opts.local) config.mode = 'local'

    const apiKey = config.openRouterKey || process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      console.error('Error: API key required. Run `openply config --set openRouterKey=<key>`')
      process.exit(1)
    }

    const llm = new LLMClient(config.model, apiKey, { provider: 'openrouter' })
    const { Orchestrator } = await import('../agent/orchestrator')
    const orch = new Orchestrator(llm, {
      cwd: process.cwd(),
      files: [],
      prompt,
      history: [],
      config,
    })
    await orch.init()
    const result = await orch.run(prompt)
    process.exit(result.review?.approved ? 0 : 1)
  })

program
  .command('resume')
  .description('Resume a past session')
  .argument('<session-id>', 'Session ID to resume')
  .action(async (sessionId: string) => {
    const session = getSession(sessionId)
    if (!session) {
      console.error(`Session ${sessionId} not found. Use 'openply history' to list sessions.`)
      process.exit(1)
    }
    const config = getConfig()
    const prompt = session.messages.find(m => m.role === 'user')?.content
    await startRepl(config, prompt)
  })

program
  .command('config')
  .description('View or update configuration')
  .option('--set <key=value>', 'Set a config value')
  .option('--reset', 'Reset to defaults')
  .option('--show-models', 'Show available models')
  .action((opts: { set?: string; reset?: boolean; showModels?: boolean }) => {
    if (opts.reset) {
      resetConfig()
      console.log('Config reset to defaults')
      return
    }

    if (opts.showModels) {
      console.log('\nFull mode models:')
      getAvailableModels('full').forEach(m => console.log(`  ${m.id} — ${m.displayName}`))
      console.log('\nLimited mode models:')
      getAvailableModels('limited').forEach(m => console.log(`  ${m.id} — ${m.displayName}`))
      console.log('\nLocal models:')
      getAvailableModels('full').forEach(m => {
        if (m.provider === 'ollama') console.log(`  ${m.id} — ${m.displayName}`)
      })
      return
    }

    if (opts.set) {
      const [key, ...vals] = opts.set.split('=')
      const val = vals.join('=')
      updateConfig({ [key]: val } as any)
      console.log(`Set ${key} = ${val}`)
      return
    }

    console.log(JSON.stringify(getConfig(), null, 2))
  })

program
  .command('history')
  .description('Browse past sessions')
  .option('--delete <id>', 'Delete a session')
  .option('--json', 'Output as JSON')
  .action((opts: { delete?: string; json?: boolean }) => {
    if (opts.delete) {
      deleteSession(opts.delete)
      console.log(`Session ${opts.delete} deleted`)
      return
    }

    const sessions = getSessions()
    if (sessions.length === 0) {
      console.log('No past sessions')
      return
    }

    if (opts.json) {
      console.log(JSON.stringify(sessions, null, 2))
      return
    }

    console.log('\nPast sessions:')
    for (const s of sessions) {
      const date = new Date(s.createdAt).toLocaleDateString()
      console.log(`  ${s.id} — ${s.label || 'untitled'} (${date})`)
    }
  })

program
  .command('web')
  .description('Build a full-stack web app from a description')
  .argument('<description>', 'Describe the app you want to build')
  .option('--stack <stack>', 'App stack (react-express, nextjs, express-ejs, static-html)', 'react-express')
  .option('--preview', 'Start preview server after generating')
  .action(async (description: string, opts: { stack?: any; preview?: boolean }) => {
    const config = getConfig()
    const apiKey = config.openRouterKey || process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      console.error('OpenRouter API key required. Set OPENROUTER_API_KEY or run: openply config --set openRouterKey=<key>')
      return
    }

    const llm = new LLMClient(config.model, apiKey, { provider: 'openrouter' })
    const app = await generateApp(description, opts.stack || 'react-express', llm, process.cwd())

    console.log(`\nGenerated ${app.files.length} files in ${app.dir}`)
    app.files.slice(0, 10).forEach(f => console.log(`  ${f}`))

    if (opts.preview) {
      await startPreview(app)
    } else {
      console.log(`\nTo preview: cd ${app.dir} && ${app.devCommand}`)
    }
  })

program
  .command('agents')
  .description('List available built-in agents')
  .action(() => {
    const agents = getBuiltinAgents()
    console.log('\nBuilt-in agents:')
    console.log(formatAgentList(agents))
    console.log('\nUse @AgentName in your prompt to invoke an agent.')
    console.log('Custom agents go in .agents/ in your project root.')
  })

program.parse(process.argv)
