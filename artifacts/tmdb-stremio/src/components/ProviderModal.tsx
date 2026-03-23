import React, { useState } from "react";
import { Dialog } from "./ui/dialog";
import { useGetStreamingProviders, useGetTitleDetails, useKitsuSearch, useGetProvidersByTmdbId } from "@/hooks/use-media-api";
import { getTmdbImage } from "@/lib/utils";
import { WATCH_LOCALES } from "@/lib/locales";
import {
  Loader2, MonitorPlay, AlertCircle, ExternalLink,
  Clock, Star, Film, Globe, Users, Play, ChevronRight, Search, Music2,
} from "lucide-react";
import type { StreamingProvider, SimilarTitle } from "@workspace/api-client-react/src/generated/api.schemas";
import { motion } from "framer-motion";
import { ActorModal } from "./ActorModal";

interface ProviderModalProps {
  isOpen: boolean;
  onClose: () => void;
  tmdbId?: number | null;
  imdbId?: string | null;
  type: "movie" | "series";
  title: string;
  poster?: string | null;
  backdrop?: string | null;
  overview?: string | null;
  rating?: number | null;
  year?: number | null;
  genres?: string[] | null;
  country?: string;
  initialProviders?: StreamingProvider[];
}

const TYPE_CONFIG: Record<string, { label: string; color: string; border: string; bg: string }> = {
  flatrate: { label: "Suscripción", color: "text-blue-400",   border: "border-blue-500/30",   bg: "bg-blue-500/8" },
  free:     { label: "Gratis",      color: "text-emerald-400", border: "border-emerald-500/30", bg: "bg-emerald-500/8" },
};
const TYPE_ORDER = ["flatrate", "free"];
const ALLOWED_TYPES = new Set(TYPE_ORDER);

const MUSIC_GENRE_NAMES = ["música", "music", "musical", "musique"];
function isMusicContent(genres?: string[] | null): boolean {
  if (!genres) return false;
  return genres.some((g) => MUSIC_GENRE_NAMES.includes(g.toLowerCase()));
}

const ANIME_GENRE_NAMES = ["animación", "animation", "animazione", "animation", "anime"];
function isAnimeContent(genres?: string[] | null): boolean {
  if (!genres) return false;
  return genres.some((g) => ANIME_GENRE_NAMES.includes(g.toLowerCase()));
}

function fmt(n: number) {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000)     return `$${(n / 1_000_000).toFixed(0)}M`;
  return `$${n.toLocaleString()}`;
}

function StatPill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-white/60"
      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
    >
      {icon}
      <span>{label}</span>
    </div>
  );
}

