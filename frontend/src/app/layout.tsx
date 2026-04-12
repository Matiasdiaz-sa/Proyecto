import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Analista de Reseñas IA",
  description: "Análisis profesional de reseñas con inteligencia artificial. Obtené insights accionables sobre la reputación de tu negocio.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="es" className={`${inter.variable} h-full`}>
        <body className="min-h-full">{children}</body>
      </html>
    </ClerkProvider>
  );
}
