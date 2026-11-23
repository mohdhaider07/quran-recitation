import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Peaceful Quran",
    short_name: "Peaceful Quran",
    description: "Listen to Quran with peaceful ambient sounds",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f0fdfa",
    theme_color: "#f0fdfa",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      // The icons are full-bleed with the mark inside the safe zone, so Android can crop them to its shape.
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
