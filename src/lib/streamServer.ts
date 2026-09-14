import fs from "fs/promises";
import path from "path";
import { RECITERS_LIST, Reciter } from "@/lib/quranStream";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AyahMeta {
  ayahNumber: number;
  surahNumber: number;
  surahName: string;
  surahArabicName: string;
  numberInSurah: number;
  size: number;
  duration: number;
  byteStart: number;
  byteEnd: number;
  startSec: number;
  endSec: number;
  url: string;
}

export interface JuzStaticData {
  juz: number;
  reciter: string;
  totalAyahs: number;
  totalSize: number;
  totalDuration: number;
  ayahs: AyahMeta[];
}

export interface StreamSlice {
  url: string;
  rangeHeader?: string;
}

// ─── In-Memory Cache ──────────────────────────────────────────────────────────

let cachedMetadata: Record<string, JuzStaticData> | null = null;

/**
 * Loads the pre-computed static metadata from disk.
 * Cached in memory so subsequent lookups take 0.001 ms.
 */
export async function loadJuzMetadata(): Promise<Record<string, JuzStaticData>> {
  if (cachedMetadata && Object.keys(cachedMetadata).length > 0) {
    return cachedMetadata;
  }

  try {
    const filePath = path.join(process.cwd(), "src/data/juzMetadata.json");
    const raw = await fs.readFile(filePath, "utf-8");
    cachedMetadata = JSON.parse(raw);
    return cachedMetadata || {};
  } catch (err) {
    console.warn("[streamServer] Warning: Failed to load juzMetadata.json:", err);
    return {};
  }
}

/**
 * Resolves the static metadata for a given Juz.
 */
export async function getJuzStaticMetadata(
  juz: number,
  _reciterParam?: string | number | null
): Promise<JuzStaticData | null> {
  const allData = await loadJuzMetadata();
  const data = allData[juz] || allData[juz.toString()];
  if (data && data.totalSize > 0) {
    return data;
  }
  return null;
}

/**
 * Resolves the Reciter by ID or fallback
 */
export function resolveReciter(reciterParam?: string | number | null): Reciter {
  if (!reciterParam) return RECITERS_LIST[0];

  const parsedId = typeof reciterParam === "number" ? reciterParam : parseInt(reciterParam, 10);
  if (!isNaN(parsedId)) {
    const found = RECITERS_LIST.find((r) => r.id === parsedId);
    if (found) return found;
  }

  if (typeof reciterParam === "string") {
    const lower = reciterParam.toLowerCase();
    const found = RECITERS_LIST.find((r) => r.name.toLowerCase().includes(lower));
    if (found) return found;
  }

  return RECITERS_LIST[0];
}

/**
 * Slices the Ayah files matching the requested byte range for HTTP 206 Partial Content.
 */
export function getStreamSlicesForRange(
  meta: JuzStaticData,
  start: number,
  end: number,
  reciterParam?: string | number | null
): StreamSlice[] {
  const slices: StreamSlice[] = [];
  const reciter = resolveReciter(reciterParam);
  const edition = reciter.editionIdentifier || "ar.alafasy";

  for (const ayah of meta.ayahs) {
    // Skip Ayahs outside the requested byte window
    if (ayah.byteEnd < start || ayah.byteStart > end) {
      continue;
    }

    const ayahSliceStart = Math.max(0, start - ayah.byteStart);
    const ayahSliceEnd = Math.min(ayah.size - 1, end - ayah.byteStart);

    // Build URL for active reciter edition (or fallback to ayah.url)
    const url =
      edition === "ar.alafasy"
        ? ayah.url
        : `https://cdn.islamic.network/quran/audio/128/${edition}/${ayah.ayahNumber}.mp3`;

    if (ayahSliceStart > 0 || ayahSliceEnd < ayah.size - 1) {
      slices.push({
        url,
        rangeHeader: `bytes=${ayahSliceStart}-${ayahSliceEnd}`,
      });
    } else {
      slices.push({ url });
    }
  }

  return slices;
}

// ─── Resilient Stream Pipe ────────────────────────────────────────────────────

/**
 * Creates a resilient ReadableStream sequentially piping audio chunks from CDNs.
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
