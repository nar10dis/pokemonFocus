"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Plus } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import { Loading, PageShell } from "@/components/page-shell"
import { PokemonImage } from "@/components/pokemon-image"
import { ProgressBar } from "@/components/progress-bar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { api, errorMessage, type Pokemon } from "@/lib/api"
import {
  keys,
  useActiveSession,
  useCollection,
  usePokedex,
  useProfile,
  useThemes,
  useWeekSessions,
} from "@/lib/queries"
import { formatMinutes, isSameDay, startOfWeek } from "@/lib/time"
import { cn } from "@/lib/utils"

const REGIONS = ["Kanto", "Johto", "Hoenn", "Sinnoh", "Unys", "Kalos", "Alola", "Galar"]
const PRESETS = [25, 45, 60, 90]
const PREVIEW_SIZE = 14

/** échantillon stable (dépend seulement de la région) */
function sample(list: Pokemon[], n: number) {
  const step = Math.max(1, Math.floor(list.length / n))
  return list.filter((_, i) => i % step === 0).slice(0, n)
}

export default function GoWorkPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const weekStart = useMemo(() => startOfWeek(), [])
  const profile = useProfile()
  const pokedex = usePokedex()
  const collection = useCollection()
  const themes = useThemes()
  const week = useWeekSessions(weekStart)
  const active = useActiveSession()

  const [region, setRegion] = useState<string | null>(null)
  const [themeId, setThemeId] = useState<number | null>(null)
  const [minutes, setMinutes] = useState(25)

  const start = useMutation({
    mutationFn: () =>
      api.startSession({ region: currentRegion, plannedMinutes: minutes, themeId: themeId ?? undefined }),
    onSuccess: (session) => {
      queryClient.setQueryData(keys.activeSession, session)
      router.push("/working")
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  const currentRegion = region ?? profile.data?.favoriteRegion ?? "Kanto"
  const owned = useMemo(() => new Set(collection.data?.map((o) => o.pokemonId)), [collection.data])
  const regionPokemon = useMemo(
    () => pokedex.data?.filter((p) => p.region === currentRegion) ?? [],
    [pokedex.data, currentRegion],
  )

  if (!profile.data || !pokedex.data || !collection.data || !themes.data || !week.data) return <Loading />

  const todayMinutes = week.data
    .filter((s) => s.endedAt && isSameDay(new Date(s.endedAt), new Date()))
    .reduce((sum, s) => sum + s.plannedMinutes, 0)
  const dailyGoal = Math.round(profile.data.weeklyGoalMinutes / 7)
  const left = dailyGoal - todayMinutes
  const regionOwned = regionPokemon.filter((p) => owned.has(p.id)).length
  const validMinutes = minutes >= 5 && minutes <= 240

  return (
    <PageShell title="Go Work !" subtitle="Prépare ta prochaine session de focus.">
      {active.data && (
        <Link href="/working" className="btn-blue rounded-xl px-5 py-4 font-bold">
          Tu as déjà une session en cours · la reprendre ›
        </Link>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Aujourd&apos;hui</CardTitle>
          <CardDescription>
            {left > 0
              ? `Encore ${formatMinutes(left)} pour atteindre ton objectif du jour.`
              : "Objectif du jour atteint, bravo !"}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between">
            <span className="txt font-heading text-xl">{formatMinutes(todayMinutes)}</span>
            <span className="txt text-sm font-semibold">objectif {formatMinutes(dailyGoal)}</span>
          </div>
          <ProgressBar value={todayMinutes} max={dailyGoal} />
          {validMinutes && (
            <p className="txt text-sm font-semibold">
              Après cette session : {formatMinutes(todayMinutes + minutes)}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>1 · Région</CardTitle>
          <CardDescription>Les Pokémon capturés viendront de cette région.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {REGIONS.map((r) => {
              const total = pokedex.data.filter((p) => p.region === r)
              const got = total.filter((p) => owned.has(p.id)).length
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRegion(r)}
                  aria-pressed={r === currentRegion}
                  className={cn(
                    "flex flex-col items-start rounded-xl px-4 py-3 text-left transition-[filter,translate] hover:brightness-105 active:translate-y-[2px]",
                    r === currentRegion ? "btn-orange" : "tile txt",
                  )}
                >
                  <span className="font-heading text-lg">{r}</span>
                  <span className="text-xs font-bold">
                    {got}/{total.length} capturés
                  </span>
                </button>
              )
            })}
          </div>
          <div className="rounded-xl border-2 border-poke-green-dark bg-poke-green-dark/40 p-3">
            <p className="txt mb-2 text-sm font-bold">
              Aperçu de {currentRegion} · {regionOwned}/{regionPokemon.length} capturés
            </p>
            <div className="flex flex-wrap justify-center gap-1">
              {sample(regionPokemon, PREVIEW_SIZE).map((p) => (
                <PokemonImage key={p.id} pokemon={p} size={56} hidden={!owned.has(p.id)} />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>2 · Thème</CardTitle>
            <CardDescription>Sur quoi tu vas bosser ?</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Chip selected={themeId === null} onClick={() => setThemeId(null)}>
              Sans thème
            </Chip>
            {themes.data.map((t) => (
              <Chip key={t.id} selected={themeId === t.id} onClick={() => setThemeId(t.id)} color={t.color}>
                {t.emoji} {t.name}
              </Chip>
            ))}
            <Link
              href="/custom"
              className="txt inline-flex items-center gap-1 rounded-full border-2 border-dashed border-white/70 px-3 py-1.5 text-sm font-bold hover:bg-white/10"
            >
              <Plus className="size-4" /> Créer un thème
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>3 · Durée</CardTitle>
            <CardDescription>Entre 5 min et 4 h.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-2">
            {PRESETS.map((m) => (
              <Chip key={m} selected={minutes === m} onClick={() => setMinutes(m)}>
                {formatMinutes(m)}
              </Chip>
            ))}
            <label className="txt flex items-center gap-2 text-sm font-bold">
              ou
              <Input
                type="number"
                min={5}
                max={240}
                value={minutes}
                onChange={(e) => setMinutes(Number(e.target.value))}
                className="h-9 w-20"
                aria-label="Durée personnalisée en minutes"
              />
              min
            </label>
          </CardContent>
        </Card>
      </div>

      <Button
        size="lg"
        className="h-16 self-center px-12 font-heading text-2xl"
        disabled={!validMinutes || start.isPending || !!active.data}
        onClick={() => start.mutate()}
      >
        {start.isPending ? "Lancement…" : "C'est parti !"}
      </Button>
    </PageShell>
  )
}

function Chip({
  selected,
  onClick,
  color,
  children,
}: {
  selected: boolean
  onClick: () => void
  color?: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      style={color && !selected ? { borderColor: color } : undefined}
      className={cn(
        "rounded-full px-4 py-1.5 text-sm font-bold transition-[filter,translate] hover:brightness-105 active:translate-y-px",
        selected ? "btn-orange" : "tile txt",
      )}
    >
      {children}
    </button>
  )
}
