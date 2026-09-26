import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileCode2, MessagesSquare, FolderTree, PanelRight, PencilLine, Settings2, SquareTerminal, Menu, Shield, FolderOpen, ChevronDown } from 'lucide-react'
import { useStore, type RightPanel } from '../lib/store'
import { listFiles, readFile } from '../lib/api'
import SessionSidebar from '../components/SessionSidebar'
import AgentBar from '../components/AgentBar'
import ChatPanel from '../components/ChatPanel'
import CodeView from '../components/CodeView'
import FileEditor from '../components/FileEditor'
import TerminalPanel from '../components/TerminalPanel'
import SettingsPanel from '../components/SettingsPanel'
import ToolBar from '../components/ToolBar'
import StatusBar from '../components/StatusBar'
import OfflineBanner from '../components/OfflineBanner'
import ToastHost from '../components/Toast'
import { SecurityReplay } from '../components/SecurityReplay'
import { CapabilityModal } from '../components/CapabilityModal'
import OpenFolderModal from '../components/OpenFolderModal'
import ApiKeyModal from '../components/ApiKeyModal'
import { useSecurity } from '../lib/securityStore'

const PANEL_TABS: { key: RightPanel; label: string; icon: typeof FileCode2 }[] = [
  { key: 'security', label: 'Shield', icon: Shield },
  { key: 'code', label: 'Code', icon: FileCode2 },
  { key: 'editor', label: 'Edit', icon: PencilLine },
  { key: 'terminal', label: 'Term', icon: SquareTerminal },
  { key: 'settings', label: 'Settings', icon: Settings2 },
]

export type SidebarTab = 'sessions' | 'files'

