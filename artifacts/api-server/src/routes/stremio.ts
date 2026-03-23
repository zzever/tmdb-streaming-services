import { Router, type IRouter } from "express";
import { findTmdbId, getTmdbTitle, getWatchProviders, mapProviders, getPopular, posterUrl, parseYear } from "../lib/tmdb.js";
import { getJWDirectOffers } from "../lib/justwatch.js";

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

const TYPE_ORDER = ["flatrate", "free", "ads", "rent", "buy"];

const TYPE_META: Record<string, { emoji: string; label: string }> = {
  flatrate: { emoji: "📺", label: "Suscripción" },
  free:     { emoji: "🆓", label: "Gratis" },
  ads:      { emoji: "📢", label: "Con anuncios" },
  rent:     { emoji: "🎬", label: "Alquiler" },
  buy:      { emoji: "🛒", label: "Compra" },
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
  // Series IDs from Stremio come as "tt1234567:season:episode" — extract just the IMDB ID
  const rawId = id.replace(/\.json$/, "");
  const imdbId = rawId.split(":")[0];

  if (!imdbId.startsWith("tt")) {
    res.json({ streams: [] });
    return;
  }

  const mediaType: "movie" | "series" = type === "series" ? "series" : "movie";

  const COUNTRY = 'ES';

  try {
    const tmdbId = await findTmdbId(imdbId, mediaType);
    if (!tmdbId) {
      res.json({ streams: [] });
      return;
    }

    const [providersResult, title] = await Promise.all([
      getWatchProviders(tmdbId, mediaType, COUNTRY),
      getTmdbTitle(tmdbId, mediaType),
    ]);

    const jwOffers = title
      ? await getJWDirectOffers(tmdbId, mediaType, COUNTRY, title)
      : [];

    if (!providersResult) {
      res.json({ streams: [] });
      return;
    }

    const mapped = mapProviders(providersResult.data, providersResult.watchUrl, tmdbId, mediaType, COUNTRY);

    // Build a lookup map: providerName + monetizationType -> direct URL from JustWatch
    const jwUrlMap = new Map<string, string>();
    for (const offer of jwOffers) {
      const key = `${offer.providerName}::${offer.monetizationType}`;
      if (!jwUrlMap.has(key)) {
        jwUrlMap.set(key, offer.directUrl);
      }
      // Also map by name only (without type) as fallback
      if (!jwUrlMap.has(offer.providerName)) {
        jwUrlMap.set(offer.providerName, offer.directUrl);
      }
    }

    // Sort by type priority
    const sorted = [...mapped].sort(
      (a, b) => TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type)
    );

    const streams = sorted.map((p) => {
      const meta = TYPE_META[p.type] ?? { emoji: "▶️", label: p.type };
      const directUrl =
        jwUrlMap.get(`${p.name}::${p.type}`) ??
        jwUrlMap.get(p.name) ??
        p.watchUrl;

      return {
        name: `🇪🇸 ${p.name}`,
        title: `${meta.emoji} ${meta.label}\nVer en ${p.name}`,
        thumbnail: p.logo ?? undefined,
        url: directUrl,
        behaviorHints: {
          notWebReady: true,
          externalUrl: directUrl,
          bingeGroup: `${p.type}-${p.name}`,
        },
      };
    });

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
