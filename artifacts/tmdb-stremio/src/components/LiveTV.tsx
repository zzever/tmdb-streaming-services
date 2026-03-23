import React, { useRef, useEffect, useState, useCallback, useMemo } from "react";
import Hls from "hls.js";
import { motion, AnimatePresence } from "framer-motion";
import { X, Tv, Copy, Check, ExternalLink, Search, Radio, AlertCircle, Play, Volume2, VolumeX } from "lucide-react";
import { useLiveChannels, useEpg, type EpgResult } from "@/hooks/use-media-api";

const GROUP_ORDER = [
  "General", "News", "Sports", "Public", "Movies", "Series",
  "Animation", "Entertainment", "Comedy", "Music", "Kids",
  "Culture", "Documentary", "Lifestyle", "Classic", "Family",
  "Business", "Education", "Weather", "Outdoor", "Religious", "Legislative",
];

const GROUP_ES: Record<string, string> = {
  General: "General", News: "Noticias", Sports: "Deportes", Public: "Pública",
  Movies: "Cine", Series: "Series", Animation: "Animación", Entertainment: "Entretenimiento",
  Comedy: "Comedia", Music: "Música", Kids: "Infantil", Culture: "Cultura",
  Documentary: "Documental", Lifestyle: "Estilo de vida", Classic: "Clásica",
  Family: "Familia", Business: "Economía", Education: "Educación", Weather: "Tiempo",
  Outdoor: "Naturaleza", Religious: "Religiosa", Legislative: "Parlamento",
};

export interface LiveChannel {
  id: string;
  name: string;
  logo: string;
  groups: string[];
  url: string;
}

function fmtTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

