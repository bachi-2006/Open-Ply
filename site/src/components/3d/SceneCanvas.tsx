import { Suspense, useMemo, useRef, type ReactNode } from 'react'
import { Canvas } from '@react-three/fiber'
import { useInView } from 'framer-motion'

let webglSupported: boolean | null = null
function hasWebGL(): boolean {
  if (webglSupported !== null) return webglSupported
  try {
    const c = document.createElement('canvas')
    webglSupported = Boolean(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    webglSupported = false
  }
  return webglSupported
}

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function isMobile(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches
}

interface Props {
  children: ReactNode
  camera?: { position: [number, number, number]; fov?: number }
  className?: string
  fallback?: ReactNode
  dprMax?: number
}

export default function SceneCanvas({ children, camera, className, fallback, dprMax = 1.75 }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { margin: '250px' })
  const supported = useMemo(hasWebGL, [])
  const reduced = useMemo(prefersReducedMotion, [])

  if (!supported || reduced) {
    return (
      <div ref={ref} className={className} aria-hidden="true">
        {fallback}
      </div>
    )
  }

  return (
    <div ref={ref} className={className} aria-hidden="true">
      {inView ? (
        <Canvas
          dpr={[1, dprMax]}
          camera={camera}
          gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        >
          <Suspense fallback={null}>{children}</Suspense>
        </Canvas>
      ) : (
        fallback
      )}
    </div>
  )
}
