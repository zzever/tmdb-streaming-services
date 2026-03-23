import React, { useState } from "react";
import { useGetList } from "@/hooks/use-media-api";
import { MediaCard } from "./MediaCard";
import { ProviderModal } from "./ProviderModal";
import { useLists, type ListSource } from "@/context/ListsContext";
import { useLocale } from "@/context/LocaleContext";
import { Loader2, AlertCircle, Trash2, BookMarked, List } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { SearchResult } from "@workspace/api-client-react/src/generated/api.schemas";

function SingleList({ listSource, onCardClick }: { listSource: ListSource; onCardClick: (m: SearchResult) => void }) {
  const { removeList } = useLists();
  const { data, isLoading, isError } = useGetList(listSource.params, {
    query: { retry: 1, staleTime: 5 * 60_000 },
  });

  const icon = listSource.params.source === "mdblist"
    ? <BookMarked className="w-4 h-4 text-yellow-400" />
    : <List className="w-4 h-4 text-orange-400" />;

  const color = listSource.params.source === "mdblist" ? "rgba(251,191,36,0.15)" : "rgba(237,76,40,0.15)";

  return (
    <section className="mb-10">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: color }}>
            {icon}
          </div>
          <h2 className="text-base font-display font-bold text-white/80">{listSource.name}</h2>
          {data && (
            <span className="text-xs text-white/20 tabular-nums">{data.items.length} títulos</span>
          )}
        </div>
        <button
          onClick={() => removeList(listSource.id)}
          className="text-white/20 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-red-400/10"
          title="Eliminar lista"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      )}

      {isError && (
        <div
          className="rounded-2xl p-4 flex items-center gap-3"
          style={{ background: "rgba(255,60,60,0.06)", border: "1px solid rgba(255,60,60,0.15)" }}
        >
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <p className="text-red-400 text-sm">No se pudo cargar la lista. Verifica tus credenciales.</p>
        </div>
      )}

      {data && data.items.length === 0 && (
        <p className="text-white/30 text-sm text-center py-8">La lista está vacía o no tiene títulos disponibles.</p>
      )}

      {data && data.items.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
          {data.items.map((item, i) => (
            <motion.div
              key={`${item.tmdbId}-${i}`}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.025, duration: 0.3, ease: "easeOut" }}
            >
              <MediaCard media={item} onClick={(m) => onCardClick(m as SearchResult)} />
            </motion.div>
          ))}
        </div>
      )}
    </section>
  );
}

export function ListsSection() {
  const { lists } = useLists();
  const { locale } = useLocale();
  const [selectedMedia, setSelectedMedia] = useState<SearchResult | null>(null);

  if (lists.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <BookMarked className="w-7 h-7 text-white/20" />
        </div>
        <h3 className="text-xl font-display font-bold text-white/60 mb-2">Sin listas</h3>
        <p className="text-white/30 text-sm max-w-xs">
          Añade tu primera lista de MDBList o Trakt con el botón de arriba.
        </p>
      </div>
    );
  }

  return (
    <>
      <AnimatePresence>
        {lists.map((listSource) => (
          <motion.div
            key={listSource.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <SingleList listSource={listSource} onCardClick={setSelectedMedia} />
          </motion.div>
        ))}
      </AnimatePresence>

      {selectedMedia && (
        <ProviderModal
          isOpen={!!selectedMedia}
          onClose={() => setSelectedMedia(null)}
          tmdbId={selectedMedia.tmdbId}
          imdbId={selectedMedia.imdbId}
          type={selectedMedia.type as "movie" | "series"}
          title={selectedMedia.title}
          poster={selectedMedia.poster}
          backdrop={selectedMedia.backdrop}
          overview={selectedMedia.overview}
          rating={selectedMedia.rating}
          year={selectedMedia.year}
          genres={selectedMedia.genres}
          country={locale.code}
        />
      )}
    </>
  );
}
