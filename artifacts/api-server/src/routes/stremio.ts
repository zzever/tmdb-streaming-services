import { Router, type IRouter } from "express";
import { findTmdbId, getTmdbTitle, getImdbId, getTmdbDetails, getWatchProviders, mapProviders, getPopular, posterUrl, parseYear, tmdbFetch } from "../lib/tmdb.js";
import { getJWDirectOffers } from "../lib/justwatch.js";

const router: IRouter = Router();

// Resolve the public-facing base URL of the API from the actual request host.
// x-forwarded-host is always correct (dev proxy or production deployment).
// Only fall back to REPLIT_DEV_DOMAIN when no forwarded header is present.
function getApiBase(req: { get: (h: string) => string | undefined; protocol: string }): string {
  const fwdHost  = req.get("x-forwarded-host");
  const fwdProto = req.get("x-forwarded-proto") ?? "https";
  if (fwdHost) return `${fwdProto}://${fwdHost}`;

  const domain = process.env.REPLIT_DEV_DOMAIN;
  if (domain) return `https://${domain}`;

  return `${req.protocol}://${req.get("host") ?? "localhost"}`;
}

const manifest = {
  id: "community.tmdb-streaming-es",
  version: "2.4.0",
  name: "TMDB Streaming ES",
  description: "Plataformas de streaming disponibles en España (y más países). URLs directas vía JustWatch — abre Netflix, Prime, Disney+, Crunchyroll y más sin pasar por TMDB.",
  logo: "https://www.themoviedb.org/assets/2/v4/logos/v2/blue_square_2-d537fb228cf3ded904ef09b136cfe3fec72548ebc1fea3fbbd1ad9e36364db20.svg",
  types: ["movie", "series"],
  resources: [
    { name: "stream",   types: ["movie", "series"], idPrefixes: ["tt"] },
    { name: "meta",     types: ["movie", "series"], idPrefixes: ["tt"] },
    { name: "catalog",  types: ["movie", "series"] },
  ],
  idPrefixes: ["tt"],
  catalogs: [
    { type: "movie",  id: "popular-es",  name: "🇪🇸 Películas Populares en España" },
    { type: "series", id: "popular-es",  name: "🇪🇸 Series Populares en España" },
    { type: "series", id: "anime-es",    name: "🗾 Anime en España" },
    { type: "series", id: "programas-es", name: "📺 Programas y Docs en España" },
  ],
  behaviorHints: {
    adult: false,
    p2p: false,
  },
};

const TYPE_ORDER = ["flatrate", "free", "ads", "rent", "buy"];

const TYPE_META: Record<string, { emoji: string; label: string }> = {
  flatrate: { emoji: "📺", label: "Streaming" },
  free:     { emoji: "🆓", label: "Gratis" },
  ads:      { emoji: "📢", label: "Con anuncios" },
  rent:     { emoji: "🎬", label: "Alquiler" },
  buy:      { emoji: "🛒", label: "Compra" },
};