function ProviderChip({ provider }: { provider: StreamingProvider }) {
  const config = TYPE_CONFIG[provider.type] ?? { label: provider.type, color: "text-white/50", border: "border-white/10", bg: "bg-white/5" };
  return (
    <motion.a
      href={provider.watchUrl}
      target="_blank"
      rel="noopener noreferrer"
      whileHover={{ scale: 1.06, y: -2 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
      className={`group relative flex flex-col items-center gap-2 p-3.5 rounded-2xl border ${config.border} ${config.bg} backdrop-blur-sm hover:brightness-125 transition-all duration-200 cursor-pointer w-[88px]`}
    >
      {provider.logo ? (
        <img src={provider.logo} alt={provider.name} className="w-12 h-12 rounded-xl object-cover shadow-md" />
      ) : (
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${config.border} ${config.bg}`}>
          <span className="text-sm font-bold text-white">{provider.name.slice(0, 2).toUpperCase()}</span>
        </div>
      )}
      <span className="text-[10px] font-semibold text-white/80 text-center leading-tight line-clamp-2 w-full">{provider.name}</span>
      <ExternalLink className={`absolute top-2 right-2 w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity ${config.color}`} />
    </motion.a>
  );
}

export function ProviderModal({
  isOpen, onClose,
  tmdbId, imdbId, type, title,
  poster, backdrop, overview, rating, year, genres,
  country, initialProviders,
}: ProviderModalProps) {
  const [trailerOpen, setTrailerOpen] = useState(false);
  const [trailerLoaded, setTrailerLoaded] = useState(false);
  const [selectedSimilar, setSelectedSimilar] = useState<SimilarTitle | null>(null);
  const [selectedActorName, setSelectedActorName] = useState<string | null>(null);

  const noInitial = !initialProviders || initialProviders.length === 0;
  const shouldFetchByImdb  = isOpen && !!imdbId  && noInitial;
  const shouldFetchByTmdb  = isOpen && !imdbId   && !!tmdbId && noInitial;

  const { data: providersData,      isLoading: isLoadingByImdb,  isError: isErrorByImdb  } = useGetStreamingProviders(
    { imdbId: imdbId!, type, country },
    { query: { enabled: shouldFetchByImdb, retry: 1 } }
  );
  const { data: providersByTmdbData, isLoading: isLoadingByTmdb, isError: isErrorByTmdb } = useGetProvidersByTmdbId(
    { tmdbId: tmdbId!, type: type as "movie" | "series", country },
    { query: { enabled: shouldFetchByTmdb } }
  );

  const isLoadingProviders = isLoadingByImdb || isLoadingByTmdb;
  const isErrorProviders   = isErrorByImdb   || isErrorByTmdb;

  const { data: details, isLoading: isLoadingDetails } = useGetTitleDetails(
    { tmdbId: tmdbId!, type },
    { query: { enabled: isOpen && !!tmdbId } }
  );

  const allProviders = initialProviders?.length
    ? initialProviders
    : (providersData?.providers ?? providersByTmdbData?.providers ?? []);
  const providers = allProviders.filter((p) => ALLOWED_TYPES.has(p.type));
  const localeInfo = WATCH_LOCALES.find((l) => l.code === (country ?? "ES")) ?? WATCH_LOCALES.find((l) => l.code === "ES")!;
  const isMusic = isMusicContent(genres);
  const isAnime = isAnimeContent(genres);
  const ytMusicUrl = `https://music.youtube.com/search?q=${encodeURIComponent(title)}`;

  const { data: kitsuResults, isLoading: isLoadingKitsu } = useKitsuSearch(title, isOpen && isAnime && !!title);
  const kitsuMatch = kitsuResults?.[0] ?? null;

  const groupedProviders = TYPE_ORDER.reduce((acc, t) => {
    const group = providers.filter((p) => p.type === t);
    if (group.length > 0) acc[t] = group;
    return acc;
  }, {} as Record<string, StreamingProvider[]>);

  const stremioSearchUrl = `https://web.strem.io/#/search?search=${encodeURIComponent(title)}`;

  const heroImg = backdrop || (poster ? getTmdbImage(poster, "original") : null);

  const nestedSimilarModal = selectedSimilar ? (
    <ProviderModal
      isOpen={true}
      onClose={() => setSelectedSimilar(null)}
      tmdbId={selectedSimilar.tmdbId}
      imdbId={null}
      type={type}
      title={selectedSimilar.title}
      poster={selectedSimilar.poster}
      backdrop={selectedSimilar.backdrop}
      rating={selectedSimilar.rating}
      year={selectedSimilar.year}
      genres={selectedSimilar.genres}
      country={country}
    />
  ) : null;

  return (
    <>
    <Dialog isOpen={isOpen} onClose={onClose}>
      {/* Trailer overlay */}
      {trailerOpen && details?.trailerKey && (
        <div
          className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setTrailerOpen(false)}
        >
          <div className="w-full max-w-3xl aspect-video rounded-2xl overflow-hidden shadow-2xl">
            <iframe
              src={`https://www.youtube.com/embed/${details.trailerKey}?autoplay=1`}
              allow="autoplay; fullscreen"
              className="w-full h-full"
            />
          </div>
        </div>
      )}

      <div className="relative">
        {/* Hero backdrop */}
        <div className="absolute inset-0 h-80 w-full overflow-hidden pointer-events-none">
          {heroImg && (
            <img src={heroImg} alt="" className="w-full h-full object-cover opacity-35"
              style={{ objectPosition: "center 20%" }} />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0c0d16] via-[#0c0d16]/75 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0c0d16]/50 via-transparent to-[#0c0d16]/50" />
        </div>

        <div className="relative z-10 p-5 sm:p-8 space-y-6">

          {/* ── Header row ── */}
          <div className="flex flex-col sm:flex-row gap-6">
            {/* Poster */}
            <div className="shrink-0 mx-auto sm:mx-0 w-36 sm:w-44 rounded-2xl overflow-hidden shadow-2xl shadow-black/70 border border-white/10 relative self-start">
              {poster ? (
                <img src={getTmdbImage(poster, "w500") || ""} alt={title} className="w-full h-auto object-cover" />
              ) : (
                <div className="w-full aspect-[2/3] bg-white/5 flex items-center justify-center">
                  <MonitorPlay className="w-10 h-10 text-white/20" />
                </div>
              )}
              {/* Trailer button overlay */}
              {details?.trailerKey && (
                <button
                  onClick={() => setTrailerOpen(true)}
                  className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity"
                >
                  <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
                    <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                  </div>
                </button>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 pt-1">
              {/* Badges */}
              <div className="flex flex-wrap items-center gap-1.5 mb-2">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-primary/20 text-primary border border-primary/30">
                  {type === "movie" ? "Película" : "Serie"}
                </span>
                {year && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium text-white/50 border border-white/10 bg-white/5">{year}</span>
                )}
                {rating && rating > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium text-yellow-400 border border-yellow-400/20 bg-yellow-400/10 flex items-center gap-1">
                    <Star className="w-3 h-3 fill-yellow-400" />{rating.toFixed(1)}
                    {details?.voteCount && <span className="text-yellow-400/50 text-[10px]">({(details.voteCount / 1000).toFixed(0)}K)</span>}
                  </span>
                )}
                {details?.status && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium text-white/40 border border-white/10 bg-white/5">{details.status}</span>
                )}
              </div>

              {/* Title */}
              <h2 className="text-2xl sm:text-3xl font-display font-bold text-white leading-tight mb-1">{title}</h2>

              {/* Tagline */}
              {details?.tagline && (
                <p className="text-sm italic text-white/35 mb-3">"{details.tagline}"</p>
              )}

              {/* Genres */}
              {genres && genres.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {genres.map((g) => (
                    <span key={g} className="px-2.5 py-0.5 rounded-lg text-[11px] font-medium text-white/50"
                      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)" }}>
                      {g}
                    </span>
                  ))}
                </div>
              )}

              {/* Overview */}
              {overview && (
                <p className="text-white/45 text-sm leading-relaxed mb-4">{overview}</p>
              )}

              {/* Stat pills */}
              {!isLoadingDetails && (
                <div className="flex flex-wrap gap-2">
                  {details?.runtime && (
                    <StatPill icon={<Clock className="w-3.5 h-3.5" />} label={`${details.runtime} min`} />
                  )}
                  {details?.numberOfSeasons && (
                    <StatPill icon={<Film className="w-3.5 h-3.5" />} label={`${details.numberOfSeasons} temporadas`} />
                  )}
                  {details?.director && (
                    <button
                      onClick={() => setSelectedActorName(details.director!)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-white/60 hover:text-white/90 transition-all duration-200 group"
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)" }}
                    >
                      <Users className="w-3.5 h-3.5 text-white/35 group-hover:text-white/60" />
                      <span className="text-white/30 group-hover:text-white/50">Dir.</span>
                      <span className="font-semibold text-white/70 group-hover:text-white">{details.director}</span>
                    </button>
                  )}
                  {details?.creators && details.creators.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap">
                      {details.creators.map((creator) => (
                        <button
                          key={creator}
                          onClick={() => setSelectedActorName(creator)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-white/60 hover:text-white/90 transition-all duration-200 group"
                          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)" }}
                        >
                          <Users className="w-3.5 h-3.5 text-white/35 group-hover:text-white/60" />
                          <span className="text-white/30">Creado por</span>
                          <span className="font-semibold text-white/70 group-hover:text-white">{creator}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {details?.budget && (
                    <StatPill icon={<Film className="w-3.5 h-3.5" />} label={`Presupuesto ${fmt(details.budget)}`} />
                  )}
                  {details?.revenue && (
                    <StatPill icon={<Globe className="w-3.5 h-3.5" />} label={`Recaudación ${fmt(details.revenue)}`} />
                  )}
                  {details?.spokenLanguages && details.spokenLanguages.length > 0 && (
                    <StatPill icon={<Globe className="w-3.5 h-3.5" />} label={details.spokenLanguages.slice(0, 2).join(", ")} />
                  )}
                </div>
              )}

              {/* Action buttons */}
              <div className="mt-4 flex flex-wrap gap-2">
                {details?.trailerKey && (
                  <button
                    onClick={() => setTrailerOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:brightness-110"
                    style={{ background: "rgba(229,9,20,0.15)", border: "1px solid rgba(229,9,20,0.3)" }}
                  >
                    <Play className="w-4 h-4 fill-primary text-primary" />
                    Ver tráiler
                  </button>
                )}
                <a
                  href={stremioSearchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white/70 hover:text-white transition-all duration-200 hover:brightness-110"
                  style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.25)" }}
                >
                  <Search className="w-4 h-4 text-indigo-400" />
                  Buscar en Stremio
                </a>
              </div>
            </div>
          </div>

          {/* ── Cast ── */}
          {details?.cast && details.cast.length > 0 && (
            <div>
              <h3 className="text-xs uppercase tracking-widest text-white/30 font-semibold mb-3 flex items-center gap-2">
                <Users className="w-3.5 h-3.5" /> Reparto
              </h3>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {details.cast.map((actor, i) => (
                  <button
                    key={`${actor.name}-${i}`}
                    onClick={() => setSelectedActorName(actor.name)}
                    className="flex-shrink-0 flex flex-col items-center gap-1.5 w-16 group cursor-pointer"
                  >
                    <div className="w-14 h-14 rounded-full overflow-hidden border border-white/10 shadow-lg bg-white/5 group-hover:border-primary/50 group-hover:scale-105 transition-all duration-200">
                      {actor.photo ? (
                        <img src={actor.photo} alt={actor.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white/20 text-lg font-bold">
                          {actor.name[0]}
                        </div>
                      )}
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] font-semibold text-white/75 group-hover:text-white leading-tight line-clamp-2 transition-colors">{actor.name}</p>
                      <p className="text-[9px] text-white/30 leading-tight line-clamp-1 mt-0.5">{actor.character}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Providers ── */}
          <div>
            <h3 className="text-xs font-semibold text-white/30 uppercase tracking-widest mb-4 flex items-center gap-2">
              <MonitorPlay className="w-3.5 h-3.5" />
              {localeInfo.flag} Disponible en {localeInfo.name}
            </h3>

            {/* YouTube Music featured block — shown first for music content */}
            {isMusic && (
              <motion.a
                href={ytMusicUrl}
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 380, damping: 22 }}
                className="flex items-center gap-4 w-full p-4 rounded-2xl mb-5 cursor-pointer group"
                style={{ background: "linear-gradient(135deg, rgba(255,0,0,0.12) 0%, rgba(180,0,0,0.08) 100%)", border: "1px solid rgba(255,80,80,0.25)" }}
              >
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg"
                  style={{ background: "linear-gradient(135deg, #ff0000 0%, #cc0000 100%)" }}>
                  <Music2 className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white leading-tight">YouTube Music</p>
                  <p className="text-xs text-white/45 mt-0.5">Buscar "{title}" en YouTube Music</p>
                </div>
                <ExternalLink className="w-4 h-4 text-white/30 group-hover:text-white/70 transition-colors shrink-0" />
              </motion.a>
            )}

            {/* Kitsu anime metadata block — shown for anime content */}
            {isAnime && (
              <div className="rounded-2xl mb-5 overflow-hidden"
                style={{ background: "linear-gradient(135deg, rgba(255,107,0,0.08) 0%, rgba(180,60,0,0.05) 100%)", border: "1px solid rgba(255,107,0,0.18)" }}>
                <div className="flex items-center gap-2 px-4 py-2.5"
                  style={{ borderBottom: "1px solid rgba(255,107,0,0.10)" }}>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-orange-400/70">Kitsu · Datos de Anime</span>
                </div>
                {isLoadingKitsu ? (
                  <div className="flex items-center gap-2 px-4 py-3">
                    <Loader2 className="w-4 h-4 text-orange-400/50 animate-spin" />
                    <span className="text-xs text-white/30">Buscando en Kitsu...</span>
                  </div>
                ) : kitsuMatch ? (
                  <div className="p-4">
                    <div className="flex gap-3">
                      {kitsuMatch.poster && (
                        <img src={kitsuMatch.poster} alt={kitsuMatch.title}
                          className="w-12 h-16 rounded-xl object-cover shrink-0"
                          style={{ border: "1px solid rgba(255,255,255,0.08)" }} />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white leading-tight truncate">{kitsuMatch.title}</p>
                        {kitsuMatch.titleJa && (
                          <p className="text-[11px] text-white/35 mt-0.5 truncate">{kitsuMatch.titleJa}</p>
                        )}
                        <div className="flex flex-wrap gap-2 mt-2">
                          {kitsuMatch.rating !== null && (
                            <span className="flex items-center gap-1 text-[10px] text-white/50">
                              <Star className="w-3 h-3 text-yellow-400/70" />{kitsuMatch.rating.toFixed(1)}/10
                            </span>
                          )}
                          {kitsuMatch.episodeCount !== null && (
                            <span className="text-[10px] text-white/40">{kitsuMatch.episodeCount} eps</span>
                          )}
                          {kitsuMatch.subtype && (
                            <span className="text-[10px] text-orange-400/60 font-semibold uppercase">{kitsuMatch.subtype}</span>
                          )}
                          {kitsuMatch.status && (
                            <span className={`text-[10px] font-medium ${kitsuMatch.status === "finished" ? "text-green-400/60" : "text-blue-400/60"}`}>
                              {kitsuMatch.status === "finished" ? "Finalizado" : kitsuMatch.status === "current" ? "En emisión" : kitsuMatch.status}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <motion.a
                      href={kitsuMatch.kitsuUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex items-center justify-between w-full mt-3 px-3 py-2 rounded-xl text-xs font-semibold text-orange-300/80 hover:text-orange-300 transition-colors group"
                      style={{ background: "rgba(255,107,0,0.08)", border: "1px solid rgba(255,107,0,0.15)" }}
                    >
                      <span>Ver en Kitsu.io</span>
                      <ExternalLink className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
                    </motion.a>
                  </div>
                ) : (
                  <div className="px-4 py-3">
                    <p className="text-xs text-white/25">No se encontraron datos en Kitsu para este título.</p>
                  </div>
                )}
              </div>
            )}

            {(isLoadingProviders && (shouldFetchByImdb || shouldFetchByTmdb)) ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
              </div>
            ) : isErrorProviders ? (
              <div className="rounded-xl p-4 flex items-center gap-3"
                style={{ background: "rgba(255,60,60,0.06)", border: "1px solid rgba(255,60,60,0.15)" }}>
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                <p className="text-red-400 text-sm">No se pudieron cargar los proveedores.</p>
              </div>
            ) : providers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center"
                style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16 }}>
                <MonitorPlay className="w-8 h-8 text-white/15 mb-2" />
                <p className="text-white/40 text-sm font-medium">No disponible en streaming</p>
                <p className="text-white/20 text-xs mt-1">No encontramos plataformas en {localeInfo.name} {localeInfo.flag}</p>
              </div>
            ) : (
              <div className="space-y-5">
                {Object.entries(groupedProviders).map(([provType, provs]) => {
                  const config = TYPE_CONFIG[provType] ?? { label: provType, color: "text-white/40", border: "border-white/10", bg: "bg-white/5" };
                  return (
                    <div key={provType}>
                      <div className="flex items-center gap-2 mb-3">
                        <span className={`text-[11px] font-bold uppercase tracking-widest ${config.color}`}>{config.label}</span>
                        <div className="flex-1 h-px" style={{ background: `rgba(255,255,255,0.06)` }} />
                      </div>
                      <div className="flex flex-wrap gap-2.5">
                        {provs.map((provider, i) => (
                          <ProviderChip key={`${provider.providerId}-${i}`} provider={provider} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Similar titles ── */}
          {details?.similar && details.similar.length > 0 && (
            <div>
              <h3 className="text-xs uppercase tracking-widest text-white/30 font-semibold mb-3 flex items-center gap-2">
                <ChevronRight className="w-3.5 h-3.5" /> Títulos similares
              </h3>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {details.similar.map((s) => (
                  <motion.div
                    key={s.tmdbId}
                    whileHover={{ y: -3, scale: 1.03 }}
                    transition={{ type: "spring", stiffness: 380, damping: 26 }}
                    onClick={() => setSelectedSimilar(s)}
                    className="flex-shrink-0 w-24 rounded-xl overflow-hidden cursor-pointer group"
                    style={{ border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.03)" }}
                  >
                    <div className="aspect-[2/3] bg-white/5 relative overflow-hidden">
                      {s.poster ? (
                        <img src={s.poster} alt={s.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <MonitorPlay className="w-6 h-6 text-white/15" />
                        </div>
                      )}
                      {s.rating && s.rating > 0 && (
                        <div className="absolute top-1 right-1 bg-black/60 backdrop-blur-sm px-1.5 py-0.5 rounded text-[9px] font-bold text-yellow-400">
                          {s.rating.toFixed(1)}
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 flex items-center justify-center">
                        <Play className="w-6 h-6 text-white opacity-0 group-hover:opacity-80 transition-opacity fill-white drop-shadow-lg" />
                      </div>
                    </div>
                    <div className="px-1.5 py-1.5">
                      <p className="text-[10px] font-semibold text-white/70 group-hover:text-white line-clamp-2 leading-tight transition-colors">{s.title}</p>
                      <p className="text-[9px] text-white/30 mt-0.5">{s.year || ""}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </Dialog>

    {/* ── Trailer overlay ── */}
    {trailerOpen && details?.trailerKey && (
      <div
        className="fixed inset-0 z-[200] flex items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.9)" }}
        onClick={() => { setTrailerOpen(false); setTrailerLoaded(false); }}
      >
        <div
          className="relative w-full max-w-3xl rounded-2xl overflow-hidden"
          style={{ aspectRatio: "16/9", border: "1px solid rgba(255,255,255,0.1)" }}
          onClick={(e) => e.stopPropagation()}
        >
          {!trailerLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-black">
              <div className="w-10 h-10 rounded-full border-2 border-white/20 border-t-white animate-spin" />
            </div>
          )}
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${details.trailerKey}?autoplay=1&rel=0&modestbranding=1`}
            className="w-full h-full"
            allow="autoplay; fullscreen"
            allowFullScreen
            onLoad={() => setTrailerLoaded(true)}
            title={`Tráiler de ${title}`}
          />
          <button
            onClick={() => { setTrailerOpen(false); setTrailerLoaded(false); }}
            className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-white/70 hover:text-white transition-colors"
            style={{ background: "rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.15)" }}
          >
            ✕
          </button>
        </div>
      </div>
    )}

    {nestedSimilarModal}

    {selectedActorName && (
      <ActorModal
        isOpen={!!selectedActorName}
        onClose={() => setSelectedActorName(null)}
        actorName={selectedActorName}
        country={country}
      />
    )}
    </>
  );
}
