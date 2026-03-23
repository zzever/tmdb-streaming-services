import { Router, type IRouter } from "express";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";
import {
  GetStreamingProvidersQueryParams,
  SearchTitlesQueryParams,
  GetPopularTitlesQueryParams,
} from "@workspace/api-zod";
import {
  findTmdbId,
  getTmdbTitle,
  getImdbId,
  getWatchProviders,
  mapProviders,
  searchTmdb,
  getPopular,
  parseYear,
  posterUrl,
  backdropUrl,
  mapGenres,
  getTitleRichDetails,
  getTmdbBasicById,
  tmdbFetch,
} from "../lib/tmdb.js";
import { getJWDirectOffers } from "../lib/justwatch.js";

const router: IRouter = Router();

router.get("/streaming/providers", async (req, res) => {
  const parsed = GetStreamingProvidersQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Bad Request", message: "imdbId and type are required" });
    return;
  }

  const { imdbId, type, country } = parsed.data;
  const mediaType = type === "series" ? "series" : "movie";

  try {
    const tmdbId = await findTmdbId(imdbId, mediaType);
    if (!tmdbId) {
      res.status(404).json({ error: "Not Found", message: "Title not found on TMDB" });
      return;
    }

    const [providersResult, title] = await Promise.all([
      getWatchProviders(tmdbId, mediaType, country),
      getTmdbTitle(tmdbId, mediaType),
    ]);

    const mapped = providersResult
      ? mapProviders(providersResult.data, providersResult.watchUrl, tmdbId, mediaType, country)
      : [];

    // Enrich each provider's watchUrl with a direct platform link from JustWatch
    if (mapped.length > 0 && title) {
      const jwOffers = await getJWDirectOffers(tmdbId, mediaType, country ?? 'ES', title);
      if (jwOffers.length > 0) {
        const jwUrlMap = new Map<string, string>();
        for (const offer of jwOffers) {
          const key = `${offer.providerName}::${offer.monetizationType}`;
          if (!jwUrlMap.has(key)) jwUrlMap.set(key, offer.directUrl);
          if (!jwUrlMap.has(offer.providerName)) jwUrlMap.set(offer.providerName, offer.directUrl);
        }
        for (const p of mapped) {
          const directUrl = jwUrlMap.get(`${p.name}::${p.type}`) ?? jwUrlMap.get(p.name);
          if (directUrl) p.watchUrl = directUrl;
        }
      }
    }

    res.json({
      imdbId,
      tmdbId,
      title,
      type,
      providers: mapped,
    });
  } catch (err) {
    req.log.error({ err }, "Error fetching streaming providers");
    res.status(500).json({ error: "Internal Server Error", message: "Failed to fetch providers" });
  }
});

router.get("/streaming/search", async (req, res) => {
  const parsed = SearchTitlesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Bad Request", message: "query is required" });
    return;
  }

  const { query, type } = parsed.data;
  const mediaType = type === "series" ? "series" : type === "movie" ? "movie" : undefined;

  try {
    const { results, totalResults } = await searchTmdb(query, mediaType);

    const mapped = results.map((r) => {
      // When mediaType is set, the endpoint is type-specific and doesn't return media_type.
      // Fall back to the requested type; for multi-search results, use media_type.
      const resolvedType =
        mediaType === "series" ? "series"
        : mediaType === "movie" ? "movie"
        : r.media_type === "tv" ? "series"
        : "movie";

      return {
        imdbId: null,
        tmdbId: r.id,
        title: r.title || r.name || "",
        type: resolvedType,
        year: parseYear(r),
        poster: posterUrl(r.poster_path),
        backdrop: backdropUrl(r.backdrop_path),
        overview: r.overview || null,
        rating: r.vote_average ?? null,
        genres: mapGenres(r.genre_ids),
      };
    });

    res.json({ results: mapped, totalResults });
  } catch (err) {
    req.log.error({ err }, "Error searching titles");
    res.status(500).json({ error: "Internal Server Error", message: "Search failed" });
  }
});

