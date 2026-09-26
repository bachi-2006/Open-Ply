import SceneCanvas from './SceneCanvas'
import OpenPlyCore from './OpenPlyCore'

export default function HeroScene() {
  return (
    <SceneCanvas className="absolute inset-0 pointer-events-none" camera={{ position: [0, 0.6, 9.5], fov: 50 }}>
      <OpenPlyCore />
    </SceneCanvas>
  )
}
