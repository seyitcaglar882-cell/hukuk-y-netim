import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { AuthSessionProvider } from "@/components/layout/session-provider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Hukuk Bürosu Yönetim Sistemi",
  description: "Hukuk bürosu dosya, takvim ve finans yönetimi",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className={inter.variable}>
      <body className="font-sans antialiased">
        <AuthSessionProvider>
          {children}
        </AuthSessionProvider>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
