"use client"

import Link from "next/link"
import { useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { useState } from "react"

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
import { PokeButton } from "@/components/poke-button"

export function RegisterForm() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [errors, setErrors] = useState<string[]>([])
  const [pending, setPending] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    const password = String(data.get("password"))
    if (password !== data.get("confirm-password")) {
      setErrors(["Les mots de passe ne correspondent pas"])
      return
    }
    setPending(true)
    setErrors([])
    try {
      const user = await authApi.register(
        String(data.get("username")),
        String(data.get("email")),
        password,
      )
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
        <CardTitle>Nouveau dresseur</CardTitle>
        <CardDescription>
          Crée ton compte pour commencer l&apos;aventure.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="username">Pseudo</FieldLabel>
              <Input
                id="username"
                name="username"
                autoComplete="username"
                placeholder="Sacha"
                minLength={3}
                maxLength={20}
                required
              />
            </Field>
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
                autoComplete="new-password"
                minLength={8}
                required
              />
              <FieldDescription>8 caractères minimum.</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="confirm-password">
                Confirmer le mot de passe
              </FieldLabel>
              <Input
                id="confirm-password"
                name="confirm-password"
                type="password"
                autoComplete="new-password"
                required
              />
            </Field>
            {errors.length > 0 && (
              <FieldError errors={errors.map((message) => ({ message }))} />
            )}
            <Field>
              <PokeButton type="submit" size="lg" disabled={pending}>
                {pending ? "Création…" : "Créer mon compte"}
              </PokeButton>
              <FieldDescription className="text-center">
                Déjà un compte ?{" "}
                <Link href="/" className="txt font-bold">
                  Connecte-toi
                </Link>
              </FieldDescription>
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}
