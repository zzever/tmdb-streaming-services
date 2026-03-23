import { useQuery } from "@tanstack/react-query";
import { 
  useGetPopularTitles, 
  useSearchTitles, 
  useGetStreamingProviders,
  useGetTitleDetails,
  useGetList,
} from "@workspace/api-client-react";

export {
  useGetPopularTitles,
  useSearchTitles,
  useGetStreamingProviders,
  useGetTitleDetails,
  useGetList,
};

// ── Genre/metadata IDs used by TMDB discover API ──
export const MOVIE_GENRES: { id: number; name: string }[] = [
  { id: 28, name: "Acción" },
  { id: 35, name: "Comedia" },
  { id: 18, name: "Drama" },
  { id: 27, name: "Terror" },
  { id: 878, name: "Ciencia ficción" },
  { id: 10749, name: "Romance" },
  { id: 16, name: "Animación" },
  { id: 53, name: "Thriller" },
  { id: 80, name: "Crimen" },
  { id: 12, name: "Aventura" },
  { id: 14, name: "Fantasía" },
  { id: 99, name: "Documental" },
];

export const SERIES_GENRES: { id: number; name: string }[] = [
  { id: 10759, name: "Acción" },
  { id: 35, name: "Comedia" },
  { id: 18, name: "Drama" },
  { id: 10765, name: "Sci-Fi / Fantasía" },
  { id: 80, name: "Crimen" },
  { id: 10768, name: "Guerra / Política" },
  { id: 16, name: "Animación" },
  { id: 99, name: "Documental" },
  { id: 10751, name: "Familia" },
  { id: 9648, name: "Misterio" },
];

// ── Releases ──
export interface ReleaseTitle {
  tmdbId: number;
  title: string;
  poster: string | null;
  backdrop: string | null;
  rating: number | null;
  year: number | null;
  releaseDate: string | null;
  overview: string | null;
  genres: string[];
  type: "movie" | "series";
}

