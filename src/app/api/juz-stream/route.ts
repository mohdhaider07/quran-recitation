import { NextRequest, NextResponse } from "next/server";
import {
  createMultiAudioStream,
  getJuzAudioMap,
  getStreamSlicesForRange,
  parseJuzParam,
  resolveReciter,
} from "@/lib/streamServer";

export const dynamic = "force-dynamic";

/**
 * Open-ended range requests (`bytes=N-`, sent by Chrome and Android WebView) are answered with
 * at most this many bytes. Browsers request the next range when a 206 ends early, so a single
 * function invocation never has to stream a whole Juz (50–110 MB).
 */
const MAX_OPEN_RANGE_BYTES = 2 * 1024 * 1024;

type ByteRange = { start: number; end: number };

/** Parses a single-range `Range` header; null means "send the full body". */
function parseRange(header: string | null, size: number): ByteRange | "unsatisfiable" | null {
  const match = header?.trim().match(/^bytes=(\d*)-(\d*)$/);
  if (!match) return null;
  const [, startText, endText] = match;

  if (startText === "") {
    if (endText === "") return null;
    const suffixLength = Number(endText);
    if (suffixLength === 0) return "unsatisfiable";
    return { start: Math.max(0, size - suffixLength), end: size - 1 };
  }

  const start = Number(startText);
  if (start >= size) return "unsatisfiable";
  const end =
    endText === ""
      ? Math.min(size - 1, start + MAX_OPEN_RANGE_BYTES - 1)
      : Math.min(Number(endText), size - 1);
  return end < start ? "unsatisfiable" : { start, end };
}

/**
 * GET /api/juz-stream?juz=1&reciter=1&segment=0[&from=<ayahNumber>][&v=<version>]
 * Streams one segment of a Juz as a single continuous MP3 with HTTP Range (206) support.
 * `from` starts the stream at a given ayah (used to resume after a network failure).
 */
async function handle(request: NextRequest, includeBody: boolean): Promise<Response> {
  const { searchParams } = request.nextUrl;
  const juz = parseJuzParam(searchParams.get("juz"));
  const reciter = resolveReciter(searchParams.get("reciter"));
  const segmentIndex = parseInt(searchParams.get("segment") || "0", 10);
  const fromAyah = parseInt(searchParams.get("from") || "", 10);

  try {
    const map = await getJuzAudioMap(juz, reciter);
    const segment = map?.segments[segmentIndex];
    if (!map || !segment) {
      return NextResponse.json({ error: `No audio available for Juz ${juz}.` }, { status: 404 });
    }

    // Bytes before the requested starting ayah are not part of this stream.
    const base = segment.ayahs.find((a) => a.ayahNumber === fromAyah)?.streamStart ?? 0;
    const size = segment.totalSize - base;

    const range = parseRange(request.headers.get("range"), size);
    if (range === "unsatisfiable") {
      return new Response(null, {
        status: 416,
        headers: { "Content-Range": `bytes */${size}`, "Accept-Ranges": "bytes" },
      });
    }

    const { start, end } = range ?? { start: 0, end: size - 1 };
    const headers = new Headers({
      "Content-Type": "audio/mpeg",
      "Content-Length": String(end - start + 1),
      "Accept-Ranges": "bytes",
      // Versioned URLs never change content; unversioned ones may after a metadata update.
      "Cache-Control":
        searchParams.get("v") === map.version
          ? "public, max-age=604800, immutable"
          : "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
    });
    if (range) headers.set("Content-Range", `bytes ${start}-${end}/${size}`);

    const body = includeBody
      ? createMultiAudioStream(
          getStreamSlicesForRange(segment, base + start, base + end),
          request.signal
        )
      : null;
    return new Response(body, { status: range ? 206 : 200, headers });
  } catch (error) {
    console.error("[api/juz-stream] Stream error:", error);
    return NextResponse.json({ error: "Internal audio stream error" }, { status: 500 });
  }
}

export function GET(request: NextRequest) {
  return handle(request, true);
}

export function HEAD(request: NextRequest) {
  return handle(request, false);
}
