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
});

export const viewport: Viewport = {
  themeColor: "#020617",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // Prevent zooming issues on inputs
};

export const metadata: Metadata = {
  title: "Peaceful Quran",
  description: "Listen to Quran with peaceful ambient sounds",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Peaceful Quran",
  },
  applicationName: "Peaceful Quran",
  icons: {
    icon: "/icon",
    apple: "/apple-icon",
  },
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
