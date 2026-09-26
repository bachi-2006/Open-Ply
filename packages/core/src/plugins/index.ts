import * as fs from 'fs'
import * as path from 'path'
import { type AgentDefinition } from '../types'

// --- Plugin Types ---

export interface OpenPlyPlugin {
  name: string
  version: string
  description: string
  permissions: string[] // Added: Required permissions (e.g. 'filesystem:write', 'network:request')
  agents?: AgentDefinition[]
  tools?: PluginTool[]
  hooks?: PluginHooks
}

export interface PluginTool {
  name: string
  description: string
  permissions: string[] // Added: Specific permissions required for this tool
  execute: (args: Record<string, string>, context: PluginContext) => Promise<string>
}

export interface PluginHooks {
  beforePrompt?: (prompt: string) => string | Promise<string>
  afterResponse?: (response: string) => string | Promise<string>
  onFileWrite?: (filePath: string, content: string) => void
  onCommand?: (command: string) => void
}

export interface PluginContext {
  cwd: string
  sessionInfo: { projectSize: string; languageStack: string[] } // Added: Telemetry
  readFile: (path: string) => Promise<string>
  writeFile: (path: string, content: string) => Promise<void>
  exec: (command: string) => Promise<string>
  log: (message: string) => void
}

// --- Plugin Registry ---

const registeredPlugins: Map<string, OpenPlyPlugin> = new Map()
const pluginTools: Map<string, PluginTool> = new Map()
const pluginHooks: PluginHooks[] = []

// --- Plugin Discovery ---

const PLUGIN_DIRS = [
  '.openply/plugins',
  '.openply/plugins/node_modules',
  path.join(process.env.HOME || process.env.USERPROFILE || '.', '.openply', 'plugins'),
]

export async function discoverPlugins(cwd: string): Promise<OpenPlyPlugin[]> {
  const plugins: OpenPlyPlugin[] = []

  // Check .openply/plugins in project
  const projectPluginsDir = path.join(cwd, '.openply', 'plugins')
  if (fs.existsSync(projectPluginsDir)) {
    const entries = fs.readdirSync(projectPluginsDir, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.isDirectory() || entry.isSymbolicLink()) {
        const pluginPath = path.join(projectPluginsDir, entry.name)
        const plugin = await loadPlugin(pluginPath, entry.name)
        if (plugin) plugins.push(plugin)
      }
    }
  }

  // Check global plugins
  const globalPluginsDir = path.join(process.env.HOME || process.env.USERPROFILE || '.', '.openply', 'plugins')
  if (fs.existsSync(globalPluginsDir)) {
    const entries = fs.readdirSync(globalPluginsDir, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.isDirectory() || entry.isSymbolicLink()) {
        const pluginPath = path.join(globalPluginsDir, entry.name)
        const plugin = await loadPlugin(pluginPath, entry.name)
        if (plugin) plugins.push(plugin)
      }
    }
  }

  // Check openply-plugin-* npm packages
  const nodeModulesDir = path.join(cwd, 'node_modules')
  if (fs.existsSync(nodeModulesDir)) {
    const packages = fs.readdirSync(nodeModulesDir)
      .filter(p => p.startsWith('openply-plugin-') || p.startsWith('@openply/plugin-'))

    for (const pkg of packages) {
      const plugin = await loadPlugin(path.join(nodeModulesDir, pkg), pkg)
      if (plugin) plugins.push(plugin)
    }
  }

  return plugins
}

async function loadPlugin(pluginPath: string, name: string): Promise<OpenPlyPlugin | null> {
  try {
    const packageJsonPath = path.join(pluginPath, 'package.json')
    if (!fs.existsSync(packageJsonPath)) {
      // Try loading as a JS module directly
      const pluginModule = require(pluginPath)
      if (pluginModule.default && typeof pluginModule.default === 'object') {
        return registerPlugin(pluginModule.default)
      }
      if (pluginModule.name && pluginModule.version) {
        return registerPlugin(pluginModule)
      }
      return null
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))
    const main = packageJson.main || 'index.js'
    const mainPath = path.join(pluginPath, main)

    if (!fs.existsSync(mainPath)) return null

    const pluginModule = require(mainPath)
    const pluginDef = pluginModule.default || pluginModule

    if (pluginDef && pluginDef.name) {
      return registerPlugin(pluginDef)
    }

    return null
  } catch (err: any) {
    console.error(`Failed to load plugin ${name}: ${err.message}`)
    return null
  }
}

// --- Plugin Registration ---

export function registerPlugin(plugin: OpenPlyPlugin): OpenPlyPlugin {
  if (registeredPlugins.has(plugin.name)) {
    return registeredPlugins.get(plugin.name)!
  }

  registeredPlugins.set(plugin.name, plugin)

  // Register tools
  if (plugin.tools) {
    for (const tool of plugin.tools) {
      pluginTools.set(tool.name, tool)
    }
  }

  // Register hooks
  if (plugin.hooks) {
    pluginHooks.push(plugin.hooks)
  }

  return plugin
}

export function unregisterPlugin(name: string): boolean {
  const plugin = registeredPlugins.get(name)
  if (!plugin) return false

  // Unregister tools
  if (plugin.tools) {
    for (const tool of plugin.tools) {
      pluginTools.delete(tool.name)
    }
  }

  registeredPlugins.delete(name)
  return true
}

// --- Plugin Access ---

export function getRegisteredPlugins(): OpenPlyPlugin[] {
  return Array.from(registeredPlugins.values())
}

export function getPluginTools(): PluginTool[] {
  return Array.from(pluginTools.values())
}

export function getPluginTool(name: string): PluginTool | undefined {
  return pluginTools.get(name)
}

export function getPluginHooks(): PluginHooks[] {
  return pluginHooks
}

// --- Plugin Scaffold ---

export function scaffoldPlugin(dir: string, name: string): void {
  const pluginDir = path.join(dir, name)
  fs.mkdirSync(pluginDir, { recursive: true })

  fs.writeFileSync(path.join(pluginDir, 'package.json'), JSON.stringify({
    name: `openply-plugin-${name}`,
    version: '1.0.0',
    description: `openPly plugin: ${name}`,
    main: 'index.js',
    keywords: ['openply', 'openply-plugin'],
    license: 'MIT',
    openply: {
      minVersion: '0.3.0',
    },
  }, null, 2))

  fs.writeFileSync(path.join(pluginDir, 'index.js'), `// openPly plugin: ${name}

module.exports = {
  name: '${name}',
  version: '1.0.0',
  description: 'My openPly plugin',

  // Optional: custom agents
  agents: [],

  // Optional: custom tools
  tools: [
    // {
    //   name: 'my_tool',
    //   description: 'Does something useful',
    //   execute: async (args, context) => {
    //     context.log('Running my tool...')
    //     return 'Result from my tool'
    //   },
    // },
  ],

  // Optional: lifecycle hooks
  hooks: {
    // beforePrompt: (prompt) => prompt,
    // afterResponse: (response) => response,
    // onFileWrite: (path, content) => {},
    // onCommand: (command) => {},
  },
}
`)

  fs.writeFileSync(path.join(pluginDir, 'README.md'), `# openply-plugin-${name}

A plugin for openPly.

## Install

\`\`\`bash
cd .openply/plugins
npm init -y
npm install ../path/to/openply-plugin-${name}
\`\`\`

## Usage

The plugin will be automatically discovered by openPly when placed in \`.openply/plugins/\`.
`)
}
