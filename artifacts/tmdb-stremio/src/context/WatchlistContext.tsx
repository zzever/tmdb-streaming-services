import React, { createContext, useContext, useState, useCallback, useEffect } from "react";

interface WatchlistItem {
  id: number;
  type: "movie" | "series" | "anime" | "programa";
  title: string;
  poster?: string | null;
  backdrop?: string | null;
  rating?: number | null;
  year?: number | null;
  genres?: string[] | null;
  overview?: string | null;
}

interface WatchlistContextValue {
  watchlist: WatchlistItem[];
  toggle: (item: WatchlistItem) => void;
  isInWatchlist: (id: number) => boolean;
}

const WatchlistContext = createContext<WatchlistContextValue>({
  watchlist: [],
  toggle: () => {},
  isInWatchlist: () => false,
});

const STORAGE_KEY = "tmdb-watchlist";

export function WatchlistProvider({ children }: { children: React.ReactNode }) {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(watchlist)); } catch {}
  }, [watchlist]);

  const toggle = useCallback((item: WatchlistItem) => {
    setWatchlist((prev) => {
      const exists = prev.some((w) => w.id === item.id);
      return exists ? prev.filter((w) => w.id !== item.id) : [item, ...prev];
    });
  }, []);

  const isInWatchlist = useCallback((id: number) => {
    return watchlist.some((w) => w.id === id);
  }, [watchlist]);

  return (
    <WatchlistContext.Provider value={{ watchlist, toggle, isInWatchlist }}>
      {children}
    </WatchlistContext.Provider>
  );
}

export function useWatchlist() {
  return useContext(WatchlistContext);
}

export type { WatchlistItem };
