"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  CalendarDays,
  Clock,
  Crown,
  Flame,
  Hourglass,
  IdCard,
  Lock,
  LogOut,
  Mail,
  Map,
  Pencil,
  Sparkles,
  Swords,
  Trophy,
  Users,
} from "lucide-react"
import { motion } from "motion/react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
import { Loading, PageShell } from "@/components/page-shell"
import { PokemonImage } from "@/components/pokemon-image"
import { SimpleSelect } from "@/components/simple-select"
import { AvatarDialog } from "@/components/avatar-dialog"
import { TrainerAvatar } from "@/components/trainer-avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { api, authApi, errorMessage, type TitleWord, type UserStats } from "@/lib/api"
import { keys, useFriends, usePokedex, useProfile, useTitles } from "@/lib/queries"
import { isVisibleRegion, REGIONS } from "@/lib/regions"
import { dateFormat, dateTimeFormat, formatMinutes, timeAgo } from "@/lib/time"
import { cn } from "@/lib/utils"
import { PokeButton } from "@/components/poke-button"

const NONE = "none"

export default function ProfilePage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const profile = useProfile()
  const pokedex = usePokedex()
  const friends = useFriends()

  const update = useMutation({
    mutationFn: api.updateProfile,
    onSuccess: (p) => queryClient.setQueryData(keys.profile, p),
    onError: (err) => toast.error(errorMessage(err)),
  })

  async function logout() {
    await authApi.logout().catch(() => {})
    queryClient.clear()
    router.replace("/")
  }

  if (!profile.data || !pokedex.data) return <Loading />
  const p = profile.data
  const s = p.stats
  /** une région masquée est traitée comme "pas encore choisie" */
  const favoriteRegion =
    p.favoriteRegion && isVisibleRegion(p.favoriteRegion) ? p.favoriteRegion : null

  const info = [
    { icon: IdCard, label: "ID Dresseur", value: `#${String(p.id).padStart(5, "0")}` },
    { icon: Mail, label: "Email", value: p.email },
    { icon: CalendarDays, label: "Inscrit le", value: dateFormat.format(new Date(p.createdAt)) },
    {
      icon: Clock,
      label: "Dernière connexion",
      value: p.lastLoginAt ? dateTimeFormat.format(new Date(p.lastLoginAt)) : "—",
    },
  ]
  const stats = [
    {
      icon: Flame,
      label: "Série (jours travaillés)",
      value: p.streakDays > 1 ? `${p.streakDays} jours` : `${p.streakDays} jour`,
    },
    { icon: Hourglass, label: "Temps de focus", value: formatMinutes(s.totalMinutes) },
    { icon: Swords, label: "Sessions", value: String(s.sessions) },
    { icon: Sparkles, label: "Captures", value: String(s.captures) },
    {
      icon: Trophy,
      label: "Espèces",
      value: `${s.species} / ${pokedex.data.filter((p) => isVisibleRegion(p.region)).length}`,
    },
    { icon: Crown, label: "Légendaires", value: String(s.legendaries) },
    { icon: Sparkles, label: "Fabuleux", value: String(s.mythicals) },
  ]

  return (
    <PageShell
      title="Carte Dresseur"
      actions={
        <PokeButton color="red" onClick={logout}>
          <LogOut data-icon="inline-start" /> Déconnexion
        </PokeButton>
      }
    >
      <Card>
        <CardContent className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center gap-4">
            <AvatarDialog profile={p} />
            <div className="min-w-0 flex-1">
              <h2 className="txt truncate text-2xl [text-shadow:3px_3px_0_var(--bg-dark)]">{p.username}</h2>
              <div className="flex items-center gap-2">
                <p className="txt text-lg font-bold">{p.title}</p>
                <TitleDialog current={{ noun: p.titleNoun, adjective: p.titleAdjective }} />
              </div>
            </div>
          </div>

          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {info.map((i, idx) => (
              <InfoTile key={i.label} {...i} index={idx} />
            ))}
            <li className="tile flex items-center gap-3 rounded-lg p-3">
              <Map className="size-6 shrink-0 text-white drop-shadow-[2px_2px_0_var(--bg-dark)]" />
              <div className="min-w-0 flex-1">
                <p className="txt mb-1 text-xs font-bold uppercase">Région favorite</p>
                <SimpleSelect
                  label="Région favorite"
                  value={favoriteRegion ?? NONE}
                  onChange={(v) => v !== NONE && update.mutate({ favoriteRegion: v })}
                  options={[
                    ...(favoriteRegion ? [] : [{ value: NONE, label: "Choisir…" }]),
                    ...REGIONS.map((r) => ({ value: r, label: r })),
                  ]}
                  className="h-9"
                />
              </div>
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Statistiques</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {stats.map((i, idx) => (
              <InfoTile key={i.label} {...i} index={idx} />
            ))}
          </ul>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Mes 6 favoris</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <ul className="grid grid-cols-3 gap-3">
              {Array.from({ length: 6 }, (_, i) => {
                const fav = p.favorites.find((f) => f.favoriteSlot === i + 1)
                return (
                  <li
                    key={i}
                    className={cn(
                      "flex aspect-square flex-col items-center justify-center rounded-xl p-2",
                      fav ? "tile" : "border-2 border-dashed border-white/50",
                    )}
                  >
                    {fav ? (
                      <>
                        <PokemonImage pokemon={fav.pokemon} size={72} />
                        <p className="txt truncate text-xs font-bold">
                          {fav.pokemon.name} · Niv. {fav.level}
                        </p>
                      </>
                    ) : (
                      <span className="txt text-2xl opacity-60">?</span>
                    )}
                  </li>
                )
              })}
            </ul>
            <Link href="/pokemon" className="txt self-end text-sm font-bold underline underline-offset-4">
              Choisir mes favoris dans Mes Pokémon ›
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Amis</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {friends.data?.length ? (
              <ul className="flex flex-col gap-2">
                {friends.data.slice(0, 6).map((f) => (
                  <li key={f.id} className="tile flex items-center gap-3 rounded-lg px-3 py-2">
                    <TrainerAvatar user={f} />
                    <div className="min-w-0 flex-1">
                      <p className="txt truncate font-bold">{f.username}</p>
                      <p className="txt truncate text-xs font-semibold opacity-90">
                        Vu {timeAgo(f.lastLoginAt)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="txt text-sm font-semibold">Pas encore d&apos;amis.</p>
            )}
            <Link href="/friends" className="txt inline-flex items-center gap-1 self-end text-sm font-bold underline underline-offset-4">
              <Users className="size-4" /> Gérer mes amis ›
            </Link>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  )
}

function InfoTile({
  icon: Icon,
  label,
  value,
  index,
}: {
  icon: typeof Mail
  label: string
  value: string
  index: number
}) {
  return (
    <motion.li
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.05 }}
      className="tile flex items-center gap-3 rounded-lg p-3"
    >
      <Icon className="size-6 shrink-0 text-white drop-shadow-[2px_2px_0_var(--bg-dark)]" />
      <div className="min-w-0">
        <p className="txt text-xs font-bold uppercase">{label}</p>
        <p className="txt truncate font-semibold">{value}</p>
      </div>
    </motion.li>
  )
}

function requirementLabel(r: { stat: keyof UserStats; min: number }) {
  switch (r.stat) {
    case "totalMinutes":
      return `${formatMinutes(r.min)} de focus`
    case "sessions":
      return `${r.min} sessions`
    case "captures":
      return `${r.min} captures`
    case "species":
      return `${r.min} espèces`
    case "legendaries":
      return r.min > 1 ? `${r.min} légendaires` : "1 légendaire"
    case "mythicals":
      return "1 fabuleux"
  }
}

function TitleDialog({ current }: { current: { noun: string | null; adjective: string | null } }) {
  const queryClient = useQueryClient()
  const titles = useTitles()
  const [open, setOpen] = useState(false)
  const [noun, setNoun] = useState<string | null>(null)
  const [adjective, setAdjective] = useState<string | null>(null)

  const save = useMutation({
    mutationFn: () =>
      api.updateProfile({
        titleNoun: noun ?? current.noun ?? "dresseur",
        titleAdjective: adjective ?? current.adjective ?? "motive",
      }),
    onSuccess: (p) => {
      queryClient.setQueryData(keys.profile, p)
      setOpen(false)
      toast.success(`Tu es désormais « ${p.title} »`)
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  const selNoun = noun ?? current.noun ?? "dresseur"
  const selAdj = adjective ?? current.adjective ?? "motive"
  const words = titles.data ?? []
  const preview = `${words.find((w) => w.id === selNoun)?.label ?? ""} ${words.find((w) => w.id === selAdj)?.label ?? ""}`

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        setNoun(null)
        setAdjective(null)
      }}
    >
      <DialogTrigger
        render={<Button size="icon-sm" variant="outline" aria-label="Modifier ma description" />}
      >
        <Pencil />
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Ma description</DialogTitle>
          <DialogDescription>
            Choisis un nom et un adjectif. Travaille et capture pour débloquer de nouveaux mots !
          </DialogDescription>
        </DialogHeader>
        <p className="txt text-center font-heading text-2xl">{preview}</p>
        <WordPicker title="Nom" words={words.filter((w) => w.kind === "noun")} selected={selNoun} onSelect={setNoun} />
        <WordPicker
          title="Adjectif"
          words={words.filter((w) => w.kind === "adjective")}
          selected={selAdj}
          onSelect={setAdjective}
        />
        <DialogFooter>
          <PokeButton onClick={() => save.mutate()} disabled={save.isPending}>
            Enregistrer
          </PokeButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function WordPicker({
  title,
  words,
  selected,
  onSelect,
}: {
  title: string
  words: TitleWord[]
  selected: string
  onSelect: (id: string) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="txt text-sm font-bold">{title}</p>
      <div className="flex flex-wrap gap-2">
        {words.map((w) => (
          <button
            key={w.id}
            type="button"
            disabled={!w.unlocked}
            onClick={() => onSelect(w.id)}
            aria-pressed={selected === w.id}
            title={w.requires && !w.unlocked ? `Débloqué avec ${requirementLabel(w.requires)}` : undefined}
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-bold transition-[filter]",
              selected === w.id ? "btn-yellow" : "tile txt",
              w.unlocked ? "hover:brightness-105" : "cursor-not-allowed opacity-60",
            )}
          >
            {!w.unlocked && <Lock className="size-3" />}
            {w.label}
            {!w.unlocked && w.requires && (
              <span className="text-xs font-semibold opacity-90">· {requirementLabel(w.requires)}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
