import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { LLMClient } from '../llm/client'
import { info, success } from '../utils/display'
import { runBash } from '../bash/executor'

const STACKS = ['react-express', 'nextjs', 'express-ejs', 'static-html'] as const
export type AppStack = typeof STACKS[number]

const STACK_PROMPTS: Record<AppStack, string> = {
  'react-express': 'React (Vite) frontend + Express.js backend with REST API',
  'nextjs': 'Next.js full-stack app with App Router',
  'express-ejs': 'Express.js with EJS templates',
  'static-html': 'Static HTML/CSS/JS site',
}

interface GeneratedApp {
  stack: AppStack
  dir: string
  files: string[]
  devCommand: string
  previewUrl: string
}

export async function generateApp(
  description: string,
  stack: AppStack,
  llm: LLMClient,
  cwd: string
): Promise<GeneratedApp> {
  const appDir = join(cwd, '.openply-app')
  await mkdir(appDir, { recursive: true })

  info(`Generating ${stack} app: "${description.slice(0, 60)}..."`)

  const prompt = `Generate a complete ${STACK_PROMPTS[stack]} application.

Description: ${description}

Requirements:
- Generate ALL files needed for a working application
- Include package.json with all dependencies
- Include a README.md
- Make it production-ready but minimal
- Use modern practices

Output the file tree and complete source code for each file.

Format each file as:
=== path/to/file.ext ===
<file content>
=== path/to/file.ext ===
<file content>`

  const response = await llm.chat([
    { role: 'system', content: 'You generate complete, working web applications from descriptions.' },
    { role: 'user', content: prompt },
  ])

  const files = parseGeneratedFiles(response)
  const written: string[] = []

  for (const [filePath, content] of Object.entries(files)) {
    const fullPath = join(appDir, filePath)
    await mkdir(join(appDir, filePath.split('/').slice(0, -1).join('/')), { recursive: true })
    await writeFile(fullPath, content.trimStart(), 'utf-8')
    written.push(filePath)
  }

  success(`Generated ${written.length} files in ${appDir}`)

  return {
    stack,
    dir: appDir,
    files: written,
    devCommand: getDevCommand(stack),
    previewUrl: getPreviewUrl(stack),
  }
}

export async function startPreview(app: GeneratedApp): Promise<void> {
  info(`Installing dependencies for ${app.stack} app...`)
  const installResult = runBash('npm install', app.dir)
  if (installResult.exitCode !== 0) {
    console.error(installResult.stderr)
    return
  }
  success('Dependencies installed')

  info(`Starting preview at ${app.previewUrl}`)
  info(`Dev command: ${app.devCommand}`)
  info('Run this in another terminal, or use:')
  console.log(`  cd ${app.dir} && ${app.devCommand}`)
}

function parseGeneratedFiles(response: string): Record<string, string> {
  const files: Record<string, string> = {}
  const fileRegex = /=== (.+?) ===\n([\s\S]*?)(?=\n=== |$)/g
  let match: RegExpExecArray | null

  while ((match = fileRegex.exec(response)) !== null) {
    files[match[1]] = match[2].trim()
  }

  if (Object.keys(files).length === 0) {
    files['README.md'] = `# Generated App\n\n${response.slice(0, 500)}`
  }

  return files
}

function getDevCommand(stack: AppStack): string {
  switch (stack) {
    case 'react-express': return 'npm run dev'
    case 'nextjs': return 'npm run dev'
    case 'express-ejs': return 'node index.js'
    case 'static-html': return 'npx serve .'
  }
}

function getPreviewUrl(stack: AppStack): string {
  switch (stack) {
    case 'react-express': return 'http://localhost:5173'
    case 'nextjs': return 'http://localhost:3000'
    case 'express-ejs': return 'http://localhost:3000'
    case 'static-html': return 'http://localhost:3000'
  }
}
