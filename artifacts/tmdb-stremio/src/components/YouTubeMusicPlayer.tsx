import React, { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Music2, Search, ExternalLink, X, Loader2, Disc3, Mic2, Album } from "lucide-react";

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

type SearchMode = "song" | "artist" | "album";

const MODE_CONFIG: Record<SearchMode, { label: string; icon: React.ReactNode; suffix: string; placeholder: string }> = {
  song:   { label: "Canción",   icon: <Music2 className="w-3.5 h-3.5" />,  suffix: "",            placeholder: "Nombre de la canción..." },
  artist: { label: "Artista",   icon: <Mic2 className="w-3.5 h-3.5" />,    suffix: " music",      placeholder: "Nombre del artista..." },
  album:  { label: "Álbum",     icon: <Album className="w-3.5 h-3.5" />,   suffix: " full album", placeholder: "Título del álbum..." },
};

function loadYouTubeAPI(): Promise<void> {
  if (window.YT && window.YT.Player) return Promise.resolve();
  return new Promise((resolve) => {
    if (document.getElementById("yt-iframe-api")) {
      window.onYouTubeIframeAPIReady = resolve;
      return;
    }
    window.onYouTubeIframeAPIReady = resolve;
    const tag = document.createElement("script");
    tag.id = "yt-iframe-api";
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
  });
}

function useDebounce<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

interface YouTubeMusicPlayerProps {
  initialQuery?: string;
}

