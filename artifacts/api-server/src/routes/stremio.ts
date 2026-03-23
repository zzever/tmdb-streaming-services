import { Router, type IRouter } from "express";
import { findTmdbId, getWatchProviders, mapProviders, getPopular, posterUrl, parseYear } from "../lib/tmdb.js";

const router: IRouter = Router();

const manifest = {
  id: "org.stremio.tmdb-es",
  version: "1.0.0",
  name: "TMDB España Streams",
  description: "Streams legales en España via TMDB",
  logo: "https://www.themoviedb.org/assets/2/v4/logos/v2/blue_square_2-d537fb228cf3ded904ef09b136cfe3fec72548ebc1fea3fbbd1ad9e36364db20.svg",
  types: ["movie", "series"],
  resources: ["stream", "catalog"],
  idPrefixes: ["tt"],
  catalogs: [
    { type: "movie", id: "popular-es", name: "Populares en España" },
    { type: "series", id: "popular-es", name: "Series Populares en España" },
  ],
  behaviorHints: {
    adult: false,
    p2p: false,
  },
};

const providerTypeLabel: Record<string, string> = {
  flatrate: "Suscripción",
  rent: "Alquiler",
  buy: "Compra",
  free: "Gratis",
  ads: "Con anuncios",
};

router.get("/stremio/manifest.json", (_req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");
  res.json(manifest);
});

// Stream handler — receives IMDB ID (e.g. tt1234567)
router.get("/stremio/stream/:type/:id.json", async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");

  const { type, id } = req.params;
  const imdbId = id.replace(/\.json$/, "");

  if (!imdbId.startsWith("tt")) {
    res.json({ streams: [] });
    return;
  }

  const mediaType: "movie" | "series" = type === "series" ? "series" : "movie";

  try {
    const tmdbId = await findTmdbId(imdbId, mediaType);
    if (!tmdbId) {
      res.json({ streams: [] });
      return;
    }

    const providers = await getWatchProviders(tmdbId, mediaType);
    if (!providers) {
      res.json({ streams: [] });
      return;
    }

    const mapped = mapProviders(providers);

    const streams = mapped.map((p) => ({
      name: p.name,
      title: `${p.name}\n${providerTypeLabel[p.type] ?? p.type}`,
      thumbnail: p.logo ?? undefined,
      url: `https://www.themoviedb.org/provider/${p.providerId}`,
      behaviorHints: {
        notWebReady: true,
        bingeGroup: p.name,
      },
    }));

    res.json({ streams });
  } catch (err) {
    req.log.error({ err }, "Error fetching Stremio streams");
    res.json({ streams: [] });
  }
});

// Catalog handler — returns popular movies/series
router.get("/stremio/catalog/:type/:id.json", async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");

  const { type, id } = req.params;

  if (id.replace(/\.json$/, "") !== "popular-es") {
    res.json({ metas: [] });
    return;
  }

  const mediaType: "movie" | "series" = type === "series" ? "series" : "movie";

  try {
    const { results } = await getPopular(mediaType, 1);

    const metas = results.slice(0, 20).map((r) => ({
      id: `tmdb:${r.id}`,
      type: mediaType === "series" ? "series" : "movie",
      name: r.title || r.name || "",
      poster: posterUrl(r.poster_path ?? null),
      year: parseYear(r) ?? undefined,
      description: r.overview || undefined,
      imdbRating: r.vote_average ? String(r.vote_average.toFixed(1)) : undefined,
    }));

    res.json({ metas });
  } catch (err) {
    req.log.error({ err }, "Error fetching Stremio catalog");
    res.json({ metas: [] });
  }
});

export default router;
