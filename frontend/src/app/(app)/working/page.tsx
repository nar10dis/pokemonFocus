"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Flag, Pause, Play } from "lucide-react"
import { motion } from "motion/react"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { Loading } from "@/components/page-shell"
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
import { WalkingTrainer } from "@/components/walking-trainer"
import { api, errorMessage, type WorkSession } from "@/lib/api"
import { ALERT_BUBBLE_MS, CAPTURE_CHANCE_PER_MINUTE } from "@/lib/capture"
import { keys, useActiveSession } from "@/lib/queries"
import { formatClock, formatMinutes } from "@/lib/time"
import { PokeButton } from "@/components/poke-button"

const SIZE = 320
const STROKE = 22
const R = (SIZE - STROKE) / 2
const CIRC = 2 * Math.PI * R

export default function WorkingPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const active = useActiveSession()
  const session = active.data
  const [now, setNow] = useState(() => Date.now())
  const [encounter, setEncounter] = useState(false)
  const completing = useRef(false)
  const lastRolled = useRef<number | null>(null)

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (active.isSuccess && !session && !completing.current) router.replace("/home")
  }, [active.isSuccess, session, router])

  const refreshAfterEnd = () => {
    for (const k of [keys.sessions, keys.collection, keys.profile, keys.titles])
      queryClient.invalidateQueries({ queryKey: k })
  }

  const setSession = (s: WorkSession) => queryClient.setQueryData(keys.activeSession, s)
  const onError = (err: unknown) => toast.error(errorMessage(err))

  const pause = useMutation({ mutationFn: api.pauseSession, onSuccess: setSession, onError })
  const resume = useMutation({ mutationFn: api.resumeSession, onSuccess: setSession, onError })
  const abandon = useMutation({
    mutationFn: api.abandonSession,
    onSuccess: () => {
      queryClient.setQueryData(keys.activeSession, null)
      refreshAfterEnd()
      toast("Session abandonnée… rien n'a été gagné cette fois.")
      router.replace("/home")
    },
    onError,
  })
  const complete = useMutation({
    mutationFn: api.completeSession,
    onSuccess: (s) => {
      queryClient.setQueryData(keys.session(s.id), s)
      queryClient.setQueryData(keys.activeSession, null)
      refreshAfterEnd()
      router.replace(`/result/${s.id}`)
    },
    onError: () => {
      // horloges décalées de quelques secondes : on réessaie un peu plus tard
      completing.current = false
      setTimeout(() => active.refetch(), 2000)
    },
  })

  // temps restant : on part de elapsedMs renvoyé par le serveur (pas de souci de décalage d'horloge)
  const running = session?.status === "RUNNING"
  const elapsed = session ? session.elapsedMs + (running ? now - active.dataUpdatedAt : 0) : 0
  const total = session ? session.plannedMinutes * 60_000 : 1
  const remaining = Math.max(0, total - elapsed)
  const clock = formatClock(remaining)

  // un "!" au-dessus du dresseur à chaque minute où un Pokémon se montre
  const minute = Math.floor(elapsed / 60_000)
  useEffect(() => {
    if (!running) return
    // première minute observée (arrivée sur la page) : rien, on note juste où on en est
    if (lastRolled.current === null || minute <= lastRolled.current) {
      lastRolled.current = minute
      return
    }
    lastRolled.current = minute
    if (Math.random() >= CAPTURE_CHANCE_PER_MINUTE) return
    // via des timers : un setState synchrone dans l'effet forcerait un rendu en cascade
    const show = setTimeout(() => setEncounter(true), 0)
    const hide = setTimeout(() => setEncounter(false), ALERT_BUBBLE_MS)
    return () => {
      clearTimeout(show)
      clearTimeout(hide)
    }
  }, [minute, running])

  useEffect(() => {
    if (session && running && remaining === 0 && !completing.current) {
      completing.current = true
      complete.mutate(session.id)
    }
  }, [session, running, remaining, complete])

  useEffect(() => {
    document.title = session ? `${clock} · Pokemon Focus` : "Pokemon Focus"
    return () => {
      document.title = "Pokemon Focus"
    }
  }, [clock, session])

  if (!session) return <Loading />
  const paused = session.status === "PAUSED"
  const done = remaining === 0

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-8">
      <div className="text-center">
        <p className="txt text-lg font-bold">
          {session.theme ? `${session.theme.emoji} ${session.theme.name}` : "Session libre"} ·{" "}
          {session.region}
        </p>
        <p className="txt text-sm font-semibold opacity-90">{formatMinutes(session.plannedMinutes)} de focus</p>
      </div>

      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative"
        style={{ width: SIZE, height: SIZE }}
      >
        <svg width={SIZE} height={SIZE} className="-rotate-90" aria-hidden>
          {/* fond de l'anneau */}
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            fill="none"
            stroke="var(--bg-light)"
            strokeWidth={STROKE}
          />
          {/* temps restant (couleur foncée), diminue petit à petit */}
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            fill="none"
            stroke="var(--bg-dark)"
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={CIRC * (1 - remaining / total)}
            className="transition-[stroke-dashoffset] duration-300 ease-linear"
          />
        </svg>
        <div className="panel absolute inset-[34px] flex flex-col items-center justify-center gap-3 overflow-hidden rounded-full !border-b-3">
          <WalkingTrainer paused={paused || done} alert={encounter && !paused && !done} />
          <p
            className="txt font-heading text-4xl tabular-nums [text-shadow:3px_3px_0_var(--bg-dark)]"
            role="timer"
            aria-live="off"
          >
            {clock}
          </p>
          {paused && <p className="txt text-sm font-bold">En pause</p>}
          {done && <p className="txt text-sm font-bold animate-pulse">Capture en cours…</p>}
        </div>
      </motion.div>

      <div className="flex flex-wrap justify-center gap-4">
        {paused ? (
          <PokeButton color="blue" size="lg" onClick={() => resume.mutate(session.id)} disabled={resume.isPending}>
            <Play data-icon="inline-start" /> Reprendre
          </PokeButton>
        ) : (
          <PokeButton
            color="blue"
            size="lg"
            onClick={() => pause.mutate(session.id)}
            disabled={pause.isPending || done}
          >
            <Pause data-icon="inline-start" /> Pause
          </PokeButton>
        )}
        <AlertDialog>
          <AlertDialogTrigger render={<PokeButton color="red" size="lg" disabled={done} />}>
            <Flag data-icon="inline-start" /> Abandonner
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Abandonner la session ?</AlertDialogTitle>
              <AlertDialogDescription>
                Tout sera perdu : le temps de cette session ne comptera pas et tu ne captureras aucun
                Pokémon.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel color="blue">Continuer</AlertDialogCancel>
              <AlertDialogAction
                color="red"
                onClick={() => abandon.mutate(session.id)}
                disabled={abandon.isPending}
              >
                Abandonner
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </main>
  )
}
