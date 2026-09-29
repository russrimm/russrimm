import { XMLParser } from "fast-xml-parser";

export interface Post {
  title: string;
  link: string;
  date: string;
}

export interface PingResult {
  ok: boolean;
  status: number | null;
  ms: number | null;
  checkedAt: string;
}

export async function fetchPosts(url: string, count: number): Promise<Post[] | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(20_000), headers: { "User-Agent": "russrimm-profile" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = new XMLParser({ ignoreAttributes: true }).parse(await res.text()) as {
      rss?: { channel?: { item?: unknown } };
    };
    const raw = xml.rss?.channel?.item;
    const items = (Array.isArray(raw) ? raw : raw ? [raw] : []) as { title?: unknown; link?: unknown; pubDate?: unknown }[];
    return items
      .map((i) => ({
        title: String(i.title ?? "").trim(),
        link: String(i.link ?? "").trim(),
        date: i.pubDate ? new Date(String(i.pubDate)).toISOString().slice(0, 10) : "",
      }))
      .filter((p) => p.title && p.link.startsWith("https://"))
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, count);
  } catch (err) {
    console.warn(`• RSS feed unavailable (${(err as Error).message}).`);
    return null;
  }
}

export async function ping(url: string, now: Date): Promise<PingResult> {
  const checkedAt = now.toISOString().slice(0, 10);
  const started = performance.now();
  try {
    const res = await fetch(url, { method: "GET", redirect: "follow", signal: AbortSignal.timeout(15_000), headers: { "User-Agent": "russrimm-profile" } });
    const ms = Math.round(performance.now() - started);
    await res.body?.cancel();
    return { ok: res.ok, status: res.status, ms, checkedAt };
  } catch {
    return { ok: false, status: null, ms: null, checkedAt };
  }
}
