"use client"

import { useState } from "react"
import type { SessionSummary } from "@/lib/api"
import { addDays, formatMinutes, isSameDay } from "@/lib/time"
import { cn } from "@/lib/utils"

const dayShort = new Intl.DateTimeFormat("fr-FR", { weekday: "short" })
const dayLong = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" })

type WeeklyChartProps = {
  weekStart: Date
  sessions: SessionSummary[]
  /** objectif quotidien en minutes (ligne de référence) */
  dailyGoalMinutes: number
}

/** Heures travaillées par jour sur une semaine : une seule série, barres + ligne d'objectif. */
export function WeeklyChart({ weekStart, sessions, dailyGoalMinutes }: WeeklyChartProps) {
  const [hover, setHover] = useState<number | null>(null)
  const today = new Date()

  const days = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStart, i)
    const daySessions = sessions.filter((s) => s.endedAt && isSameDay(new Date(s.endedAt), date))
    return {
      date,
      minutes: daySessions.reduce((sum, s) => sum + s.plannedMinutes, 0),
      count: daySessions.length,
      isToday: isSameDay(date, today),
      isFuture: date > today && !isSameDay(date, today),
    }
  })

  const max = Math.max(60, dailyGoalMinutes, ...days.map((d) => d.minutes)) * 1.15
  const pct = (m: number) => (m / max) * 100

  return (
    <figure className="flex flex-col gap-2">
      <div className="relative h-44 rounded-lg border-2 border-poke-green-dark bg-poke-green-dark/70 px-2 pt-3 shadow-[inset_0_2px_0_rgb(0_0_0/0.15)]">
        {/* ligne d'objectif */}
        <div
          className="pointer-events-none absolute inset-x-2 border-t-2 border-dashed border-white/70"
          style={{ bottom: `${pct(dailyGoalMinutes) * 0.86}%` }}
        >
          <span className="absolute -top-5 right-0 text-xs font-bold text-white [text-shadow:1px_1px_0_var(--bg-dark)]">
            objectif {formatMinutes(dailyGoalMinutes)}
          </span>
        </div>

        <div className="flex h-full items-end gap-1">
          {days.map((d, i) => (
            <div
              key={i}
              className="relative flex h-[86%] flex-1 cursor-default items-end justify-center"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            >
              {d.minutes > 0 && (
                <div
                  className={cn(
                    "w-3/5 max-w-10 rounded-t-[4px] border-2 border-b-0 border-poke-orange-dark bg-linear-to-b from-[var(--orange-light)] via-poke-orange to-[var(--orange-deep)] transition-[filter]",
                    hover === i && "brightness-110",
                  )}
                  style={{ height: `${Math.max(pct(d.minutes), 3)}%` }}
                />
              )}
              {hover === i && (
                <div className="absolute bottom-full z-10 mb-1 w-max rounded-md bg-white px-2 py-1 text-xs text-ink shadow-[0_3px_0_var(--bg-dark)]">
                  <p className="font-bold capitalize">{dayLong.format(d.date)}</p>
                  <p>
                    {d.isFuture ? "à venir" : `${formatMinutes(d.minutes)} · ${d.count} session${d.count > 1 ? "s" : ""}`}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="flex gap-1 px-2">
        {days.map((d, i) => (
          <span
            key={i}
            className={cn(
              "flex-1 text-center text-xs font-bold capitalize txt",
              d.isToday ? "text-white underline underline-offset-4" : "opacity-85",
            )}
          >
            {dayShort.format(d.date).replace(".", "")}
          </span>
        ))}
      </div>
      {/* vue tableau pour les lecteurs d'écran */}
      <table className="sr-only">
        <caption>Temps de travail par jour cette semaine</caption>
        <tbody>
          {days.map((d, i) => (
            <tr key={i}>
              <th scope="row">{dayLong.format(d.date)}</th>
              <td>{formatMinutes(d.minutes)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}
