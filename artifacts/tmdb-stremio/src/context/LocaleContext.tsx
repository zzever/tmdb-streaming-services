import React, { createContext, useContext, useState } from "react";
import { type WatchLocale, getSavedLocale, saveLocale } from "@/lib/locales";

interface LocaleContextValue {
  locale: WatchLocale;
  setLocale: (locale: WatchLocale) => void;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<WatchLocale>(getSavedLocale);

  const setLocale = (next: WatchLocale) => {
    saveLocale(next);
    setLocaleState(next);
  };

  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used inside LocaleProvider");
  return ctx;
}
