import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { isMobile } from './SceneCanvas'

const CYAN = '#22d3ee'
const BLUE = '#60a5fa'
const VIOLET = '#a78bfa'
const GREEN = '#4ade80'
const AMBER = '#fbbf24'
const PINK = '#f472b6'

interface OrbitNode {
  label: string
  color: string
  radius: number
  speed: number
  tilt: number
  phase: number
  size: number
}

const NODES: OrbitNode[] = [
  { label: 'agents', color: CYAN, radius: 2.6, speed: 0.35, tilt: 0.4, phase: 0, size: 0.09 },
  { label: 'mcp', color: VIOLET, radius: 3.1, speed: -0.28, tilt: -0.5, phase: 1.1, size: 0.1 },
  { label: 'plugins', color: BLUE, radius: 3.5, speed: 0.22, tilt: 0.9, phase: 2.2, size: 0.08 },
  { label: 'tools', color: GREEN, radius: 2.9, speed: -0.4, tilt: -0.2, phase: 3.1, size: 0.07 },
  { label: 'models', color: PINK, radius: 3.8, speed: 0.18, tilt: 0.6, phase: 4.0, size: 0.08 },
  { label: 'git', color: AMBER, radius: 3.3, speed: -0.32, tilt: -0.75, phase: 5.0, size: 0.07 },
]

function nodePosition(n: OrbitNode, t: number, out: THREE.Vector3): THREE.Vector3 {
  const a = n.phase + t * n.speed
  out.set(
    Math.cos(a) * n.radius,
    Math.sin(a * 1.0) * Math.sin(n.tilt) * n.radius * 0.55,
    Math.sin(a) * n.radius * Math.cos(n.tilt)
  )
  return out
}

function Particles({ count }: { count: number }) {
  const ref = useRef<THREE.Points>(null)
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const c = new THREE.Color()
    for (let i = 0; i < count; i++) {
      const r = 4.5 + Math.random() * 7
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.6
      positions[i * 3 + 2] = r * Math.cos(phi)
      c.set(Math.random() > 0.7 ? VIOLET : CYAN)
      colors[i * 3] = c.r
      colors[i * 3 + 1] = c.g
      colors[i * 3 + 2] = c.b
    }
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    return g
  }, [count])

  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.02
  })

  return (
    <points ref={ref} geometry={geometry}>
      <pointsMaterial size={0.035} vertexColors transparent opacity={0.7} sizeAttenuation depthWrite={false} />
    </points>
  )
}

function OrbitNodeMesh({ node, index, positionsRef }: { node: OrbitNode; index: number; positionsRef: React.MutableRefObject<THREE.Vector3[]> }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const posRef = useRef(new THREE.Vector3())
  const t = useRef(node.phase)

  useFrame((_, delta) => {
    t.current += delta * node.speed
    nodePosition(node, t.current, posRef.current)
    if (meshRef.current) {
      meshRef.current.position.copy(posRef.current)
      const s = 1 + Math.sin(t.current * 3) * 0.15
      meshRef.current.scale.setScalar(s)
    }
    if (!positionsRef.current[index]) positionsRef.current[index] = new THREE.Vector3()
    positionsRef.current[index].copy(posRef.current)
  })

  return (
    <mesh ref={meshRef}>
      <icosahedronGeometry args={[node.size, 1]} />
      <meshStandardMaterial
        color={node.color}
        emissive={node.color}
        emissiveIntensity={2.2}
        roughness={0.3}
        metalness={0.1}
      />
    </mesh>
  )
}

function ConnectionLines({ positionsRef }: { positionsRef: React.MutableRefObject<THREE.Vector3[]> }) {
  const geometries = useMemo(
    () => NODES.map(() => new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()])),
    []
  )

  useFrame(() => {
    const pts = positionsRef.current
    if (pts.length < NODES.length) return
    geometries.forEach((g, i) => {
      const arr = (g.attributes.position as THREE.BufferAttribute).array as Float32Array
      arr[0] = 0; arr[1] = 0; arr[2] = 0
      arr[3] = pts[i].x; arr[4] = pts[i].y; arr[5] = pts[i].z
      g.attributes.position.needsUpdate = true
    })
  })

  return (
    <group>
      {geometries.map((g, i) => (
        <line key={i}>
          <primitive object={g} attach="geometry" />
          <lineBasicMaterial color={NODES[i].color} transparent opacity={0.25} />
        </line>
      ))}
    </group>
  )
}

