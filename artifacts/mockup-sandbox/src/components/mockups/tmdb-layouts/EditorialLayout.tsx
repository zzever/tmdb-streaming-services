import { useState } from "react";
import { Film, Tv, Play, Search, Globe, ExternalLink, Star, ArrowRight } from "lucide-react";

const FEATURED = {
  id: 1, title: "Dune: Part Two", year: 2024, rating: 8.5, type: "movie",
  poster: "https://picsum.photos/seed/dune2-xl/400/600",
  overview: "Paul Atreides unites with Chani and the Fremen while on a warpath of revenge against the conspirators who destroyed his family.",
  providers: [{ name: "Max", type: "flatrate" }, { name: "Prime", type: "rent" }],
};

const GRID = [
  { id: 2, title: "Oppenheimer", year: 2023, rating: 8.1, type: "movie", poster: "https://picsum.photos/seed/oppenheimer/250/375", providers: [{ name: "Netflix", type: "flatrate" }] },
  { id: 3, title: "Shogun", year: 2024, rating: 9.0, type: "series", poster: "https://picsum.photos/seed/shogun/250/375", providers: [{ name: "Disney+", type: "flatrate" }] },
  { id: 4, title: "The Bear", year: 2022, rating: 8.9, type: "series", poster: "https://picsum.photos/seed/thebear/250/375", providers: [{ name: "Disney+", type: "flatrate" }] },
  { id: 5, title: "Fallout", year: 2024, rating: 8.5, type: "series", poster: "https://picsum.photos/seed/fallout/250/375", providers: [{ name: "Prime", type: "flatrate" }] },
  { id: 6, title: "Poor Things", year: 2023, rating: 7.8, type: "movie", poster: "https://picsum.photos/seed/poorthings/250/375", providers: [{ name: "Disney+", type: "flatrate" }] },
  { id: 7, title: "Severance", year: 2022, rating: 8.7, type: "series", poster: "https://picsum.photos/seed/severance/250/375", providers: [{ name: "Prime", type: "flatrate" }] },
];

const PLATFORM_COLORS: Record<string, string> = {
  Netflix: "#E50914",
  Max: "#0B62D0",
  HBO: "#551A8B",
  Prime: "#00A8E1",
  "Disney+": "#113CCF",
  MUBI: "#333",
};

const LOCALES = ["🇪🇸 España", "🇺🇸 USA", "🇫🇷 France", "🇩🇪 Germany"];

