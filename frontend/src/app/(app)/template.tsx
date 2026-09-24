"use client"

import { useCallback, useState } from "react"
import { IrisReveal, shouldReveal } from "@/components/start-transition"

/** Next recrée ce template à chaque navigation : on y joue l'iris quand on arrive du bouton « C'est parti ! » */
export default function Template({ children }: { children: React.ReactNode }) {
  const [reveal, setReveal] = useState(shouldReveal)
  const done = useCallback(() => setReveal(false), [])

  return (
    <>
      <div className="flex flex-1 flex-col">{children}</div>
      {reveal && <IrisReveal onDone={done} />}
    </>
  )
}