export function useGetReleases(
  params: { type: "movie" | "series"; country?: string; mode?: string; releaseType?: "theater" | "streaming" | "any" },
  options?: { query?: { enabled?: boolean } }
) {
  const { type, country = "ES", mode = "upcoming", releaseType = "any" } = params;
  return useQuery({
    queryKey: ["releases", type, country, mode, releaseType],
    queryFn: async () => {
      const url = `/api/streaming/releases?type=${type}&country=${country}&mode=${mode}&releaseType=${releaseType}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch releases");
      return res.json() as Promise<{ results: ReleaseTitle[] }>;
    },
    enabled: options?.query?.enabled !== false,
    staleTime: 5 * 60 * 1000,
  });
}

// ── Discover (genre/year filter) ──
export interface DiscoverTitle {
  imdbId: string | null;
  tmdbId: number;
  title: string;
  type: "movie" | "series";
  year: number | null;
  poster: string | null;
  backdrop: string | null;
  overview: string | null;
  rating: number | null;
  genres: string[];
}

export function useDiscover(
  params: {
    type: "movie" | "series";
    country?: string;
    genreId?: number | null;
    genreIds?: string | null;
    year?: string | null;
    page?: number;
    originLanguage?: string | null;
    alwaysEnabled?: boolean;
    sortBy?: string | null;
    withProvider?: number | string | null;
  },
  options?: { query?: { enabled?: boolean } }
) {
  const { type, country = "ES", genreId, genreIds, year, page = 1, originLanguage, alwaysEnabled, sortBy, withProvider } = params;
  const enabled = alwaysEnabled || !!(genreId || genreIds || year || originLanguage || withProvider);
  return useQuery({
    queryKey: ["discover", type, country, genreId ?? null, genreIds ?? null, year ?? null, page, originLanguage ?? null, sortBy ?? null, withProvider ?? null],
    queryFn: async () => {
      const u = new URL("/api/streaming/discover", window.location.origin);
      u.searchParams.set("type", type);
      u.searchParams.set("country", country);
      u.searchParams.set("page", String(page));
      if (genreId) u.searchParams.set("genreId", String(genreId));
      if (genreIds) u.searchParams.set("genreId", genreIds);
      if (year) u.searchParams.set("year", year);
      if (originLanguage) u.searchParams.set("originLanguage", originLanguage);
      if (sortBy) u.searchParams.set("sortBy", sortBy);
      if (withProvider) u.searchParams.set("withProvider", String(withProvider));
      const res = await fetch(u.toString());
      if (!res.ok) throw new Error("Failed to fetch discover results");
      return res.json() as Promise<{ results: DiscoverTitle[]; page: number; totalPages: number }>;
    },
    enabled: enabled && options?.query?.enabled !== false,
    staleTime: 3 * 60 * 1000,
  });
}

// ── Providers by TMDB ID (fallback when imdbId is null — discover results) ──
export function useGetProvidersByTmdbId(
  params: { tmdbId: number; type: "movie" | "series"; country?: string },
  options?: { query?: { enabled?: boolean } }
) {
  const { tmdbId, type, country = "ES" } = params;
  return useQuery({
    queryKey: ["providers-by-tmdb", tmdbId, type, country],
    queryFn: async () => {
      const res = await fetch(`/api/streaming/providers-by-tmdb?tmdbId=${tmdbId}&type=${type}&country=${country}`);
      if (!res.ok) throw new Error("Failed to fetch providers");
      return res.json() as Promise<{ imdbId: string | null; tmdbId: number; title: string; type: string; providers: import("@workspace/api-client-react/src/generated/api.schemas").StreamingProvider[] }>;
    },
    enabled: options?.query?.enabled !== false,
    staleTime: 5 * 60 * 1000,
  });
}

// ── Kitsu anime metadata ──
export interface KitsuAnime {
  id: string;
  title: string;
  titleJa: string | null;
  synopsis: string | null;
  episodeCount: number | null;
  episodeLength: number | null;
  status: string | null;
  rating: number | null;
  poster: string | null;
  cover: string | null;
  subtype: string | null;
  ageRating: string | null;
  kitsuUrl: string;
}

export function useKitsuSearch(title: string, enabled = true) {
  return useQuery({
    queryKey: ["kitsu", title],
    queryFn: async () => {
      const res = await fetch(`/api/streaming/kitsu?q=${encodeURIComponent(title)}`);
      if (!res.ok) throw new Error("Kitsu error");
      const json = await res.json() as { data: KitsuAnime[] };
      return json.data;
    },
    enabled: enabled && title.length > 0,
    staleTime: 30 * 60 * 1000,
  });
}

// ── Random title (beyond the top 20 shown) ──
export async function fetchRandomTitle(
  type: "movie" | "series",
  country: string,
  opts?: { genreIds?: string; originLanguage?: string }
): Promise<DiscoverTitle | null> {
  const u = new URL("/api/streaming/random", window.location.origin);
  u.searchParams.set("type", type);
  u.searchParams.set("country", country);
  if (opts?.genreIds)        u.searchParams.set("genreIds", opts.genreIds);
  if (opts?.originLanguage)  u.searchParams.set("originLanguage", opts.originLanguage);
  const res = await fetch(u.toString());
  if (!res.ok) return null;
  return res.json();
}

// ── Person filmography ──
export interface PersonCredit {
  tmdbId: number;
  title: string;
  poster: string | null;
  rating: number | null;
  year: number | null;
  genres: string[];
  character: string | null;
  type: "movie" | "series";
}

export interface PersonData {
  name: string;
  photo: string | null;
  credits: PersonCredit[];
  role: "actor" | "director";
}

// ── Watch providers by country (for streaming service chips) ──
export interface WatchProvider { id: number; name: string; logo: string | null; displayPriority: number; }

export function useWatchProviders(country: string, type: "movie" | "series" = "movie") {
  return useQuery({
    queryKey: ["watch-providers", country, type],
    queryFn: async () => {
      const res = await fetch(`/api/streaming/watch-providers?country=${country}&type=${type}`);
      if (!res.ok) throw new Error("Failed to fetch watch providers");
      return res.json() as Promise<{ providers: WatchProvider[]; country: string }>;
    },
    staleTime: 24 * 60 * 60 * 1000,
  });
}

// ── Live TV channels ──
export function useLiveChannels(params?: { group?: string }) {
  return useQuery({
    queryKey: ["live-channels", params?.group ?? "all"],
    queryFn: async () => {
      const u = new URL("/api/streaming/live-channels", window.location.origin);
      if (params?.group) u.searchParams.set("group", params.group);
      const res = await fetch(u.toString());
      if (!res.ok) throw new Error("Failed to fetch live channels");
      return res.json() as Promise<{
        channels: Array<{ id: string; name: string; logo: string; groups: string[]; url: string }>;
        groups: Array<{ id: string; label: string; count: number }>;
        total: number;
      }>;
    },
    staleTime: 60 * 60 * 1000,
  });
}

// ── EPG ──
export interface EpgProgram { title: string; desc: string | null; start: number; stop: number; }
export interface EpgResult { current: EpgProgram | null; next: EpgProgram | null; }

export function useEpg(tvgIds: string[]) {
  return useQuery({
    queryKey: ["epg", tvgIds.slice().sort().join(",")],
    queryFn: async (): Promise<Record<string, EpgResult>> => {
      if (tvgIds.length === 0) return {};
      const ids = tvgIds.slice(0, 50).join(",");
      const res = await fetch(`/api/streaming/epg?ids=${encodeURIComponent(ids)}`);
      if (!res.ok) throw new Error("EPG fetch failed");
      const data = await res.json();
      return data.epg ?? {};
    },
    enabled: tvgIds.length > 0,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
}

export function useGetPersonFilmography(
  name: string,
  options?: { query?: { enabled?: boolean } }
) {
  return useQuery({
    queryKey: ["person", name],
    queryFn: async () => {
      const url = `/api/streaming/person?name=${encodeURIComponent(name)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch person data");
      return res.json() as Promise<PersonData>;
    },
    enabled: !!name && options?.query?.enabled !== false,
    staleTime: 10 * 60 * 1000,
  });
}