function DataPulses({ positionsRef }: { positionsRef: React.MutableRefObject<THREE.Vector3[]> }) {
  const refs = useRef<(THREE.Mesh | null)[]>([])
  const progress = useRef(NODES.map((_, i) => i / NODES.length))

  useFrame((_, delta) => {
    const pts = positionsRef.current
    if (pts.length < NODES.length) return
    progress.current = progress.current.map((p, i) => (p + delta * 0.5) % 1)
    progress.current.forEach((p, i) => {
      const mesh = refs.current[i]
      if (!mesh) return
      mesh.position.lerpVectors(new THREE.Vector3(0, 0, 0), pts[i], p)
      const fade = Math.sin(p * Math.PI)
      mesh.scale.setScalar(0.5 + fade * 0.8)
      ;((mesh.material as THREE.MeshBasicMaterial)).opacity = fade
    })
  })

  return (
    <group>
      {NODES.map((n, i) => (
        <mesh key={i} ref={(el) => (refs.current[i] = el)}>
          <sphereGeometry args={[0.035, 8, 8]} />
          <meshBasicMaterial color={n.color} transparent />
        </mesh>
      ))}
    </group>
  )
}

export default function OpenPlyCore() {
  const group = useRef<THREE.Group>(null)
  const coreRef = useRef<THREE.Mesh>(null)
  const shellRef = useRef<THREE.Mesh>(null)
  const nodePositions = useRef<THREE.Vector3[]>([])
  const mouse = useRef({ x: 0, y: 0 })
  const particleCount = isMobile() ? 250 : 700

  useMemo(() => {
    if (typeof window === 'undefined') return
    const handler = (e: MouseEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1
      mouse.current.y = (e.clientY / window.innerHeight) * 2 - 1
    }
    window.addEventListener('mousemove', handler, { passive: true })
    return () => window.removeEventListener('mousemove', handler)
  }, [])

  useFrame((_, delta) => {
    if (coreRef.current) {
      coreRef.current.rotation.y += delta * 0.25
      coreRef.current.rotation.x += delta * 0.1
    }
    if (shellRef.current) {
      shellRef.current.rotation.y -= delta * 0.15
      shellRef.current.rotation.z += delta * 0.08
    }
    if (group.current) {
      const targetY = mouse.current.x * 0.22
      const targetX = -mouse.current.y * 0.12
      group.current.rotation.y += (targetY - group.current.rotation.y) * 0.04
      group.current.rotation.x += (targetX - group.current.rotation.x) * 0.04
    }
  })

  return (
    <group ref={group}>
      <ambientLight intensity={0.4} />
      <pointLight position={[5, 5, 5]} intensity={30} color={CYAN} />
      <pointLight position={[-5, -3, 3]} intensity={20} color={VIOLET} />

      {/* AI core */}
      <mesh ref={coreRef}>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial
          color={CYAN}
          emissive={CYAN}
          emissiveIntensity={1.4}
          roughness={0.25}
          metalness={0.4}
          flatShading
        />
      </mesh>
      <mesh scale={1.6}>
        <icosahedronGeometry args={[1, 1]} />
        <meshBasicMaterial color={CYAN} transparent opacity={0.08} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh ref={shellRef} scale={1.35}>
        <icosahedronGeometry args={[1, 0]} />
        <meshBasicMaterial color={BLUE} wireframe transparent opacity={0.18} />
      </mesh>

      <ConnectionLines positionsRef={nodePositions} />
      {NODES.map((n, i) => (
        <OrbitNodeMesh key={n.label} node={n} index={i} positionsRef={nodePositions} />
      ))}
      <DataPulses positionsRef={nodePositions} />
      <Particles count={particleCount} />
    </group>
  )
}
