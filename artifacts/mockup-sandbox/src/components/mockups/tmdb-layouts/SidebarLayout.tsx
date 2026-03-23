import { useState } from "react";
import { Film, Tv, Play, Search, Globe, ExternalLink, Star, ChevronRight } from "lucide-react";

const LOGO: Record<string, string> = {
  Netflix:  "https://image.tmdb.org/t/p/w185/pbpMk2JmcoNnQwx5JGpXngfoWtp.jpg",
  Prime:    "https://image.tmdb.org/t/p/w185/pvske1MyAoymrs5bguRfVqYiM9a.jpg",
  "Disney+":"https://image.tmdb.org/t/p/w185/97yvRBw1GzX7fXprcF80er19ot.jpg",
  Max:      "https://image.tmdb.org/t/p/w185/jbe4gVSfRlbPTdESXhEKpornsfu.jpg",
  HBO:      "https://image.tmdb.org/t/p/w185/jbe4gVSfRlbPTdESXhEKpornsfu.jpg",
  "Apple TV":"https://image.tmdb.org/t/p/w185/mcbz1LgtErU9p4UdbZ0rG6RTWHX.jpg",
  Movistar: "https://image.tmdb.org/t/p/w185/jse4MOi92Jgetym7nbXFZZBI6LK.jpg",
  MUBI:     "https://image.tmdb.org/t/p/w185/bVR4Z1LCHY7gidXAJF5pMa4QaDS.jpg",
};

const MOVIES = [
  { id: 1, title: "Oppenheimer",         year: 2023, rating: 8.1, poster: "https://picsum.photos/seed/oppenheimer/300/450", providers: ["Netflix", "Prime"] },
  { id: 2, title: "Dune: Part Two",      year: 2024, rating: 8.5, poster: "https://picsum.photos/seed/dune2/300/450",      providers: ["Max"] },
  { id: 3, title: "Past Lives",          year: 2023, rating: 7.9, poster: "https://picsum.photos/seed/pastlives/300/450",  providers: ["Prime"] },
  { id: 4, title: "Poor Things",         year: 2023, rating: 7.8, poster: "https://picsum.photos/seed/poorthings/300/450",providers: ["Disney+"] },
  { id: 5, title: "Society of the Snow", year: 2023, rating: 7.5, poster: "https://picsum.photos/seed/snow/300/450",       providers: ["Netflix"] },
  { id: 6, title: "Cabrini",            year: 2024, rating: 7.2, poster: "https://picsum.photos/seed/cabrini/300/450",    providers: ["Prime"] },
  { id: 7, title: "Civil War",          year: 2024, rating: 7.3, poster: "https://picsum.photos/seed/civilwar/300/450",   providers: ["Netflix", "Max"] },
  { id: 8, title: "Zone of Interest",   year: 2023, rating: 7.4, poster: "https://picsum.photos/seed/zone/300/450",       providers: ["MUBI"] },
];

const SERIES = [
  { id: 9,  title: "The Bear",          year: 2022, rating: 8.9, poster: "https://picsum.photos/seed/thebear/300/450",    providers: ["Disney+"] },
  { id: 10, title: "Succession",        year: 2018, rating: 8.9, poster: "https://picsum.photos/seed/succession/300/450", providers: ["Max"] },
  { id: 11, title: "Silo",             year: 2023, rating: 7.8, poster: "https://picsum.photos/seed/silo/300/450",        providers: ["Prime"] },
  { id: 12, title: "The Last of Us",   year: 2023, rating: 8.8, poster: "https://picsum.photos/seed/lastofus/300/450",   providers: ["Max"] },
  { id: 13, title: "Shogun",           year: 2024, rating: 9.0, poster: "https://picsum.photos/seed/shogun/300/450",      providers: ["Disney+"] },
  { id: 14, title: "Fallout",          year: 2024, rating: 8.5, poster: "https://picsum.photos/seed/fallout/300/450",    providers: ["Prime"] },
  { id: 15, title: "House of Dragon",  year: 2022, rating: 8.3, poster: "https://picsum.photos/seed/hotd/300/450",        providers: ["Max"] },
  { id: 16, title: "Severance",        year: 2022, rating: 8.7, poster: "https://picsum.photos/seed/severance/300/450",  providers: ["Prime"] },
];

