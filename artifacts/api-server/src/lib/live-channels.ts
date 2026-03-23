export interface LiveChannel { id: string; name: string; logo: string; groups: string[]; url: string; }

const AMBIT_TO_GROUP: Record<string, string> = {
  "Generalistas": "General", "Informativos": "News", "Deportivos": "Sports",
  "Infantiles": "Kids", "Eventuales": "Entertainment", "Streaming": "Entertainment",
  "Andalucía": "Regional", "Aragón": "Regional", "Canarias": "Regional",
  "Cantabria": "Regional", "Castilla-La Mancha": "Regional", "Castilla y León": "Regional",
  "Cataluña": "Regional", "Ceuta": "Regional", "C. de Madrid": "Regional",
  "C. Foral de Navarra": "Regional", "C. Valenciana": "Regional", "Extremadura": "Regional",
  "Galicia": "Regional", "Illes Balears": "Regional", "La Rioja": "Regional",
  "Melilla": "Regional", "País Vasco": "Regional", "P. de Asturias": "Regional",
  "R. de Murcia": "Regional",
};

let cache: LiveChannel[] = [];
let cachedAt = 0;
const TTL = 6 * 60 * 60 * 1000;

export async function getLiveChannels(): Promise<LiveChannel[]> {
  if (Date.now() - cachedAt < TTL && cache.length > 0) return cache;

  const channels: LiveChannel[] = [];

  try {
    const resp = await fetch("https://www.tdtchannels.com/lists/tv.json", { signal: AbortSignal.timeout(12000) });
    if (resp.ok) {
      const data = await resp.json() as any;
      const spain = (data.countries ?? []).find((c: any) => c.name === "Spain");
      for (const ambit of (spain?.ambits ?? [])) {
        const group = AMBIT_TO_GROUP[ambit.name] ?? "Regional";
        for (const ch of (ambit.channels ?? [])) {
          const m3u8Opt = (ch.options ?? []).find((o: any) => o.format === "m3u8");
          const url = m3u8Opt?.url ?? ch.options?.[0]?.url;
          if (!url) continue;
          channels.push({
            id:     ch.epg_id ?? ch.name.replace(/\s+/g, ""),
            name:   ch.name,
            logo:   ch.logo ?? "",
            groups: [group],
            url,
          });
        }
      }
    }
  } catch { /* ignore */ }

  try {
    const resp = await fetch("https://www.tdtchannels.com/lists/radio.m3u", { signal: AbortSignal.timeout(10000) });
    if (resp.ok) {
      const text = await resp.text();
      const lines = text.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line.startsWith("#EXTINF")) continue;
        const logoM = line.match(/tvg-logo="([^"]*)"/);
        const idM   = line.match(/tvg-id="([^"]*)"/);
        const nameM = line.match(/,(.+)$/);
        const url   = lines[i + 1]?.trim();
        if (!url || !nameM || url.startsWith("#")) continue;
        channels.push({
          id:     idM?.[1] ?? nameM[1].trim().replace(/\s+/g, ""),
          name:   nameM[1].trim(),
          logo:   logoM?.[1] ?? "",
          groups: ["Radio"],
          url,
        });
      }
    }
  } catch { /* ignore */ }

  if (channels.length > 0) {
    cache = channels;
    cachedAt = Date.now();
  }
  return cache;
}

getLiveChannels().catch(() => {});
