"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Pencil, Plus, Target, Trash2 } from "lucide-react"
import { motion } from "motion/react"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import { Loading, PageShell } from "@/components/page-shell"
import { ProgressBar } from "@/components/progress-bar"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { api, errorMessage, type Theme, type ThemeInput } from "@/lib/api"
import { keys, useProfile, useThemes, useWeekSessions } from "@/lib/queries"
import { formatMinutes, startOfWeek } from "@/lib/time"
import { cn } from "@/lib/utils"

const EMOJIS = ["📚", "💻", "📐", "🧪", "🎨", "🎵", "✍️", "🌍", "🧠", "📊", "🏃", "🎮", "🔬", "📝", "💼", "🧘"]
const COLORS = ["#F2B56C", "#65B5F6", "#18D384", "#E86A6A", "#B98CF2", "#F2D56C", "#6CE0D8", "#F28CC8"]

export default function CustomPage() {
  const queryClient = useQueryClient()
  const weekStart = useMemo(() => startOfWeek(), [])
  const profile = useProfile()
  const themes = useThemes()
  const week = useWeekSessions(weekStart)

  const remove = useMutation({
    mutationFn: api.deleteTheme,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.themes })
      toast("Thème supprimé")
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  if (!profile.data || !themes.data || !week.data) return <Loading />
  const weekMinutes = week.data.reduce((sum, s) => sum + s.plannedMinutes, 0)
  const themeMinutes = (id: number) =>
    week.data.filter((s) => s.themeId === id).reduce((sum, s) => sum + s.plannedMinutes, 0)

  return (
    <PageShell title="Custom" subtitle="Tes thèmes de travail et tes objectifs de la semaine.">
      <WeeklyGoalCard goal={profile.data.weeklyGoalMinutes} done={weekMinutes} />

      <Card>
        <CardHeader>
          <CardTitle>Mes thèmes</CardTitle>
          <CardDescription>Choisis-en un au lancement d&apos;une session dans Go Work.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {themes.data.length === 0 && (
            <p className="txt text-sm font-semibold">Aucun thème pour l&apos;instant.</p>
          )}
          <ul className="flex flex-col gap-3">
            {themes.data.map((t, i) => {
              const done = themeMinutes(t.id)
              return (
                <motion.li
                  key={t.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="tile flex flex-col gap-2 rounded-xl p-3"
                  style={{ borderLeft: `8px solid ${t.color}` }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{t.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <p className="txt truncate font-heading text-lg">{t.name}</p>
                      <p className="txt text-xs font-bold">
                        {formatMinutes(done)} cette semaine
                        {t.weeklyGoalMinutes ? ` · objectif ${formatMinutes(t.weeklyGoalMinutes)}` : ""}
                      </p>
                    </div>
                    <ThemeDialog theme={t} />
                    <AlertDialog>
                      <AlertDialogTrigger
                        render={<Button size="icon-sm" variant="outline" aria-label={`Supprimer ${t.name}`} />}
                      >
                        <Trash2 />
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Supprimer « {t.name} » ?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tes sessions passées sont conservées, elles deviendront simplement « sans
                            thème ».
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel variant="secondary">Annuler</AlertDialogCancel>
                          <AlertDialogAction onClick={() => remove.mutate(t.id)}>Supprimer</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                  {t.weeklyGoalMinutes && <ProgressBar value={done} max={t.weeklyGoalMinutes} className="h-3" />}
                </motion.li>
              )
            })}
          </ul>
          <ThemeDialog />
        </CardContent>
      </Card>
    </PageShell>
  )
}

function WeeklyGoalCard({ goal, done }: { goal: number; done: number }) {
  const queryClient = useQueryClient()
  const [hours, setHours] = useState<string | null>(null)
  const value = hours ?? String(goal / 60)

  const save = useMutation({
    mutationFn: () => api.updateProfile({ weeklyGoalMinutes: Math.round(Number(value) * 60) }),
    onSuccess: (p) => {
      queryClient.setQueryData(keys.profile, p)
      setHours(null)
      toast.success(`Objectif : ${formatMinutes(p.weeklyGoalMinutes)} par semaine`)
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Objectif de la semaine</CardTitle>
        <CardDescription>
          Soit environ {formatMinutes(goal / 7)} par jour. Il sert de repère dans Go Work et sur l&apos;accueil.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <form
          className="flex flex-wrap items-center gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            save.mutate()
          }}
        >
          <Target className="size-6 text-white drop-shadow-[2px_2px_0_var(--bg-dark)]" />
          <Input
            type="number"
            min={0.5}
            max={100}
            step={0.5}
            value={value}
            onChange={(e) => setHours(e.target.value)}
            className="w-24"
            aria-label="Objectif en heures par semaine"
          />
          <span className="txt font-bold">heures / semaine</span>
          <Button type="submit" variant="secondary" disabled={hours === null || save.isPending}>
            Enregistrer
          </Button>
        </form>
        <div className="flex flex-col gap-2">
          <p className="txt text-sm font-bold">
            {formatMinutes(done)} / {formatMinutes(goal)} cette semaine
          </p>
          <ProgressBar value={done} max={goal} />
        </div>
      </CardContent>
    </Card>
  )
}

function ThemeDialog({ theme }: { theme?: Theme }) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const empty: ThemeInput = { name: "", emoji: EMOJIS[0], color: COLORS[0], weeklyGoalMinutes: null }
  const [form, setForm] = useState<ThemeInput>(theme ?? empty)
  const [goalHours, setGoalHours] = useState(theme?.weeklyGoalMinutes ? String(theme.weeklyGoalMinutes / 60) : "")

  const save = useMutation({
    mutationFn: () => {
      const data = {
        name: form.name.trim(),
        emoji: form.emoji,
        color: form.color,
        weeklyGoalMinutes: goalHours ? Math.round(Number(goalHours) * 60) : null,
      }
      return theme ? api.updateTheme(theme.id, data) : api.createTheme(data)
    },
    onSuccess: (t) => {
      queryClient.invalidateQueries({ queryKey: keys.themes })
      setOpen(false)
      toast.success(theme ? "Thème modifié" : `Thème « ${t.name} » créé`)
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (o) {
          setForm(theme ?? empty)
          setGoalHours(theme?.weeklyGoalMinutes ? String(theme.weeklyGoalMinutes / 60) : "")
        }
      }}
    >
      {theme ? (
        <DialogTrigger render={<Button size="icon-sm" variant="outline" aria-label={`Modifier ${theme.name}`} />}>
          <Pencil />
        </DialogTrigger>
      ) : (
        <DialogTrigger render={<Button className="self-start" />}>
          <Plus data-icon="inline-start" /> Nouveau thème
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{theme ? "Modifier le thème" : "Nouveau thème"}</DialogTitle>
          <DialogDescription>Par exemple « Maths », « Code » ou « Lecture ».</DialogDescription>
        </DialogHeader>
        <form
          id="theme-form"
          onSubmit={(e) => {
            e.preventDefault()
            save.mutate()
          }}
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="theme-name">Nom</FieldLabel>
              <Input
                id="theme-name"
                value={form.name}
                maxLength={30}
                required
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Field>
            <Field>
              <FieldLabel>Icône</FieldLabel>
              <div className="flex flex-wrap gap-1.5">
                {EMOJIS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setForm({ ...form, emoji: e })}
                    aria-pressed={form.emoji === e}
                    className={cn(
                      "flex size-10 items-center justify-center rounded-lg text-xl",
                      form.emoji === e ? "btn-orange" : "tile",
                    )}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </Field>
            <Field>
              <FieldLabel>Couleur</FieldLabel>
              <div className="flex flex-wrap gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm({ ...form, color: c })}
                    aria-label={`Couleur ${c}`}
                    aria-pressed={form.color === c}
                    className={cn(
                      "size-9 rounded-full border-3 border-white shadow-[0_3px_0_var(--bg-dark)] transition-transform",
                      form.color === c ? "scale-110 ring-3 ring-poke-green-dark" : "opacity-80",
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </Field>
            <Field>
              <FieldLabel htmlFor="theme-goal">Objectif hebdo (heures, optionnel)</FieldLabel>
              <Input
                id="theme-goal"
                type="number"
                min={0.25}
                max={100}
                step={0.25}
                value={goalHours}
                onChange={(e) => setGoalHours(e.target.value)}
                placeholder="ex : 5"
                className="w-32"
              />
            </Field>
          </FieldGroup>
        </form>
        <DialogFooter>
          <Button type="submit" form="theme-form" disabled={save.isPending || !form.name.trim()}>
            {theme ? "Enregistrer" : "Créer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
