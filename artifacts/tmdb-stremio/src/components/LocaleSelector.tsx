import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Search } from "lucide-react";
import { WATCH_LOCALES } from "@/lib/locales";
import { useLocale } from "@/context/LocaleContext";
import { motion, AnimatePresence } from "framer-motion";

export function LocaleSelector() {
  const { locale, setLocale } = useLocale();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const filtered = WATCH_LOCALES.filter(
    (l) =>
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.code.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    if (open) {
      setTimeout(() => searchRef.current?.focus(), 50);
    } else {
      setSearch("");
    }
  }, [open]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors text-sm font-medium text-white/90"
        aria-label="Seleccionar país"
      >
        <span className="text-base leading-none">{locale.flag}</span>
        <span className="hidden sm:inline">{locale.name}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-white/50 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-64 rounded-2xl border border-white/10 bg-[#0f0f1a]/95 backdrop-blur-xl shadow-2xl shadow-black/50 z-50 overflow-hidden"
          >
            {/* Search */}
            <div className="p-2 border-b border-white/10">
              <div className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-xl">
                <Search className="w-3.5 h-3.5 text-white/40 shrink-0" />
                <input
                  ref={searchRef}
                  type="text"
                  placeholder="Buscar país..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="flex-1 bg-transparent text-sm text-white placeholder:text-white/30 outline-none"
                />
              </div>
            </div>

            {/* List */}
            <div className="max-h-60 overflow-y-auto py-1.5 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
              {filtered.length === 0 ? (
                <p className="text-center text-white/40 text-xs py-4">Sin resultados</p>
              ) : (
                filtered.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => {
                      setLocale(l);
                      setOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-white/10 transition-colors text-left ${
                      l.code === locale.code ? "text-primary font-semibold" : "text-white/80"
                    }`}
                  >
                    <span className="text-base leading-none w-6 text-center">{l.flag}</span>
                    <span>{l.name}</span>
                    {l.code === locale.code && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
                    )}
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
