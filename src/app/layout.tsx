import type { Metadata } from "next";
import { Orbitron, JetBrains_Mono } from "next/font/google";
import { Auth0Provider } from "@auth0/nextjs-auth0/client";
import "./globals.css";
import { CustomCursor } from "@/components/CustomCursor";

const orbitron = Orbitron({
  subsets: ["latin"],
  weight: ["400", "600", "700", "900"],
  variable: "--font-orbitron",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Hoos Gaming — Build Any Game With One Prompt",
  description:
    "Hoos Gaming deploys 78 specialized agents in parallel to build a full video game from a single prompt. Powered by IBM watsonx Orchestrate.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${orbitron.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Auth0Provider>
          <CustomCursor />
          {children}
        </Auth0Provider>
      </body>
    </html>
  );
}
