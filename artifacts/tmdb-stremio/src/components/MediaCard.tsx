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
  const hasProviders = isPopularTitle && (media as PopularTitle).providers?.length > 0;

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
            {/* Dark overlay on hover */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
              <p className="text-sm text-white/80 line-clamp-3">
                {media.overview || "No description available."}
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

        {/* Provider Indicators (only shown on popular titles pre-fetched) */}
        {hasProviders && (
          <div className="absolute top-2 left-2 flex -space-x-2 z-10">
            {(media as PopularTitle).providers.slice(0, 3).map((p, i) => (
              p.logo ? (
                <img 
                  key={i} 
                  src={getTmdbImage(p.logo, "w500") || ""} 
                  alt={p.name} 
                  className="w-6 h-6 rounded-full border border-black/50 shadow-sm"
                />
              ) : null
            ))}
            {(media as PopularTitle).providers.length > 3 && (
              <div className="w-6 h-6 rounded-full border border-black/50 bg-black/80 flex items-center justify-center text-[10px] font-bold text-white shadow-sm">
                +{(media as PopularTitle).providers.length - 3}
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
          <span>{media.year || "Unknown"}</span>
          <span className="uppercase tracking-wider font-semibold text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-white/70">
            {media.type}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
