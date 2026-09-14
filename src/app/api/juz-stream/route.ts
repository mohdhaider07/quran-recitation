import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface AyahInfo {
  url: string;
  size: number;
  startByte: number; // Cumulative start byte offset (inclusive)
  endByte: number; // Cumulative end byte offset (inclusive)
}

interface JuzByteMap {
  totalSize: number;
  ayahs: AyahInfo[];
}

// In-memory cache for byte maps to make seeking and repeat plays instant
const byteMapCache = new Map<string, JuzByteMap>();
const pendingMapBuilds = new Map<string, Promise<JuzByteMap | null>>();

// In-memory cache for raw ayah URLs per juz:reciter
const ayahUrlsCache = new Map<string, string[]>();

/**
 * Concurrently fetches file sizes via HEAD requests with moderate concurrency
 * to avoid CDN rate-limiting and 502 Bad Gateway responses.
 */
async function getAudioSizes(urls: string[]): Promise<number[]> {
  const sizes = new Array<number>(urls.length).fill(0);
  const concurrency = 6; // Gentle concurrency to avoid 502 errors from CDN
  let idx = 0;

  async function worker() {
    while (idx < urls.length) {
      const i = idx++;
      try {
        let res = await fetch(urls[i], { method: "HEAD" });
        if (!res.ok && res.status >= 500) {
          // Retry once on server/CDN glitch
          await new Promise((r) => setTimeout(r, 100));
          res = await fetch(urls[i], { method: "HEAD" });
        }
        let len = res.headers.get("content-length");
        if (!len || parseInt(len, 10) <= 0) {
          // Fallback: Range request to extract total size from Content-Range header
          res = await fetch(urls[i], { headers: { Range: "bytes=0-0" } });
          const contentRange = res.headers.get("content-range");
          if (contentRange) {
            const match = contentRange.match(/\/(\d+)$/);
            if (match) len = match[1];
          }
        }
        sizes[i] = len ? parseInt(len, 10) : 0;
      } catch (err) {
        console.warn(`Failed fetching size for ${urls[i]}:`, err);
        sizes[i] = 0;
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, urls.length) }, () => worker());
  await Promise.all(workers);
  return sizes;
}

/**
 * Fetches the list of Ayah audio URLs for a Juz. Fast (~200ms).
 */
async function getJuzAudioUrls(juz: string, reciter: string): Promise<string[]> {
  const cacheKey = `${juz}:${reciter}`;
  const cached = ayahUrlsCache.get(cacheKey);
  if (cached) return cached;

  const apiResponse = await fetch(`https://api.alquran.cloud/v1/juz/${juz}/${reciter}`, {
    next: { revalidate: 86400 },
  });

  if (!apiResponse.ok) {
    throw new Error(`Failed to fetch Quran data (${apiResponse.status})`);
  }

  const data = await apiResponse.json();
  const ayahs = data?.data?.ayahs || [];
  if (!Array.isArray(ayahs) || ayahs.length === 0) {
    return [];
  }

  const audioUrls: string[] = [];
  for (const ayah of ayahs) {
    const url =
      typeof ayah.audio === "string" && ayah.audio.trim()
        ? ayah.audio.trim()
        : Array.isArray(ayah.audioSecondary) && ayah.audioSecondary[0]
          ? ayah.audioSecondary[0].trim()
          : null;
    if (url) {
      audioUrls.push(url);
    }
  }

  if (audioUrls.length > 0) {
    ayahUrlsCache.set(cacheKey, audioUrls);
  }
  return audioUrls;
}

/**
 * Builds or retrieves the cached byte map for a specific Juz and Reciter.
 */
async function getJuzByteMap(juz: string, reciter: string): Promise<JuzByteMap | null> {
  const cacheKey = `${juz}:${reciter}`;
  const cached = byteMapCache.get(cacheKey);
  if (cached) return cached;

  if (pendingMapBuilds.has(cacheKey)) {
    return pendingMapBuilds.get(cacheKey)!;
  }

  const buildPromise = (async () => {
    const audioUrls = await getJuzAudioUrls(juz, reciter);
    if (audioUrls.length === 0) {
      return null;
    }

    const sizes = await getAudioSizes(audioUrls);

    const mappedAyahs: AyahInfo[] = [];
    let currentOffset = 0;

    for (let i = 0; i < audioUrls.length; i++) {
      const size = sizes[i];
      if (size <= 0) continue;

      mappedAyahs.push({
        url: audioUrls[i],
        size,
        startByte: currentOffset,
        endByte: currentOffset + size - 1,
      });
      currentOffset += size;
    }

    const byteMap: JuzByteMap = {
      totalSize: currentOffset,
      ayahs: mappedAyahs,
    };

    if (byteMap.totalSize > 0) {
      byteMapCache.set(cacheKey, byteMap);
    }
    return byteMap;
  })().finally(() => {
    pendingMapBuilds.delete(cacheKey);
  });

  pendingMapBuilds.set(cacheKey, buildPromise);
  return buildPromise;
}

/**
 * Helper to create a resilient streaming response from a list of audio URLs.
 */
