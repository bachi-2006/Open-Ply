import { useState, useEffect, useCallback } from 'react'

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
  timestamp: string
  epoch: number
  type: SecurityEventType
  title: string
  details: string
  level: 'info' | 'success' | 'warn' | 'danger'
  targetResource?: string
  metadata?: Record<string, any>
}

export interface PendingApproval {
  id: string
  timestamp: number
  tool: string
  args: Record<string, any>
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  capability: string
  reason: string
  diffPreview?: {
    path: string
    oldText?: string
    newText?: string
  }
  status: 'pending' | 'approved' | 'rejected'
}

export function useSecurity() {
  const [events, setEvents] = useState<SecurityEvent[]>([])
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([])
  const [connected, setConnected] = useState(false)

  // Fetch active pending approvals
  const refreshPending = useCallback(async () => {
    try {
      const res = await fetch('/api/security/pending')
      if (res.ok) {
        const data = await res.json()
        setPendingApprovals(data.pending || [])
      }
    } catch {
      // ignore offline fetch errors
    }
  }, [])

  useEffect(() => {
    refreshPending()

    const eventSource = new EventSource('/api/security/events')

    eventSource.onopen = () => {
      setConnected(true)
    }

    eventSource.onmessage = (e) => {
      try {
        const ev: SecurityEvent = JSON.parse(e.data)
        setEvents((prev) => {
          if (prev.some((p) => p.id === ev.id)) return prev
          return [...prev, ev]
        })

        if (ev.type === 'CAPABILITY_REQUESTED' || ev.type === 'USER_APPROVAL' || ev.type === 'USER_REJECTED') {
          refreshPending()
        }
      } catch {
        // malformed event
      }
    }

    eventSource.onerror = () => {
      setConnected(false)
    }

    return () => {
      eventSource.close()
    }
  }, [refreshPending])

  const resolveApproval = async (id: string, approved: boolean) => {
    try {
      const res = await fetch('/api/security/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, approved }),
      })
      if (res.ok) {
        setPendingApprovals((prev) => prev.filter((p) => p.id !== id))
      }
    } catch (err) {
      console.error('Failed to submit approval decision:', err)
    }
  }

  const triggerDemoScenario = async () => {
    try {
      await fetch('/api/security/demo', { method: 'POST' })
    } catch (err) {
      console.error('Failed to trigger demo scenario:', err)
    }
  }

  const clearEvents = () => {
    setEvents([])
  }

  return {
    events,
    pendingApprovals,
    connected,
    resolveApproval,
    triggerDemoScenario,
    clearEvents,
    refreshPending,
  }
}
