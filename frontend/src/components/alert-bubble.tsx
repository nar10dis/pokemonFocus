"use client"

import { motion } from "motion/react"
import { cn } from "@/lib/utils"

/** Bulle "!" façon Pokémon, qui apparaît au-dessus du dresseur quand un Pokémon se montre. */
export function AlertBubble({ size = 22, className }: { size?: number; className?: string }) {
  return (
    <motion.div
      initial={{ scale: 0, y: 6 }}
      animate={{ scale: [0, 1.25, 1], y: [6, -2, 0] }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      // centrage par marge (et pas par translate : motion pilote déjà `transform`)
      style={{ width: size, height: size * 1.25, marginLeft: -size / 2 }}
      className={cn(className)}
      role="img"
      aria-label="Un Pokémon apparaît !"
    >
      <svg viewBox="0 0 16 20" width="100%" height="100%" aria-hidden>
        {/* pointe de la bulle, dessinée avant le corps pour que le contour ne le traverse pas */}
        <path
          d="M5 9 H11 L7.5 18 Z"
          fill="#FFFFFF"
          stroke="var(--ink)"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <rect
          x="0.8"
          y="0.8"
          width="14.4"
          height="12.4"
          rx="2.6"
          fill="#FFFFFF"
          stroke="var(--ink)"
          strokeWidth="1.6"
        />
        {/* le point d'exclamation */}
        <rect x="6.7" y="3" width="2.6" height="5" rx="0.6" fill="#D93A3A" />
        <rect x="6.7" y="9" width="2.6" height="2.4" rx="0.6" fill="#D93A3A" />
      </svg>
    </motion.div>
  )
}
