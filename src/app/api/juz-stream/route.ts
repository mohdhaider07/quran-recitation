import { NextRequest, NextResponse } from "next/server";
import {
  getJuzByteMap,
  createMultiAudioStream,
  resolveReciter,
  StreamSlice,
} from "@/lib/streamServer";

export const dynamic = "force-dynamic";

/**
 * GET /api/juz-stream?juz=1&reciter=1
 * Streams high-speed continuous audio for an entire Juz with full HTTP Range (seek) support.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const juzParam = parseInt(searchParams.get("juz") || "1", 10);
  const juz = Math.max(1, Math.min(30, isNaN(juzParam) ? 1 : juzParam));

  const reciterParam = searchParams.get("reciter");
  const reciter = resolveReciter(reciterParam);

  try {
    const byteMap = await getJuzByteMap(juz, reciter.id);

    if (!byteMap || byteMap.surahs.length === 0 || byteMap.totalSize === 0) {
      return NextResponse.json(
        { error: `No audio files available for Juz ${juz} with reciter ${reciter.name}.` },
        { status: 404 }
      );
    }

    const { totalSize, surahs } = byteMap;
    const rangeHeader = request.headers.get("range");

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

    // Filter and slice only the Surahs overlapping the requested byte range
    const slices: StreamSlice[] = [];
    for (const surah of surahs) {
      if (surah.endByte < start || surah.startByte > end) {
        continue;
      }

      const surahSliceStart = Math.max(0, start - surah.startByte);
      const surahSliceEnd = Math.min(surah.size - 1, end - surah.startByte);

      if (surahSliceStart > 0 || surahSliceEnd < surah.size - 1) {
        slices.push({
          url: surah.url,
          rangeHeader: `bytes=${surahSliceStart}-${surahSliceEnd}`,
        });
      } else {
        slices.push({ url: surah.url });
      }
    }

    const stream = createMultiAudioStream(slices, request.signal);

    const headers = new Headers({
      "Content-Type": "audio/mpeg",
      "Content-Length": contentLength.toString(),
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
      "Access-Control-Allow-Origin": "*",
    });

    if (isRangeRequest) {
      headers.set("Content-Range", `bytes ${start}-${end}/${totalSize}`);
      return new Response(stream, {
        status: 206,
        headers,
      });
    }

    return new Response(stream, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("[api/juz-stream] Stream error:", error);
    return NextResponse.json({ error: "Internal audio stream error" }, { status: 500 });
  }
}
