import { gunzipSync } from "zlib";

export interface EpgProgram { title: string; desc: string | null; start: number; stop: number; }

const epgCache = new Map<string, EpgProgram[]>();
let epgFetchedAt = 0;
const EPG_TTL = 60 * 60 * 1000;

const EPG_SOURCES_PLAIN = [
  "https://iptv-org.github.io/epg/guides/es/rtve.es.epg.xml",
  "https://iptv-org.github.io/epg/guides/es/antena3.com.epg.xml",
  "https://iptv-org.github.io/epg/guides/es/telecinco.es.epg.xml",
  "https://iptv-org.github.io/epg/guides/es/la2.es.epg.xml",
  "https://iptv-org.github.io/epg/guides/es/lasexta.com.epg.xml",
  "https://iptv-org.github.io/epg/guides/es/cuatro.com.epg.xml",
  "https://iptv-org.github.io/epg/guides/es/forta.es.epg.xml",
];

const EPG_SOURCES_GZIP = [
  "https://www.tdtchannels.com/epg/TV.xml.gz",
];

function parseXmltvTime(t: string): number {
  const y = +t.slice(0,4), mo = +t.slice(4,6)-1, d = +t.slice(6,8);
  const h = +t.slice(8,10), mi = +t.slice(10,12), s = +t.slice(12,14);
  return new Date(Date.UTC(y, mo, d, h, mi, s)).getTime();
}

function decodeHtmlEntities(s: string): string {
  return s.replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(+n));
}

function parseXmlInto(xml: string): void {
  const progRe = /<programme\s[^>]*start="(\d+)\s[^"]*"\s[^>]*stop="(\d+)\s[^"]*"\s[^>]*channel="([^"]+)"[^>]*>([\s\S]*?)<\/programme>/g;
  let m: RegExpExecArray | null;
  while ((m = progRe.exec(xml)) !== null) {
    const [, start, stop, chId, body] = m;
    const titleM = body.match(/<title[^>]*>([^<]+)<\/title>/);
    if (!titleM) continue;
    const descM = body.match(/<desc[^>]*>([^<]+)<\/desc>/);
    const prog: EpgProgram = {
      title: decodeHtmlEntities(titleM[1].trim()),
      desc: descM ? decodeHtmlEntities(descM[1].trim()) : null,
      start: parseXmltvTime(start),
      stop: parseXmltvTime(stop),
    };
    if (!epgCache.has(chId)) epgCache.set(chId, []);
    epgCache.get(chId)!.push(prog);
  }
}

async function fetchEpgSource(url: string): Promise<void> {
  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!resp.ok) return;
    parseXmlInto(await resp.text());
  } catch { /* ignore per-source errors */ }
}

async function fetchEpgGzip(url: string): Promise<void> {
  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!resp.ok) return;
    const buf = Buffer.from(await resp.arrayBuffer());
    const xml = gunzipSync(buf).toString("utf8");
    parseXmlInto(xml);
  } catch { /* ignore */ }
}

export async function ensureEpg(): Promise<void> {
  if (Date.now() - epgFetchedAt < EPG_TTL && epgCache.size > 0) return;
  epgFetchedAt = Date.now();
  epgCache.clear();
  await Promise.all([
    ...EPG_SOURCES_PLAIN.map(fetchEpgSource),
    ...EPG_SOURCES_GZIP.map(fetchEpgGzip),
  ]);
}

export function getCurrentAndNext(tvgId: string): { current: EpgProgram | null; next: EpgProgram | null } {
  const baseId = tvgId.replace(/@.*$/, "");
  const programs = epgCache.get(baseId) ?? epgCache.get(tvgId) ?? [];
  const now = Date.now();
  const current = programs.find(p => p.start <= now && p.stop > now) ?? null;
  const next = programs.find(p => p.start > now) ?? null;
  return { current, next };
}

export function getEpgCacheSize(): number { return epgCache.size; }
