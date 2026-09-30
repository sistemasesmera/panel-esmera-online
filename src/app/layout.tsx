import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: { default: "Esmera Online", template: "%s — Esmera Online" },
  description: "Panel de gestión interno de Esmera Online",
  icons: {
    icon: "/esmera-logo.png",
    shortcut: "/esmera-logo.png",
    apple: "/esmera-logo.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${montserrat.variable} h-full antialiased`}>
      <body className="h-full bg-background text-foreground">
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