router.get("/streaming/popular", async (req, res) => {
  const parsed = GetPopularTitlesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Bad Request", message: "Invalid query params" });
    return;
  }

  const mediaType = parsed.data.type === "series" ? "series" : "movie";
  const page = parsed.data.page ? Number(parsed.data.page) : 1;
  const country = parsed.data.country;

  try {
    const { results, totalPages } = await getPopular(mediaType, page, country ?? 'ES');

    const mapped = await Promise.all(
      results.slice(0, 20).map(async (r) => {
        // Fetch IMDB ID and watch providers in parallel
        const [imdbId, providersResult] = await Promise.all([
          getImdbId(r.id, mediaType).catch(() => null),
          getWatchProviders(r.id, mediaType, country).catch(() => null),
        ]);

        const providers = providersResult
          ? mapProviders(providersResult.data, providersResult.watchUrl, r.id, mediaType, country)
          : [];

        return {
          imdbId: imdbId ?? null,
          tmdbId: r.id,
          title: r.title || r.name || "",
          type: mediaType === "series" ? "series" : "movie",
          year: parseYear(r),
          poster: posterUrl(r.poster_path),
          backdrop: backdropUrl(r.backdrop_path),
          overview: r.overview || null,
          rating: r.vote_average ?? null,
          genres: mapGenres(r.genre_ids),
          providers,
        };
      })
    );

    res.json({ results: mapped, page, totalPages });
  } catch (err) {
    req.log.error({ err }, "Error fetching popular titles");
    res.status(500).json({ error: "Internal Server Error", message: "Failed to fetch popular titles" });
  }
});

async function batchFetch<T, R>(
  items: T[],
  fn: (item: T) => Promise<R | null>,
  concurrency = 8
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const settled = await Promise.allSettled(batch.map(fn));
    for (const r of settled) {
      if (r.status === "fulfilled" && r.value !== null) results.push(r.value);
    }
  }
  return results;
}

router.get("/streaming/list", async (req, res) => {
  const source = String(req.query.source ?? "");
  const apiKey = String(req.query.apiKey ?? "");
  const listId = String(req.query.listId ?? "");
  const username = String(req.query.username ?? "");
  const slug = String(req.query.slug ?? "");
  const clientId = String(req.query.clientId ?? "");

  try {
    if (source === "mdblist") {
      if (!listId || !apiKey) {
        res.status(400).json({ error: "Bad Request", message: "listId and apiKey are required for mdblist" });
        return;
      }

      const listMetaUrl = `https://mdblist.com/api/lists/${listId}?apikey=${apiKey}`;
      const itemsUrl = `https://mdblist.com/api/lists/${listId}/items?apikey=${apiKey}&limit=50`;

      const [metaResp, itemsResp] = await Promise.all([
        fetch(listMetaUrl),
        fetch(itemsUrl),
      ]);

      if (!itemsResp.ok) {
        res.status(502).json({ error: "Upstream Error", message: "MDBList request failed" });
        return;
      }

      const listMeta = metaResp.ok ? await metaResp.json() as any : null;
      const data = await itemsResp.json() as any;
      const rawItems: any[] = data.items ?? [];

      const seedItems = rawItems
        .filter((it: any) => it.tmdbid || it.imdb_id)
        .slice(0, 50)
        .map((it: any) => ({
          tmdbId: it.tmdbid as number | undefined,
          imdbId: it.imdb_id as string | undefined,
          type: it.mediatype === "show" ? "series" : "movie" as "movie" | "series",
          fallbackTitle: it.title ?? "",
        }));

      const items = await batchFetch(seedItems, async (seed) => {
        if (seed.tmdbId) return getTmdbBasicById(seed.tmdbId, seed.type);
        return null;
      });

      res.json({ name: listMeta?.name ?? "Mi lista MDBList", items });
      return;
    }

    if (source === "trakt") {
      if (!username || !slug || !clientId) {
        res.status(400).json({ error: "Bad Request", message: "username, slug and clientId are required for trakt" });
        return;
      }

      const headers = {
        "Content-Type": "application/json",
        "trakt-api-version": "2",
        "trakt-api-key": clientId,
      };

      const listMetaUrl = `https://api.trakt.tv/users/${username}/lists/${slug}`;
      const itemsUrl = `https://api.trakt.tv/users/${username}/lists/${slug}/items?limit=50`;

      const [metaResp, itemsResp] = await Promise.all([
        fetch(listMetaUrl, { headers }),
        fetch(itemsUrl, { headers }),
      ]);

      if (!itemsResp.ok) {
        res.status(502).json({ error: "Upstream Error", message: `Trakt request failed: ${itemsResp.status}` });
        return;
      }

      const listMeta = metaResp.ok ? await metaResp.json() as any : null;
      const rawItems = await itemsResp.json() as any[];

      const seedItems = rawItems
        .filter((it) => it.type === "movie" || it.type === "show")
        .slice(0, 50)
        .map((it) => {
          const type: "movie" | "series" = it.type === "show" ? "series" : "movie";
          const obj = it.type === "movie" ? it.movie : it.show;
          return { tmdbId: obj?.ids?.tmdb as number | undefined, type };
        })
        .filter((s) => !!s.tmdbId);

      const items = await batchFetch(seedItems, async (seed) => {
        return seed.tmdbId ? getTmdbBasicById(seed.tmdbId!, seed.type) : null;
      });

      res.json({ name: listMeta?.name ?? "Mi lista Trakt", items });
      return;
    }

    res.status(400).json({ error: "Bad Request", message: "source must be 'mdblist' or 'trakt'" });
  } catch (err) {
    req.log.error({ err }, "Error fetching list");
    res.status(500).json({ error: "Internal Server Error", message: "Failed to fetch list" });
  }
});

