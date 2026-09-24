import { PokemonImage } from "@/components/pokemon-image"
import type { AvatarCosmetic, Pokemon } from "@/lib/api"
import { COSMETICS_BY_ID, cosmeticUrl } from "@/lib/cosmetics"
import { cn } from "@/lib/utils"

export const AVATAR_COLORS = [
  "#65B5F6",
  "#18D384",
  "#F2B56C",
  "#E86A6A",
  "#B98CF2",
  "#F2D56C",
  "#6CE0D8",
  "#F28CC8",
  "#8A9BB0",
  "#3A4A6B",
]

const SIZES = {
  sm: { box: "size-9 rounded-lg", text: "text-base", image: 32 },
  md: { box: "size-12 rounded-xl", text: "text-xl", image: 44 },
  lg: { box: "size-20 rounded-xl", text: "text-2xl", image: 72 },
  xl: { box: "size-56 rounded-2xl", text: "text-7xl", image: 200 },
}

/** largeur de référence (px) d'un avatar pour la taille des accessoires : celle d'un sprite DS */
const COSMETIC_REF = 80

export type AvatarUser = {
  username: string
  avatarPokemon: Pick<Pokemon, "image" | "name"> | null
  avatarColor: string | null
  avatarCosmetics?: AvatarCosmetic[]
}

type TrainerAvatarProps = {
  user: AvatarUser
  size?: keyof typeof SIZES
  className?: string
  /** mode éditeur : accessoires sélectionnables / déplaçables */
  editable?: {
    selected: number | null
    onPointerDown: (index: number, e: React.PointerEvent) => void
  }
}

/** photo de profil : Pokémon choisi sur sa couleur de fond (sinon l'initiale du pseudo), avec ses accessoires */
export function TrainerAvatar({ user, size = "sm", className, editable }: TrainerAvatarProps) {
  const s = SIZES[size]
  const cosmetics = (user.avatarCosmetics ?? [])
    .map((c, index) => ({ ...c, index, info: COSMETICS_BY_ID.get(c.id) }))
    .filter((c) => c.info)

  const layer = (back: boolean) =>
    cosmetics
      .filter((c) => c.back === back)
      .map((c) => (
        <span
          key={c.index}
          onPointerDown={editable && ((e) => editable.onPointerDown(c.index, e))}
          className={cn(
            "absolute -translate-x-1/2 -translate-y-1/2",
            editable && "cursor-grab touch-none p-1 active:cursor-grabbing",
            editable?.selected === c.index && "rounded outline-2 outline-white outline-dashed",
          )}
          style={{
            left: `${c.x}%`,
            top: `${c.y}%`,
            width: `${(c.info!.width / COSMETIC_REF) * 100}%`,
            boxSizing: "content-box",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cosmeticUrl(c.id)}
            alt={c.info!.label}
            draggable={false}
            className="block w-full select-none [image-rendering:pixelated]"
          />
        </span>
      ))

  return (
    <span
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden font-heading",
        user.avatarColor
          ? "border-2 border-white text-white shadow-[inset_0_2px_0_rgb(255_255_255/0.45),0_3px_0_var(--bg-dark)] [text-shadow:2px_2px_0_var(--bg-dark)]"
          : "btn-blue",
        s.box,
        s.text,
        className,
      )}
      style={user.avatarColor ? { backgroundColor: user.avatarColor } : undefined}
    >
      {layer(true)}
      <span className="pointer-events-none relative flex items-center justify-center">
        {user.avatarPokemon ? (
          <PokemonImage pokemon={user.avatarPokemon} size={s.image} />
        ) : (
          user.username[0]?.toUpperCase()
        )}
      </span>
      {layer(false)}
    </span>
  )
}
