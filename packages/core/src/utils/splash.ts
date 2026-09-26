import chalk from 'chalk'

const CYAN = chalk.hex('#22d3ee')
const AMBER = chalk.hex('#f59e0b')
const BLUE = chalk.hex('#38bdf8')
const DIM = chalk.hex('#64748b')
const WHITE = chalk.hex('#e2e8f0')

const LOGO_ASCII = `
${CYAN('██████╗ ██████╗ ███████╗███╗   ██╗██████╗ ██╗     ██╗   ██╗')}
${CYAN('██╔═══██╗██╔══██╗██╔════╝████╗  ██║██╔══██╗██║     ╚██╗ ██╔╝')}
${AMBER('██║   ██║██████╔╝█████╗  ██╔██╗ ██║██████╔╝██║      ╚████╔╝')}
${AMBER('██║   ██║██╔═══╝ ██╔══╝  ██║╚██╗██║██╔═══╝ ██║       ╚██╔╝')}
${BLUE('╚██████╔╝██║     ███████╗██║ ╚████║██║     ███████╗   ██║')}
${BLUE(' ╚═════╝ ╚═╝     ╚══════╝╚═╝  ╚═══╝╚═╝     ╚══════╝   ╚═╝')}
`

const TAGLINE = 'local-first ai coding assistant. your code stays yours.'

const AGENT_SPRITES = [
  { name: 'planner', color: CYAN, art: ' ◈ ' },
  { name: 'editor', color: AMBER, art: ' ◇ ' },
  { name: 'reviewer', color: BLUE, art: ' ◊ ' },
]

export async function showSplash(adEnabled: boolean): Promise<void> {
  console.clear()
  console.log()

  // Animate logo line by line
  const lines = LOGO_ASCII.split('\n')
  for (const line of lines) {
    process.stdout.write(line + '\n')
    await sleep(40)
  }

  console.log()

  // Type out tagline with cursor
  for (const ch of TAGLINE) {
    process.stdout.write(DIM(ch))
    await sleep(12)
  }
  process.stdout.write(CYAN(' █'))
  await sleep(300)

  // Erase cursor and show agents
  process.stdout.write('\r' + ' '.repeat(TAGLINE.length + 4) + '\r')

  // Animated agent sequence
  for (let cycle = 0; cycle < 2; cycle++) {
    for (const agent of AGENT_SPRITES) {
      process.stdout.write(`\r${agent.color(agent.art)} ${agent.color(agent.name)} agent ready ${agent.art}`)
      await sleep(150)
    }
  }

  // Final state
  process.stdout.write('\r' + DIM('─'.repeat(45)) + '\n')

  // Ad message if enabled
  if (adEnabled) {
    process.stdout.write(DIM('openPly is free — supported by text ads.') + '\n')
    process.stdout.write(DIM('─'.repeat(45)) + '\n')
  }

  console.log()
}

let currentAnimation: { pause: () => void; resume: () => void } | null = null

export function pauseProcessingAnimation(): void {
  currentAnimation?.pause()
}

export function resumeProcessingAnimation(): void {
  currentAnimation?.resume()
}

export async function showProcessingAnimation(label: string): Promise<() => void> {
  const frames = ['◓', '◑', '◒', '◐']
  let i = 0
  const start = Date.now()
  let interval: ReturnType<typeof setInterval> | null = null

  const tick = () => {
    const elapsed = ((Date.now() - start) / 1000).toFixed(1)
    process.stdout.write(`\r${CYAN(frames[i % frames.length])} ${DIM(label)} ${DIM(`(${elapsed}s)`)}`)
    i++
  }

  interval = setInterval(tick, 100)

  const pause = () => {
    if (interval) {
      clearInterval(interval)
      interval = null
    }
    process.stdout.write('\r' + ' '.repeat(100) + '\r')
  }
  const resume = () => {
    if (!interval) interval = setInterval(tick, 100)
  }

  currentAnimation = { pause, resume }

  return () => {
    pause()
    if (currentAnimation && (currentAnimation as any).pause === pause) currentAnimation = null
    process.stdout.write(`\r${CYAN('◉')} ${chalk.green('done')} ${DIM(`(${((Date.now() - start) / 1000).toFixed(1)}s)`)}`)
    console.log()
  }
}

export function showEditAnimation(filePath: string): void {
  const frames = ['✍ ', '✎ ', '✏ ', '✐ ']
  let i = 0
  const interval = setInterval(() => {
    process.stdout.write(`\r${AMBER(frames[i % frames.length])} editing ${DIM(filePath)}`)
    i++
  }, 80)

  setTimeout(() => {
    clearInterval(interval)
    process.stdout.write(`\r${chalk.green('✔')} ${chalk.green('edited')} ${DIM(filePath)}`)
    console.log()
  }, 600)
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
