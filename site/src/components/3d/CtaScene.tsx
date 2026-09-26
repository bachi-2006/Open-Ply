import SceneCanvas from './SceneCanvas'
import OpenPlyCore from './OpenPlyCore'

export default function CtaScene() {
  return (
    <SceneCanvas className="absolute inset-0 opacity-40 pointer-events-none" camera={{ position: [0, 0, 10], fov: 50 }}>
      <OpenPlyCore />
    </SceneCanvas>
  )
}
