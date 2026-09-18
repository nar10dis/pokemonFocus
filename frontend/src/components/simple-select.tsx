"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

type Option = { value: string; label: string }

/** Select shadcn avec une liste d'options simple */
export function SimpleSelect({
  value,
  onChange,
  options,
  label,
  className,
}: {
  value: string
  onChange: (value: string) => void
  options: Option[]
  /** libellé accessible */
  label: string
  className?: string
}) {
  return (
    <Select
      value={value}
      onValueChange={(v) => v !== null && onChange(String(v))}
      items={options}
    >
      <SelectTrigger aria-label={label} className={cn("w-full min-w-36", className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
