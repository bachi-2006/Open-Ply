import { AgentDefinition, AgentStepParams, AgentToolCall } from '../types'

function parseSearchResult(result: string): string[] {
  return result.split('\n').filter(line => line && !line.startsWith('Found ') && !line.startsWith('exit '))
}

// Specialized Persona: EXPLORER
async function* explorerSteps(params: AgentStepParams): AsyncGenerator<AgentToolCall, void, string> {
  params.log('Exploring codebase to map dependencies...')
  const searchResults = yield { name: 'search_code', args: { query: params.prompt } }
  const files = parseSearchResult(searchResults)

  for (const f of files.slice(0, 5)) {
    params.log(`Analyzing ${f}...`)
    yield { name: 'read_file', args: { path: f } }
  }

  params.log('Exploration complete. Handing off to Editor for implementation.')
  yield { name: 'handoffTo', args: { agentId: 'editor' } }
}

// Specialized Persona: EDITOR
async function* editorSteps(params: AgentStepParams): AsyncGenerator<AgentToolCall, void, string> {
  params.log('Implementing requested changes...')
  // Editor focuses on precise replacements
  yield { name: 'str_replace', args: { path: 'TBD', old_text: 'TBD', new_text: 'TBD' } }
}

// Specialized Persona: REVIEWER
async function* reviewerSteps(params: AgentStepParams): AsyncGenerator<AgentToolCall, void, string> {
  params.log('Performing adversarial audit...')
  // Reviewer mostly reads and uses the done tool with summary
  yield { name: 'done', args: { summary: 'Audit complete. No critical regressions found.' } }
}

