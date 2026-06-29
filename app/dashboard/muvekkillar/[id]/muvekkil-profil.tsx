"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Building2, Phone, Mail, Hash, Plus, Loader2,
  CreditCard, MapPin, Calendar, Scale, ChevronLeft, ChevronRight,
  FileText, Clock, ChevronDown, ChevronUp, Archive, CheckCircle, Paperclip,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { durusmaEkle } from "@/lib/actions/durusma";
import { gorevEkle } from "@/lib/actions/gorev";
import { DosyaDurum, DurusmaDurum, GorevDurum, MuvekkılTip, DurusmaTur, BelgeTur, GorevTur } from "@prisma/client";

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

const DURUSMA_TUR_ETIKET: Record<DurusmaTur, string> = {
  DURUSMA: "Duruşma", KESIF: "Keşif", TOPLANTI: "Toplantı", SON_GUN: "Son Gün",
};

const DURUSMA_DURUM_RENK: Record<DurusmaDurum, string> = {
  BEKLIYOR: "bg-amber-50 text-amber-700 border border-amber-200",
  TAMAMLANDI: "bg-green-50 text-green-700 border border-green-200",
  IPTAL: "bg-red-50 text-red-600 border border-red-200",
};

const DURUSMA_DURUM_ETIKET: Record<DurusmaDurum, string> = {
  BEKLIYOR: "Bekliyor", TAMAMLANDI: "Tamamlandı", IPTAL: "İptal",
};

const GOREV_DURUM_RENK: Record<GorevDurum, string> = {
  BEKLIYOR: "bg-amber-50 text-amber-700 border border-amber-200",
  TAMAMLANDI: "bg-green-50 text-green-700 border border-green-200",
  GECTI: "bg-gray-100 text-gray-500 border border-gray-200",
};

const GOREV_DURUM_ETIKET: Record<GorevDurum, string> = {
  BEKLIYOR: "Bekliyor", TAMAMLANDI: "Tamamlandı", GECTI: "Geçti",
};

const BELGE_TUR_ETIKET: Record<BelgeTur, string> = {
  VEKALETNAME: "Vekaletname", DILEKCE: "Dilekçe", SOZLESME: "Sözleşme",
  KARAR: "Karar", TUTANAK: "Tutanak", MAKBUZ: "Makbuz", DIGER: "Diğer",
};

const HAFTA_GUNLERI = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
const AYLAR = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

type BelgeOzet = { id: string; ad: string; tur: BelgeTur; mimeTipi: string };

type Muvekkil = {
  id: string;
  muvekkılNo: number | null;
  tip: MuvekkılTip;
  ad: string;
  tckn: string | null;
  vkn: string | null;
  telefon: string | null;
  isTelefon: string | null;
  email: string | null;
  email2: string | null;
  adres: string | null;
  iban: string | null;
  notlar: string | null;
  avukat: { id: string; ad: string; rol: string; mtPrefiks: boolean } | null;
  dosyalar: Array<{
    id: string;
    dosyaNo: string | null;
    esasNo: string | null;
    mahkeme: string | null;
    durum: DosyaDurum;
    acilisTarihi: Date | null;
    avukat: { id: string; ad: string } | null;
    belgeler: BelgeOzet[];
    durusmalar: Array<{
      id: string;
      tarih: Date;
      tur: DurusmaTur;
      yer: string | null;
      sonucNotu: string | null;
      sonrakiAdim: string | null;
      durum: DurusmaDurum;
    }>;
    gorevler: Array<{
      id: string;
      baslik: string;
      aciklama: string | null;
      sonTarih: Date;
      durum: GorevDurum;
    }>;
  }>;
};

type GecmisEtkinlik = {
  id: string;
  tarih: Date;
  tip: "durusma" | "gorev";
  baslik: string;
  yer: string | null;
  sonucNotu: string | null;
  sonrakiAdim: string | null;
  aciklama: string | null;
  durumEtiket: string;
  durumRenk: string;
  dosyaId: string;
  dosyaBaslik: string;
  dosyaBelgeler: BelgeOzet[];
};

function noFormatla(no: number | null): string {
  if (!no) return "—";
  return String(no).padStart(3, "0");
}

function pad(n: number) { return String(n).padStart(2, "0"); }

