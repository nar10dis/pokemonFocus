import Link from "next/link"

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b-3 border-poke-green-dark bg-linear-to-b from-poke-green-light via-poke-green to-poke-green shadow-[inset_0_-2px_0_rgb(255_255_255/0.3),0_4px_0_var(--bg-dark)]">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-6">
        <Link href="/home" aria-label="Accueil" className="transition-transform hover:scale-105">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/pokemon-logo.svg"
            alt="Pokémon"
            className="h-10 w-auto drop-shadow-[2px_2px_0_var(--bg-dark)]"
          />
        </Link>
        <Link
          href="/profile"
          className="txt-blue rounded-lg border-2 border-poke-blue-dark bg-linear-to-b from-[var(--blue-light)] via-poke-blue to-[var(--blue-deep)] px-4 py-2 text-sm font-bold transition-[filter] hover:brightness-110"
        >
          Profil
        </Link>
      </div>
    </header>
  )
}
