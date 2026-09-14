import { NextRequest, NextResponse } from "next/server";
import { JUZ_SURAHS_MAP, getSurahAudioUrl } from "@/lib/quranStream";
import { resolveReciter } from "@/lib/streamServer";

export const dynamic = "force-dynamic";

/**
 * GET /api/hls/playlist?juz=1&reciter=1
 * Generates dynamic HLS (.m3u8) VOD playlist for Safari and iOS lock-screen playback.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const juzParam = parseInt(searchParams.get("juz") || "1", 10);
  const juz = Math.max(1, Math.min(30, isNaN(juzParam) ? 1 : juzParam));

  const reciterParam = searchParams.get("reciter");
  const reciter = resolveReciter(reciterParam);

  try {
    const surahNumbers = JUZ_SURAHS_MAP[juz] || [];

    if (surahNumbers.length === 0) {
      return NextResponse.json(
        { error: "No Surahs found for the specified Juz." },
        { status: 404 }
      );
    }

    const lines: string[] = [
      "#EXTM3U",
      "#EXT-X-VERSION:3",
      "#EXT-X-TARGETDURATION:3600",
      "#EXT-X-MEDIA-SEQUENCE:0",
      "#EXT-X-PLAYLIST-TYPE:VOD",
    ];

    for (const sNum of surahNumbers) {
      const audioUrl = getSurahAudioUrl(sNum, reciter.id);
      lines.push("#EXTINF:600,");
      lines.push(audioUrl);
    }

    lines.push("#EXT-X-ENDLIST");

    return new Response(lines.join("\n"), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.apple.mpegurl",
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("[api/hls/playlist] Generation error:", error);
    return NextResponse.json({ error: "Internal HLS playlist generation error" }, { status: 500 });
  }
}
