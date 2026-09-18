"use client"

import { motion } from "motion/react"

type AuthShellProps = {
  children: React.ReactNode
  /** décor affiché de chaque côté de la card (grands écrans uniquement) */
  left?: React.ReactNode
  right?: React.ReactNode
}

function Side({ children, delay }: { children: React.ReactNode; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1, y: [0, -14, 0] }}
      transition={{
        opacity: { duration: 0.6, delay },
        scale: { duration: 0.6, delay },
        y: { duration: 3, repeat: Infinity, ease: "easeInOut", delay },
      }}
      className="hidden shrink-0 drop-shadow-[4px_4px_0_var(--bg-dark)] lg:block"
    >
      {children}
    </motion.div>
  )
}

export function AuthShell({ children, left, right }: AuthShellProps) {
  return (
    <main className="flex flex-1 w-full flex-col items-center justify-center gap-8 p-6 md:p-10">
      <motion.div
        initial={{ opacity: 0, y: -24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        className="text-center"
      >
        <h1 className="txt text-3xl md:text-4xl [text-shadow:3px_3px_0_var(--bg-dark)]">
          Pokemon Focus
        </h1>
        <p className="txt mt-2 text-lg font-semibold">
          Reste concentré, dresseur.
        </p>
      </motion.div>
      <div className="flex w-full items-center justify-center gap-12 xl:gap-20">
        {left && <Side delay={0.3}>{left}</Side>}
        <motion.div
          initial={{ opacity: 0, y: 32, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 220, damping: 22, delay: 0.1 }}
          className="w-full max-w-sm"
        >
          {children}
        </motion.div>
        {right && <Side delay={1.5}>{right}</Side>}
      </div>
    </main>
  )
}
