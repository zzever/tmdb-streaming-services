import React, { useState, useCallback } from "react";
import {
  useGetPopularTitles,
  useSearchTitles,
  useGetReleases,
  useDiscover,
  fetchRandomTitle,
  MOVIE_GENRES,
  SERIES_GENRES,
  type ReleaseTitle,
  type DiscoverTitle,
} from "@/hooks/use-media-api";

import { useDebounce } from "@/hooks/use-debounce";
import { Header } from "@/components/Header";
import { MediaCard } from "@/components/MediaCard";
import { ProviderModal } from "@/components/ProviderModal";
import { ListsSection } from "@/components/ListSection";
import { AddListDialog } from "@/components/AddListDialog";
import { useLists } from "@/context/ListsContext";
import { useLocale } from "@/context/LocaleContext";
import {
  Copy, Check, Plug, Shuffle, BookMarked, Plus,
  Film, Tv2, Clapperboard, CalendarDays, Star, MonitorPlay,
  Zap, Tag, X, Dices,
} from "lucide-react";
import { Link } from "wouter";
import type { PopularTitle, SearchResult } from "@workspace/api-client-react/src/generated/api.schemas";
import { motion, AnimatePresence } from "framer-motion";

const MANIFEST_URL = `${window.location.origin}/api/stremio/manifest.json`;
const STREMIO_INSTALL_URL = MANIFEST_URL.replace(/^https?:\/\//, "stremio://");

// Content type constants
type ContentType = "movie" | "series" | "anime" | "programa";
const ANIME_GENRE_ID = "16";
const ANIME_LANG = "ja";
const PROGRAMA_GENRE_IDS = "99|10764|10767";

// ── Release modes ──────────────────────────────────────────────
type ReleaseMode = {
  id: string;
  label: string;
  type: "movie" | "series";
  mode: string;
  releaseType: "theater" | "streaming" | "any";
  badge: "cine" | "plataforma" | "series";
  badgeColor: string;
};

const RELEASE_MODES: ReleaseMode[] = [
  { id: "upcoming-movie-theater", label: "Próximamente en cines", type: "movie", mode: "upcoming", releaseType: "any", badge: "cine", badgeColor: "rgba(229,9,20,0.7)" },
  { id: "nowplaying-movie-theater", label: "Ahora en cines", type: "movie", mode: "now_playing", releaseType: "any", badge: "cine", badgeColor: "rgba(229,9,20,0.7)" },
  { id: "streaming-movie", label: "En plataformas · Películas", type: "movie", mode: "streaming", releaseType: "streaming", badge: "plataforma", badgeColor: "rgba(99,102,241,0.7)" },
  { id: "on_the_air-series", label: "En plataformas · Series", type: "series", mode: "on_the_air", releaseType: "streaming", badge: "series", badgeColor: "rgba(16,185,129,0.7)" },
];

function formatDate(dateStr: string | null) {
  if (!dateStr) return null;
  try {
    return new Date(dateStr).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
  } catch { return dateStr; }
}

// ── Release card with poster hover animation ──────────────────
interface ReleaseCardProps {
  item: ReleaseTitle;
  onSelect: (t: ReleaseTitle) => void;
  badgeIcon: React.ReactNode;
  badgeColor: string;
  badgeLabel: string;
}
function ReleaseCard({ item, onSelect, badgeIcon, badgeColor, badgeLabel }: ReleaseCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [posterLoaded, setPosterLoaded] = useState(false);
  const [backdropLoaded, setBackdropLoaded] = useState(false);

  const showBackdrop = isHovered && !!item.backdrop;

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 380, damping: 28 }}
      onClick={() => onSelect(item)}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="group relative flex flex-col cursor-pointer rounded-2xl"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
    >
      <div className="aspect-[2/3] relative overflow-hidden rounded-t-2xl bg-white/5">
        {/* Poster */}
        {item.poster ? (
          <>
            {!posterLoaded && <div className="absolute inset-0 shimmer" />}
            <img src={item.poster} alt={item.title} onLoad={() => setPosterLoaded(true)}
              className={`w-full h-full object-cover transition-opacity duration-500 ${posterLoaded ? (showBackdrop ? "opacity-0" : "opacity-100") : "opacity-0"}`}
              loading="lazy" />
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center"><MonitorPlay className="w-8 h-8 text-white/15" /></div>
        )}

        {/* Preload backdrop silently */}
        {item.backdrop && !backdropLoaded && (
          <img src={item.backdrop} alt="" aria-hidden className="sr-only" onLoad={() => setBackdropLoaded(true)} loading="lazy" />
        )}

        {/* Backdrop crossfade on hover */}
        <AnimatePresence>
          {showBackdrop && backdropLoaded && (
            <motion.div key="bd" initial={{ opacity: 0, scale: 1.05 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: "easeInOut" }} className="absolute inset-0">
              <img src={item.backdrop!} alt="" aria-hidden className="w-full h-full object-cover object-center" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/10" />
              <div className="absolute bottom-0 left-0 right-0 p-2.5">
                <p className="text-[10px] text-white/80 line-clamp-4 leading-relaxed">
                  {item.overview || "Sin descripción disponible."}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Synopsis when no backdrop */}
        {!item.backdrop && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-2.5">
            <p className="text-[10px] text-white/80 line-clamp-4 leading-relaxed">{item.overview || "Sin descripción."}</p>
          </div>
        )}

        {/* Top gradient for badges */}
        <div className="absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-black/50 to-transparent pointer-events-none z-10" />

        {/* Cine/streaming badge */}
        <div className="absolute top-1.5 left-1.5 z-10">
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5"
            style={{ background: badgeColor, color: "rgba(255,255,255,0.92)" }}>
            {badgeIcon}
            {badgeLabel}
          </span>
        </div>

        {/* Rating badge */}
        {item.rating && item.rating > 0 && (
          <div className="absolute top-1.5 right-1.5 z-10 bg-black/70 backdrop-blur-sm px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
            <Star className="w-2.5 h-2.5 text-yellow-400 fill-yellow-400" />
            <span className="text-[10px] font-bold text-yellow-400">{item.rating.toFixed(1)}</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="px-2.5 pt-1.5 pb-2.5 flex flex-col gap-0.5"
        style={{ background: "rgba(255,255,255,0.02)", borderTop: "1px solid rgba(255,255,255,0.05)", borderRadius: "0 0 16px 16px" }}>
        <p className="text-[11px] font-semibold text-white/75 group-hover:text-white line-clamp-2 leading-tight transition-colors">{item.title}</p>
        {item.releaseDate && (
          <div className="flex items-center gap-1">
            <CalendarDays className="w-2.5 h-2.5 text-white/30 shrink-0" />
            <span className="text-[9px] text-white/35 font-medium">{formatDate(item.releaseDate)}</span>
          </div>
        )}
        {item.genres.length > 0 && <p className="text-[9px] text-white/25 line-clamp-1">{item.genres[0]}</p>}
      </div>
    </motion.div>
  );
}

