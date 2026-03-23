import { Router, type IRouter } from "express";
import { fileURLToPath } from "url";
import path from "path";
import { getLiveChannels } from "../lib/live-channels.js";
import { ensureEpg, getCurrentAndNext, getEpgCacheSize } from "../lib/epg.js";
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

// ── Movistar+ provider injection ─────────────────────────────────────────────
const MPLUS_LOGO = "https://image.tmdb.org/t/p/w185/f6TRLB3H4jDpFEZ0z2KWSSvu1SB.jpg";
const ATRES_NAMES_WEB = ["atres player", "atresplayer", "atresmedia", "antena 3", "la sexta"];
const PRIME_NAMES_WEB  = ["amazon prime video", "amazon video", "prime video"];

function injectMovistarProviders(
  providers: Array<{ name: string; logo?: string | null; type: string; providerId: number; watchUrl: string; tmdbUrl?: string }>,
  title: string
) {
  const names = providers.map((p) => p.name.toLowerCase());
  const hasMovistar = names.some((n) => n.includes("movistar"));
  const hasAtres    = names.some((n) => ATRES_NAMES_WEB.some((k) => n.includes(k)));
  const hasPrime    = names.some((n) => PRIME_NAMES_WEB.some((k) => n.includes(k)));

  // Inject Movistar+ search when Atres or Prime is present but Movistar+ is not (direct VOD)
  if ((hasAtres || hasPrime) && !hasMovistar) {
    providers.push({
      name: "Movistar+",
      logo: MPLUS_LOGO,
      type: "flatrate",
      providerId: 149,
      watchUrl: `https://ver.movistarplus.es/busqueda/?q=${encodeURIComponent(title)}`,
    });
  }

  // Movistar+ channels broadcast any kind of content (movies, series, shows) and record the last 7 days.
  // Show the recordings link for any title with at least one provider — content may have aired on any channel.
  if (providers.length > 0) {
    providers.push({
      name: "Movistar+ Grabaciones",
      logo: MPLUS_LOGO,
      type: "flatrate",
      providerId: 149,
      watchUrl: `https://ver.movistarplus.es/grabaciones/busqueda/?q=${encodeURIComponent(title)}`,
    });
  }

  return providers;
}

// Fetch providers by TMDB ID directly (used when imdbId is not available, e.g. discover results)
router.get("/streaming/providers-by-tmdb", async (req, res) => {
  const tmdbId = Number(req.query.tmdbId);
  const type = String(req.query.type ?? "movie") as "movie" | "series";
  const country = String(req.query.country ?? "ES");

  if (!tmdbId || isNaN(tmdbId)) {
    res.status(400).json({ error: "Bad Request", message: "tmdbId and type are required" });
    return;
  }

  const mediaType = type === "series" ? "series" : "movie";

  try {
    const [imdbId, providersResult, title] = await Promise.all([
      getImdbId(tmdbId, mediaType).catch(() => null),
      getWatchProviders(tmdbId, mediaType, country),
      getTmdbTitle(tmdbId, mediaType),
    ]);

    const mapped = providersResult
      ? mapProviders(providersResult.data, providersResult.watchUrl, tmdbId, mediaType, country)
      : [];

    if (mapped.length > 0 && title) {
      const jwOffers = await getJWDirectOffers(tmdbId, mediaType, country ?? "ES", title);
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

    if (title) injectMovistarProviders(mapped, title);

    res.json({
      imdbId: imdbId ?? null,
      tmdbId,
      title,
      type,
      providers: mapped,
    });
  } catch (err) {
    req.log.error({ err }, "Error fetching providers by tmdbId");
    res.status(500).json({ error: "Internal Server Error", message: "Failed to fetch providers" });
  }
});

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

    if (title) injectMovistarProviders(mapped, title);

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
  const originLanguage = String(req.query.originLanguage ?? "");
  const withoutGenres = String(req.query.withoutGenres ?? "");
  const sortBy = String(req.query.sortBy ?? "popularity.desc");
  const withProvider = String(req.query.withProvider ?? ""); // TMDB provider ID

  try {
    const path = type === "series" ? "/discover/tv" : "/discover/movie";
    const params: Record<string, string> = {
      page,
      sort_by: sortBy,
      watch_region: country.toUpperCase(),
      with_watch_monetization_types: "flatrate|free",
    };
    if (genreId) params.with_genres = genreId;
    if (withoutGenres) params.without_genres = withoutGenres;
    if (originLanguage) params.with_original_language = originLanguage;
    if (withProvider) params.with_watch_providers = withProvider;
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

// Title images (backdrops) — for fan art strip on cards
router.get("/streaming/images", async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "public, max-age=86400");
  const tmdbId = String(req.query.tmdbId ?? "");
  const type   = String(req.query.type ?? "movie");
  if (!tmdbId) { res.json({ backdrops: [] }); return; }
  try {
    const ep = type === "series" ? `tv/${tmdbId}` : `movie/${tmdbId}`;
    const data = await tmdbFetch(`${ep}/images?include_image_language=null,es,en`);
    const backdrops = ((data as any).backdrops ?? [])
      .filter((b: any) => b.vote_average > 4 || !(b.vote_count))
      .slice(0, 8)
      .map((b: any) => b.file_path as string);
    res.json({ backdrops });
  } catch {
    res.json({ backdrops: [] });
  }
});

