# TMDB Streaming ES

> Descubre dónde ver películas, series, anime, TV en directo y música en España. Incluye addon para Stremio con 8 catálogos y 213 canales HLS.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61dafb)](https://react.dev/)
[![Stremio Addon](https://img.shields.io/badge/Stremio-Addon%20v2.6.0-purple)](https://stremio.com/)

---

## ¿Qué es?

**TMDB Streaming ES** es una aplicación web + addon de Stremio que combina datos de [TMDB](https://developer.themoviedb.org), disponibilidad en plataformas de streaming para España, TV en directo con 213 canales HLS, guía de programación (EPG) y música/conciertos vía YouTube Music.

### Características principales

- **Web app** con diseño glassmorphism oscuro: películas, series, anime, estrenos, actores
- **TV en Directo**: 213 canales españoles HLS con guía EPG en tiempo real
- **Watchlist**: guarda tus títulos favoritos (localStorage)
- **Filtros**: género, ordenación, paginación infinita ("Cargar más")
- **Trailers**: embed de YouTube en modal de proveedores
- **Addon para Stremio v2.6.0**: 8 catálogos, streams con links directos, metadatos TV+EPG
- **Música y Conciertos**: catálogo Stremio con contenido musical y links a YouTube Music
- **JustWatch**: links directos a cada plataforma sin pasar por TMDB
- **Listas externas**: importa desde MDBList o Trakt

---

## ⚠️ Advertencia de suscripciones

Muchos contenidos requieren suscripción de pago a las plataformas correspondientes:

| Plataforma | Tipo | Nota |
|---|---|---|
| **Movistar+** | Suscripción | Requerida para la lista M3U de TV en directo |
| **Netflix** | Suscripción | Mostrado sin duplicados (se elimina "Netflix con anuncios") |
| **HBO Max / Max** | Suscripción | — |
| **Disney+** | Suscripción | — |
| **Prime Video** | Suscripción | Incluida con Amazon Prime |
| **Apple TV+** | Suscripción | — |
| **Crunchyroll** | Suscripción | Anime |
| **Filmin** | Suscripción | Cine europeo |
| **Movistar+ Lite** | Suscripción | Streaming sin deco |
| **Atres Player Premium** | Suscripción | Antena 3, La Sexta |

> **La lista M3U (`/api/stremio/channels.m3u`) contiene canales de Movistar+ que requieren suscripción activa para reproducirse.**

---

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | React 19, Vite 7, TypeScript, Tailwind CSS, Framer Motion |
| Backend | Express, Node.js, TypeScript, esbuild |
| Monorepo | pnpm workspaces |
| Datos | TMDB API, JustWatch (scraping), MDBList API, Trakt API |
| EPG | XMLTV (iptv-org), 7 fuentes españolas, caché 1h |
| Stremio | Addon v2.6.0 con 8 catálogos |

---

## Requisitos

- **Node.js** 20+
- **pnpm** 9+
- **API key de TMDB** (gratuita en [developer.themoviedb.org](https://developer.themoviedb.org))

---

## Instalación

```bash
git clone https://github.com/zzever/tmdb-streaming-services.git
cd tmdb-streaming-services
pnpm install
cp .env.example .env
```

Edita `.env` y añade tu clave de TMDB:

```env
TMDB_API_KEY=tu_api_key_aqui
PORT=3001
NODE_ENV=development
```

---

## Desarrollo

```bash
pnpm dev
```

Esto arranca:
- **API server** en `localhost:3001`
- **Web client** en `localhost:5173`

---

## Build de producción

```bash
pnpm build
pnpm start
```

---

## Addon de Stremio (v2.6.0)

Añade la URL del manifest en Stremio:

```
https://tu-dominio.com/api/stremio/manifest.json
```

En Stremio: **Addons → Addon del repositorio → Pegar URL**

### Catálogos disponibles

| Catálogo | Tipo | Descripción |
|---|---|---|
| 🇪🇸 Películas Populares | movie | Más vistas en España (TMDB) |
| 🎬 Películas en Español | movie | Producción española |
| 🎵 Música y Conciertos | movie | Género musical, biopics, conciertos + YouTube Music |
| 🇪🇸 Series Populares | series | Más vistas en España |
| 🗾 Anime en España | series | Anime japonés con streaming en ES |
| 🗾 Anime Películas | series | Películas de anime |
| 📺 Programas y Docs | series | Documentales, reality, talk shows en español |
| 📡 TV en Directo | tv | 213 canales HLS con metadatos EPG |

### YouTube Music en Stremio

Para películas y documentales musicales (conciertos, biopics musicales), el addon añade automáticamente un link de búsqueda en **YouTube Music** como opción adicional de stream.

---

## Lista M3U — TV en Directo

La lista incluye **213 canales españoles** en formato HLS (m3u8).

### Descarga directa

```
https://tu-dominio.com/api/stremio/channels.m3u
```

El archivo está disponible también en el repositorio:

```
artifacts/api-server/data/channels.json   ← Datos fuente (JSON)
```

> **⚠️ Algunos canales de Movistar+ requieren suscripción activa.**
> Los canales gratuitos (RTVE, Antena 3, Telecinco, etc.) no requieren cuenta.

### Compatible con

- **VLC** (Abrir URL de red)
- **Kodi** (PVR IPTV Simple Client)
- **Jellyfin** (Live TV)
- **Stremio** (vía addon, catálogo `live-es`)
- **Cualquier reproductor con soporte m3u8**

---

## EPG — Guía de Programación

El servidor obtiene datos EPG de 7 fuentes XMLTV españolas:

- RTVE
- Antena 3
- Telecinco / Cuatro
- La 2
- La Sexta
- FORTA (canales autonómicos)

Caché en memoria de **1 hora**. Los metadatos EPG aparecen:
- En las tarjetas de canales de la web (programa actual + horario)
- En el player HLS (header del modal)
- En los metadatos de Stremio para canales TV (descripción con programa actual)

---

## Estructura del proyecto

```
tmdb-streaming-services/
├── artifacts/
│   ├── api-server/              # Servidor Express (API + addon Stremio)
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   │   ├── streaming.ts # Endpoints REST (providers, EPG, canales, listas)
│   │   │   │   └── stremio.ts   # Addon Stremio (manifest, catalogs, streams, M3U)
│   │   │   └── lib/
│   │   │       ├── tmdb.ts      # TMDB API (mapProviders con deduplicación)
│   │   │       ├── justwatch.ts # JustWatch scraping
│   │   │       └── epg.ts       # EPG compartido (caché XMLTV, getCurrentAndNext)
│   │   └── data/
│   │       └── channels.json    # 213 canales HLS españoles
│   └── tmdb-stremio/            # React + Vite frontend
│       └── src/
│           ├── components/      # MediaCard, ProviderModal, LiveTV, ActorModal...
│           ├── pages/           # Home, OpenSource, SelfHost
│           ├── hooks/           # React Query hooks (useEpg, useLiveChannels...)
│           └── context/         # LocaleContext, ListsContext, WatchlistContext
├── lib/
│   ├── api-client-react/        # Cliente React Query
│   └── api-zod/                 # Esquemas Zod
└── README.md
```

---

## Variables de entorno

| Variable | Requerida | Descripción |
|---|---|---|
| `TMDB_API_KEY` | ✅ | API key de The Movie Database |
| `PORT` | ❌ | Puerto del servidor (default: `3001`) |
| `NODE_ENV` | ❌ | `production` o `development` |

---

## Características detalladas

### Deduplicación de proveedores
Los servicios como Netflix, HBO Max, etc. que aparecen en múltiples modalidades (suscripción + con anuncios) se muestran **una sola vez**, priorizando siempre la modalidad de suscripción completa sobre la versión con anuncios.

### Watchlist
Guarda títulos en el navegador (localStorage). Accede desde la tab **Favoritos** en la barra de navegación.

### Ordenación
- Más populares
- Mejor valoradas
- Más recientes
- Estrenos de la semana

### Paginación
Carga inicial de 20 títulos con botón **"Cargar más"** para añadir páginas sin perder el scroll.

---

## Licencia

MIT © [zzever](https://github.com/zzever)

---

*Data provided by [TMDB](https://www.themoviedb.org/). This product uses the TMDB API but is not endorsed or certified by TMDB.*
*EPG data from [iptv-org](https://github.com/iptv-org/epg). Channel list derived from public IPTV sources.*
