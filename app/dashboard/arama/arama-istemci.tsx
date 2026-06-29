"use client";

import { useState, useTransition, useRef } from "react";
import Link from "next/link";
import { Search, Users, FolderOpen, Building2, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { aramaYap } from "@/lib/actions/arama";
import { DosyaDurum } from "@prisma/client";

const NAVY = "#2d5a8e";

const DURUM_RENK: Record<DosyaDurum, string> = {
  ACIK: "bg-blue-50 text-blue-700 border border-blue-200",
  DERDEST: "bg-amber-50 text-amber-700 border border-amber-200",
  KARAR: "bg-purple-50 text-purple-700 border border-purple-200",
  TEMYIZ: "bg-orange-50 text-orange-700 border border-orange-200",
  KAPALI: "bg-gray-100 text-gray-500 border border-gray-200",
};

const DURUM_ETIKET: Record<DosyaDurum, string> = {
  ACIK: "Açık", DERDEST: "Derdest", KARAR: "Karar", TEMYIZ: "Temyiz", KAPALI: "Kapalı",
};

type AramaSonuc = Awaited<ReturnType<typeof aramaYap>>;

type Sekme = "tumu" | "muvekkillar" | "dosyalar";

function noFormatla(no: number | null) {
  if (!no) return null;
  return `#${String(no).padStart(3, "0")}`;
}

function initials(ad: string) {
  return ad.split(" ").slice(0, 2).map((s) => s[0] ?? "").join("").toUpperCase();
}

export function AramaIstemci() {
  const [sorgu, setSorgu] = useState("");
  const [sonuc, setSonuc] = useState<AramaSonuc | null>(null);
  const [aramaYapildi, setAramaYapildi] = useState(false);
  const [sekme, setSekme] = useState<Sekme>("tumu");
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function handleAra(e: React.FormEvent) {
    e.preventDefault();
    if (sorgu.trim().length < 2) return;
    startTransition(async () => {
      const veri = await aramaYap(sorgu);
      setSonuc(veri);
      setAramaYapildi(true);
      setSekme("tumu");
    });
  }

  const gosterilenMuvekkillar = sonuc?.muvekkillar ?? [];
  const gosterilenDosyalar = sonuc?.dosyalar ?? [];
  const toplamSonuc = gosterilenMuvekkillar.length + gosterilenDosyalar.length;

  const sekmeMuvekkillar = sekme === "tumu" || sekme === "muvekkillar" ? gosterilenMuvekkillar : [];
  const sekmeDosyalar = sekme === "tumu" || sekme === "dosyalar" ? gosterilenDosyalar : [];

  return (
    <div className="space-y-6">
      {/* Başlık */}
      <div className="rounded-xl overflow-hidden shadow-md">
        <div className="px-5 py-5" style={{ backgroundColor: NAVY }}>
          <div className="flex items-center gap-3 mb-4">
            <Search className="h-5 w-5 text-white/70" />
            <h1 className="text-lg font-bold text-white">Arama</h1>
          </div>
          {/* Arama formu */}
          <form onSubmit={handleAra} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 pointer-events-none" />
              <input
                ref={inputRef}
                type="text"
                value={sorgu}
                onChange={(e) => setSorgu(e.target.value)}
                placeholder="Müvekkil adı, TCKN, esas no, mahkeme..."
                className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm bg-white/10 border border-white/20 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/30 focus:bg-white/15 transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={isPending || sorgu.trim().length < 2}
              className="px-4 py-2.5 rounded-lg text-sm font-semibold bg-white text-[#2d5a8e] hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 shrink-0"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Ara
            </button>
          </form>
        </div>
      </div>

      {/* Sonuçlar */}
      {aramaYapildi && !isPending && (
        <div className="space-y-4">
          {/* Sekme bar + özet */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 rounded-lg border bg-card p-1">
              {(["tumu", "muvekkillar", "dosyalar"] as Sekme[]).map((s) => {
                const label = s === "tumu" ? `Tümü (${toplamSonuc})` : s === "muvekkillar" ? `Müvekkiller (${gosterilenMuvekkillar.length})` : `Dosyalar (${gosterilenDosyalar.length})`;
                return (
                  <button
                    key={s}
                    onClick={() => setSekme(s)}
                    className={cn(
                      "px-3 py-1.5 rounded-md text-xs font-semibold transition-colors",
                      sekme === s ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            {toplamSonuc === 0 && (
              <p className="text-sm text-muted-foreground">
                &quot;<span className="font-medium">{sorgu}</span>&quot; için sonuç bulunamadı
              </p>
            )}
          </div>

          {toplamSonuc === 0 ? (
            <div className="rounded-xl border bg-card px-4 py-16 text-center">
              <Search className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Farklı anahtar kelimeler deneyin</p>
            </div>
          ) : (
            <div className="space-y-4">

              {/* Müvekkil sonuçları */}
              {sekmeMuvekkillar.length > 0 && (
                <div className="rounded-xl overflow-hidden shadow-sm">
                  <div className="flex items-center gap-2 px-4 py-3" style={{ backgroundColor: NAVY }}>
                    <Users className="h-3.5 w-3.5" style={{ color: "rgba(255,255,255,0.55)" }} />
                    <p className="text-xs font-semibold text-white uppercase tracking-wide">Müvekkiller</p>
                    <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-white/15 text-white font-semibold">
                      {sekmeMuvekkillar.length}
                    </span>
                  </div>
                  <div className="bg-card divide-y">
                    {sekmeMuvekkillar.map((m) => (
                      <Link
                        key={m.id}
                        href={`/dashboard/muvekkillar/${m.id}`}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors group"
                      >
                        <div className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                          m.tip === "SIRKET" ? "bg-blue-100 text-blue-600" : "bg-muted text-foreground"
                        )}>
                          {m.tip === "SIRKET" ? <Building2 className="h-4 w-4" /> : initials(m.ad)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold truncate">{m.ad}</p>
                            {noFormatla(m.muvekkılNo) && (
                              <span className="text-[10px] font-mono text-muted-foreground shrink-0">{noFormatla(m.muvekkılNo)}</span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {m.tip === "KISI" ? "Bireysel" : "Kurumsal"}
                            {m.telefon && ` · ${m.telefon}`}
                            {m.email && ` · ${m.email}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs text-muted-foreground">{m._count.dosyalar} dosya</span>
                          <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Dosya sonuçları */}
              {sekmeDosyalar.length > 0 && (
                <div className="rounded-xl overflow-hidden shadow-sm">
                  <div className="flex items-center gap-2 px-4 py-3" style={{ backgroundColor: NAVY }}>
                    <FolderOpen className="h-3.5 w-3.5" style={{ color: "rgba(255,255,255,0.55)" }} />
                    <p className="text-xs font-semibold text-white uppercase tracking-wide">Dosyalar</p>
                    <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-white/15 text-white font-semibold">
                      {sekmeDosyalar.length}
                    </span>
                  </div>
                  <div className="bg-card divide-y">
                    {sekmeDosyalar.map((d) => (
                      <Link
                        key={d.id}
                        href={`/dashboard/dosyalar/${d.id}`}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors group"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
                          <FolderOpen className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">
                            {d.esasNo || d.dosyaNo || "Dosya"}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {d.muvekkil.ad}
                            {d.mahkeme && ` · ${d.mahkeme}`}
                            {d.avukat && ` · ${d.avukat.ad}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border", DURUM_RENK[d.durum])}>
                            {DURUM_ETIKET[d.durum]}
                          </span>
                          <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      )}

      {/* İlk yüklemede yardım metni */}
      {!aramaYapildi && !isPending && (
        <div className="rounded-xl border bg-card px-4 py-14 text-center">
          <Search className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
          <p className="text-sm font-medium text-muted-foreground mb-1">Müvekkil veya dosya arayın</p>
          <p className="text-xs text-muted-foreground/60">Ad, TCKN/VKN, esas numarası, mahkeme adı ile arama yapabilirsiniz</p>
        </div>
      )}

      {isPending && (
        <div className="rounded-xl border bg-card px-4 py-14 text-center">
          <Loader2 className="h-8 w-8 text-muted-foreground/40 mx-auto animate-spin" />
        </div>
      )}
    </div>
  );
}
