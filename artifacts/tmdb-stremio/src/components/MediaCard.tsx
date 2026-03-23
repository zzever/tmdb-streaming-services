import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getTmdbImage } from "@/lib/utils";
import { MonitorPlay, Star, Heart } from "lucide-react";
import type { PopularTitle, SearchResult } from "@workspace/api-client-react/src/generated/api.schemas";
import { useWatchlist } from "@/context/WatchlistContext";

interface DisplayProvider {
  providerId: number;
  name: string;
  logo?: string | null;
  type: string;
  tmdbUrl?: string;
  watchUrl?: string;
  color?: string;
  short?: string;
}

interface MediaCardProps {
  media: PopularTitle | SearchResult | any;
  onClick: (media: any) => void;
  onGenreClick?: (genre: string) => void;
}

export function MediaCard({ media, onClick, onGenreClick }: MediaCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const { toggle, isInWatchlist } = useWatchlist();
  const inList = media.id ? isInWatchlist(media.id) : false;
  const [posterLoaded, setPosterLoaded] = useState(false);
  const [backdropLoaded, setBackdropLoaded] = useState(false);

  const isPopularTitle = "providers" in media;
  const providers: DisplayProvider[] = isPopularTitle ? (media as PopularTitle).providers ?? [] : [];
  const displayProviders = providers
    .filter((p) => p.type === "flatrate" || p.type === "free" || p.type === "ads")
    .slice(0, 3);
  const extraCount =
    providers.filter((p) => p.type === "flatrate" || p.type === "free" || p.type === "ads").length -
    displayProviders.length;

  const backdropSrc = media.backdrop ? getTmdbImage(media.backdrop, "w780") : null;
  const posterSrc   = media.poster   ? getTmdbImage(media.poster, "w500")   : null;

  const showBackdrop = isHovered && !!backdropSrc;

  return (
    <motion.div
      whileHover={{ y: -5, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 380, damping: 28 }}
      onClick={() => onClick(media)}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="group relative flex flex-col cursor-pointer rounded-2xl glow-card hover:glow-card-hover transition-shadow duration-300"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
    >
      {/* ── Image area ── */}
      <div className="relative w-full overflow-hidden rounded-t-2xl bg-[rgba(255,255,255,0.04)]" style={{ minHeight: 80 }}>

        {/* Poster (base layer) */}
        {posterSrc ? (
          <>
            {!posterLoaded && <div className="absolute inset-0 shimmer" />}
            <img
              src={posterSrc}
              alt={media.title}
              onLoad={() => setPosterLoaded(true)}
              className={`w-full h-auto block transition-opacity duration-500 ${
                posterLoaded ? (showBackdrop ? "opacity-0" : "opacity-100") : "opacity-0"
              }`}
              loading="lazy"
            />
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white/20 gap-3">
            <MonitorPlay className="w-10 h-10 opacity-40" />
            <span className="text-xs font-medium text-center px-4 leading-relaxed opacity-60">{media.title}</span>
          </div>
        )}

        {/* Backdrop (hover layer — crossfade) */}
        {backdropSrc && (
          <>
            <img
              src={backdropSrc}
              alt=""
              aria-hidden
              onLoad={() => setBackdropLoaded(true)}
              className="absolute inset-0 w-full h-full object-cover object-center opacity-0 pointer-events-none"
              loading="lazy"
              style={{ display: "none" }}
            />
            <AnimatePresence>
              {showBackdrop && backdropLoaded && (
                <motion.div
                  key="backdrop"
                  initial={{ opacity: 0, scale: 1.04 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.04 }}
                  transition={{ duration: 0.45, ease: "easeInOut" }}
                  className="absolute inset-0"
                >
                  <img
                    src={backdropSrc}
                    alt=""
                    aria-hidden
                    className="w-full h-full object-cover object-center"
                  />
                  {/* Gradient overlay for readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/10" />
                  {/* Overview text */}
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="text-[11px] text-white/85 line-clamp-4 leading-relaxed">
                      {media.overview || "Sin descripción disponible."}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}

        {/* Hover synopsis (when no backdrop) */}
        {!backdropSrc && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
            <p className="text-[11px] text-white/80 line-clamp-5 leading-relaxed">
              {media.overview || "Sin descripción disponible."}
            </p>
          </div>
        )}

        {/* Top gradient for badges */}
        <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/50 to-transparent pointer-events-none z-10" />

        {/* Watchlist heart button */}
        {media.id && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggle({
                id: media.id,
                type: media.mediaType === "tv" ? "series" : (media.mediaType ?? "movie"),
                title: media.title ?? media.name ?? "",
                poster: media.poster ?? null,
                backdrop: media.backdrop ?? null,
                rating: media.rating ?? null,
                year: media.year ?? null,
                genres: media.genres ?? null,
                overview: media.overview ?? null,
              });
            }}
            className={`absolute bottom-2 right-2 z-20 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 ${
              inList
                ? "opacity-100 bg-red-500/80 border-red-400/50"
                : "opacity-0 group-hover:opacity-100 bg-black/60 border-white/10"
            } border backdrop-blur-sm hover:scale-110`}
            title={inList ? "Quitar de favoritos" : "Añadir a favoritos"}
          >
            <Heart className={`w-3.5 h-3.5 ${inList ? "fill-white text-white" : "text-white/70"}`} />
          </button>
        )}

        {/* Rating badge */}
        {media.rating && media.rating > 0 && (
          <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded-lg border border-white/10 z-10">
            <Star className="w-2.5 h-2.5 text-yellow-400 fill-yellow-400" />
            <span className="text-[11px] font-bold text-white/90">{media.rating.toFixed(1)}</span>
          </div>
        )}

        {/* Provider logos */}
        {displayProviders.length > 0 && (
          <div className="absolute top-2 left-2 flex gap-1 z-10">
            {displayProviders.map((p, i) =>
              p.logo ? (
                <img
                  key={`${p.providerId}-${i}`}
                  src={p.logo}
                  alt={p.name}
                  title={p.name}
                  className="w-7 h-7 rounded-lg border border-white/15 shadow-lg object-cover bg-black"
                />
              ) : (
                <div
                  key={`${p.providerId}-${i}`}
                  className="w-7 h-7 rounded-lg border border-white/15 flex items-center justify-center shadow-lg"
                  style={{ background: p.color ?? "rgba(0,0,0,0.6)" }}
                  title={p.name}
                >
                  <span className="text-[9px] font-black text-white leading-none" style={{ letterSpacing: "-0.02em" }}>
                    {p.short ?? p.name.slice(0, 3).toUpperCase()}
                  </span>
                </div>
              )
            )}
            {extraCount > 0 && (
              <div className="w-7 h-7 rounded-lg border border-white/15 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                <span className="text-[9px] font-bold text-white/80">+{extraCount}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Info bar — always fully visible ── */}
      <div
        className="px-3 pt-2 pb-2.5 flex flex-col gap-1"
        style={{
          background: "rgba(255,255,255,0.02)",
          borderTop: "1px solid rgba(255,255,255,0.05)",
          borderRadius: "0 0 16px 16px",
        }}
      >
        <h3 className="font-display font-semibold text-white/90 text-sm leading-tight truncate group-hover:text-white transition-colors">
          {media.title}
        </h3>
        <div className="flex items-center gap-1 overflow-hidden">
          {(media.genres ?? []).slice(0, 2).map((g: string) => (
            onGenreClick ? (
              <button
                key={g}
                onClick={(e) => { e.stopPropagation(); onGenreClick(g); }}
                className="shrink-0 text-[9px] px-1.5 py-0.5 rounded-md font-medium text-white/40 hover:text-white/80 hover:bg-white/10 whitespace-nowrap transition-colors cursor-pointer"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.07)" }}
              >
                {g}
              </button>
            ) : (
              <span
                key={g}
                className="shrink-0 text-[9px] px-1.5 py-0.5 rounded-md font-medium text-white/40 whitespace-nowrap"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.07)" }}
              >
                {g}
              </span>
            )
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-white/30 font-medium shrink-0">{media.year || "—"}</span>
        </div>
      </div>

      {/* Preload backdrop off-screen */}
      {backdropSrc && !backdropLoaded && (
        <img
          src={backdropSrc}
          alt=""
          aria-hidden
          className="sr-only"
          onLoad={() => setBackdropLoaded(true)}
          loading="lazy"
        />
      )}
    </motion.div>
  );
}
