const TMDB_API_KEY = process.env.TMDB_API_KEY || '859cc2e71ad61f716670e302a58a9603';
const TMDB_BASE = 'https://api.themoviedb.org/3';
const DEFAULT_COUNTRY = 'ES';

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
  backdrop_path?: string | null;
  overview?: string;
  vote_average?: number;
  media_type?: string;
  genre_ids?: number[];
  external_ids?: { imdb_id?: string | null };
}

const TMDB_GENRE_MAP: Record<number, string> = {
  28: "Acción", 12: "Aventura", 16: "Animación", 35: "Comedia",
  80: "Crimen", 99: "Documental", 18: "Drama", 10751: "Familia",
  14: "Fantasía", 36: "Historia", 27: "Terror", 10402: "Música",
  9648: "Misterio", 10749: "Romance", 878: "Ciencia ficción",
  10770: "Película de TV", 53: "Suspense", 10752: "Bélica", 37: "Western",
  10759: "Acción y aventura", 10762: "Infantil", 10763: "Noticias",
  10764: "Reality", 10765: "Sci-Fi y fantasía", 10766: "Telenovela",
  10767: "Talk Show", 10768: "Política",
};

export function mapGenres(genreIds?: number[]): string[] {
  if (!genreIds) return [];
  return genreIds.slice(0, 3).map((id) => TMDB_GENRE_MAP[id]).filter(Boolean);
}

export function backdropUrl(backdropPath: string | null | undefined): string | null {
  if (!backdropPath) return null;
  return `https://image.tmdb.org/t/p/w1280${backdropPath}`;
}

export async function tmdbFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
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

export async function getImdbId(tmdbId: number, type: 'movie' | 'series'): Promise<string | null> {
  const path = type === 'series' ? `/tv/${tmdbId}/external_ids` : `/movie/${tmdbId}/external_ids`;
  try {
    const data = await tmdbFetch<{ imdb_id?: string | null }>(path);
    return data.imdb_id ?? null;
  } catch {
    return null;
  }
}

export async function getTmdbTitle(tmdbId: number, type: 'movie' | 'series', language = 'en-US'): Promise<string> {
  if (type === 'series') {
    const data = await tmdbFetch<{ name?: string; title?: string; original_name?: string }>(`/tv/${tmdbId}`, { language });
    return data.name || data.original_name || data.title || '';
  } else {
    const data = await tmdbFetch<{ title?: string; name?: string; original_title?: string }>(`/movie/${tmdbId}`, { language });
    return data.title || data.original_title || data.name || '';
  }
}

export async function getWatchProviders(
  tmdbId: number,
  type: 'movie' | 'series',
  country: string = DEFAULT_COUNTRY
): Promise<{ data: TmdbWatchProviders; watchUrl: string } | null> {
  const path = type === 'series' ? `/tv/${tmdbId}/watch/providers` : `/movie/${tmdbId}/watch/providers`;
  const raw = await tmdbFetch<{ results?: Record<string, TmdbWatchProviders> }>(path);
  const countryData = raw.results?.[country.toUpperCase()] ?? null;
  if (!countryData) return null;
  return {
    data: countryData,
    watchUrl: countryData.link ?? `https://www.justwatch.com/`,
  };
}

export interface MappedProvider {
  name: string;
  logo: string | null;
  type: string;
  providerId: number;
  tmdbUrl: string;
  watchUrl: string;
}

