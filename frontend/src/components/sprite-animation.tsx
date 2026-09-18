"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

type SpriteAnimationProps = {
  /** urls des frames, dans l'ordre */
  frames: string[]
  width: number
  height: number
  /** facteur d'agrandissement (pixel art) */
  scale?: number
  fps?: number
  /** fige l'animation sur la première frame */
  paused?: boolean
  alt: string
  className?: string
}

export function SpriteAnimation({
  frames,
  width,
  height,
  scale = 1,
  fps = 8,
  paused = false,
  alt,
  className,
}: SpriteAnimationProps) {
  const [tick, setTick] = useState(0)
  const frame = paused ? 0 : tick % frames.length

  useEffect(() => {
    if (paused) return
    const id = setInterval(() => setTick((t) => t + 1), 1000 / fps)
    return () => clearInterval(id)
  }, [fps, paused])

  // toutes les frames sont montées (préchargées) et on n'affiche que la courante : pas de clignotement
  return (
    <div
      role="img"
      aria-label={alt}
      className={cn("relative", className)}
      style={{ width: width * scale, height: height * scale }}
    >
      {frames.map((src, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={src}
          src={src}
          alt=""
          width={width * scale}
          height={height * scale}
          className={cn(
            "absolute inset-0 size-full [image-rendering:pixelated]",
            i !== frame && "invisible",
          )}
        />
      ))}
    </div>
  )
}
