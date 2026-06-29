"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DosyaDialog } from "../dosya-dialog";
import {
  danismanlikaDonustur,
  karsiTarafEkle,
  karsiTarafGuncelle,
  karsiTarafSil,
} from "@/lib/actions/dosya";
import { toast } from "sonner";
import {
  ArrowLeft, Pencil, RefreshCw, Plus, Trash2, Loader2,
  User, Building2, Scale, Calendar, FileText, Banknote, FolderOpen,
  Phone, Mail, Hash, CreditCard,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DosyaTip, DosyaDurum, MuvekkılTip, DurusmaTur, DurusmaDurum, GorevTur, GorevDurum, OdemeTur, OdemeDurum } from "@prisma/client";
import { DurusmaDialog } from "../../takvim/durusma-dialog";
import { GorevDialog } from "../../takvim/gorev-dialog";
import { DurusmaDetayDialog } from "../../takvim/durusma-detay-dialog";
import { gorevTamamla, gorevSil } from "@/lib/actions/gorev";
import { OdemePaneli } from "./odeme-paneli";
import { BelgePaneli } from "./belge-paneli";
import { cn } from "@/lib/utils";
import { BelgeTur } from "@prisma/client";

const NAVY = "#1e3a5f";

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

type Dosya = {
  id: string; dosyaNo: string | null; esasNo: string | null;
  tip: DosyaTip; altTip: string | null; mahkeme: string | null;
  durum: DosyaDurum; acilisTarihi: Date | null; aciklama: string | null;
  muvekkılId: string; avukatId: string | null;
  muvekkil: { id: string; ad: string; tip: MuvekkılTip; tckn: string | null; vkn: string | null; telefon: string | null; email: string | null; iban: string | null };
  avukat: { id: string; ad: string; email: string; mtPrefiks: boolean } | null;
  karsiTaraflar: { id: string; ad: string; vekili: string | null; iletisim: string | null }[];
};

type Muvekkil = { id: string; ad: string; tip: MuvekkılTip };
type Avukat = { id: string; ad: string };

type DurusmaT = {
  id: string; dosyaId: string; tarih: Date; tur: DurusmaTur; yer: string | null;
  sonucNotu: string | null; sonrakiAdim: string | null; durum: DurusmaDurum;
  dosya: { id: string; esasNo: string | null; dosyaNo: string | null; mahkeme: string | null; muvekkil: { ad: string } };
};

type GorevT = {
  id: string; dosyaId: string | null; baslik: string; tur: GorevTur; sonTarih: Date; durum: GorevDurum;
  dosya: { id: string; esasNo: string | null; dosyaNo: string | null; muvekkil: { ad: string } } | null;
  atanan: { id: string; ad: string } | null;
};

type OdemeT = {
  id: string; tur: OdemeTur; tutar: number; aciklama: string | null; tarih: Date | string; durum: OdemeDurum;
};

type BelgeT = {
  id: string; ad: string; boyut: number; mimeTipi: string; tur: BelgeTur; aciklama: string | null; yuklendi: Date | string;
};

const DURUSMA_TUR: Record<DurusmaTur, string> = {
  DURUSMA: "Duruşma", KESIF: "Keşif", TOPLANTI: "Toplantı", SON_GUN: "Son Gün",
};

const GOREV_TUR: Record<GorevTur, string> = {
  GOREV: "Görev", SURE: "Süre", TEMYIZ: "Temyiz", ITIRAZ: "İtiraz",
};

const SEKMELER = [
  { id: "genel", label: "Genel Bilgi", icon: FileText },
  { id: "karsi", label: "Karşı Taraf", icon: User },
  { id: "gorevler", label: "Görevler", icon: Scale },
  { id: "belgeler", label: "Belgeler", icon: FolderOpen },
  { id: "finans", label: "Finans", icon: Banknote },
];

