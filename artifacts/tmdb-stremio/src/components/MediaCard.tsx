import React, { useState } from "react";
import { motion } from "framer-motion";
import { getTmdbImage } from "@/lib/utils";
import { MonitorPlay, Star } from "lucide-react";
import type { PopularTitle, SearchResult } from "@workspace/api-client-react/src/generated/api.schemas";

interface MediaCardProps {
  media: PopularTitle | SearchResult;
  onClick: (media: PopularTitle | SearchResult) => void;
}

export function MediaCard({ media, onClick }: MediaCardProps) {
  const [posterLoaded, setPosterLoaded] = useState(false);
  const [backdropLoaded, setBackdropLoaded] = useState(false);

  const isPopularTitle = "providers" in media;
  const providers = isPopularTitle ? (media as PopularTitle).providers ?? [] : [];
  const displayProviders = providers
    .filter((p) => p.type === "flatrate" || p.type === "free" || p.type === "ads")
    .slice(0, 3);
  const extraCount =
    providers.filter((p) => p.type === "flatrate" || p.type === "free" || p.type === "ads").length -
    displayProviders.length;

  const backdropSrc = media.backdrop ? getTmdbImage(media.backdrop, "w780") : null;
  const posterSrc   = media.poster   ? getTmdbImage(media.poster, "w500")   : null;

  return (
    <motion.div
      whileHover={{ y: -5, scale: 1.015 }}
      transition={{ type: "spring", stiffness: 380, damping: 28 }}
      onClick={() => onClick(media)}
      className="group relative flex flex-col cursor-pointer rounded-2xl glow-card hover:glow-card-hover transition-shadow duration-300"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
    >
      {/* ── Poster area ── */}
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-t-2xl bg-[rgba(255,255,255,0.04)]">
        {posterSrc ? (
          <>
            {!posterLoaded && <div className="absolute inset-0 shimmer" />}
            <img
              src={posterSrc}
              alt={media.title}
              onLoad={() => setPosterLoaded(true)}
              className={`w-full h-full object-cover transition-all duration-700 group-hover:scale-105 ${posterLoaded ? "opacity-100" : "opacity-0"}`}
              loading="lazy"
            />
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white/20 gap-3">
            <MonitorPlay className="w-10 h-10 opacity-40" />
            <span className="text-xs font-medium text-center px-4 leading-relaxed opacity-60">{media.title}</span>
          </div>
        )}

        {/* Hover overlay: synopsis */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
          <p className="text-[11px] text-white/80 line-clamp-5 leading-relaxed">
            {media.overview || "Sin descripción disponible."}
          </p>
        </div>

        {/* Top gradient for badges */}
        <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/50 to-transparent pointer-events-none" />

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
                  className="w-7 h-7 rounded-lg border border-white/15 bg-black/60 backdrop-blur-sm flex items-center justify-center"
                  title={p.name}
                >
                  <span className="text-[8px] font-bold text-white">{p.name.slice(0, 3).toUpperCase()}</span>
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

      {/* ── Backdrop strip (second fanart) ── */}
      <div className="relative w-full overflow-hidden bg-[rgba(255,255,255,0.02)]" style={{ aspectRatio: "16/5" }}>
        {backdropSrc ? (
          <>
            {!backdropLoaded && <div className="absolute inset-0 shimmer" />}
            <img
              src={backdropSrc}
              alt=""
              aria-hidden
              onLoad={() => setBackdropLoaded(true)}
              className={`w-full h-full object-cover object-center transition-all duration-700 group-hover:scale-105 group-hover:brightness-110 ${backdropLoaded ? "opacity-100" : "opacity-0"}`}
              loading="lazy"
            />
          </>
        ) : (
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(135deg, rgba(229,9,20,0.06) 0%, rgba(99,102,241,0.06) 100%)",
            }}
          />
        )}
        {/* Fade out edges */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0c0d16]/80 to-transparent pointer-events-none" />
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

        {/* Genres row — max 2 chips, never wraps */}
        <div className="flex items-center gap-1 overflow-hidden">
          {(media.genres ?? []).slice(0, 2).map((g) => (
            <span
              key={g}
              className="shrink-0 text-[9px] px-1.5 py-0.5 rounded-md font-medium text-white/40 whitespace-nowrap"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              {g}
            </span>
          ))}
        </div>

        {/* Year + type — always on same line */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-white/30 font-medium shrink-0">{media.year || "—"}</span>
          <span className="text-[9px] uppercase tracking-widest font-semibold text-white/20 bg-white/5 px-1.5 py-0.5 rounded-md border border-white/5 shrink-0">
            {media.type === "series" ? "Serie" : "Film"}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
