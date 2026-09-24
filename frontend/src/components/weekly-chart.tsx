"use client"

import { useState } from "react"
import type { SessionSummary } from "@/lib/api"
import { addDays, DEFAULT_WORK_DAYS, formatMinutes, isoDay, isSameDay } from "@/lib/time"
import { cn } from "@/lib/utils"

const dayShort = new Intl.DateTimeFormat("fr-FR", { weekday: "short" })
const dayLong = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" })

/** 150 → "2h30", 120 → "2h", 45 → "45m" — assez court pour tenir au-dessus d'une barre */
function shortMinutes(total: number) {
  const m = Math.round(total)
  const h = Math.floor(m / 60)
  const r = m % 60
  if (h === 0) return `${r}m`
  return r === 0 ? `${h}h` : `${h}h${String(r).padStart(2, "0")}`
}

type WeeklyChartProps = {
  weekStart: Date
  sessions: SessionSummary[]
  /** objectif quotidien en minutes (ligne de référence) */
  dailyGoalMinutes: number
  /** jours travaillés, en numéros ISO (1 = lundi … 7 = dimanche) */
  workDays?: number[]
}

/** Heures travaillées par jour sur une semaine : barres + ligne d'objectif, jours de repos estompés. */
export function WeeklyChart({
  weekStart,
  sessions,
  dailyGoalMinutes,
  workDays = DEFAULT_WORK_DAYS,
}: WeeklyChartProps) {
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
      isWorkDay: workDays.includes(isoDay(date)),
    }
  })

  // 15 % de marge au-dessus pour laisser respirer les étiquettes de valeur
  const max = Math.max(60, dailyGoalMinutes, ...days.map((d) => d.minutes)) * 1.15
  const pct = (m: number) => (m / max) * 100

  return (
    <figure className="flex flex-col gap-2.5" aria-label="Semaine en cours">
      <div className="rounded-xl border-2 border-poke-green-dark bg-poke-green-dark/50 p-3 shadow-[inset_0_2px_0_rgb(0_0_0/0.12)]">
        <div className="relative h-40">
          {/* grille horizontale */}
          {[0.25, 0.5, 0.75, 1].map((r) => (
            <div
              key={r}
              className="pointer-events-none absolute inset-x-0 border-t border-white/12"
              style={{ bottom: `${r * 100}%` }}
            />
          ))}

          {/* ligne d'objectif quotidien */}
          <div
            className="pointer-events-none absolute inset-x-0 z-10 border-t-2 border-dashed border-white/80"
            style={{ bottom: `${pct(dailyGoalMinutes)}%` }}
          >
            <span className="absolute -top-2.5 right-0 rounded-full bg-white px-2 py-px text-[10px] font-bold text-ink shadow-[0_2px_0_var(--bg-dark)]">
              objectif {formatMinutes(dailyGoalMinutes)}
            </span>
          </div>

          {/* colonnes */}
          <div className="absolute inset-0 flex items-end gap-1.5">
            {days.map((d, i) => (
              <div
                key={i}
                className="relative h-full flex-1 cursor-default"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              >
                <div className="absolute inset-y-0 left-1/2 w-3/5 max-w-10 -translate-x-1/2">
                  {/* piste : rappelle la hauteur disponible, estompée les jours de repos */}
                  <div
                    className={cn(
                      "absolute inset-0 rounded-t-md",
                      d.isWorkDay ? "bg-white/10" : "bg-white/4",
                      d.isToday && "bg-white/20 ring-2 ring-white/40",
                    )}
                  />
                  {d.minutes > 0 && (
                    <>
                      <div
                        className={cn(
                          "absolute inset-x-0 bottom-0 rounded-t-md border-2 border-b-0 transition-[filter]",
                          d.isWorkDay
                            ? "border-poke-yellow-dark bg-linear-to-b from-[var(--yellow-light)] via-poke-yellow to-[var(--yellow-deep)]"
                            : "border-poke-blue-dark bg-linear-to-b from-[var(--blue-light)] via-poke-blue to-[var(--blue-deep)]",
                          hover === i && "brightness-110",
                        )}
                        style={{ height: `${Math.max(pct(d.minutes), 4)}%` }}
                      />
                      <span
                        className="pointer-events-none absolute inset-x-0 text-center text-[10px] leading-none font-bold text-white [text-shadow:1px_1px_0_var(--bg-dark)]"
                        style={{ bottom: `calc(${Math.max(pct(d.minutes), 4)}% + 4px)` }}
                      >
                        {shortMinutes(d.minutes)}
                      </span>
                    </>
                  )}
                </div>

                {hover === i && (
                  <div className="absolute bottom-full left-1/2 z-20 mb-1 w-max -translate-x-1/2 rounded-md bg-white px-2 py-1 text-xs text-ink shadow-[0_3px_0_var(--bg-dark)]">
                    <p className="font-bold capitalize">{dayLong.format(d.date)}</p>
                    <p>
                      {d.isFuture
                        ? "à venir"
                        : `${formatMinutes(d.minutes)} · ${d.count} session${d.count > 1 ? "s" : ""}`}
                      {!d.isWorkDay && " · repos"}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* ligne de base */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 border-t-2 border-white/45" />
        </div>
      </div>

      <div className="flex gap-1.5">
        {days.map((d, i) => (
          <span key={i} className="flex flex-1 justify-center">
            <span
              className={cn(
                "txt rounded-full px-2 py-0.5 text-xs font-bold capitalize",
                d.isToday && "bg-white/25",
                !d.isWorkDay && !d.isToday && "opacity-45",
              )}
            >
              {dayShort.format(d.date).replace(".", "")}
            </span>
          </span>
        ))}
      </div>

      {/* vue tableau pour les lecteurs d'écran */}
      <table className="sr-only">
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
