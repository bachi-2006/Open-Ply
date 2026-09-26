import { createInterface } from 'readline'
import { Config, Message, LLMClient, Orchestrator, getAd, createSession, addMessage, getMessages, findProjectFiles, info, success, warn, error, renderAd, dim, runBash, getAvailableModels, scaffoldProject, showSplash, showProcessingAnimation, discoverSkills, renderSkillList, mcpClient } from '@openply/core'
import chalk from 'chalk'

const HELP_TEXT = `
openPly Commands:
  /help             Show this help
  /new              Start a new session
  /history          Browse past sessions
  /mode <plan|build> Switch between planning and building
  /bash <cmd>       Run a terminal command
  /init             Create knowledge.md + .agents/ in current project
  /config           Show current config
  /model            Switch model
  /skills           List available skills (SKILL.md)
  /mcp              Show MCP server tools
  /exit             Quit

Use @AgentName to invoke a custom agent from .agents/
Type while openPly works to steer it mid-task.

Just type what you want and openPly will do it.
`

export async function startRepl(config: Config, initialPrompt?: string, _session?: unknown, version?: string): Promise<void> {
  const sessionId = createSession('openPly session')
  const history: Message[] = []
  let busy = false
  let currentOrch: Orchestrator | null = null
  let currentMode: 'plan' | 'build' = 'plan'

  await showSplash(config.adEnabled)

  info(`v${version || '0.4.0'} · ${config.mode === 'local' ? 'local mode' : config.mode === 'cloud' ? 'cloud mode' : 'auto mode'}`)
  info('type /help for commands')

  if (initialPrompt) {
    await processPrompt(initialPrompt, config, history, sessionId, orch => { currentOrch = orch }, currentMode)
    return
  }

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: () => chalk.cyan(`(${currentMode}) ply> `),
  })

  rl.on('line', async (line: string) => {
    const input = line.trim()
    if (!input) { rl.prompt(); return }

    if (busy && currentOrch && !input.startsWith('/')) {
      currentOrch.steer(input)
      return
    }
    if (busy) {
      warn('Busy — wait for the current task or type a steering message')
      return
    }

    if (input.startsWith('/')) {
      handleCommand(input, rl, config, history, sessionId, version || '0.4.0', () => {
        busy = false;
        currentOrch = null;
        rl.prompt();
      }, (newMode) => {
        currentMode = newMode;
        rl.setPrompt(chalk.cyan(`(${currentMode}) ply> `));
      })
      return
    }

    busy = true
    await processPrompt(input, config, history, sessionId, orch => { currentOrch = orch }, currentMode)
    busy = false
    currentOrch = null
    rl.prompt()
  })

  rl.prompt()
}

async function processPrompt(prompt: string, config: Config, history: Message[], sessionId: string, onOrchestrator?: (o: Orchestrator) => void, mode: 'plan' | 'build' = 'plan'): Promise<void> {
  const cwd = process.cwd()
  addMessage(sessionId, { role: 'user', content: prompt, timestamp: Date.now() })
  history.push({ role: 'user', content: prompt, timestamp: Date.now() })

  const llm = createLocalOrCloudLLM(config)
  if (!llm) return

  const context = { cwd, files: await findProjectFiles(cwd), prompt, history, config, mode }
  const orchestrator = new Orchestrator(llm, context)
  onOrchestrator?.(orchestrator)
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

function createLocalOrCloudLLM(config: Config): LLMClient | null {
  const groqKey = config.groqKey || process.env.GROQ_API_KEY
  const openRouterKey = config.openRouterKey || process.env.OPENROUTER_API_KEY

  if (config.mode === 'local') {
    return LLMClient.createLocal()
  }

  if (config.mode === 'auto') {
    if (groqKey) return LLMClient.createGroq(groqKey)
    if (openRouterKey) {
      return new LLMClient(config.model, openRouterKey, {
        provider: 'openrouter',
        fallbackChain: config.fallbackModels || [],
      })
    }
    return LLMClient.createHosted()
  }

  if (groqKey) return LLMClient.createGroq(groqKey)
  if (openRouterKey) {
    return new LLMClient(config.model, openRouterKey, {
      provider: 'openrouter',
      fallbackChain: config.fallbackModels || [],
    })
  }
  return LLMClient.createHosted()
}

function handleCommand(input: string, rl: any, config: Config, history: Message[], sessionId: string, version: string, onNew: () => void, onModeChange: (mode: 'plan' | 'build') => void): void {
  const [cmd, ...args] = input.slice(1).split(' ')

  switch (cmd) {
    case 'help':
      console.log(HELP_TEXT)
      break
    case 'mode': {
      const mode = args[0] as 'plan' | 'build'
      if (mode === 'plan' || mode === 'build') {
        info(`Switched to ${mode} mode`)
        onModeChange(mode)
      } else {
        warn('Usage: /mode <plan|build>')
      }
      break
    }
    case 'exit':
    case 'quit':
      mcpClient.disconnect()
      info('Goodbye!')
      process.exit(0)
    case 'new':
      info('Starting new session...')
      mcpClient.disconnect()
      rl.close()
      onNew()
      startRepl(config, undefined, undefined, version)
      return
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
      models.forEach((m, i) => console.log(`  ${i + 1}. ${m.id} — ${m.displayName}`))
      console.log(`\nCurrent: ${config.model}\nSwitch: openply config --set model=<id>`)
      break
    }
    case 'skills': {
      const skills = discoverSkills(process.cwd())
      console.log(`\nSkills:\n${renderSkillList(skills)}`)
      break
    }
    case 'mcp': {
      const tools = mcpClient.getTools()
      if (!mcpClient.isConnected()) {
        warn('MCP not connected. Add servers to .openply/mcp.json:')
        console.log('  { "servers": { "name": { "command": "npx", "args": ["-y", "@some/mcp-server"] } } }')
      } else {
        console.log(`\nMCP tools (${tools.length}):`)
        tools.forEach(t => console.log(`  ${t.name} — ${t.description}`))
      }
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