router.get("/streaming/details", async (req, res) => {
  const tmdbId = Number(req.query.tmdbId);
  const type = String(req.query.type ?? "movie") as "movie" | "series";

  if (!tmdbId || isNaN(tmdbId)) {
    res.status(400).json({ error: "Bad Request", message: "tmdbId is required" });
    return;
  }

  try {
    const details = await getTitleRichDetails(tmdbId, type === "series" ? "series" : "movie");
    res.json(details);
  } catch (err) {
    req.log.error({ err }, "Error fetching title details");
    res.status(500).json({ error: "Internal Server Error", message: "Failed to fetch details" });
  }
});

// Discover by genre/year filter
router.get("/streaming/discover", async (req, res) => {
  const type = String(req.query.type ?? "movie") as "movie" | "series";
  const country = String(req.query.country ?? "ES");
  const genreId = String(req.query.genreId ?? "");
  const year = String(req.query.year ?? "");
  const page = String(req.query.page ?? "1");
  // Extra: originLanguage (e.g. "ja" for anime), withoutGenres (pipe-sep genre IDs to exclude)
  const originLanguage = String(req.query.originLanguage ?? "");
  const withoutGenres = String(req.query.withoutGenres ?? "");
  const sortBy = String(req.query.sortBy ?? "popularity.desc");

  try {
    const path = type === "series" ? "/discover/tv" : "/discover/movie";
    const params: Record<string, string> = {
      page,
      sort_by: sortBy,
      watch_region: country.toUpperCase(),
      with_watch_monetization_types: "flatrate|free|ads",
    };
    if (genreId) params.with_genres = genreId;
    if (withoutGenres) params.without_genres = withoutGenres;
    if (originLanguage) params.with_original_language = originLanguage;
    if (year) {
      if (type === "movie") {
        params.primary_release_year = year;
      } else {
        params.first_air_date_year = year;
      }
    }

    const raw = await tmdbFetch<{ results?: any[]; total_pages?: number }>(path, params);

    const results = (raw.results ?? []).slice(0, 20).map((r: any) => ({
      imdbId: null,
      tmdbId: r.id,
      title: r.title || r.name || "",
      type: type === "series" ? "series" : "movie",
      year: r.release_date ? parseInt(r.release_date.slice(0, 4), 10) : (r.first_air_date ? parseInt(r.first_air_date.slice(0, 4), 10) : null),
      poster: posterUrl(r.poster_path),
      backdrop: backdropUrl(r.backdrop_path),
      overview: r.overview || null,
      rating: r.vote_average ?? null,
      genres: mapGenres(r.genre_ids),
    }));

    res.json({ results, page: Number(page), totalPages: raw.total_pages ?? 1 });
  } catch (err) {
    req.log.error({ err }, "Error fetching discover results");
    res.status(500).json({ error: "Internal Server Error", message: "Failed to fetch discover results" });
  }
});