export function mapProviders(
  providers: TmdbWatchProviders,
  watchUrl: string,
  tmdbId?: number,
  mediaType?: "movie" | "series",
  country: string = DEFAULT_COUNTRY,
): MappedProvider[] {
  const result: MappedProvider[] = [];
  // Priority order: subscription first, then free, then transactional — ads excluded entirely
  const types: Array<keyof TmdbWatchProviders> = ['flatrate', 'free', 'rent', 'buy'];
  // Deduplicate by provider_id — keep only the highest-priority monetization type
  const seenProviderIds = new Set<number>();

  const locale = country.toUpperCase();
  const watchPageUrl = tmdbId
    ? mediaType === "series"
      ? `https://www.themoviedb.org/tv/${tmdbId}/watch?locale=${locale}`
      : `https://www.themoviedb.org/movie/${tmdbId}/watch?locale=${locale}`
    : null;

  // Names containing these strings are excluded regardless of monetization type
  const EXCLUDED_NAME_FRAGMENTS = ['with ads', 'con anuncios', 'standard with'];

  for (const provType of types) {
    const items = providers[provType] as TmdbProvider[] | undefined;
    if (!items) continue;
    for (const prov of items) {
      if (seenProviderIds.has(prov.provider_id)) continue;
      const nameLower = prov.provider_name.toLowerCase();
      if (EXCLUDED_NAME_FRAGMENTS.some((f) => nameLower.includes(f))) continue;
      seenProviderIds.add(prov.provider_id);
      const logoPath = prov.logo_path ? `https://image.tmdb.org/t/p/w185${prov.logo_path}` : null;
      result.push({
        name: prov.provider_name,
        logo: logoPath,
        type: provType as string,
        providerId: prov.provider_id,
        tmdbUrl: watchPageUrl ?? `https://www.themoviedb.org/watch/providers/movie?provider=${prov.provider_id}`,
        watchUrl,
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
  page: number = 1,
  country: string = DEFAULT_COUNTRY
): Promise<{ results: TmdbSearchResult[]; totalPages: number }> {
  // Use /discover with watch_region so results are specific to the selected country
  const path = type === 'series' ? '/discover/tv' : '/discover/movie';
  const data = await tmdbFetch<{ results: TmdbSearchResult[]; total_pages: number }>(path, {
    page: String(page),
    sort_by: 'popularity.desc',
    watch_region: country.toUpperCase(),
    with_watch_monetization_types: 'flatrate|free',
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

export interface TmdbDetails {
  id: number;
  title?: string;
  name?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
  genres?: { id: number; name: string }[];
  runtime?: number;
  number_of_seasons?: number;
}

export async function getTmdbBasicById(tmdbId: number, type: 'movie' | 'series') {
  try {
    const path = type === 'series' ? `/tv/${tmdbId}` : `/movie/${tmdbId}`;
    const raw = await tmdbFetch<any>(path);
    return {
      tmdbId: raw.id as number,
      imdbId: (raw.imdb_id || null) as string | null,
      title: (raw.title || raw.name || '') as string,
      overview: (raw.overview || null) as string | null,
      poster: (raw.poster_path || null) as string | null,
      backdrop: (raw.backdrop_path || null) as string | null,
      rating: (raw.vote_average || null) as number | null,
      year: parseYear(raw),
      genres: mapGenres((raw.genres ?? []).map((g: any) => g.id)),
      type,
    };
  } catch {
    return null;
  }
}

export async function getTmdbDetails(imdbId: string, type: 'movie' | 'series'): Promise<TmdbDetails | null> {
  try {
    const tmdbId = await findTmdbId(imdbId, type);
    if (!tmdbId) return null;
    const path = type === 'series' ? `/tv/${tmdbId}` : `/movie/${tmdbId}`;
    return await tmdbFetch<TmdbDetails>(path);
  } catch {
    return null;
  }
}

export interface CastMember {
  name: string;
  character: string;
  photo: string | null;
  order: number;
}

export interface SimilarTitle {
  tmdbId: number;
  title: string;
  poster: string | null;
  backdrop: string | null;
  rating: number | null;
  year: number | null;
  genres: string[];
}

export interface RichDetails {
  tagline: string | null;
  runtime: number | null;
  status: string | null;
  budget: number | null;
  revenue: number | null;
  director: string | null;
  creators: string[];
  cast: CastMember[];
  similar: SimilarTitle[];
  trailerKey: string | null;
  spokenLanguages: string[];
  productionCountries: string[];
  numberOfSeasons: number | null;
  voteCount: number | null;
  faRating: number | null;
  faUrl: string | null;
  faVotes: number | null;
}

const FA_CX = "008177178803676006601%3Amrme5orikjy";

function buildFaGlobalSearchUrl(query: string): string {
  return `https://www.filmaffinity.com/es/globalsearch.php?cx=${FA_CX}&cof=FORID%3A9&q=${encodeURIComponent(query)}&ie=latin1`;
}

async function fetchFilmAffinityRating(
  title: string,
  year: number | null,
  director?: string | null
): Promise<{ rating: number | null; url: string | null; votes: number | null }> {
  try {
    const query = `${title}${year ? ` ${year}` : ''}${director ? ` ${director}` : ''}`;
    const searchUrl = buildFaGlobalSearchUrl(query);
    const res = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9',
        'Cookie': 'cookiePolicy=accepted',
      },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return { rating: null, url: searchUrl, votes: null };
    const html = await res.text();
    const filmMatch = html.match(/href="(\/es\/film(\d+)\.html)"/);
    if (!filmMatch) return { rating: null, url: searchUrl, votes: null };
    const filmPath = filmMatch[1];
    const filmUrl = `https://www.filmaffinity.com${filmPath}`;
    const filmRes = await fetch(filmUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': 'text/html',
        'Accept-Language': 'es-ES,es;q=0.9',
        'Cookie': 'cookiePolicy=accepted',
        'Referer': searchUrl,
      },
      signal: AbortSignal.timeout(6000),
    });
    if (!filmRes.ok) return { rating: null, url: filmUrl, votes: null };
    const filmHtml = await filmRes.text();
    const ratingMatch = filmHtml.match(/class="[^"]*avgrat-box[^"]*"[^>]*>\s*([\d,]+)\s*</);
    const votesMatch = filmHtml.match(/class="[^"]*numvotes-box[^"]*"[^>]*>\s*([\d.,]+)\s*</);
    const rating = ratingMatch ? parseFloat(ratingMatch[1].replace(',', '.')) : null;
    const votes = votesMatch ? parseInt(votesMatch[1].replace(/\D/g, ''), 10) : null;
    return { rating: isNaN(rating as number) ? null : rating, url: filmUrl, votes: isNaN(votes as number) ? null : votes };
  } catch {
    return { rating: null, url: null, votes: null };
  }
}

export async function getTitleRichDetails(
  tmdbId: number,
  type: 'movie' | 'series'
): Promise<RichDetails> {
  const path = type === 'series' ? `/tv/${tmdbId}` : `/movie/${tmdbId}`;

  const raw = await tmdbFetch<any>(path, {
    append_to_response: 'credits,similar,videos',
  });

  const faTitle = raw.title || raw.name || '';
  const faYearRaw = raw.release_date || raw.first_air_date || '';
  const faYear = faYearRaw ? parseInt(faYearRaw.slice(0, 4), 10) : null;
  const faDirector = (raw.credits?.crew ?? []).find((c: any) => c.job === 'Director')?.name ?? null;
  const faData = await fetchFilmAffinityRating(faTitle, faYear, faDirector);

  // Director / creator
  const crew: any[] = raw.credits?.crew ?? [];
  const director =
    type === 'movie'
      ? (crew.find((c: any) => c.job === 'Director')?.name ?? null)
      : null;
  const creators: string[] = type === 'series'
    ? (raw.created_by ?? []).map((c: any) => c.name)
    : [];

  // Cast — top 8
  const cast: CastMember[] = (raw.credits?.cast ?? [])
    .slice(0, 8)
    .map((c: any) => ({
      name: c.name,
      character: c.character,
      photo: c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : null,
      order: c.order ?? 99,
    }));

  // Similar — top 8
  const similar: SimilarTitle[] = (raw.similar?.results ?? [])
    .slice(0, 8)
    .map((s: any) => ({
      tmdbId: s.id,
      title: s.title || s.name || '',
      poster: s.poster_path ? `https://image.tmdb.org/t/p/w342${s.poster_path}` : null,
      backdrop: s.backdrop_path ? `https://image.tmdb.org/t/p/w780${s.backdrop_path}` : null,
      rating: s.vote_average ?? null,
      year: parseYear(s),
      genres: mapGenres(s.genre_ids),
    }));

  // Trailer — prefer official YouTube trailers
  const videos: any[] = raw.videos?.results ?? [];
  const trailer =
    videos.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube' && v.official) ??
    videos.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube') ??
    null;

  const runtime =
    type === 'movie'
      ? (raw.runtime ?? null)
      : ((raw.episode_run_time as number[])?.[0] ?? null);

  return {
    tagline: raw.tagline || null,
    runtime,
    status: raw.status || null,
    budget: raw.budget > 0 ? raw.budget : null,
    revenue: raw.revenue > 0 ? raw.revenue : null,
    director,
    creators,
    cast,
    similar,
    trailerKey: trailer?.key ?? null,
    spokenLanguages: (raw.spoken_languages ?? []).map((l: any) => l.name),
    productionCountries: (raw.production_countries ?? []).map((c: any) => c.name),
    numberOfSeasons: raw.number_of_seasons ?? null,
    voteCount: raw.vote_count ?? null,
    faRating: faData.rating,
    faUrl: faData.url,
    faVotes: faData.votes,
  };
}
