"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { ArrowDownToLine, ArrowUpToLine, Pencil, Search, Trash2 } from "lucide-react"
import { useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { PokemonImage } from "@/components/pokemon-image"
import { AVATAR_COLORS, TrainerAvatar } from "@/components/trainer-avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { api, errorMessage, type AvatarCosmetic, type Profile } from "@/lib/api"
import {
  COSMETIC_CATEGORIES,
  COSMETICS,
  COSMETICS_BY_ID,
  cosmeticUrl,
  type CosmeticCategory,
} from "@/lib/cosmetics"
import { keys, useCollection, usePokedex } from "@/lib/queries"
import { cn } from "@/lib/utils"
import { PokeButton } from "@/components/poke-button"

/** même limite que le backend */
const MAX_COSMETICS = 10

type Tab = "pokemon" | "color" | "cosmetics"
const TABS: { id: Tab; label: string }[] = [
  { id: "pokemon", label: "Pokémon" },
  { id: "color", label: "Couleur" },
  { id: "cosmetics", label: "Accessoires" },
]

/** position de départ d'un nouvel accessoire selon sa catégorie */
const START_Y: Record<CosmeticCategory, number> = { tete: 25, nature: 50, effets: 30, objets: 50, scene: 80 }

const clamp = (v: number) => Math.round(Math.min(100, Math.max(0, v)))

export function AvatarDialog({ profile }: { profile: Profile }) {
  const queryClient = useQueryClient()
  const pokedex = usePokedex()
  const collection = useCollection()
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<Tab>("pokemon")
  /** undefined = pas encore modifié dans le dialogue, null = initiale du pseudo */
  const [pokemonId, setPokemonId] = useState<number | null | undefined>(undefined)
  const [color, setColor] = useState<string | null>(null)
  const [cosmetics, setCosmetics] = useState<AvatarCosmetic[]>([])
  const [selected, setSelected] = useState<number | null>(null)
  const [category, setCategory] = useState<CosmeticCategory>("tete")
  const [search, setSearch] = useState("")
  const canvas = useRef<HTMLDivElement>(null)
  const dragging = useRef<number | null>(null)

  const selPokemonId = pokemonId === undefined ? (profile.avatarPokemon?.id ?? null) : pokemonId
  const selColor = color ?? profile.avatarColor ?? AVATAR_COLORS[0]

  const owned = useMemo(() => {
    const ids = new Set(collection.data?.map((o) => o.pokemonId))
    const q = search.trim().toLowerCase().replace(/^#/, "")
    return (pokedex.data ?? []).filter(
      (pk) => ids.has(pk.id) && (!q || pk.name.toLowerCase().includes(q) || String(pk.id) === q),
    )
  }, [collection.data, pokedex.data, search])

  const save = useMutation({
    mutationFn: () =>
      api.updateProfile({ avatarPokemonId: selPokemonId, avatarColor: selColor, avatarCosmetics: cosmetics }),
    onSuccess: (p) => {
      queryClient.setQueryData(keys.profile, p)
      queryClient.invalidateQueries({ queryKey: keys.friends })
      setOpen(false)
      toast.success("Photo de profil mise à jour")
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  const preview = {
    username: profile.username,
    avatarPokemon: pokedex.data?.find((pk) => pk.id === selPokemonId) ?? null,
    avatarColor: selColor,
    avatarCosmetics: cosmetics,
  }

  function patchSelected(patch: Partial<AvatarCosmetic>) {
    if (selected === null) return
    setCosmetics((cs) => cs.map((c, i) => (i === selected ? { ...c, ...patch } : c)))
  }

  function add(id: string) {
    if (cosmetics.length >= MAX_COSMETICS) {
      toast.error(`${MAX_COSMETICS} accessoires maximum`)
      return
    }
    const info = COSMETICS_BY_ID.get(id)!
    const offset = (cosmetics.length % 5) * 4
    setCosmetics([...cosmetics, { id, x: 50 + offset, y: START_Y[info.category] + offset, back: !!info.back }])
    setSelected(cosmetics.length)
  }

  function remove() {
    if (selected === null) return
    setCosmetics(cosmetics.filter((_, i) => i !== selected))
    setSelected(null)
  }

  function moveTo(e: React.PointerEvent) {
    const rect = canvas.current!.getBoundingClientRect()
    return {
      x: clamp(((e.clientX - rect.left) / rect.width) * 100),
      y: clamp(((e.clientY - rect.top) / rect.height) * 100),
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (selected === null) return
    const c = cosmetics[selected]
    const step = e.shiftKey ? 10 : 2
    const moves: Record<string, Partial<AvatarCosmetic>> = {
      ArrowLeft: { x: clamp(c.x - step) },
      ArrowRight: { x: clamp(c.x + step) },
      ArrowUp: { y: clamp(c.y - step) },
      ArrowDown: { y: clamp(c.y + step) },
    }
    if (moves[e.key]) {
      e.preventDefault()
      patchSelected(moves[e.key])
    } else if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault()
      remove()
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        setTab("pokemon")
        setPokemonId(undefined)
        setColor(null)
        setCosmetics(profile.avatarCosmetics)
        setSelected(null)
        setSearch("")
      }}
    >
      <DialogTrigger
        render={
          <button
            type="button"
            aria-label="Modifier ma photo de profil"
            className="relative shrink-0 rounded-xl transition-[filter] hover:brightness-110"
          />
        }
      >
        <TrainerAvatar user={profile} size="lg" />
        <span className="btn-yellow absolute -right-1.5 -bottom-1.5 flex size-7 items-center justify-center rounded-full">
          <Pencil className="size-3.5" />
        </span>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Ma photo de profil</DialogTitle>
          <DialogDescription>
            Choisis un Pokémon capturé, une couleur de fond, et décore-le avec des accessoires.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 sm:grid-cols-[auto_1fr]">
          <div className="flex flex-col items-center gap-3">
            <div
              ref={canvas}
              tabIndex={0}
              aria-label="Aperçu : glisse les accessoires, flèches pour déplacer, Suppr pour retirer"
              onKeyDown={onKeyDown}
              onPointerDown={(e) => e.target === e.currentTarget && setSelected(null)}
              onPointerMove={(e) => {
                const i = dragging.current
                if (i === null) return
                const pos = moveTo(e)
                setCosmetics((cs) => cs.map((c, j) => (j === i ? { ...c, ...pos } : c)))
              }}
              onPointerUp={() => (dragging.current = null)}
              onPointerCancel={() => (dragging.current = null)}
              className="touch-none rounded-2xl outline-none focus-visible:ring-3 focus-visible:ring-poke-green-dark"
            >
              <TrainerAvatar
                user={preview}
                size="xl"
                editable={{
                  selected,
                  onPointerDown: (i, e) => {
                    e.preventDefault()
                    canvas.current!.focus()
                    canvas.current!.setPointerCapture(e.pointerId)
                    dragging.current = i
                    setSelected(i)
                  },
                }}
              />
            </div>
            <div className="flex min-h-9 flex-wrap items-center justify-center gap-2">
              {selected !== null && cosmetics[selected] ? (
                <>
                  <span className="txt text-sm font-bold">{COSMETICS_BY_ID.get(cosmetics[selected].id)?.label}</span>
                  <PokeButton
                    color="blue"
                    size="sm"
                    onClick={() => patchSelected({ back: !cosmetics[selected].back })}
                  >
                    {cosmetics[selected].back ? (
                      <>
                        <ArrowUpToLine data-icon="inline-start" /> Devant
                      </>
                    ) : (
                      <>
                        <ArrowDownToLine data-icon="inline-start" /> Derrière
                      </>
                    )}
                  </PokeButton>
                  <PokeButton color="red" size="icon" onClick={remove} aria-label="Retirer l'accessoire">
                    <Trash2 />
                  </PokeButton>
                </>
              ) : (
                <span className="txt text-xs font-semibold opacity-80">
                  {cosmetics.length
                    ? `${cosmetics.length}/${MAX_COSMETICS} accessoires · clique pour en sélectionner un`
                    : "Aucun accessoire"}
                </span>
              )}
            </div>
          </div>

          <div className="flex min-w-0 flex-col gap-3">
            <div className="flex gap-1" role="tablist">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.id}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "flex-1 rounded-lg px-3 py-1.5 text-sm font-bold",
                    tab === t.id ? "btn-yellow" : "tile txt hover:brightness-105",
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {tab === "pokemon" && (
              <>
                <label className="relative">
                  <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink/50" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Nom ou numéro"
                    aria-label="Rechercher un Pokémon"
                    className="pl-9"
                  />
                </label>
                <ul className="grid max-h-72 grid-cols-4 gap-2 overflow-y-auto p-1 sm:grid-cols-5">
                  <li>
                    <button
                      type="button"
                      onClick={() => setPokemonId(null)}
                      aria-pressed={selPokemonId === null}
                      title="Initiale du pseudo"
                      className={cn(
                        "flex aspect-square w-full items-center justify-center rounded-lg font-heading text-2xl",
                        selPokemonId === null ? "btn-yellow" : "tile txt",
                      )}
                    >
                      {profile.username[0]?.toUpperCase()}
                    </button>
                  </li>
                  {owned.map((pk) => (
                    <li key={pk.id}>
                      <button
                        type="button"
                        onClick={() => setPokemonId(pk.id)}
                        aria-pressed={selPokemonId === pk.id}
                        title={pk.name}
                        className={cn(
                          "flex aspect-square w-full items-center justify-center rounded-lg p-1",
                          selPokemonId === pk.id ? "btn-yellow" : "tile hover:brightness-105",
                        )}
                      >
                        <PokemonImage pokemon={pk} size={56} />
                      </button>
                    </li>
                  ))}
                </ul>
                {collection.data && !collection.data.length && (
                  <p className="txt text-sm font-semibold">
                    Capture des Pokémon pendant tes sessions pour pouvoir les choisir ici !
                  </p>
                )}
              </>
            )}

            {tab === "color" && (
              <div className="flex flex-wrap gap-2 p-1">
                {AVATAR_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    aria-label={`Couleur ${c}`}
                    aria-pressed={selColor === c}
                    className={cn(
                      "size-10 rounded-full border-3 border-white shadow-[0_3px_0_var(--bg-dark)] transition-transform",
                      selColor === c ? "scale-110 ring-3 ring-poke-green-dark" : "opacity-80",
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
                <label
                  title="Couleur personnalisée"
                  className={cn(
                    "relative size-10 cursor-pointer overflow-hidden rounded-full border-3 border-white bg-[conic-gradient(red,yellow,lime,aqua,blue,magenta,red)] shadow-[0_3px_0_var(--bg-dark)] transition-transform",
                    !AVATAR_COLORS.includes(selColor) ? "scale-110 ring-3 ring-poke-green-dark" : "opacity-80",
                  )}
                >
                  <input
                    type="color"
                    value={selColor}
                    onChange={(e) => setColor(e.target.value.toUpperCase())}
                    aria-label="Couleur personnalisée"
                    className="absolute inset-0 size-full cursor-pointer opacity-0"
                  />
                </label>
              </div>
            )}

            {tab === "cosmetics" && (
              <>
                <div className="flex flex-wrap gap-1.5">
                  {COSMETIC_CATEGORIES.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCategory(c.id)}
                      aria-pressed={category === c.id}
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-bold",
                        category === c.id ? "btn-blue" : "tile txt hover:brightness-105",
                      )}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
                <ul className="grid max-h-72 grid-cols-5 gap-2 overflow-y-auto p-1 sm:grid-cols-6">
                  {COSMETICS.filter((c) => c.category === category).map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => add(c.id)}
                        title={c.label}
                        aria-label={`Ajouter ${c.label}`}
                        className="tile flex aspect-square w-full items-center justify-center rounded-lg p-1.5 hover:brightness-105"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={cosmeticUrl(c.id)}
                          alt=""
                          draggable={false}
                          className="max-h-full max-w-full [image-rendering:pixelated]"
                          style={{ width: Math.min(c.width * 2, 48) }}
                        />
                      </button>
                    </li>
                  ))}
                </ul>
                {cosmetics.length > 0 && (
                  <PokeButton
                    color="red"
                    size="sm"
                    className="self-end"
                    onClick={() => {
                      setCosmetics([])
                      setSelected(null)
                    }}
                  >
                    <Trash2 data-icon="inline-start" /> Tout retirer
                  </PokeButton>
                )}
              </>
            )}
          </div>
        </div>

        <DialogFooter>
          <PokeButton onClick={() => save.mutate()} disabled={save.isPending}>
            Enregistrer
          </PokeButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
