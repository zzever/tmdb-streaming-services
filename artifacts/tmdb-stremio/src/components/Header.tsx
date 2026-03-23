import React from "react";
import { Search, Film, Tv, Play } from "lucide-react";
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
    <header className="sticky top-0 z-40 w-full glass border-b border-white/10 shadow-lg shadow-black/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-8">
        
        {/* Logo */}
        <div className="flex items-center gap-2 text-primary shrink-0 pt-4 sm:pt-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center text-white shadow-lg shadow-primary/20">
            <Play className="w-4 h-4 fill-current" />
          </div>
          <span className="font-display font-bold text-xl tracking-tight text-white hidden sm:block">
            Stremio<span className="text-primary font-black">ES</span>
          </span>
        </div>

        {/* Search Bar */}
        <div className="flex-1 w-full max-w-xl relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for movies or series..."
            className="w-full bg-black/20 border border-white/10 rounded-full py-2.5 pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all shadow-inner"
          />
        </div>

        {/* Toggle Movies/Series */}
        <div className="flex p-1 bg-black/40 rounded-full border border-white/5 shrink-0 pb-4 sm:pb-0">
          <button
            onClick={() => setActiveType("movie")}
            className={cn(
              "flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-300",
              activeType === "movie"
                ? "bg-white/10 text-white shadow-md"
                : "text-muted-foreground hover:text-white hover:bg-white/5"
            )}
          >
            <Film className="w-4 h-4" />
            Movies
          </button>
          <button
            onClick={() => setActiveType("series")}
            className={cn(
              "flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-300",
              activeType === "series"
                ? "bg-white/10 text-white shadow-md"
                : "text-muted-foreground hover:text-white hover:bg-white/5"
            )}
          >
            <Tv className="w-4 h-4" />
            Series
          </button>
        </div>

        {/* Locale Selector */}
        <div className="shrink-0 pb-4 sm:pb-0">
          <LocaleSelector />
        </div>

      </div>
    </header>
  );
}
