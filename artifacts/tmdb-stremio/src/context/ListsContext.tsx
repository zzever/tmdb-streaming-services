import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { ListSourceParams } from "@workspace/api-client-react/src/generated/api";

export interface ListSource {
  id: string;
  name: string;
  params: ListSourceParams;
}

interface ListsContextValue {
  lists: ListSource[];
  addList: (name: string, params: ListSourceParams) => void;
  removeList: (id: string) => void;
}

const ListsContext = createContext<ListsContextValue | null>(null);

const STORAGE_KEY = "tmdb-streaming-lists";

export function ListsProvider({ children }: { children: React.ReactNode }) {
  const [lists, setLists] = useState<ListSource[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lists));
  }, [lists]);

  const addList = useCallback((name: string, params: ListSourceParams) => {
    const id = `${params.source}-${Date.now()}`;
    setLists((prev) => [...prev, { id, name, params }]);
  }, []);

  const removeList = useCallback((id: string) => {
    setLists((prev) => prev.filter((l) => l.id !== id));
  }, []);

  return (
    <ListsContext.Provider value={{ lists, addList, removeList }}>
      {children}
    </ListsContext.Provider>
  );
}

export function useLists() {
  const ctx = useContext(ListsContext);
  if (!ctx) throw new Error("useLists must be used within ListsProvider");
  return ctx;
}
