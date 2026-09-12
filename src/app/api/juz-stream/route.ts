import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Streams an entire Juz as a single concatenated MP3.
 *
 * How it works:
 * 1. Fetches the Juz metadata from api.alquran.cloud to get all ayah audio URLs
 * 2. Creates a ReadableStream that fetches each ayah's MP3 sequentially
 * 3. Pipes the raw MP3 bytes back as one continuous audio/mpeg response
 *
 * Why this works:
 * - MP3 is a frame-based format. Each frame starts with a sync word (0xFFE0+)
 *   and is independently decodable. Concatenating multiple MP3 files produces
 *   a valid MP3 stream that any decoder can play seamlessly.
 * - ID3v2 tags embedded between tracks are silently skipped by decoders
 *   looking for the next sync word — no stripping needed.
 *
 * The result is a single ~30-40 min audio stream that the browser's <audio>
 * element plays natively — NO JavaScript-triggered fetches between tracks.
 * This survives Android/iOS screen lock because no JS is needed for playback.
 *
 * Query params:
 *   juz     — Juz number (1-30), default "1"
 *   reciter — Reciter identifier, default "ar.abdulbasitmurattal"
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const juz = searchParams.get("juz") || "1";
  const reciter = searchParams.get("reciter") || "ar.abdulbasitmurattal";

  try {
    // 1. Fetch ayah list from the Quran API
    const apiResponse = await fetch(
      `https://api.alquran.cloud/v1/juz/${juz}/${reciter}`,
      { next: { revalidate: 86400 } } // Cache for 24h
    );

    if (!apiResponse.ok) {
      return NextResponse.json(
        { error: `Failed to fetch Quran data (${apiResponse.status})` },
        { status: apiResponse.status }
      );
    }

    const data = await apiResponse.json();
    const ayahs = data?.data?.ayahs || [];

    if (!Array.isArray(ayahs) || ayahs.length === 0) {
      return NextResponse.json(
        { error: "No ayahs found for the specified Juz and Reciter." },
        { status: 404 }
      );
    }

    // 2. Extract audio URLs in order
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

    if (audioUrls.length === 0) {
      return NextResponse.json(
        { error: "No audio URLs available for this Juz/Reciter." },
        { status: 404 }
      );
    }

    // 3. Create a ReadableStream that concatenates all MP3s sequentially
    const stream = new ReadableStream({
      async start(controller) {
        for (let i = 0; i < audioUrls.length; i++) {
          try {
            const res = await fetch(audioUrls[i]);
            if (!res.ok || !res.body) {
              // Skip this ayah's audio if fetch fails
              console.warn(`Skipping ayah ${i + 1}: HTTP ${res.status} from ${audioUrls[i]}`);
              continue;
            }

            // Stream the MP3 bytes through chunk by chunk
            const reader = res.body.getReader();
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              controller.enqueue(value);
            }
          } catch (err) {
            // Network error for one ayah — skip and continue
            console.warn(`Skipping ayah ${i + 1} due to fetch error:`, err);
          }
        }
        controller.close();
      },
    });

    // 4. Return the stream as audio/mpeg
    //    No Content-Length since we're streaming (chunked transfer encoding).
    //    The browser will show duration as unknown until fully buffered,
    //    but playback starts immediately — which is what we need.
    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Transfer-Encoding": "chunked",
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("Error streaming Juz audio:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
