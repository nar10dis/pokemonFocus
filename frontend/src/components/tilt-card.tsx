"use client"

import { motion, useMotionValue, useReducedMotion, useSpring, useTransform, type HTMLMotionProps } from "motion/react"
import type { PointerEvent } from "react"

/** inclinaison max (degrés), atteinte dans les coins */
const MAX_TILT = 10
const spring = { stiffness: 300, damping: 20 }

/**
 * <li> qui s'incline vers la souris : le coin survolé se soulève.
 * Passe par des motion values : aucun re-rendu React pendant le survol.
 */
export function TiltCard({ tilt = true, style, onPointerMove, onPointerLeave, ...props }: HTMLMotionProps<"li"> & { tilt?: boolean }) {
  const reducedMotion = useReducedMotion()
  // position de la souris dans la carte, de -0.5 (bord gauche/haut) à 0.5 (bord droit/bas)
  const x = useSpring(useMotionValue(0), spring)
  const y = useSpring(useMotionValue(0), spring)
  const rotateX = useTransform(y, (v) => v * 2 * MAX_TILT)
  const rotateY = useTransform(x, (v) => -v * 2 * MAX_TILT)
  const enabled = tilt && !reducedMotion

  function handleMove(e: PointerEvent<HTMLLIElement>) {
    onPointerMove?.(e)
    if (e.pointerType !== "mouse") return
    const rect = e.currentTarget.getBoundingClientRect()
    x.set((e.clientX - rect.left) / rect.width - 0.5)
    y.set((e.clientY - rect.top) / rect.height - 0.5)
  }

  function handleLeave(e: PointerEvent<HTMLLIElement>) {
    onPointerLeave?.(e)
    x.set(0)
    y.set(0)
  }

  if (!enabled) return <motion.li style={style} onPointerMove={onPointerMove} onPointerLeave={onPointerLeave} {...props} />
  return (
    <motion.li
      style={{ ...style, rotateX, rotateY, transformPerspective: 600 }}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
      {...props}
    />
  )
}
