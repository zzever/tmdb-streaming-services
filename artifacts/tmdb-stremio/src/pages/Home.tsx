import React, { useState } from "react";
import { useGetPopularTitles, useSearchTitles } from "@/hooks/use-media-api";
import { useDebounce } from "@/hooks/use-debounce";
import { Header } from "@/components/Header";
import { MediaCard } from "@/components/MediaCard";
import { ProviderModal } from "@/components/ProviderModal";
import { Loader2, SearchX } from "lucide-react";
import type { PopularTitle, SearchResult } from "@workspace/api-client-react/src/generated/api.schemas";
import { motion } from "framer-motion";

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeType, setActiveType] = useState<"movie" | "series">("movie");
  const debouncedQuery = useDebounce(searchQuery, 500);

  const [selectedMedia, setSelectedMedia] = useState<PopularTitle | SearchResult | null>(null);

  const isSearching = debouncedQuery.length > 2;

  // Fetch Popular
  const { data: popularData, isLoading: isLoadingPopular } = useGetPopularTitles(
    { type: activeType, page: 1 },
    { query: { enabled: !isSearching } }
  );

  // Fetch Search
  const { data: searchData, isLoading: isLoadingSearch } = useSearchTitles(
    { query: debouncedQuery, type: activeType },
    { query: { enabled: isSearching } }
  );

  const displayedData = isSearching ? searchData?.results : popularData?.results;
  const isLoading = isSearching ? isLoadingSearch : isLoadingPopular;

  const handleMediaClick = (media: PopularTitle | SearchResult) => {
    setSelectedMedia(media);
  };

  return (
    <div className="min-h-screen bg-background relative selection:bg-primary/30">
      {/* Background Image Effect */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <img 
          src={`${import.meta.env.BASE_URL}images/hero-bg.png`} 
          alt="" 
          className="w-full h-full object-cover opacity-20 object-top mix-blend-screen"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/80 to-background" />
      </div>

      <Header 
        searchQuery={searchQuery} 
        setSearchQuery={setSearchQuery} 
        activeType={activeType} 
        setActiveType={setActiveType} 
      />

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        <div className="mb-8 flex flex-col sm:flex-row items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-display font-bold text-white tracking-tight">
              {isSearching ? `Search Results for "${debouncedQuery}"` : `Popular ${activeType === 'movie' ? 'Movies' : 'TV Series'}`}
            </h1>
            <p className="text-muted-foreground mt-2 text-sm sm:text-base">
              {isSearching 
                ? "Find where to stream your favorite titles in Spain." 
                : "Discover trending entertainment available on Spanish streaming platforms."}
            </p>
          </div>
        </div>

        {/* Content State */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="aspect-[2/3] rounded-xl bg-white/5 animate-pulse border border-white/5" />
            ))}
          </div>
        ) : displayedData && displayedData.length > 0 ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6"
          >
            {displayedData.map((item, i) => (
              <motion.div 
                key={`${item.tmdbId}-${i}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.4, ease: "easeOut" }}
              >
                <MediaCard media={item} onClick={handleMediaClick} />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <img 
              src={`${import.meta.env.BASE_URL}images/empty-state.png`} 
              alt="No results" 
              className="w-48 h-48 object-contain opacity-50 mb-6 drop-shadow-2xl mix-blend-screen"
            />
            <h3 className="text-2xl font-display font-bold text-white mb-2">No titles found</h3>
            <p className="text-muted-foreground max-w-md">
              We couldn't find any {activeType === 'movie' ? 'movies' : 'series'} matching your criteria. Try adjusting your search.
            </p>
            {isSearching && (
              <button 
                onClick={() => setSearchQuery("")}
                className="mt-6 px-6 py-2 rounded-full bg-primary/20 text-primary border border-primary/30 hover:bg-primary hover:text-white transition-colors"
              >
                Clear Search
              </button>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 bg-black/20 backdrop-blur-md py-8 text-center text-muted-foreground text-sm">
        <p>Data provided by TMDB. Stremio Addon Server.</p>
        <p className="mt-1 opacity-60">Streaming availability tailored for Spain (ES).</p>
      </footer>

      {/* Modal */}
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
          initialProviders={"providers" in selectedMedia ? (selectedMedia as PopularTitle).providers : undefined}
        />
      )}
    </div>
  );
}
