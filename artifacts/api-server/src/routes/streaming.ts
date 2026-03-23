import { Router, type IRouter } from "express";
import {
  GetStreamingProvidersQueryParams,
  SearchTitlesQueryParams,
  GetPopularTitlesQueryParams,
} from "@workspace/api-zod";
import {
  findTmdbId,
  getTmdbTitle,
  getWatchProviders,
  mapProviders,
  searchTmdb,
  getPopular,
  parseYear,
  posterUrl,
} from "../lib/tmdb.js";

const router: IRouter = Router();

router.get("/streaming/providers", async (req, res) => {
  const parsed = GetStreamingProvidersQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Bad Request", message: "imdbId and type are required" });
    return;
  }

  const { imdbId, type } = parsed.data;
  const mediaType = type === "series" ? "series" : "movie";

  try {
    const tmdbId = await findTmdbId(imdbId, mediaType);
    if (!tmdbId) {
      res.status(404).json({ error: "Not Found", message: "Title not found on TMDB" });
      return;
    }

    const [providers, title] = await Promise.all([
      getWatchProviders(tmdbId, mediaType),
      getTmdbTitle(tmdbId, mediaType),
    ]);

    const mapped = providers ? mapProviders(providers) : [];

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

    const mapped = results.map((r) => ({
      imdbId: null,
      tmdbId: r.id,
      title: r.title || r.name || "",
      type: r.media_type === "tv" ? "series" : "movie",
      year: parseYear(r),
      poster: posterUrl(r.poster_path),
      overview: r.overview || null,
      rating: r.vote_average ?? null,
    }));

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

  try {
    const { results, totalPages } = await getPopular(mediaType, page);

    const mapped = await Promise.all(
      results.slice(0, 20).map(async (r) => {
        let providers: ReturnType<typeof mapProviders> = [];
        try {
          const rawProviders = await getWatchProviders(r.id, mediaType);
          if (rawProviders) {
            providers = mapProviders(rawProviders);
          }
        } catch {
          providers = [];
        }

        return {
          imdbId: null,
          tmdbId: r.id,
          title: r.title || r.name || "",
          type: mediaType === "series" ? "series" : "movie",
          year: parseYear(r),
          poster: posterUrl(r.poster_path),
          overview: r.overview || null,
          rating: r.vote_average ?? null,
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

export default router;
