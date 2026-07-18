/**
 * Art du Kivu API client
 * Appels via le proxy same-origin /api/v1 (voir rewrites dans next.config.mjs)
 * qui relaie vers le backend hébergé, ce qui évite les problèmes de CORS.
 */

const BASE_URL = "/api/v1";

// ─── Token refresh (SimpleJWT) ───────────────────────────────────────────────
// L'access token expire vite. À la première 401, on tente de le rafraîchir via
// le refresh token, puis on rejoue la requête. Une seule requête de refresh à
// la fois (les appels concurrents partagent la même promesse).

let refreshPromise: Promise<string | null> | null = null;

function clearSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("current_user");
}

async function refreshAccessToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const refresh = localStorage.getItem("refresh_token");
  if (!refresh) return null;

  if (!refreshPromise) {
    refreshPromise = fetch(`${BASE_URL}/auth/token/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    })
      .then(async (r) => {
        if (!r.ok) return null;
        const data = await r.json().catch(() => null);
        if (data?.access) {
          localStorage.setItem("access_token", data.access);
          if (data.refresh) localStorage.setItem("refresh_token", data.refresh);
          return data.access as string;
        }
        return null;
      })
      .catch(() => null)
      .finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

// ─── Generic fetch helper ────────────────────────────────────────────────────

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  retry = false
): Promise<T> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("access_token") : null;

  // Pour un upload de fichier (FormData), on laisse le navigateur définir le
  // Content-Type (avec la boundary multipart) — surtout pas application/json.
  const isFormData =
    typeof FormData !== "undefined" && options.body instanceof FormData;

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  // Token expiré / invalide : on rafraîchit puis on rejoue une fois.
  if (res.status === 401 && !retry && typeof window !== "undefined") {
    const newToken = await refreshAccessToken();
    if (newToken) {
      return apiFetch<T>(path, options, true);
    }
    // Refresh impossible -> session terminée, retour au login.
    clearSession();
    if (!window.location.pathname.startsWith("/login")) {
      window.location.href = "/login";
    }
    throw new Error("Session expirée, veuillez vous reconnecter.");
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));

    // Django REST Framework peut retourner detail comme string OU objet
    // Ex: {"detail": "Impossible de se connecter..."}
    // Ex: {"detail": {"non_field_errors": ["..."]}}
    // Ex: {"email": ["..."]}  (validation errors)
    const raw = (error as Record<string, unknown>).detail ?? error;
    let message: string;

    if (typeof raw === "string") {
      message = raw;
    } else if (typeof raw === "object" && raw !== null) {
      // Aplatit le premier message d'erreur disponible
      const values = Object.values(raw as Record<string, unknown>);
      const first = values[0];
      if (Array.isArray(first) && typeof first[0] === "string") {
        message = first[0];
      } else if (typeof first === "string") {
        message = first;
      } else {
        // Corps vide ou forme inattendue : on évite d'afficher "{}"
        message = `Erreur HTTP ${res.status}`;
      }
    } else {
      message = `Erreur HTTP ${res.status}`;
    }

    throw new Error(message);
  }

  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

// ─── Pagination wrapper ───────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  total_pages?: number;
  current_page?: number;
  results: T[];
}

// ─── Médias : upload Cloudinary (signature backend) ───────────────────────────
// Flux : on demande une signature au backend (le secret reste côté serveur),
// puis le navigateur envoie le fichier DIRECTEMENT à Cloudinary avec ces
// paramètres signés, et on récupère l'URL finale (secure_url).

/** Réponse (souple) de /media/upload-signature/ — paramètres signés Cloudinary. */
export type UploadSignature = Record<string, string | number> & {
  cloud_name?: string;
  resource_type?: string;
};

export const mediaApi = {
  uploadSignature: (context: string) =>
    apiFetch<UploadSignature>("/media/upload-signature/", {
      method: "POST",
      body: JSON.stringify({ context }),
    }),
};

// Nom de cloud public (fallback si la signature ne le renvoie pas).
const CLOUDINARY_CLOUD_NAME =
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "dc4scpfuz";

/**
 * Téléverse un fichier vers Cloudinary via une signature backend, et renvoie
 * l'URL sécurisée. `context` identifie l'usage côté backend (ex. "artist_photo",
 * "podcast_cover"). Réémet TOUS les paramètres signés reçus → robuste quelle que
 * soit la forme exacte de la réponse.
 */
export async function uploadToCloudinary(file: File, context: string): Promise<string> {
  const sig = await mediaApi.uploadSignature(context);

  const cloudName = String(sig.cloud_name || CLOUDINARY_CLOUD_NAME);
  const resourceType = String(sig.resource_type || "auto");

  const form = new FormData();
  form.append("file", file);
  // Réémet chaque paramètre signé (signature, timestamp, api_key, folder, …),
  // sauf ceux de contrôle qui ne font pas partie du POST Cloudinary.
  for (const [k, v] of Object.entries(sig)) {
    if (k === "cloud_name" || k === "resource_type") continue;
    form.append(k, String(v));
  }

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`,
    { method: "POST", body: form }
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.secure_url) {
    throw new Error(data?.error?.message || "Échec de l'upload Cloudinary");
  }
  return data.secure_url as string;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface JWT {
  access: string;
  refresh: string;
  user: User;  // login response includes user object directly
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  username: string;
  email: string;
  password1: string;
  password2: string;
  first_name?: string;
  last_name?: string;
}

export const authApi = {
  login: (data: LoginPayload) =>
    apiFetch<JWT>("/auth/login/", { method: "POST", body: JSON.stringify(data) }),
  // Connexion sociale Google : le backend attend access_token OU code
  // (id_token non supporté). Renvoie un JWT comme /auth/login/.
  google: (data: { access_token?: string; code?: string }) =>
    apiFetch<JWT>("/auth/google/", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  // Le backend crée le compte ET renvoie directement { access, refresh, user }
  // (connexion immédiate), même si is_verified vaut false.
  register: (data: RegisterPayload) =>
    apiFetch<JWT>("/auth/register/", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  resetPassword: (data: { email: string }) =>
    apiFetch<{ detail: string }>("/auth/password/reset/", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  resetPasswordConfirm: (data: {
    uid: string;
    token: string;
    new_password1: string;
    new_password2: string;
  }) =>
    apiFetch<{ detail: string }>("/auth/password/reset/confirm/", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  refresh: (refresh: string) =>
    apiFetch<JWT>("/auth/token/refresh/", {
      method: "POST",
      body: JSON.stringify({ refresh }),
    }),
  me: () => apiFetch<User>("/auth/me/"),
  logout: () => apiFetch<void>("/auth/logout/", { method: "POST" }),
};

// ─── Users ────────────────────────────────────────────────────────────────────

export interface User {
  id: number;
  email: string;
  username: string;
  handle?: string;
  bio?: string;
  role: "admin" | "editor" | "moderator" | "viewer" | "user";
  is_active?: boolean;
  is_verified?: boolean;
  is_online?: boolean;
  listen_count?: number;
  avatar_url?: string | null;
  created_at?: string;
  last_login?: string;
  // kept for compatibility — may be empty strings from the API
  first_name?: string;
  last_name?: string;
}

export const usersApi = {
  list: (params?: string) =>
    apiFetch<PaginatedResponse<User>>(`/users/${params ? `?${params}` : ""}`),
  get: (id: number) => apiFetch<User>(`/users/${id}/`),
  update: (id: number, data: Partial<User>) =>
    apiFetch<User>(`/users/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  // Pas de DELETE /users/{id}/ ; suppression via l'action groupée.
  bulkDelete: (ids: number[]) =>
    apiFetch<void>("/users/bulk_delete/", {
      method: "POST",
      body: JSON.stringify({ ids }),
    }),
};

// ─── Articles ─────────────────────────────────────────────────────────────────

export interface ArticleCategory {
  id: number;
  name: string;
  slug: string;
  color: string;
}

export interface ArticleTag {
  id: number;
  name: string;
  slug: string;
}

/** Shape returned by GET /articles/ list */
export interface ArticleList {
  id: number;
  title: string;
  slug: string;
  excerpt?: string;
  featured_image_url: string | null;
  category: ArticleCategory | string; // list returns object, write uses string
  author_name: string;
  read_time?: number;
  view_count: number;
  like_count: number;
  is_featured: boolean;
  published_at: string | null;
}

export interface ArticleAuthor {
  id: number;
  username: string;
  avatar_url: string | null;
}

/** Shape returned by GET /articles/{slug}/ (detail) */
export interface ArticleDetail {
  id: number;
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  featured_image_url: string | null;
  category: ArticleCategory | null;
  tags: (string | { id: number; name: string; slug?: string })[];
  author: ArticleAuthor;
  article_type?: string;
  read_time?: number;
  view_count: number;
  like_count: number;
  is_featured: boolean;
  status: "published" | "draft" | "scheduled";
  published_at: string | null;
}

export interface ArticleWrite {
  title: string;
  content: string;
  // enum backend : draft | published uniquement. La programmation se fait via
  // status="published" + scheduled_at (date future).
  status: "published" | "draft";
  category?: number | null;   // ID catégorie (integer nullable)
  author?: number | null;     // ID auteur (integer nullable)
  excerpt?: string;
  article_type?: "blog" | "magazine";
  tags?: number[];            // IDs de tags (voir resolveTagIds)
  featured_image?: string;
  is_featured?: boolean;
  read_time?: number;
  scheduled_at?: string;
}

export const articlesApi = {
  list: (params?: string) =>
    apiFetch<PaginatedResponse<ArticleList>>(
      `/articles/${params ? `?${params}` : ""}`
    ),
  get: (slug: string) => apiFetch<ArticleDetail>(`/articles/${slug}/`),
  create: (data: ArticleWrite) =>
    apiFetch<ArticleList>("/articles/", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (slug: string, data: Partial<ArticleWrite>) =>
    apiFetch<ArticleList>(`/articles/${slug}/`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  delete: (slug: string) =>
    apiFetch<void>(`/articles/${slug}/`, { method: "DELETE" }),
  categories: () => apiFetch<ArticleCategory[]>("/articles/categories/"),
  tags: (params?: string) =>
    apiFetch<PaginatedResponse<ArticleTag>>(`/articles/tags/${params ? `?${params}` : ""}`),
  createTag: (name: string) =>
    apiFetch<ArticleTag>("/articles/tags/", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),
};

/**
 * Résout des tags saisis en texte libre vers des IDs (l'API attend des IDs).
 * Réutilise les tags existants (match insensible à la casse) et crée les manquants.
 */
export async function resolveTagIds(names: string[]): Promise<number[]> {
  const clean = names.map((n) => n.trim()).filter(Boolean);
  if (!clean.length) return [];
  let existing: ArticleTag[] = [];
  try {
    existing = (await articlesApi.tags("page_size=100")).results;
  } catch {
    /* liste indisponible : on tentera la création */
  }
  const byName = new Map(existing.map((t) => [t.name.toLowerCase(), t]));
  const ids: number[] = [];
  for (const name of clean) {
    const found = byName.get(name.toLowerCase());
    if (found) { ids.push(found.id); continue; }
    try {
      const created = await articlesApi.createTag(name);
      ids.push(created.id);
      byName.set(name.toLowerCase(), created);
    } catch {
      /* échec de création : on ignore ce tag */
    }
  }
  return ids;
}

// ─── Artists ──────────────────────────────────────────────────────────────────

/** Shape returned by GET /artists/ list */
export interface ArtistList {
  id: number;
  name: string;
  slug: string;
  city?: string;
  country?: string;
  photo_url: string | null;
  cover_url?: string | null;
  is_featured: boolean;
  genre_names: string[];
  genres?: { id: number; name: string; slug: string }[];
  bio?: string;
  social_links?: {
    instagram?: string;
    facebook?: string;
    twitter?: string;
    youtube?: string;
  };
  release_count?: number;
  video_count?: number;
}

export interface ArtistWrite {
  name: string;
  bio?: string;
  city?: string;
  photo?: string;              // URL Cloudinary (contexte upload: artist_photo)
  cover_image?: string;        // URL Cloudinary (contexte upload: artist_cover)
  genres?: number[];           // array of genre IDs
  is_featured?: boolean;
  social_links?: {
    instagram?: string;
    facebook?: string;
    twitter?: string;
    youtube?: string;
  };
}

export const artistsApi = {
  list: (params?: string) =>
    apiFetch<PaginatedResponse<ArtistList>>(
      `/artists/${params ? `?${params}` : ""}`
    ),
  get: (slug: string) => apiFetch<ArtistList>(`/artists/${slug}/`),
  create: (data: ArtistWrite) =>
    apiFetch<ArtistList>("/artists/", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (slug: string, data: Partial<ArtistWrite>) =>
    apiFetch<ArtistList>(`/artists/${slug}/`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  delete: (slug: string) =>
    apiFetch<void>(`/artists/${slug}/`, { method: "DELETE" }),
  genres: () => apiFetch<{ id: number; name: string }[]>("/artists/genres/"),
};

// ─── Events ───────────────────────────────────────────────────────────────────

/** Shape returned by GET /events/ list */
export interface EventList {
  id: number;
  title: string;
  slug: string;
  description?: string;
  image_url: string | null;
  date: string;
  end_date: string;
  city?: { id: number; name: string; slug: string };
  city_name?: string;
  venue_name?: string;
  venue_address?: string;
  category: string;
  status: "upcoming" | "ongoing" | "live" | "past" | "cancelled";
  is_featured: boolean;
  ticket_price: string | number | null;
  ticket_link?: string;
  max_capacity?: number | null;
  current_registrations?: number;
  registration_progress: number | null;
}

export interface EventWrite {
  title: string;
  description: string;
  date: string;           // ISO datetime
  end_date?: string;
  venue_name: string;     // required by API
  venue_address?: string;
  city?: number | null;   // city primary key (ID)
  category: string;
  ticket_price?: number | null;
  ticket_link?: string;
  max_capacity?: number | null;
  image?: string;
  is_featured?: boolean;
}

export const eventsApi = {
  list: (params?: string) =>
    apiFetch<PaginatedResponse<EventList>>(
      `/events/${params ? `?${params}` : ""}`
    ),
  get: (slug: string) => apiFetch<EventList>(`/events/${slug}/`),
  create: (data: EventWrite) =>
    apiFetch<EventList>("/events/", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (slug: string, data: Partial<EventWrite>) =>
    apiFetch<EventList>(`/events/${slug}/`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  // Variantes multipart pour l'upload de l'image (fichier).
  createForm: (data: FormData) =>
    apiFetch<EventList>("/events/", { method: "POST", body: data }),
  updateForm: (slug: string, data: FormData) =>
    apiFetch<EventList>(`/events/${slug}/`, { method: "PATCH", body: data }),
  delete: (slug: string) =>
    apiFetch<void>(`/events/${slug}/`, { method: "DELETE" }),
  featured: () => apiFetch<EventList[]>("/events/featured/"),
  cities: () => apiFetch<{ id: number; name: string }[]>("/events/cities/"),
};

// ─── Emissions ────────────────────────────────────────────────────────────────

/** Shape returned by GET /emissions/ list */
/** Statut d'une émission (enum backend Status9c3Enum). */
export type EmissionStatus = "live" | "scheduled" | "recorded";

export interface EmissionList {
  id: number;
  title: string;
  slug: string;
  description?: string;
  cover_url: string | null;
  stream_url?: string;
  status: EmissionStatus;
  scheduled_at: string | null;   // nullable côté backend
  duration_minutes: number;
  viewer_count: number;
  total_views: number;
  host_names?: string[];
  created_at?: string;
}

export interface EmissionWrite {
  title: string;                 // seul champ requis côté backend
  description?: string;
  scheduled_at?: string | null;  // nullable
  duration_minutes?: number;
  stream_url?: string;
  status?: EmissionStatus;
  cover?: string;                // URL Cloudinary (contexte upload: emission_cover)
}

/** Détail émission avec les URLs de lecture Cloudflare Stream */
export interface EmissionDetail extends EmissionList {
  playback_hls_url?: string;
}

/**
 * Extrait les identifiants RTMPS d'une réponse go_live, quelle que soit la
 * forme des champs (le backend peut les nommer cf_rtmps_*, rtmps_*, ou les
 * imbriquer dans un objet rtmps). Renvoie null si introuvables.
 */
export function extractStreamCreds(
  res: unknown
): { url: string; key: string } | null {
  const r = (res ?? {}) as Record<string, unknown>;
  const rtmps = (r.rtmps ?? {}) as Record<string, unknown>;
  const url =
    r.rtmp_server_url ?? r.cf_rtmps_url ?? r.rtmps_url ?? r.stream_url ?? r.ingest_url ??
    rtmps.url ?? rtmps.streamUrl;
  const key =
    r.stream_key ?? r.cf_rtmps_key ?? r.rtmps_key ?? r.ingest_key ??
    rtmps.key ?? rtmps.streamKey;
  return typeof url === "string" && typeof key === "string" && url && key
    ? { url, key }
    : null;
}

export const emissionsApi = {
  list: (params?: string) =>
    apiFetch<PaginatedResponse<EmissionList>>(
      `/emissions/${params ? `?${params}` : ""}`
    ),
  get: (slug: string) => apiFetch<EmissionDetail>(`/emissions/${slug}/`),
  // Enregistre un partage (comptabilisé même en anonyme)
  share: (slug: string) =>
    apiFetch<{ share_count?: number }>(`/emissions/${slug}/share/`, { method: "POST" }),
  create: (data: EmissionWrite) =>
    apiFetch<EmissionList>("/emissions/", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (slug: string, data: Partial<EmissionWrite>) =>
    apiFetch<EmissionList>(`/emissions/${slug}/`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  delete: (slug: string) =>
    apiFetch<void>(`/emissions/${slug}/`, { method: "DELETE" }),
  live: () => apiFetch<EmissionList[]>("/emissions/live/"),
  // Démarrer / arrêter la diffusion (Cloudflare Stream). go_live renvoie les
  // identifiants RTMPS (à afficher une seule fois pour OBS).
  goLive: (slug: string) =>
    apiFetch<{ rtmp_server_url?: string; stream_key?: string; playback_hls_url?: string; status?: string; is_live?: boolean }>(
      `/emissions/${slug}/go_live/`, { method: "POST" }
    ),
  endLive: (slug: string) =>
    apiFetch<void>(`/emissions/${slug}/end_live/`, { method: "POST" }),
};

// ─── Podcasts ─────────────────────────────────────────────────────────────────

/** Shape returned by GET /podcasts/ list */
export interface PodcastSeriesList {
  id: number;
  title: string;       // API returns "title" not "name"
  slug: string;
  description: string;
  cover_url: string | null;
  category: string;
  is_featured: boolean;
  episode_count: number;
  // detail fields (not always present on list)
  host?: string;
  total_plays?: number;
  subscribers_count?: number;
  status?: "active" | "paused";
}

/** Shape returned by GET /podcasts/episodes/ list */
export interface EpisodeList {
  id: number;
  title: string;
  slug: string;
  description: string;
  cover_url: string | null;
  audio_url?: string | null;
  duration: string;
  episode_number: number;
  season_number: number;
  play_count: number;
  is_featured: boolean;
  published_at: string | null;
  series_title?: string;   // from list endpoint
  series_slug?: string;    // from list endpoint
  series?: {               // from detail endpoint
    id: number;
    title: string;
    slug: string;
  };
  guests?: (number | { id: number; name?: string })[]; // détail uniquement
  transcript?: string;     // détail uniquement
}

export interface EpisodeWrite {
  title: string;
  series: number;
  published_at: string;       // requis par le backend (date-time ISO)
  description?: string;
  audio_url?: string;         // lien du fichier audio (uri, max 200)
  duration?: string;          // ex. "12:34" (max 10)
  episode_number?: number;
  season_number?: number;
  is_featured?: boolean;
  cover?: string;             // URL Cloudinary (upload via contexte podcast_cover)
  guests?: number[];          // IDs des artistes invités
  transcript?: string;        // transcription écrite (optionnelle)
}

export interface PodcastSeriesWrite {
  title: string;
  category: string;      // slug: talk | culture | musique | societe | jeunesse | sport
  description?: string;
  cover?: string;        // URL Cloudinary (contexte upload: podcast_cover)
  is_featured?: boolean;
}

export const podcastsApi = {
  list: (params?: string) =>
    apiFetch<PaginatedResponse<PodcastSeriesList>>(
      `/podcasts/${params ? `?${params}` : ""}`
    ),
  get: (slug: string) => apiFetch<PodcastSeriesList>(`/podcasts/${slug}/`),
  create: (data: PodcastSeriesWrite) =>
    apiFetch<PodcastSeriesList>("/podcasts/", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  episodes: {
    list: (params?: string) =>
      apiFetch<PaginatedResponse<EpisodeList>>(
        `/podcasts/episodes/${params ? `?${params}` : ""}`
      ),
    get: (slug: string) =>
      apiFetch<EpisodeList>(`/podcasts/episodes/${slug}/`),
    create: (data: EpisodeWrite) =>
      apiFetch<EpisodeList>("/podcasts/episodes/", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (slug: string, data: Partial<EpisodeWrite>) =>
      apiFetch<EpisodeList>(`/podcasts/episodes/${slug}/`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    delete: (slug: string) =>
      apiFetch<void>(`/podcasts/episodes/${slug}/`, { method: "DELETE" }),
  },

  categories: () =>
    apiFetch<{ id: string; label: string }[]>("/podcasts/categories/"),
};

// ─── Releases ─────────────────────────────────────────────────────────────────

export interface ReleaseList {
  id: number;
  title: string;
  slug: string;
  cover_url: string | null;
  release_date: string;
  format: string;
  is_featured: boolean;
  is_premiere: boolean;
  artist_name: string;
  artist_slug: string;
}

/** Formats valides (enum backend Format088Enum). */
export type ReleaseFormat = "album" | "single" | "clip" | "documentaire" | "expo";

export interface ReleaseWrite {
  artist: number;              // ID artiste (requis)
  title: string;               // requis
  format: ReleaseFormat;       // requis
  release_date: string;        // requis (date YYYY-MM-DD)
  description?: string;
  preview_url?: string;
  cover?: string;              // URL Cloudinary (contexte upload: release_cover)
  is_featured?: boolean;
  is_premiere?: boolean;
}

export const releasesApi = {
  list: (params?: string) =>
    apiFetch<PaginatedResponse<ReleaseList>>(
      `/releases/${params ? `?${params}` : ""}`
    ),
  featured: () => apiFetch<ReleaseList[]>("/releases/featured/"),
  calendar: () => apiFetch<ReleaseList[]>("/releases/calendar/"),
  get: (slug: string) => apiFetch<ReleaseList>(`/releases/${slug}/`),
  create: (data: ReleaseWrite) =>
    apiFetch<ReleaseList>("/releases/", { method: "POST", body: JSON.stringify(data) }),
  update: (slug: string, data: Partial<ReleaseWrite>) =>
    apiFetch<ReleaseList>(`/releases/${slug}/`, { method: "PATCH", body: JSON.stringify(data) }),
  delete: (slug: string) =>
    apiFetch<void>(`/releases/${slug}/`, { method: "DELETE" }),
};

// ─── Home / Dashboard ─────────────────────────────────────────────────────────

export interface HomeData {
  featured_artists?: ArtistList[];
  latest_news?: ArticleList[];
  top_releases?: unknown[];
  // stats if the API exposes them
  stats?: {
    monthly_visits?: number;
    newsletter_subscribers?: number;
    published_articles?: number;
    upcoming_events?: number;
  };
}

export const homeApi = {
  get: () => apiFetch<HomeData>("/home/"),
};

// ─── WebTV videos (médiathèque) ───────────────────────────────────────────────

export interface VideoListItem {
  id: number;
  title: string;
  slug: string;
  thumbnail_url: string | null;
  duration: string;
  category: string;
  is_premier: boolean;
  is_live: boolean;
  location?: string;
  view_count: number;
  published_at: string | null;
}

export interface VideoDetail extends VideoListItem {
  description?: string;
  video_url?: string;
  playback_hls_url?: string;
}

export interface VideoWrite {
  title: string;
  video_url: string;
  category: string;
  published_at: string;
  description?: string;
  duration?: string;
  location?: string;
  is_premier?: boolean;
  thumbnail?: string;
}

export const videosApi = {
  list: (params?: string) =>
    apiFetch<PaginatedResponse<VideoListItem>>(
      `/webtv/videos/${params ? `?${params}` : ""}`
    ),
  live: () => apiFetch<VideoListItem[]>("/webtv/videos/live/"),
  get: (slug: string) => apiFetch<VideoDetail>(`/webtv/videos/${slug}/`),
  create: (data: VideoWrite) =>
    apiFetch<VideoDetail>("/webtv/videos/", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (slug: string, data: Partial<VideoWrite>) =>
    apiFetch<VideoDetail>(`/webtv/videos/${slug}/`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  delete: (slug: string) =>
    apiFetch<void>(`/webtv/videos/${slug}/`, { method: "DELETE" }),
  share: (slug: string) =>
    apiFetch<{ share_count?: number }>(`/webtv/videos/${slug}/share/`, { method: "POST" }),
  goLive: (slug: string) =>
    apiFetch<{ rtmp_server_url?: string; stream_key?: string; playback_hls_url?: string; status?: string; is_live?: boolean }>(
      `/webtv/videos/${slug}/go_live/`, { method: "POST" }
    ),
  endLive: (slug: string) =>
    apiFetch<void>(`/webtv/videos/${slug}/end_live/`, { method: "POST" }),
  bulkDelete: (ids: number[]) =>
    apiFetch<void>("/webtv/videos/bulk_delete/", { method: "POST", body: JSON.stringify({ ids }) }),
};

// ─── Analytics (admin) ────────────────────────────────────────────────────────

export interface DashboardCounts {
  artists?: number;
  articles?: number;
  events?: number;
  event_registrations?: number;
  podcast_series?: number;
  podcast_episodes?: number;
  radio_programs?: number;
  webtv_videos?: number;
  releases?: number;
}

export interface DashboardTotals {
  article_views?: number;
  article_likes?: number;
  webtv_views?: number;
  podcast_plays?: number;
  post_likes?: number;
}

export interface DashboardStats {
  counts: DashboardCounts;
  totals: DashboardTotals;
  top_articles: { id: number; title: string; slug: string; view_count: number }[];
  top_webtv_videos: { id: number; title: string; slug: string; view_count: number }[];
  top_podcast_episodes: { id: number; title: string; slug: string; play_count: number }[];
}

export const analyticsApi = {
  dashboard: () => apiFetch<DashboardStats>("/analytics/dashboard/"),
};

// ─── Recherche unifiée ────────────────────────────────────────────────────────

export interface SearchResult {
  type: string;
  id: number;
  slug: string;
  title: string;
  image_url: string | null;
  score?: number;
}

export interface SearchResponse {
  count: number;
  page: number;
  page_size: number;
  results: SearchResult[];
}

export const searchApi = {
  query: (q: string, type?: string) => {
    const p = new URLSearchParams({ q });
    if (type) p.set("type", type);
    return apiFetch<SearchResponse>(`/search/?${p.toString()}`);
  },
};

// ─── Newsletter ───────────────────────────────────────────────────────────────

export interface NewsletterSubscriber {
  id: number;
  email: string;
  is_confirmed: boolean;
  is_active: boolean;
  subscribed_at?: string;
  confirmed_at?: string | null;
}

export interface NewsletterCampaign {
  id: number;
  subject: string;
  body_html?: string;
  status?: string;
  created_by_name?: string;
  recipient_count?: number;
  created_at?: string;
  sent_at?: string | null;
}

export const newsletterApi = {
  subscribers: (params?: string) =>
    apiFetch<PaginatedResponse<NewsletterSubscriber>>(
      `/newsletter/subscribers/${params ? `?${params}` : ""}`
    ),
  campaigns: {
    list: (params?: string) =>
      apiFetch<PaginatedResponse<NewsletterCampaign>>(
        `/newsletter/campaigns/${params ? `?${params}` : ""}`
      ),
    create: (data: { subject: string; body_html: string }) =>
      apiFetch<NewsletterCampaign>("/newsletter/campaigns/", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    send: (id: number) =>
      apiFetch<{ detail?: string }>(`/newsletter/campaigns/${id}/send/`, {
        method: "POST",
      }),
  },
};

// ─── Radio ────────────────────────────────────────────────────────────────────

export type RadioStatus = "live" | "upcoming" | "ended";

export interface RadioProgram {
  id: number;
  title: string;
  slug: string;
  description?: string;
  cover_url: string | null;
  start_time: string;          // "HH:MM:SS"
  end_time: string;
  day_of_week: number;         // 0..6
  day_name?: string;
  presenter?: string;
  status: RadioStatus;
  stream_url?: string;
  playback_hls_url?: string;
  listener_count?: number;
}

export interface RadioProgramWrite {
  title: string;               // requis
  start_time: string;          // requis "HH:MM"
  end_time: string;            // requis
  description?: string;
  day_of_week?: number;
  presenter?: string;
  status?: RadioStatus;
  stream_url?: string;
  cover?: string;              // URL Cloudinary (contexte upload: radio_cover)
}

export const radioApi = {
  list: (params?: string) =>
    apiFetch<PaginatedResponse<RadioProgram>>(`/radio/program/${params ? `?${params}` : ""}`),
  current: () => apiFetch<RadioProgram | null>("/radio/current/"),
  get: (id: number) => apiFetch<RadioProgram>(`/radio/program/${id}/`),
  create: (data: RadioProgramWrite) =>
    apiFetch<RadioProgram>("/radio/program/", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: Partial<RadioProgramWrite>) =>
    apiFetch<RadioProgram>(`/radio/program/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  delete: (id: number) =>
    apiFetch<void>(`/radio/program/${id}/`, { method: "DELETE" }),
  goLive: (id: number) =>
    apiFetch<{ rtmp_server_url?: string; stream_key?: string; playback_hls_url?: string; status?: string; is_live?: boolean }>(
      `/radio/program/${id}/go_live/`, { method: "POST" }),
  endLive: (id: number) =>
    apiFetch<void>(`/radio/program/${id}/end_live/`, { method: "POST" }),
};

// ─── Live Music ───────────────────────────────────────────────────────────────

export type MusicSessionStatus = "live" | "scheduled" | "ended";

export interface MusicLiveSession {
  id: number;
  title: string;
  slug: string;
  artist_names?: string;
  status: MusicSessionStatus;
  playback_hls_url?: string;
  online_followers?: string;
  live_started_at?: string | null;
  created_at?: string;
}

export interface MusicLiveSessionWrite {
  title: string;               // seul champ requis
  artists?: number[];
  status?: MusicSessionStatus;
  cover?: string;              // URL Cloudinary (upload via un contexte image valide)
}

export interface MusicLiveSlot {
  id: number;
  title: string;
  artist_name?: string;
  day_of_week: number;
  day_name?: string;
  start_time: string;
  end_time: string;
  duration_minutes?: number;
}

export interface MusicLiveSlotWrite {
  title: string;               // requis
  start_time: string;          // requis
  end_time: string;            // requis
  artist?: number | null;
  day_of_week?: number;
  duration_minutes?: number;
}

export const liveMusicApi = {
  sessions: {
    list: (params?: string) =>
      apiFetch<PaginatedResponse<MusicLiveSession>>(`/live_music/sessions/${params ? `?${params}` : ""}`),
    current: () => apiFetch<MusicLiveSession | null>("/live_music/sessions/current/"),
    get: (slug: string) => apiFetch<MusicLiveSession>(`/live_music/sessions/${slug}/`),
    create: (data: MusicLiveSessionWrite) =>
      apiFetch<MusicLiveSession>("/live_music/sessions/", { method: "POST", body: JSON.stringify(data) }),
    update: (slug: string, data: Partial<MusicLiveSessionWrite>) =>
      apiFetch<MusicLiveSession>(`/live_music/sessions/${slug}/`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (slug: string) =>
      apiFetch<void>(`/live_music/sessions/${slug}/`, { method: "DELETE" }),
    goLive: (slug: string) =>
      apiFetch<{ rtmp_server_url?: string; stream_key?: string; playback_hls_url?: string; status?: string; is_live?: boolean }>(
        `/live_music/sessions/${slug}/go_live/`, { method: "POST" }),
    endLive: (slug: string) =>
      apiFetch<void>(`/live_music/sessions/${slug}/end_live/`, { method: "POST" }),
  },
  programme: {
    list: (params?: string) =>
      apiFetch<PaginatedResponse<MusicLiveSlot>>(`/live_music/programme/${params ? `?${params}` : ""}`),
    create: (data: MusicLiveSlotWrite) =>
      apiFetch<MusicLiveSlot>("/live_music/programme/", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: Partial<MusicLiveSlotWrite>) =>
      apiFetch<MusicLiveSlot>(`/live_music/programme/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: number) =>
      apiFetch<void>(`/live_music/programme/${id}/`, { method: "DELETE" }),
  },
};

// ─── Community ────────────────────────────────────────────────────────────────

export type PostType = "talent" | "art" | "news";

export interface CommunityPost {
  id: number;
  author_name?: string;
  author_avatar?: string | null;
  title?: string;
  content: string;
  media?: string | null;
  post_type: PostType;
  like_count?: number;
  comment_count?: string | number;
  created_at?: string;
}

export interface CommunityPostWrite {
  content: string;             // requis (max 2000)
  post_type: PostType;         // requis
}

export interface PollOption {
  id?: number;
  text?: string;
  label?: string;
  vote_count?: number;
}

export interface Poll {
  id: number;
  question: string;
  vote_count?: number;
  options?: PollOption[];
  expires_at?: string | null;
  is_active?: boolean;
  created_at?: string;
}

export interface PollWrite {
  question: string;            // requis
  options?: string[];
  expires_at?: string | null;
  is_active?: boolean;
}

export interface Challenge {
  id: number;
  title: string;
  slug: string;
  description?: string;
  cover_url?: string | null;
  prize?: string;
  deadline: string;
  participant_count?: number;
  is_active?: boolean;
}

export interface ChallengeWrite {
  title: string;               // requis
  slug: string;                // requis
  description: string;         // requis
  deadline: string;            // requis (date-time ISO)
  prize?: string;
  is_active?: boolean;
}

export const communityApi = {
  posts: {
    list: (params?: string) =>
      apiFetch<PaginatedResponse<CommunityPost>>(`/community/posts/${params ? `?${params}` : ""}`),
    get: (id: number) => apiFetch<CommunityPost>(`/community/posts/${id}/`),
    create: (data: CommunityPostWrite) =>
      apiFetch<CommunityPost>("/community/posts/", { method: "POST", body: JSON.stringify(data) }),
    delete: (id: number) =>
      apiFetch<void>(`/community/posts/${id}/`, { method: "DELETE" }),
  },
  polls: {
    list: (params?: string) =>
      apiFetch<PaginatedResponse<Poll>>(`/community/polls/${params ? `?${params}` : ""}`),
    create: (data: PollWrite) =>
      apiFetch<Poll>("/community/polls/", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: Partial<PollWrite>) =>
      apiFetch<Poll>(`/community/polls/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: number) =>
      apiFetch<void>(`/community/polls/${id}/`, { method: "DELETE" }),
  },
  challenges: {
    list: (params?: string) =>
      apiFetch<PaginatedResponse<Challenge>>(`/community/challenges/${params ? `?${params}` : ""}`),
    get: (slug: string) => apiFetch<Challenge>(`/community/challenges/${slug}/`),
    create: (data: ChallengeWrite) =>
      apiFetch<Challenge>("/community/challenges/", { method: "POST", body: JSON.stringify(data) }),
    update: (slug: string, data: Partial<ChallengeWrite>) =>
      apiFetch<Challenge>(`/community/challenges/${slug}/`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (slug: string) =>
      apiFetch<void>(`/community/challenges/${slug}/`, { method: "DELETE" }),
  },
};

// ─── Modération : commentaires & chat ─────────────────────────────────────────

/** Un commentaire (forme souple : les champs varient légèrement selon la ressource). */
export interface CommentItem {
  id: number;
  author_name?: string;
  author_avatar?: string | null;
  content?: string;
  text?: string;
  body?: string;
  created_at?: string;
}

/**
 * Commentaires génériques. `resource` = préfixe complet du chemin :
 * "articles" | "emissions" | "webtv/videos" | "releases" |
 * "live_music/sessions" | "podcasts/episodes" | "community/posts".
 * `id` = slug ou id numérique selon la ressource.
 */
export const commentsApi = {
  list: (resource: string, id: string | number) =>
    apiFetch<PaginatedResponse<CommentItem>>(`/${resource}/${id}/comments/`),
  remove: (resource: string, id: string | number, commentId: number) =>
    apiFetch<void>(`/${resource}/${id}/comments/${commentId}/`, { method: "DELETE" }),
};

/** Un message de chat live. */
export interface ChatMessage {
  id: number;
  author_name?: string;
  username?: string;
  content?: string;
  message?: string;
  text?: string;
  created_at?: string;
}

/** Chat par ressource live (webtv/videos, live_music/sessions). */
export const chatApi = {
  list: (resource: string, slug: string) =>
    apiFetch<PaginatedResponse<ChatMessage>>(`/${resource}/${slug}/chat/`),
  remove: (resource: string, slug: string, messageId: number) =>
    apiFetch<void>(`/${resource}/${slug}/chat/${messageId}/`, { method: "DELETE" }),
};

/** Chat radio (global, pas par programme). */
export const radioChatApi = {
  list: () => apiFetch<PaginatedResponse<ChatMessage>>("/radio/chat/"),
  remove: (id: number) => apiFetch<void>(`/radio/chat/${id}/`, { method: "DELETE" }),
};
