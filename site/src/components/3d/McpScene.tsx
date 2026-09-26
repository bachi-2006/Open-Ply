import SceneCanvas from './SceneCanvas'
import MCPNetwork from './MCPNetwork'

export default function McpScene() {
  return (
    <SceneCanvas
      className="h-[420px] w-full"
      camera={{ position: [0, 1.2, 8], fov: 50 }}
      fallback={
        <div className="flex h-full items-center justify-center">
          <div className="rounded-full border border-dashed border-[#22d3ee]/30 px-8 py-4 font-mono text-sm text-[#22d3ee]">
            OpenPly MCP ? 7 tools
          </div>
        </div>
      }
    >
      <MCPNetwork />
    </SceneCanvas>
  )
}