export default function AppPage() {
  const { state, dispatch, activeSession, toast, refreshAiStatus, openFolder } = useStore()
  const security = useSecurity()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarVisible, setSidebarVisible] = useState(true)
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('sessions')
  const [panelOpen, setPanelOpen] = useState(false)
  const [folderModalOpen, setFolderModalOpen] = useState(false)
  const [apiKeyModalOpen, setApiKeyModalOpen] = useState(false)

  useEffect(() => {
    dispatch({ type: 'SET_FILES_STATUS', status: 'loading' })
    listFiles()
      .then((files) => { dispatch({ type: 'SET_FILES', files }); dispatch({ type: 'SET_FILES_STATUS', status: 'ready' }) })
      .catch(() => dispatch({ type: 'SET_FILES_STATUS', status: 'error' }))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (state.activeFile && state.fileContent === null) {
      let cancelled = false
      readFile(state.activeFile)
        .then((content) => { if (!cancelled) dispatch({ type: 'SET_ACTIVE_FILE', path: state.activeFile, content }) })
        .catch((err) => {
          if (!cancelled) {
            dispatch({ type: 'SET_ACTIVE_FILE', path: state.activeFile, content: '' })
            toast(err?.message || `Could not read ${state.activeFile}`, 'error')
          }
        })
      return () => { cancelled = true }
    }
  }, [state.activeFile, state.fileContent]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && (e.key === 'b' || e.key === 'B')) {
        e.preventDefault()
        setSidebarVisible(v => !v)
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'o' || e.key === 'O')) {
        e.preventDefault()
        setFolderModalOpen(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    if (state.backend === 'offline') toast('Backend is offline — chat and files unavailable', 'error')
  }, [state.backend]) // eslint-disable-line react-hooks/exhaustive-deps

  const switchPanel = (panel: RightPanel) => {
    dispatch({ type: 'SET_RIGHT_PANEL', panel })
    setPanelOpen(true)
  }

  const railButton = (
    icon: typeof FileCode2,
    label: string,
    active: boolean,
    onClick: () => void,
  ) => {
    const Icon = icon
    return (
      <button
        key={label}
        onClick={onClick}
        title={label}
        aria-label={label}
        aria-pressed={active}
        className={`flex h-9 w-9 items-center justify-center rounded-md transition-colors ${
          active ? 'bg-elevated text-accent' : 'text-faint hover:bg-elevated hover:text-muted'
        }`}
      >
        <Icon size={16} strokeWidth={1.75} />
      </button>
    )
  }

  const renderRightPanel = () => {
    switch (state.rightPanel) {
      case 'security': return (
        <SecurityReplay
          events={security.events}
          connected={security.connected}
          onTriggerDemo={async () => {
            try {
              await openFolder('demo-project')
            } catch { }
            security.triggerDemoScenario()
          }}
          onClear={security.clearEvents}
        />
      )
      case 'code': return <CodeView path={state.activeFile} content={state.fileContent} onClose={() => dispatch({ type: 'SET_ACTIVE_FILE', path: null, content: null })} />
      case 'editor': return <FileEditor path={state.activeFile} content={state.fileContent} onSwitchPanel={switchPanel} />
      case 'terminal': return <TerminalPanel />
      case 'settings': return <SettingsPanel />
    }
  }

  const rightPanelTabs = (
    <>
      {PANEL_TABS.map((tab) => (
        <button
          key={tab.key}
          onClick={() => switchPanel(tab.key)}
          className={`flex items-center gap-1.5 border-b-2 px-3 py-2 font-mono text-[10px] uppercase tracking-wider transition-colors ${
            state.rightPanel === tab.key
              ? 'border-accent text-accent'
              : 'border-transparent text-faint hover:bg-elevated hover:text-muted'
          }`}
        >
          <tab.icon size={13} />
          <span className="hidden xl:inline">{tab.label}</span>
        </button>
      ))}
    </>
  )

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-bg font-mono">
      <header className="flex h-10 shrink-0 items-center justify-between border-b border-border px-3">
        <div className="flex items-center gap-2">
          <button onClick={() => setSidebarOpen(true)} className="p-1.5 text-faint hover:text-text md:hidden" aria-label="Open sidebar">
            <Menu size={16} />
          </button>
          <Link to="/" className="flex items-center gap-1.5 text-xs font-bold tracking-tight">
            <span className="text-sm">🛡️</span>
            <span className="text-text-bright">Sentinel</span>
            <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">Flow</span>
          </Link>
          <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-emerald-400 font-semibold">Zero-Trust Active</span>

          {/* Prominent Workspace Selector Pill */}
          <button
            onClick={() => setFolderModalOpen(true)}
            className="flex items-center gap-1.5 rounded-md border border-cyan-500/30 bg-cyan-950/40 px-2 py-1 text-[11px] font-mono text-cyan-300 hover:border-cyan-400/60 hover:bg-cyan-900/50 transition-all cursor-pointer ml-1"
            title={`Active Workspace: ${state.root || 'openply'}\nClick or press Ctrl+O to open or switch folder`}
          >
            <FolderOpen size={12} className="text-cyan-400" />
            <span className="max-w-[140px] truncate font-medium">
              {state.root ? state.root.replace(/\\/g, '/').split('/').filter(Boolean).pop() : 'openply'}
            </span>
            <ChevronDown size={10} className="text-cyan-400/70" />
          </button>

          {/* AI Engine Connectivity Badge */}
          <button
            onClick={() => {
              if (!state.aiStatus?.online) {
                setApiKeyModalOpen(true)
              } else {
                refreshAiStatus()
              }
            }}
            className="hidden sm:flex items-center gap-1.5 rounded-md border border-border/80 bg-surface/70 px-2 py-1 text-[10px] text-muted hover:border-cyan-500/40 hover:text-text transition-colors cursor-pointer"
            title={state.aiStatus ? `${state.aiStatus.message}\nClick to configure key or test connectivity` : 'Click to configure Gemini API Key'}
          >
            <span className={`inline-block h-1.5 w-1.5 rounded-full ${state.aiStatus?.online ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50 animate-pulse' : 'bg-amber-400'}`} />
            <span>{state.aiStatus?.online ? '⚡ Gemini 3.8 Flash Ready' : '⚠️ Gemini 3.8 Flash (No Key)'}</span>
          </button>
        </div>
        {activeSession && (
          <div className="flex items-center gap-3 text-[10px] text-faint">
            <span className="hidden sm:inline">{activeSession.messages.length} msgs</span>
            <span className="flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${state.loading ? 'bg-accent animate-pulse' : 'bg-success'}`} />
            </span>
          </div>
        )}
      </header>

      <OfflineBanner />
      <AgentBar />

      <div className="relative flex flex-1 overflow-hidden">
        {/* Activity rail */}
        <nav className="flex w-10 shrink-0 flex-col items-center gap-1 border-r border-border bg-surface py-2">
          {railButton(Shield, 'Security Replay', state.rightPanel === 'security', () => switchPanel('security'))}
          <div className="my-1 h-px w-5 bg-border" />
          {railButton(MessagesSquare, 'Sessions', sidebarVisible && sidebarTab === 'sessions', () => { setSidebarTab('sessions'); setSidebarVisible(true) })}
          {railButton(FolderTree, 'Explorer', sidebarVisible && sidebarTab === 'files', () => { setSidebarTab('files'); setSidebarVisible(true) })}
          <div className="my-1 h-px w-5 bg-border" />
          {railButton(SquareTerminal, 'Terminal', state.rightPanel === 'terminal', () => switchPanel('terminal'))}
          {railButton(PanelRight, 'Toggle right panel', panelOpen, () => setPanelOpen(o => !o))}
        </nav>

        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
            <div className="absolute bottom-0 left-0 top-0 w-[260px] animate-slide-left border-r border-border bg-surface">
              <SessionSidebar
                tab={sidebarTab}
                onTabChange={setSidebarTab}
                onClose={() => setSidebarOpen(false)}
                onOpenFolder={() => setFolderModalOpen(true)}
              />
            </div>
          </div>
        )}

        {/* Desktop sidebar */}
        {sidebarVisible && (
          <aside className="hidden w-56 shrink-0 flex-col overflow-hidden border-r border-border bg-surface md:flex">
            <SessionSidebar
              tab={sidebarTab}
              onTabChange={setSidebarTab}
              onOpenFolder={() => setFolderModalOpen(true)}
            />
          </aside>
        )}

        {/* Center: chat */}
        <main className="flex min-h-0 min-w-0 flex-1 flex-col bg-bg">
          <ToolBar />
          <ChatPanel />
        </main>

        {/* Desktop right panel */}
        <aside className="hidden w-80 shrink-0 flex-col overflow-hidden border-l border-border bg-surface lg:flex xl:w-[400px]">
          <div className="flex shrink-0 overflow-x-auto border-b border-border">{rightPanelTabs}</div>
          <div className="flex-1 overflow-hidden">{renderRightPanel()}</div>
        </aside>

        {/* Mobile right panel overlay */}
        {panelOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setPanelOpen(false)} />
            <div className="absolute bottom-0 right-0 top-0 flex w-[85vw] max-w-[400px] animate-slide-right flex-col border-l border-border bg-surface">
              <div className="flex shrink-0 items-center justify-between border-b border-border">
                <div className="flex overflow-x-auto">{rightPanelTabs}</div>
                <button onClick={() => setPanelOpen(false)} className="px-3 text-faint hover:text-text" aria-label="Close panel">×</button>
              </div>
              <div className="flex-1 overflow-hidden">{renderRightPanel()}</div>
            </div>
          </div>
        )}
      </div>

      <StatusBar
        onOpenFolder={() => setFolderModalOpen(true)}
        onOpenApiKeyModal={() => setApiKeyModalOpen(true)}
      />
      <ToastHost />
      <CapabilityModal
        pending={security.pendingApprovals}
        onResolve={security.resolveApproval}
      />
      <OpenFolderModal
        open={folderModalOpen}
        onClose={() => setFolderModalOpen(false)}
      />
      <ApiKeyModal
        open={apiKeyModalOpen}
        onClose={() => setApiKeyModalOpen(false)}
      />
    </div>
  )
}
