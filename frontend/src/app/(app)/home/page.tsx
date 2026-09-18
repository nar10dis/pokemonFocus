"use client"

import { BookOpen, Hourglass, Sparkles, Users, Wrench } from "lucide-react"
import { motion } from "motion/react"
import Link from "next/link"
import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loading, PageShell } from "@/components/page-shell"
import { ProgressBar } from "@/components/progress-bar"
import { SpriteAnimation } from "@/components/sprite-animation"
import { WeeklyChart } from "@/components/weekly-chart"
import { useActiveSession, useFriendRequests, useProfile, useWeekSessions } from "@/lib/queries"
import { formatClock, formatMinutes, startOfWeek } from "@/lib/time"
import { cn } from "@/lib/utils"

const ethanWalk = ["down-0", "down-1", "down-2", "down-3"].map(
  (f) => `/sprites/trainers/ethan/overworld/walk/${f}.png`,
)

export default function HomePage() {
  const weekStart = useMemo(() => startOfWeek(), [])
  const profile = useProfile()
  const week = useWeekSessions(weekStart)
  const active = useActiveSession()
  const requests = useFriendRequests()

  if (!profile.data || !week.data) return <Loading />
  const { username, title, weeklyGoalMinutes } = profile.data
  const weekMinutes = week.data.reduce((sum, s) => sum + s.plannedMinutes, 0)
  const pending = requests.data?.incoming.length ?? 0

  return (
    <PageShell title={`Salut ${username} !`} subtitle={title} back={null}>
      {active.data && (
        <Link
          href="/working"
          className="btn-blue flex items-center justify-between gap-4 rounded-xl px-5 py-4 transition-[filter] hover:brightness-105"
        >
          <span className="flex items-center gap-3 font-bold">
            <Hourglass className="size-5" /> Session en cours · {active.data.region}
            {active.data.status === "PAUSED" && " (en pause)"}
          </span>
          <span className="font-heading text-lg">
            {formatClock(active.data.plannedMinutes * 60_000 - active.data.elapsedMs)} ›
          </span>
        </Link>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Ta semaine</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between gap-2">
                <span className="txt font-heading text-xl">{formatMinutes(weekMinutes)}</span>
                <span className="txt text-sm font-semibold">objectif {formatMinutes(weeklyGoalMinutes)}</span>
              </div>
              <ProgressBar value={weekMinutes} max={weeklyGoalMinutes} />
            </div>
            <WeeklyChart
              weekStart={weekStart}
              sessions={week.data}
              dailyGoalMinutes={Math.round(weeklyGoalMinutes / 7)}
            />
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <BigLink href="/go-work" variant="orange" delay={0.1}>
            <SpriteAnimation frames={ethanWalk} width={32} height={40} scale={2} fps={5} alt="" />
            <span>
              Go Work !
              <small className="block font-sans text-sm font-semibold">Lance une session de focus</small>
            </span>
          </BigLink>
          <BigLink href="/custom" variant="blue" delay={0.18}>
            <Wrench className="size-10" />
            <span>
              Custom
              <small className="block font-sans text-sm font-semibold">Thèmes & objectifs</small>
            </span>
          </BigLink>
          <div className="grid grid-cols-2 gap-4">
            <SmallLink href="/pokemon" icon={BookOpen} label="Mes Pokémon" delay={0.26} />
            <SmallLink href="/friends" icon={Users} label="Amis" delay={0.32} badge={pending} />
          </div>
        </div>
      </div>
    </PageShell>
  )
}

function BigLink({
  href,
  variant,
  delay,
  children,
}: {
  href: string
  variant: "orange" | "blue"
  delay: number
  children: React.ReactNode
}) {
  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay }}>
      <Link
        href={href}
        className={cn(
          variant === "orange" ? "btn-orange" : "btn-blue",
          "flex min-h-28 items-center gap-5 rounded-2xl px-6 py-4 font-heading text-2xl transition-[filter,translate] hover:brightness-105 active:translate-y-[3px]",
        )}
      >
        {children}
      </Link>
    </motion.div>
  )
}

function SmallLink({
  href,
  icon: Icon,
  label,
  delay,
  badge = 0,
}: {
  href: string
  icon: typeof Sparkles
  label: string
  delay: number
  badge?: number
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}>
      <Link
        href={href}
        className="tile txt relative flex flex-col items-center gap-2 rounded-xl px-3 py-4 font-bold transition-[filter,translate] hover:brightness-105 active:translate-y-[2px]"
      >
        <Icon className="size-7 drop-shadow-[2px_2px_0_var(--bg-dark)]" />
        {label}
        {badge > 0 && (
          <span className="btn-orange absolute -top-2 -right-2 flex size-7 items-center justify-center rounded-full text-sm">
            {badge}
          </span>
        )}
      </Link>
    </motion.div>
  )
}
