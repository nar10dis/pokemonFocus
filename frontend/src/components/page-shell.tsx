"use client"

import { ArrowLeft } from "lucide-react"
import { motion } from "motion/react"
import Link from "next/link"
import { cn } from "@/lib/utils"

type PageShellProps = {
  title: string
  subtitle?: string
  /** lien retour (par défaut : accueil). null = pas de lien */
  back?: { href: string; label: string } | null
  actions?: React.ReactNode
  className?: string
  children: React.ReactNode
}

export function PageShell({
  title,
  subtitle,
  back = { href: "/home", label: "Accueil" },
  actions,
  className,
  children,
}: PageShellProps) {
  return (
    <main className={cn("mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8 md:px-6", className)}>
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-end justify-between gap-4"
      >
        <div>
          {back && (
            <Link
              href={back.href}
              className="txt mb-2 inline-flex items-center gap-1 text-sm font-bold hover:underline"
            >
              <ArrowLeft className="size-4" /> {back.label}
            </Link>
          )}
          <h1 className="txt text-2xl md:text-3xl [text-shadow:3px_3px_0_var(--bg-dark)]">{title}</h1>
          {subtitle && <p className="txt mt-1 font-semibold">{subtitle}</p>}
        </div>
        {actions}
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="flex flex-col gap-6"
      >
        {children}
      </motion.div>
    </main>
  )
}

export function Loading({ label = "Chargement…" }: { label?: string }) {
  return (
    <div className="flex flex-1 items-center justify-center py-20">
      <p className="txt animate-pulse font-heading text-xl">{label}</p>
    </div>
  )
}
