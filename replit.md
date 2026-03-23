# TMDB Streaming ES

## Project Goal

Monorepo app showing streaming availability for movies/TV series in Spain (and other countries). Works as a React/Vite web app (glassmorphism dark UI) and a Stremio addon. Shows providers with JustWatch direct URLs, country-aware popular lists, genres, backdrop fanart, cast with photos, similar titles, trailers, actor/director filmographies, and cinema vs streaming releases.

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React 19 + Vite + TailwindCSS + shadcn/ui + Framer Motion
- **Data fetching**: TanStack Query v5

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server (port 8080 in dev)
│   └── tmdb-stremio/       # React/Vite frontend (preview path: /)
├── lib/
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts
├── addon.config.example.env # Stremio addon self-hosting config reference
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck` (which runs `tsc --build --emitDeclarationOnly`).
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck; actual JS bundling is handled by esbuild/tsx/vite.
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Artifacts

### `artifacts/tmdb-stremio` (`@workspace/tmdb-stremio`)

React + Vite frontend. Preview path: `/` (root).

**Tabs:**
- **Películas** — popular movies in selected country, genre filter chips + streaming service selector chips (9 platforms: Netflix, Prime, Disney+, Max, Apple TV+, Crunchyroll, Filmin, Movistar+, Mitele)
- **Series** — popular TV series in selected country, genre filter chips + streaming service selector
- **Anime** — Japanese animation (genre 16 + originLanguage=ja), no genre chips; ProviderModal shows Kitsu metadata panel (title, poster, episodes, rating, status, link to Kitsu.io)
- **Programas** — Spanish-language documentaries/reality/talk shows (genres 99|10764|10767 + originLanguage=es), no genre chips
- **Música** — music movies/documentaries (genre 10402); YouTube Music player at top (song/artist/album search modes, embedded YouTube IFrame, link to YouTube Music)
- **Estrenos** — upcoming/recent releases; sub-tabs: Cinema (release type 2/3) vs Streaming (release type 4); ReleaseCard with backdrop hover crossfade animation
- **TV en Directo** — 213 Spanish live TV channels from M3U playlist; group filter chips; HLS player via hls.js; fallback to VLC/copy URL on CORS error
- **Favoritos** — watchlist/saved titles
- **Mis Listas** — import a MDBList or Trakt list by URL

**Key files:**
- `src/pages/Home.tsx` — main page, `ContentType` union (`"movie"|"series"|"anime"|"programa"`), tab navigation, discover/popular hooks wiring
- `src/hooks/use-media-api.ts` — custom hooks: `useGetReleases`, `useDiscover`, `useGetPersonFilmography`, `fetchRandomTitle`; type exports: `ReleaseTitle`, `DiscoverTitle`, `PersonData`, `PersonCredit`, `MOVIE_GENRES`, `SERIES_GENRES`
- `src/components/MediaCard.tsx` — card with backdrop crossfade hover animation, rating badge, provider logos
- `src/components/ProviderModal.tsx` — detail modal; shows cast, directors/creators (clickable → opens ActorModal), similar titles, trailers, JustWatch provider links
- `src/components/ActorModal.tsx` — person filmography modal; shows Actor/Director badge (`role` field), photo, credit grid
- `src/components/Header.tsx` — search bar, tab navigation, country/locale selector, Aleatorio button
- `src/components/ReleasesView.tsx` — Estrenos tab with Cinema/Streaming sub-tabs and `ReleaseCard`
- `src/context/LocaleContext.tsx` — country selector state persisted in localStorage
- `src/lib/locales.ts` — country list + helpers

**Constants:**
- `ANIME_GENRE_ID = "16"`, `ANIME_LANG = "ja"`
- `PROGRAMA_GENRE_IDS = "99|10764|10767"`
- `tmdbType` — maps `ContentType` to TMDB `"movie"|"series"`
- Genre chips hidden when `isSpecialBrowse` (anime or programa tabs)

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Entry: `src/index.ts`. App: `src/app.ts`. Routes at `/api`.

**Routes:**
- `GET /api/streaming/providers?imdbId&type&country` — watch providers + JustWatch direct URLs
- `GET /api/streaming/search?query&type` — TMDB multi/movie/tv search
- `GET /api/streaming/popular?type&country&page` — popular titles for country
- `GET /api/streaming/discover?type&country&genreId&year&originLanguage&sortBy&withoutGenres&withProvider&page` — TMDB discover with filters; `withProvider` = TMDB provider ID (e.g. 8=Netflix, 119=Prime)
- `GET /api/streaming/kitsu?q=` — Kitsu.io anime metadata proxy; returns title, poster, episodes, rating, status, kitsuUrl
- `GET /api/streaming/releases?type&country&mode&releaseType` — upcoming/recent releases; `releaseType`: `theater|streaming|any`
- `GET /api/streaming/random?type&country` — random popular title
- `GET /api/streaming/person?name` — person filmography + role detection (actor vs director)
- `GET /api/streaming/details?tmdbId&type&country` — rich title details (cast, crew, similar, trailers, providers)
- `GET /api/stremio/manifest.json` — Stremio manifest v2.4.0
- `GET /api/stremio/catalog/:type/:id.json` — Stremio catalog
- `GET /api/stremio/stream/:type/:id.json` — Stremio stream (provider links)
- `GET /api/stremio/meta/:type/:id.json` — Stremio meta

**Key lib files:**
- `src/lib/tmdb.ts` — TMDB API wrapper: `tmdbFetch`, `getPopular`, `searchTmdb`, `getWatchProviders`, `mapProviders`, `getTitleRichDetails`, `findTmdbId`, `getImdbId`, `mapGenres`, `posterUrl`, `backdropUrl`
- `src/lib/justwatch.ts` — JustWatch GraphQL client: `getJWDirectOffers` returning direct platform URLs

## Stremio Addon (v2.4.0)

Manifest ID: `community.tmdb-streaming-es`

**Catalogs:**
- `popular-es/movie` — 🇪🇸 Películas Populares en España
- `popular-es/series` — 🇪🇸 Series Populares en España
- `anime-es/series` — 🗾 Anime en España (genre 16 + originLanguage=ja)
- `programas-es/series` — 📺 Programas y Docs en España (genres 99|10764|10767 + originLanguage=es)

**Resources:** stream, meta, catalog. All use IMDB IDs (`tt` prefix).

Install URL: `https://<domain>/api/stremio/manifest.json`

Self-hosting config reference: `addon.config.example.env`

## Packages

### `lib/db` (`@workspace/db`)

PostgreSQL + Drizzle ORM. Exports pool, db, schema.

- `drizzle.config.ts` — requires `DATABASE_URL` (auto-provided by Replit)
- Dev: `pnpm --filter @workspace/db run push`

### `lib/api-spec` → `lib/api-client-react` + `lib/api-zod`

OpenAPI 3.1 spec → Orval codegen → React Query hooks + Zod schemas.

Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `scripts` (`@workspace/scripts`)

Utility scripts in `src/`. Run via `pnpm --filter @workspace/scripts run <script>`.

## Environment Variables

- `TMDB_API_KEY` — TMDB v3 API key (hardcoded fallback for dev)
- `DATABASE_URL` — PostgreSQL connection string (auto-provided by Replit)
- `PORT` — server port (auto-assigned per artifact)
