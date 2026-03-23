import { useState } from "react";
import { Film, Tv, Play, Search, Globe, ExternalLink, Star, ChevronRight } from "lucide-react";

const LOGO: Record<string, string> = {
  Netflix:   "https://image.tmdb.org/t/p/w185/pbpMk2JmcoNnQwx5JGpXngfoWtp.jpg",
  Prime:     "https://image.tmdb.org/t/p/w185/pvske1MyAoymrs5bguRfVqYiM9a.jpg",
  "Disney+": "https://image.tmdb.org/t/p/w185/97yvRBw1GzX7fXprcF80er19ot.jpg",
  Max:       "https://image.tmdb.org/t/p/w185/jbe4gVSfRlbPTdESXhEKpornsfu.jpg",
  "Apple TV":"https://image.tmdb.org/t/p/w185/mcbz1LgtErU9p4UdbZ0rG6RTWHX.jpg",
  Movistar:  "https://image.tmdb.org/t/p/w185/jse4MOi92Jgetym7nbXFZZBI6LK.jpg",
};

const TYPE_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  flatrate: { bg: "bg-emerald-500/12 border-emerald-500/20", text: "text-emerald-400",  label: "Streaming" },
  rent:     { bg: "bg-amber-500/12 border-amber-500/20",     text: "text-amber-400",    label: "Alquiler" },
  buy:      { bg: "bg-orange-500/12 border-orange-500/20",   text: "text-orange-400",   label: "Compra" },
  free:     { bg: "bg-sky-500/12 border-sky-500/20",         text: "text-sky-400",      label: "Gratis" },
};

const ALL_TITLES = [
  { id: 1,  title: "Oppenheimer",        year: 2023, rating: 8.1, type: "movie",  thumb: "https://picsum.photos/seed/oppenheimer/80/120", overview: "The story of J. Robert Oppenheimer's role in the development of the atomic bomb during WWII.", providers: [{ name: "Netflix", type: "flatrate" }, { name: "Prime", type: "rent" }] },
  { id: 2,  title: "Dune: Part Two",     year: 2024, rating: 8.5, type: "movie",  thumb: "https://picsum.photos/seed/dune2/80/120",       overview: "Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators.", providers: [{ name: "Max", type: "flatrate" }, { name: "Prime", type: "rent" }] },
  { id: 3,  title: "Shogun",             year: 2024, rating: 9.0, type: "series", thumb: "https://picsum.photos/seed/shogun/80/120",      overview: "A mysterious European ship is wrecked in Japanese waters. Its sole survivor is drawn into power plays.", providers: [{ name: "Disney+", type: "flatrate" }] },
  { id: 4,  title: "The Bear",           year: 2022, rating: 8.9, type: "series", thumb: "https://picsum.photos/seed/thebear/80/120",    overview: "A young chef from the fine dining world returns to Chicago to run his family's sandwich shop.", providers: [{ name: "Disney+", type: "flatrate" }] },
  { id: 5,  title: "Society of Snow",    year: 2023, rating: 7.5, type: "movie",  thumb: "https://picsum.photos/seed/snow/80/120",        overview: "A Uruguayan rugby team's plane crashes in the Andes. Survivors face impossible choices.", providers: [{ name: "Netflix", type: "flatrate" }] },
  { id: 6,  title: "Fallout",           year: 2024, rating: 8.5, type: "series", thumb: "https://picsum.photos/seed/fallout/80/120",    overview: "A naive vault dweller emerges into post-apocalyptic Los Angeles in this event series.", providers: [{ name: "Prime", type: "flatrate" }] },
  { id: 7,  title: "Severance",         year: 2022, rating: 8.7, type: "series", thumb: "https://picsum.photos/seed/severance/80/120",  overview: "Mark leads a team at Lumon Industries whose employees have undergone a controversial procedure.", providers: [{ name: "Prime", type: "flatrate" }] },
  { id: 8,  title: "Poor Things",       year: 2023, rating: 7.8, type: "movie",  thumb: "https://picsum.photos/seed/poorthings/80/120", overview: "The incredible adventures of Bella Baxter, a young woman brought back to life by a brilliant scientist.", providers: [{ name: "Disney+", type: "flatrate" }, { name: "Netflix", type: "rent" }] },
  { id: 9,  title: "Civil War",         year: 2024, rating: 7.3, type: "movie",  thumb: "https://picsum.photos/seed/civilwar/80/120",   overview: "A team of journalists race across a dystopian future America to reach Washington DC.", providers: [{ name: "Max", type: "flatrate" }, { name: "Prime", type: "rent" }] },
  { id: 10, title: "The Last of Us",    year: 2023, rating: 8.8, type: "series", thumb: "https://picsum.photos/seed/lastofus/80/120",   overview: "A hardened survivor takes charge of a 14-year-old girl who may be humanity's last hope.", providers: [{ name: "Max", type: "flatrate" }] },
];