// ── HLS Player modal ─────────────────────────────────────────────
function PlayerModal({ channel, onClose, epg }: { channel: LiveChannel; onClose: () => void; epg?: EpgResult }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [status, setStatus] = useState<"loading" | "playing" | "error">("loading");
  const [muted, setMuted] = useState(false);
  const [copied, setCopied] = useState(false);
  const errorMsgRef = useRef("");

  const copyUrl = () => {
    navigator.clipboard.writeText(channel.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openVlc = () => window.open(`vlc://${channel.url}`, "_blank");

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    setStatus("loading");

    const tryNative = () => {
      video.src = channel.url;
      video.load();
      video.play().catch(() => setStatus("error"));
    };

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: false,
        lowLatencyMode: true,
        maxLoadingDelay: 8,
      });
      hlsRef.current = hls;

      hls.loadSource(channel.url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {});
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          errorMsgRef.current = data.details ?? "Error de reproducción";
          setStatus("error");
          hls.destroy();
          hlsRef.current = null;
        }
      });

      video.addEventListener("playing", () => setStatus("playing"), { once: true });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      tryNative();
      video.addEventListener("playing", () => setStatus("playing"), { once: true });
      video.addEventListener("error", () => { errorMsgRef.current = "Error de reproducción"; setStatus("error"); }, { once: true });
    } else {
      errorMsgRef.current = "Tu navegador no soporta HLS";
      setStatus("error");
    }

    return () => {
      hlsRef.current?.destroy();
      hlsRef.current = null;
      video.pause();
      video.src = "";
    };
  }, [channel.url]);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.9)", backdropFilter: "blur(12px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="relative w-full max-w-3xl rounded-2xl overflow-hidden"
        style={{ background: "rgba(12,12,15,0.95)", border: "1px solid rgba(255,255,255,0.08)" }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          {channel.logo ? (
            <img src={channel.logo} alt={channel.name} className="w-7 h-7 object-contain rounded-md" onError={(e) => (e.currentTarget.style.display = "none")} />
          ) : (
            <Tv className="w-5 h-5 text-white/40" />
          )}
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-sm font-semibold text-white/90 truncate">{channel.name}</span>
            {epg?.current && (
              <span className="text-[10px] text-white/35 truncate">
                {epg.current.title} · {fmtTime(epg.current.start)}–{fmtTime(epg.current.stop)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button onClick={() => { if (videoRef.current) { videoRef.current.muted = !muted; setMuted(!muted); } }}
              className="p-1.5 rounded-lg text-white/40 hover:text-white/70 transition-colors hover:bg-white/5">
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <button onClick={copyUrl}
              className="p-1.5 rounded-lg text-white/40 hover:text-white/70 transition-colors hover:bg-white/5" title="Copiar URL">
              {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            </button>
            <button onClick={openVlc}
              className="p-1.5 rounded-lg text-white/40 hover:text-white/70 transition-colors hover:bg-white/5" title="Abrir en VLC">
              <ExternalLink className="w-4 h-4" />
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg text-white/40 hover:text-white/70 transition-colors hover:bg-white/5">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Video area */}
        <div className="relative bg-black" style={{ aspectRatio: "16/9" }}>
          <video ref={videoRef} className="w-full h-full" controls playsInline muted={muted} />

          {/* Loading overlay */}
          <AnimatePresence>
            {status === "loading" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center bg-black/70">
                <div className="relative flex items-center justify-center w-14 h-14 mb-3">
                  <div className="absolute inset-0 rounded-full border-2 border-white/10" />
                  <div className="absolute inset-0 rounded-full border-2 border-t-white/60 animate-spin" />
                  <Radio className="w-5 h-5 text-white/40" />
                </div>
                <p className="text-white/50 text-sm">Cargando señal…</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error overlay */}
          <AnimatePresence>
            {status === "error" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 gap-3">
                <AlertCircle className="w-10 h-10 text-red-400/60" />
                <p className="text-white/50 text-sm text-center px-6">
                  No se pudo reproducir el canal directamente.<br />
                  <span className="text-white/25 text-xs">{errorMsgRef.current || "Puede que el canal tenga restricciones CORS o esté offline."}</span>
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <button onClick={openVlc}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white/80 transition-all hover:text-white"
                    style={{ background: "rgba(255,165,0,0.15)", border: "1px solid rgba(255,165,0,0.25)" }}>
                    <ExternalLink className="w-3.5 h-3.5" />
                    Abrir en VLC
                  </button>
                  <button onClick={copyUrl}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white/60 transition-all hover:text-white/80"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
                    {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                    Copiar URL
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Stream URL */}
        <div className="px-4 py-2.5" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
          <p className="text-[10px] text-white/20 truncate font-mono">{channel.url}</p>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Channel card ─────────────────────────────────────────────────
function ChannelCard({ ch, onClick, epg }: { ch: LiveChannel; onClick: () => void; epg?: EpgResult }) {
  const [logoError, setLogoError] = useState(false);
  const [hovered, setHovered] = useState(false);
  const currentProgram = epg?.current;

  return (
    <motion.button
      whileHover={{ y: -3, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      onClick={onClick}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      className="relative flex flex-col items-center justify-center gap-2 p-3 rounded-2xl cursor-pointer text-center w-full"
      style={{
        background: hovered ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.03)",
        border: `1px solid ${hovered ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.06)"}`,
        transition: "background 0.2s, border-color 0.2s",
      }}
    >
      {/* Live dot */}
      <div className="absolute top-2.5 right-2.5 flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
        <span className="text-[8px] text-red-400/80 font-bold uppercase tracking-widest">Live</span>
      </div>

      {/* Play icon overlay */}
      <AnimatePresence>
        {hovered && (
          <motion.div initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.7 }}
            className="absolute inset-0 flex items-center justify-center rounded-2xl"
            style={{ background: "rgba(0,0,0,0.45)" }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(4px)" }}>
              <Play className="w-4 h-4 text-white fill-white ml-0.5" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Logo */}
      <div className="w-11 h-11 flex items-center justify-center rounded-xl overflow-hidden"
        style={{ background: "rgba(255,255,255,0.05)" }}>
        {ch.logo && !logoError ? (
          <img src={ch.logo} alt={ch.name} className="w-9 h-9 object-contain"
            onError={() => setLogoError(true)} loading="lazy" />
        ) : (
          <Tv className="w-6 h-6 text-white/20" />
        )}
      </div>

      {/* Name */}
      <p className="text-xs font-semibold text-white/75 leading-tight line-clamp-2 w-full px-1"
        style={{ fontSize: "10px" }}>
        {ch.name.replace(/\s*\([\d]+p\)|\s*\[.*?\]/g, "").trim()}
      </p>

      {/* EPG current program */}
      {currentProgram && (
        <div className="w-full px-1">
          <p className="text-[9px] text-white/35 line-clamp-1 leading-tight">{currentProgram.title}</p>
          <p className="text-[8px] text-white/20 mt-0.5">
            {fmtTime(currentProgram.start)} – {fmtTime(currentProgram.stop)}
          </p>
        </div>
      )}
    </motion.button>
  );
}

// ── Main LiveTV view ─────────────────────────────────────────────
export function LiveTV() {
  const [selectedGroup, setSelectedGroup] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeChannel, setActiveChannel] = useState<LiveChannel | null>(null);

  const { data, isLoading } = useLiveChannels();
  
  const channels: LiveChannel[] = data?.channels ?? [];
  const groups: { id: string; label: string; count: number }[] = data?.groups ?? [];

  // Fetch EPG for all channels (tvg-id is the channel's id field)
  const allTvgIds = useMemo(() => channels.map((c) => c.id), [channels]);
  const { data: epgData } = useEpg(allTvgIds);

  const sortedGroups = [...groups].sort((a, b) => {
    const ai = GROUP_ORDER.indexOf(a.id);
    const bi = GROUP_ORDER.indexOf(b.id);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  const filtered = channels.filter((ch) => {
    const matchGroup = selectedGroup === "all" || ch.groups.includes(selectedGroup);
    const matchSearch = !searchQuery || ch.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchGroup && matchSearch;
  });

  return (
    <div>
      {/* Search + group chips */}
      <div className="mb-5 space-y-3">
        {/* Search bar */}
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/25 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar canal…"
            className="w-full pl-9 pr-4 py-2 rounded-xl text-sm text-white/80 placeholder-white/20 bg-white/5 border border-white/8 focus:outline-none focus:border-white/15 transition-colors"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Group chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={() => setSelectedGroup("all")}
            className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 border whitespace-nowrap ${
              selectedGroup === "all"
                ? "text-white bg-white/12 border-white/15"
                : "text-white/35 hover:text-white/60 border-transparent hover:border-white/10"
            }`}
          >
            Todos
            <span className="ml-1.5 text-[9px] text-white/30">{data?.total ?? 0}</span>
          </button>

          {sortedGroups.map((g) => (
            <button
              key={g.id}
              onClick={() => setSelectedGroup(g.id === selectedGroup ? "all" : g.id)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 border whitespace-nowrap ${
                selectedGroup === g.id
                  ? "text-white border-red-500/35"
                  : "text-white/35 hover:text-white/65 border-transparent hover:border-white/10"
              }`}
              style={selectedGroup === g.id ? { background: "rgba(239,68,68,0.10)" } : {}}
            >
              {GROUP_ES[g.id] ?? g.label}
              <span className="ml-1.5 text-[9px] text-white/30">{g.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Channel grid */}
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div key="sk" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-3">
            {[...Array(20)].map((_, i) => (
              <div key={i} className="aspect-square rounded-2xl shimmer"
                style={{ border: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.03)" }} />
            ))}
          </motion.div>
        ) : filtered.length > 0 ? (
          <motion.div key={`${selectedGroup}-${searchQuery}`}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-3">
            {filtered.map((ch, i) => (
              <motion.div key={ch.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.015, duration: 0.25 }}>
                <ChannelCard ch={ch} onClick={() => setActiveChannel(ch)} epg={epgData?.[ch.id]} />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-24 text-center">
            <Tv className="w-10 h-10 text-white/10 mb-3" />
            <p className="text-white/30 text-sm">No hay canales con ese filtro.</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Player modal */}
      <AnimatePresence>
        {activeChannel && (
          <PlayerModal channel={activeChannel} onClose={() => setActiveChannel(null)} epg={epgData?.[activeChannel.id]} />
        )}
      </AnimatePresence>
    </div>
  );
}
