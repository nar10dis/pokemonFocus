"use client"

import { useQuery } from "@tanstack/react-query"
import { api, authApi } from "@/lib/api"
import { addDays } from "@/lib/time"

export const keys = {
  me: ["me"] as const,
  profile: ["profile"] as const,
  titles: ["titles"] as const,
  pokedex: ["pokedex"] as const,
  collection: ["collection"] as const,
  themes: ["themes"] as const,
  sessions: ["sessions"] as const,
  activeSession: ["session", "active"] as const,
  session: (id: number) => ["session", id] as const,
  friends: ["friends"] as const,
  friendRequests: ["friend-requests"] as const,
}

export const useMe = () => useQuery({ queryKey: keys.me, queryFn: authApi.me, retry: false })
export const useProfile = () => useQuery({ queryKey: keys.profile, queryFn: api.profile })
export const useTitles = () => useQuery({ queryKey: keys.titles, queryFn: api.titles })
/** données statiques : chargées une seule fois */
export const usePokedex = () =>
  useQuery({ queryKey: keys.pokedex, queryFn: api.pokedex, staleTime: Infinity })
export const useCollection = () => useQuery({ queryKey: keys.collection, queryFn: api.collection })
export const useThemes = () => useQuery({ queryKey: keys.themes, queryFn: api.themes })
export const useActiveSession = () =>
  useQuery({ queryKey: keys.activeSession, queryFn: api.activeSession })
export const useFriends = () => useQuery({ queryKey: keys.friends, queryFn: api.friends })
export const useFriendRequests = () =>
  useQuery({ queryKey: keys.friendRequests, queryFn: api.friendRequests })

/** sessions terminées de la semaine commençant à `weekStart` */
export const useWeekSessions = (weekStart: Date) =>
  useQuery({
    queryKey: [...keys.sessions, weekStart.toISOString()],
    queryFn: () => api.sessions(weekStart, addDays(weekStart, 7)),
  })
