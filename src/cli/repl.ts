import { createInterface } from 'readline'
import { Config, Message } from '../types'
import { LLMClient } from '../llm/client'
import { Orchestrator } from '../agent/orchestrator'
import { getAd } from '../ad/engine'
import { createSession, addMessage, getMessages } from '../storage/history'
import { findProjectFiles } from '../fs/search'
import { info, success, warn, error, renderAd, dim } from '../utils/display'
import { runBash } from '../bash/executor'
import { getAvailableModels } from '../llm/models'
import { scaffoldProject } from '../init/scaffold'
import { showSplash, showProcessingAnimation } from '../utils/splash'
import chalk from 'chalk'

const HELP_TEXT = `
openPly Commands:
  /help             Show this help
  /new              Start a new session
  /history          Browse past sessions
  /bash <cmd>       Run a terminal command
  /init             Create knowledge.md + .agents/ in current project
  /config           Show current config
  /model            Switch model
  /exit             Quit

Use @AgentName to invoke a custom agent from .agents/

Just type what you want and openPly will do it.
`

export async function startRepl(config: Config, initialPrompt?: string): Promise<void> {
  const sessionId = createSession('openPly session')
  const history: Message[] = []

  await showSplash(config.adEnabled)

  info(`v0.1.0 · ${config.mode === 'local' ? 'local mode' : config.mode === 'cloud' ? 'cloud mode' : 'auto mode'}`)
  info('type /help for commands')

  if (initialPrompt) {
    await processPrompt(initialPrompt, config, history, sessionId)
    return
  }

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: chalk.cyan('ply> '),
  })

  rl.prompt()

  for await (const line of rl) {
    const input = line.trim()
    if (!input) { rl.prompt(); continue }

    if (input.startsWith('/')) {
      handleCommand(input, rl, config, history, sessionId)
      continue
    }

    await processPrompt(input, config, history, sessionId)
    rl.prompt()
  }
}

async function processPrompt(prompt: string, config: Config, history: Message[], sessionId: string): Promise<void> {
  const cwd = process.cwd()
  addMessage(sessionId, { role: 'user', content: prompt, timestamp: Date.now() })
  history.push({ role: 'user', content: prompt, timestamp: Date.now() })

  let llm: LLMClient

  if (config.mode === 'local') {
    llm = LLMClient.createLocal()
    info('Using local model...')
  } else {
    const apiKey = config.openRouterKey || process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      warn('No API key found. Set OPENROUTER_API_KEY or use --local mode.')
      warn('For local mode, install Ollama and run: openply --local')
      history.push({ role: 'assistant', content: 'No API key configured.', timestamp: Date.now() })
      return
    }
    llm = new LLMClient(config.model, apiKey)
  }

  const context = { cwd, files: await findProjectFiles(cwd), prompt, history, config }
  const orchestrator = new Orchestrator(llm, context)
  await orchestrator.init()

  try {
    const result = await orchestrator.run(prompt)

    if (result.review && !result.review.approved) {
      warn('Review found issues:')
      result.review.issues.forEach(i => warn(`  - ${i}`))
    }

    if (result.edits.length > 0) {
      success(`${result.edits.length} file(s) edited`)
    }

    if (config.adEnabled) {
      const ad = getAd()
      if (ad) renderAd(ad.line)
    }
  } catch (err: any) {
    error(`Error: ${err.message}`)
  }
}

function handleCommand(input: string, rl: any, config: Config, history: Message[], sessionId: string): void {
  const [cmd, ...args] = input.slice(1).split(' ')

  switch (cmd) {
    case 'help':
      console.log(HELP_TEXT)
      break
    case 'exit':
    case 'quit':
      info('Goodbye!')
      process.exit(0)
    case 'new':
      info('Starting new session...')
      rl.close()
      startRepl(config)
      break
    case 'init':
      scaffoldProject(process.cwd())
      break
    case 'bash':
      if (!args.length) { warn('Usage: /bash <command>'); break }
      info(`Running: ${args.join(' ')}`)
      runBashCommand(args.join(' '))
      break
    case 'config':
      console.log(JSON.stringify(config, null, 2))
      break
    case 'model': {
      const models = getAvailableModels('full')
      console.log('\nAvailable models:')
      models.forEach((m, i) => console.log(`  ${i + 1}. ${m.id}`))
      break
    }
    default:
      warn(`Unknown command: /${cmd}. Type /help for commands.`)
  }

  rl.prompt()
}

function runBashCommand(command: string): void {
  const result = runBash(command, process.cwd())
  if (result.stdout) console.log(result.stdout)
  if (result.stderr) warn(result.stderr)
}
