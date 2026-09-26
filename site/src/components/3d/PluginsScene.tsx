import SceneCanvas from './SceneCanvas'
import PluginOrbit from './PluginOrbit'

export default function PluginsScene() {
  return (
    <SceneCanvas
      className="h-[420px] w-full"
      camera={{ position: [0, 1, 8.5], fov: 50 }}
      fallback={
        <div className="flex h-full items-center justify-center">
          <div className="rounded-full border border-dashed border-[#a78bfa]/30 px-8 py-4 font-mono text-sm text-[#a78bfa]">
            OpenPly Core ? plugin orbit
          </div>
        </div>
      }
    >
      <PluginOrbit />
    </SceneCanvas>
  )
}
