import { Router, type IRouter } from "express";
import { findTmdbId, getWatchProviders, mapProviders } from "../lib/tmdb.js";

const router: IRouter = Router();

const manifest = {
  id: "org.stremio.tmdb-es",
  version: "1.0.0",
  name: "TMDB España",
  description: "Proveedores de streaming legales en España vía TMDB",
  logo: "https://www.themoviedb.org/assets/2/v4/logos/v2/blue_square_2-d537fb228cf3ded904ef09b136cfe3fec72548ebc1fea3fbbd1ad9e36364db20.svg",
  types: ["movie", "series"],
  catalogs: [],
  resources: ["stream"],
  idPrefixes: ["tt"],
  behaviorHints: {
    adult: false,
    p2p: false,
  },
};

router.get("/stremio/manifest.json", (_req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");
  res.json(manifest);
});

router.get("/stremio/stream/:type/:id.json", async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");

  const { type, id } = req.params;

  const imdbId = id.replace(".json", "");

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

    const providerTypeLabel: Record<string, string> = {
      flatrate: "Suscripción",
      rent: "Alquiler",
      buy: "Compra",
      free: "Gratis",
      ads: "Con anuncios",
    };

    const streams = mapped.map((p) => ({
      name: p.name,
      title: `${p.name}\n${providerTypeLabel[p.type] ?? p.type}`,
      thumbnail: p.logo ?? undefined,
      externalUrl: `https://www.themoviedb.org/movie/${tmdbId}/watch?locale=ES`,
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

export default router;