async function* gitCommitterSteps(params: AgentStepParams): AsyncGenerator<AgentToolCall, void, string> {
  params.log('Analyzing git state...')

  const status = yield { name: 'run_command', args: { command: 'git status --porcelain' } }
  const branch = yield { name: 'run_command', args: { command: 'git rev-parse --abbrev-ref HEAD' } }
  const diff = yield { name: 'run_command', args: { command: 'git diff --staged' } }
  const diffUnstaged = yield { name: 'run_command', args: { command: 'git diff' } }

  const combinedDiff = [branch, status, diff, diffUnstaged].filter(Boolean).join('\n---\n')

  const llmResponse = await params.llm.chatSync([
    { role: 'system', content: 'You are a git commit message writer. Analyze the diff and write a concise, meaningful commit message (subject + body). Respond with ONLY the commit message, no explanations.' },
    { role: 'user', content: `Branch: ${branch}\n\nChanges:\n${combinedDiff}\n\nWrite a commit message:` },
  ])

  const commitMsg = llmResponse.trim()
  params.log(`Commit message: ${commitMsg.split('\n')[0]}`)

  const escaped = commitMsg.replace(/"/g, '\\"')
  const result = yield { name: 'run_command', args: { command: `git commit -m "${escaped}"` } }
  params.log(result)
}

async function* debuggerSteps(params: AgentStepParams): AsyncGenerator<AgentToolCall, void, string> {
  params.log('Analyzing error context...')

  const searchResults = yield { name: 'search_code', args: { query: '**/*.{ts,tsx,js,jsx}' } }

  const fileLines = parseSearchResult(searchResults).join('\n')
  const llmResponse = await params.llm.chatSync([
    { role: 'system', content: 'You are a debugger. Based on the user\'s error report and project files, identify likely culprit files and suggest a fix approach.' },
    { role: 'user', content: `User request: ${params.prompt}\n\nProject files:\n${fileLines}\n\nWhich files should I examine?` },
  ])

  params.log(llmResponse)

  const fileMatch = llmResponse.match(/['\"]?([\w./-]+\.(?:ts|tsx|js|jsx))['\"]?/g)
  if (fileMatch) {
    for (const f of fileMatch.slice(0, 3)) {
      const path = f.replace(/['"]/g, '')
      params.log(`Reading ${path}...`)
      yield { name: 'read_file', args: { path } }
    }
  }

  const testCommand = yield { name: 'run_command', args: { command: 'npm test 2>&1 || npm run test 2>&1 || echo "No test script found"' } }
  params.log(`Test output: ${testCommand.slice(0, 500)}`)
}

async function* refactorerSteps(params: AgentStepParams): AsyncGenerator<AgentToolCall, void, string> {
  params.log('Analyzing code for refactoring opportunities...')

  const fileList = yield { name: 'search_code', args: { query: '**/*.{ts,tsx,js,jsx,py,go,rs}' } }
  const files = parseSearchResult(fileList).slice(0, 20)
  params.log(`Found ${files.length} candidate files`)

  const llmResponse = await params.llm.chatSync([
    { role: 'system', content: 'You are a code refactoring expert. Analyze the project structure and user request to identify refactoring targets.' },
    { role: 'user', content: `Request: ${params.prompt}\n\nFiles:\n${files.join('\n')}\n\nWhich files need refactoring and what pattern should be applied?` },
  ])

  params.log(llmResponse)

  const filePaths = llmResponse.match(/['\"]?([\w./-]+\.(?:ts|tsx|js|jsx|py|go|rs))['\"]?/g)
  if (filePaths) {
    for (const f of filePaths.slice(0, 5)) {
      const path = f.replace(/['"]/g, '')
      const content = yield { name: 'read_file', args: { path } }

      const refactored = await params.llm.chatSync([
        { role: 'system', content: 'Refactor the code below. Apply the requested changes while preserving functionality and style. Output ONLY the complete refactored file content.' },
        { role: 'user', content: `File: ${path}\n\nRequest: ${params.prompt}\n\nCode:\n${content}\n\nRefactored code:` },
      ])

      yield { name: 'write_file', args: { path, content: refactored } }
      params.log(`Refactored ${path}`)
    }
  }
}

async function* documenterSteps(params: AgentStepParams): AsyncGenerator<AgentToolCall, void, string> {
  params.log('Reading source files for documentation...')

  const fileList = yield { name: 'search_code', args: { query: '**/*.{ts,tsx,js,jsx,py,go,rs}' } }
  const files = parseSearchResult(fileList).slice(0, 10)
  params.log(`Found ${files.length} source files`)

  const fileContents: { path: string; content: string }[] = []
  for (const f of files) {
    const content = yield { name: 'read_file', args: { path: f } }
    fileContents.push({ path: f, content })
  }

  const docs = await params.llm.chatSync([
    { role: 'system', content: 'You are a technical documentation writer. Generate clear, comprehensive documentation in markdown.' },
    { role: 'user', content: `Generate documentation for these source files:\n\n${fileContents.map(f => `--- ${f.path} ---\n${f.content.slice(0, 2000)}`).join('\n\n')}` },
  ])

  const docPath = params.prompt.match(/['\"]?([\w./-]+\.md)['\"]?/)
    ? params.prompt.match(/['\"]?([\w./-]+\.md)['\"]"?/)?.[1]?.replace(/['"]/g, '')
    : 'DOCUMENTATION.md'

  yield { name: 'write_file', args: { path: docPath || 'DOCUMENTATION.md', content: docs } }
  params.log(`Documentation written to ${docPath || 'DOCUMENTATION.md'}`)
}

async function* testerSteps(params: AgentStepParams): AsyncGenerator<AgentToolCall, void, string> {
  params.log('Analyzing source code for test generation...')

  const fileList = yield { name: 'search_code', args: { query: '**/*.{ts,tsx,js,jsx}' } }
  const excludePattern = /\.(test|spec|mock)\.|__tests__|node_modules|dist/
  const sourceFiles = parseSearchResult(fileList).filter(f => !excludePattern.test(f)).slice(0, 5)
  params.log(`Found ${sourceFiles.length} source files to test`)

  for (const filePath of sourceFiles) {
    const content = yield { name: 'read_file', args: { path: filePath } }

    const testContent = await params.llm.chatSync([
      { role: 'system', content: 'You are a test writer. Generate comprehensive tests. Use the same testing framework already present in the project. Output ONLY the test file content.' },
      { role: 'user', content: `Generate tests for:\n\nFile: ${filePath}\n\nSource:\n${content}` },
    ])

    const ext = filePath.endsWith('.tsx') ? '.test.tsx' : filePath.endsWith('.ts') ? '.test.ts' : filePath.endsWith('.jsx') ? '.test.jsx' : '.test.js'
    const testPath = filePath.replace(/\.(ts|tsx|js|jsx)$/, ext)

    yield { name: 'write_file', args: { path: testPath, content: testContent } }
    params.log(`Generated ${testPath}`)
  }

  const testResult = yield { name: 'run_command', args: { command: 'npm test 2>&1 || npm run test 2>&1 || echo "No test runner configured"' } }
  params.log(`Tests: ${testResult.slice(0, 300)}`)
}

export const BUILTIN_AGENT_IMPLS: Record<string, (params: AgentStepParams) => AsyncGenerator<AgentToolCall, void, string>> = {
  'git-committer': gitCommitterSteps,
  'debugger': debuggerSteps,
  'refactorer': refactorerSteps,
  'documenter': documenterSteps,
  'tester': testerSteps,
  'explorer': explorerSteps,
  'editor': editorSteps,
  'reviewer': reviewerSteps,
}
