"use client";

import { useState, useTransition } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { belgeSil, belgeleriFiltrele } from "@/lib/actions/belge";
import { toast } from "sonner";
import {
  FileArchive, Search, Trash2, Download, Eye,
  FileText, FileSpreadsheet, Image, File, FolderOpen,
  Users, CheckCircle2, X, Loader2,
} from "lucide-react";
import Link from "next/link";
import { BelgeTur } from "@prisma/client";
import { cn } from "@/lib/utils";
import { BelgeOnizleme } from "@/components/belge-onizleme";

const NAVY = "#2d5a8e";

const TUR_ETIKET: Record<BelgeTur, string> = {
  VEKALETNAME: "Vekaletname",
  DILEKCE: "Dilekçe",
  SOZLESME: "Sözleşme",
  KARAR: "Mahkeme Kararı",
  TUTANAK: "Tutanak",
  MAKBUZ: "Makbuz",
  DIGER: "Diğer",
};

const TUR_RENK: Record<BelgeTur, string> = {
  VEKALETNAME: "bg-purple-50 text-purple-700 border-purple-200",
  DILEKCE: "bg-blue-50 text-blue-700 border-blue-200",
  SOZLESME: "bg-emerald-50 text-emerald-700 border-emerald-200",
  KARAR: "bg-amber-50 text-amber-700 border-amber-200",
  TUTANAK: "bg-orange-50 text-orange-700 border-orange-200",
  MAKBUZ: "bg-teal-50 text-teal-700 border-teal-200",
  DIGER: "bg-gray-50 text-gray-600 border-gray-200",
};

