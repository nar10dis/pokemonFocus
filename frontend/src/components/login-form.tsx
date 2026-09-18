"use client"

import Link from "next/link"
import { useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { ApiError, authApi } from "@/lib/api"
import { keys } from "@/lib/queries"

export function LoginForm() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [errors, setErrors] = useState<string[]>([])
  const [pending, setPending] = useState(false)

  // déjà connecté → direction le profil
  useEffect(() => {
    authApi.me().then(() => router.replace("/home"), () => {})
  }, [router])

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    setPending(true)
    setErrors([])
    try {
      const user = await authApi.login(String(data.get("email")), String(data.get("password")))
      queryClient.clear()
      queryClient.setQueryData(keys.me, user)
      router.push("/home")
    } catch (err) {
      setErrors(err instanceof ApiError ? err.messages : ["Erreur inattendue"])
      setPending(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Connexion</CardTitle>
        <CardDescription>
          Entre ton email pour reprendre l&apos;aventure.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="sacha@bourg-palette.fr"
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="password">Mot de passe</FieldLabel>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
              />
            </Field>
            {errors.length > 0 && (
              <FieldError errors={errors.map((message) => ({ message }))} />
            )}
            <Field>
              <Button type="submit" size="lg" disabled={pending}>
                {pending ? "Connexion…" : "Se connecter"}
              </Button>
              <FieldDescription className="text-center">
                Pas encore de compte ?{" "}
                <Link href="/register" className="txt font-bold">
                  Inscris-toi
                </Link>
              </FieldDescription>
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}
