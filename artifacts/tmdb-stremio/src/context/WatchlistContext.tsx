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
  addedAt?: number;
}

interface WatchlistContextValue {
  watchlist: WatchlistItem[];
  toggle: (item: WatchlistItem) => void;
  remove: (id: number) => void;
  clear: () => void;
  isInWatchlist: (id: number) => boolean;
}

const WatchlistContext = createContext<WatchlistContextValue>({
  watchlist: [],
  toggle: () => {},
  remove: () => {},
  clear: () => {},
  isInWatchlist: () => false,
});

const STORAGE_KEY = "tmdb-watchlist";

export function WatchlistProvider({ children }: { children: React.ReactNode }) {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const parsed = saved ? JSON.parse(saved) : [];
      return parsed.map((item: WatchlistItem) => ({ ...item, addedAt: item.addedAt ?? Date.now() }));
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
      return exists ? prev.filter((w) => w.id !== item.id) : [{ ...item, addedAt: Date.now() }, ...prev];
    });
  }, []);

  const remove = useCallback((id: number) => {
    setWatchlist((prev) => prev.filter((w) => w.id !== id));
  }, []);

  const clear = useCallback(() => setWatchlist([]), []);

  const isInWatchlist = useCallback((id: number) => {
    return watchlist.some((w) => w.id === id);
  }, [watchlist]);

  return (
    <WatchlistContext.Provider value={{ watchlist, toggle, remove, clear, isInWatchlist }}>
      {children}
    </WatchlistContext.Provider>
  );
}

export function useWatchlist() {
  return useContext(WatchlistContext);
}

export type { WatchlistItem };
