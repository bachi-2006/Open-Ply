/**
 * SentinelFlow - Live Security Replay & Telemetry Bus
 * Records and broadcasts high-fidelity security events in real-time to the UI HUD via Server-Sent Events (SSE).
 */

import { EventEmitter } from 'events'
import * as fs from 'fs'
import * as path from 'path'

export type SecurityEventType =
  | 'EVENT_DETECTED'
  | 'SECRET_SCAN'
  | 'CONTEXT_SANITIZED'
  | 'GEMINI_REASONING'
  | 'CAPABILITY_CHECK'
  | 'CAPABILITY_REQUESTED'
  | 'USER_APPROVAL'
  | 'USER_REJECTED'
  | 'TOOL_EXECUTED'
  | 'TOOL_BLOCKED'
  | 'TEST_EXECUTED'
  | 'VERIFICATION_PASSED'
  | 'VERIFICATION_FAILED'

export interface SecurityEvent {
  id: string
  timestamp: string // Human-readable e.g. "12:34:56"
  epoch: number
  type: SecurityEventType
  title: string
  details: string
  level: 'info' | 'success' | 'warn' | 'danger'
  targetResource?: string
  metadata?: Record<string, any>
}

class SecurityAuditBus extends EventEmitter {
  private history: SecurityEvent[] = []
  private maxHistory = 150
  private sseClients = new Set<(event: SecurityEvent) => void>()

  constructor() {
    super()
    // Emit initial system boot event
    this.recordEvent({
      type: 'EVENT_DETECTED',
      title: 'SentinelFlow Security Shield Online',
      details: 'Zero-Trust Capability Gateway and Secret Scrubber initialized.',
      level: 'info',
    })
  }

  public recordEvent(params: {
    type: SecurityEventType
    title: string
    details: string
    level: 'info' | 'success' | 'warn' | 'danger'
    targetResource?: string
    metadata?: Record<string, any>
  }): SecurityEvent {
    const now = new Date()
    const timeStr = now.toTimeString().split(' ')[0]

    const event: SecurityEvent = {
      id: `sec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: timeStr,
      epoch: now.getTime(),
      ...params,
    }

    this.history.push(event)
    if (this.history.length > this.maxHistory) {
      this.history.shift()
    }

    // Broadcast to SSE clients
    for (const client of this.sseClients) {
      try {
        client(event)
      } catch {
        this.sseClients.delete(client)
      }
    }

    this.emit('event', event)
    return event
  }

  public getHistory(): SecurityEvent[] {
    return [...this.history]
  }

  public subscribe(client: (event: SecurityEvent) => void): () => void {
    this.sseClients.add(client)
    return () => {
      this.sseClients.delete(client)
    }
  }

  public clearHistory(): void {
    this.history = []
  }
}

export const securityBus = new SecurityAuditBus()
