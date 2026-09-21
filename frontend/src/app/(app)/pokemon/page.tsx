"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Search, Star } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { Loading, PageShell } from "@/components/page-shell"
import { PokemonImage } from "@/components/pokemon-image"
import { SimpleSelect } from "@/components/simple-select"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { api, errorMessage, type OwnedPokemon, type Pokemon } from "@/lib/api"
import { keys, useCollection, usePokedex } from "@/lib/queries"
import { isVisibleRegion, REGIONS } from "@/lib/regions"
import { cn } from "@/lib/utils"

const ALL = "all"
const LEVELS = [1, 2, 5, 10, 25, 50]
/** multiple de 12 : la dernière ligne reste pleine (2, 3, 4 ou 6 colonnes) */
const PAGE_SIZE = 48
/** on charge le paquet suivant quand le bas de la liste est à moins de cette distance */
const PRELOAD_MARGIN = "800px 0px"
const SORTS = [
  { value: "number", label: "N° Pokédex" },
  { value: "level", label: "Niveau" },
  { value: "name", label: "Nom" },
]

export default function MyPokemonPage() {
  const queryClient = useQueryClient()
  const pokedex = usePokedex()
  const collection = useCollection()

  const [search, setSearch] = useState("")
  const [region, setRegion] = useState(ALL)
  const [type, setType] = useState(ALL)
  const [minLevel, setMinLevel] = useState("0")
  const [sort, setSort] = useState("number")
  const [ownedOnly, setOwnedOnly] = useState(false)

  const owned = useMemo(
    () => new Map(collection.data?.map((o) => [o.pokemonId, o])),
    [collection.data],
  )
  /** les régions masquées ne sont pas listées pour l'instant */
  const dex = useMemo(
    () => pokedex.data?.filter((p) => isVisibleRegion(p.region)) ?? [],
    [pokedex.data],
  )
  const types = useMemo(
    () => [...new Set(dex.flatMap((p) => p.types))].sort((a, b) => a.localeCompare(b, "fr")),
    [dex],
  )

  const favorites = useMemo(
    () =>
      (collection.data ?? [])
        .filter((o) => o.favoriteSlot !== null)
        .sort((a, b) => a.favoriteSlot! - b.favoriteSlot!)
        .map((o) => o.pokemonId),
    [collection.data],
  )

  const setFavorites = useMutation({
    mutationFn: api.setFavorites,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.collection })
      queryClient.invalidateQueries({ queryKey: keys.profile })
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  function toggleFavorite(id: number) {
    if (favorites.includes(id)) return setFavorites.mutate(favorites.filter((f) => f !== id))
    if (favorites.length >= 6) return toast.error("6 favoris maximum : retires-en un d'abord")
    setFavorites.mutate([...favorites, id])
  }

  const list = useMemo(() => {
    const q = search.trim().toLowerCase().replace(/^#/, "")
    const level = Number(minLevel)
    const filtered = dex.filter((p) => {
      const o = owned.get(p.id)
      if ((ownedOnly || level > 0) && !o) return false
      if (level > 0 && o!.level < level) return false
      if (region !== ALL && p.region !== region) return false
      if (type !== ALL && !p.types.includes(type)) return false
      // le nom des Pokémon pas encore capturés reste secret : recherche par numéro seulement
      if (q && !(String(p.id) === q.replace(/^0+/, "") || (o && p.name.toLowerCase().includes(q)))) return false
      return true
    })
    const lvl = (p: Pokemon) => owned.get(p.id)?.level ?? 0
    if (sort === "level") filtered.sort((a, b) => lvl(b) - lvl(a) || a.id - b.id)
    if (sort === "name") filtered.sort((a, b) => a.name.localeCompare(b.name, "fr"))
    return filtered
  }, [dex, owned, search, region, type, minLevel, sort, ownedOnly])

  if (!pokedex.data || !collection.data) return <Loading />

  return (
    <PageShell
      title="Mes Pokémon"
      subtitle={`${dex.filter((p) => owned.has(p.id)).length} / ${dex.length} capturés · ${favorites.length}/6 favoris`}
    >
      <Card size="sm">
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_repeat(4,minmax(9.5rem,1fr))_auto] lg:items-center">
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
          <SimpleSelect
            label="Région"
            value={region}
            onChange={setRegion}
            options={[{ value: ALL, label: "Toutes régions" }, ...REGIONS.map((r) => ({ value: r, label: r }))]}
          />
          <SimpleSelect
            label="Type"
            value={type}
            onChange={setType}
            options={[{ value: ALL, label: "Tous types" }, ...types.map((t) => ({ value: t, label: t }))]}
          />
          <SimpleSelect
            label="Niveau minimum"
            value={minLevel}
            onChange={setMinLevel}
            options={[
              { value: "0", label: "Tous niveaux" },
              ...LEVELS.map((l) => ({ value: String(l), label: `Niv. ${l}+` })),
            ]}
          />
          <SimpleSelect label="Trier par" value={sort} onChange={setSort} options={SORTS} />
          <label className="txt flex items-center gap-2 text-sm font-bold whitespace-nowrap">
            <Switch checked={ownedOnly} onCheckedChange={setOwnedOnly} />
            Capturés
          </label>
        </CardContent>
      </Card>

      {list.length === 0 ? (
        <p className="txt py-12 text-center font-heading text-xl">Aucun Pokémon ne correspond.</p>
      ) : (
        // la clé remet le compteur à zéro dès qu'un filtre ou le tri change
        <PokemonGrid
          key={[search, region, type, minLevel, sort, ownedOnly].join("|")}
          list={list}
          owned={owned}
          favorites={favorites}
          onToggleFavorite={toggleFavorite}
        />
      )}
    </PageShell>
  )
}