const LOCALES = ["🇪🇸 España", "🇺🇸 USA", "🇫🇷 France"];

export function ListLayout() {
  const [activeType, setActiveType] = useState<"all" | "movie" | "series">("all");
  const [locale, setLocale] = useState(0);
  const [search, setSearch] = useState("");

  const items = ALL_TITLES
    .filter(t => activeType === "all" || t.type === activeType)
    .filter(t => t.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="min-h-screen bg-[#0b0b10] text-white font-sans flex flex-col">
      <header className="sticky top-0 z-30 bg-[#0b0b10]/95 backdrop-blur-xl border-b border-white/8">
        <div className="px-6 h-14 flex items-center gap-5">
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center shadow-lg shadow-rose-500/30">
              <Play className="w-3.5 h-3.5 fill-white" />
            </div>
            <span className="font-bold text-base tracking-tight hidden sm:block">
              Stremio<span className="text-rose-400">ES</span>
            </span>
          </div>

          <div className="flex items-center gap-1 bg-white/5 rounded-full p-1">
            {(["all", "movie", "series"] as const).map((t) => (
              <button key={t} onClick={() => setActiveType(t)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${activeType === t ? "bg-white/15 text-white" : "text-white/40 hover:text-white/70"}`}
              >
                {t === "movie" && <Film className="w-3.5 h-3.5" />}
                {t === "series" && <Tv className="w-3.5 h-3.5" />}
                {t === "all" ? "Todos" : t === "movie" ? "Películas" : "Series"}
              </button>
            ))}
          </div>

          <div className="flex-1 relative max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/25" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar títulos..."
              className="w-full bg-white/5 border border-white/8 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-white/25 focus:outline-none focus:border-white/20"
            />
          </div>

          <div className="ml-auto flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/8 rounded-lg text-xs text-white/50">
              <Globe className="w-3.5 h-3.5" />
              <select value={locale} onChange={e => setLocale(Number(e.target.value))} className="bg-transparent focus:outline-none cursor-pointer text-white/60">
                {LOCALES.map((l, i) => <option key={l} value={i}>{l}</option>)}
              </select>
            </div>
            <button className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600/20 border border-rose-500/30 rounded-lg text-xs font-semibold text-rose-400">
              <ExternalLink className="w-3.5 h-3.5" /> Stremio
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-5">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-sm font-semibold text-white/50">
            {items.length} títulos en <span className="text-white">{LOCALES[locale]}</span>
          </h1>
        </div>

        <div className="space-y-2">
          {items.map((item, idx) => (
            <div key={item.id} className="group flex items-center gap-4 p-3 rounded-xl bg-white/3 border border-white/6 hover:bg-white/8 hover:border-white/12 transition-all cursor-pointer">
              <span className="w-6 text-center text-xs font-bold text-white/20 shrink-0">{idx + 1}</span>

              <div className="w-10 h-14 rounded-lg overflow-hidden bg-white/5 shrink-0">
                <img src={item.thumb} alt={item.title} className="w-full h-full object-cover" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h3 className="text-sm font-semibold text-white group-hover:text-rose-300 transition-colors truncate">{item.title}</h3>
                  <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-white/30 bg-white/8 px-1.5 py-0.5 rounded">
                    {item.type === "movie" ? "Film" : "TV"}
                  </span>
                </div>
                <p className="text-xs text-white/35 truncate">{item.overview}</p>
              </div>

              <div className="shrink-0 flex items-center gap-1">
                <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                <span className="text-xs font-bold text-yellow-400">{item.rating}</span>
              </div>

              {/* Provider chips with real logos */}
              <div className="shrink-0 flex items-center gap-2">
                {item.providers.map((p, i) => {
                  const conf = TYPE_BADGE[p.type] ?? TYPE_BADGE.flatrate;
                  return (
                    <div key={i} className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border ${conf.bg}`}>
                      {LOGO[p.name] ? (
                        <img src={LOGO[p.name]} alt={p.name} className="w-5 h-5 rounded object-cover" />
                      ) : (
                        <span className={`text-[11px] font-semibold ${conf.text}`}>{p.name}</span>
                      )}
                      <span className={`text-[10px] font-medium ${conf.text}`}>{conf.label}</span>
                    </div>
                  );
                })}
              </div>

              <ChevronRight className="w-4 h-4 text-white/15 group-hover:text-white/40 transition-colors shrink-0" />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
