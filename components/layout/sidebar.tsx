"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useState, useTransition } from "react";
import {
  LayoutDashboard,
  FolderOpen,
  Users,
  Calendar,
  FileArchive,
  BarChart3,
  LogOut,
  Scale,
  ChevronRight,
  UserCog,
  Settings,
  FileUp,
  Bell,
  X,
  CheckCheck,
  Shield,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Rol } from "@prisma/client";
import { bildirimleriGetir, bildirimOkundu, tumunuOku } from "@/lib/actions/bildirim";

type Bildirim = {
  id: string;
  tur: string;
  mesaj: string;
  okundu: boolean;
  olusturulma: Date;
};

const navItems: { href: string; label: string; icon: React.ElementType; roller: Rol[] }[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roller: ["PATRON", "AVUKAT", "SEKRETER"] },
  { href: "/dashboard/arama", label: "Arama", icon: Search, roller: ["PATRON", "AVUKAT", "SEKRETER"] },
  { href: "/dashboard/dosyalar", label: "Dosyalar", icon: FolderOpen, roller: ["PATRON", "AVUKAT", "SEKRETER"] },
  { href: "/dashboard/muvekkillar", label: "Müvekkiller", icon: Users, roller: ["PATRON", "AVUKAT", "SEKRETER"] },
  { href: "/dashboard/takvim", label: "Takvim", icon: Calendar, roller: ["PATRON", "AVUKAT", "SEKRETER"] },
  { href: "/dashboard/belgeler", label: "Belgeler", icon: FileArchive, roller: ["PATRON", "AVUKAT", "SEKRETER"] },
  { href: "/dashboard/patron/raporlar", label: "Raporlar", icon: BarChart3, roller: ["PATRON"] },
  { href: "/dashboard/uyap-import", label: "UYAP Import", icon: FileUp, roller: ["PATRON", "AVUKAT"] },
  { href: "/dashboard/patron/kullanicilar", label: "Kullanıcılar", icon: UserCog, roller: ["PATRON"] },
  { href: "/dashboard/patron/audit-log", label: "Aktivite Kaydı", icon: Shield, roller: ["PATRON"] },
  { href: "/dashboard/ayarlar", label: "Ayarlar", icon: Settings, roller: ["PATRON", "AVUKAT", "SEKRETER"] },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const rol = session?.user?.rol as Rol | undefined;

  const [bildirimler, setBildirimler] = useState<Bildirim[]>([]);
  const [panelAcik, setPanelAcik] = useState(false);
  const [isPending, startTransition] = useTransition();

  const okunmamisSayi = bildirimler.filter((b) => !b.okundu).length;

  useEffect(() => {
    if (!session) return;
    bildirimleriGetir()
      .then((data) => setBildirimler(data as Bildirim[]))
      .catch(() => {});
    const interval = setInterval(() => {
      bildirimleriGetir()
        .then((data) => setBildirimler(data as Bildirim[]))
        .catch(() => {});
    }, 60_000);
    return () => clearInterval(interval);
  }, [session]);

  function handleBildirimTikla(b: Bildirim) {
    if (!b.okundu) {
      startTransition(async () => {
        try {
          await bildirimOkundu(b.id);
          setBildirimler((prev) =>
            prev.map((x) => (x.id === b.id ? { ...x, okundu: true } : x))
          );
        } catch {}
      });
    }
  }

  function handleTumunuOku() {
    startTransition(async () => {
      try {
        await tumunuOku();
        setBildirimler((prev) => prev.map((x) => ({ ...x, okundu: true })));
      } catch {}
    });
  }

  const gorunurItems = navItems.filter((item) =>
    rol ? item.roller.includes(rol) : false
  );

  return (
    <>
      {panelAcik && (
        <div className="fixed inset-0 z-30" onClick={() => setPanelAcik(false)} />
      )}

      <aside className="flex flex-col w-64 min-h-screen relative z-40" style={{ backgroundColor: "#1a4a78" }}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.10)" }}>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: "rgba(255,255,255,0.15)" }}>
            <Scale className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white leading-tight">Hukuk Bürosu</p>
            <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.50)" }}>Yönetim Sistemi</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {gorunurItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-150",
                  active
                    ? "text-white"
                    : "hover:text-white hover:bg-white/15"
                )}
                style={active
                  ? { backgroundColor: "rgba(255,255,255,0.20)" }
                  : { color: "rgba(255,255,255,0.65)" }
                }
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {item.label}
                {active && <ChevronRight className="ml-auto h-3 w-3 opacity-60" />}
              </Link>
            );
          })}
        </nav>

        {/* Alt bölüm */}
        <div className="px-3 py-4 space-y-1" style={{ borderTop: "1px solid rgba(255,255,255,0.10)" }}>
          {/* Bildirim butonu */}
          <div className="relative">
            <button
              onClick={() => setPanelAcik((v) => !v)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-150 hover:text-white hover:bg-white/15"
              style={{ color: "rgba(255,255,255,0.65)" }}
            >
              <Bell className="h-4 w-4 shrink-0" />
              Bildirimler
              {okunmamisSayi > 0 && (
                <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                  {okunmamisSayi > 9 ? "9+" : okunmamisSayi}
                </span>
              )}
            </button>

            {/* Bildirim paneli */}
            {panelAcik && (
              <div className="absolute bottom-full left-0 mb-2 w-80 rounded-xl border bg-popover shadow-lg z-50">
                <div className="flex items-center justify-between px-4 py-3 border-b">
                  <span className="text-sm font-semibold">Bildirimler</span>
                  <div className="flex items-center gap-1">
                    {okunmamisSayi > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={handleTumunuOku}
                        disabled={isPending}
                      >
                        <CheckCheck className="h-3.5 w-3.5 mr-1" />
                        Tümünü oku
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => setPanelAcik(false)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="max-h-80 overflow-y-auto divide-y">
                  {bildirimler.length === 0 ? (
                    <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                      Bildirim yok
                    </div>
                  ) : (
                    bildirimler.map((b) => (
                      <button
                        key={b.id}
                        onClick={() => handleBildirimTikla(b)}
                        className={cn(
                          "w-full text-left px-4 py-3 text-sm transition-colors hover:bg-muted",
                          !b.okundu && "bg-primary/5"
                        )}
                      >
                        <div className="flex items-start gap-2">
                          {!b.okundu && (
                            <span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                          )}
                          <div className={cn(!b.okundu ? "" : "ml-4")}>
                            <p className={cn("leading-snug", !b.okundu && "font-medium")}>
                              {b.mesaj}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {new Date(b.olusturulma).toLocaleDateString("tr-TR", {
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Kullanıcı & çıkış */}
          <div className="flex items-center gap-3 px-3 py-2 mt-1">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white" style={{ backgroundColor: "rgba(255,255,255,0.20)" }}>
              {session?.user?.name?.[0]?.toUpperCase() ?? "?"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate">{session?.user?.name}</p>
              <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.45)" }}>{rol}</p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/giris" })}
              className="flex h-7 w-7 items-center justify-center rounded-md transition-all duration-150 hover:text-white hover:bg-white/15"
              style={{ color: "rgba(255,255,255,0.55)" }}
              title="Çıkış Yap"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
