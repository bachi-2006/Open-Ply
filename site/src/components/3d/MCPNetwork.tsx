import { useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'

const TOOLS = [
  { label: 'Browser', color: '#60a5fa' },
  { label: 'Filesystem', color: '#22d3ee' },
  { label: 'Git', color: '#fbbf24' },
  { label: 'Terminal', color: '#4ade80' },
  { label: 'Database', color: '#a78bfa' },
  { label: 'APIs', color: '#f472b6' },
  { label: 'Custom Tools', color: '#38bdf8' },
]

const RADIUS = 3.2

function toolPos(i: number, out: THREE.Vector3): THREE.Vector3 {
  const a = (i / TOOLS.length) * Math.PI * 2 + Math.PI / 2
  out.set(Math.cos(a) * RADIUS, Math.sin(i * 1.7) * 0.7, Math.sin(a) * RADIUS * 0.6)
  return out
}

function Packet({ index, positionsRef }: { index: number; positionsRef: React.MutableRefObject<THREE.Vector3[]> }) {
  const ref = useRef<THREE.Mesh>(null)
  const t = useRef(index / TOOLS.length)

  useFrame((_, delta) => {
    const pos = positionsRef.current[index]
    if (!pos || !ref.current) return
    t.current = (t.current + delta * 0.4) % 1
    ref.current.position.lerpVectors(new THREE.Vector3(0, 0, 0), pos, t.current)
    const fade = Math.sin(t.current * Math.PI)
    ref.current.scale.setScalar(0.6 + fade * 0.7)
  })

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.06, 8, 8]} />
      <meshBasicMaterial color={TOOLS[index].color} transparent opacity={0.9} />
    </mesh>
  )
}

export default function MCPNetwork() {
  const group = useRef<THREE.Group>(null)
  const positionsRef = useRef<THREE.Vector3[]>([])
  const [hovered, setHovered] = useState<number | null>(null)

  const lineGeometries = useMemo(
    () =>
      TOOLS.map(() => {
        const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()])
        return g
      }),
    []
  )

  useFrame((state, delta) => {
    TOOLS.forEach((_, i) => {
      if (!positionsRef.current[i]) positionsRef.current[i] = new THREE.Vector3()
      toolPos(i, positionsRef.current[i])
    })
    lineGeometries.forEach((g, i) => {
      const arr = (g.attributes.position as THREE.BufferAttribute).array as Float32Array
      const p = positionsRef.current[i]
      if (!p) return
      arr[3] = p.x; arr[4] = p.y; arr[5] = p.z
      g.attributes.position.needsUpdate = true
    })
    if (group.current) {
      group.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.15) * 0.25
    }
    void delta
  })

  return (
    <group ref={group}>
      <ambientLight intensity={0.5} />
      <pointLight position={[4, 4, 4]} intensity={25} color="#22d3ee" />

      {/* Central MCP server */}
      <mesh>
        <octahedronGeometry args={[0.85, 0]} />
        <meshStandardMaterial
          color="#22d3ee"
          emissive="#22d3ee"
          emissiveIntensity={hovered !== null ? 1.2 : 1.8}
          roughness={0.2}
          metalness={0.5}
          flatShading
        />
      </mesh>
      <Html center distanceFactor={10} position={[0, -1.4, 0]}>
        <div style={{ color: '#22d3ee', fontSize: 12, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>OpenPly MCP</div>
      </Html>

      {TOOLS.map((tool, i) => {
        const pos = positionsRef.current[i] || toolPos(i, new THREE.Vector3())
        const isHovered = hovered === i
        return (
          <group key={tool.label} position={pos}>
            <mesh
              scale={isHovered ? 1.5 : 1}
              onPointerOver={() => setHovered(i)}
              onPointerOut={() => setHovered(null)}
            >
              <boxGeometry args={[0.32, 0.32, 0.32]} />
              <meshStandardMaterial
                color={tool.color}
                emissive={tool.color}
                emissiveIntensity={isHovered ? 2.5 : 1.2}
                roughness={0.3}
              />
            </mesh>
            <Html center distanceFactor={12} position={[0, 0.45, 0]}>
              <div
                style={{
                  color: isHovered ? tool.color : '#94a3b8',
                  fontSize: 11,
                  fontFamily: 'monospace',
                  whiteSpace: 'nowrap',
                  textShadow: '0 0 8px rgba(0,0,0,0.8)',
                }}
              >
                {tool.label}
              </div>
            </Html>
          </group>
        )
      })}

      {lineGeometries.map((g, i) => (
        <line key={i}>
          <primitive object={g} attach="geometry" />
          <lineBasicMaterial
            color={TOOLS[i].color}
            transparent
            opacity={hovered === null ? 0.3 : hovered === i ? 0.9 : 0.12}
          />
        </line>
      ))}

      {TOOLS.map((_, i) => (
        <Packet key={i} index={i} positionsRef={positionsRef} />
      ))}
    </group>
  )
}