export function MuvekkılProfil({ muvekkil }: { muvekkil: Muvekkil }) {
  const router = useRouter();

  const [ay, setAy] = useState(() => {
    const b = new Date();
    return new Date(b.getFullYear(), b.getMonth(), 1);
  });
  const [acikId, setAcikId] = useState<string | null>(null);

  // Etkinlik ekleme dialog state
  const [ekleAcik, setEkleAcik] = useState(false);
  const [ekleTab, setEkleTab] = useState<"durusma" | "gorev">("durusma");
  const [dForm, setDForm] = useState<{ dosyaId: string; tarih: string; tur: DurusmaTur; yer: string }>({
    dosyaId: muvekkil.dosyalar[0]?.id ?? "",
    tarih: "",
    tur: "DURUSMA",
    yer: "",
  });
  const [gForm, setGForm] = useState<{ dosyaId: string; baslik: string; tur: GorevTur; sonTarih: string }>({
    dosyaId: muvekkil.dosyalar[0]?.id ?? "NONE",
    baslik: "",
    tur: "GOREV",
    sonTarih: "",
  });
  const [eklePending, startEkle] = useTransition();

  const simdi = new Date();

  const tumDurusmalar = muvekkil.dosyalar.flatMap((d) =>
    d.durusmalar.map((dr) => ({
      ...dr,
      dosyaBaslik: d.esasNo || d.dosyaNo || "Dosya",
      dosyaId: d.id,
      dosyaBelgeler: d.belgeler,
    }))
  );
  const tumGorevler = muvekkil.dosyalar.flatMap((d) =>
    d.gorevler.map((g) => ({
      ...g,
      dosyaBaslik: d.esasNo || d.dosyaNo || "Dosya",
      dosyaId: d.id,
      dosyaBelgeler: d.belgeler,
    }))
  );

  const gecmisEtkinlikler: GecmisEtkinlik[] = [
    ...tumDurusmalar
      .filter((dr) => new Date(dr.tarih) < simdi)
      .map((dr) => ({
        id: `dr-${dr.id}`,
        tarih: new Date(dr.tarih),
        tip: "durusma" as const,
        baslik: DURUSMA_TUR_ETIKET[dr.tur],
        yer: dr.yer,
        sonucNotu: dr.sonucNotu,
        sonrakiAdim: dr.sonrakiAdim,
        aciklama: null,
        durumEtiket: DURUSMA_DURUM_ETIKET[dr.durum],
        durumRenk: DURUSMA_DURUM_RENK[dr.durum],
        dosyaId: dr.dosyaId,
        dosyaBaslik: dr.dosyaBaslik,
        dosyaBelgeler: dr.dosyaBelgeler,
      })),
    ...tumGorevler
      .filter((g) => new Date(g.sonTarih) < simdi || g.durum === "TAMAMLANDI")
      .map((g) => ({
        id: `gv-${g.id}`,
        tarih: new Date(g.sonTarih),
        tip: "gorev" as const,
        baslik: g.baslik,
        yer: null,
        sonucNotu: null,
        sonrakiAdim: null,
        aciklama: g.aciklama,
        durumEtiket: GOREV_DURUM_ETIKET[g.durum],
        durumRenk: GOREV_DURUM_RENK[g.durum],
        dosyaId: g.dosyaId,
        dosyaBaslik: g.dosyaBaslik,
        dosyaBelgeler: g.dosyaBelgeler,
      })),
  ].sort((a, b) => b.tarih.getTime() - a.tarih.getTime());

  const yaklasanlar = [
    ...tumDurusmalar
      .filter((dr) => new Date(dr.tarih) >= simdi && dr.durum === "BEKLIYOR")
      .map((dr) => ({ tip: "durusma" as const, tarih: new Date(dr.tarih), baslik: DURUSMA_TUR_ETIKET[dr.tur], dosyaId: dr.dosyaId, dosyaBaslik: dr.dosyaBaslik })),
    ...tumGorevler
      .filter((g) => new Date(g.sonTarih) >= simdi && g.durum === "BEKLIYOR")
      .map((g) => ({ tip: "gorev" as const, tarih: new Date(g.sonTarih), baslik: g.baslik, dosyaId: g.dosyaId, dosyaBaslik: g.dosyaBaslik })),
  ].sort((a, b) => a.tarih.getTime() - b.tarih.getTime()).slice(0, 5);

  // Takvim hesabı
  const yil = ay.getFullYear();
  const ayIdx = ay.getMonth();
  const ilkGun = new Date(yil, ayIdx, 1);
  const sonGun = new Date(yil, ayIdx + 1, 0);
  const baslangicOffset = (ilkGun.getDay() + 6) % 7;
  const gunler: (number | null)[] = [
    ...Array(baslangicOffset).fill(null),
    ...Array.from({ length: sonGun.getDate() }, (_, i) => i + 1),
  ];
  while (gunler.length % 7 !== 0) gunler.push(null);

  function etkinliklerGun(gun: number) {
    const drler = tumDurusmalar.filter((dr) => {
      const t = new Date(dr.tarih);
      return t.getFullYear() === yil && t.getMonth() === ayIdx && t.getDate() === gun;
    });
    const gvler = tumGorevler.filter((g) => {
      const t = new Date(g.sonTarih);
      return t.getFullYear() === yil && t.getMonth() === ayIdx && t.getDate() === gun;
    });
    return { drler, gvler };
  }

  const bugun = new Date();
  const bugunGun = bugun.getFullYear() === yil && bugun.getMonth() === ayIdx ? bugun.getDate() : null;

  function gunTikla(gun: number) {
    const dateStr = `${yil}-${pad(ayIdx + 1)}-${pad(gun)}`;
    setDForm((prev) => ({ ...prev, tarih: `${dateStr}T09:00`, dosyaId: muvekkil.dosyalar[0]?.id ?? "" }));
    setGForm((prev) => ({ ...prev, sonTarih: dateStr, dosyaId: muvekkil.dosyalar[0]?.id ?? "NONE" }));
    setEkleTab("durusma");
    setEkleAcik(true);
  }

  function handleEkle(e: React.FormEvent) {
    e.preventDefault();
    startEkle(async () => {
      try {
        if (ekleTab === "durusma") {
          if (!dForm.dosyaId) throw new Error("Dosya seçiniz.");
          if (!dForm.tarih) throw new Error("Tarih giriniz.");
          await durusmaEkle({ dosyaId: dForm.dosyaId, tarih: dForm.tarih, tur: dForm.tur, yer: dForm.yer || undefined });
          toast.success("Duruşma eklendi.");
        } else {
          if (!gForm.baslik.trim()) throw new Error("Başlık giriniz.");
          if (!gForm.sonTarih) throw new Error("Tarih giriniz.");
          await gorevEkle({ dosyaId: gForm.dosyaId === "NONE" ? undefined : gForm.dosyaId, baslik: gForm.baslik, tur: gForm.tur, sonTarih: gForm.sonTarih });
          toast.success("Görev eklendi.");
        }
        setEkleAcik(false);
        router.refresh();
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Bir hata oluştu.");
      }
    });
  }

  return (
    <div className="space-y-5">
      {/* Üst başlık + iletişim */}
      <div className="rounded-xl overflow-hidden shadow-md">
        <div className="px-5 py-4" style={{ backgroundColor: NAVY }}>
          <div className="flex items-center gap-1.5 text-xs mb-3" style={{ color: "rgba(255,255,255,0.50)" }}>
            <Link href="/dashboard/muvekkillar" className="flex items-center gap-1 hover:text-white transition-colors">
              <ArrowLeft className="h-3 w-3" />Müvekkiller
            </Link>
            <span>/</span>
            <span className="text-white font-medium">{muvekkil.ad}</span>
          </div>
          <div className="flex items-center gap-4">
            <div className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-bold",
              muvekkil.tip === "SIRKET" ? "bg-blue-400/20 text-blue-100" : "bg-white/15 text-white"
            )}>
              {muvekkil.tip === "SIRKET"
                ? <Building2 className="h-6 w-6" />
                : muvekkil.ad.split(" ").slice(0, 2).map((s) => s[0]).join("").toUpperCase()
              }
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white">{muvekkil.ad}</h1>
                <span className="text-xs font-mono px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.9)" }}>
                  #{noFormatla(muvekkil.muvekkılNo)}
                </span>
                {muvekkil.avukat?.mtPrefiks && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wider" style={{ backgroundColor: "rgba(251,191,36,0.25)", color: "#fbbf24" }}>
                    {muvekkil.avukat.ad.split(" ").map((s) => s[0] ?? "").join("").toUpperCase()}
                  </span>
                )}
              </div>
              <p className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.55)" }}>
                {muvekkil.tip === "KISI" ? "Bireysel Müvekkil" : "Kurumsal Müvekkil"} · {muvekkil.dosyalar.length} dosya
              </p>
            </div>
          </div>
        </div>

        {(muvekkil.tckn || muvekkil.vkn || muvekkil.telefon || muvekkil.isTelefon || muvekkil.email || muvekkil.email2 || muvekkil.adres || muvekkil.iban) && (
          <div className="bg-card border-t px-5 py-4">
            <div className="flex flex-wrap gap-x-8 gap-y-3">
              {muvekkil.tckn && <IletisimItem icon={<Hash className="h-3.5 w-3.5" />} etiket="TCKN" deger={muvekkil.tckn} />}
              {muvekkil.vkn && <IletisimItem icon={<Hash className="h-3.5 w-3.5" />} etiket="VKN" deger={muvekkil.vkn} />}
              {muvekkil.telefon && <IletisimItem icon={<Phone className="h-3.5 w-3.5" />} etiket="Cep Tel." deger={muvekkil.telefon} />}
              {muvekkil.isTelefon && <IletisimItem icon={<Phone className="h-3.5 w-3.5" />} etiket="İş Tel." deger={muvekkil.isTelefon} />}
              {muvekkil.email && <IletisimItem icon={<Mail className="h-3.5 w-3.5" />} etiket="E-posta" deger={muvekkil.email} />}
              {muvekkil.email2 && <IletisimItem icon={<Mail className="h-3.5 w-3.5" />} etiket="2. E-posta" deger={muvekkil.email2} />}
              {muvekkil.adres && <IletisimItem icon={<MapPin className="h-3.5 w-3.5" />} etiket="Adres" deger={muvekkil.adres} />}
              {muvekkil.iban && <IletisimItem icon={<CreditCard className="h-3.5 w-3.5" />} etiket="IBAN" deger={muvekkil.iban.replace(/(.{4})/g, "$1 ").trim()} mono />}
            </div>
          </div>
        )}
      </div>

      {/* Orta grid: Dosyalar (sol) + Kronoloji (sağ) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Dosyalar */}
        <div className="lg:col-span-1">
          <div className="rounded-xl overflow-hidden shadow-sm">
            <div className="flex items-center gap-2 px-4 py-3" style={{ backgroundColor: NAVY }}>
              <FileText className="h-3.5 w-3.5" style={{ color: "rgba(255,255,255,0.55)" }} />
              <p className="text-xs font-semibold text-white uppercase tracking-wide">Dosyalar</p>
              <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-white/15 text-white font-semibold">
                {muvekkil.dosyalar.length}
              </span>
            </div>
            {muvekkil.dosyalar.length === 0 ? (
              <div className="bg-card px-4 py-8 text-center text-sm text-muted-foreground">Henüz dosya yok</div>
            ) : (
              <div className="bg-card divide-y">
                {muvekkil.dosyalar.map((d) => (
                  <Link key={d.id} href={`/dashboard/dosyalar/${d.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{d.esasNo || d.dosyaNo || "Dosya"}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {[d.mahkeme, d.acilisTarihi ? new Date(d.acilisTarihi).toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" }) : null].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold shrink-0", DURUM_RENK[d.durum])}>
                      {DURUM_ETIKET[d.durum]}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Kronoloji */}
        <div className="lg:col-span-2">
          <div className="rounded-xl overflow-hidden shadow-sm">
            <div className="flex items-center gap-2 px-4 py-3" style={{ backgroundColor: NAVY }}>
              <Archive className="h-3.5 w-3.5" style={{ color: "rgba(255,255,255,0.55)" }} />
              <p className="text-xs font-semibold text-white uppercase tracking-wide">Kronoloji</p>
              <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-white/15 text-white font-semibold">
                {gecmisEtkinlikler.length}
              </span>
            </div>

            {gecmisEtkinlikler.length === 0 ? (
              <div className="bg-card px-4 py-16 text-center text-sm text-muted-foreground">
                Henüz geçmiş etkinlik yok
              </div>
            ) : (
              <div className="bg-card divide-y">
                {gecmisEtkinlikler.map((e) => {
                  const acik = acikId === e.id;
                  const tarih = new Date(e.tarih);
                  const varDetay = e.yer || e.sonucNotu || e.sonrakiAdim || e.aciklama || e.dosyaBelgeler.length > 0;

                  return (
                    <div key={e.id}>
                      <button
                        onClick={() => varDetay ? setAcikId(acik ? null : e.id) : undefined}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
                          varDetay ? "hover:bg-muted/30 cursor-pointer" : "cursor-default"
                        )}
                      >
                        <div className="shrink-0 w-10 text-center">
                          <p className="text-sm font-bold text-foreground leading-none">{tarih.getDate()}</p>
                          <p className="text-[10px] text-muted-foreground uppercase mt-0.5">
                            {AYLAR[tarih.getMonth()].slice(0, 3)}
                          </p>
                          <p className="text-[9px] text-muted-foreground/60">{tarih.getFullYear()}</p>
                        </div>

                        <div className={cn(
                          "shrink-0 h-8 w-8 rounded-full flex items-center justify-center",
                          e.tip === "durusma" ? "bg-blue-100" : "bg-amber-100"
                        )}>
                          {e.tip === "durusma"
                            ? <Scale className="h-4 w-4 text-blue-600" />
                            : <CheckCircle className="h-4 w-4 text-amber-600" />
                          }
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{e.baslik}</p>
                          <p className="text-xs text-muted-foreground truncate">{e.dosyaBaslik}</p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border", e.durumRenk)}>
                            {e.durumEtiket}
                          </span>
                          {varDetay && (
                            <span className="text-muted-foreground/40">
                              {acik ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </span>
                          )}
                        </div>
                      </button>

                      {acik && varDetay && (
                        <div className="px-4 pb-4 pt-2 border-t border-muted/30 bg-muted/10">
                          <div className="ml-[84px] space-y-3">
                            {e.yer && (
                              <div>
                                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">Yer</p>
                                <p className="text-sm">{e.yer}</p>
                              </div>
                            )}
                            {e.aciklama && (
                              <div>
                                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">Açıklama</p>
                                <p className="text-sm">{e.aciklama}</p>
                              </div>
                            )}
                            {e.sonucNotu && (
                              <div>
                                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">Sonuç Notu</p>
                                <p className="text-sm">{e.sonucNotu}</p>
                              </div>
                            )}
                            {e.sonrakiAdim && (
                              <div>
                                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">Sonraki Adım</p>
                                <p className="text-sm">{e.sonrakiAdim}</p>
                              </div>
                            )}
                            {e.dosyaBelgeler.length > 0 && (
                              <div>
                                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                                  Dosya Belgeleri ({e.dosyaBelgeler.length})
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {e.dosyaBelgeler.map((b) => (
                                    <a
                                      key={b.id}
                                      href={`/api/belgeler/${b.id}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border bg-card hover:bg-muted/50 transition-colors text-xs font-medium"
                                    >
                                      <Paperclip className="h-3 w-3 text-muted-foreground shrink-0" />
                                      <span className="max-w-[140px] truncate">{b.ad}</span>
                                      <span className="text-[9px] text-muted-foreground/60 shrink-0 ml-0.5">{BELGE_TUR_ETIKET[b.tur]}</span>
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}
                            <Link
                              href={`/dashboard/dosyalar/${e.dosyaId}`}
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                            >
                              <FileText className="h-3 w-3" />
                              Dosyaya git — {e.dosyaBaslik}
                            </Link>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Alt grid: Takvim (sol) + Yaklaşanlar (sağ) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Takvim */}
        <div className="rounded-xl overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-4 py-2.5" style={{ backgroundColor: NAVY }}>
            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5" style={{ color: "rgba(255,255,255,0.55)" }} />
              <p className="text-xs font-semibold text-white uppercase tracking-wide">Takvim</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <button onClick={() => setAy(new Date(yil, ayIdx - 1, 1))} className="flex h-5 w-5 items-center justify-center rounded text-white/60 hover:text-white hover:bg-white/15 transition-colors">
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <span className="text-[11px] font-semibold text-white min-w-[85px] text-center">{AYLAR[ayIdx]} {yil}</span>
                <button onClick={() => setAy(new Date(yil, ayIdx + 1, 1))} className="flex h-5 w-5 items-center justify-center rounded text-white/60 hover:text-white hover:bg-white/15 transition-colors">
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
              <button
                onClick={() => {
                  const today = new Date();
                  const dateStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
                  setDForm((prev) => ({ ...prev, tarih: `${dateStr}T09:00`, dosyaId: muvekkil.dosyalar[0]?.id ?? "" }));
                  setGForm((prev) => ({ ...prev, sonTarih: dateStr, dosyaId: muvekkil.dosyalar[0]?.id ?? "NONE" }));
                  setEkleTab("durusma");
                  setEkleAcik(true);
                }}
                className="flex h-6 w-6 items-center justify-center rounded-md bg-white/15 border border-white/20 text-white hover:bg-white/25 transition-colors"
                title="Etkinlik Ekle"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <div className="bg-card">
            <div className="grid grid-cols-7 border-b">
              {HAFTA_GUNLERI.map((g) => (
                <div key={g} className="py-1.5 text-center text-[9px] font-bold uppercase text-muted-foreground/60">{g}</div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {gunler.map((gun, idx) => {
                if (!gun) return <div key={`bos-${idx}`} className="aspect-square border-b border-r border-muted/20 bg-muted/5" />;
                const { drler, gvler } = etkinliklerGun(gun);
                const bugunMu = bugunGun === gun;
                const hafSonu = idx % 7 >= 5;
                const varEtkinlik = drler.length > 0 || gvler.length > 0;
                return (
                  <div
                    key={gun}
                    onClick={() => gunTikla(gun)}
                    className={cn(
                      "aspect-square border-b border-r border-muted/20 flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-colors group",
                      hafSonu ? "bg-muted/10 hover:bg-muted/25" : "hover:bg-primary/5",
                      bugunMu && "bg-primary/8"
                    )}
                  >
                    <span className={cn(
                      "text-[11px] font-semibold h-5 w-5 flex items-center justify-center rounded-full leading-none transition-colors",
                      bugunMu
                        ? "bg-primary text-white"
                        : "text-foreground/70 group-hover:bg-muted group-hover:text-foreground"
                    )}>
                      {gun}
                    </span>
                    {varEtkinlik && (
                      <div className="flex gap-0.5">
                        {drler.length > 0 && <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />}
                        {gvler.length > 0 && <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-4 px-3 py-2 border-t text-[10px] text-muted-foreground">
              <div className="flex items-center gap-1.5"><div className="h-1.5 w-1.5 rounded-full bg-blue-500" />Duruşma</div>
              <div className="flex items-center gap-1.5"><div className="h-1.5 w-1.5 rounded-full bg-amber-500" />Görev</div>
              <p className="ml-auto text-muted-foreground/50">Güne tıklayarak ekle</p>
            </div>
          </div>
        </div>

        {/* Yaklaşan etkinlikler */}
        <div className="rounded-xl overflow-hidden shadow-sm">
          <div className="flex items-center gap-2 px-4 py-3" style={{ backgroundColor: NAVY }}>
            <Clock className="h-3.5 w-3.5" style={{ color: "rgba(255,255,255,0.55)" }} />
            <p className="text-xs font-semibold text-white uppercase tracking-wide">Yaklaşan</p>
            {yaklasanlar.length > 0 && (
              <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-white/15 text-white font-semibold">
                {yaklasanlar.length}
              </span>
            )}
          </div>
          {yaklasanlar.length === 0 ? (
            <div className="bg-card px-4 py-8 text-center text-sm text-muted-foreground">Yaklaşan etkinlik yok</div>
          ) : (
            <div className="bg-card divide-y">
              {yaklasanlar.map((e, i) => {
                const gunFark = Math.ceil((e.tarih.getTime() - simdi.getTime()) / (1000 * 60 * 60 * 24));
                return (
                  <Link key={i} href={`/dashboard/dosyalar/${e.dosyaId}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors">
                    <div className={cn("h-2 w-2 rounded-full shrink-0", e.tip === "durusma" ? "bg-blue-500" : "bg-amber-500")} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{e.baslik}</p>
                      <p className="text-[11px] text-muted-foreground">{e.dosyaBaslik}</p>
                    </div>
                    <p className={cn("text-xs shrink-0 font-semibold", gunFark <= 3 ? "text-red-600" : "text-muted-foreground")}>
                      {gunFark === 0 ? "Bugün" : gunFark === 1 ? "Yarın" : `${gunFark}g`}
                    </p>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* Etkinlik Ekleme Dialogu */}
      <Dialog open={ekleAcik} onOpenChange={(v) => !eklePending && setEkleAcik(v)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Etkinlik Ekle</DialogTitle>
          </DialogHeader>

          {/* Tab seçimi */}
          <div className="flex rounded-lg overflow-hidden border mb-1">
            {(["durusma", "gorev"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setEkleTab(tab)}
                className={cn(
                  "flex-1 py-2 text-sm font-medium transition-colors",
                  ekleTab === tab
                    ? "text-white"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                )}
                style={ekleTab === tab ? { backgroundColor: NAVY } : {}}
              >
                {tab === "durusma" ? "Duruşma / Toplantı" : "Görev / Süre"}
              </button>
            ))}
          </div>

          <form onSubmit={handleEkle} className="space-y-3 pt-1">
            {ekleTab === "durusma" ? (
              <>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Dosya *</label>
                  <Select value={dForm.dosyaId} onValueChange={(v) => setDForm({ ...dForm, dosyaId: v ?? "" })} disabled={eklePending}>
                    <SelectTrigger><SelectValue placeholder="Dosya seçin" /></SelectTrigger>
                    <SelectContent>
                      {muvekkil.dosyalar.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.esasNo || d.dosyaNo || "Dosya"} {d.mahkeme ? `· ${d.mahkeme}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Tarih & Saat *</label>
                    <Input
                      type="datetime-local"
                      value={dForm.tarih}
                      onChange={(e) => setDForm({ ...dForm, tarih: e.target.value })}
                      required
                      disabled={eklePending}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Tür</label>
                    <Select value={dForm.tur} onValueChange={(v) => setDForm({ ...dForm, tur: (v ?? "DURUSMA") as DurusmaTur })} disabled={eklePending}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DURUSMA">Duruşma</SelectItem>
                        <SelectItem value="KESIF">Keşif</SelectItem>
                        <SelectItem value="TOPLANTI">Toplantı</SelectItem>
                        <SelectItem value="SON_GUN">Son Gün</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Yer</label>
                  <Input
                    value={dForm.yer}
                    onChange={(e) => setDForm({ ...dForm, yer: e.target.value })}
                    placeholder="Mahkeme salonu, adres..."
                    disabled={eklePending}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Başlık *</label>
                  <Input
                    value={gForm.baslik}
                    onChange={(e) => setGForm({ ...gForm, baslik: e.target.value })}
                    placeholder="Görev başlığı"
                    required
                    disabled={eklePending}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Son Tarih *</label>
                    <Input
                      type="date"
                      value={gForm.sonTarih}
                      onChange={(e) => setGForm({ ...gForm, sonTarih: e.target.value })}
                      required
                      disabled={eklePending}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Tür</label>
                    <Select value={gForm.tur} onValueChange={(v) => setGForm({ ...gForm, tur: (v ?? "GOREV") as GorevTur })} disabled={eklePending}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GOREV">Görev</SelectItem>
                        <SelectItem value="SURE">Süre</SelectItem>
                        <SelectItem value="TEMYIZ">Temyiz</SelectItem>
                        <SelectItem value="ITIRAZ">İtiraz</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Dosya (isteğe bağlı)</label>
                  <Select value={gForm.dosyaId} onValueChange={(v) => setGForm({ ...gForm, dosyaId: v ?? "NONE" })} disabled={eklePending}>
                    <SelectTrigger><SelectValue placeholder="Dosya seçin (opsiyonel)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">— Dosya yok —</SelectItem>
                      {muvekkil.dosyalar.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.esasNo || d.dosyaNo || "Dosya"} {d.mahkeme ? `· ${d.mahkeme}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setEkleAcik(false)} disabled={eklePending}>
                İptal
              </Button>
              <Button type="submit" disabled={eklePending}>
                {eklePending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Ekle
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function IletisimItem({ icon, etiket, deger, mono }: { icon: React.ReactNode; etiket: string; deger: string; mono?: boolean }) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 text-muted-foreground/60 shrink-0">{icon}</span>
      <div>
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide leading-none mb-0.5">{etiket}</p>
        <p className={cn("text-sm text-foreground leading-snug", mono && "font-mono text-xs")}>{deger}</p>
      </div>
    </div>
  );
}
