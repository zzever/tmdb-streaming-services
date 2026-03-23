import React from "react";
import { Dialog } from "./ui/dialog";
import { useGetStreamingProviders } from "@/hooks/use-media-api";
import { getTmdbImage } from "@/lib/utils";
import { Loader2, MonitorPlay, AlertCircle, ExternalLink } from "lucide-react";
import type { StreamingProvider } from "@workspace/api-client-react/src/generated/api.schemas";
import { motion } from "framer-motion";

interface ProviderModalProps {
  isOpen: boolean;
  onClose: () => void;
  imdbId?: string | null;
  type: "movie" | "series";
  title: string;
  poster?: string | null;
  overview?: string | null;
  rating?: number | null;
  year?: number | null;
  initialProviders?: StreamingProvider[];
}

const TYPE_CONFIG: Record<string, { label: string; color: string; border: string; bg: string }> = {
  flatrate: {
    label: "Suscripción",
    color: "text-blue-400",
    border: "border-blue-500/40",
    bg: "bg-blue-500/10",
  },
  free: {
    label: "Gratis",
    color: "text-emerald-400",
    border: "border-emerald-500/40",
    bg: "bg-emerald-500/10",
  },
  ads: {
    label: "Con anuncios",
    color: "text-violet-400",
    border: "border-violet-500/40",
    bg: "bg-violet-500/10",
  },
  rent: {
    label: "Alquiler",
    color: "text-amber-400",
    border: "border-amber-500/40",
    bg: "bg-amber-500/10",
  },
  buy: {
    label: "Compra",
    color: "text-green-400",
    border: "border-green-500/40",
    bg: "bg-green-500/10",
  },
};

const TYPE_ORDER = ["flatrate", "free", "ads", "rent", "buy"];

