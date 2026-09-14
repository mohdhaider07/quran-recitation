import { NextRequest, NextResponse } from "next/server";
import { getJuzStaticMetadata } from "@/lib/streamServer";

export const dynamic = "force-dynamic";

/**
 * GET /api/juz-metadata?juz=1&reciter=1
 * Returns pre-computed static metadata (total duration, total size, and Ayah time offsets)
 * for immediate 0ms rendering on the frontend.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const juzParam = parseInt(searchParams.get("juz") || "1", 10);
  const juz = Math.max(1, Math.min(30, isNaN(juzParam) ? 1 : juzParam));
  const reciterParam = searchParams.get("reciter") || "1";

  try {
    const meta = await getJuzStaticMetadata(juz, reciterParam);
    if (!meta) {
      return NextResponse.json({ error: `Metadata not found for Juz ${juz}` }, { status: 404 });
    }

    return NextResponse.json(
      {
        juz: meta.juz,
        reciter: meta.reciter,
        totalDuration: meta.totalDuration,
        totalSize: meta.totalSize,
        totalAyahs: meta.totalAyahs,
        ayahs: meta.ayahs.map((a) => ({
          ayahNumber: a.ayahNumber,
          surahNumber: a.surahNumber,
          surahName: a.surahName,
          surahArabicName: a.surahArabicName,
          numberInSurah: a.numberInSurah,
          startSec: a.startSec,
          endSec: a.endSec,
          duration: a.duration,
        })),
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, max-age=86400, s-maxage=604800, immutable",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error) {
    console.error("[api/juz-metadata] Error fetching metadata:", error);
    return NextResponse.json({ error: "Internal server error fetching metadata" }, { status: 500 });
  }
}
