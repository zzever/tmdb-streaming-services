import React, { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { useGetPersonFilmography } from "@/hooks/use-media-api";
import { Loader2, Star, Film, Tv2, User, MapPin, Calendar } from "lucide-react";
import { motion } from "framer-motion";
import { ProviderModal } from "./ProviderModal";

interface ActorModalProps {
  isOpen: boolean;
  onClose: () => void;
  actorName: string;
  country?: string;
}

interface CreditItem {
  tmdbId: number;
  title: string;
  poster: string | null;
  rating: number | null;
  year: number | null;
  genres: string[];
  character: string | null;
  type: "movie" | "series";
}

export function ActorModal({ isOpen, onClose, actorName, country }: ActorModalProps) {
  const [selectedTitle, setSelectedTitle] = useState<CreditItem | null>(null);

  const { data, isLoading } = useGetPersonFilmography(actorName, {
    query: { enabled: isOpen && !!actorName },
  });

  return (
    <>
      <Dialog isOpen={isOpen} onClose={onClose}>
        <div className="p-6 sm:p-8">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6 mt-2">
            {isLoading ? (
              <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                <Loader2 className="w-5 h-5 text-white/30 animate-spin" />
              </div>
            ) : data?.photo ? (
              <img
                src={data.photo}
                alt={actorName}
                className="w-16 h-16 rounded-full object-cover border border-white/15 shadow-lg shrink-0"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                <User className="w-6 h-6 text-white/25" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-display font-bold text-white/90 truncate">{actorName}</h2>
              {data && !isLoading && (
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md uppercase tracking-widest shrink-0"
                    style={{
                      background: data.role === "director" ? "rgba(245,158,11,0.12)" : "rgba(99,102,241,0.1)",
                      color: data.role === "director" ? "rgba(252,211,77,0.9)" : "rgba(165,180,252,0.9)",
                      border: data.role === "director" ? "1px solid rgba(245,158,11,0.25)" : "1px solid rgba(99,102,241,0.2)",
                    }}>
                    {data.role === "director" ? "Director" : "Actor"}
                  </span>
                  {(data as any).birthday && (
                    <span className="flex items-center gap-1 text-[11px] text-white/35">
                      <Calendar className="w-3 h-3" />
                      {(data as any).birthday}
                    </span>
                  )}
                  {(data as any).birthPlace && (
                    <span className="flex items-center gap-1 text-[11px] text-white/35 truncate max-w-[160px]">
                      <MapPin className="w-3 h-3 shrink-0" />
                      {(data as any).birthPlace}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
          ) : !data || data.credits.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <User className="w-10 h-10 text-white/15 mb-3" />
              <p className="text-white/40 text-sm">No se encontraron títulos para este actor.</p>
            </div>
          ) : (
            <>
              {(data as any).biography && (
                <div className="mb-5 pb-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <h3 className="text-xs uppercase tracking-widest text-white/25 font-semibold mb-2">Biografía</h3>
                  <p className="text-[12px] text-white/50 leading-relaxed line-clamp-5 hover:line-clamp-none transition-all cursor-default">
                    {(data as any).biography}
                  </p>
                </div>
              )}
              <h3 className="text-xs uppercase tracking-widest text-white/25 font-semibold mb-4">
                Filmografía · {data.credits.length} títulos
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {data.credits.map((credit, i) => (
                  <motion.div
                    key={`${credit.tmdbId}-${i}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.025, duration: 0.25 }}
                    whileHover={{ y: -3, scale: 1.02 }}
                    onClick={() => setSelectedTitle(credit)}
                    className="rounded-xl overflow-hidden cursor-pointer group"
                    style={{
                      border: "1px solid rgba(255,255,255,0.07)",
                      background: "rgba(255,255,255,0.03)",
                    }}
                  >
                    <div className="aspect-[2/3] bg-white/5 relative overflow-hidden">
                      {credit.poster ? (
                        <img
                          src={credit.poster}
                          alt={credit.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          {credit.type === "series" ? (
                            <Tv2 className="w-8 h-8 text-white/15" />
                          ) : (
                            <Film className="w-8 h-8 text-white/15" />
                          )}
                        </div>
                      )}

                      {credit.rating && credit.rating > 0 && (
                        <div className="absolute top-1.5 right-1.5 bg-black/70 backdrop-blur-sm px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                          <Star className="w-2.5 h-2.5 text-yellow-400 fill-yellow-400" />
                          <span className="text-[10px] font-bold text-yellow-400">
                            {credit.rating.toFixed(1)}
                          </span>
                        </div>
                      )}

                      <div className="absolute top-1.5 left-1.5">
                        <span
                          className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-md"
                          style={{
                            background: credit.type === "series" ? "rgba(99,102,241,0.7)" : "rgba(229,9,20,0.7)",
                            color: "rgba(255,255,255,0.9)",
                          }}
                        >
                          {credit.type === "series" ? "Serie" : "Película"}
                        </span>
                      </div>

                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors duration-200" />
                    </div>

                    <div className="p-2">
                      <p className="text-[11px] font-semibold text-white/75 group-hover:text-white line-clamp-2 leading-tight transition-colors">
                        {credit.title}
                      </p>
                      {credit.character && (
                        <p className="text-[9px] text-white/30 mt-0.5 line-clamp-1 italic">
                          {credit.character}
                        </p>
                      )}
                      <p className="text-[9px] text-white/25 mt-0.5">{credit.year || ""}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </>
          )}
        </div>
      </Dialog>

      {selectedTitle && (
        <ProviderModal
          isOpen={!!selectedTitle}
          onClose={() => setSelectedTitle(null)}
          tmdbId={selectedTitle.tmdbId}
          imdbId={null}
          type={selectedTitle.type}
          title={selectedTitle.title}
          poster={selectedTitle.poster}
          rating={selectedTitle.rating}
          year={selectedTitle.year}
          genres={selectedTitle.genres}
          country={country}
        />
      )}
    </>
  );
}
