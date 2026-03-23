import { Router, type IRouter } from "express";
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

export default router;