export function EditorialLayout() {
  const [activeType, setActiveType] = useState<"movie" | "series">("movie");
  const [locale, setLocale] = useState(0);
  const [search, setSearch] = useState("");

  return (
    <div className="min-h-screen bg-[#0c0c13] text-white font-sans">
      {/* Minimal header */}
      <header className="sticky top-0 z-30 bg-[#0c0c13]/90 backdrop-blur-xl border-b border-white/8">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/25">
              <Play className="w-3.5 h-3.5 fill-white" />
            </div>
            <span className="font-bold text-base tracking-tight">
              Stremio<span className="text-amber-400">ES</span>
            </span>
          </div>

          {/* Search */}
          <div className="flex-1 relative max-w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/25" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-full bg-white/5 border border-white/8 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-white/25 focus:outline-none focus:border-amber-500/40"
            />
          </div>

          <div className="ml-auto flex items-center gap-3">
            {/* Locale */}
            <div className="flex items-center gap-1.5 text-xs text-white/40">
              <Globe className="w-3.5 h-3.5" />
              <select
                value={locale}
                onChange={e => setLocale(Number(e.target.value))}
                className="bg-transparent focus:outline-none cursor-pointer text-white/50"
              >
                {LOCALES.map((l, i) => <option key={l} value={i}>{l}</option>)}
              </select>
            </div>
            <button className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/15 border border-amber-500/25 rounded-lg text-xs font-semibold text-amber-400 hover:bg-amber-500/25 transition-colors">
              <ExternalLink className="w-3 h-3" />
              Stremio
            </button>
          </div>
        </div>

        {/* Type tabs — below header, inset */}
        <div className="max-w-6xl mx-auto px-6 pb-0 flex gap-0">
          {[{ id: "movie", label: "Movies", icon: Film }, { id: "series", label: "Series", icon: Tv }].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveType(id as "movie" | "series")}
              className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold border-b-2 transition-all ${
                activeType === id
                  ? "border-amber-400 text-amber-400"
                  : "border-transparent text-white/35 hover:text-white/60 hover:border-white/20"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </header>

      {/* Editorial body */}
      <main className="max-w-6xl mx-auto px-6 py-7">
        {/* Section label */}
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-xs font-bold uppercase tracking-widest text-white/30">
            Trending in {LOCALES[locale]}
          </h1>
          <button className="text-xs text-amber-400/70 hover:text-amber-400 transition-colors flex items-center gap-1">
            See all <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* Editorial grid: 1 large + 6 smaller */}
        <div className="grid grid-cols-3 gap-5">
          {/* Featured — spans 1 col, 2 rows worth of height */}
          <div className="col-span-1 row-span-2 group cursor-pointer">
            <div className="relative rounded-2xl overflow-hidden aspect-[2/3] bg-white/5 shadow-2xl shadow-black/60">
              <img
                src={FEATURED.poster}
                alt={FEATURED.title}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

              {/* Content */}
              <div className="absolute bottom-0 left-0 right-0 p-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400 bg-amber-400/15 border border-amber-400/25 px-2 py-0.5 rounded-full">
                    Featured
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                    {FEATURED.year}
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-white leading-tight mb-2">{FEATURED.title}</h2>
                <p className="text-xs text-white/50 leading-relaxed line-clamp-2 mb-4">{FEATURED.overview}</p>

                {/* Rating */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                    <span className="text-sm font-bold text-yellow-400">{FEATURED.rating}</span>
                  </div>
                </div>

                {/* Providers */}
                <div className="flex gap-2">
                  {FEATURED.providers.map((p, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/10 backdrop-blur-md border border-white/15 hover:bg-white/20 transition-colors cursor-pointer"
                    >
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: PLATFORM_COLORS[p.name] ?? "#666" }}
                      />
                      <span className="text-xs font-semibold text-white">{p.name}</span>
                      <span className={`text-[10px] ${p.type === "flatrate" ? "text-emerald-400" : "text-amber-400"}`}>
                        {p.type === "flatrate" ? "●" : "Rent"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Secondary grid — 2 columns × 3 rows */}
          <div className="col-span-2 grid grid-cols-3 gap-4">
            {GRID.map((item) => (
              <div key={item.id} className="group cursor-pointer">
                <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-white/5 mb-2.5">
                  <img
                    src={item.poster}
                    alt={item.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  {/* Rating */}
                  <div className="absolute top-2 right-2 flex items-center gap-0.5 bg-black/60 backdrop-blur-sm rounded px-1 py-0.5">
                    <Star className="w-2.5 h-2.5 text-yellow-400 fill-yellow-400" />
                    <span className="text-[10px] font-bold text-yellow-400">{item.rating}</span>
                  </div>
                  {/* Type badge */}
                  <div className="absolute top-2 left-2">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-white/60 bg-black/50 backdrop-blur-sm px-1.5 py-0.5 rounded">
                      {item.type === "movie" ? "Film" : "TV"}
                    </span>
                  </div>
                </div>
                <h3 className="text-sm font-semibold text-white/90 truncate group-hover:text-amber-300 transition-colors leading-tight">
                  {item.title}
                </h3>
                {/* Provider tags */}
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {item.providers.map((p, i) => (
                    <span
                      key={i}
                      className="text-[10px] font-bold text-white/60 bg-white/6 border border-white/8 px-1.5 py-0.5 rounded"
                    >
                      {p.name}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
