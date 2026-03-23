import React from "react";
import { Dialog } from "./ui/dialog";
import { useGetStreamingProviders } from "@/hooks/use-media-api";
import { getTmdbImage, PROVIDER_TYPES } from "@/lib/utils";
import { Loader2, MonitorPlay, ExternalLink, AlertCircle } from "lucide-react";
import type { StreamingProvider } from "@workspace/api-client-react/src/generated/api.schemas";

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
  // Only fetch if we have an imdbId and we don't have initialProviders populated
  const shouldFetch = isOpen && !!imdbId && (!initialProviders || initialProviders.length === 0);
  
  const { data, isLoading, isError } = useGetStreamingProviders(
    { imdbId: imdbId!, type },
    { query: { enabled: shouldFetch, retry: 1 } }
  );

  const providers = initialProviders?.length ? initialProviders : data?.providers || [];
  
  // Group providers by type
  const groupedProviders = providers.reduce((acc, provider) => {
    if (!acc[provider.type]) acc[provider.type] = [];
    acc[provider.type].push(provider);
    return acc;
  }, {} as Record<string, typeof providers>);

  return (
    <Dialog isOpen={isOpen} onClose={onClose} className="overflow-hidden">
      <div className="relative">
        {/* Cinematic Header Background */}
        <div className="absolute inset-0 h-[400px] sm:h-[500px] w-full overflow-hidden mask-image-bottom pointer-events-none">
          {poster && (
            <img 
              src={getTmdbImage(poster, "original") || ""} 
              alt="" 
              className="w-full h-full object-cover blur-2xl opacity-30 scale-110" 
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/80 to-transparent" />
        </div>

        <div className="relative z-10 p-6 sm:p-10">
          <div className="flex flex-col sm:flex-row gap-8">
            {/* Poster */}
            <div className="shrink-0 mx-auto sm:mx-0 w-48 sm:w-64 rounded-xl overflow-hidden shadow-2xl shadow-black/50 border border-white/10 relative">
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

            {/* Details & Providers */}
            <div className="flex-1">
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-2">
                  <span className="px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider bg-primary/20 text-primary border border-primary/30">
                    {type === 'movie' ? 'Movie' : 'Series'}
                  </span>
                  {year && <span className="text-muted-foreground font-medium">{year}</span>}
                </div>
                <h2 className="text-3xl sm:text-5xl font-display font-bold text-foreground mb-4 leading-tight">
                  {title}
                </h2>
                {overview && (
                  <p className="text-muted-foreground text-sm sm:text-base leading-relaxed max-w-2xl line-clamp-4">
                    {overview}
                  </p>
                )}
              </div>

              <div className="w-full h-px bg-white/5 my-8" />

              <h3 className="text-xl font-display font-semibold mb-6 flex items-center gap-2">
                <MonitorPlay className="w-5 h-5 text-primary" /> 
                Streaming in Spain
              </h3>

              {isLoading && shouldFetch ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
              ) : isError ? (
                <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-6 flex flex-col items-center justify-center text-center">
                  <AlertCircle className="w-8 h-8 text-destructive mb-3" />
                  <p className="text-destructive font-medium">Failed to load streaming platforms.</p>
                  <p className="text-destructive/70 text-sm mt-1">Please try again later.</p>
                </div>
              ) : !imdbId && (!initialProviders || initialProviders.length === 0) ? (
                <div className="bg-white/5 border border-white/10 rounded-xl p-6 flex flex-col items-center justify-center text-center">
                  <MonitorPlay className="w-8 h-8 text-muted-foreground mb-3" />
                  <p className="text-foreground font-medium">Missing ID</p>
                  <p className="text-muted-foreground text-sm mt-1">Cannot find streaming details for this title.</p>
                </div>
              ) : providers.length === 0 ? (
                <div className="bg-white/5 border border-white/10 rounded-xl p-8 flex flex-col items-center justify-center text-center">
                  <MonitorPlay className="w-10 h-10 text-muted-foreground mb-3 opacity-50" />
                  <p className="text-foreground text-lg font-medium">Not available to stream</p>
                  <p className="text-muted-foreground text-sm mt-1">
                    We couldn't find any Spanish streaming services offering this title.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(groupedProviders).map(([provType, provs]) => (
                    <div key={provType} className="space-y-3">
                      <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                        {PROVIDER_TYPES[provType as keyof typeof PROVIDER_TYPES] || provType}
                      </h4>
                      <div className="flex flex-wrap gap-4">
                        {provs.map((provider, i) => (
                          <a
                            key={`${provider.providerId}-${i}`}
                            href={provider.tmdbUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group flex flex-col items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-primary/50 transition-all duration-300 hover:-translate-y-1 shadow-lg shadow-black/20"
                          >
                            {provider.logo ? (
                              <img
                                src={getTmdbImage(provider.logo, "w500") || ""}
                                alt={provider.name}
                                className="w-14 h-14 rounded-xl shadow-md group-hover:shadow-primary/20 transition-all"
                              />
                            ) : (
                              <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center">
                                <span className="text-xs font-bold text-muted-foreground">{provider.name.charAt(0)}</span>
                              </div>
                            )}
                            <span className="text-xs font-medium text-foreground/80 group-hover:text-white transition-colors flex items-center gap-1">
                              {provider.name}
                            </span>
                          </a>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* CSS for masking the large bg image */}
      <style>{`
        .mask-image-bottom {
          mask-image: linear-gradient(to bottom, black 50%, transparent 100%);
          -webkit-mask-image: linear-gradient(to bottom, black 50%, transparent 100%);
        }
      `}</style>
    </Dialog>
  );
}