const ONIZLENEBILIR = [
  "application/pdf",
  "image/jpeg", "image/png", "image/webp",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

type MuvekkılOzet = { id: string; ad: string; muvekkılNo: number | null };
type DosyaOzet = { id: string; esasNo: string | null; dosyaNo: string | null; muvekkil: { ad: string } };

type Belge = {
  id: string;
  ad: string;
  boyut: number;
  mimeTipi: string;
  tur: BelgeTur;
  aciklama: string | null;
  yuklendi: string;
  dosyaId: string;
  dosya: {
    id: string;
    esasNo: string | null;
    dosyaNo: string | null;
    muvekkil: { ad: string };
    avukat: { ad: string; mtPrefiks: boolean } | null;
  };
};

function boyutFormatla(bayt: number): string {
  if (bayt < 1024) return `${bayt} B`;
  if (bayt < 1024 * 1024) return `${(bayt / 1024).toFixed(1)} KB`;
  return `${(bayt / (1024 * 1024)).toFixed(1)} MB`;
}

function dosyaIkonu(mime: string) {
  if (mime === "application/pdf") return <FileText className="h-4 w-4 text-red-500" />;
  if (mime.includes("spreadsheet") || mime.includes("excel")) return <FileSpreadsheet className="h-4 w-4 text-green-600" />;
  if (mime.startsWith("image/")) return <Image className="h-4 w-4 text-blue-500" />;
  if (mime.includes("word")) return <FileText className="h-4 w-4 text-blue-600" />;
  return <File className="h-4 w-4 text-muted-foreground" />;
}

export function BelgelerIstemci({
  muvekkillar,
  dosyalar,
}: {
  muvekkillar: MuvekkılOzet[];
  dosyalar: DosyaOzet[];
}) {
  const [filtreTip, setFiltreTip] = useState<"muvekkil" | "dosya">("muvekkil");
  const [listeArama, setListeArama] = useState("");
  const [seciliId, setSeciliId] = useState<string | null>(null);
  const [seciliLabel, setSeciliLabel] = useState("");
  const [belgeler, setBelgeler] = useState<Belge[]>([]);
  const [belgelerYukleniyor, startBelgeTransition] = useTransition();

  const [arama, setArama] = useState("");
  const [turFiltre, setTurFiltre] = useState<BelgeTur | "TUMU">("TUMU");
  const [onizlenen, setOnizlenen] = useState<Belge | null>(null);
  const [silPending, startSilTransition] = useTransition();

  const filtreliMuvekkillar = filtreTip === "muvekkil"
    ? muvekkillar.filter(m => !listeArama || m.ad.toLowerCase().includes(listeArama.toLowerCase()))
    : [];

  const filtreliDosyalar = filtreTip === "dosya"
    ? dosyalar.filter(d =>
        !listeArama ||
        d.muvekkil.ad.toLowerCase().includes(listeArama.toLowerCase()) ||
        (d.esasNo ?? d.dosyaNo ?? "").toLowerCase().includes(listeArama.toLowerCase())
      )
    : [];

  const toplamSonuc = filtreTip === "muvekkil" ? filtreliMuvekkillar.length : filtreliDosyalar.length;

  function handleSecim(id: string, label: string) {
    setSeciliId(id);
    setSeciliLabel(label);
    setListeArama("");
    setArama("");
    setTurFiltre("TUMU");
    startBelgeTransition(async () => {
      try {
        const sonuc = await belgeleriFiltrele(
          filtreTip === "muvekkil" ? { muvekkılId: id } : { dosyaId: id }
        );
        setBelgeler(
          sonuc.map((b) => ({
            id: b.id,
            ad: b.ad,
            boyut: b.boyut,
            mimeTipi: b.mimeTipi,
            tur: b.tur,
            aciklama: b.aciklama,
            yuklendi: new Date(b.yuklendi).toISOString(),
            dosyaId: b.dosyaId,
            dosya: b.dosya,
          }))
        );
      } catch {
        toast.error("Belgeler yüklenemedi.");
      }
    });
  }

  function handleFiltreTipDegis(tip: "muvekkil" | "dosya") {
    if (tip === filtreTip) return;
    setFiltreTip(tip);
    setSeciliId(null);
    setSeciliLabel("");
    setBelgeler([]);
    setListeArama("");
    setArama("");
    setTurFiltre("TUMU");
  }

  function handleTemizle() {
    setSeciliId(null);
    setSeciliLabel("");
    setBelgeler([]);
    setListeArama("");
    setArama("");
    setTurFiltre("TUMU");
  }

  const filtrelenmis = belgeler.filter((b) => {
    if (turFiltre !== "TUMU" && b.tur !== turFiltre) return false;
    if (!arama) return true;
    const q = arama.toLowerCase();
    return (
      b.ad.toLowerCase().includes(q) ||
      b.dosya.muvekkil.ad.toLowerCase().includes(q) ||
      b.dosya.esasNo?.toLowerCase().includes(q) ||
      b.dosya.dosyaNo?.toLowerCase().includes(q) ||
      b.aciklama?.toLowerCase().includes(q)
    );
  });

  function handleSil(b: Belge) {
    if (!confirm(`"${b.ad}" belgesini silmek istediğinize emin misiniz?`)) return;
    startSilTransition(async () => {
      try {
        await belgeSil(b.id);
        setBelgeler((prev) => prev.filter((x) => x.id !== b.id));
        toast.success("Belge silindi.");
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Silinemedi.");
      }
    });
  }

  const turSayilari = Object.keys(TUR_ETIKET).map((tur) => ({
    tur: tur as BelgeTur,
    sayi: belgeler.filter((b) => b.tur === tur).length,
  }));

  return (
    <>
      <div className="space-y-5">

        {/* ── Filtre Paneli ── */}
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">

          {/* Header */}
          <div className="px-5 py-4" style={{ backgroundColor: NAVY }}>
            <div className="flex items-center gap-2">
              <FileArchive className="h-4 w-4" style={{ color: "rgba(255,255,255,0.60)" }} />
              <h1 className="text-sm font-semibold text-white">Belge Arşivi</h1>
            </div>
            <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>
              Belgeleri görmek için önce müvekkil veya dosya seçin
            </p>
          </div>

          <div className="p-5">
            {/* Tab toggle */}
            <div className="flex gap-2 mb-4">
              <Button
                variant={filtreTip === "muvekkil" ? "default" : "outline"}
                size="sm"
                onClick={() => handleFiltreTipDegis("muvekkil")}
              >
                <Users className="h-3.5 w-3.5 mr-1.5" />
                Müvekkile Göre
              </Button>
              <Button
                variant={filtreTip === "dosya" ? "default" : "outline"}
                size="sm"
                onClick={() => handleFiltreTipDegis("dosya")}
              >
                <FolderOpen className="h-3.5 w-3.5 mr-1.5" />
                Dosyaya Göre
              </Button>
            </div>

            {/* Seçili öğe gösterimi */}
            {seciliId ? (
              <div className="flex items-center gap-2.5 rounded-lg border px-3 py-2.5"
                style={{ backgroundColor: "rgba(45,90,142,0.06)", borderColor: "rgba(45,90,142,0.25)" }}>
                <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: NAVY }} />
                <span className="text-sm font-medium flex-1 truncate" style={{ color: NAVY }}>{seciliLabel}</span>
                {belgelerYukleniyor
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" style={{ color: NAVY }} />
                  : (
                    <button
                      onClick={handleTemizle}
                      className="shrink-0 transition-opacity opacity-50 hover:opacity-100"
                      title="Seçimi temizle"
                    >
                      <X className="h-3.5 w-3.5" style={{ color: NAVY }} />
                    </button>
                  )
                }
              </div>
            ) : (
              /* Arama + liste */
              <div>
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    className="pl-9 h-9 text-sm"
                    placeholder={
                      filtreTip === "muvekkil"
                        ? `${muvekkillar.length} müvekkil arasında ara...`
                        : `${dosyalar.length} dosya arasında ara...`
                    }
                    value={listeArama}
                    onChange={(e) => setListeArama(e.target.value)}
                  />
                </div>

                <div className="max-h-56 overflow-y-auto border rounded-lg divide-y bg-background">
                  {toplamSonuc === 0 ? (
                    <div className="py-10 text-center text-sm text-muted-foreground">
                      {listeArama ? "Sonuç bulunamadı" : (filtreTip === "muvekkil" ? "Müvekkil kaydı yok" : "Dosya kaydı yok")}
                    </div>
                  ) : filtreTip === "muvekkil" ? (
                    filtreliMuvekkillar.map((m) => (
                      <button
                        key={m.id}
                        className="w-full text-left px-4 py-2.5 hover:bg-muted/50 transition-colors flex items-center gap-3"
                        onClick={() => handleSecim(m.id, m.ad)}
                      >
                        <div
                          className="h-7 w-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold text-white"
                          style={{ backgroundColor: NAVY }}
                        >
                          {(m.ad[0] ?? "?").toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{m.ad}</p>
                          {m.muvekkılNo && (
                            <p className="text-xs text-muted-foreground">No: {m.muvekkılNo}</p>
                          )}
                        </div>
                      </button>
                    ))
                  ) : (
                    filtreliDosyalar.map((d) => {
                      const no = d.esasNo ?? d.dosyaNo ?? "—";
                      return (
                        <button
                          key={d.id}
                          className="w-full text-left px-4 py-2.5 hover:bg-muted/50 transition-colors"
                          onClick={() => handleSecim(d.id, `${no} — ${d.muvekkil.ad}`)}
                        >
                          <p className="text-sm font-medium font-mono">{no}</p>
                          <p className="text-xs text-muted-foreground">{d.muvekkil.ad}</p>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Yükleniyor ── */}
        {seciliId && belgelerYukleniyor && (
          <div className="rounded-xl border bg-card shadow-sm p-12 flex items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Belgeler yükleniyor...</span>
          </div>
        )}

        {/* ── Belgeler Listesi ── */}
        {seciliId && !belgelerYukleniyor && (
          <div className="rounded-xl overflow-hidden shadow-md">

            {/* Lacivert header */}
            <div className="px-5 py-4" style={{ backgroundColor: NAVY }}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <FileArchive className="h-4 w-4" style={{ color: "rgba(255,255,255,0.60)" }} />
                    <h2 className="text-sm font-semibold text-white truncate max-w-xs">{seciliLabel}</h2>
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>
                    {belgeler.length} belge
                  </p>
                </div>
              </div>

              {/* Tür filtresi */}
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setTurFiltre("TUMU")}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                    turFiltre === "TUMU"
                      ? "bg-white text-gray-800"
                      : "text-white/65 hover:text-white border border-white/20 hover:bg-white/10"
                  )}
                >
                  Tümü ({belgeler.length})
                </button>
                {turSayilari.filter((t) => t.sayi > 0).map(({ tur, sayi }) => (
                  <button
                    key={tur}
                    onClick={() => setTurFiltre(tur)}
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                      turFiltre === tur
                        ? "bg-white text-gray-800"
                        : "text-white/65 hover:text-white border border-white/20 hover:bg-white/10"
                    )}
                  >
                    {TUR_ETIKET[tur]} ({sayi})
                  </button>
                ))}
              </div>
            </div>

            {/* Arama */}
            <div className="px-4 py-3 border-b bg-muted/20">
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  className="pl-9 h-8 text-sm bg-card"
                  placeholder="Belge adı, esas no..."
                  value={arama}
                  onChange={(e) => setArama(e.target.value)}
                />
              </div>
            </div>

            {/* Tablo */}
            <div className="bg-card">
              {filtrelenmis.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
                    <FolderOpen className="h-7 w-7 opacity-30" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-sm">
                      {arama || turFiltre !== "TUMU" ? "Sonuç bulunamadı" : "Bu kayıtta henüz belge yok"}
                    </p>
                    {!arama && turFiltre === "TUMU" && (
                      <p className="text-xs mt-0.5">Dosya sayfasından belge yükleyebilirsiniz</p>
                    )}
                  </div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableHead className="text-[11px] font-bold uppercase tracking-wider text-foreground/50 w-8"></TableHead>
                      <TableHead className="text-[11px] font-bold uppercase tracking-wider text-foreground/50">Belge</TableHead>
                      <TableHead className="text-[11px] font-bold uppercase tracking-wider text-foreground/50">Dosya / Müvekkil</TableHead>
                      <TableHead className="text-[11px] font-bold uppercase tracking-wider text-foreground/50">Tür</TableHead>
                      <TableHead className="text-[11px] font-bold uppercase tracking-wider text-foreground/50">Boyut</TableHead>
                      <TableHead className="text-[11px] font-bold uppercase tracking-wider text-foreground/50">Yüklendi</TableHead>
                      <TableHead className="text-right text-[11px] font-bold uppercase tracking-wider text-foreground/50">İşlemler</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtrelenmis.map((b) => (
                      <TableRow key={b.id} className="hover:bg-[#2d5a8e]/8 transition-all duration-150">
                        <TableCell>{dosyaIkonu(b.mimeTipi)}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{b.ad}</p>
                            {b.aciklama && (
                              <p className="text-xs text-muted-foreground truncate max-w-[180px]">{b.aciklama}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/dashboard/dosyalar/${b.dosya.id}`}
                            className="group"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <p className="text-sm font-medium group-hover:text-primary transition-colors">
                              {b.dosya.avukat?.mtPrefiks && (
                                <span className="text-amber-600 font-bold">
                                  {b.dosya.avukat.ad.split(" ").map((s: string) => s[0] ?? "").join("").toUpperCase()} *{" "}
                                </span>
                              )}
                              {b.dosya.muvekkil.ad}
                            </p>
                            <p className="text-xs text-muted-foreground font-mono">
                              {b.dosya.esasNo ?? b.dosya.dosyaNo ?? "—"}
                            </p>
                          </Link>
                        </TableCell>
                        <TableCell>
                          <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium", TUR_RENK[b.tur])}>
                            {TUR_ETIKET[b.tur]}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{boyutFormatla(b.boyut)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(b.yuklendi).toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {ONIZLENEBILIR.includes(b.mimeTipi) && (
                              <Button
                                variant="ghost" size="sm"
                                className="h-8 w-8 p-0"
                                title="Önizle"
                                onClick={() => setOnizlenen(b)}
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            <a href={`/api/belgeler/${b.id}`} download>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="İndir">
                                <Download className="h-3.5 w-3.5" />
                              </Button>
                            </a>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              disabled={silPending}
                              onClick={() => handleSil(b)}
                              title="Sil"
                            >
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        )}

      </div>
      <BelgeOnizleme belge={onizlenen} onClose={() => setOnizlenen(null)} />
    </>
  );
}