// ── Releases view ──────────────────────────────────────────────
interface ReleasesViewProps {
  country: string;
  onSelect: (t: ReleaseTitle) => void;
}

const BADGE_ICONS: Record<string, React.ReactNode> = {
  cine: <Film className="w-3 h-3" />,
  plataforma: <MonitorPlay className="w-3 h-3" />,
  series: <Tv2 className="w-3 h-3" />,
};

function ReleasesView({ country, onSelect }: ReleasesViewProps) {
  const [activeMode, setActiveMode] = useState(RELEASE_MODES[0].id);
  const selected = RELEASE_MODES.find((m) => m.id === activeMode) ?? RELEASE_MODES[0];
  const { data, isLoading } = useGetReleases({
    type: selected.type,
    country,
    mode: selected.mode,
    releaseType: selected.releaseType,
  });

  return (
    <div>
      {/* Mode selector with visual grouping */}
      <div className="flex items-start gap-4 mb-5 overflow-x-auto pb-1 scrollbar-hide">
        {/* Cinema group */}
        <div className="flex flex-col gap-1.5 shrink-0">
          <div className="flex items-center gap-1.5 px-1">
            <Film className="w-3 h-3 text-primary/50" />
            <span className="text-[9px] uppercase tracking-widest text-primary/50 font-bold">Cine</span>
          </div>
          <div className="flex gap-1.5">
            {RELEASE_MODES.filter((m) => m.badge === "cine").map((m) => (
              <button key={m.id} onClick={() => setActiveMode(m.id)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 border ${
                  activeMode === m.id ? "text-white border-primary/35" : "text-white/40 hover:text-white/65 border-transparent"
                }`}
                style={activeMode === m.id ? { background: "rgba(229,9,20,0.12)" } : {}}>
                {m.label.replace("Próximamente en cines", "Próximamente").replace("Ahora en cines", "Ahora")}
              </button>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="w-px h-10 self-end mb-0.5" style={{ background: "rgba(255,255,255,0.08)" }} />

        {/* Streaming group */}
        <div className="flex flex-col gap-1.5 shrink-0">
          <div className="flex items-center gap-1.5 px-1">
            <MonitorPlay className="w-3 h-3 text-indigo-400/60" />
            <span className="text-[9px] uppercase tracking-widest text-indigo-400/60 font-bold">Plataformas</span>
          </div>
          <div className="flex gap-1.5">
            {RELEASE_MODES.filter((m) => m.badge !== "cine").map((m) => (
              <button key={m.id} onClick={() => setActiveMode(m.id)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 border ${
                  activeMode === m.id ? "text-white border-indigo-400/30" : "text-white/40 hover:text-white/65 border-transparent"
                }`}
                style={activeMode === m.id ? { background: "rgba(99,102,241,0.12)" } : {}}>
                {m.badge === "series" ? <Tv2 className="w-3 h-3" /> : <Film className="w-3 h-3" />}
                {m.label.replace("En plataformas · ", "")}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Active badge indicator */}
      <div className="flex items-center gap-2 mb-4">
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-md"
          style={{ background: `${selected.badgeColor.replace("0.7)", "0.12)")}`, color: selected.badgeColor.replace("0.7", "0.9"), border: `1px solid ${selected.badgeColor.replace("0.7", "0.25")}` }}>
          {BADGE_ICONS[selected.badge]}
          {selected.badge === "cine" ? "Estreno en cine" : selected.badge === "series" ? "Series en plataformas" : "Estreno en plataformas"}
        </span>
        <span className="text-xs text-white/25">{selected.label}</span>
      </div>

      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div key="sk" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="aspect-[2/3] rounded-2xl shimmer" style={{ border: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.03)" }} />
            ))}
          </motion.div>
        ) : data && data.results.length > 0 ? (
          <motion.div key={activeMode} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {data.results.map((item, i) => (
              <motion.div key={`${item.tmdbId}-${i}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.025 }}>
                <ReleaseCard item={item} onSelect={onSelect} badgeIcon={BADGE_ICONS[selected.badge]} badgeColor={selected.badgeColor} badgeLabel={selected.badge === "cine" ? "Cine" : selected.badge === "series" ? "Serie" : "Stream"} />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-20">
            <Clapperboard className="w-10 h-10 text-white/15 mb-3" />
            <p className="text-white/30 text-sm">No hay estrenos disponibles ahora mismo.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Stremio install banner ──────────────────────────────────────
function StremioInstallBanner() {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => { navigator.clipboard.writeText(MANIFEST_URL); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  return (
    <section className="relative z-10 py-16 overflow-hidden">
      <div className="max-w-2xl mx-auto px-4">
        <div className="relative rounded-3xl p-8 text-center overflow-hidden"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(24px)" }}>
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 rounded-full"
              style={{ background: "radial-gradient(ellipse, rgba(229,9,20,0.12) 0%, transparent 70%)" }} />
          </div>
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary/90 border border-primary/20 rounded-full px-3.5 py-1 text-xs font-semibold uppercase tracking-widest mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              Addon para Stremio
            </div>
            <h2 className="text-2xl sm:text-3xl font-display font-bold mb-2">
              <span className="gradient-text">Instala el addon</span>
              <span className="text-white/90"> en Stremio</span>
            </h2>
            <p className="text-white/40 text-sm mb-7 leading-relaxed">
              Ve directamente desde Stremio qué películas y series están disponibles<br className="hidden sm:block" /> en las plataformas de streaming de España.
            </p>
            <a href={STREMIO_INSTALL_URL}
              className="inline-flex items-center gap-2.5 bg-primary hover:bg-primary/90 text-white font-semibold px-7 py-3 rounded-xl transition-all duration-200 mb-7 glow-primary text-sm">
              <Plug className="w-4 h-4" />
              Instalar en Stremio
            </a>
            <p className="text-white/25 text-xs mb-3">O copia la URL del manifest:</p>
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl mx-auto max-w-lg"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <code className="flex-1 text-xs text-left text-primary/60 truncate font-mono select-all">{MANIFEST_URL}</code>
              <button onClick={handleCopy} className="flex-shrink-0 p-1.5 rounded-lg hover:bg-white/8 text-white/30 hover:text-white/80 transition-colors">
                {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <p className="text-white/20 text-xs mt-4">En Stremio: Addons → Addon del repositorio → Pegar URL</p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Genre filter chips ──────────────────────────────────────────
interface GenreChipsProps {
  type: "movie" | "series";
  selectedId: number | null;
  onSelect: (id: number | null) => void;
}

function GenreChips({ type, selectedId, onSelect }: GenreChipsProps) {
  const genres = type === "movie" ? MOVIE_GENRES : SERIES_GENRES;
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
      <div className="flex items-center gap-1 shrink-0 mr-1">
        <Tag className="w-3 h-3 text-white/25" />
      </div>
      <button
        onClick={() => onSelect(null)}
        className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 border whitespace-nowrap ${
          selectedId === null
            ? "text-white bg-white/12 border-white/15 shadow-sm"
            : "text-white/35 hover:text-white/60 border-transparent hover:border-white/10"
        }`}
      >
        Todos
      </button>
      {genres.map((g) => (
        <button
          key={g.id}
          onClick={() => onSelect(selectedId === g.id ? null : g.id)}
          className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 border whitespace-nowrap ${
            selectedId === g.id
              ? "text-white border-primary/40 shadow-sm"
              : "text-white/35 hover:text-white/65 border-transparent hover:border-white/10"
          }`}
          style={selectedId === g.id ? { background: "rgba(229,9,20,0.12)" } : {}}
        >
          {g.name}
        </button>
      ))}
    </div>
  );
}

// ── Main types ──────────────────────────────────────────────────
type ViewMode = "browse" | "lists" | "releases";
type AnyMedia = PopularTitle | SearchResult | ReleaseTitle | DiscoverTitle;

const TABS = [
  { id: "browse-movie",    label: "Películas",  icon: <Film className="w-3.5 h-3.5" />,        mode: "browse" as ViewMode, contentType: "movie" as ContentType },
  { id: "browse-series",   label: "Series",     icon: <Tv2 className="w-3.5 h-3.5" />,          mode: "browse" as ViewMode, contentType: "series" as ContentType },
  { id: "browse-anime",    label: "Anime",      icon: <span className="text-xs leading-none">⛩</span>, mode: "browse" as ViewMode, contentType: "anime" as ContentType },
  { id: "browse-programa", label: "Programas",  icon: <MonitorPlay className="w-3.5 h-3.5" />, mode: "browse" as ViewMode, contentType: "programa" as ContentType },
  { id: "releases",        label: "Estrenos",   icon: <Clapperboard className="w-3.5 h-3.5" />, mode: "releases" as ViewMode, contentType: null },
  { id: "lists",           label: "Mis Listas", icon: <BookMarked className="w-3.5 h-3.5" />,   mode: "lists" as ViewMode, contentType: null },
];

// ── Home ────────────────────────────────────────────────────────
export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeContentType, setActiveContentType] = useState<ContentType>("movie");
  const [viewMode, setViewMode] = useState<ViewMode>("browse");
  const [showAddList, setShowAddList] = useState(false);
  const [selectedGenreId, setSelectedGenreId] = useState<number | null>(null);
  const [isLoadingRandom, setIsLoadingRandom] = useState(false);
  const debouncedQuery = useDebounce(searchQuery, 500);
  const { locale } = useLocale();
  const { lists } = useLists();

  const [selectedMedia, setSelectedMedia] = useState<AnyMedia | null>(null);

  // Map ContentType to TMDB type
  const tmdbType: "movie" | "series" =
    activeContentType === "movie" ? "movie" : "series";

  const isSearching = debouncedQuery.length > 2;
  const isFiltering = !isSearching && selectedGenreId !== null;
  const isAnime = activeContentType === "anime";
  const isPrograma = activeContentType === "programa";
  const isSpecialBrowse = isAnime || isPrograma;

  // Popular (movie/series only, not anime/programa)
  const { data: popularData, isLoading: isLoadingPopular } = useGetPopularTitles(
    { type: tmdbType, page: 1, country: locale.code },
    { query: { enabled: !isSearching && !isFiltering && !isSpecialBrowse && viewMode === "browse" } }
  );

  // Genre filter for movie/series
  const { data: discoverData, isLoading: isLoadingDiscover } = useDiscover(
    { type: tmdbType, country: locale.code, genreId: selectedGenreId, page: 1 },
    { query: { enabled: isFiltering && !isSpecialBrowse && viewMode === "browse" } }
  );

  // Anime discover — always fetches when on anime tab
  const { data: animeData, isLoading: isLoadingAnime } = useDiscover(
    { type: "series", country: locale.code, genreIds: ANIME_GENRE_ID, originLanguage: ANIME_LANG, page: 1, alwaysEnabled: true },
    { query: { enabled: isAnime && !isSearching && viewMode === "browse" } }
  );

  // Programa discover — always fetches when on programa tab
  const { data: programaData, isLoading: isLoadingPrograma } = useDiscover(
    { type: "series", country: locale.code, genreIds: PROGRAMA_GENRE_IDS, page: 1, alwaysEnabled: true },
    { query: { enabled: isPrograma && !isSearching && viewMode === "browse" } }
  );

  // Search
  const { data: searchData, isLoading: isLoadingSearch } = useSearchTitles(
    { query: debouncedQuery, type: tmdbType },
    { query: { enabled: isSearching } }
  );

  const displayedData: any[] | undefined =
    isSearching   ? searchData?.results
    : isAnime     ? animeData?.results
    : isPrograma  ? programaData?.results
    : isFiltering ? discoverData?.results
    : popularData?.results;

  const isLoading =
    isSearching  ? isLoadingSearch
    : isAnime    ? isLoadingAnime
    : isPrograma ? isLoadingPrograma
    : isFiltering ? isLoadingDiscover
    : isLoadingPopular;

  // Change type: reset genre filter
  const handleTypeChange = useCallback((ct: ContentType) => {
    setActiveContentType(ct);
    setSelectedGenreId(null);
  }, []);

  // Random button — fetches from a random page beyond the top 20
  const handleRandom = useCallback(async () => {
    if (isLoadingRandom) return;
    setIsLoadingRandom(true);
    try {
      const result = await fetchRandomTitle(tmdbType, locale.code);
      if (result) setSelectedMedia(result);
    } finally {
      setIsLoadingRandom(false);
    }
  }, [tmdbType, locale.code, isLoadingRandom]);

  const activeGenreName = (() => {
    const genres = activeContentType === "movie" ? MOVIE_GENRES : SERIES_GENRES;
    return genres.find((g) => g.id === selectedGenreId)?.name ?? null;
  })();

  return (
    <div className="min-h-screen relative" style={{ background: "#080912" }}>
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />

      <Header searchQuery={searchQuery} setSearchQuery={setSearchQuery} activeType={tmdbType} setActiveType={(t) => handleTypeChange(t)} />

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-4">

        {/* ── Top tabs ── */}
        <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
          <div className="flex items-center gap-1 p-1 rounded-2xl overflow-x-auto scrollbar-hide"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
            {TABS.map((tab) => {
              const isActive =
                tab.mode === "lists"     ? viewMode === "lists"
                : tab.mode === "releases" ? viewMode === "releases"
                : viewMode === "browse" && activeContentType === tab.contentType;
              return (
                <button key={tab.id}
                  onClick={() => {
                    if (tab.mode === "lists")         { setViewMode("lists"); }
                    else if (tab.mode === "releases") { setViewMode("releases"); }
                    else { setViewMode("browse"); handleTypeChange(tab.contentType!); }
                  }}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                    isActive ? "text-white bg-white/10 shadow-sm" : "text-white/35 hover:text-white/60"
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                  {tab.mode === "lists" && lists.length > 0 && (
                    <span className="ml-0.5 text-[10px] text-white/30 tabular-nums">({lists.length})</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2 shrink-0">
            {viewMode === "lists" ? (
              <button onClick={() => setShowAddList(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white/60 hover:text-white transition-all duration-200"
                style={{ border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)" }}>
                <Plus className="w-3.5 h-3.5" />
                Añadir lista
              </button>
            ) : viewMode === "browse" ? (
              <>
                {displayedData && displayedData.length > 0 && (
                  <span className="text-xs text-white/20 tabular-nums">{displayedData.length} títulos</span>
                )}
                <button
                  onClick={handleRandom}
                  disabled={isLoadingRandom}
                  title="Título aleatorio (más allá del top 20)"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white/50 hover:text-white transition-all duration-200 hover:bg-white/10 disabled:opacity-40"
                  style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)" }}
                >
                  {isLoadingRandom
                    ? <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white/80 animate-spin" />
                    : <Dices className="w-3.5 h-3.5" />
                  }
                  {isLoadingRandom ? "Buscando..." : "Aleatorio"}
                </button>
              </>
            ) : null}
          </div>
        </div>

        {/* ── Genre filter bar (browse mode, movie/series only, no search) ── */}
        <AnimatePresence>
          {viewMode === "browse" && !isSearching && !isSpecialBrowse && (
            <motion.div
              key="genre-bar"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-5 overflow-hidden"
            >
              <div className="flex items-center gap-3">
                <GenreChips type={tmdbType} selectedId={selectedGenreId} onSelect={setSelectedGenreId} />
                {activeGenreName && (
                  <button
                    onClick={() => setSelectedGenreId(null)}
                    className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] text-white/40 hover:text-white/70 transition-colors"
                    style={{ border: "1px solid rgba(255,255,255,0.08)" }}
                  >
                    <X className="w-3 h-3" />
                    Quitar filtro
                  </button>
                )}
              </div>
              {activeGenreName && (
                <p className="text-xs text-white/30 mt-2 pl-6">
                  Mostrando <span className="text-white/55 font-semibold">{activeGenreName}</span> con disponibilidad en España
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Lists view ── */}
        {viewMode === "lists" && <ListsSection />}

        {/* ── Releases view ── */}
        {viewMode === "releases" && (
          <ReleasesView country={locale.code} onSelect={(t) => setSelectedMedia(t as any)} />
        )}

        {/* ── Browse / search grid ── */}
        {viewMode === "browse" && (
          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div key="skeleton" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
                {[...Array(12)].map((_, i) => (
                  <div key={i} className="aspect-[2/3] rounded-2xl shimmer"
                    style={{ border: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.03)" }} />
                ))}
              </motion.div>
            ) : displayedData && displayedData.length > 0 ? (
              <motion.div key={`${activeContentType}-${selectedGenreId}-${debouncedQuery}`}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
                {displayedData.map((item, i) => (
                  <motion.div key={`${item.tmdbId}-${i}`} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03, duration: 0.35, ease: "easeOut" }}>
                    <MediaCard media={item} onClick={setSelectedMedia} onGenreClick={(g) => {
                      const genres = tmdbType === "movie" ? MOVIE_GENRES : SERIES_GENRES;
                      const found = genres.find((x) => x.name.toLowerCase() === g.toLowerCase());
                      if (found && !isSpecialBrowse) { setSelectedGenreId(found.id); setViewMode("browse"); }
                    }} />
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  {isSearching ? <Zap className="w-7 h-7 text-white/20" /> : <Tag className="w-7 h-7 text-white/20" />}
                </div>
                <h3 className="text-xl font-display font-bold text-white/70 mb-2">Sin resultados</h3>
                <p className="text-white/30 text-sm max-w-sm">
                  {isSearching
                    ? `No encontramos resultados para "${debouncedQuery}".`
                    : `No hay contenido disponible con ese filtro.`}
                </p>
                {(isSearching || isFiltering) && (
                  <button onClick={() => { setSearchQuery(""); setSelectedGenreId(null); }}
                    className="mt-5 px-5 py-2 rounded-xl text-sm text-white/60 hover:text-white transition-colors"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    Quitar filtros
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </main>

      <StremioInstallBanner />

      <footer className="relative z-10 py-6 text-center" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        <p className="text-white/20 text-xs">Data provided by TMDB · Streaming availability for Spain</p>
        <div className="mt-2 flex items-center justify-center gap-3">
          <Link href="/open-source" className="text-[11px] text-white/20 hover:text-white/50 transition-colors">Código abierto</Link>
          <span className="text-white/10 text-[11px]">·</span>
          <Link href="/self-host" className="text-[11px] text-white/20 hover:text-white/50 transition-colors">Self-hosting</Link>
          <span className="text-white/10 text-[11px]">·</span>
          <p className="text-white/10 text-[11px] tracking-widest uppercase font-medium">designed by zzever</p>
        </div>
      </footer>

      {showAddList && <AddListDialog onClose={() => setShowAddList(false)} />}

      {selectedMedia && (
        <ProviderModal
          isOpen={!!selectedMedia}
          onClose={() => setSelectedMedia(null)}
          tmdbId={selectedMedia.tmdbId}
          imdbId={"imdbId" in selectedMedia ? (selectedMedia as any).imdbId : null}
          type={selectedMedia.type as "movie" | "series"}
          title={selectedMedia.title}
          poster={selectedMedia.poster}
          backdrop={"backdrop" in selectedMedia ? (selectedMedia as any).backdrop : null}
          overview={"overview" in selectedMedia ? (selectedMedia as any).overview : null}
          rating={selectedMedia.rating}
          year={selectedMedia.year}
          genres={selectedMedia.genres}
          country={locale.code}
        />
      )}
    </div>
  );
}
