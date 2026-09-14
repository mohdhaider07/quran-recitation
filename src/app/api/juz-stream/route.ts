import { NextRequest, NextResponse } from "next/server";
import {
  getJuzStaticMetadata,
  getStreamSlicesForRange,
  createMultiAudioStream,
  resolveReciter,
} from "@/lib/streamServer";

export const dynamic = "force-dynamic";

/**
 * GET /api/juz-stream?juz=1&reciter=1
 * Streams continuous audio for an entire Juz with instant 0ms startup and full HTTP Range (seek) support.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const juzParam = parseInt(searchParams.get("juz") || "1", 10);
  const juz = Math.max(1, Math.min(30, isNaN(juzParam) ? 1 : juzParam));

  const reciterParam = searchParams.get("reciter");
  const reciter = resolveReciter(reciterParam);

  try {
    const meta = await getJuzStaticMetadata(juz, reciter.id);

    if (!meta || meta.ayahs.length === 0 || meta.totalSize === 0) {
      return NextResponse.json(
        { error: `No audio metadata available for Juz ${juz}.` },
        { status: 404 }
      );
    }

    const { totalSize } = meta;
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
    const slices = getStreamSlicesForRange(meta, start, end, reciter.id);
    const stream = createMultiAudioStream(slices, request.signal);

    const headers = new Headers({
      "Content-Type": "audio/mpeg",
      "Content-Length": contentLength.toString(),
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=86400, s-maxage=604800, immutable",
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
