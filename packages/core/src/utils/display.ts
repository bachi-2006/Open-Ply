import chalk from 'chalk'

export function info(msg: string) { console.log(chalk.blue('ℹ'), msg) }
export function success(msg: string) { console.log(chalk.green('✔'), msg) }
export function warn(msg: string) { console.log(chalk.yellow('⚠'), msg) }
export function error(msg: string) { console.log(chalk.red('✘'), msg) }
export function code(msg: string) { console.log(chalk.cyan(msg)) }
export function dim(msg: string) { console.log(chalk.dim(msg)) }

export function renderDiff(diff: string): void {
  for (const line of diff.split('\n')) {
    if (line.startsWith('+')) console.log(chalk.green(line))
    else if (line.startsWith('-')) console.log(chalk.red(line))
    else if (line.startsWith('@@')) console.log(chalk.yellow(line))
    else console.log(chalk.dim(line))
  }
}

export function renderAd(line: string): void {
  console.log(chalk.dim('─'.repeat(50)))
  console.log(chalk.gray(chalk.italic(line)))
  console.log(chalk.dim('─'.repeat(50)))
}
