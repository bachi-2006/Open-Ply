import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

type Variant = 'up' | 'scale' | 'left' | 'right' | 'zoom' | 'blur'

const VARIANTS: Record<Variant, { initial: any; animate: any }> = {
  up: { initial: { opacity: 0, y: 28 }, animate: { opacity: 1, y: 0 } },
  scale: { initial: { opacity: 0, scale: 0.92 }, animate: { opacity: 1, scale: 1 } },
  left: { initial: { opacity: 0, x: -36 }, animate: { opacity: 1, x: 0 } },
  right: { initial: { opacity: 0, x: 36 }, animate: { opacity: 1, x: 0 } },
  zoom: { initial: { opacity: 0, scale: 1.06 }, animate: { opacity: 1, scale: 1 } },
  blur: { initial: { opacity: 0, y: 18, filter: 'blur(8px)' }, animate: { opacity: 1, y: 0, filter: 'blur(0px)' } },
}

interface Props {
  children: ReactNode
  delay?: number
  y?: number
  className?: string
  variant?: Variant
  duration?: number
}

export default function Reveal({ children, delay = 0, y, className, variant = 'up', duration = 0.65 }: Props) {
  const v = VARIANTS[variant]
  const initial = y !== undefined && variant === 'up' ? { ...v.initial, y } : v.initial

  return (
    <motion.div
      initial={initial}
      whileInView={v.animate}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