// Random title — picks from a random page of popular to go beyond the top 20
router.get("/streaming/random", async (req, res) => {
  const type = String(req.query.type ?? "movie") as "movie" | "series";
  const country = String(req.query.country ?? "ES");

  try {
    const randomPage = Math.floor(Math.random() * 10) + 1;
    const { results, totalPages } = await getPopular(type === "series" ? "series" : "movie", randomPage, country);
    if (!results.length) {
      res.status(404).json({ error: "Not Found" });
      return;
    }
    const r = results[Math.floor(Math.random() * results.length)];
    const [imdbId, providersResult] = await Promise.all([
      getImdbId(r.id, type === "series" ? "series" : "movie").catch(() => null),
      getWatchProviders(r.id, type === "series" ? "series" : "movie", country).catch(() => null),
    ]);
    const providers = providersResult
      ? mapProviders(providersResult.data, providersResult.watchUrl, r.id, type === "series" ? "series" : "movie", country)
      : [];

    res.json({
      imdbId: imdbId ?? null,
      tmdbId: r.id,
      title: r.title || r.name || "",
      type: type === "series" ? "series" : "movie",
      year: parseYear(r),
      poster: posterUrl(r.poster_path),
      backdrop: backdropUrl(r.backdrop_path),
      overview: r.overview || null,
      rating: r.vote_average ?? null,
      genres: mapGenres(r.genre_ids),
      providers,
    });
  } catch (err) {
    req.log.error({ err }, "Error fetching random title");
    res.status(500).json({ error: "Internal Server Error", message: "Failed to fetch random title" });
  }
});

router.get("/streaming/releases", async (req, res) => {
  const type = String(req.query.type ?? "movie") as "movie" | "series";
  const country = String(req.query.country ?? "ES");
  const mode = String(req.query.mode ?? "upcoming");
  // releaseType: "theater" = cinema only, "streaming" = platform releases, "any" = all
  const releaseType = String(req.query.releaseType ?? "any") as "theater" | "streaming" | "any";

  try {
    let raw: { results?: any[]; total_pages?: number };

    if (releaseType === "streaming") {
      // Use discover API: recently released to streaming platforms
      const today = new Date();
      const ninetyDaysAgo = new Date(today);
      ninetyDaysAgo.setDate(today.getDate() - 90);
      const todayStr = today.toISOString().slice(0, 10);
      const pastStr = ninetyDaysAgo.toISOString().slice(0, 10);

      const discoverPath = type === "series" ? "/discover/tv" : "/discover/movie";
      const params: Record<string, string> = {
        page: "1",
        sort_by: type === "series" ? "first_air_date.desc" : "primary_release_date.desc",
        watch_region: country.toUpperCase(),
        with_watch_monetization_types: "flatrate|subscription|free|ads",
      };
      if (type === "movie") {
        params["primary_release_date.gte"] = pastStr;
        params["primary_release_date.lte"] = todayStr;
      } else {
        params["first_air_date.gte"] = pastStr;
        params["first_air_date.lte"] = todayStr;
      }
      raw = await tmdbFetch<{ results?: any[]; total_pages?: number }>(discoverPath, params);
    } else {
      // Standard TMDB endpoints (theatrical)
      let endpoint = "";
      if (type === "movie") {
        endpoint = mode === "now_playing" ? "/movie/now_playing" : "/movie/upcoming";
      } else {
        endpoint = mode === "airing_today" ? "/tv/airing_today" : "/tv/on_the_air";
      }
      raw = await tmdbFetch<{ results?: any[]; total_pages?: number }>(endpoint, {
        region: country,
        page: "1",
      });
    }

    const results = (raw.results ?? []).slice(0, 24).map((r: any) => ({
      tmdbId: r.id,
      title: r.title || r.name || "",
      poster: r.poster_path ? `https://image.tmdb.org/t/p/w342${r.poster_path}` : null,
      backdrop: r.backdrop_path ? `https://image.tmdb.org/t/p/w780${r.backdrop_path}` : null,
      rating: r.vote_average ?? null,
      year: r.release_date ? parseInt(r.release_date.slice(0, 4), 10) : (r.first_air_date ? parseInt(r.first_air_date.slice(0, 4), 10) : null),
      releaseDate: r.release_date || r.first_air_date || null,
      overview: r.overview || null,
      genres: mapGenres(r.genre_ids),
      type: type === "series" ? "series" : "movie",
      releaseType,
    }));

    res.json({ results });
  } catch (err) {
    req.log.error({ err }, "Error fetching releases");
    res.status(500).json({ error: "Internal Server Error", message: "Failed to fetch releases" });
  }
});

