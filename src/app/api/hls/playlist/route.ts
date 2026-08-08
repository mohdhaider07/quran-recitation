import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Generates a dynamic HLS (.m3u8) VOD playlist for Safari native HLS.
 *
 * Safari's built-in media engine handles the M3U8 segment queue natively
 * in C++ — no JavaScript needed for track transitions. This means playback
 * continues even when the phone screen is locked and JS is suspended.
 *
 * Segments use direct CDN URLs. Safari fetches media segments as standard
 * browser media requests, which are exempt from CORS restrictions.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const juz = searchParams.get("juz") || "1";
  const reciter = searchParams.get("reciter") || "ar.abdulbasitmurattal";

  try {
    const response = await fetch(
      `https://api.alquran.cloud/v1/juz/${juz}/${reciter}`,
      { next: { revalidate: 86400 } }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch Quran data (${response.status})` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const ayahs = data?.data?.ayahs || [];

    if (!Array.isArray(ayahs) || ayahs.length === 0) {
      return NextResponse.json(
        { error: "No ayahs found for the specified Juz and Reciter." },
        { status: 404 }
      );
    }

    const lines: string[] = [
      "#EXTM3U",
      "#EXT-X-VERSION:3",
      "#EXT-X-TARGETDURATION:600",
      "#EXT-X-MEDIA-SEQUENCE:0",
      "#EXT-X-PLAYLIST-TYPE:VOD",
    ];

    for (const ayah of ayahs) {
      const audioUrl =
        typeof ayah.audio === "string" && ayah.audio.trim()
          ? ayah.audio.trim()
          : Array.isArray(ayah.audioSecondary) && ayah.audioSecondary[0]
          ? ayah.audioSecondary[0].trim()
          : null;

      if (audioUrl) {
        lines.push("#EXTINF:10,");
        lines.push(audioUrl);
      }
    }

    lines.push("#EXT-X-ENDLIST");

    return new Response(lines.join("\n"), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.apple.mpegurl",
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
      },
    });
  } catch (error) {
    console.error("Error generating HLS playlist:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
