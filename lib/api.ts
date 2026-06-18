/**
 * Art du Kivu API client
 * Base URL: https://jeremy-backend.onrender.com/api/v1
 */

const BASE_URL = "https://jeremy-backend.onrender.com/api/v1";

// ─── Generic fetch helper ────────────────────────────────────────────────────

async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("access_token") : null;

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

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
        message = JSON.stringify(raw);
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
  register: (data: RegisterPayload) =>
    apiFetch<{ detail: string }>("/auth/register/", {
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
  delete: (id: number) =>
    apiFetch<void>(`/users/${id}/`, { method: "DELETE" }),
};

// ─── Articles ─────────────────────────────────────────────────────────────────

export interface ArticleCategory {
  id: number;
  name: string;
  slug: string;
  color: string;
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

export interface ArticleWrite {
  title: string;
  content: string;
  category: number | string; // API expects category ID (integer)
  status: "published" | "draft" | "scheduled";
  tags?: string[];
  featured_image?: string;
  is_featured?: boolean;
  allow_comments?: boolean;
  published_at?: string;
}

export const articlesApi = {
  list: (params?: string) =>
    apiFetch<PaginatedResponse<ArticleList>>(
      `/articles/${params ? `?${params}` : ""}`
    ),
  get: (slug: string) => apiFetch<ArticleList>(`/articles/${slug}/`),
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
};

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
  city?: string;          // city slug or name
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
  delete: (slug: string) =>
    apiFetch<void>(`/events/${slug}/`, { method: "DELETE" }),
  featured: () => apiFetch<EventList[]>("/events/featured/"),
  cities: () => apiFetch<{ id: number; name: string }[]>("/events/cities/"),
};

// ─── Emissions ────────────────────────────────────────────────────────────────

/** Shape returned by GET /emissions/ list */
export interface EmissionList {
  id: number;
  title: string;
  slug: string;
  description?: string;
  cover_url: string | null;
  stream_url?: string;
  status: "live" | "scheduled" | "recorded" | "cancelled";
  scheduled_at: string;
  duration_minutes: number;
  viewer_count: number;
  total_views: number;
  host_names?: string[];
  created_at?: string;
}

export interface EmissionWrite {
  title: string;
  description: string;
  scheduled_at: string;
  duration_minutes: number;
  stream_url?: string;
}

export const emissionsApi = {
  list: (params?: string) =>
    apiFetch<PaginatedResponse<EmissionList>>(
      `/emissions/${params ? `?${params}` : ""}`
    ),
  get: (slug: string) => apiFetch<EmissionList>(`/emissions/${slug}/`),
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
}

export interface EpisodeWrite {
  title: string;
  description: string;
  series: number;
  audio_url?: string;
  status?: "published" | "draft" | "scheduled";
  published_at?: string;
}

export const podcastsApi = {
  list: (params?: string) =>
    apiFetch<PaginatedResponse<PodcastSeriesList>>(
      `/podcasts/${params ? `?${params}` : ""}`
    ),
  get: (slug: string) => apiFetch<PodcastSeriesList>(`/podcasts/${slug}/`),

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
    apiFetch<{ id: number; name: string }[]>("/podcasts/categories/"),
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

export const releasesApi = {
  list: (params?: string) =>
    apiFetch<PaginatedResponse<ReleaseList>>(
      `/releases/${params ? `?${params}` : ""}`
    ),
  featured: () => apiFetch<ReleaseList[]>("/releases/featured/"),
  calendar: () => apiFetch<ReleaseList[]>("/releases/calendar/"),
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
