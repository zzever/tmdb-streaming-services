const TMDB_API_KEY = process.env.TMDB_API_KEY || '859cc2e71ad61f716670e302a58a9603';
const TMDB_BASE = 'https://api.themoviedb.org/3';
const ES_COUNTRY = 'ES';

export interface TmdbProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string | null;
}

export interface TmdbWatchProviders {
  flatrate?: TmdbProvider[];
  rent?: TmdbProvider[];
  buy?: TmdbProvider[];
  free?: TmdbProvider[];
  ads?: TmdbProvider[];
  link?: string;
}

export interface TmdbSearchResult {
  id: number;
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path?: string | null;
  overview?: string;
  vote_average?: number;
  media_type?: string;
  external_ids?: { imdb_id?: string | null };
}

async function tmdbFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${TMDB_BASE}${path}`);
  url.searchParams.set('api_key', TMDB_API_KEY);
  url.searchParams.set('language', 'es-ES');
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`TMDB API error: ${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<T>;
}

export async function findTmdbId(imdbId: string, type: 'movie' | 'series'): Promise<number | null> {
  const endpoint = '/find/' + imdbId;
  const data = await tmdbFetch<Record<string, TmdbSearchResult[]>>(endpoint, {
    external_source: 'imdb_id',
  });

  if (type === 'series') {
    return data.tv_results?.[0]?.id ?? null;
  } else {
    return data.movie_results?.[0]?.id ?? null;
  }
}

export async function getTmdbTitle(tmdbId: number, type: 'movie' | 'series'): Promise<string> {
  if (type === 'series') {
    const data = await tmdbFetch<{ name?: string; title?: string }>(`/tv/${tmdbId}`);
    return data.name || data.title || '';
  } else {
    const data = await tmdbFetch<{ title?: string; name?: string }>(`/movie/${tmdbId}`);
    return data.title || data.name || '';
  }
}

export async function getWatchProviders(
  tmdbId: number,
  type: 'movie' | 'series'
): Promise<TmdbWatchProviders | null> {
  const path = type === 'series' ? `/tv/${tmdbId}/watch/providers` : `/movie/${tmdbId}/watch/providers`;
  const data = await tmdbFetch<{ results?: Record<string, TmdbWatchProviders> }>(path);
  return data.results?.[ES_COUNTRY] ?? null;
}

export interface MappedProvider {
  name: string;
  logo: string | null;
  type: string;
  providerId: number;
  tmdbUrl: string;
}

export function mapProviders(providers: TmdbWatchProviders): MappedProvider[] {
  const result: MappedProvider[] = [];
  const types: Array<keyof TmdbWatchProviders> = ['flatrate', 'rent', 'buy', 'free', 'ads'];

  for (const provType of types) {
    const items = providers[provType] as TmdbProvider[] | undefined;
    if (!items) continue;
    for (const prov of items) {
      const logoPath = prov.logo_path ? `https://image.tmdb.org/t/p/w185${prov.logo_path}` : null;
      result.push({
        name: prov.provider_name,
        logo: logoPath,
        type: provType as string,
        providerId: prov.provider_id,
        tmdbUrl: `https://www.themoviedb.org/watch/providers/movie?provider=${prov.provider_id}`,
      });
    }
  }

  return result;
}

export async function searchTmdb(
  query: string,
  type?: 'movie' | 'series'
): Promise<{ results: TmdbSearchResult[]; totalResults: number }> {
  if (type === 'movie') {
    const data = await tmdbFetch<{ results: TmdbSearchResult[]; total_results: number }>('/search/movie', { query });
    return { results: data.results || [], totalResults: data.total_results || 0 };
  } else if (type === 'series') {
    const data = await tmdbFetch<{ results: TmdbSearchResult[]; total_results: number }>('/search/tv', { query });
    return { results: data.results || [], totalResults: data.total_results || 0 };
  } else {
    const data = await tmdbFetch<{ results: TmdbSearchResult[]; total_results: number }>('/search/multi', { query });
    const filtered = (data.results || []).filter(
      (r) => r.media_type === 'movie' || r.media_type === 'tv'
    );
    return { results: filtered, totalResults: data.total_results || 0 };
  }
}

export async function getPopular(
  type: 'movie' | 'series',
  page: number = 1
): Promise<{ results: TmdbSearchResult[]; totalPages: number }> {
  const path = type === 'series' ? '/tv/popular' : '/movie/popular';
  const data = await tmdbFetch<{ results: TmdbSearchResult[]; total_pages: number }>(path, {
    page: String(page),
  });
  return { results: data.results || [], totalPages: data.total_pages || 1 };
}

export function parseYear(result: TmdbSearchResult): number | null {
  const dateStr = result.release_date || result.first_air_date;
  if (!dateStr) return null;
  const year = parseInt(dateStr.split('-')[0], 10);
  return isNaN(year) ? null : year;
}

export function posterUrl(posterPath: string | null | undefined): string | null {
  if (!posterPath) return null;
  return `https://image.tmdb.org/t/p/w342${posterPath}`;
}
