import { useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'

const PLUGINS = [
  { label: 'GitHub', color: '#e2e8f0', desc: 'Repos, PRs & issues' },
  { label: 'VS Code', color: '#38bdf8', desc: 'Editor integration' },
  { label: 'Terminal', color: '#4ade80', desc: 'Shell access' },
  { label: 'Browser', color: '#60a5fa', desc: 'Web automation' },
  { label: 'Database', color: '#a78bfa', desc: 'SQL & migrations' },
  { label: 'AI Models', color: '#f472b6', desc: 'OpenRouter catalog' },
  { label: 'Docker', color: '#38bdf8', desc: 'Containers & deploys' },
  { label: 'Custom', color: '#fbbf24', desc: 'Your own tools' },
]

interface OrbitingPlugin {
  label: string
  color: string
  desc: string
  radius: number
  speed: number
  tilt: number
  phase: number
  y: number
}

const ORBITING: OrbitingPlugin[] = PLUGINS.map((p, i) => ({
  ...p,
  radius: i % 2 === 0 ? 2.9 : 3.7,
  speed: (i % 2 === 0 ? 0.3 : -0.22) * (1 - (i % 3) * 0.15),
  tilt: i % 2 === 0 ? 0.35 : -0.45,
  phase: (i / PLUGINS.length) * Math.PI * 2,
  y: ((i % 3) - 1) * 0.5,
}))

function PluginNode({
  plugin,
  index,
  positionsRef,
  hovered,
  setHovered,
}: {
  plugin: OrbitingPlugin
  index: number
  positionsRef: React.MutableRefObject<THREE.Vector3[]>
  hovered: number | null
  setHovered: (i: number | null) => void
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const t = useRef(plugin.phase)
  const isHovered = hovered === index

  useFrame((_, delta) => {
    t.current += delta * plugin.speed
    const a = t.current
    const x = Math.cos(a) * plugin.radius
    const z = Math.sin(a) * plugin.radius * Math.cos(plugin.tilt)
    const y = plugin.y + Math.sin(a) * plugin.radius * Math.sin(plugin.tilt) * 0.4
    if (meshRef.current) {
      meshRef.current.position.set(x, y, z)
      meshRef.current.rotation.y += delta * 0.5
      const target = isHovered ? 1.6 : 1
      meshRef.current.scale.lerp(new THREE.Vector3(target, target, target), 0.12)
    }
    if (!positionsRef.current[index]) positionsRef.current[index] = new THREE.Vector3()
    positionsRef.current[index].set(x, y, z)
  })

  return (
    <group>
      <mesh
        ref={meshRef}
        onPointerOver={() => setHovered(index)}
        onPointerOut={() => setHovered(null)}
      >
        <boxGeometry args={[0.38, 0.38, 0.38]} />
        <meshStandardMaterial
          color={plugin.color}
          emissive={plugin.color}
          emissiveIntensity={isHovered ? 2.4 : 1}
          roughness={0.25}
          metalness={0.4}
        />
      </mesh>
      <Html center distanceFactor={13} position={[0, 0.5, 0]}>
        <div
          style={{
            color: isHovered ? plugin.color : '#64748b',
            fontSize: 11,
            fontFamily: 'monospace',
            whiteSpace: 'nowrap',
            textShadow: '0 0 8px rgba(0,0,0,0.9)',
          }}
        >
          {plugin.label}
        </div>
      </Html>
    </group>
  )
}

export default function PluginOrbit() {
  const group = useRef<THREE.Group>(null)
  const coreRef = useRef<THREE.Mesh>(null)
  const positionsRef = useRef<THREE.Vector3[]>([])
  const [hovered, setHovered] = useState<number | null>(null)
  const hoveredPlugin = hovered !== null ? ORBITING[hovered] : null

  const rings = useMemo(
    () => [
      { r: 2.9, tilt: 0.35, color: '#22d3ee' },
      { r: 3.7, tilt: -0.45, color: '#a78bfa' },
    ],
    []
  )

  useFrame((_, delta) => {
    if (coreRef.current) coreRef.current.rotation.y += delta * 0.3
    if (group.current) group.current.rotation.y += delta * 0.05
  })

  return (
    <group ref={group}>
      <ambientLight intensity={0.5} />
      <pointLight position={[4, 4, 4]} intensity={25} color="#22d3ee" />
      <pointLight position={[-4, -2, -4]} intensity={18} color="#a78bfa" />

      <mesh ref={coreRef}>
        <icosahedronGeometry args={[0.8, 1]} />
        <meshStandardMaterial
          color="#22d3ee"
          emissive="#22d3ee"
          emissiveIntensity={1.6}
          roughness={0.25}
          metalness={0.4}
          flatShading
        />
      </mesh>
      <Html center distanceFactor={10} position={[0, -1.25, 0]}>
        <div style={{ color: '#22d3ee', fontSize: 12, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>OpenPly Core</div>
      </Html>

      {rings.map((ring, i) => (
        <mesh key={i} rotation={[Math.PI / 2 + ring.tilt, 0, 0]}>
          <torusGeometry args={[ring.r, 0.006, 8, 100]} />
          <meshBasicMaterial color={ring.color} transparent opacity={0.25} />
        </mesh>
      ))}

      {ORBITING.map((plugin, i) => (
        <PluginNode
          key={plugin.label}
          plugin={plugin}
          index={i}
          positionsRef={positionsRef}
          hovered={hovered}
          setHovered={setHovered}
        />
      ))}

      {hoveredPlugin && (
        <Html center distanceFactor={9} position={[0, 2.2, 0]}>
          <div
            style={{
              background: 'rgba(10,10,20,0.92)',
              border: `1px solid ${hoveredPlugin.color}55`,
              borderRadius: 10,
              padding: '8px 14px',
              fontFamily: 'monospace',
              whiteSpace: 'nowrap',
              boxShadow: '0 8px 30px rgba(0,0,0,0.6)',
            }}
          >
            <div style={{ color: hoveredPlugin.color, fontSize: 13, fontWeight: 700 }}>{hoveredPlugin.label}</div>
            <div style={{ color: '#94a3b8', fontSize: 11 }}>{hoveredPlugin.desc}</div>
          </div>
        </Html>
      )}
    </group>
  )
}
