import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Streaming proxy for audio segments — used ONLY by the Blob pre-cache pipeline.
 *
 * The `<audio>` element's `.src` is CORS-exempt, but `fetch()` (used to download
 * audio as Blobs for lock-screen pre-caching) IS subject to CORS.
 * cdn.islamic.network does NOT send Access-Control-Allow-Origin headers.
 *
 * This route proxies the audio stream, adding CORS headers so the client-side
 * fetch() can download MP3 files as Blobs for in-memory pre-caching.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");

  if (!url) {
    return new Response("Missing 'url' parameter", { status: 400 });
  }

  try {
    const upstream = await fetch(url);

    if (!upstream.ok) {
      return new Response(`Upstream error: ${upstream.status}`, {
        status: upstream.status,
      });
    }

    return new Response(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": upstream.headers.get("Content-Type") || "audio/mpeg",
        "Content-Length": upstream.headers.get("Content-Length") || "",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  } catch (error) {
    console.error("Proxy error:", error);
    return new Response("Proxy fetch failed", { status: 502 });
  }
}