function createAudioStream(
  items: { url: string; rangeHeader?: string }[]
): ReadableStream<Uint8Array> {
  let isCancelled = false;

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      for (const item of items) {
        if (isCancelled) break;

        try {
          const fetchHeaders: HeadersInit = item.rangeHeader ? { Range: item.rangeHeader } : {};

          let res = await fetch(item.url, { headers: fetchHeaders });
          if (!res.ok && res.status >= 500) {
            // Retry on transient 502/503 CDN error
            await new Promise((r) => setTimeout(r, 100));
            res = await fetch(item.url, { headers: fetchHeaders });
          }

          if (!res.ok || !res.body) {
            console.warn(`Skipping ayah ${item.url} due to HTTP ${res.status}`);
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
        } catch (err) {
          if (!isCancelled) {
            console.warn(`Error streaming ayah from ${item.url}:`, err);
          }
        }
      }

      if (!isCancelled) {
        try {
          controller.close();
        } catch {
          // Controller might have been closed by consumer
        }
      }
    },
    cancel() {
      isCancelled = true;
    },
  });
}

/**
 * Handles GET request with HTTP Range support and instant TTFB for start-of-stream requests.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const juz = searchParams.get("juz") || "1";
  const reciter = searchParams.get("reciter") || "ar.abdulbasitmurattal";

  try {
    const rangeHeader = request.headers.get("range");
    const isStartPlay = !rangeHeader || rangeHeader === "bytes=0-" || rangeHeader === "bytes=0";

    // Fast path: If user just pressed Play from start and cache isn't built yet,
    // start streaming IMMEDIATELY without waiting 20s for 200 HEAD requests!
    const cacheKey = `${juz}:${reciter}`;
    const cachedByteMap = byteMapCache.get(cacheKey);

    if (isStartPlay && !cachedByteMap) {
      const audioUrls = await getJuzAudioUrls(juz, reciter);
      if (audioUrls.length === 0) {
        return NextResponse.json(
          { error: "No audio files found for this Juz and Reciter." },
          { status: 404 }
        );
      }

      // Trigger background byte-map calculation non-blockingly for future seeking
      getJuzByteMap(juz, reciter).catch((err) =>
        console.warn("Background byte map build error:", err)
      );

      const stream = createAudioStream(audioUrls.map((url) => ({ url })));

      return new Response(stream, {
        status: 200,
        headers: {
          "Content-Type": "audio/mpeg",
          "Accept-Ranges": "bytes",
          "Cache-Control": "public, max-age=3600, s-maxage=86400",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // Standard / Seeking path: Use byte map
    const byteMap = await getJuzByteMap(juz, reciter);

    if (!byteMap || byteMap.ayahs.length === 0 || byteMap.totalSize === 0) {
      return NextResponse.json(
        { error: "No audio files found for this Juz and Reciter." },
        { status: 404 }
      );
    }

    const { totalSize, ayahs } = byteMap;

    let start = 0;
    let end = totalSize - 1;
    let isRangeRequest = false;

    if (rangeHeader && rangeHeader.startsWith("bytes=")) {
      isRangeRequest = true;
      const parts = rangeHeader.replace(/bytes=/, "").split("-");
      const parsedStart = parseInt(parts[0], 10);
      const parsedEnd = parts[1] ? parseInt(parts[1], 10) : end;

      if (!isNaN(parsedStart)) {
        start = Math.max(0, Math.min(parsedStart, totalSize - 1));
      }
      if (!isNaN(parsedEnd)) {
        end = Math.max(start, Math.min(parsedEnd, totalSize - 1));
      }

      if (start >= totalSize || start > end) {
        return new Response(null, {
          status: 416,
          headers: {
            "Content-Range": `bytes */${totalSize}`,
            "Accept-Ranges": "bytes",
          },
        });
      }
    }

    const contentLength = end - start + 1;

    // Find overlapping ayahs
    const relevantAyahs: { url: string; rangeHeader?: string }[] = [];
    for (const ayah of ayahs) {
      if (ayah.endByte < start || ayah.startByte > end) {
        continue;
      }

      const ayahStart = Math.max(0, start - ayah.startByte);
      const ayahEnd = Math.min(ayah.size - 1, end - ayah.startByte);

      if (ayahStart > 0 || ayahEnd < ayah.size - 1) {
        relevantAyahs.push({
          url: ayah.url,
          rangeHeader: `bytes=${ayahStart}-${ayahEnd}`,
        });
      } else {
        relevantAyahs.push({ url: ayah.url });
      }
    }

    const stream = createAudioStream(relevantAyahs);

    const responseHeaders = new Headers({
      "Content-Type": "audio/mpeg",
      "Content-Length": contentLength.toString(),
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
      "Access-Control-Allow-Origin": "*",
    });

    if (isRangeRequest) {
      responseHeaders.set("Content-Range", `bytes ${start}-${end}/${totalSize}`);
      return new Response(stream, {
        status: 206,
        headers: responseHeaders,
      });
    }

    return new Response(stream, {
      status: 200,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("Error streaming Juz audio:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
