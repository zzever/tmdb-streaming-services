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
  },
  options?: { query?: { enabled?: boolean } }
) {
  const { type, country = "ES", genreId, genreIds, year, page = 1, originLanguage, alwaysEnabled } = params;
  const enabled = alwaysEnabled || !!(genreId || genreIds || year || originLanguage);
  return useQuery({
    queryKey: ["discover", type, country, genreId ?? null, genreIds ?? null, year ?? null, page, originLanguage ?? null],
    queryFn: async () => {
      const u = new URL("/api/streaming/discover", window.location.origin);
      u.searchParams.set("type", type);
      u.searchParams.set("country", country);
      u.searchParams.set("page", String(page));
      if (genreId) u.searchParams.set("genreId", String(genreId));
      if (genreIds) u.searchParams.set("genreId", genreIds);
      if (year) u.searchParams.set("year", year);
      if (originLanguage) u.searchParams.set("originLanguage", originLanguage);
      const res = await fetch(u.toString());
      if (!res.ok) throw new Error("Failed to fetch discover results");
      return res.json() as Promise<{ results: DiscoverTitle[]; page: number; totalPages: number }>;
    },
    enabled: enabled && options?.query?.enabled !== false,
    staleTime: 3 * 60 * 1000,
  });
}

// ── Random title (beyond the top 20 shown) ──
export async function fetchRandomTitle(type: "movie" | "series", country: string): Promise<DiscoverTitle | null> {
  const res = await fetch(`/api/streaming/random?type=${type}&country=${country}`);
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