const LOCALES = ["🇪🇸 España", "🇺🇸 USA", "🇫🇷 France", "🇩🇪 Germany"];

export function SidebarLayout() {
  const [activeType, setActiveType] = useState<"movie" | "series">("movie");
  const [locale, setLocale] = useState(0);
  const [search, setSearch] = useState("");

  const items = (activeType === "movie" ? MOVIES : SERIES).filter(m =>
    m.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-[#0a0a0f] text-white font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 flex flex-col border-r border-white/8 bg-[#0d0d14]">
        <div className="px-5 py-5 border-b border-white/8">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <Play className="w-4 h-4 fill-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">
              Stremio<span className="text-violet-400">ES</span>
            </span>
          </div>
        </div>

        <nav className="flex-1 px-3 py-5 space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 px-2 mb-3">Browse</p>
          <button
            onClick={() => setActiveType("movie")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeType === "movie"
                ? "bg-violet-500/15 text-violet-300 border border-violet-500/25"
                : "text-white/50 hover:bg-white/5 hover:text-white/80"
            }`}
          >
            <Film className="w-4 h-4" /> Movies
          </button>
          <button
            onClick={() => setActiveType("series")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeType === "series"
                ? "bg-violet-500/15 text-violet-300 border border-violet-500/25"
                : "text-white/50 hover:bg-white/5 hover:text-white/80"
            }`}
          >
            <Tv className="w-4 h-4" /> Series
          </button>

          <div className="pt-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 px-2 mb-3">Region</p>
            <div className="space-y-1">
              {LOCALES.map((l, i) => (
                <button
                  key={l}
                  onClick={() => setLocale(i)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all ${
                    locale === i ? "bg-white/10 text-white" : "text-white/40 hover:bg-white/5 hover:text-white/70"
                  }`}
                >
                  <span>{l}</span>
                  {locale === i && <ChevronRight className="w-3.5 h-3.5 text-violet-400" />}
                </button>
              ))}
            </div>
          </div>
        </nav>

        <div className="m-3 p-3.5 rounded-xl bg-gradient-to-br from-violet-600/20 to-indigo-600/10 border border-violet-500/20">
          <p className="text-xs font-bold text-violet-300 mb-1">Stremio Addon</p>
          <p className="text-[11px] text-white/40 mb-3 leading-relaxed">Install to watch directly from Stremio</p>
          <button className="w-full flex items-center justify-center gap-1.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold py-2 rounded-lg transition-colors">
            <ExternalLink className="w-3 h-3" /> Install
          </button>
        </div>
      </aside>
      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-white/8 flex items-center gap-4 bg-[#0a0a0f]/80 backdrop-blur-md">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={`Search ${activeType === "movie" ? "movies" : "series"}...`}
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-violet-500/50"
            />
          </div>
          <div className="flex items-center gap-1.5 text-sm text-white/40">
            <Globe className="w-4 h-4" /><span>{LOCALES[locale]}</span>
          </div>
          <div className="text-xs text-white/25">{items.length} titles</div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-4 gap-4">
            {items.map((item) => (
              <div key={item.id} className="group cursor-pointer">
                <div className="relative aspect-[2/3] rounded-xl overflow-hidden mb-2.5 bg-white/5">
                  <img src={item.poster} alt={item.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pl-[6px] pr-[6px]" />
                  {/* Rating */}
                  <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/70 backdrop-blur-sm rounded-md px-1.5 py-0.5">
                    <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                    <span className="text-xs font-bold text-yellow-400">{item.rating}</span>
                  </div>
                  {/* Provider logos — bottom left */}
                  <div className="absolute bottom-2 left-2 flex gap-1">
                    {item.providers.map(p => (
                      LOGO[p] ? (
                        <img key={p} src={LOGO[p]} alt={p} title={p}
                          className="w-7 h-7 rounded-md object-cover border border-white/15 shadow-md shadow-black/50" />
                      ) : (
                        <span key={p} className="text-[9px] font-bold text-white bg-white/20 px-1.5 py-0.5 rounded">{p}</span>
                      )
                    ))}
                  </div>
                </div>
                <h3 className="text-sm font-semibold text-white/90 truncate leading-tight group-hover:text-violet-300 transition-colors">
                  {item.title}
                </h3>
                <p className="text-xs text-white/35 mt-0.5">{item.year}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
