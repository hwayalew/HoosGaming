import type { Metadata } from "next";
import { Orbitron, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Auth0ReactProvider } from "@/components/Auth0ReactProvider";
import { CustomCursor } from "@/components/CustomCursor";
import { SWRProvider } from "@/components/SWRProvider";

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
    "Hoos Gaming deploys 89 specialized agents in parallel to build a full video game from a single prompt. Powered by IBM watsonx Orchestrate.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${orbitron.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <SWRProvider>
          <Auth0ReactProvider>
            <CustomCursor />
            {children}
          </Auth0ReactProvider>
        </SWRProvider>
      </body>
    </html>
  );
}
