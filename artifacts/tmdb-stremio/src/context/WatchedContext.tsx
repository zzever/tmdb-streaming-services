import React, { createContext, useContext, useState, useCallback, useEffect } from "react";

interface WatchedItem {
  id: number;
  type: "movie" | "series" | "anime" | "programa";
  title: string;
  poster?: string | null;
  backdrop?: string | null;
  rating?: number | null;
  year?: number | null;
  genres?: string[] | null;
  overview?: string | null;
  watchedAt?: number;
  episodesWatched?: number;
}

interface WatchedContextValue {
  watched: WatchedItem[];
  toggle: (item: WatchedItem) => void;
  remove: (id: number) => void;
  clear: () => void;
  isWatched: (id: number) => boolean;
  addEpisode: (id: number) => void;
  removeEpisode: (id: number) => void;
  getEpisodes: (id: number) => number;
}

const WatchedContext = createContext<WatchedContextValue>({
  watched: [],
  toggle: () => {},
  remove: () => {},
  clear: () => {},
  isWatched: () => false,
  addEpisode: () => {},
  removeEpisode: () => {},
  getEpisodes: () => 0,
});

const STORAGE_KEY = "tmdb-watched";

export function WatchedProvider({ children }: { children: React.ReactNode }) {
  const [watched, setWatched] = useState<WatchedItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(watched)); } catch {}
  }, [watched]);

  const toggle = useCallback((item: WatchedItem) => {
    setWatched((prev) => {
      const exists = prev.some((w) => w.id === item.id);
      return exists ? prev.filter((w) => w.id !== item.id) : [{ ...item, watchedAt: Date.now(), episodesWatched: 0 }, ...prev];
    });
  }, []);

  const remove = useCallback((id: number) => {
    setWatched((prev) => prev.filter((w) => w.id !== id));
  }, []);

  const clear = useCallback(() => setWatched([]), []);

  const isWatched = useCallback((id: number) => watched.some((w) => w.id === id), [watched]);

  const addEpisode = useCallback((id: number) => {
    setWatched((prev) => prev.map((w) => w.id === id ? { ...w, episodesWatched: (w.episodesWatched ?? 0) + 1 } : w));
  }, []);

  const removeEpisode = useCallback((id: number) => {
    setWatched((prev) => prev.map((w) => w.id === id ? { ...w, episodesWatched: Math.max(0, (w.episodesWatched ?? 1) - 1) } : w));
  }, []);

  const getEpisodes = useCallback((id: number) => {
    return watched.find((w) => w.id === id)?.episodesWatched ?? 0;
  }, [watched]);

  return (
    <WatchedContext.Provider value={{ watched, toggle, remove, clear, isWatched, addEpisode, removeEpisode, getEpisodes }}>
      {children}
    </WatchedContext.Provider>
  );
}

export function useWatched() {
  return useContext(WatchedContext);
}

export type { WatchedItem };
