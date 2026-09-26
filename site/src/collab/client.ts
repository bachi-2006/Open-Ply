// Client-side collaboration hook for the web IDE
// Connects to the WebSocket collab server for multi-user sessions

import { useState, useEffect, useCallback, useRef } from 'react'

interface Cursor {
  userId: string
  userName: string
  file: string
  line: number
  column: number
  color: string
}

interface CollabUser {
  userId: string
  userName: string
  color: string
}

interface ChatMessage {
  userId: string
  userName: string
  content: string
  timestamp: number
}

interface UseCollabOptions {
  wsUrl?: string
  sessionId?: string
  userName?: string
}

interface UseCollabReturn {
  connected: boolean
  sessionId: string | null
  users: CollabUser[]
  cursors: Cursor[]
  chatMessages: ChatMessage[]
  sendOperation: (file: string, op: any) => void
  sendCursor: (file: string, line: number, column: number) => void
  openFile: (file: string) => void
  saveFile: (file: string) => void
  sendChat: (content: string) => void
  disconnect: () => void
}

export function useCollab(options: UseCollabOptions = {}): UseCollabReturn {
  const {
    wsUrl = 'ws://localhost:3002',
    sessionId: initialSessionId,
    userName = 'Anonymous',
  } = options

  const wsRef = useRef<WebSocket | null>(null)
  const [connected, setConnected] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId || null)
  const [users, setUsers] = useState<CollabUser[]>([])
  const [cursors, setCursors] = useState<Map<string, Cursor>>(new Map())
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>()

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      setConnected(true)
      ws.send(JSON.stringify({
        type: 'join',
        sessionId: sessionId || undefined,
        userName,
      }))
    }

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        handleMessage(msg)
      } catch { /* ignore */ }
    }

    ws.onclose = () => {
      setConnected(false)
      // Reconnect after 3 seconds
      reconnectTimeoutRef.current = setTimeout(connect, 3000)
    }

    ws.onerror = () => {
      ws.close()
    }
  }, [wsUrl, sessionId, userName])

  const handleMessage = useCallback((msg: any) => {
    switch (msg.type) {
      case 'session:joined':
        setSessionId(msg.sessionId)
        break

      case 'user:joined':
        setUsers(prev => {
          const exists = prev.some(u => u.userId === msg.userId)
          if (exists) return prev
          return [...prev, { userId: msg.userId, userName: msg.userName, color: msg.color }]
        })
        break

      case 'user:left':
        setUsers(prev => prev.filter(u => u.userId !== msg.userId))
        setCursors(prev => {
          const next = new Map(prev)
          next.delete(msg.userId)
          return next
        })
        break

      case 'cursor:update':
        setCursors(prev => {
          const next = new Map(prev)
          next.set(msg.userId, {
            userId: msg.userId,
            userName: msg.userName,
            file: msg.file,
            line: msg.line,
            column: msg.column,
            color: msg.color,
          })
          return next
        })
        break

      case 'chat':
        setChatMessages(prev => [...prev, {
          userId: msg.userId,
          userName: msg.userName,
          content: msg.content,
          timestamp: msg.timestamp,
        }])
        break
    }
  }, [])

  const send = useCallback((data: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data))
    }
  }, [])

  const sendOperation = useCallback((file: string, op: any) => {
    send({ type: 'operation', file, ...op })
  }, [send])

  const sendCursor = useCallback((file: string, line: number, column: number) => {
    send({ type: 'cursor', file, line, column })
  }, [send])

  const openFile = useCallback((file: string) => {
    send({ type: 'file:open', file })
  }, [send])

  const saveFile = useCallback((file: string) => {
    send({ type: 'file:save', file })
  }, [send])

  const sendChat = useCallback((content: string) => {
    send({ type: 'chat', content })
  }, [send])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    wsRef.current?.close()
    wsRef.current = null
    setConnected(false)
  }, [])

  useEffect(() => {
    connect()
    return disconnect
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    connected,
    sessionId,
    users,
    cursors: Array.from(cursors.values()),
    chatMessages,
    sendOperation,
    sendCursor,
    openFile,
    saveFile,
    sendChat,
    disconnect,
  }
}
