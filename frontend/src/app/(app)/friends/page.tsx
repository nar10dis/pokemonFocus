"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Check, UserMinus, UserPlus, X } from "lucide-react"
import { motion } from "motion/react"
import { useState } from "react"
import { toast } from "sonner"
import { Loading, PageShell } from "@/components/page-shell"
import { PokemonImage } from "@/components/pokemon-image"
import { TrainerAvatar } from "@/components/trainer-avatar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { api, errorMessage, type Friend, type FriendRequest } from "@/lib/api"
import { keys, useFriendRequests, useFriends } from "@/lib/queries"
import { timeAgo } from "@/lib/time"
import { PokeButton } from "@/components/poke-button"

export default function FriendsPage() {
  const queryClient = useQueryClient()
  const friends = useFriends()
  const requests = useFriendRequests()
  const [query, setQuery] = useState("")

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: keys.friends })
    queryClient.invalidateQueries({ queryKey: keys.friendRequests })
  }
  const onError = (err: unknown) => toast.error(errorMessage(err))

  const send = useMutation({
    mutationFn: api.sendFriendRequest,
    onSuccess: (r) => {
      toast.success(
        r.status === "ACCEPTED"
          ? `${r.username} t'avait déjà demandé : vous êtes amis !`
          : `Demande envoyée à ${r.username}`,
      )
      setQuery("")
      refresh()
    },
    onError,
  })
  const accept = useMutation({ mutationFn: api.acceptFriendRequest, onSuccess: refresh, onError })
  const decline = useMutation({ mutationFn: api.declineFriendRequest, onSuccess: refresh, onError })
  const remove = useMutation({
    mutationFn: api.removeFriend,
    onSuccess: () => {
      toast("Ami retiré")
      refresh()
    },
    onError,
  })

  if (!friends.data || !requests.data) return <Loading />
  const { incoming, outgoing } = requests.data

  return (
    <PageShell title="Amis" subtitle={`${friends.data.length} ami${friends.data.length > 1 ? "s" : ""}`}>
      <Card>
        <CardHeader>
          <CardTitle>Ajouter un ami</CardTitle>
          <CardDescription>Entre son pseudo ou son ID dresseur (ex : #00012).</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="flex gap-3"
            onSubmit={(e) => {
              e.preventDefault()
              if (query.trim()) send.mutate(query.trim())
            }}
          >
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Pseudo ou #ID"
              aria-label="Pseudo ou ID dresseur"
            />
            <PokeButton type="submit" disabled={send.isPending || !query.trim()}>
              <UserPlus data-icon="inline-start" /> Envoyer
            </PokeButton>
          </form>
        </CardContent>
      </Card>

      {(incoming.length > 0 || outgoing.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Demandes</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {incoming.map((r) => (
              <RequestRow key={r.id} request={r} label="veut être ton ami">
                <PokeButton size="sm" onClick={() => accept.mutate(r.id)} disabled={accept.isPending}>
                  <Check data-icon="inline-start" /> Accepter
                </PokeButton>
                <PokeButton color="red" size="sm" onClick={() => decline.mutate(r.id)} aria-label="Refuser">
                  <X />
                </PokeButton>
              </RequestRow>
            ))}
            {outgoing.map((r) => (
              <RequestRow key={r.id} request={r} label="demande envoyée">
                <PokeButton color="red" size="sm" onClick={() => decline.mutate(r.id)}>
                  Annuler
                </PokeButton>
              </RequestRow>
            ))}
          </CardContent>
        </Card>
      )}

      {friends.data.length === 0 ? (
        <p className="txt py-8 text-center font-heading text-xl">
          Pas encore d&apos;amis… invite quelqu&apos;un !
        </p>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {friends.data.map((f, i) => (
            <FriendCard key={f.id} friend={f} index={i} onRemove={() => remove.mutate(f.id)} />
          ))}
        </ul>
      )}
    </PageShell>
  )
}

function RequestRow({
  request,
  label,
  children,
}: {
  request: FriendRequest
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="tile flex flex-wrap items-center gap-3 rounded-lg px-3 py-2">
      <TrainerAvatar user={request.user} />
      <p className="txt min-w-0 flex-1 font-semibold">
        <b>{request.user.username}</b> {label}
      </p>
      <div className="flex gap-2">{children}</div>
    </div>
  )
}

function FriendCard({ friend: f, index, onRemove }: { friend: Friend; index: number; onRemove: () => void }) {
  return (
    <motion.li initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
      <Card size="sm" className="h-full">
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <TrainerAvatar user={f} size="md" />
            <div className="min-w-0 flex-1">
              <p className="txt truncate font-heading text-lg">{f.username}</p>
              <p className="txt truncate text-sm font-semibold">{f.title}</p>
            </div>
            <PokeButton color="red" size="icon" onClick={onRemove} aria-label={`Retirer ${f.username}`}>
              <UserMinus />
            </PokeButton>
          </div>
          <p className="txt text-sm font-semibold">Dernière connexion : {timeAgo(f.lastLoginAt)}</p>

          <div>
            <p className="txt mb-1 text-xs font-bold uppercase">Favoris</p>
            {f.favorites.length ? (
              <div className="flex flex-wrap gap-1">
                {f.favorites.map((fav) => (
                  <div key={fav.pokemon.id} title={`${fav.pokemon.name} · Niv. ${fav.level}`}>
                    <PokemonImage pokemon={fav.pokemon} size={48} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="txt text-sm opacity-80">Aucun favori</p>
            )}
          </div>

          <div className="tile flex items-center gap-3 rounded-lg px-3 py-2">
            {f.lastCapture ? (
              <>
                <PokemonImage pokemon={f.lastCapture.pokemon} size={48} />
                <div className="min-w-0">
                  <p className="txt text-xs font-bold uppercase">Dernière capture</p>
                  <p className="txt truncate font-semibold">
                    {f.lastCapture.pokemon.name} · {timeAgo(f.lastCapture.capturedAt)}
                  </p>
                </div>
              </>
            ) : (
              <p className="txt text-sm font-semibold">Aucune capture pour l&apos;instant</p>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.li>
  )
}
