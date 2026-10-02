import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const cybrok = localFont({ src: "../cybrok-demo/Cybrok.ttf", variable: "--font-cybrok", display: "swap" });
const sprayPaint = localFont({ src: "../spray-paint-demo/SprayPaintDemoRegular.ttf", variable: "--font-spray", display: "swap" });

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PRODWB — Producer & Beatmaker",
  description:
    "Atmospheric sounds, cinematic melodies, and beats built for artists.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${cybrok.variable} ${sprayPaint.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
