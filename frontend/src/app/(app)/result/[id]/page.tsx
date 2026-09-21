"use client"

import { useQuery } from "@tanstack/react-query"
import { ArrowUp, Sparkles } from "lucide-react"
import { motion } from "motion/react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useMemo } from "react"
import { Loading, PageShell } from "@/components/page-shell"
import { PokemonImage } from "@/components/pokemon-image"
import { ProgressBar } from "@/components/progress-bar"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { api } from "@/lib/api"
import { keys, useProfile, useWeekSessions } from "@/lib/queries"
import { dailyGoalMinutes, formatMinutes, isSameDay, startOfWeek } from "@/lib/time"
import { cn } from "@/lib/utils"

export default function ResultPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const sessionId = Number(id)
  const session = useQuery({ queryKey: keys.session(sessionId), queryFn: () => api.session(sessionId) })
  const weekStart = useMemo(() => startOfWeek(), [])
  const week = useWeekSessions(weekStart)
  const profile = useProfile()

  const status = session.data?.status
  useEffect(() => {
    if (status === "RUNNING" || status === "PAUSED") router.replace("/working")
  }, [status, router])
  useEffect(() => {
    if (session.isError) router.replace("/home")
  }, [session.isError, router])

  if (!session.data || !week.data || !profile.data) return <Loading />
  const s = session.data

  if (s.status === "ABANDONED") {
    return (
      <PageShell title="Session abandonnée" subtitle="Rien n'a été gagné cette fois… la prochaine sera la bonne !">
        <Link href="/go-work" className={cn(buttonVariants({ size: "lg" }), "self-start")}>
          Relancer une session
        </Link>
      </PageShell>
    )
  }

  const todayMinutes = week.data
    .filter((w) => w.endedAt && isSameDay(new Date(w.endedAt), new Date()))
    .reduce((sum, w) => sum + w.plannedMinutes, 0)
  const dailyGoal = dailyGoalMinutes(profile.data.weeklyGoalMinutes, profile.data.workDays)
  const newCount = s.captures.filter((c) => c.isNew).length

  return (
    <PageShell title="Bravo, tu l'as fait !" back={null}>
      <Card>
        <CardHeader>
          <CardTitle>Débrief</CardTitle>
          <CardDescription>
            {s.theme ? `${s.theme.emoji} ${s.theme.name}` : "Session libre"} · {s.region}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Temps de focus" value={formatMinutes(s.plannedMinutes)} />
            <Stat label="Pokémon capturés" value={String(s.captures.length)} />
            <Stat label="Nouveaux" value={String(newCount)} />
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between">
              <span className="txt font-bold">Aujourd&apos;hui : {formatMinutes(todayMinutes)}</span>
              <span className="txt text-sm font-semibold">objectif {formatMinutes(dailyGoal)}</span>
            </div>
            <ProgressBar value={todayMinutes} max={dailyGoal} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tes captures</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {s.captures.map((c, i) => (
              <motion.li
                key={c.id}
                initial={{ opacity: 0, scale: 0.3, rotate: -12 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.3 + i * 0.25 }}
                className="tile relative flex flex-col items-center gap-1 rounded-xl p-3"
              >
                <span
                  className={cn(
                    "absolute top-2 right-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold",
                    c.isNew ? "btn-orange" : "btn-blue",
                  )}
                >
                  {c.isNew ? (
                    <>
                      <Sparkles className="size-3" /> Nouveau
                    </>
                  ) : (
                    <>
                      <ArrowUp className="size-3" /> Niv. {c.levelAfter}
                    </>
                  )}
                </span>
                <PokemonImage pokemon={c.pokemon} size={112} priority />
                <p className="txt text-xs font-bold">#{String(c.pokemon.id).padStart(3, "0")}</p>
                <p className="txt font-heading text-lg">{c.pokemon.name}</p>
              </motion.li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <div className="flex flex-wrap justify-center gap-4">
        <Link href="/home" className={buttonVariants({ size: "lg", variant: "secondary" })}>
          Accueil
        </Link>
        <Link href="/pokemon" className={buttonVariants({ size: "lg", variant: "outline" })}>
          Mes Pokémon
        </Link>
        <Link href="/go-work" className={buttonVariants({ size: "lg" })}>
          Encore une session !
        </Link>
      </div>
    </PageShell>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="tile flex flex-col items-center rounded-xl px-2 py-3 text-center">
      <span className="txt font-heading text-2xl">{value}</span>
      <span className="txt text-xs font-bold">{label}</span>
    </div>
  )
}
