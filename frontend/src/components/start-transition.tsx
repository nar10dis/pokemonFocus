"use client"

import { animate, motion, useMotionTemplate, useMotionValue } from "motion/react"
import { useEffect } from "react"

/**
 * Transition du bouton « C'est parti ! » vers la session :
 * un disque noir grossit depuis le bouton jusqu'à couvrir l'écran (CoverFrom),
 * puis la page suivante se découvre en iris depuis le centre (IrisReveal).
 */
const COLOR = "#000000"
const EASE = [0.65, 0, 0.35, 1] as const

/** date limite pour jouer l'iris sur la page suivante (survit à la navigation côté client) */
let revealUntil = 0

export const shouldReveal = () => Date.now() < revealUntil

export function CoverFrom({ from, onCovered }: { from: DOMRect; onCovered: () => void }) {
  const cx = from.left + from.width / 2
  const cy = from.top + from.height / 2
  // rayon qui atteint le coin de l'écran le plus éloigné du bouton
  const r = Math.hypot(Math.max(cx, window.innerWidth - cx), Math.max(cy, window.innerHeight - cy))

  return (
    <motion.div
      className="fixed z-50 rounded-full"
      style={{ left: cx - r, top: cy - r, width: r * 2, height: r * 2, background: COLOR }}
      initial={{ scale: from.height / 2 / r }}
      animate={{ scale: 1 }}
      transition={{ duration: 0.5, ease: EASE }}
      onAnimationComplete={() => {
        revealUntil = Date.now() + 3000
        onCovered()
      }}
    />
  )
}

export function IrisReveal({ onDone }: { onDone: () => void }) {
  const radius = useMotionValue(0)
  const mask = useMotionTemplate`radial-gradient(circle at 50% 50%, transparent ${radius}px, black calc(${radius}px + 1px))`

  useEffect(() => {
    const max = Math.hypot(window.innerWidth, window.innerHeight) / 2
    const controls = animate(radius, max, {
      duration: 0.6,
      delay: 0.1,
      ease: EASE,
      onComplete: () => {
        revealUntil = 0
        onDone()
      },
    })
    return () => controls.stop()
  }, [radius, onDone])

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-50"
      style={{ background: COLOR, maskImage: mask, WebkitMaskImage: mask }}
    />
  )
}
