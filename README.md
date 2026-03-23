# TMDB Streaming ES

> Descubre dónde ver películas y series en España, con addon para Stremio.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61dafb)](https://react.dev/)
[![Fastify](https://img.shields.io/badge/API-Fastify-black)](https://fastify.dev/)

---

## ¿Qué es?

**TMDB Streaming ES** es una aplicación web que combina los datos de [TMDB](https://developer.themoviedb.org) con la disponibilidad en plataformas de streaming para España. Incluye:

- **Web app** con diseño glassmorphism oscuro: busca películas y series, filtra por género, descubre estrenos próximos y navega la filmografía de actores.
- **Addon para Stremio**: instala el addon y consulta disponibilidad en streaming directamente desde Stremio.
- **Integración JustWatch**: links directos a cada plataforma (Netflix, Prime Video, Max, Movistar+, etc.).
- **Listas desde MDBList / Trakt**: importa tus listas favoritas.

---

## Capturas

| Inicio — Películas populares | Detalle con proveedores | Estrenos |
|---|---|---|
| *(dark glassmorphism UI)* | *(JustWatch direct links)* | *(próximamente/en cines)* |

---

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | React 19, Vite 7, TypeScript, Tailwind CSS, Framer Motion |
| Backend | Fastify, Node.js, TypeScript |
| Monorepo | pnpm workspaces |
| Datos | TMDB API, JustWatch (scraping), MDBList API, Trakt API |
| Stremio | Protocolo addon propio sobre el servidor Fastify |

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

## Addon de Stremio

Una vez desplegado (o en local con túnel), añade la URL del manifest en Stremio:

```
https://tu-dominio.com/api/stremio/manifest.json
```

En Stremio: **Addons → Addon del repositorio → Pegar URL**

---

## Estructura del proyecto

```
tmdb-streaming-services/
├── artifacts/
│   ├── api-server/          # Servidor Fastify (API + addon Stremio)
│   │   └── src/
│   │       ├── routes/      # Endpoints REST
│   │       ├── lib/         # TMDB, JustWatch, utilidades
│   │       └── stremio/     # Lógica del addon
│   └── tmdb-stremio/        # React + Vite frontend
│       └── src/
│           ├── components/  # MediaCard, ProviderModal, ActorModal...
│           ├── pages/       # Home, OpenSource, SelfHost
│           ├── hooks/       # React Query hooks
│           └── context/     # LocaleContext, ListsContext
└── lib/
    ├── api-client-react/    # Cliente generado (React Query)
    └── api-zod/             # Esquemas de validación Zod
```

---

## Variables de entorno

| Variable | Requerida | Descripción |
|---|---|---|
| `TMDB_API_KEY` | ✅ | API key de The Movie Database |
| `PORT` | ❌ | Puerto del servidor (default: `3001`) |
| `NODE_ENV` | ❌ | `production` o `development` |

---

## Características

- **País configurable**: cambia el país para ver la disponibilidad local (España por defecto)
- **Filtrado por género**: filtra películas y series por género con un clic
- **Estrenos**: tab con próximos estrenos, películas en cines y series en emisión
- **Filmografía de actores**: haz clic en cualquier actor para ver sus títulos más destacados
- **Título aleatorio**: descubre títulos más allá de los 20 populares con paginación aleatoria
- **Listas externas**: importa listas de MDBList o Trakt con tu API key
- **Links directos**: cada plataforma de streaming abre directamente en JustWatch

---

## Licencia

MIT © [zzever](https://github.com/zzever)

---

*Data provided by [TMDB](https://www.themoviedb.org/). This product uses the TMDB API but is not endorsed or certified by TMDB.*
