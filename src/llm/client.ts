import OpenAI from 'openai'
import { ModelConfig, Message } from '../types'

export type Provider = 'openrouter' | 'ollama' | 'anthropic'

export interface RetryConfig {
  maxRetries: number
  baseDelayMs: number
  maxDelayMs: number
}

const DEFAULT_RETRY: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
}

export class LLMClient {
  private openai: OpenAI | null = null
  private anthropicClient: any = null
  private model: string
  private provider: Provider
  private fallbackChain: string[]
  private retryConfig: RetryConfig

  constructor(
    model: string,
    apiKey?: string,
    opts?: { provider?: Provider; fallbackChain?: string[]; retry?: Partial<RetryConfig> }
  ) {
    this.model = model
    this.provider = opts?.provider ?? 'openrouter'
    this.fallbackChain = opts?.fallbackChain ?? []
    this.retryConfig = { ...DEFAULT_RETRY, ...opts?.retry }

    if (apiKey) {
      this.openai = new OpenAI({
        baseURL: this.provider === 'anthropic'
          ? 'https://api.anthropic.com/v1'
          : this.provider === 'ollama'
            ? 'http://localhost:11434/v1'
            : 'https://openrouter.ai/api/v1',
        apiKey: this.provider === 'anthropic' ? apiKey : (this.provider === 'ollama' ? 'ollama' : apiKey),
        defaultHeaders: this.provider === 'openrouter'
          ? { 'HTTP-Referer': 'https://github.com/openply26/openply', 'X-Title': 'openPly' }
          : {},
      })

      if (this.provider === 'anthropic') {
        try {
          const Anthropic = require('@anthropic-ai/sdk')
          this.anthropicClient = new Anthropic({ apiKey })
        } catch {
          // SDK not installed — fall back to OpenAI-compatible proxy
        }
      }
    }
  }

  static createLocal(baseUrl = 'http://localhost:11434/v1', model = 'deepseek-coder-v2') {
    return new LLMClient(model, undefined, { provider: 'ollama' })
  }

  static createAnthropic(apiKey: string, model = 'claude-sonnet-4-20250514') {
    return new LLMClient(model, apiKey, { provider: 'anthropic' })
  }

  getModel(): string {
    return this.model
  }

  getProvider(): Provider {
    return this.provider
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(r => setTimeout(r, ms))
  }

  private async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error | null = null
    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        return await fn()
      } catch (err: any) {
        lastError = err

        // Don't retry on auth errors or invalid request
        if (err?.status === 401 || err?.status === 400 || err?.status === 403) {
          throw err
        }

        if (attempt < this.retryConfig.maxRetries) {
          const delay = Math.min(
            this.retryConfig.baseDelayMs * Math.pow(2, attempt) + Math.random() * 1000,
            this.retryConfig.maxDelayMs
          )
          await this.sleep(delay)
        }
      }
    }
    throw lastError
  }

  async chat(messages: Message[], onToken?: (token: string) => void): Promise<string> {
    if (!this.openai && !this.anthropicClient) {
      throw new Error('No LLM client configured. Run `openply config` to set up.')
    }

    const doChat = async () => {
      // Try Anthropic native SDK first
      if (this.anthropicClient && this.provider === 'anthropic') {
        return this.chatAnthropic(messages, onToken)
      }
      return this.chatOpenAICompatible(messages, onToken)
    }

    try {
      return await this.withRetry(doChat)
    } catch (err) {
      // Try fallback chain
      if (this.fallbackChain.length > 0) {
        const fallbackModel = this.fallbackChain.shift()!
        console.log(`\nFalling back to ${fallbackModel}...`)
        const fallbackClient = new LLMClient(fallbackModel, undefined, {
          provider: this.provider,
          fallbackChain: [...this.fallbackChain],
          retry: this.retryConfig,
        })
        return fallbackClient.chat(messages, onToken)
      }
      throw err
    }
  }

  private async chatOpenAICompatible(
    messages: Message[],
    onToken?: (token: string) => void
  ): Promise<string> {
    if (!this.openai) throw new Error('No OpenAI-compatible client')

    const stream = await this.openai.chat.completions.create({
      model: this.model,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      stream: true,
      max_tokens: 64000,
    })

    let full = ''
    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content || ''
      full += text
      onToken?.(text)
    }
    return full
  }

  private async chatAnthropic(
    messages: Message[],
    onToken?: (token: string) => void
  ): Promise<string> {
    if (!this.anthropicClient) throw new Error('Anthropic SDK not available')

    const systemMsg = messages.find(m => m.role === 'system')
    const chatMsgs = messages.filter(m => m.role !== 'system')

    const stream = this.anthropicClient.messages.stream({
      model: this.model,
      max_tokens: 64000,
      system: systemMsg?.content,
      messages: chatMsgs.map(m => ({ role: m.role, content: m.content })),
    })

    let full = ''
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta?.text) {
        full += event.delta.text
        onToken?.(event.delta.text)
      }
    }
    return full
  }

  // Non-streaming chat for plan generation (returns full response)
  async chatSync(messages: Message[]): Promise<string> {
    if (!this.openai && !this.anthropicClient) {
      throw new Error('No LLM client configured.')
    }

    return this.withRetry(async () => {
      if (this.anthropicClient && this.provider === 'anthropic') {
        const systemMsg = messages.find(m => m.role === 'system')
        const chatMsgs = messages.filter(m => m.role !== 'system')
        const response = await this.anthropicClient.messages.create({
          model: this.model,
          max_tokens: 64000,
          system: systemMsg?.content,
          messages: chatMsgs.map(m => ({ role: m.role, content: m.content })),
        })
        return response.content[0]?.text || ''
      }

      if (!this.openai) throw new Error('No client')
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        stream: false,
        max_tokens: 64000,
      })
      return response.choices[0]?.message?.content || ''
    })
  }
}