/** Affiche la liste par paquets : le suivant est préparé avant d'arriver en bas. */
function PokemonGrid({
  list,
  owned,
  favorites,
  onToggleFavorite,
}: {
  list: Pokemon[]
  owned: Map<number, OwnedPokemon>
  favorites: number[]
  onToggleFavorite: (id: number) => void
}) {
  const [visible, setVisible] = useState(PAGE_SIZE)
  const sentinel = useRef<HTMLDivElement>(null)
  const hasMore = visible < list.length

  useEffect(() => {
    const el = sentinel.current
    if (!el || !hasMore) return
    // recréé à chaque paquet : si le repère est encore visible, le suivant se charge aussitôt
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) setVisible((v) => v + PAGE_SIZE)
      },
      { rootMargin: PRELOAD_MARGIN },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [visible, hasMore])

  return (
    <>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {list.slice(0, visible).map((p) => (
          <PokemonCard
            key={p.id}
            pokemon={p}
            owned={owned.get(p.id)}
            favorite={favorites.includes(p.id)}
            onToggleFavorite={() => onToggleFavorite(p.id)}
          />
        ))}
      </ul>
      {hasMore && <div ref={sentinel} aria-hidden className="h-px" />}
    </>
  )
}

function PokemonCard({
  pokemon,
  owned,
  favorite,
  onToggleFavorite,
}: {
  pokemon: Pokemon
  owned?: OwnedPokemon
  favorite: boolean
  onToggleFavorite: () => void
}) {
  return (
    <li
      className={cn(
        "relative flex flex-col items-center gap-1 rounded-xl p-3 [content-visibility:auto] [contain-intrinsic-size:auto_190px]",
        owned ? "tile" : "border-2 border-dashed border-poke-green-dark/60 bg-poke-green-dark/20",
      )}
    >
      <span className="txt self-start text-xs font-bold">#{String(pokemon.id).padStart(3, "0")}</span>
      {owned && (
        <button
          type="button"
          onClick={onToggleFavorite}
          aria-pressed={favorite}
          aria-label={favorite ? "Retirer des favoris" : "Ajouter aux favoris"}
          className="absolute top-2 right-2 rounded-full p-1 transition-transform hover:scale-110"
        >
          <Star
            className={cn(
              "size-5 drop-shadow-[1px_1px_0_var(--bg-dark)]",
              favorite ? "fill-poke-orange text-poke-orange-dark" : "text-white",
            )}
          />
        </button>
      )}
      <PokemonImage pokemon={pokemon} size={96} hidden={!owned} />
      <p className={cn("txt text-center font-heading text-base leading-tight", !owned && "opacity-70")}>
        {owned ? pokemon.name : "???"}
      </p>
      {owned ? (
        <p className="txt text-xs font-bold">
          Niv. {owned.level} · {pokemon.types.join(" / ")}
        </p>
      ) : (
        <p className="txt text-xs font-semibold opacity-70">{pokemon.region}</p>
      )}
    </li>
  )
}
