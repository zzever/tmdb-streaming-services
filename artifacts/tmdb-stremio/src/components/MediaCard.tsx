import React from "react";
import { motion } from "framer-motion";
import { getTmdbImage } from "@/lib/utils";
import { MonitorPlay } from "lucide-react";
import type { PopularTitle, SearchResult } from "@workspace/api-client-react/src/generated/api.schemas";

interface MediaCardProps {
  media: PopularTitle | SearchResult;
  onClick: (media: PopularTitle | SearchResult) => void;
}

export function MediaCard({ media, onClick }: MediaCardProps) {
  const isPopularTitle = "providers" in media;
  const providers = isPopularTitle ? (media as PopularTitle).providers ?? [] : [];
  const hasProviders = providers.length > 0;
  const displayProviders = providers.filter((p) => p.type === "flatrate" || p.type === "free").slice(0, 4);
  const extraCount = providers.length - displayProviders.length;

  return (
    <motion.div
      whileHover={{ y: -8, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      onClick={() => onClick(media)}
      className="group relative flex flex-col cursor-pointer rounded-xl overflow-hidden bg-card border border-white/5 shadow-xl shadow-black/20"
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-muted">
        {media.poster ? (
          <>
            <img
              src={getTmdbImage(media.poster, "w500") || ""}
              alt={media.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
              <p className="text-sm text-white/80 line-clamp-3">
                {media.overview || "Sin descripción disponible."}
              </p>
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-card text-muted-foreground/50">
            <MonitorPlay className="w-12 h-12 mb-2 opacity-50" />
            <span className="text-sm font-medium px-4 text-center">{media.title}</span>
          </div>
        )}

        {/* Rating Badge */}
        {media.rating && media.rating > 0 && (
          <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-md px-2 py-1 rounded-md text-xs font-bold text-yellow-400 border border-white/10 z-10">
            {media.rating.toFixed(1)}
          </div>
        )}

        {/* Provider Icons — shown bottom-left on hover too */}
        {hasProviders && (
          <div className="absolute top-2 left-2 flex gap-1 z-10">
            {displayProviders.map((p, i) =>
              p.logo ? (
                <div
                  key={`${p.providerId}-${i}`}
                  className="relative group/icon"
                  title={p.name}
                >
                  <img
                    src={p.logo}
                    alt={p.name}
                    className="w-8 h-8 rounded-lg border border-white/20 shadow-lg shadow-black/50 object-cover bg-black"
                  />
                </div>
              ) : (
                <div
                  key={`${p.providerId}-${i}`}
                  className="w-8 h-8 rounded-lg border border-white/20 bg-black/70 flex items-center justify-center shadow-lg"
                  title={p.name}
                >
                  <span className="text-[9px] font-bold text-white leading-none text-center px-0.5">
                    {p.name.slice(0, 3).toUpperCase()}
                  </span>
                </div>
              )
            )}
            {extraCount > 0 && (
              <div className="w-8 h-8 rounded-lg border border-white/20 bg-black/70 backdrop-blur-md flex items-center justify-center shadow-lg">
                <span className="text-[10px] font-bold text-white">+{extraCount}</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="p-4 flex flex-col flex-1 bg-card/50 backdrop-blur-md">
        <h3 className="font-display font-semibold text-foreground text-sm sm:text-base leading-tight line-clamp-1 mb-1 group-hover:text-primary transition-colors">
          {media.title}
        </h3>
        <div className="flex items-center justify-between text-xs text-muted-foreground mt-auto">
          <span>{media.year || "—"}</span>
          <span className="uppercase tracking-wider font-semibold text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-white/70">
            {media.type === "series" ? "Serie" : "Película"}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
