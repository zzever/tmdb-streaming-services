import React from "react";
import { Search, Film, Tv } from "lucide-react";
import { cn } from "@/lib/utils";
import { LocaleSelector } from "./LocaleSelector";

interface HeaderProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  activeType: "movie" | "series";
  setActiveType: (type: "movie" | "series") => void;
}

export function Header({ searchQuery, setSearchQuery, activeType, setActiveType }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 w-full glass">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-[72px] flex items-center gap-3 sm:gap-6">

        {/* Logo */}
        <div className="flex items-center gap-2.5 shrink-0">
          <span className="font-display font-bold text-lg tracking-tight">
            <span className="text-white/90">TMDB</span>
            <span className="gradient-text-primary font-black"> Streaming ES</span>
          </span>
        </div>

        {/* Search */}
        <div className="flex-1 min-w-0 max-w-lg relative group">
          <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none">
            <Search className="w-3.5 h-3.5 text-white/30 group-focus-within:text-primary/70 transition-colors duration-200" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar películas o series..."
            className="w-full h-9 bg-white/[0.04] border border-white/[0.08] rounded-xl pl-9 pr-4 text-sm text-white/80 placeholder:text-white/25 focus:outline-none focus:bg-white/[0.07] focus:border-white/20 focus:text-white transition-all duration-200"
          />
        </div>

        {/* Type toggle */}
        <div className="flex items-center p-1 bg-white/[0.04] rounded-xl border border-white/[0.06] shrink-0">
          {(["movie", "series"] as const).map((type) => (
            <button
              key={type}
              onClick={() => setActiveType(type)}
              className={cn(
                "flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200",
                activeType === type
                  ? "bg-white/10 text-white shadow-sm border border-white/10"
                  : "text-white/35 hover:text-white/70"
              )}
            >
              {type === "movie" ? <Film className="w-3.5 h-3.5" /> : <Tv className="w-3.5 h-3.5" />}
              {type === "movie" ? "Películas" : "Series"}
            </button>
          ))}
        </div>

        {/* Locale */}
        <div className="shrink-0">
          <LocaleSelector />
        </div>
      </div>
    </header>
  );
}