router.get("/streaming/person", async (req, res) => {
  const name = String(req.query.name ?? "");
  if (!name.trim()) {
    res.status(400).json({ error: "Bad Request", message: "name is required" });
    return;
  }

  try {
    const searchData = await tmdbFetch<{ results?: any[] }>("/search/person", { query: name });
    const person = searchData.results?.[0];
    if (!person) {
      res.json({ name, credits: [], role: "actor" });
      return;
    }

    // Fetch combined credits (cast + crew)
    const credits = await tmdbFetch<{ cast?: any[]; crew?: any[] }>(`/person/${person.id}/combined_credits`);

    // Determine if person is primarily a director (crew)
    const crewItems: any[] = (credits.crew ?? [])
      .filter((c: any) => c.media_type === "movie" || c.media_type === "tv")
      .filter((c: any) => (c.title || c.name) && c.vote_count >= 5);

    const castItems: any[] = (credits.cast ?? [])
      .filter((c: any) => c.media_type === "movie" || c.media_type === "tv")
      .filter((c: any) => (c.title || c.name) && c.vote_count >= 5);

    const isDirector = crewItems.filter((c) => c.job === "Director").length >= 3 && crewItems.length > castItems.length;
    const role: "director" | "actor" = isDirector ? "director" : "actor";

    let finalCredits: any[] = [];

    if (isDirector) {
      // Merge director + writer + producer credits, dedup by tmdbId
      const seen = new Set<number>();
      const directorJobs = ["Director", "Writer", "Screenplay", "Producer", "Executive Producer", "Story"];
      for (const c of crewItems) {
        if (directorJobs.includes(c.job) && !seen.has(c.id)) {
          seen.add(c.id);
          finalCredits.push({ ...c, character: c.job });
        }
      }
    } else {
      // Actor: use cast credits
      const seen = new Set<number>();
      for (const c of castItems) {
        if (!seen.has(c.id)) {
          seen.add(c.id);
          finalCredits.push(c);
        }
      }
    }

    // Sort by popularity score (vote_count * vote_average), take top 24
    finalCredits = finalCredits
      .sort((a: any, b: any) => {
        const scoreA = (a.vote_count ?? 0) * (a.vote_average ?? 0);
        const scoreB = (b.vote_count ?? 0) * (b.vote_average ?? 0);
        return scoreB - scoreA;
      })
      .slice(0, 24)
      .map((c: any) => ({
        tmdbId: c.id,
        title: c.title || c.name || "",
        poster: c.poster_path ? `https://image.tmdb.org/t/p/w342${c.poster_path}` : null,
        rating: c.vote_average ?? null,
        year: c.release_date ? parseInt(c.release_date.slice(0, 4), 10) : (c.first_air_date ? parseInt(c.first_air_date.slice(0, 4), 10) : null),
        genres: mapGenres(c.genre_ids),
        character: c.character || null,
        type: c.media_type === "tv" ? "series" : "movie",
      }));

    res.json({
      name: person.name,
      photo: person.profile_path ? `https://image.tmdb.org/t/p/w185${person.profile_path}` : null,
      credits: finalCredits,
      role,
    });
  } catch (err) {
    req.log.error({ err }, "Error fetching person credits");
    res.status(500).json({ error: "Internal Server Error", message: "Failed to fetch person data" });
  }
});

// ── Live TV channels ────────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const channelsData: any[] = JSON.parse(readFileSync(path.join(__dirname, "../data/channels.json"), "utf8"));

// ── EPG cache ──
interface EpgProgram { title: string; desc: string | null; start: number; stop: number; }
const epgCache = new Map<string, EpgProgram[]>();
let epgFetchedAt = 0;
const EPG_TTL = 60 * 60 * 1000;

const EPG_SOURCES = [
  "https://iptv-org.github.io/epg/guides/es/rtve.es.epg.xml",
  "https://iptv-org.github.io/epg/guides/es/antena3.com.epg.xml",
  "https://iptv-org.github.io/epg/guides/es/telecinco.es.epg.xml",
  "https://iptv-org.github.io/epg/guides/es/la2.es.epg.xml",
  "https://iptv-org.github.io/epg/guides/es/lasexta.com.epg.xml",
  "https://iptv-org.github.io/epg/guides/es/cuatro.com.epg.xml",
  "https://iptv-org.github.io/epg/guides/es/forta.es.epg.xml",
];

