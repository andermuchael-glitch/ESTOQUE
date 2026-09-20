import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import PWARegister from "../components/PWARegister";

const publicPrefix = process.env.CAPACITOR_BUILD === "true" ? "" : "/ESTOQUE";

export const metadata: Metadata = {
  applicationName: "Controle de Estoque",
  title: {
    default: "ESTOQUE — Controle de Materiais",
    template: "%s | ESTOQUE",
  },
  description: "Controle offline de materiais e movimentações de estoque.",
  manifest: `${publicPrefix}/manifest.webmanifest`,
  icons: {
    icon: [
      { url: `${publicPrefix}/icons/icon-192.svg`, type: "image/svg+xml", sizes: "192x192" },
      { url: `${publicPrefix}/icons/icon-512.svg`, type: "image/svg+xml", sizes: "512x512" },
    ],
    apple: `${publicPrefix}/icons/icon-192.svg`,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Estoque",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#0b72ff",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <PWARegister />
        {children}
      </body>
    </html>
  );
}
