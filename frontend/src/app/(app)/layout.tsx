"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Loading } from "@/components/page-shell"
import { useMe } from "@/lib/queries"

/** Toutes les pages de ce groupe nécessitent d'être connecté. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { data: user, isError } = useMe()

  useEffect(() => {
    if (isError) router.replace("/")
  }, [isError, router])

  if (!user) return <Loading />
  return children
}
