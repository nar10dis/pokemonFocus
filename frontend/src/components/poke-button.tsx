import { Button as ButtonPrimitive } from "@base-ui/react/button"
import Link from "next/link"
import { cn } from "@/lib/utils"

const colors = {
  yellow: "btn-yellow",
  blue: "btn-blue",
  red: "btn-red",
}

const sizes = {
  sm: "h-7 gap-1 px-2.5 text-[0.8rem] [&_svg:not([class*='size-'])]:size-3.5",
  md: "h-10 gap-1.5 px-4 text-sm",
  lg: "h-12 gap-2 px-6 text-lg",
  icon: "size-7 [&_svg:not([class*='size-'])]:size-3.5",
}

type PokeButtonProps = ButtonPrimitive.Props & {
  color?: keyof typeof colors
  size?: keyof typeof sizes
  /** Rend un lien Next au lieu d'un <button>. */
  href?: string
}

/** Bouton coloré façon HGSS (relief = bordure basse de `btn-*`, voir globals.css). */
export function PokeButton({ color = "yellow", size = "md", href, className, ...props }: PokeButtonProps) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-lg font-bold whitespace-nowrap transition-[filter,translate] outline-none select-none hover:brightness-105 focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-[3px] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        colors[color],
        sizes[size],
        className,
      )}
      {...(href && { nativeButton: false, render: <Link href={href} /> })}
      {...props}
    />
  )
}
