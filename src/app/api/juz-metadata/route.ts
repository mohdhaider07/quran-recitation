import { NextRequest, NextResponse } from "next/server";
import type { JuzMetadataResponse } from "@/lib/quranStream";
import {
  getJuzAudioMap,
  getSegmentStreamUrl,
  parseJuzParam,
  resolveReciter,
} from "@/lib/streamServer";

export const dynamic = "force-dynamic";

const round = (seconds: number) => Math.round(seconds * 100) / 100;

/**
 * GET /api/juz-metadata?juz=1&reciter=1
 * Returns the Juz timeline (total duration, stream segments and per-ayah offsets) so the player
 * can show progress and the current surah without decoding any audio.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const juz = parseJuzParam(searchParams.get("juz"));
  const reciter = resolveReciter(searchParams.get("reciter"));

  try {
    const map = await getJuzAudioMap(juz, reciter);
    if (!map) {
      return NextResponse.json({ error: `Metadata not found for Juz ${juz}` }, { status: 404 });
    }

    const body: JuzMetadataResponse = {
      juz,
      reciterId: reciter.id,
      totalDuration: round(map.totalDuration),
      segments: map.segments.map((segment) => ({
        url: getSegmentStreamUrl(map, segment.index),
        startSec: round(segment.startSec),
        duration: round(segment.duration),
      })),
      ayahs: map.segments.flatMap((segment) =>
        segment.ayahs.map((ayah) => ({
          ayahNumber: ayah.ayahNumber,
          surahNumber: ayah.surahNumber,
          numberInSurah: ayah.numberInSurah,
          startSec: round(ayah.startSec),
          endSec: round(ayah.startSec + ayah.duration),
        }))
      ),
    };

    return NextResponse.json(body, {
      headers: {
        // Not immutable: the timeline changes whenever the audio metadata is regenerated.
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("[api/juz-metadata] Error fetching metadata:", error);
    return NextResponse.json({ error: "Internal server error fetching metadata" }, { status: 500 });
  }
}