// Derive native-app deep-link scheme from a web URL
function getNativeScheme(url: string): string | null {
  // Netflix: nflx://title/{id}
  const netflixMatch = url.match(/netflix\.com\/title\/([^/?#]+)/);
  if (netflixMatch) return `nflx://title/${netflixMatch[1]}`;

  // Disney+: disneyplus://{path}
  if (url.includes("disneyplus.com")) {
    return url.replace(/^https?:\/\/www\.disneyplus\.com/, "disneyplus://");
  }

  // HBO Max / Max
  if (url.includes("hbomax.com") || url.includes("play.max.com")) {
    return url.replace(/^https?:\/\/(play\.hbomax\.com|play\.max\.com)/, "hbomax://");
  }

  return null; // Prime, Apple TV, Rakuten, Google Play — web URL works as deep link
}

// Redirect page served to Stremio Web — tries native app then falls back to web
router.get("/stremio/open", (req, res) => {
  const rawUrl  = String(req.query.url  ?? "");
  const rawName = String(req.query.name ?? "Streaming");

  if (!rawUrl.startsWith("http")) {
    res.status(400).send("Bad request");
    return;
  }

  const native  = getNativeScheme(rawUrl);
  const webUrl  = rawUrl;
  const name    = rawName.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const jsNative = native ? JSON.stringify(native) : "null";
  const jsWeb    = JSON.stringify(webUrl);

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Abriendo ${name}…</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{min-height:100vh;display:flex;flex-direction:column;align-items:center;
         justify-content:center;background:#0f0f13;color:#fff;font-family:system-ui,sans-serif;
         padding:24px;text-align:center}
    .logo{font-size:48px;margin-bottom:16px}
    h1{font-size:1.4rem;font-weight:700;margin-bottom:8px}
    p{color:#aaa;font-size:.9rem;margin-bottom:28px}
    a.btn{display:inline-block;padding:12px 28px;background:#e50914;color:#fff;
          border-radius:6px;text-decoration:none;font-weight:600;font-size:1rem;
          transition:opacity .2s}
    a.btn:hover{opacity:.85}
    .sub{margin-top:16px;font-size:.8rem;color:#666}
    .spinner{width:36px;height:36px;border:3px solid #333;border-top-color:#e50914;
             border-radius:50%;animation:spin .8s linear infinite;margin:0 auto 20px}
    @keyframes spin{to{transform:rotate(360deg)}}
  </style>
</head>
<body>
  <div class="spinner" id="sp"></div>
  <div class="logo">🎬</div>
  <h1>Abriendo ${name}…</h1>
  <p id="msg">Intentando abrir la app…</p>
  <a class="btn" href="${webUrl}" id="btn">Abrir en el navegador</a>
  <p class="sub" id="sub"></p>
  <script>
    var native = ${jsNative};
    var web    = ${jsWeb};
    var btn    = document.getElementById('btn');
    var msg    = document.getElementById('msg');
    var sub    = document.getElementById('sub');
    var sp     = document.getElementById('sp');

    function goWeb() {
      sp.style.display = 'none';
      msg.textContent  = 'Redirigiendo al navegador…';
      window.location.href = web;
    }

    if (native) {
      // Try native deep link; fall back to web after 1.8s
      try { window.location.href = native; } catch(e) {}
      sub.textContent = 'Si la app no se abre, pulsa el botón.';
      setTimeout(goWeb, 1800);
    } else {
      goWeb();
    }
  </script>
</body>
</html>`);
});

router.get("/stremio/manifest.json", (_req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
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
  const COUNTRY = "ES";

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

    if (!providersResult) {
      res.json({ streams: [] });
      return;
    }

    const mapped = mapProviders(providersResult.data, providersResult.watchUrl, tmdbId, mediaType, COUNTRY);
    if (mapped.length === 0) {
      res.json({ streams: [] });
      return;
    }

    // Fetch JustWatch direct URLs in parallel (uses title for accurate node lookup)
    const jwOffers = title
      ? await getJWDirectOffers(tmdbId, mediaType, COUNTRY, title)
      : [];

    // Build lookup: providerName::type → directUrl, providerName → directUrl (fallback)
    const jwUrlMap = new Map<string, string>();
    for (const offer of jwOffers) {
      const key = `${offer.providerName}::${offer.monetizationType}`;
      if (!jwUrlMap.has(key)) jwUrlMap.set(key, offer.directUrl);
      if (!jwUrlMap.has(offer.providerName)) jwUrlMap.set(offer.providerName, offer.directUrl);
    }

    // Sort by type priority, then build streams — deduplicate by final URL
    const sorted = [...mapped].sort(
      (a, b) => TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type)
    );

    const seenUrls = new Set<string>();
    const streams: object[] = [];

    for (const p of sorted) {
      const directUrl =
        jwUrlMap.get(`${p.name}::${p.type}`) ??
        jwUrlMap.get(p.name) ??
        p.watchUrl;

      // Skip duplicate URLs (e.g. Netflix + Netflix Standard pointing to same title)
      if (seenUrls.has(directUrl)) continue;
      seenUrls.add(directUrl);

      const meta = TYPE_META[p.type] ?? { emoji: "▶️", label: p.type };

      // externalUrl at root level tells Stremio Desktop/Web to open the URL
      // in an external browser instead of trying to play it as a video stream.
      streams.push({
        name: `🇪🇸 ${p.name}`,
        title: `${meta.emoji} ${meta.label} · Ver en ${p.name}`,
        thumbnail: p.logo ?? undefined,
        externalUrl: directUrl,
        behaviorHints: {
          bingeGroup: `${p.type}-${p.name}`,
        },
      });
    }

    res.json({ streams });
  } catch (err) {
    req.log.error({ err }, "Error fetching Stremio streams");
    res.json({ streams: [] });
  }
});

// Meta handler — provides TMDB metadata so Stremio doesn't rely solely on Cinemeta
router.get("/stremio/meta/:type/:id.json", async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");

  const { type, id } = req.params;
  const imdbId = id.replace(/\.json$/, "").split(":")[0];

  if (!imdbId.startsWith("tt")) {
    res.status(404).json({ meta: null });
    return;
  }

  const mediaType: "movie" | "series" = type === "series" ? "series" : "movie";

  try {
    const details = await getTmdbDetails(imdbId, mediaType);
    if (!details) {
      res.status(404).json({ meta: null });
      return;
    }

    const name = details.title || details.name || "";
    const dateStr = details.release_date || details.first_air_date || "";
    const year = dateStr ? parseInt(dateStr.split("-")[0], 10) : undefined;
    const poster = details.poster_path ? `https://image.tmdb.org/t/p/w342${details.poster_path}` : undefined;
    const background = details.backdrop_path ? `https://image.tmdb.org/t/p/original${details.backdrop_path}` : undefined;
    const genres = details.genres?.map((g) => g.name) ?? [];
    const runtime = details.runtime ? [details.runtime] : undefined;

    res.json({
      meta: {
        id: imdbId,
        type: mediaType === "series" ? "series" : "movie",
        name,
        poster,
        background,
        description: details.overview || undefined,
        year: isNaN(year as number) ? undefined : year,
        imdbRating: details.vote_average ? details.vote_average.toFixed(1) : undefined,
        genres: genres.length ? genres : undefined,
        runtime,
      },
    });
  } catch (err) {
    req.log.error({ err }, "Error fetching Stremio meta");
    res.status(500).json({ meta: null });
  }
});

// Helper: fetch discover results and build Stremio metas with IMDB IDs
async function discoverMetas(
  tmdbPath: string,
  params: Record<string, string>,
  mediaType: "movie" | "series"
): Promise<object[]> {
  const raw = await tmdbFetch<{ results?: any[] }>(tmdbPath, params);
  const slice = (raw.results ?? []).slice(0, 20);
  const imdbIds = await Promise.all(slice.map((r) => getImdbId(r.id, mediaType).catch(() => null)));
  return slice
    .map((r, i) => ({
      id: imdbIds[i] ?? `tmdb:${r.id}`,
      type: mediaType === "series" ? "series" : "movie",
      name: r.title || r.name || "",
      poster: posterUrl(r.poster_path ?? null),
      year: parseYear(r) ?? undefined,
      description: r.overview || undefined,
      imdbRating: r.vote_average ? String(r.vote_average.toFixed(1)) : undefined,
    }))
    .filter((m: any) => m.id.startsWith("tt"));
}

// Catalog handler — returns popular movies/series/anime/programas with real IMDB IDs
router.get("/stremio/catalog/:type/:id.json", async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");

  const { type, id } = req.params;
  const catalogId = id.replace(/\.json$/, "");
  const mediaType: "movie" | "series" = type === "series" ? "series" : "movie";
  const COUNTRY = "ES";

  try {
    let metas: object[] = [];

    if (catalogId === "popular-es") {
      const { results } = await getPopular(mediaType, 1);
      const slice = results.slice(0, 20);
      const imdbIds = await Promise.all(slice.map((r) => getImdbId(r.id, mediaType)));
      metas = slice
        .map((r, i) => ({
          id: imdbIds[i] ?? `tmdb:${r.id}`,
          type: mediaType === "series" ? "series" : "movie",
          name: r.title || r.name || "",
          poster: posterUrl(r.poster_path ?? null),
          year: parseYear(r) ?? undefined,
          description: r.overview || undefined,
          imdbRating: r.vote_average ? String(r.vote_average.toFixed(1)) : undefined,
        }))
        .filter((m: any) => m.id.startsWith("tt"));

    } else if (catalogId === "anime-es") {
      // Anime: Japanese animated series with streaming availability
      metas = await discoverMetas("/discover/tv", {
        page: "1",
        sort_by: "popularity.desc",
        watch_region: COUNTRY,
        with_watch_monetization_types: "flatrate|free|ads",
        with_genres: "16",
        with_original_language: "ja",
      }, "series");

    } else if (catalogId === "programas-es") {
      // Programas: Documentaries (99), Reality (10764), Talk Shows (10767) — Spanish-language only
      metas = await discoverMetas("/discover/tv", {
        page: "1",
        sort_by: "popularity.desc",
        watch_region: COUNTRY,
        with_watch_monetization_types: "flatrate|free|ads",
        with_genres: "99|10764|10767",
        with_original_language: "es",
      }, "series");

    } else {
      res.json({ metas: [] });
      return;
    }

    res.json({ metas });
  } catch (err) {
    req.log.error({ err }, "Error fetching Stremio catalog");
    res.json({ metas: [] });
  }
});

export default router;
