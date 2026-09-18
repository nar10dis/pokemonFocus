import { cn } from "@/lib/utils"

/** barre de progression façon jauge de PV */
export function ProgressBar({ value, max, className }: { value: number; max: number; className?: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className={cn(
        "h-4 w-full overflow-hidden rounded-full border-2 border-poke-green-dark bg-poke-green-dark/60",
        className,
      )}
    >
      <div
        className={cn(
          "h-full rounded-full bg-linear-to-b transition-[width] duration-700",
          pct >= 100
            ? "from-[var(--blue-light)] to-[var(--blue-deep)]"
            : "from-[var(--orange-light)] to-[var(--orange-deep)]",
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