// Random title — picks from a random page of popular, or discover for special categories
router.get("/streaming/random", async (req, res) => {
  const type       = String(req.query.type ?? "movie") as "movie" | "series";
  const country    = String(req.query.country ?? "ES");
  const genreIds   = req.query.genreIds   ? String(req.query.genreIds)   : null;
  const originLang = req.query.originLanguage ? String(req.query.originLanguage) : null;

  try {
    const randomPage = Math.floor(Math.random() * 10) + 1;
    let results: any[] = [];

    if (genreIds || originLang) {
      // Discover for special categories (anime, programa, musica)
      const params: Record<string, string> = {
        page: String(randomPage),
        sort_by: "popularity.desc",
        watch_region: country,
        with_watch_monetization_types: "flatrate|free",
      };
      if (genreIds)   params.with_genres             = genreIds;
      if (originLang) params.with_original_language  = originLang;

      const tmdbPath = type === "series" ? "/discover/tv" : "/discover/movie";
      const raw = await tmdbFetch<{ results?: any[] }>(tmdbPath, params);
      results = raw.results ?? [];
    } else {
      const { results: pop } = await getPopular(type === "series" ? "series" : "movie", randomPage, country);
      results = pop;
    }

    if (!results.length) {
      res.status(404).json({ error: "Not Found" });
      return;
    }

    const r = results[Math.floor(Math.random() * results.length)];
    const mediaType = type === "series" ? "series" : "movie";
    const [imdbId, providersResult] = await Promise.all([
      getImdbId(r.id, mediaType).catch(() => null),
      getWatchProviders(r.id, mediaType, country).catch(() => null),
    ]);
    const providers = providersResult
      ? mapProviders(providersResult.data, providersResult.watchUrl, r.id, mediaType, country)
      : [];

    res.json({
      imdbId: imdbId ?? null,
      tmdbId: r.id,
      title: r.title || r.name || "",
      type: mediaType,
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

// Archive.org concert search — proxies public search API for video recordings
router.get("/streaming/archive-concerts", async (req, res) => {
  const q = String(req.query.q ?? "").trim();
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "public, max-age=300");
  if (!q) { res.json({ results: [] }); return; }

  try {
    const params = new URLSearchParams({
      q: `(${q}) AND (subject:(concert) OR subject:(live)) AND mediatype:(movies)`,
      output: "json",
      rows: "6",
      "fl[]": "identifier,title,creator,year,description",
      sort: "downloads desc",
    });
    const r = await fetch(`https://archive.org/advancedsearch.php?${params.toString()}`, {
      headers: { "User-Agent": "TMDB-Streaming-ES/2.8" },
    });
    if (!r.ok) throw new Error("Archive.org error");
    const data = await r.json() as any;
    const docs: any[] = data?.response?.docs ?? [];
    res.json({
      results: docs.map((d) => ({
        identifier: d.identifier,
        title: Array.isArray(d.title) ? d.title[0] : (d.title || ""),
        creator: Array.isArray(d.creator) ? d.creator[0] : (d.creator || ""),
        year: d.year ?? null,
        url: `https://archive.org/details/${d.identifier}`,
      })),
    });
  } catch {
    res.json({ results: [] });
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
        with_watch_monetization_types: "flatrate|subscription|free",
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
      .slice(0, 40)
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

    // Fetch additional person details (biography, birthday)
    let biography: string | null = null;
    let birthday: string | null = null;
    let birthPlace: string | null = null;
    let knownFor: string | null = null;
    try {
      const details = await tmdbFetch<any>(`/person/${person.id}?language=es-ES`);
      biography = details.biography || null;
      birthday = details.birthday || null;
      birthPlace = details.place_of_birth || null;
      knownFor = details.known_for_department || null;
      if (!biography) {
        const enDetails = await tmdbFetch<any>(`/person/${person.id}?language=en-US`);
        biography = enDetails.biography || null;
      }
    } catch { /* ignore */ }

    res.json({
      name: person.name,
      photo: person.profile_path ? `https://image.tmdb.org/t/p/w185${person.profile_path}` : null,
      credits: finalCredits,
      role,
      biography,
      birthday,
      birthPlace,
      knownFor,
    });
  } catch (err) {
    req.log.error({ err }, "Error fetching person credits");
    res.status(500).json({ error: "Internal Server Error", message: "Failed to fetch person data" });
  }
});

// ── Live TV channels (dynamic from tdtchannels.com) ──────────────────────────

const GROUP_LABELS: Record<string, string> = {
  General: "General", News: "Noticias", Sports: "Deportes", Music: "Música",
  Movies: "Cine", Series: "Series", Animation: "Animación", Kids: "Infantil",
  Public: "Pública", Entertainment: "Entretenimiento", Documentary: "Documental",
  Comedy: "Comedia", Culture: "Cultura", Classic: "Clásica", Religious: "Religiosa",
  Family: "Familia", Lifestyle: "Estilo de vida", Business: "Economía",
  Education: "Educación", Weather: "Tiempo", Outdoor: "Naturaleza",
  Legislative: "Parlamento", Regional: "Regional", Radio: "Radio",
  "España Extra": "🇪🇸 Extra", USA: "🇺🇸 USA", "Música": "🎵 Música",
};

router.get("/streaming/epg", async (req, res) => {
  const idsParam = String(req.query.ids ?? "");
  const ids = idsParam.split(",").map(s => s.trim()).filter(Boolean).slice(0, 50);

  await ensureEpg();

  const result: Record<string, { current: ReturnType<typeof getCurrentAndNext>["current"]; next: ReturnType<typeof getCurrentAndNext>["next"] }> = {};
  for (const id of ids) {
    result[id] = getCurrentAndNext(id);
  }

  res.json({ epg: result, channelsWithData: getEpgCacheSize() });
});

router.get("/streaming/live-channels", async (req, res) => {
  const all = await getLiveChannels();
  const group = req.query.group as string | undefined;
  const q = (req.query.q as string | undefined)?.toLowerCase().trim();

  let channels = all as any[];
  if (group && group !== "all") channels = channels.filter((c: any) => c.groups.includes(group));
  if (q) channels = channels.filter((c: any) => c.name.toLowerCase().includes(q));

  const groupCounts: Record<string, number> = {};
  for (const ch of all) {
    for (const g of ch.groups) { groupCounts[g] = (groupCounts[g] || 0) + 1; }
  }

  const groups = Object.entries(groupCounts)
    .map(([id, count]) => ({ id, label: GROUP_LABELS[id] ?? id, count }))
    .sort((a, b) => b.count - a.count);

  res.json({ channels, groups, total: all.length });
});

// ── Watch providers list (for country-aware streaming chips) ─────────────────
router.get("/streaming/watch-providers", async (req, res) => {
  const country = String(req.query.country ?? "ES").toUpperCase();
  const type = String(req.query.type ?? "movie");
  try {
    const endpoint = type === "series" ? "/watch/providers/tv" : "/watch/providers/movie";
    const data = await tmdbFetch(endpoint, { watch_region: country, language: "es-ES" });
    const providers = (data.results ?? [])
      .slice(0, 25)
      .map((p: any) => ({
        id: p.provider_id,
        name: p.provider_name,
        logo: p.logo_path ? `https://image.tmdb.org/t/p/w45${p.logo_path}` : null,
        displayPriority: p.display_priority ?? 999,
      }))
      .sort((a: any, b: any) => a.displayPriority - b.displayPriority);
    res.json({ providers, country });
  } catch (err) {
    req.log.error({ err }, "watch-providers error");
    res.status(500).json({ error: "Failed to fetch watch providers" });
  }
});

// YouTube Music search autocomplete suggestions
router.get("/streaming/yt-suggest", async (req, res) => {
  const q = String(req.query.q ?? "").trim();
  if (!q || q.length < 2) { res.json({ suggestions: [] }); return; }
  try {
    const url = `https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=${encodeURIComponent(q)}`;
    const resp = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" } });
    const json = await resp.json() as any;
    const suggestions: string[] = Array.isArray(json[1]) ? json[1].slice(0, 8) : [];
    res.json({ suggestions });
  } catch {
    res.json({ suggestions: [] });
  }
});

// Kitsu anime metadata proxy — searches Kitsu.io by title
router.get("/streaming/kitsu", async (req, res) => {
  const q = String(req.query.q ?? "").trim();
  if (!q) { res.json({ data: [] }); return; }

  try {
    const url = new URL("https://kitsu.io/api/edge/anime");
    url.searchParams.set("filter[text]", q);
    url.searchParams.set("page[limit]", "5");
    url.searchParams.set("fields[anime]", "canonicalTitle,titles,synopsis,episodeCount,episodeLength,status,posterImage,coverImage,averageRating,popularityRank,ageRating,subtype");

    const resp = await fetch(url.toString(), {
      headers: { Accept: "application/vnd.api+json", "Content-Type": "application/vnd.api+json" },
    });
    if (!resp.ok) throw new Error(`Kitsu error ${resp.status}`);
    const json = await resp.json() as any;

    const data = (json.data ?? []).map((item: any) => ({
      id: item.id,
      title: item.attributes?.canonicalTitle ?? item.attributes?.titles?.en ?? "",
      titleJa: item.attributes?.titles?.ja_jp ?? null,
      synopsis: item.attributes?.synopsis ?? null,
      episodeCount: item.attributes?.episodeCount ?? null,
      episodeLength: item.attributes?.episodeLength ?? null,
      status: item.attributes?.status ?? null,
      rating: item.attributes?.averageRating ? parseFloat(item.attributes.averageRating) / 10 : null,
      poster: item.attributes?.posterImage?.medium ?? item.attributes?.posterImage?.small ?? null,
      cover: item.attributes?.coverImage?.large ?? null,
      subtype: item.attributes?.subtype ?? null,
      ageRating: item.attributes?.ageRating ?? null,
      kitsuUrl: `https://kitsu.io/anime/${item.id}`,
    }));

    res.json({ data });
  } catch (err) {
    req.log.error({ err }, "Kitsu search error");
    res.json({ data: [] });
  }
});

export default router;

