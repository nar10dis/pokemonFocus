export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

// ---------- types ----------

export type User = {
  id: number;
  email: string;
  username: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
};

export type Pokemon = {
  id: number;
  slug: string;
  image: string;
  name: string;
  types: string[];
  region: string;
  legendary: boolean;
  mythical: boolean;
};

export type OwnedPokemon = {
  pokemonId: number;
  level: number;
  captureCount: number;
  favoriteSlot: number | null;
  firstCapturedAt: string;
  lastCapturedAt: string;
};

export type Favorite = { favoriteSlot?: number | null; level: number; pokemon: Pokemon };

export type UserStats = {
  totalMinutes: number;
  sessions: number;
  captures: number;
  species: number;
  legendaries: number;
  mythicals: number;
};

export type Profile = {
  id: number;
  username: string;
  email: string;
  createdAt: string;
  lastLoginAt: string | null;
  titleNoun: string | null;
  titleAdjective: string | null;
  title: string;
  favoriteRegion: string | null;
  weeklyGoalMinutes: number;
  stats: UserStats;
  favorites: Favorite[];
};

export type TitleWord = {
  id: string;
  kind: "noun" | "adjective";
  label: string;
  requires: { stat: keyof UserStats; min: number } | null;
  unlocked: boolean;
};

export type Theme = {
  id: number;
  name: string;
  color: string;
  emoji: string;
  weeklyGoalMinutes: number | null;
  createdAt: string;
};

export type ThemeInput = Pick<Theme, "name" | "color" | "emoji"> & {
  weeklyGoalMinutes?: number | null;
};

export type SessionStatus = "RUNNING" | "PAUSED" | "COMPLETED" | "ABANDONED";

export type SessionCapture = {
  id: number;
  pokemonId: number;
  isNew: boolean;
  levelAfter: number;
  capturedAt: string;
  pokemon: Pokemon;
};

export type WorkSession = {
  id: number;
  themeId: number | null;
  region: string;
  plannedMinutes: number;
  status: SessionStatus;
  startedAt: string;
  pausedAt: string | null;
  pausedMs: number;
  endedAt: string | null;
  /** temps effectif écoulé (pauses exclues) au moment de la réponse */
  elapsedMs: number;
  theme: Theme | null;
  captures: SessionCapture[];
};

export type SessionSummary = Omit<WorkSession, "captures" | "elapsedMs"> & {
  _count: { captures: number };
};

export type PublicUser = {
  id: number;
  username: string;
  lastLoginAt: string | null;
  title: string;
};

export type Friend = PublicUser & {
  favorites: { level: number; pokemon: Pokemon }[];
  lastCapture: { capturedAt: string; pokemon: Pokemon } | null;
};

export type FriendRequest = { id: number; createdAt: string; user: PublicUser };

// ---------- client ----------

export class ApiError extends Error {
  constructor(
    public status: number,
    public messages: string[],
  ) {
    super(messages[0]);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      credentials: "include",
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    throw new ApiError(0, ["Impossible de joindre le serveur"]);
  }
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const message = body?.message ?? "Une erreur est survenue";
    throw new ApiError(res.status, Array.isArray(message) ? message : [message]);
  }
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

const post = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) });
const patch = <T>(path: string, body: unknown) =>
  request<T>(path, { method: "PATCH", body: JSON.stringify(body) });
const put = <T>(path: string, body: unknown) =>
  request<T>(path, { method: "PUT", body: JSON.stringify(body) });
const del = <T = void>(path: string) => request<T>(path, { method: "DELETE" });

export function errorMessage(err: unknown) {
  return err instanceof ApiError ? err.messages.join(" · ") : "Erreur inattendue";
}

export const authApi = {
  login: (email: string, password: string) => post<User>("/auth/login", { email, password }),
  register: (username: string, email: string, password: string) =>
    post<User>("/auth/register", { username, email, password }),
  logout: () => post<void>("/auth/logout"),
  me: () => request<User>("/auth/me"),
};

export const api = {
  pokedex: () => request<Pokemon[]>("/pokemon"),
  regions: () => request<string[]>("/pokemon/regions"),

  profile: () => request<Profile>("/me/profile"),
  updateProfile: (
    data: Partial<Pick<Profile, "titleNoun" | "titleAdjective" | "favoriteRegion" | "weeklyGoalMinutes">>,
  ) => patch<Profile>("/me", data),
  titles: () => request<TitleWord[]>("/me/titles"),
  collection: () => request<OwnedPokemon[]>("/me/pokemon"),
  setFavorites: (pokemonIds: number[]) => put<Favorite[]>("/me/favorites", { pokemonIds }),

  themes: () => request<Theme[]>("/themes"),
  createTheme: (data: ThemeInput) => post<Theme>("/themes", data),
  updateTheme: (id: number, data: Partial<ThemeInput>) => patch<Theme>(`/themes/${id}`, data),
  deleteTheme: (id: number) => del(`/themes/${id}`),

  sessions: (from: Date, to: Date) =>
    request<SessionSummary[]>(
      `/sessions?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`,
    ),
  // Nest renvoie un corps vide pour `null`
  activeSession: () => request<WorkSession | undefined>("/sessions/active").then((s) => s ?? null),
  session: (id: number) => request<WorkSession>(`/sessions/${id}`),
  startSession: (data: { region: string; plannedMinutes: number; themeId?: number }) =>
    post<WorkSession>("/sessions", data),
  pauseSession: (id: number) => post<WorkSession>(`/sessions/${id}/pause`),
  resumeSession: (id: number) => post<WorkSession>(`/sessions/${id}/resume`),
  abandonSession: (id: number) => post<WorkSession>(`/sessions/${id}/abandon`),
  completeSession: (id: number) => post<WorkSession>(`/sessions/${id}/complete`),

  friends: () => request<Friend[]>("/friends"),
  friendRequests: () =>
    request<{ incoming: FriendRequest[]; outgoing: FriendRequest[] }>("/friends/requests"),
  sendFriendRequest: (query: string) =>
    post<{ status: "PENDING" | "ACCEPTED"; username: string }>("/friends/requests", { query }),
  acceptFriendRequest: (id: number) => post<void>(`/friends/requests/${id}/accept`),
  declineFriendRequest: (id: number) => del(`/friends/requests/${id}`),
  removeFriend: (userId: number) => del(`/friends/${userId}`),
};
