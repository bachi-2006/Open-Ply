/**
 * SentinelFlow - Human-in-the-Loop (HITL) Approval Bus
 * Async promise interlock that holds execution of high-risk actions until explicit human authorization is received.
 */

import { RiskLevel } from './risk'
import { CapabilityType } from './capabilities'
import { EventEmitter } from 'events'

export interface PendingApproval {
  id: string
  timestamp: number
  tool: string
  args: Record<string, any>
  riskLevel: RiskLevel
  capability: CapabilityType
  reason: string
  diffPreview?: {
    path: string
    oldText?: string
    newText?: string
  }
  status: 'pending' | 'approved' | 'rejected'
}

type Resolver = (approved: boolean) => void

export class ApprovalManager extends EventEmitter {
  private pending = new Map<string, { item: PendingApproval; resolve: Resolver; timeout: NodeJS.Timeout }>()

  /**
   * Submits an action for human approval and returns a Promise that halts execution until approved or rejected.
   */
  public requestApproval(
    item: Omit<PendingApproval, 'id' | 'timestamp' | 'status'>,
    timeoutMs: number = 300_000 // 5 minutes default
  ): Promise<boolean> {
    const id = `appr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    const approval: PendingApproval = {
      ...item,
      id,
      timestamp: Date.now(),
      status: 'pending',
    }

    return new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id)
          this.emit('expired', approval)
          resolve(false)
        }
      }, timeoutMs)

      this.pending.set(id, {
        item: approval,
        resolve,
        timeout: timer,
      })

      this.emit('requested', approval)
    })
  }

  /**
   * Resolves a pending authorization request with user decision.
   */
  public resolveApproval(id: string, approved: boolean): boolean {
    const entry = this.pending.get(id)
    if (!entry) return false

    clearTimeout(entry.timeout)
    entry.item.status = approved ? 'approved' : 'rejected'
    this.pending.delete(id)

    this.emit(approved ? 'approved' : 'rejected', entry.item)
    entry.resolve(approved)
    return true
  }

  /**
   * Returns list of currently pending approval requests.
   */
  public getPendingList(): PendingApproval[] {
    return Array.from(this.pending.values()).map(v => v.item)
  }

  /**
   * Returns a specific pending request.
   */
  public getPending(id: string): PendingApproval | undefined {
    return this.pending.get(id)?.item
  }
}

// Global singleton instance for application runtime
export const approvalManager = new ApprovalManager()
