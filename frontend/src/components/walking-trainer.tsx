"use client"

import { AnimatePresence, useAnimate } from "motion/react"
import { useEffect, useRef, useState } from "react"
import { AlertBubble } from "@/components/alert-bubble"
import { SpriteAnimation } from "@/components/sprite-animation"

type Dir = "down" | "left" | "right" | "up"

// promenade en rectangle : chaque étape = direction + point d'arrivée (px)
const LEGS: { dir: Dir; x: number; y: number }[] = [
  { dir: "right", x: 44, y: -26 },
  { dir: "down", x: 44, y: 18 },
  { dir: "left", x: -44, y: 18 },
  { dir: "up", x: -44, y: -26 },
]
const START = LEGS[LEGS.length - 1]
const LEG_SECONDS = [3, 1.6, 3, 1.6]
const TOTAL = LEG_SECONDS.reduce((a, b) => a + b, 0)
const TIMES = LEG_SECONDS.reduce<number[]>((acc, s) => [...acc, acc[acc.length - 1] + s / TOTAL], [0])

const frames = (dir: Dir) =>
  [0, 1, 2, 3].map((i) => `/sprites/trainers/ethan/overworld/walk/${dir}-${i}.png`)

/** Ethan qui se balade en boucle ; s'arrête sur place quand `paused`. */
export function WalkingTrainer({
  paused,
  alert = false,
  scale = 2,
}: {
  paused: boolean
  /** affiche la bulle "!" au-dessus de sa tête (un Pokémon se montre) */
  alert?: boolean
  scale?: number
}) {
  const [scope, animate] = useAnimate<HTMLDivElement>()
  const controls = useRef<ReturnType<typeof animate> | null>(null)
  const [leg, setLeg] = useState(0)

  useEffect(() => {
    controls.current = animate(
      scope.current,
      { x: [START.x, ...LEGS.map((l) => l.x)], y: [START.y, ...LEGS.map((l) => l.y)] },
      { duration: TOTAL, times: TIMES, ease: "linear", repeat: Infinity },
    )
    const id = setInterval(() => {
      const t = ((controls.current?.time ?? 0) % TOTAL) / TOTAL
      setLeg(Math.max(0, TIMES.findIndex((v) => v > t) - 1))
    }, 100)
    return () => {
      clearInterval(id)
      controls.current?.stop()
    }
  }, [animate, scope])

  useEffect(() => {
    if (paused) controls.current?.pause()
    else controls.current?.play()
  }, [paused])

  const dir = paused ? "down" : LEGS[leg].dir
  return (
    <div ref={scope} className="relative">
      <AnimatePresence>
        {alert && <AlertBubble className="absolute bottom-full left-1/2 z-10 -mb-3" />}
      </AnimatePresence>
      {(["down", "left", "right", "up"] as Dir[]).map((d) => (
        <SpriteAnimation
          key={d}
          frames={frames(d)}
          width={32}
          height={40}
          scale={scale}
          fps={6}
          paused={paused}
          alt={d === dir ? "Ethan se balade" : ""}
          className={d === dir ? "" : "hidden"}
        />
      ))}
    </div>
  )
}
