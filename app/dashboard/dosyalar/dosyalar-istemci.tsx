"use client";

import { useState, useTransition } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DosyaDialog } from "./dosya-dialog";
import { dosyaArsivle, dosyaArsivdenCikar } from "@/lib/actions/dosya";
import { toast } from "sonner";
import { Plus, Search, FolderOpen, ChevronRight, Archive, ArchiveRestore } from "lucide-react";
import { DosyaTip, DosyaDurum, MuvekkılTip } from "@prisma/client";
import Link from "next/link";
import { cn } from "@/lib/utils";

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

const TUM_DURUMLAR: DosyaDurum[] = ["ACIK", "DERDEST", "KARAR", "TEMYIZ", "KAPALI"];

type Dosya = {
  id: string; dosyaNo: string | null; esasNo: string | null;
  tip: DosyaTip; altTip: string | null; mahkeme: string | null;
  durum: DosyaDurum; acilisTarihi: Date | null; aciklama: string | null;
  muvekkılId: string;
  muvekkil: { id: string; ad: string; tip: MuvekkılTip; avukat: { mtPrefiks: boolean } | null };
};

type Muvekkil = { id: string; ad: string; tip: MuvekkılTip };

export function DosyalarIstemci({
  aktifDosyalar,
  kapaliDosyalar,
  muvekkillar,
}: {
  aktifDosyalar: Dosya[];
  kapaliDosyalar: Dosya[];
  muvekkillar: Muvekkil[];
}) {
  const [arsivGoster, setArsivGoster] = useState(false);
  const [arama, setArama] = useState("");
  const [durumFiltre, setDurumFiltre] = useState<DosyaDurum | "TUMU">("TUMU");
  const [tipFiltre, setTipFiltre] = useState<DosyaTip | "TUMU">("TUMU");
  const [dialogAcik, setDialogAcik] = useState(false);
  const [aktifListe, setAktifListe] = useState(aktifDosyalar);
  const [kapaliListe, setKapaliListe] = useState(kapaliDosyalar);
  const [pending, startTransition] = useTransition();

  const liste = arsivGoster ? kapaliListe : aktifListe;

  const filtrelenmis = liste.filter((d) => {
    if (!arsivGoster && durumFiltre !== "TUMU" && d.durum !== durumFiltre) return false;
    if (tipFiltre !== "TUMU" && d.tip !== tipFiltre) return false;
    if (arama) {
      const q = arama.toLowerCase();
      return (
        d.esasNo?.toLowerCase().includes(q) ||
        d.dosyaNo?.toLowerCase().includes(q) ||
        d.mahkeme?.toLowerCase().includes(q) ||
        d.muvekkil.ad.toLowerCase().includes(q)
      );
    }
    return true;
  });

  function arsivle(d: Dosya) {
    startTransition(async () => {
      try {
        await dosyaArsivle(d.id);
        setAktifListe((prev) => prev.filter((x) => x.id !== d.id));
        setKapaliListe((prev) => [d, ...prev]);
        toast.success("Dosya arşivlendi.");
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "İşlem başarısız.");
      }
    });
  }

  function arsivdenCikar(d: Dosya) {
    startTransition(async () => {
      try {
        await dosyaArsivdenCikar(d.id);
        setKapaliListe((prev) => prev.filter((x) => x.id !== d.id));
        setAktifListe((prev) => [d, ...prev]);
        toast.success("Dosya aktife alındı.");
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "İşlem başarısız.");
      }
    });
  }

  return (
    <>
      <div className="space-y-5">
        <div className="rounded-xl overflow-hidden shadow-md">

          {/* Lacivert header */}
          <div className="px-5 py-4" style={{ backgroundColor: NAVY }}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <FolderOpen className="h-4 w-4" style={{ color: "rgba(255,255,255,0.60)" }} />
                  <h1 className="text-sm font-semibold text-white">
                    {arsivGoster ? "Arşivlenmiş Dosyalar" : "Dosyalar"}
                  </h1>
                </div>
                <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>
                  {arsivGoster
                    ? `${kapaliListe.length} arşivlenmiş dosya`
                    : `${aktifListe.length} aktif · Toplam ${aktifListe.length + kapaliListe.length}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setArsivGoster((v) => !v); setArama(""); setDurumFiltre("TUMU"); setTipFiltre("TUMU"); }}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-white bg-white/10 border border-white/20 hover:bg-white/25 hover:scale-[1.02] transition-all duration-150 active:scale-95"
                >
                  {arsivGoster ? <FolderOpen className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
                  {arsivGoster ? "Aktif Dosyalar" : `Arşiv (${kapaliListe.length})`}
                </button>
                {!arsivGoster && (
                  <button
                    onClick={() => setDialogAcik(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white bg-white/15 border border-white/20 hover:bg-white/25 hover:scale-[1.02] transition-all duration-150 active:scale-95"
                  >
                    <Plus className="h-3.5 w-3.5" />Yeni Dosya
                  </button>
                )}
              </div>
            </div>

            {/* Durum pill filtreleri — sadece aktif görünümde */}
            {!arsivGoster && (
              <div className="flex flex-wrap gap-1.5">
                {([["TUMU", "Tümü"], ...TUM_DURUMLAR.map((d) => [d, DURUM_ETIKET[d]])] as [string, string][]).map(([val, label]) => {
                  const count = val === "TUMU" ? aktifListe.length : aktifListe.filter((d) => d.durum === val).length;
                  const aktif = durumFiltre === val;
                  return (
                    <button
                      key={val}
                      onClick={() => setDurumFiltre(val as DosyaDurum | "TUMU")}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-all border",
                        aktif
                          ? "bg-white text-gray-800 border-white"
                          : "border-white/25 text-white/70 hover:text-white hover:border-white/50"
                      )}
                    >
                      {label}
                      <span className={cn(
                        "inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold",
                        aktif ? "bg-gray-200 text-gray-700" : "bg-white/15 text-white/80"
                      )}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Arama + tip filtresi */}
          <div className="flex flex-wrap gap-3 px-4 py-3 border-b bg-muted/20">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                className="pl-9 h-8 text-sm bg-card"
                placeholder="Esas no, müvekkil, mahkeme..."
                value={arama}
                onChange={(e) => setArama(e.target.value)}
              />
            </div>
            <Select value={tipFiltre} onValueChange={(v) => setTipFiltre(v as DosyaTip | "TUMU")}>
              <SelectTrigger className="w-36 h-8 text-sm bg-card"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="TUMU">Tüm Tipler</SelectItem>
                <SelectItem value="DAVA">Dava</SelectItem>
                <SelectItem value="DANISMANLIK">Danışmanlık</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tablo */}
          <div className="bg-card">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-foreground/50">Dosya</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-foreground/50">Müvekkil</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-foreground/50">Mahkeme</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-foreground/50">Durum</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-foreground/50">Açılış</TableHead>
                  <TableHead className="w-16" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtrelenmis.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-16">
                      <FolderOpen className="h-10 w-10 mx-auto mb-3 opacity-20" />
                      <p className="font-medium text-sm">
                        {arama || durumFiltre !== "TUMU"
                          ? "Arama sonucu bulunamadı"
                          : arsivGoster
                          ? "Arşivlenmiş dosya yok"
                          : "Henüz dosya eklenmemiş"}
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtrelenmis.map((d) => (
                    <TableRow key={d.id} className={cn("group hover:bg-[#2d5a8e]/8 transition-all duration-150", arsivGoster && "opacity-75")}>
                      <TableCell>
                        <Link href={`/dashboard/dosyalar/${d.id}`} className="block">
                          <p className="font-semibold text-sm">{d.esasNo || d.dosyaNo || "—"}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {d.tip === "DAVA" ? "Dava" : "Danışmanlık"}{d.altTip ? ` · ${d.altTip}` : ""}
                          </p>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link href={`/dashboard/dosyalar/${d.id}`} className="text-sm font-medium">
                          {d.muvekkil.avukat?.mtPrefiks && (
                            <span className="text-amber-600 font-bold">MT * </span>
                          )}
                          {d.muvekkil.ad}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        <Link href={`/dashboard/dosyalar/${d.id}`}>{d.mahkeme || "—"}</Link>
                      </TableCell>
                      <TableCell>
                        <Link href={`/dashboard/dosyalar/${d.id}`}>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${DURUM_RENK[d.durum]}`}>
                            {DURUM_ETIKET[d.durum]}
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        <Link href={`/dashboard/dosyalar/${d.id}`}>
                          {d.acilisTarihi ? new Date(d.acilisTarihi).toLocaleDateString("tr-TR") : "—"}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/dashboard/dosyalar/${d.id}`}>
                            <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-50 transition-opacity" />
                          </Link>
                          {arsivGoster ? (
                            <Button
                              variant="ghost" size="sm"
                              onClick={() => arsivdenCikar(d)}
                              disabled={pending}
                              className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-700"
                              title="Arşivden Çıkar"
                            >
                              <ArchiveRestore className="h-3.5 w-3.5" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost" size="sm"
                              onClick={() => arsivle(d)}
                              disabled={pending}
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-amber-600 opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Arşivle"
                            >
                              <Archive className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {!arsivGoster && (
        <DosyaDialog
          open={dialogAcik}
          onClose={() => setDialogAcik(false)}
          muvekkillar={muvekkillar}
        />
      )}
    </>
  );
}
