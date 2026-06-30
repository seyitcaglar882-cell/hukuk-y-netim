"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { dosyaEkle, dosyaGuncelle } from "@/lib/actions/dosya";
import { DosyaTip, DosyaDurum, MuvekkılTip } from "@prisma/client";
import { cn } from "@/lib/utils";

const AYLAR = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];
const YILLAR = Array.from({ length: 21 }, (_, i) => 2015 + i);

const DURUM_ETIKET: Record<DosyaDurum, string> = {
  ACIK: "Açık",
  DERDEST: "Derdest",
  KARAR: "Karar",
  TEMYIZ: "Temyiz",
  KAPALI: "Kapalı",
};

type Muvekkil = { id: string; ad: string; tip: MuvekkılTip };

type Dosya = {
  id: string;
  dosyaNo: string | null;
  esasNo: string | null;
  tip: DosyaTip;
  altTip: string | null;
  mahkeme: string | null;
  durum: DosyaDurum;
  acilisTarihi: Date | null;
  aciklama: string | null;
  muvekkılId: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  dosya?: Dosya | null;
  muvekkillar: Muvekkil[];
};

export function DosyaDialog({ open, onClose, dosya, muvekkillar }: Props) {
  const duzenle = !!dosya;
  const [pending, startTransition] = useTransition();
  const [takvimAcik, setTakvimAcik] = useState(false);
  const [acilisTarihi, setAcilisTarihi] = useState<Date | undefined>(
    dosya?.acilisTarihi ? new Date(dosya.acilisTarihi) : undefined
  );
  const [kalenderAy, setKalenderAy] = useState<Date>(
    dosya?.acilisTarihi ? new Date(dosya.acilisTarihi) : new Date()
  );

  const [form, setForm] = useState({
    dosyaNo: dosya?.dosyaNo ?? "",
    esasNo: dosya?.esasNo ?? "",
    tip: dosya?.tip ?? ("DAVA" as DosyaTip),
    altTip: dosya?.altTip ?? "",
    mahkeme: dosya?.mahkeme ?? "",
    durum: dosya?.durum ?? ("DERDEST" as DosyaDurum),
    aciklama: dosya?.aciklama ?? "",
    muvekkılId: dosya?.muvekkılId ?? (muvekkillar[0]?.id ?? ""),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.muvekkılId) { toast.error("Müvekkil seçiniz."); return; }
    startTransition(async () => {
      try {
        const data = {
          dosyaNo: form.dosyaNo || undefined,
          esasNo: form.esasNo || undefined,
          tip: form.tip,
          altTip: form.altTip || undefined,
          mahkeme: form.mahkeme || undefined,
          durum: form.durum,
          acilisTarihi: acilisTarihi ? format(acilisTarihi, "yyyy-MM-dd") : undefined,
          aciklama: form.aciklama || undefined,
          muvekkılId: form.muvekkılId,
        };
        if (duzenle) {
          await dosyaGuncelle(dosya!.id, data);
          toast.success("Dosya güncellendi.");
        } else {
          await dosyaEkle(data);
          toast.success("Dosya açıldı.");
        }
        onClose();
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Bir hata oluştu.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={() => !pending && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{duzenle ? "Dosyayı Düzenle" : "Yeni Dosya Aç"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 pt-2">

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Dosya Tipi *</label>
              <Select value={form.tip} onValueChange={(v) => setForm({ ...form, tip: v as DosyaTip })} disabled={pending}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="DAVA">Dava Dosyası</SelectItem>
                  <SelectItem value="DANISMANLIK">Danışmanlık</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Durum *</label>
              <Select value={form.durum} onValueChange={(v) => setForm({ ...form, durum: v as DosyaDurum })} disabled={pending}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.entries(DURUM_ETIKET) as [DosyaDurum, string][]).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Müvekkil *</label>
            <Select
              value={form.muvekkılId}
              onValueChange={(v) => setForm({ ...form, muvekkılId: v ?? "" })}
              disabled={pending}
            >
              <SelectTrigger>
                <SelectValue placeholder="Müvekkil seçin">
                  {form.muvekkılId ? muvekkillar.find(m => m.id === form.muvekkılId)?.ad : undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {muvekkillar.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.ad}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Büro Dosya No</label>
              <Input value={form.dosyaNo} onChange={(e) => setForm({ ...form, dosyaNo: e.target.value })} disabled={pending} placeholder="2024/001" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Esas No (UYAP)</label>
              <Input value={form.esasNo} onChange={(e) => setForm({ ...form, esasNo: e.target.value })} disabled={pending} placeholder="2024/1234 E." />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Mahkeme / Daire</label>
              <Input value={form.mahkeme} onChange={(e) => setForm({ ...form, mahkeme: e.target.value })} disabled={pending} placeholder="İstanbul 1. Asliye" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Açılış Tarihi</label>
              <Popover open={takvimAcik} onOpenChange={setTakvimAcik}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    disabled={pending}
                    className={cn(
                      "w-full flex items-center gap-2 rounded-md border px-3 py-2 text-sm text-left transition-colors hover:bg-muted/30",
                      !acilisTarihi && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    {acilisTarihi
                      ? acilisTarihi.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })
                      : "Tarih seçin"}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start" avoidCollisions={false}>
                  <div className="flex items-center gap-2 px-3 pt-3 pb-1">
                    <Select
                      value={String(kalenderAy.getMonth())}
                      onValueChange={(v) => setKalenderAy(new Date(kalenderAy.getFullYear(), Number(v), 1))}
                    >
                      <SelectTrigger className="h-7 flex-1 text-xs">
                        <SelectValue>{AYLAR[kalenderAy.getMonth()]}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {AYLAR.map((ay, i) => (
                          <SelectItem key={i} value={String(i)}>{ay}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={String(kalenderAy.getFullYear())}
                      onValueChange={(v) => setKalenderAy(new Date(Number(v), kalenderAy.getMonth(), 1))}
                    >
                      <SelectTrigger className="h-7 w-[72px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {YILLAR.map((y) => (
                          <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Calendar
                    mode="single"
                    selected={acilisTarihi}
                    onSelect={(d) => { setAcilisTarihi(d); setTakvimAcik(false); }}
                    month={kalenderAy}
                    onMonthChange={setKalenderAy}
                    locale={tr}
                    fixedWeeks
                    autoFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Dosya Alt Tipi</label>
            <Input value={form.altTip} onChange={(e) => setForm({ ...form, altTip: e.target.value })} disabled={pending} placeholder="İcra, Ceza, Vergi, Aile, İş, Ticaret..." />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Açıklama</label>
            <Input value={form.aciklama} onChange={(e) => setForm({ ...form, aciklama: e.target.value })} disabled={pending} placeholder="Dosya hakkında kısa not" />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={pending}>İptal</Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {duzenle ? "Kaydet" : "Dosya Aç"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
