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
  params: { type: "movie" | "series"; country?: string; mode?: string },
  options?: { query?: { enabled?: boolean } }
) {
  const { type, country = "ES", mode = "upcoming" } = params;
  return useQuery({
    queryKey: ["releases", type, country, mode],
    queryFn: async () => {
      const url = `/api/streaming/releases?type=${type}&country=${country}&mode=${mode}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch releases");
      return res.json() as Promise<{ results: ReleaseTitle[] }>;
    },
    enabled: options?.query?.enabled !== false,
    staleTime: 5 * 60 * 1000,
  });
}

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