function parseXmltvTime(t: string): number {
  const y = +t.slice(0,4), mo = +t.slice(4,6)-1, d = +t.slice(6,8);
  const h = +t.slice(8,10), mi = +t.slice(10,12), s = +t.slice(12,14);
  return new Date(Date.UTC(y, mo, d, h, mi, s)).getTime();
}

function decodeHtmlEntities(s: string): string {
  return s.replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(+n));
}

async function fetchEpgSource(url: string): Promise<void> {
  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!resp.ok) return;
    const xml = await resp.text();
    const progRe = /<programme\s[^>]*start="(\d+)\s[^"]*"\s[^>]*stop="(\d+)\s[^"]*"\s[^>]*channel="([^"]+)"[^>]*>([\s\S]*?)<\/programme>/g;
    let m: RegExpExecArray | null;
    while ((m = progRe.exec(xml)) !== null) {
      const [, start, stop, chId, body] = m;
      const titleM = body.match(/<title[^>]*>([^<]+)<\/title>/);
      if (!titleM) continue;
      const descM = body.match(/<desc[^>]*>([^<]+)<\/desc>/);
      const prog: EpgProgram = {
        title: decodeHtmlEntities(titleM[1].trim()),
        desc: descM ? decodeHtmlEntities(descM[1].trim()) : null,
        start: parseXmltvTime(start),
        stop: parseXmltvTime(stop),
      };
      if (!epgCache.has(chId)) epgCache.set(chId, []);
      epgCache.get(chId)!.push(prog);
    }
  } catch { /* ignore per-source errors */ }
}

async function ensureEpg(): Promise<void> {
  if (Date.now() - epgFetchedAt < EPG_TTL && epgCache.size > 0) return;
  epgFetchedAt = Date.now();
  epgCache.clear();
  await Promise.all(EPG_SOURCES.map(fetchEpgSource));
}

function getCurrentAndNext(tvgId: string): { current: EpgProgram | null; next: EpgProgram | null } {
  const baseId = tvgId.replace(/@.*$/, "");
  const programs = epgCache.get(baseId) ?? epgCache.get(tvgId) ?? [];
  const now = Date.now();
  const current = programs.find(p => p.start <= now && p.stop > now) ?? null;
  const next = programs.find(p => p.start > now) ?? null;
  return { current, next };
}

const GROUP_LABELS: Record<string, string> = {
  General: "General", News: "Noticias", Sports: "Deportes", Music: "Música",
  Movies: "Cine", Series: "Series", Animation: "Animación", Kids: "Infantil",
  Public: "Pública", Entertainment: "Entretenimiento", Documentary: "Documental",
  Comedy: "Comedia", Culture: "Cultura", Classic: "Clásica", Religious: "Religiosa",
  Family: "Familia", Lifestyle: "Estilo de vida", Business: "Economía",
  Education: "Educación", Weather: "Tiempo", Outdoor: "Naturaleza",
  Legislative: "Parlamento",
};

router.get("/streaming/epg", async (req, res) => {
  const idsParam = String(req.query.ids ?? "");
  const ids = idsParam.split(",").map(s => s.trim()).filter(Boolean).slice(0, 50);

  await ensureEpg();

  const result: Record<string, { current: EpgProgram | null; next: EpgProgram | null }> = {};
  for (const id of ids) {
    result[id] = getCurrentAndNext(id);
  }

  res.json({ epg: result, channelsWithData: epgCache.size });
});

router.get("/streaming/live-channels", (req, res) => {
  const group = req.query.group as string | undefined;
  const q = (req.query.q as string | undefined)?.toLowerCase().trim();

  let channels: any[] = channelsData as any[];

  if (group && group !== "all") {
    channels = channels.filter((c: any) => c.groups.includes(group));
  }

  if (q) {
    channels = channels.filter((c: any) => c.name.toLowerCase().includes(q));
  }

  // Build group index
  const groupCounts: Record<string, number> = {};
  for (const ch of channelsData as any[]) {
    for (const g of ch.groups) {
      groupCounts[g] = (groupCounts[g] || 0) + 1;
    }
  }

  const groups = Object.entries(groupCounts)
    .map(([id, count]) => ({ id, label: GROUP_LABELS[id] ?? id, count }))
    .sort((a, b) => b.count - a.count);

  res.json({ channels, groups, total: (channelsData as any[]).length });
});

export default router;

