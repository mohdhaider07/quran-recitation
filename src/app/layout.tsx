import type { Metadata, Viewport } from "next";
import { Amiri } from "next/font/google";
import "./globals.css";
import Providers from "@/app/providers";
import ThemeBody from "@/components/ThemeBody";

const amiri = Amiri({
  subsets: ["arabic", "latin"],
  weight: ["400", "700"],
  variable: "--font-amiri",
  display: "swap",
  // Only used for a few Arabic names; don't compete with the initial page load.
  preload: false,
});

export const viewport: Viewport = {
  themeColor: "#f0fdfa",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // Prevent zooming issues on inputs
  viewportFit: "cover", // Enables the safe-area insets used by the body padding
};

// Icons come from the app/icon.png and app/apple-icon.png file conventions,
// and the web app manifest from app/manifest.ts.
export const metadata: Metadata = {
  title: "Peaceful Quran",
  description: "Listen to Quran with peaceful ambient sounds",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Peaceful Quran",
  },
  applicationName: "Peaceful Quran",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={amiri.variable}>
      <Providers>
        <ThemeBody>{children}</ThemeBody>
      </Providers>
    </html>
  );
}
