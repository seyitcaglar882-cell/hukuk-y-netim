"use client";

import { useState, useTransition, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Loader2, AlertTriangle, CalendarIcon, Clock } from "lucide-react";
import { toast } from "sonner";
import { durusmaEkle } from "@/lib/actions/durusma";
import { DurusmaTur, MuvekkılTip } from "@prisma/client";
import { tr } from "date-fns/locale";
import { cn } from "@/lib/utils";

type Dosya = { id: string; esasNo: string | null; dosyaNo: string | null; muvekkil: { ad: string; tip: MuvekkılTip }; avukatId: string | null; avukat?: { ad: string; mtPrefiks: boolean } | null };

function dosyaEtiketi(d: Dosya): string {
  const prefix = d.avukat?.mtPrefiks ? "MT * " : "";
  return `${prefix}${d.esasNo || d.dosyaNo || d.id.slice(0, 8)} — ${d.muvekkil.ad}`;
}

const TUR_ETIKET: Record<DurusmaTur, string> = {
  DURUSMA: "Duruşma", KESIF: "Keşif", TOPLANTI: "Toplantı", SON_GUN: "Son Gün",
};

const SAATLER = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const DAKIKALAR = ["00", "15", "30", "45"];

type Props = { open: boolean; onClose: () => void; dosyalar: Dosya[]; avukatlar?: unknown[]; baslangicTarihi?: string };
type Hatalar = { dosyaId?: string; tarih?: string };

function tarihStr(date: Date | undefined, saat: string, dakika: string): string {
  if (!date) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}T${saat}:${dakika}`;
}

export function DurusmaDialog({ open, onClose, dosyalar, baslangicTarihi }: Props) {
  const [pending, startTransition] = useTransition();
  const [cakismaUyari, setCakismaUyari] = useState("");
  const [zorunluKaydet, setZorunluKaydet] = useState(false);
  const [hatalar, setHatalar] = useState<Hatalar>({});
  const [takvimAcik, setTakvimAcik] = useState(false);

  const [seciliTarih, setSeciliTarih] = useState<Date | undefined>(
    baslangicTarihi ? new Date(baslangicTarihi) : undefined
  );
  const [saat, setSaat] = useState("09");
  const [dakika, setDakika] = useState("00");

  const [form, setForm] = useState({
    dosyaId: dosyalar[0]?.id ?? "",
    tur: "DURUSMA" as DurusmaTur,
    yer: "",
  });

  useEffect(() => {
    if (open) {
      setSeciliTarih(baslangicTarihi ? new Date(baslangicTarihi) : undefined);
      setSaat("09");
      setDakika("00");
      setCakismaUyari("");
      setZorunluKaydet(false);
      setHatalar({});
      setForm({ dosyaId: dosyalar[0]?.id ?? "", tur: "DURUSMA", yer: "" });
    }
  }, [open, baslangicTarihi]);

  const seciliDosya = dosyalar.find(d => d.id === form.dosyaId);

  const tarihGosterim = seciliTarih
    ? seciliTarih.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })
    : "Tarih seçin";

  function validate(): boolean {
    const yeni: Hatalar = {};
    if (!form.dosyaId) yeni.dosyaId = "Dosya seçilmesi zorunludur.";
    if (!seciliTarih) yeni.tarih = "Tarih girilmesi zorunludur.";
    setHatalar(yeni);
    return Object.keys(yeni).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    const tarihVal = tarihStr(seciliTarih, saat, dakika);
    startTransition(async () => {
      try {
        await durusmaEkle({
          dosyaId: form.dosyaId,
          tarih: tarihVal,
          tur: form.tur,
          yer: form.yer || undefined,
          avukatId: seciliDosya?.avukatId ?? undefined,
          zorunluKaydet,
        });
        toast.success("Duruşma takvime eklendi.");
        onClose();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Bir hata oluştu.";
        if (msg.startsWith("Çakışma")) {
          setCakismaUyari(msg);
          setZorunluKaydet(true);
        } else {
          toast.error(msg);
        }
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={() => !pending && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Duruşma / Toplantı Oluştur</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 pt-2">

          <div className="space-y-1">
            <label className="text-sm font-medium">Dosya *</label>
            <Select
              value={form.dosyaId}
              onValueChange={(v) => { setForm({ ...form, dosyaId: v ?? "" }); setHatalar(h => ({ ...h, dosyaId: undefined })); }}
              disabled={pending}
            >
              <SelectTrigger className={hatalar.dosyaId ? "border-destructive" : ""}>
                <SelectValue placeholder="Dosya seçin">
                  {seciliDosya ? dosyaEtiketi(seciliDosya) : undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {dosyalar.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{dosyaEtiketi(d)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hatalar.dosyaId && <p className="text-xs text-destructive">{hatalar.dosyaId}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Tür *</label>
            <Select value={form.tur} onValueChange={(v) => setForm({ ...form, tur: (v ?? "DURUSMA") as DurusmaTur })} disabled={pending}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.entries(TUR_ETIKET) as [DurusmaTur, string][]).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tarih seçici */}
          <div className="space-y-1">
            <label className="text-sm font-medium">Tarih *</label>
            <Popover open={takvimAcik} onOpenChange={setTakvimAcik}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  disabled={pending}
                  className={cn(
                    "w-full flex items-center gap-2 rounded-md border px-3 py-2 text-sm text-left transition-colors hover:bg-muted/30",
                    hatalar.tarih ? "border-destructive" : "border-input",
                    !seciliTarih && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  {tarihGosterim}
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="p-0">
                <Calendar
                  mode="single"
                  selected={seciliTarih}
                  onSelect={(d) => { setSeciliTarih(d); setTakvimAcik(false); setHatalar(h => ({ ...h, tarih: undefined })); }}
                  locale={tr}
                  autoFocus
                />
              </PopoverContent>
            </Popover>
            {hatalar.tarih && <p className="text-xs text-destructive">{hatalar.tarih}</p>}
          </div>

          {/* Saat seçici */}
          <div className="space-y-1">
            <label className="text-sm font-medium">Saat</label>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
              <Select value={saat} onValueChange={(v) => v && setSaat(v)} disabled={pending}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-48">
                  {SAATLER.map((s) => (
                    <SelectItem key={s} value={s}>{s}:00</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-muted-foreground font-bold">:</span>
              <Select value={dakika} onValueChange={(v) => v && setDakika(v)} disabled={pending}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAKIKALAR.map((d) => (
                    <SelectItem key={d} value={d}>:{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Yer / Mahkeme</label>
            <Input
              value={form.yer}
              onChange={(e) => setForm({ ...form, yer: e.target.value })}
              disabled={pending}
              placeholder="İstanbul Adliyesi, Salon 5..."
            />
          </div>

          {cakismaUyari && (
            <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Çakışma Uyarısı</p>
                <p>{cakismaUyari}</p>
                <p className="mt-1 text-xs">Yine de eklemek için tekrar kaydet&apos;e basın.</p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={pending}>İptal</Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Ekle
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