function ProviderChip({ provider }: { provider: StreamingProvider }) {
  const config = TYPE_CONFIG[provider.type] ?? {
    label: provider.type,
    color: "text-muted-foreground",
    border: "border-white/10",
    bg: "bg-white/5",
  };

  return (
    <motion.a
      href={provider.tmdbUrl}
      target="_blank"
      rel="noopener noreferrer"
      whileHover={{ scale: 1.05, y: -2 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
      className={`group relative flex flex-col items-center gap-2.5 p-4 rounded-2xl border ${config.border} ${config.bg} backdrop-blur-sm hover:brightness-125 transition-all duration-200 shadow-lg shadow-black/20 cursor-pointer w-24`}
    >
      {/* Logo */}
      {provider.logo ? (
        <div className="relative">
          <img
            src={provider.logo}
            alt={provider.name}
            className="w-14 h-14 rounded-xl object-cover shadow-md"
          />
          <div className={`absolute inset-0 rounded-xl opacity-0 group-hover:opacity-30 transition-opacity ${config.bg.replace("bg-", "bg-").replace("/10", "/60")}`} />
        </div>
      ) : (
        <div className={`w-14 h-14 rounded-xl flex items-center justify-center border ${config.border} ${config.bg}`}>
          <span className="text-sm font-bold text-white">
            {provider.name.slice(0, 2).toUpperCase()}
          </span>
        </div>
      )}
      {/* Name */}
      <span className="text-[11px] font-semibold text-white/90 text-center leading-tight line-clamp-2 w-full">
        {provider.name}
      </span>
      {/* External link icon */}
      <ExternalLink className={`absolute top-2 right-2 w-3 h-3 opacity-0 group-hover:opacity-70 transition-opacity ${config.color}`} />
    </motion.a>
  );
}

export function ProviderModal({
  isOpen,
  onClose,
  imdbId,
  type,
  title,
  poster,
  overview,
  rating,
  year,
  initialProviders,
}: ProviderModalProps) {
  const shouldFetch = isOpen && !!imdbId && (!initialProviders || initialProviders.length === 0);

  const { data, isLoading, isError } = useGetStreamingProviders(
    { imdbId: imdbId!, type },
    { query: { enabled: shouldFetch, retry: 1 } }
  );

  const providers = initialProviders?.length ? initialProviders : data?.providers || [];

  const groupedProviders = TYPE_ORDER.reduce(
    (acc, t) => {
      const group = providers.filter((p) => p.type === t);
      if (group.length > 0) acc[t] = group;
      return acc;
    },
    {} as Record<string, StreamingProvider[]>
  );

  return (
    <Dialog isOpen={isOpen} onClose={onClose} className="overflow-hidden">
      <div className="relative">
        {/* Cinematic blurred poster bg */}
        <div className="absolute inset-0 h-[420px] w-full overflow-hidden pointer-events-none">
          {poster && (
            <img
              src={getTmdbImage(poster, "original") || ""}
              alt=""
              className="w-full h-full object-cover blur-3xl opacity-25 scale-110"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/85 to-transparent" />
        </div>

        <div className="relative z-10 p-6 sm:p-10">
          <div className="flex flex-col sm:flex-row gap-8">
            {/* Poster */}
            <div className="shrink-0 mx-auto sm:mx-0 w-44 sm:w-56 rounded-2xl overflow-hidden shadow-2xl shadow-black/60 border border-white/10 relative">
              {poster ? (
                <img
                  src={getTmdbImage(poster, "w500") || ""}
                  alt={title}
                  className="w-full h-auto object-cover"
                />
              ) : (
                <div className="w-full aspect-[2/3] bg-muted flex items-center justify-center">
                  <MonitorPlay className="w-12 h-12 text-muted-foreground opacity-50" />
                </div>
              )}
              {rating && (
                <div className="absolute top-3 left-3 bg-black/80 backdrop-blur-md px-2 py-1 rounded-md text-sm font-bold text-yellow-400 border border-white/10 flex items-center gap-1">
                  ⭐ {rating.toFixed(1)}
                </div>
              )}
            </div>

            {/* Details */}
            <div className="flex-1 min-w-0">
              <div className="mb-5">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-primary/20 text-primary border border-primary/30">
                    {type === "movie" ? "Película" : "Serie"}
                  </span>
                  {year && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium text-muted-foreground border border-white/10 bg-white/5">
                      {year}
                    </span>
                  )}
                </div>
                <h2 className="text-2xl sm:text-4xl font-display font-bold text-foreground mb-3 leading-tight">
                  {title}
                </h2>
                {overview && (
                  <p className="text-muted-foreground text-sm leading-relaxed max-w-2xl line-clamp-3">
                    {overview}
                  </p>
                )}
              </div>

              <div className="w-full h-px bg-white/5 my-6" />

              {/* Providers section */}
              <h3 className="text-base font-semibold text-white/70 uppercase tracking-widest mb-5 flex items-center gap-2">
                <MonitorPlay className="w-4 h-4 text-primary" />
                Disponible en España
              </h3>

              {isLoading && shouldFetch ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
              ) : isError ? (
                <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-5 flex items-center gap-3">
                  <AlertCircle className="w-6 h-6 text-destructive shrink-0" />
                  <p className="text-destructive text-sm font-medium">No se pudieron cargar los proveedores.</p>
                </div>
              ) : providers.length === 0 ? (
                <div className="bg-white/5 border border-white/10 rounded-xl p-8 flex flex-col items-center justify-center text-center">
                  <MonitorPlay className="w-10 h-10 text-muted-foreground mb-3 opacity-40" />
                  <p className="text-foreground text-base font-medium">No disponible en streaming</p>
                  <p className="text-muted-foreground text-sm mt-1">
                    No encontramos plataformas españolas con este título.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(groupedProviders).map(([provType, provs]) => {
                    const config = TYPE_CONFIG[provType] ?? { label: provType, color: "text-muted-foreground", border: "border-white/10", bg: "bg-white/5" };
                    return (
                      <div key={provType}>
                        {/* Type header */}
                        <div className="flex items-center gap-2 mb-3">
                          <span className={`text-xs font-bold uppercase tracking-widest ${config.color}`}>
                            {config.label}
                          </span>
                          <div className={`flex-1 h-px ${config.border.replace("border-", "bg-")}`} />
                        </div>
                        {/* Provider chips */}
                        <div className="flex flex-wrap gap-3">
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
          </div>
        </div>
      </div>
    </Dialog>
  );
}
