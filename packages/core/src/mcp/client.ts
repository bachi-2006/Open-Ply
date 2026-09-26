import { spawn, type ChildProcess } from 'child_process'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { info, warn } from '../utils/display'

export interface McpTool {
  name: string
  description: string
  inputSchema: Record<string, unknown>
  server: string
}

interface McpServerConfig {
  command: string
  args?: string[]
  env?: Record<string, string>
}

interface PendingRequest {
  resolve: (value: any) => void
  reject: (err: Error) => void
  timer: NodeJS.Timeout
}

export class McpClient {
  private processes = new Map<string, ChildProcess>()
  private pending = new Map<string, PendingRequest>()
  private buffer = ''
  private msgId = 0
  private tools: McpTool[] = []
  private connected = false

  getTools(): McpTool[] {
    return this.tools
  }

  isConnected(): boolean {
    return this.connected
  }

  async connect(cwd: string): Promise<McpTool[]> {
    const configPath = join(cwd, '.openply', 'mcp.json')
    const homeConfig = join(process.env.USERPROFILE || process.env.HOME || '', '.openply', 'mcp.json')
    const path = existsSync(configPath) ? configPath : existsSync(homeConfig) ? homeConfig : null
    if (!path) return []

    let servers: Record<string, McpServerConfig>
    try {
      const parsed = JSON.parse(readFileSync(path, 'utf-8'))
      servers = parsed.servers || parsed.mcpServers || {}
    } catch (err: any) {
      warn(`Invalid mcp.json: ${err.message}`)
      return []
    }

    const results = await Promise.allSettled(
      Object.entries(servers).map(([name, cfg]) => this.connectServer(name, cfg))
    )
    this.connected = this.tools.length > 0
    const failed = results.filter(r => r.status === 'rejected').length
    if (this.tools.length > 0) {
      info(`MCP: connected ${Object.keys(servers).length - failed} server(s), ${this.tools.length} tool(s)`)
    } else if (failed > 0) {
      warn(`MCP: failed to connect ${failed} server(s)`)
    }
    return this.tools
  }

  private async connectServer(name: string, cfg: McpServerConfig): Promise<void> {
    const child = spawn(cfg.command, cfg.args || [], {
      env: { ...process.env, ...(cfg.env || {}) },
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: process.platform === 'win32',
    })

    child.stdout?.setEncoding('utf-8')
    child.stdout?.on('data', (chunk: string) => this.handleData(name, chunk))
    child.stderr?.setEncoding('utf-8')
    child.stderr?.on('data', () => { })
    child.on('exit', () => {
      this.processes.delete(name)
      for (const [id, p] of this.pending) {
        if (id.startsWith(`${name}:`)) {
          clearTimeout(p.timer)
          p.reject(new Error(`MCP server ${name} exited`))
          this.pending.delete(id)
        }
      }
    })

    this.processes.set(name, child)

    await this.request(name, 'initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'openply', version: '0.4.0' },
    })
    this.notify(name, 'notifications/initialized', {})

    const res: any = await this.request(name, 'tools/list', {})
    const tools = (res.tools || []).map((t: any) => ({
      name: `${name}__${t.name}`,
      description: t.description || `${t.name} (MCP: ${name})`,
      inputSchema: t.inputSchema || { type: 'object', properties: {} },
      server: name,
    }))
    this.tools.push(...tools)
  }

  private handleData(server: string, chunk: string): void {
    this.buffer += chunk
    let idx: number
    while ((idx = this.buffer.indexOf('\n')) >= 0) {
      const line = this.buffer.slice(0, idx).trim()
      this.buffer = this.buffer.slice(idx + 1)
      if (!line) continue
      try {
        const msg = JSON.parse(line)
        if (msg.id !== undefined) {
          const key = `${server}:${msg.id}`
          const pending = this.pending.get(key)
          if (pending) {
            clearTimeout(pending.timer)
            this.pending.delete(key)
            if (msg.error) pending.reject(new Error(msg.error.message || JSON.stringify(msg.error)))
            else pending.resolve(msg.result)
          }
        }
      } catch { }
    }
  }

  private request(server: string, method: string, params: unknown, timeoutMs = 15000): Promise<any> {
    const child = this.processes.get(server)
    if (!child) return Promise.reject(new Error(`MCP server ${server} not running`))

    const id = ++this.msgId
    const key = `${server}:${id}`
    const msg = JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n'

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(key)
        reject(new Error(`MCP ${method} timed out on ${server}`))
      }, timeoutMs)
      this.pending.set(key, { resolve, reject, timer })
      child.stdin!.write(msg)
    })
  }

  private notify(server: string, method: string, params: unknown): void {
    const child = this.processes.get(server)
    if (!child) return
    child.stdin!.write(JSON.stringify({ jsonrpc: '2.0', method, params }) + '\n')
  }

  async callTool(toolName: string, args: Record<string, unknown>): Promise<string> {
    const tool = this.tools.find(t => t.name === toolName)
    if (!tool) return `Unknown MCP tool: ${toolName}`

    const shortName = toolName.split('__').slice(1).join('__')
    try {
      const res: any = await this.request(tool.server, 'tools/call', { name: shortName, arguments: args }, 60000)
      if (res.isError) {
        const errText = (res.content || []).map((c: any) => c.text || '').join('\n')
        return `MCP tool error: ${errText}`
      }
      return (res.content || [])
        .map((c: any) => {
          if (c.type === 'text') return c.text
          if (c.type === 'resource') return `[resource: ${c.resource?.uri || 'unknown'}]`
          return `[${c.type}]`
        })
        .join('\n') || 'OK'
    } catch (err: any) {
      return `MCP call failed: ${err.message}`
    }
  }

  disconnect(): void {
    for (const [, child] of this.processes) {
      try { child.kill() } catch { }
    }
    this.processes.clear()
    this.tools = []
    this.connected = false
  }
}

export const mcpClient = new McpClient()