export function DosyaDetayIstemci({
  dosya, muvekkillar, avukatlar, durusmalar, gorevler, odemeler, belgeler,
}: {
  dosya: Dosya; muvekkillar: Muvekkil[]; avukatlar: Avukat[];
  durusmalar: DurusmaT[]; gorevler: GorevT[]; odemeler: OdemeT[]; belgeler: BelgeT[];
}) {
  const router = useRouter();
  const [sekme, setSekme] = useState("genel");
  const [duzenleAcik, setDuzenleAcik] = useState(false);
  const [donusturAcik, setDonusturAcik] = useState(false);
  const [karsiAcik, setKarsiAcik] = useState(false);
  const [seciliKarsi, setSeciliKarsi] = useState<Dosya["karsiTaraflar"][0] | null>(null);
  const [durusmaEkleAcik, setDurusmaEkleAcik] = useState(false);
  const [gorevEkleAcik, setGorevEkleAcik] = useState(false);
  const [seciliDurusma, setSeciliDurusma] = useState<DurusmaT | null>(null);
  const [detayAcik, setDetayAcik] = useState(false);
  const [pending, startTransition] = useTransition();

  const dosyaBaslik = dosya.esasNo || dosya.dosyaNo || "Dosya Detayı";

  return (
    <div className="space-y-5">

      {/* Üst başlık kartı — solid navy */}
      <div className="rounded-xl overflow-hidden shadow-md">
        <div className="px-5 py-4" style={{ backgroundColor: NAVY }}>
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-xs mb-3" style={{ color: "rgba(255,255,255,0.50)" }}>
            <Link href="/dashboard/dosyalar" className="flex items-center gap-1 hover:text-white transition-colors">
              <ArrowLeft className="h-3 w-3" />Dosyalar
            </Link>
            <span>/</span>
            <span className="text-white font-medium">{dosyaBaslik}</span>
          </div>

          {/* Başlık + aksiyonlar */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl font-bold text-white">{dosyaBaslik}</h1>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${DURUM_RENK[dosya.durum]}`}>
                  {DURUM_ETIKET[dosya.durum]}
                </span>
                <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium text-white/60 border border-white/20">
                  {dosya.tip === "DAVA" ? "Dava" : "Danışmanlık"}
                </span>
              </div>
              <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.55)" }}>
                {dosya.avukat?.mtPrefiks && (
                  <span className="font-bold" style={{ color: "#fbbf24" }}>
                    {dosya.avukat.ad.split(" ").map((s: string) => s[0] ?? "").join("").toUpperCase()} *{" "}
                  </span>
                )}
                {dosya.muvekkil.ad}{dosya.mahkeme ? ` · ${dosya.mahkeme}` : ""}
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              {dosya.tip === "DANISMANLIK" && (
                <button
                  onClick={() => setDonusturAcik(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-white transition-colors"
                  style={{ backgroundColor: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.20)" }}
                >
                  <RefreshCw className="h-3.5 w-3.5" />Davaya Dönüştür
                </button>
              )}
<button
                onClick={() => setDuzenleAcik(true)}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-colors"
                style={{ backgroundColor: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.25)" }}
              >
                <Pencil className="h-3.5 w-3.5" />Düzenle
              </button>
            </div>
          </div>
        </div>

        {/* Sekmeler */}
        <div className="flex gap-0 border-b bg-card overflow-x-auto">
          {SEKMELER.map((s) => (
            <button
              key={s.id}
              onClick={() => setSekme(s.id)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-all",
                sekme === s.id
                  ? "border-primary text-primary bg-primary/5"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30"
              )}
            >
              <s.icon className="h-3.5 w-3.5" />
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Genel Bilgi ── */}
      {sekme === "genel" && (
        <div className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="rounded-xl overflow-hidden shadow-sm">
            <div className="flex items-center gap-2 px-5 py-3" style={{ backgroundColor: NAVY }}>
              <FileText className="h-3.5 w-3.5" style={{ color: "rgba(255,255,255,0.55)" }} />
              <p className="text-xs font-semibold text-white uppercase tracking-wide">Dosya Bilgileri</p>
            </div>
            <dl className="divide-y bg-card text-sm">
              <InfoRow icon={<Hash className="h-3.5 w-3.5" />} label="Büro Dosya No" value={dosya.dosyaNo} />
              <InfoRow icon={<Hash className="h-3.5 w-3.5" />} label="Esas No" value={dosya.esasNo} />
              <InfoRow icon={<Scale className="h-3.5 w-3.5" />} label="Mahkeme" value={dosya.mahkeme} />
              <InfoRow label="Dosya Tipi" value={dosya.altTip} />
              <InfoRow
                icon={<Calendar className="h-3.5 w-3.5" />}
                label="Açılış Tarihi"
                value={dosya.acilisTarihi ? new Date(dosya.acilisTarihi).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" }) : null}
              />
              <InfoRow icon={<User className="h-3.5 w-3.5" />} label="Atanan Avukat" value={dosya.avukat?.ad} />
            </dl>
            {dosya.aciklama && (
              <div className="px-5 py-4 border-t bg-muted/20">
                <p className="text-xs text-muted-foreground mb-1.5 font-semibold uppercase tracking-wide">Açıklama</p>
                <p className="text-sm leading-relaxed">{dosya.aciklama}</p>
              </div>
            )}
          </div>

          <div className="rounded-xl overflow-hidden shadow-sm">
            <div className="flex items-center gap-2 px-5 py-3" style={{ backgroundColor: NAVY }}>
              <User className="h-3.5 w-3.5" style={{ color: "rgba(255,255,255,0.55)" }} />
              <p className="text-xs font-semibold text-white uppercase tracking-wide">Müvekkil</p>
            </div>
            <div className="px-5 py-4 border-b bg-card">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold shrink-0",
                  dosya.muvekkil.tip === "SIRKET" ? "bg-blue-50 text-blue-700" : "bg-primary/10 text-primary"
                )}>
                  {dosya.muvekkil.tip === "SIRKET"
                    ? <Building2 className="h-5 w-5" />
                    : dosya.muvekkil.ad.split(" ").slice(0, 2).map((s) => s[0]).join("").toUpperCase()
                  }
                </div>
                <div>
                  <p className="font-semibold">
                    {dosya.avukat?.mtPrefiks && (
                      <span className="text-amber-600 font-bold">
                        {dosya.avukat.ad.split(" ").map((s: string) => s[0] ?? "").join("").toUpperCase()} *{" "}
                      </span>
                    )}
                    {dosya.muvekkil.ad}
                  </p>
                  <p className="text-xs text-muted-foreground">{dosya.muvekkil.tip === "KISI" ? "Bireysel" : "Kurumsal"}</p>
                </div>
              </div>
            </div>
            <dl className="divide-y bg-card text-sm">
              {(dosya.muvekkil.tckn || dosya.muvekkil.vkn) && (
                <InfoRow icon={<Hash className="h-3.5 w-3.5" />} label={dosya.muvekkil.tckn ? "TCKN" : "VKN"} value={dosya.muvekkil.tckn || dosya.muvekkil.vkn} />
              )}
              <InfoRow icon={<Phone className="h-3.5 w-3.5" />} label="Telefon" value={dosya.muvekkil.telefon} />
              <InfoRow icon={<Mail className="h-3.5 w-3.5" />} label="E-posta" value={dosya.muvekkil.email} />
              <InfoRow icon={<CreditCard className="h-3.5 w-3.5" />} label="IBAN" value={dosya.muvekkil.iban ? dosya.muvekkil.iban.replace(/(.{4})/g, "$1 ").trim() : null} />
            </dl>
          </div>
        </div>

        {/* Takvim */}
        <div className="rounded-xl overflow-hidden shadow-md">
          <div className="flex items-center justify-between px-5 py-3.5" style={{ backgroundColor: NAVY }}>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" style={{ color: "rgba(255,255,255,0.55)" }} />
              <span className="text-sm font-semibold text-white">Takvim</span>
              <span className="text-xs" style={{ color: "rgba(255,255,255,0.40)" }}>{durusmalar.length}</span>
            </div>
            <button
              onClick={() => setDurusmaEkleAcik(true)}
              className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-colors"
              style={{ backgroundColor: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.20)" }}
            >
              <Plus className="h-3.5 w-3.5" />Ekle
            </button>
          </div>
          {durusmalar.length === 0 ? (
            <div className="bg-card flex flex-col items-center py-14 text-muted-foreground">
              <Calendar className="h-8 w-8 mb-2 opacity-20" />
              <p className="text-sm font-medium">Henüz duruşma eklenmedi</p>
            </div>
          ) : (
            <div className="bg-card">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-foreground/50">Tarih</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-foreground/50">Tür</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-foreground/50">Yer</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-foreground/50">Durum</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-foreground/50">Sonuç Notu</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {durusmalar.map((d) => (
                    <TableRow key={d.id} className="cursor-pointer hover:bg-blue-50/40 transition-colors" onClick={() => { setSeciliDurusma(d); setDetayAcik(true); }}>
                      <TableCell className="font-semibold text-sm">
                        {new Date(d.tarih).toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" })}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium">
                          {DURUSMA_TUR[d.tur]}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{d.yer || "—"}</TableCell>
                      <TableCell>
                        <span className={cn(
                          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
                          d.durum === "TAMAMLANDI" ? "bg-green-50 text-green-700 border border-green-200" :
                          d.durum === "IPTAL" ? "bg-gray-100 text-gray-500 border border-gray-200" :
                          "bg-blue-50 text-blue-700 border border-blue-200"
                        )}>
                          {d.durum === "BEKLIYOR" ? "Bekliyor" : d.durum === "TAMAMLANDI" ? "Tamamlandı" : "İptal"}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground truncate max-w-[180px]">{d.sonucNotu || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
        </div>
      )}

      {/* ── Karşı Taraflar ── */}
      {sekme === "karsi" && (
        <div className="rounded-xl overflow-hidden shadow-md">
          <div className="flex items-center justify-between px-5 py-3.5" style={{ backgroundColor: NAVY }}>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" style={{ color: "rgba(255,255,255,0.55)" }} />
              <span className="text-sm font-semibold text-white">Karşı Taraflar</span>
              <span className="text-xs" style={{ color: "rgba(255,255,255,0.40)" }}>{dosya.karsiTaraflar.length}</span>
            </div>
            <button
              onClick={() => { setSeciliKarsi(null); setKarsiAcik(true); }}
              className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-colors"
              style={{ backgroundColor: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.20)" }}
            >
              <Plus className="h-3.5 w-3.5" />Ekle
            </button>
          </div>
          {dosya.karsiTaraflar.length === 0 ? (
            <div className="bg-card flex flex-col items-center py-14 text-muted-foreground">
              <User className="h-8 w-8 mb-2 opacity-20" />
              <p className="text-sm font-medium">Henüz karşı taraf eklenmedi</p>
            </div>
          ) : (
            <div className="bg-card">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-foreground/50">Ad</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-foreground/50">Vekil Avukat</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-foreground/50">İletişim</TableHead>
                    <TableHead className="text-right text-[11px] font-bold uppercase tracking-wider text-foreground/50">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dosya.karsiTaraflar.map((kt) => (
                    <TableRow key={kt.id} className="hover:bg-blue-50/40">
                      <TableCell className="font-semibold">{kt.ad}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{kt.vekili || "—"}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{kt.iletisim || "—"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => { setSeciliKarsi(kt); setKarsiAcik(true); }}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" disabled={pending} onClick={() => {
                            if (!confirm("Karşı tarafı silmek istediğinize emin misiniz?")) return;
                            startTransition(async () => {
                              try { await karsiTarafSil(kt.id, dosya.id); router.refresh(); toast.success("Silindi."); }
                              catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Hata."); }
                            });
                          }}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}

      {/* ── Görevler ── */}
      {sekme === "gorevler" && (
        <div className="rounded-xl overflow-hidden shadow-md">
          <div className="flex items-center justify-between px-5 py-3.5" style={{ backgroundColor: NAVY }}>
            <div className="flex items-center gap-2">
              <Scale className="h-4 w-4" style={{ color: "rgba(255,255,255,0.55)" }} />
              <span className="text-sm font-semibold text-white">Görevler & Süreler</span>
              <span className="text-xs" style={{ color: "rgba(255,255,255,0.40)" }}>{gorevler.length}</span>
            </div>
            <button
              onClick={() => setGorevEkleAcik(true)}
              className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-colors"
              style={{ backgroundColor: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.20)" }}
            >
              <Plus className="h-3.5 w-3.5" />Ekle
            </button>
          </div>
          {gorevler.length === 0 ? (
            <div className="bg-card flex flex-col items-center py-14 text-muted-foreground">
              <Scale className="h-8 w-8 mb-2 opacity-20" />
              <p className="text-sm font-medium">Henüz görev eklenmedi</p>
            </div>
          ) : (
            <div className="bg-card">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-foreground/50">Başlık</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-foreground/50">Tür</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-foreground/50">Son Tarih</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-foreground/50">Atanan</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-foreground/50">Durum</TableHead>
                    <TableHead className="text-right text-[11px] font-bold uppercase tracking-wider text-foreground/50">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gorevler.map((g) => (
                    <TableRow key={g.id} className={cn("hover:bg-blue-50/40 transition-colors", g.durum === "GECTI" && "opacity-60")}>
                      <TableCell className="font-semibold text-sm">{g.baslik}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium">
                          {GOREV_TUR[g.tur]}
                        </span>
                      </TableCell>
                      <TableCell className={cn("text-sm", g.durum === "GECTI" ? "text-destructive font-bold" : "text-muted-foreground")}>
                        {new Date(g.sonTarih).toLocaleDateString("tr-TR")}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{g.atanan?.ad || "—"}</TableCell>
                      <TableCell>
                        <span className={cn(
                          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
                          g.durum === "TAMAMLANDI" ? "bg-green-50 text-green-700 border border-green-200" :
                          g.durum === "GECTI" ? "bg-red-50 text-red-700 border border-red-200" :
                          "bg-blue-50 text-blue-700 border border-blue-200"
                        )}>
                          {g.durum === "BEKLIYOR" ? "Bekliyor" : g.durum === "TAMAMLANDI" ? "Tamamlandı" : "Geçti"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {g.durum === "BEKLIYOR" && (
                            <Button variant="ghost" size="sm" className="h-8 px-2 text-xs text-green-700 hover:text-green-800" disabled={pending} onClick={() => {
                              startTransition(async () => {
                                try { await gorevTamamla(g.id); router.refresh(); toast.success("Görev tamamlandı."); }
                                catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Hata."); }
                              });
                            }}>✓ Tamam</Button>
                          )}
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" disabled={pending} onClick={() => {
                            if (!confirm("Görevi silmek istediğinize emin misiniz?")) return;
                            startTransition(async () => {
                              try { await gorevSil(g.id); router.refresh(); toast.success("Görev silindi."); }
                              catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Hata."); }
                            });
                          }}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}

      {/* ── Belgeler ── */}
      {sekme === "belgeler" && (
        <BelgePaneli dosyaId={dosya.id} belgeler={belgeler} />
      )}

      {/* ── Finans ── */}
      {sekme === "finans" && (
        <OdemePaneli dosyaId={dosya.id} odemeler={odemeler} />
      )}

      {/* ── Dialoglar ── */}
      <DosyaDialog
        open={duzenleAcik}
        onClose={() => { setDuzenleAcik(false); router.refresh(); }}
        dosya={dosya}
        muvekkillar={muvekkillar}
      />
      <DonusturDialog
        open={donusturAcik}
        onClose={() => setDonusturAcik(false)}
        dosyaId={dosya.id}
        onSuccess={() => router.refresh()}
      />
      <KarsiTarafDialog
        open={karsiAcik}
        onClose={() => setKarsiAcik(false)}
        dosyaId={dosya.id}
        karsiTaraf={seciliKarsi}
        onSuccess={() => router.refresh()}
      />
      <DurusmaDialog
        open={durusmaEkleAcik}
        onClose={() => { setDurusmaEkleAcik(false); router.refresh(); }}
        dosyalar={[{ id: dosya.id, esasNo: dosya.esasNo, dosyaNo: dosya.dosyaNo, muvekkil: { ad: dosya.muvekkil.ad, tip: dosya.muvekkil.tip }, avukatId: dosya.avukatId, avukat: dosya.avukat ? { ad: dosya.avukat.ad, mtPrefiks: dosya.avukat.mtPrefiks } : null }]}
        avukatlar={avukatlar}
      />
      <GorevDialog
        open={gorevEkleAcik}
        onClose={() => { setGorevEkleAcik(false); router.refresh(); }}
        dosyalar={[{ id: dosya.id, esasNo: dosya.esasNo, dosyaNo: dosya.dosyaNo, muvekkil: { ad: dosya.muvekkil.ad, tip: dosya.muvekkil.tip }, avukatId: dosya.avukatId, avukat: dosya.avukat ? { ad: dosya.avukat.ad, mtPrefiks: dosya.avukat.mtPrefiks } : null }]}
        avukatlar={avukatlar}
        dosyaId={dosya.id}
      />
      {seciliDurusma && (
        <DurusmaDetayDialog
          open={detayAcik}
          onClose={() => { setDetayAcik(false); router.refresh(); }}
          durusma={seciliDurusma}
        />
      )}
    </div>
  );
}

function InfoRow({ label, value, icon }: { label: string; value?: string | null; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-5 py-3 gap-4">
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground shrink-0">
        {icon && <span className="text-muted-foreground/50">{icon}</span>}
        {label}
      </div>
      <span className="text-sm font-semibold text-right">{value || "—"}</span>
    </div>
  );
}

function DonusturDialog({ open, onClose, dosyaId, onSuccess }: {
  open: boolean; onClose: () => void; dosyaId: string; onSuccess: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({ mahkeme: "", esasNo: "" });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      try {
        await danismanlikaDonustur(dosyaId, { mahkeme: form.mahkeme || undefined, esasNo: form.esasNo || undefined });
        toast.success("Dosya dava dosyasına dönüştürüldü.");
        onSuccess(); onClose();
      } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Hata."); }
    });
  }

  return (
    <Dialog open={open} onOpenChange={() => !pending && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Davaya Dönüştür</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 pt-2">
          <p className="text-sm text-muted-foreground">Danışmanlık dosyası dava dosyasına dönüştürülecek.</p>
          <div className="space-y-1">
            <label className="text-sm font-medium">Mahkeme (opsiyonel)</label>
            <Input value={form.mahkeme} onChange={(e) => setForm({ ...form, mahkeme: e.target.value })} disabled={pending} placeholder="İstanbul 1. Asliye Hukuk" />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Esas No (opsiyonel)</label>
            <Input value={form.esasNo} onChange={(e) => setForm({ ...form, esasNo: e.target.value })} disabled={pending} placeholder="2024/1234 E." />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={pending}>İptal</Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Dönüştür
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function KarsiTarafDialog({ open, onClose, dosyaId, karsiTaraf, onSuccess }: {
  open: boolean; onClose: () => void; dosyaId: string;
  karsiTaraf: { id: string; ad: string; vekili: string | null; iletisim: string | null } | null;
  onSuccess: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({ ad: karsiTaraf?.ad ?? "", vekili: karsiTaraf?.vekili ?? "", iletisim: karsiTaraf?.iletisim ?? "" });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      try {
        if (karsiTaraf) {
          await karsiTarafGuncelle(karsiTaraf.id, dosyaId, { ad: form.ad, vekili: form.vekili || undefined, iletisim: form.iletisim || undefined });
          toast.success("Güncellendi.");
        } else {
          await karsiTarafEkle(dosyaId, { ad: form.ad, vekili: form.vekili || undefined, iletisim: form.iletisim || undefined });
          toast.success("Karşı taraf eklendi.");
        }
        onSuccess(); onClose();
      } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Hata."); }
    });
  }

  return (
    <Dialog open={open} onOpenChange={() => !pending && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>{karsiTaraf ? "Karşı Tarafı Düzenle" : "Karşı Taraf Ekle"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 pt-2">
          <div className="space-y-1">
            <label className="text-sm font-medium">Ad Soyad / Şirket *</label>
            <Input value={form.ad} onChange={(e) => setForm({ ...form, ad: e.target.value })} required disabled={pending} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Vekil Avukat</label>
            <Input value={form.vekili} onChange={(e) => setForm({ ...form, vekili: e.target.value })} disabled={pending} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">İletişim</label>
            <Input value={form.iletisim} onChange={(e) => setForm({ ...form, iletisim: e.target.value })} disabled={pending} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={pending}>İptal</Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {karsiTaraf ? "Kaydet" : "Ekle"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
