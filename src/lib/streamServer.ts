import { JUZ_SURAHS_MAP, RECITERS_LIST, getSurahAudioUrl, Reciter } from "@/lib/quranStream";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SurahByteInfo {
  surahNumber: number;
  url: string;
  size: number;
  startByte: number;
  endByte: number;
}

export interface JuzByteMap {
  juz: number;
  reciterId: number;
  totalSize: number;
  surahs: SurahByteInfo[];
}

export interface StreamSlice {
  url: string;
  rangeHeader?: string;
}

// ─── In-Memory Caches ─────────────────────────────────────────────────────────

// Maps audio CDN URL to content-length in bytes
const surahSizeCache = new Map<string, number>();

// Maps `${juz}:${reciterId}` to full JuzByteMap
const juzByteMapCache = new Map<string, JuzByteMap>();

// Prevents redundant parallel builds for the same Juz and Reciter
const pendingMapBuilds = new Map<string, Promise<JuzByteMap | null>>();

// ─── Size Resolution ──────────────────────────────────────────────────────────

/**
 * Resolves the byte size of an audio file via HEAD request with fallback to Range: bytes=0-0.
 */
export async function getAudioFileSize(url: string): Promise<number> {
  const cached = surahSizeCache.get(url);
  if (cached !== undefined && cached > 0) {
    return cached;
  }

  try {
    let res = await fetch(url, { method: "HEAD" });

    // Retry once if upstream returns a transient 5xx error
    if (!res.ok && res.status >= 500) {
      await new Promise((r) => setTimeout(r, 100));
      res = await fetch(url, { method: "HEAD" });
    }

    let len = res.headers.get("content-length");

    // Fallback: Range request to extract total size from Content-Range header
    if (!len || parseInt(len, 10) <= 0) {
      const rangeRes = await fetch(url, { headers: { Range: "bytes=0-0" } });
      const contentRange = rangeRes.headers.get("content-range");
      if (contentRange) {
        const match = contentRange.match(/\/(\d+)$/);
        if (match) {
          len = match[1];
        }
      }
    }

    const size = len ? parseInt(len, 10) : 0;
    if (size > 0) {
      surahSizeCache.set(url, size);
    }
    return size;
  } catch (error) {
    console.warn(`[streamServer] Failed to fetch size for ${url}:`, error);
    return 0;
  }
}

/**
 * Resolves the Reciter by ID or fallback to default
 */
export function resolveReciter(reciterParam: string | number | null): Reciter {
  if (!reciterParam) return RECITERS_LIST[0];

  const parsedId = typeof reciterParam === "number" ? reciterParam : parseInt(reciterParam, 10);
  if (!isNaN(parsedId)) {
    const found = RECITERS_LIST.find((r) => r.id === parsedId);
    if (found) return found;
  }

  // Check by name substring match if passed string name
  if (typeof reciterParam === "string") {
    const lower = reciterParam.toLowerCase();
    const found = RECITERS_LIST.find((r) => r.name.toLowerCase().includes(lower));
    if (found) return found;
  }

  return RECITERS_LIST[0];
}

/**
 * Builds or retrieves the cached byte map for a given Juz and Reciter.
 */
export async function getJuzByteMap(juz: number, reciterId: number): Promise<JuzByteMap | null> {
  const cacheKey = `${juz}:${reciterId}`;

  const cached = juzByteMapCache.get(cacheKey);
  if (cached) return cached;

  const pending = pendingMapBuilds.get(cacheKey);
  if (pending) return pending;

  const buildPromise = (async () => {
    const surahNumbers = JUZ_SURAHS_MAP[juz] || [];
    if (surahNumbers.length === 0) return null;

    const urls = surahNumbers.map((sNum) => ({
      surahNumber: sNum,
      url: getSurahAudioUrl(sNum, reciterId),
    }));

    // Fetch sizes concurrently
    const sizes = await Promise.all(urls.map((item) => getAudioFileSize(item.url)));

    const surahs: SurahByteInfo[] = [];
    let currentOffset = 0;

    for (let i = 0; i < urls.length; i++) {
      const size = sizes[i];
      if (size <= 0) continue;

      surahs.push({
        surahNumber: urls[i].surahNumber,
        url: urls[i].url,
        size,
        startByte: currentOffset,
        endByte: currentOffset + size - 1,
      });

      currentOffset += size;
    }

    if (currentOffset === 0) return null;

    const byteMap: JuzByteMap = {
      juz,
      reciterId,
      totalSize: currentOffset,
      surahs,
    };

    juzByteMapCache.set(cacheKey, byteMap);
    return byteMap;
  })().finally(() => {
    pendingMapBuilds.delete(cacheKey);
  });

  pendingMapBuilds.set(cacheKey, buildPromise);
  return buildPromise;
}

// ─── Stream Pipe ──────────────────────────────────────────────────────────────

/**
 * Creates a resilient ReadableStream piping audio chunks sequentially from remote CDNs.
 */
export function createMultiAudioStream(
  slices: StreamSlice[],
  signal?: AbortSignal
): ReadableStream<Uint8Array> {
  let isCancelled = false;

  if (signal) {
    signal.addEventListener("abort", () => {
      isCancelled = true;
    });
  }

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      for (const slice of slices) {
        if (isCancelled) break;

        try {
          const headers: HeadersInit = slice.rangeHeader ? { Range: slice.rangeHeader } : {};

          let res = await fetch(slice.url, { headers });
          if (!res.ok && res.status >= 500) {
            await new Promise((r) => setTimeout(r, 100));
            res = await fetch(slice.url, { headers });
          }

          if (!res.ok || !res.body) {
            console.warn(`[streamServer] Skipping slice ${slice.url} due to HTTP ${res.status}`);
            continue;
          }

          const reader = res.body.getReader();
          while (!isCancelled) {
            const { done, value } = await reader.read();
            if (done || isCancelled) break;
            try {
              controller.enqueue(value);
            } catch {
              isCancelled = true;
              break;
            }
          }
        } catch (error) {
          if (!isCancelled) {
            console.warn(`[streamServer] Stream chunk error on ${slice.url}:`, error);
          }
        }
      }

      if (!isCancelled) {
        try {
          controller.close();
        } catch {
          // Closed by client
        }
      }
    },
    cancel() {
      isCancelled = true;
    },
  });
}
