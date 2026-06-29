"use client";

import { useState, useTransition } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MuvekkılDialog } from "./muvekkil-dialog";
import { muvekkılPasifYap, muvekkılAktifYap } from "@/lib/actions/muvekkil";
import { toast } from "sonner";
import { Plus, Pencil, Archive, ArchiveRestore, Search, Users, FolderOpen, Building2, Hash, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { muvekkiliNoileGetir } from "@/lib/actions/muvekkil";
import { MuvekkılTip } from "@prisma/client";
import Link from "next/link";
import { cn } from "@/lib/utils";

const NAVY = "#2d5a8e";

type Avukat = {
  id: string;
  ad: string;
  rol: string;
  mtPrefiks: boolean;
};

type Muvekkil = {
  id: string; muvekkılNo: number | null; tip: MuvekkılTip; ad: string;
  tckn: string | null; vkn: string | null;
  telefon: string | null; isTelefon: string | null;
  email: string | null; email2: string | null;
  adres: string | null; iban: string | null; notlar: string | null;
  kvkkOnay: boolean; aktif: boolean;
  avukatId: string | null;
  avukat: Avukat | null;
  _count: { dosyalar: number };
};

type MtAvukat = { id: string; ad: string };

function initials(ad: string): string {
  return ad.split(" ").slice(0, 2).map((s) => s[0] ?? "").join("").toUpperCase();
}

function avukatInitials(ad: string): string {
  return ad.split(" ").map((s) => s[0] ?? "").join("").toUpperCase();
}

export function MuvekkillerIstemci({
  aktifler,
  pasifler,
  userRol,
  mtAvukatlar,
}: {
  aktifler: Muvekkil[];
  pasifler: Muvekkil[];
  userRol: string;
  mtAvukatlar: MtAvukat[];
}) {
  const router = useRouter();
  const [arsivGoster, setArsivGoster] = useState(false);
  const [arama, setArama] = useState("");
  const [noArama, setNoArama] = useState("");
  const [tipFiltre, setTipFiltre] = useState<MuvekkılTip | "TUMU">("TUMU");
  const [dialogAcik, setDialogAcik] = useState(false);
  const [secili, setSecili] = useState<Muvekkil | null>(null);
  const [aktifListe, setAktifListe] = useState(aktifler);
  const [pasifListe, setPasifListe] = useState(pasifler);
  const [pending, startTransition] = useTransition();

  const isPatron = userRol === "PATRON";

  async function handleNoGit(e: React.FormEvent) {
    e.preventDefault();
    const no = parseInt(noArama.trim());
    if (!no) return;
    startTransition(async () => {
      const sonuc = await muvekkiliNoileGetir(no);
      if (sonuc) {
        router.push(`/dashboard/muvekkillar/${sonuc.id}`);
      } else {
        toast.error(`#${String(no).padStart(3, "0")} numaralı müvekkil bulunamadı.`);
      }
    });
  }

  const liste = arsivGoster ? pasifListe : aktifListe;

  const filtrelenmis = liste.filter((m) => {
    if (tipFiltre !== "TUMU" && m.tip !== tipFiltre) return false;
    if (!arama) return true;
    const q = arama.toLowerCase();
    return (
      m.ad.toLowerCase().includes(q) ||
      m.tckn?.includes(arama) ||
      m.vkn?.includes(arama) ||
      m.email?.toLowerCase().includes(q) ||
      m.telefon?.includes(arama)
    );
  });

  function yeni() { setSecili(null); setDialogAcik(true); }
  function duzenle(m: Muvekkil) { setSecili(m); setDialogAcik(true); }

  function pasifYap(m: Muvekkil) {
    if (!confirm(`"${m.ad}" isimli müvekkili arşivlemek istediğinize emin misiniz?\n\nKayıtlar silinmez, arşivde saklanır.`)) return;
    startTransition(async () => {
      try {
        await muvekkılPasifYap(m.id);
        setAktifListe((prev) => prev.filter((x) => x.id !== m.id));
        setPasifListe((prev) => [{ ...m, aktif: false }, ...prev]);
        toast.success("Müvekkil arşivlendi.");
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "İşlem başarısız.");
      }
    });
  }

  function aktifYap(m: Muvekkil) {
    if (!confirm(`"${m.ad}" isimli müvekkili tekrar aktife almak istediğinize emin misiniz?`)) return;
    startTransition(async () => {
      try {
        await muvekkılAktifYap(m.id);
        setPasifListe((prev) => prev.filter((x) => x.id !== m.id));
        setAktifListe((prev) => [{ ...m, aktif: true }, ...prev]);
        toast.success("Müvekkil aktife alındı.");
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "İşlem başarısız.");
      }
    });
  }

  const kisiSayisi = aktifListe.filter((m) => m.tip === "KISI").length;
  const sirketSayisi = aktifListe.filter((m) => m.tip === "SIRKET").length;
  const colSpan = isPatron ? 7 : 6;

  return (
    <>
      <div className="space-y-5">
        <div className="rounded-xl overflow-hidden shadow-md">

          {/* Lacivert header */}
          <div className="px-5 py-4" style={{ backgroundColor: NAVY }}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" style={{ color: "rgba(255,255,255,0.60)" }} />
                  <h1 className="text-sm font-semibold text-white">
                    {arsivGoster ? "Arşivlenmiş Müvekkiller" : "Müvekkiller"}
                  </h1>
                </div>
                <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>
                  {arsivGoster
                    ? `${pasifListe.length} arşivlenmiş kayıt`
                    : `${kisiSayisi} bireysel · ${sirketSayisi} kurumsal`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setArsivGoster((v) => !v); setArama(""); setTipFiltre("TUMU"); }}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-white bg-white/10 border border-white/20 hover:bg-white/25 hover:scale-[1.02] transition-all duration-150 active:scale-95"
                >
                  {arsivGoster ? <Users className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
                  {arsivGoster ? "Aktifler" : `Arşiv (${pasifListe.length})`}
                </button>
                {!arsivGoster && (
                  <button
                    onClick={yeni}
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white bg-white/15 border border-white/20 hover:bg-white/25 hover:scale-[1.02] transition-all duration-150 active:scale-95"
                  >
                    <Plus className="h-3.5 w-3.5" />Yeni Müvekkil
                  </button>
                )}
              </div>
            </div>

            {/* Tip segmented filtre */}
            <div className="flex rounded-lg overflow-hidden w-fit" style={{ border: "1px solid rgba(255,255,255,0.20)" }}>
              {([["TUMU", "Tümü"], ["KISI", "Bireysel"], ["SIRKET", "Kurumsal"]] as [string, string][]).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setTipFiltre(val as MuvekkılTip | "TUMU")}
                  className={cn(
                    "px-4 py-1.5 text-xs font-medium transition-colors",
                    tipFiltre === val
                      ? "bg-white text-gray-800"
                      : "text-white/65 hover:text-white hover:bg-white/10"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Arama */}
          <div className="px-4 py-3 border-b bg-muted/20 flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                className="pl-9 h-8 text-sm bg-card"
                placeholder="Ad, TCKN, e-posta, telefon..."
                value={arama}
                onChange={(e) => setArama(e.target.value)}
              />
            </div>
            <form onSubmit={handleNoGit} className="flex items-center gap-1.5 shrink-0">
              <div className="relative">
                <Hash className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                <Input
                  className="pl-7 h-8 w-24 text-sm bg-card font-mono"
                  placeholder="001"
                  value={noArama}
                  onChange={(e) => setNoArama(e.target.value.replace(/\D/g, "").slice(0, 4))}
                />
              </div>
              <Button type="submit" size="sm" variant="outline" className="h-8 px-2" disabled={pending || !noArama}>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </form>
          </div>

          {/* Tablo */}
          <div className="bg-card">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-foreground/50">Müvekkil</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-foreground/50">İletişim</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-foreground/50">Kimlik No</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-foreground/50">Dosyalar</TableHead>
                  {isPatron && (
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-foreground/50">Avukat</TableHead>
                  )}
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-foreground/50">KVKK</TableHead>
                  <TableHead className="text-right text-[11px] font-bold uppercase tracking-wider text-foreground/50">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtrelenmis.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={colSpan} className="text-center text-muted-foreground py-16">
                      <Users className="h-10 w-10 mx-auto mb-3 opacity-20" />
                      <p className="font-medium text-sm">
                        {arama
                          ? "Arama sonucu bulunamadı"
                          : arsivGoster
                          ? "Arşivlenmiş müvekkil yok"
                          : "Henüz müvekkil eklenmemiş"}
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtrelenmis.map((m) => (
                    <TableRow key={m.id} className={cn("hover:bg-[#2d5a8e]/8 transition-all duration-150", arsivGoster && "opacity-70")}>
                      <TableCell>
                        <Link href={`/dashboard/muvekkillar/${m.id}`} className="flex items-center gap-3 group">
                          <div className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                            m.tip === "SIRKET" ? "bg-blue-50 text-blue-700" : "bg-primary/10 text-primary"
                          )}>
                            {m.tip === "SIRKET" ? <Building2 className="h-4 w-4" /> : initials(m.ad)}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="font-semibold text-sm group-hover:text-primary transition-colors">
                                {m.avukat?.mtPrefiks ? (
                                  <>
                                    <span className="text-amber-600 font-bold">{avukatInitials(m.avukat.ad)} * </span>
                                    {m.ad}
                                  </>
                                ) : m.ad}
                              </p>
                              {m.muvekkılNo && (
                                <span className="text-[10px] font-mono text-muted-foreground/60">#{String(m.muvekkılNo).padStart(3, "0")}</span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">{m.tip === "KISI" ? "Bireysel" : "Kurumsal"}</p>
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {m.telefon && <p>{m.telefon}</p>}
                          {m.email && <p className="text-muted-foreground text-xs">{m.email}</p>}
                          {!m.telefon && !m.email && <span className="text-muted-foreground">—</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground font-mono text-xs">
                        {m.tckn || m.vkn || "—"}
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/dashboard/dosyalar?muvekkil=${m.id}`}
                          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
                        >
                          <FolderOpen className="h-3.5 w-3.5" />
                          <span className="font-semibold text-foreground">{m._count.dosyalar}</span>
                          <span>dosya</span>
                        </Link>
                      </TableCell>
                      {isPatron && (
                        <TableCell className="text-sm text-muted-foreground">
                          {m.avukat?.ad ?? "Atanmamış"}
                        </TableCell>
                      )}
                      <TableCell>
                        {m.kvkkOnay
                          ? <span className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-xs font-medium text-emerald-700">Onaylı</span>
                          : <span className="inline-flex items-center rounded-full bg-gray-50 border border-gray-200 px-2 py-0.5 text-xs font-medium text-gray-500">Yok</span>
                        }
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {!arsivGoster && (
                            <Button variant="ghost" size="sm" onClick={() => duzenle(m)} className="h-8 w-8 p-0">
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {arsivGoster ? (
                            <Button
                              variant="ghost" size="sm"
                              onClick={() => aktifYap(m)}
                              disabled={pending}
                              className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-700"
                              title="Aktife Al"
                            >
                              <ArchiveRestore className="h-3.5 w-3.5" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost" size="sm"
                              onClick={() => pasifYap(m)}
                              disabled={pending}
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-amber-600"
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
        <MuvekkılDialog
          open={dialogAcik}
          onClose={() => setDialogAcik(false)}
          muvekkil={secili}
          mtAvukatlar={userRol !== "SEKRETER" ? mtAvukatlar : []}
        />
      )}
    </>
  );
}
