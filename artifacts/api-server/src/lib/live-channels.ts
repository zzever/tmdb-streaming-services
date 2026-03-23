import { readFileSync, existsSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

export interface LiveChannel { id: string; name: string; logo: string; groups: string[]; url: string; }

const __dirnameLive = dirname(fileURLToPath(import.meta.url));
const ASSETS_DIR = resolve(__dirnameLive, "../../../../attached_assets");

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

function fixStreamtheworldUrl(url: string): string {
  const m = url.match(/playerservices\.streamtheworld\.com\/api\/livestream-redirect\/(.+)$/i);
  if (m) return `https://25683.live.streamtheworld.com/${m[1]}`;
  return url;
}

function normalizeChannelName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, " ").replace(/[^a-z0-9 ]/g, "");
}

function deduplicateChannels(channels: LiveChannel[]): LiveChannel[] {
  const seenUrl = new Set<string>();
  const seenName = new Map<string, number>();
  const result: LiveChannel[] = [];

  for (const ch of channels) {
    const urlKey = ch.url.toLowerCase().trim();
    if (seenUrl.has(urlKey)) continue;
    seenUrl.add(urlKey);

    const nameKey = normalizeChannelName(ch.name);
    if (seenName.has(nameKey)) {
      const existingIdx = seenName.get(nameKey)!;
      const existing = result[existingIdx];
      const mergedGroups = [...new Set([...existing.groups, ...ch.groups])];
      result[existingIdx] = { ...existing, groups: mergedGroups };
    } else {
      seenName.set(nameKey, result.length);
      result.push(ch);
    }
  }
  return result;
}

function parseBouquetChannels(filename: string, defaultGroup: string): LiveChannel[] {
  const filePath = resolve(ASSETS_DIR, filename);
  if (!existsSync(filePath)) return [];
  const lines = readFileSync(filePath, "utf-8").split("\n");
  const channels: LiveChannel[] = [];
  const seen = new Set<string>();
  let pendingUrl: string | null = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (line.startsWith("#SERVICE 4097:") || line.startsWith("#SERVICE 5002:")) {
      const svcStr = line.slice("#SERVICE ".length);
      let pos = 0, colons = 0;
      while (pos < svcStr.length && colons < 10) { if (svcStr[pos] === ":") colons++; pos++; }
      if (colons < 10) { pendingUrl = null; continue; }
      const rest = svcStr.slice(pos);
      const lastColon = rest.lastIndexOf(":");
      const rawUrl = lastColon > 0 ? rest.slice(0, lastColon) : rest;
      if (rawUrl.includes("127.0.0.1") || rawUrl.includes("localhost") || rawUrl.includes("twitch.tv")) {
        pendingUrl = null; continue;
      }
      pendingUrl = rawUrl.replace(/%3a/gi, ":").replace(/%3b/gi, ";").replace(/%3d/gi, "=").replace(/%26/gi, "&").replace(/%40/gi, "@");
    } else if (line.startsWith("#DESCRIPTION ") && pendingUrl) {
      const name = line.slice("#DESCRIPTION ".length).trim();
      if (name && !name.startsWith("++") && !name.startsWith("●") && !name.startsWith("———") && !name.startsWith("---") && name.length < 80) {
        if (!seen.has(pendingUrl)) {
          seen.add(pendingUrl);
          const id = `bouquet:${defaultGroup.toLowerCase()}:${name.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").slice(0, 40)}`;
          channels.push({ id, name, logo: "", groups: [defaultGroup], url: pendingUrl });
        }
      }
      pendingUrl = null;
    } else if (line.startsWith("#SERVICE")) {
      pendingUrl = null;
    }
  }
  return channels;
}

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
          channels.push({ id: ch.epg_id ?? ch.name.replace(/\s+/g, ""), name: ch.name, logo: ch.logo ?? "", groups: [group], url });
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
        let url = lines[i + 1]?.trim();
        if (!url || !nameM || url.startsWith("#")) continue;
        url = fixStreamtheworldUrl(url);
        channels.push({ id: idM?.[1] ?? nameM[1].trim().replace(/\s+/g, ""), name: nameM[1].trim(), logo: logoM?.[1] ?? "", groups: ["Radio"], url });
      }
    }
  } catch { /* ignore */ }

  const spainExtra  = parseBouquetChannels("userbouquet.stream_spanje__es__1774280470925.tv", "España Extra");
  const usaChannels = parseBouquetChannels("userbouquet.stream_usa_1774280470925.tv", "USA");
  const musicChs    = parseBouquetChannels("userbouquet.stream_samsung_tv_plus_1774280470924.tv", "Música");

  channels.push(...spainExtra, ...usaChannels.slice(0, 300), ...musicChs);

  const deduped = deduplicateChannels(channels);

  if (deduped.length > 0) {
    cache = deduped;
    cachedAt = Date.now();
  }
  return cache;
}

getLiveChannels().catch(() => {});
