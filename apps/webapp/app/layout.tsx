import { REGISTRY_APP_NAME } from "@registry/config";
import { registryCssVariables } from "@registry/ui";
import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, Space_Grotesk } from "next/font/google";
import type { CSSProperties, PropsWithChildren } from "react";
import { AppShell } from "../src/components/app-shell";
import "./globals.css";

const sans = IBM_Plex_Sans({
  subsets: ["latin"],
  variable: "--rg-font-sans",
  weight: ["400", "500", "600"]
});

const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--rg-font-display",
  weight: ["500", "700"]
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--rg-font-mono",
  weight: ["400", "500"]
});

export const metadata: Metadata = {
  title: `${REGISTRY_APP_NAME} | tenra`,
  description: "tenra Registry is an operating system for storage-container rentals, receivables, documents, and reports."
};

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <body
        className={`${sans.variable} ${display.variable} ${mono.variable}`}
        style={registryCssVariables as CSSProperties}
      >
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
