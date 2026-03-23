import React, { useState } from "react";
import { useGetPopularTitles, useSearchTitles, useGetReleases } from "@/hooks/use-media-api";
import { useDebounce } from "@/hooks/use-debounce";
import { Header } from "@/components/Header";
import { MediaCard } from "@/components/MediaCard";
import { ProviderModal } from "@/components/ProviderModal";
import { ListsSection } from "@/components/ListSection";
import { AddListDialog } from "@/components/AddListDialog";
import { useLists } from "@/context/ListsContext";
import { useLocale } from "@/context/LocaleContext";
import { Copy, Check, Zap, Plug, Shuffle, BookMarked, Plus, Film, Tv2, Clapperboard, CalendarDays, Star, MonitorPlay } from "lucide-react";
import { Link } from "wouter";
import type { PopularTitle, SearchResult } from "@workspace/api-client-react/src/generated/api.schemas";
import type { ReleaseTitle } from "@/hooks/use-media-api";
import { motion, AnimatePresence } from "framer-motion";

const MANIFEST_URL = `${window.location.origin}/api/stremio/manifest.json`;
const STREMIO_INSTALL_URL = MANIFEST_URL.replace(/^https?:\/\//, "stremio://");

const RELEASE_MODES = [
  { id: "upcoming-movie", label: "Próximamente", type: "movie" as const, mode: "upcoming" },
  { id: "now_playing-movie", label: "En cines", type: "movie" as const, mode: "now_playing" },
  { id: "on_the_air-series", label: "En emisión", type: "series" as const, mode: "on_the_air" },
];

function formatDate(dateStr: string | null) {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return dateStr;
  }
}

interface ReleasesViewProps {
  country: string;
  onSelect: (t: ReleaseTitle) => void;
}

