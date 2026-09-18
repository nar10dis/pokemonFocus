import Image from "next/image"
import { cn } from "@/lib/utils"
import type { Pokemon } from "@/lib/api"

type PokemonImageProps = {
  pokemon: Pick<Pokemon, "image" | "name">
  size: number
  /** silhouette noire (Pokémon pas encore capturé) */
  hidden?: boolean
  className?: string
  priority?: boolean
}

export function PokemonImage({ pokemon, size, hidden, className, priority }: PokemonImageProps) {
  return (
    <Image
      src={`/pokemon/${pokemon.image}.png`}
      alt={hidden ? "Pokémon inconnu" : pokemon.name}
      width={size}
      height={size}
      priority={priority}
      draggable={false}
      className={cn(
        "select-none object-contain",
        hidden ? "brightness-0 opacity-30" : "drop-shadow-[2px_3px_0_rgb(14_138_85/0.6)]",
        className,
      )}
    />
  )
}
