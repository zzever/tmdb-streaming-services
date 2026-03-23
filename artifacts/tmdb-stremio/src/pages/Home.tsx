import React, { useState } from "react";
import { useGetPopularTitles, useSearchTitles } from "@/hooks/use-media-api";
import { useDebounce } from "@/hooks/use-debounce";
import { Header } from "@/components/Header";
import { MediaCard } from "@/components/MediaCard";
import { ProviderModal } from "@/components/ProviderModal";
import { useLocale } from "@/context/LocaleContext";
import { Copy, Check, Zap, Plug } from "lucide-react";
import type { PopularTitle, SearchResult } from "@workspace/api-client-react/src/generated/api.schemas";
import { motion, AnimatePresence } from "framer-motion";

const MANIFEST_URL = `${window.location.origin}/api/stremio/manifest.json`;
const STREMIO_INSTALL_URL = MANIFEST_URL.replace(/^https?:\/\//, "stremio://");

function StremioInstallBanner() {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(MANIFEST_URL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="relative z-10 py-16 overflow-hidden">
      {/* Glass panel */}
      <div className="max-w-2xl mx-auto px-4">
        <div
          className="relative rounded-3xl p-8 text-center overflow-hidden"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            backdropFilter: "blur(24px)",
          }}
        >
          {/* Ambient glow inside card */}
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

            {/* Install button */}
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

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeType, setActiveType] = useState<"movie" | "series">("movie");
  const debouncedQuery = useDebounce(searchQuery, 500);
  const { locale } = useLocale();

  const [selectedMedia, setSelectedMedia] = useState<PopularTitle | SearchResult | null>(null);

  const isSearching = debouncedQuery.length > 2;

  const { data: popularData, isLoading: isLoadingPopular } = useGetPopularTitles(
    { type: activeType, page: 1, country: locale.code },
    { query: { enabled: !isSearching } }
  );

  const { data: searchData, isLoading: isLoadingSearch } = useSearchTitles(
    { query: debouncedQuery, type: activeType },
    { query: { enabled: isSearching } }
  );

  const displayedData = isSearching ? searchData?.results : popularData?.results;
  const isLoading = isSearching ? isLoadingSearch : isLoadingPopular;

  return (
    <div className="min-h-screen relative" style={{ background: "#080912" }}>

      {/* Ambient orbs */}
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />

      <Header
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        activeType={activeType}
        setActiveType={setActiveType}
      />

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-4">

        {/* Section heading */}
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Zap className="w-4 h-4 text-primary/70" />
              <span className="text-xs uppercase tracking-widest text-white/30 font-semibold">
                {isSearching ? "Resultados" : "Populares"}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold leading-tight">
              {isSearching ? (
                <>
                  <span className="text-white/80">Resultados para </span>
                  <span className="gradient-text-primary">"{debouncedQuery}"</span>
                </>
              ) : (
                <>
                  <span className="gradient-text">
                    {activeType === "movie" ? "Películas" : "Series"}
                  </span>
                </>
              )}
            </h1>
          </div>

          {displayedData && displayedData.length > 0 && (
            <span className="text-xs text-white/20 tabular-nums shrink-0">
              {displayedData.length} títulos
            </span>
          )}
        </div>

        {/* Grid */}
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
      </main>

      <StremioInstallBanner />

      <footer className="relative z-10 py-6 text-center" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        <p className="text-white/20 text-xs">
          Data provided by TMDB · Streaming availability for Spain
        </p>
      </footer>

      {selectedMedia && (
        <ProviderModal
          isOpen={!!selectedMedia}
          onClose={() => setSelectedMedia(null)}
          imdbId={selectedMedia.imdbId}
          type={selectedMedia.type as "movie" | "series"}
          title={selectedMedia.title}
          poster={selectedMedia.poster}
          overview={selectedMedia.overview}
          rating={selectedMedia.rating}
          year={selectedMedia.year}
          country={locale.code}
        />
      )}
    </div>
  );
}