function ReleasesView({ country, onSelect }: ReleasesViewProps) {
  const [activeMode, setActiveMode] = useState(RELEASE_MODES[0].id);
  const selected = RELEASE_MODES.find((m) => m.id === activeMode) ?? RELEASE_MODES[0];

  const { data, isLoading } = useGetReleases({
    type: selected.type,
    country,
    mode: selected.mode,
  });

  return (
    <div>
      {/* Mode selector */}
      <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-1 scrollbar-hide">
        {RELEASE_MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => setActiveMode(m.id)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
              activeMode === m.id
                ? "text-white bg-white/12 border border-white/15"
                : "text-white/35 hover:text-white/60 border border-transparent"
            }`}
          >
            {m.id.includes("series") ? (
              <Tv2 className="w-3.5 h-3.5" />
            ) : (
              <Film className="w-3.5 h-3.5" />
            )}
            {m.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="skeleton"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3"
          >
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className="aspect-[2/3] rounded-2xl shimmer"
                style={{ border: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.03)" }}
              />
            ))}
          </motion.div>
        ) : data && data.results.length > 0 ? (
          <motion.div
            key={activeMode}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3"
          >
            {data.results.map((item, i) => (
              <motion.div
                key={`${item.tmdbId}-${i}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.025, duration: 0.3 }}
              >
                <div
                  onClick={() => onSelect(item)}
                  className="rounded-2xl overflow-hidden cursor-pointer group"
                  style={{
                    border: "1px solid rgba(255,255,255,0.07)",
                    background: "rgba(255,255,255,0.03)",
                  }}
                >
                  <div className="aspect-[2/3] bg-white/5 relative overflow-hidden">
                    {item.poster ? (
                      <img
                        src={item.poster}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <MonitorPlay className="w-8 h-8 text-white/15" />
                      </div>
                    )}
                    {item.rating && item.rating > 0 && (
                      <div className="absolute top-1.5 right-1.5 bg-black/70 backdrop-blur-sm px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                        <Star className="w-2.5 h-2.5 text-yellow-400 fill-yellow-400" />
                        <span className="text-[10px] font-bold text-yellow-400">
                          {item.rating.toFixed(1)}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="p-2 pb-2.5">
                    <p className="text-[11px] font-semibold text-white/75 group-hover:text-white line-clamp-2 leading-tight transition-colors mb-1">
                      {item.title}
                    </p>
                    {item.releaseDate && (
                      <div className="flex items-center gap-1">
                        <CalendarDays className="w-2.5 h-2.5 text-primary/60 shrink-0" />
                        <span className="text-[9px] text-primary/60 font-medium">
                          {formatDate(item.releaseDate)}
                        </span>
                      </div>
                    )}
                    {item.genres.length > 0 && (
                      <p className="text-[9px] text-white/25 mt-0.5 line-clamp-1">{item.genres[0]}</p>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20"
          >
            <Clapperboard className="w-10 h-10 text-white/15 mb-3" />
            <p className="text-white/30 text-sm">No hay estrenos disponibles ahora mismo.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StremioInstallBanner() {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(MANIFEST_URL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="relative z-10 py-16 overflow-hidden">
      <div className="max-w-2xl mx-auto px-4">
        <div
          className="relative rounded-3xl p-8 text-center overflow-hidden"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            backdropFilter: "blur(24px)",
          }}
        >
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

            <a
              href={STREMIO_INSTALL_URL}
              className="inline-flex items-center gap-2.5 bg-primary hover:bg-primary/90 text-white font-semibold px-7 py-3 rounded-xl transition-all duration-200 mb-7 glow-primary text-sm"
            >
              <Plug className="w-4 h-4" />
              Instalar en Stremio
            </a>

            <p className="text-white/25 text-xs mb-3">O copia la URL del manifest para instalarlo manualmente:</p>

            <div
              className="flex items-center gap-2 px-4 py-3 rounded-xl mx-auto max-w-lg"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              <code className="flex-1 text-xs text-left text-primary/60 truncate font-mono select-all">
                {MANIFEST_URL}
              </code>
              <button
                onClick={handleCopy}
                className="flex-shrink-0 p-1.5 rounded-lg hover:bg-white/8 text-white/30 hover:text-white/80 transition-colors"
                title="Copiar URL"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            <p className="text-white/20 text-xs mt-4">
              En Stremio: Addons → Addon del repositorio → Pegar URL
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

type ViewMode = "browse" | "lists" | "releases";

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeType, setActiveType] = useState<"movie" | "series">("movie");
  const [viewMode, setViewMode] = useState<ViewMode>("browse");
  const [showAddList, setShowAddList] = useState(false);
  const debouncedQuery = useDebounce(searchQuery, 500);
  const { locale } = useLocale();
  const { lists } = useLists();

  const [selectedMedia, setSelectedMedia] = useState<PopularTitle | SearchResult | ReleaseTitle | null>(null);

  const isSearching = debouncedQuery.length > 2;

  const { data: popularData, isLoading: isLoadingPopular } = useGetPopularTitles(
    { type: activeType, page: 1, country: locale.code },
    { query: { enabled: !isSearching && viewMode === "browse" } }
  );

  const { data: searchData, isLoading: isLoadingSearch } = useSearchTitles(
    { query: debouncedQuery, type: activeType },
    { query: { enabled: isSearching } }
  );

  const displayedData = isSearching ? searchData?.results : popularData?.results;
  const isLoading = isSearching ? isLoadingSearch : isLoadingPopular;

  const TABS = [
    { id: "browse-movie", label: "Películas", icon: <Film className="w-3.5 h-3.5" />, mode: "browse" as ViewMode, type: "movie" as const },
    { id: "browse-series", label: "Series", icon: <Tv2 className="w-3.5 h-3.5" />, mode: "browse" as ViewMode, type: "series" as const },
    { id: "releases", label: "Estrenos", icon: <Clapperboard className="w-3.5 h-3.5" />, mode: "releases" as ViewMode, type: null },
    { id: "lists", label: "Mis Listas", icon: <BookMarked className="w-3.5 h-3.5" />, mode: "lists" as ViewMode, type: null },
  ] as const;

  return (
    <div className="min-h-screen relative" style={{ background: "#080912" }}>

      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />

      <Header
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        activeType={activeType}
        setActiveType={setActiveType}
      />

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-4">

        {/* View mode tabs */}
        <div className="flex items-center justify-between mb-6 gap-4">
          <div
            className="flex items-center gap-1 p-1 rounded-2xl overflow-x-auto scrollbar-hide"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            {TABS.map((tab) => {
              const isActive =
                tab.mode === "lists"
                  ? viewMode === "lists"
                  : tab.mode === "releases"
                  ? viewMode === "releases"
                  : viewMode === "browse" && activeType === tab.type;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    if (tab.mode === "lists") {
                      setViewMode("lists");
                    } else if (tab.mode === "releases") {
                      setViewMode("releases");
                    } else {
                      setViewMode("browse");
                      setActiveType(tab.type!);
                    }
                  }}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                    isActive
                      ? "text-white bg-white/10 shadow-sm"
                      : "text-white/35 hover:text-white/60"
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

          {/* Right-side actions */}
          <div className="flex items-center gap-2 shrink-0">
            {viewMode === "lists" ? (
              <button
                onClick={() => setShowAddList(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white/60 hover:text-white transition-all duration-200"
                style={{ border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)" }}
              >
                <Plus className="w-3.5 h-3.5" />
                Añadir lista
              </button>
            ) : viewMode === "browse" ? (
              <>
                {displayedData && displayedData.length > 0 && (
                  <span className="text-xs text-white/20 tabular-nums">{displayedData.length} títulos</span>
                )}
                {displayedData && displayedData.length > 0 && (
                  <button
                    onClick={() => {
                      const randomItem = displayedData[Math.floor(Math.random() * displayedData.length)];
                      setSelectedMedia(randomItem);
                    }}
                    title="Título aleatorio"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white/50 hover:text-white transition-all duration-200 hover:bg-white/10"
                    style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)" }}
                  >
                    <Shuffle className="w-3.5 h-3.5" />
                    Aleatorio
                  </button>
                )}
              </>
            ) : null}
          </div>
        </div>

        {/* Lists view */}
        {viewMode === "lists" && <ListsSection />}

        {/* Releases view */}
        {viewMode === "releases" && (
          <ReleasesView
            country={locale.code}
            onSelect={(t) => setSelectedMedia(t as any)}
          />
        )}

        {/* Browse / search grid */}
        {viewMode === "browse" && (
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="skeleton"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4"
            >
              {[...Array(12)].map((_, i) => (
                <div
                  key={i}
                  className="aspect-[2/3] rounded-2xl shimmer"
                  style={{ border: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.03)" }}
                />
              ))}
            </motion.div>
          ) : displayedData && displayedData.length > 0 ? (
            <motion.div
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4"
            >
              {displayedData.map((item, i) => (
                <motion.div
                  key={`${item.tmdbId}-${i}`}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03, duration: 0.35, ease: "easeOut" }}
                >
                  <MediaCard media={item} onClick={setSelectedMedia} />
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-24 text-center"
            >
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
              >
                <Zap className="w-7 h-7 text-white/20" />
              </div>
              <h3 className="text-xl font-display font-bold text-white/70 mb-2">Sin resultados</h3>
              <p className="text-white/30 text-sm max-w-sm">
                No encontramos {activeType === "movie" ? "películas" : "series"} para "{debouncedQuery}".
              </p>
              {isSearching && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="mt-5 px-5 py-2 rounded-xl text-sm text-white/60 hover:text-white transition-colors"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  Limpiar búsqueda
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        )}
      </main>

      <StremioInstallBanner />

      <footer className="relative z-10 py-6 text-center" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        <p className="text-white/20 text-xs">
          Data provided by TMDB · Streaming availability for Spain
        </p>
        <div className="mt-2 flex items-center justify-center gap-3">
          <Link href="/open-source" className="text-[11px] text-white/20 hover:text-white/50 transition-colors">
            Código abierto
          </Link>
          <span className="text-white/10 text-[11px]">·</span>
          <Link href="/self-host" className="text-[11px] text-white/20 hover:text-white/50 transition-colors">
            Self-hosting
          </Link>
          <span className="text-white/10 text-[11px]">·</span>
          <p className="text-white/10 text-[11px] tracking-widest uppercase font-medium">
            designed by zzever
          </p>
        </div>
      </footer>

      {showAddList && <AddListDialog onClose={() => setShowAddList(false)} />}

      {selectedMedia && (
        <ProviderModal
          isOpen={!!selectedMedia}
          onClose={() => setSelectedMedia(null)}
          tmdbId={selectedMedia.tmdbId}
          imdbId={"imdbId" in selectedMedia ? selectedMedia.imdbId : null}
          type={selectedMedia.type as "movie" | "series"}
          title={selectedMedia.title}
          poster={selectedMedia.poster}
          backdrop={selectedMedia.backdrop}
          overview={"overview" in selectedMedia ? selectedMedia.overview : null}
          rating={selectedMedia.rating}
          year={selectedMedia.year}
          genres={selectedMedia.genres}
          country={locale.code}
        />
      )}
    </div>
  );
}