export function YouTubeMusicPlayer({ initialQuery = "" }: YouTubeMusicPlayerProps) {
  const [query, setQuery] = useState(initialQuery);
  const [submitted, setSubmitted] = useState(initialQuery);
  const [mode, setMode] = useState<SearchMode>("song");
  const [apiReady, setApiReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const playerRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const playerDivId = "yt-music-player";
  const debouncedQuery = useDebounce(query, 280);

  // Load YouTube IFrame API on mount
  useEffect(() => {
    loadYouTubeAPI().then(() => setApiReady(true));
  }, []);

  // Fetch autocomplete suggestions
  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setSuggestions([]);
      return;
    }
    const controller = new AbortController();
    fetch(`/api/streaming/yt-suggest?q=${encodeURIComponent(debouncedQuery)}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((data: { suggestions: string[] }) => {
        setSuggestions(data.suggestions ?? []);
        setActiveSuggestion(-1);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [debouncedQuery]);

  // Create/restart player
  const createPlayer = useCallback((searchQuery: string, searchMode: SearchMode) => {
    if (!window.YT || !window.YT.Player) return;
    setLoading(true);

    if (playerRef.current) {
      try { playerRef.current.destroy(); } catch {}
      playerRef.current = null;
    }

    const fullQuery = searchQuery + MODE_CONFIG[searchMode].suffix;

    playerRef.current = new window.YT.Player(playerDivId, {
      height: "100%",
      width: "100%",
      playerVars: {
        listType: "search",
        list: fullQuery,
        autoplay: 1,
        controls: 1,
        rel: 0,
        modestbranding: 1,
        origin: window.location.origin,
      },
      events: {
        onReady: () => setLoading(false),
        onError: () => setLoading(false),
      },
    });
  }, []);

  const doSearch = useCallback((q: string) => {
    if (!q.trim()) return;
    const trimmed = q.trim();
    setQuery(trimmed);
    setSubmitted(trimmed);
    setSuggestions([]);
    setShowSuggestions(false);
    setActiveSuggestion(-1);
  }, []);

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    doSearch(query);
  }, [query, doSearch]);

  // Create/update player when submitted query changes
  useEffect(() => {
    if (!apiReady || !submitted) return;
    createPlayer(submitted, mode);
    return () => {
      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch {}
        playerRef.current = null;
      }
    };
  }, [apiReady, submitted, mode, createPlayer]);

  const clearSearch = () => {
    setQuery("");
    setSubmitted("");
    setSuggestions([]);
    setShowSuggestions(false);
    if (playerRef.current) {
      try { playerRef.current.destroy(); } catch {}
      playerRef.current = null;
    }
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveSuggestion((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveSuggestion((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter" && activeSuggestion >= 0) {
      e.preventDefault();
      doSearch(suggestions[activeSuggestion]);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  const ytMusicUrl = submitted
    ? `https://music.youtube.com/search?q=${encodeURIComponent(submitted + MODE_CONFIG[mode].suffix)}`
    : "https://music.youtube.com";

  return (
    <div className="rounded-3xl overflow-hidden" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
      {/* Header */}
      <div className="p-5 pb-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "linear-gradient(135deg, #ff0000 0%, #cc0000 100%)" }}>
              <Music2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">YouTube Music</p>
              <p className="text-[11px] text-white/35">Busca canciones, artistas y álbumes</p>
            </div>
          </div>
          <a
            href={ytMusicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white/60 hover:text-white transition-colors"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)" }}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Abrir
          </a>
        </div>

        {/* Mode selector */}
        <div className="flex gap-1.5 mb-4">
          {(Object.keys(MODE_CONFIG) as SearchMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 border ${
                mode === m
                  ? "text-white border-red-500/30"
                  : "text-white/35 hover:text-white/65 border-transparent"
              }`}
              style={mode === m ? { background: "rgba(255,0,0,0.12)" } : {}}
            >
              {MODE_CONFIG[m].icon}
              {MODE_CONFIG[m].label}
            </button>
          ))}
        </div>

        {/* Search form with autocomplete */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25 pointer-events-none z-10" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              autoComplete="off"
              spellCheck={false}
              onChange={(e) => { setQuery(e.target.value); setShowSuggestions(true); }}
              onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
              onBlur={() => { setTimeout(() => setShowSuggestions(false), 150); }}
              onKeyDown={handleKeyDown}
              placeholder={MODE_CONFIG[mode].placeholder}
              className="w-full pl-9 pr-9 py-2.5 rounded-xl text-sm text-white placeholder:text-white/20 outline-none focus:ring-1 focus:ring-red-500/30 transition-all"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)" }}
            />
            {query && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition-colors z-10"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Suggestions dropdown */}
            <AnimatePresence>
              {showSuggestions && suggestions.length > 0 && (
                <motion.div
                  ref={suggestionsRef}
                  initial={{ opacity: 0, y: -4, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.98 }}
                  transition={{ duration: 0.12 }}
                  className="absolute left-0 right-0 top-full mt-1 z-50 rounded-xl overflow-hidden py-1"
                  style={{
                    background: "rgba(18,18,30,0.98)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
                    backdropFilter: "blur(20px)",
                  }}
                >
                  {suggestions.map((s, i) => (
                    <button
                      key={s}
                      type="button"
                      onMouseDown={() => doSearch(s)}
                      className={`flex items-center gap-2.5 w-full px-3 py-2 text-left text-sm transition-colors ${
                        i === activeSuggestion ? "text-white bg-red-500/10" : "text-white/65 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <Search className="w-3 h-3 text-white/20 shrink-0" />
                      <span className="truncate">{s}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            type="submit"
            disabled={!query.trim()}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 shrink-0"
            style={{ background: "linear-gradient(135deg, #ff0000 0%, #cc0000 100%)" }}
          >
            Buscar
          </button>
        </form>
      </div>

      {/* Player area */}
      <AnimatePresence>
        {submitted && (
          <motion.div
            key={submitted + mode}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <div className="relative" style={{ aspectRatio: "16/9", background: "#000" }}>
              {loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center z-10"
                  style={{ background: "rgba(0,0,0,0.85)" }}>
                  <Loader2 className="w-8 h-8 text-red-500 animate-spin mb-2" />
                  <p className="text-xs text-white/40">Cargando resultados...</p>
                </div>
              )}
              <div id={playerDivId} className="w-full h-full" />
            </div>
            {/* Footer bar */}
            <div className="px-5 py-3 flex items-center justify-between"
              style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
              <span className="text-xs text-white/35 truncate">
                Resultados de <span className="text-white/55 font-semibold">"{submitted}"</span>
              </span>
              <a
                href={ytMusicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-red-400/70 hover:text-red-400 transition-colors shrink-0 ml-3"
              >
                <ExternalLink className="w-3 h-3" />
                Ver en YouTube Music
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {!submitted && (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: "rgba(255,0,0,0.08)", border: "1px solid rgba(255,0,0,0.12)" }}>
            <Disc3 className="w-7 h-7 text-red-400/50" />
          </div>
          <p className="text-white/30 text-sm font-medium">Busca tu música favorita</p>
          <p className="text-white/15 text-xs mt-1">Canciones, artistas o álbumes</p>
        </div>
      )}
    </div>
  );
}
