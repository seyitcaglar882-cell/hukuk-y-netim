"use client";

import { useState, useTransition } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { gorevEkle } from "@/lib/actions/gorev";
import { GorevTur, MuvekkılTip } from "@prisma/client";

type Dosya = { id: string; esasNo: string | null; dosyaNo: string | null; muvekkil: { ad: string; tip: MuvekkılTip }; avukatId: string | null; avukat?: { ad: string; mtPrefiks: boolean } | null };

function dosyaEtiketi(d: Dosya): string {
  const prefix = d.avukat?.mtPrefiks ? `${d.avukat.ad.split(" ").map(s => s[0] ?? "").join("").toUpperCase()} * ` : "";
  return `${prefix}${d.esasNo || d.dosyaNo || d.id.slice(0, 8)} — ${d.muvekkil.ad}`;
}
type Avukat = { id: string; ad: string };

const TUR_ETIKET: Record<GorevTur, string> = {
  GOREV: "Genel Görev", SURE: "Süre Takibi", TEMYIZ: "Temyiz Süresi", ITIRAZ: "İtiraz Süresi",
};

type Props = { open: boolean; onClose: () => void; dosyalar: Dosya[]; avukatlar: Avukat[]; dosyaId?: string };
type Hatalar = { baslik?: string; sonTarih?: string };

export function GorevDialog({ open, onClose, dosyalar, avukatlar, dosyaId }: Props) {
  const [pending, startTransition] = useTransition();
  const [hatalar, setHatalar] = useState<Hatalar>({});
  const [form, setForm] = useState({
    dosyaId: dosyaId ?? "",
    baslik: "",
    aciklama: "",
    tur: "GOREV" as GorevTur,
    sonTarih: "",
    atananId: "",
    hatirlatmaTarihi: "",
  });

  function validate(): boolean {
    const yeni: Hatalar = {};
    if (!form.baslik.trim()) yeni.baslik = "Başlık boş bırakılamaz.";
    if (!form.sonTarih) yeni.sonTarih = "Son tarih girilmesi zorunludur.";
    setHatalar(yeni);
    return Object.keys(yeni).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    startTransition(async () => {
      try {
        await gorevEkle({
          dosyaId: form.dosyaId || undefined,
          baslik: form.baslik,
          aciklama: form.aciklama || undefined,
          tur: form.tur,
          sonTarih: form.sonTarih,
          atananId: form.atananId || undefined,
          hatirlatmaTarihi: form.hatirlatmaTarihi || undefined,
        });
        toast.success("Görev eklendi.");
        onClose();
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Hata.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={() => !pending && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Görev / Süre Ekle</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 pt-2">

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Tür *</label>
              <Select value={form.tur} onValueChange={(v) => setForm({ ...form, tur: (v ?? "GOREV") as GorevTur })} disabled={pending}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.entries(TUR_ETIKET) as [GorevTur, string][]).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Son Tarih *</label>
              <Input
                type="date"
                value={form.sonTarih}
                onChange={(e) => { setForm({ ...form, sonTarih: e.target.value }); setHatalar(h => ({ ...h, sonTarih: undefined })); }}
                disabled={pending}
                className={hatalar.sonTarih ? "border-destructive" : ""}
              />
              {hatalar.sonTarih && <p className="text-xs text-destructive">{hatalar.sonTarih}</p>}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Başlık *</label>
            <Input
              value={form.baslik}
              onChange={(e) => { setForm({ ...form, baslik: e.target.value }); setHatalar(h => ({ ...h, baslik: undefined })); }}
              disabled={pending}
              placeholder="Temyiz dilekçesi hazırla..."
              className={hatalar.baslik ? "border-destructive" : ""}
            />
            {hatalar.baslik && <p className="text-xs text-destructive">{hatalar.baslik}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">İlgili Dosya</label>
            <Select value={form.dosyaId || "none"} onValueChange={(v) => setForm({ ...form, dosyaId: v === "none" || !v ? "" : v })} disabled={pending}>
              <SelectTrigger>
                <SelectValue placeholder="— Genel Görev —">
                  {(() => { const d = dosyalar.find(x => x.id === form.dosyaId); return d ? dosyaEtiketi(d) : undefined; })()}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Genel Görev —</SelectItem>
                {dosyalar.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{dosyaEtiketi(d)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Atanan</label>
              <Select value={form.atananId || "none"} onValueChange={(v) => setForm({ ...form, atananId: v === "none" || !v ? "" : v })} disabled={pending}>
                <SelectTrigger>
                  <SelectValue placeholder="— Seçilmedi —">
                    {form.atananId ? avukatlar.find(a => a.id === form.atananId)?.ad : undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Seçilmedi —</SelectItem>
                  {avukatlar.map((a) => <SelectItem key={a.id} value={a.id}>{a.ad}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Hatırlatma Tarihi</label>
              <Input type="date" value={form.hatirlatmaTarihi} onChange={(e) => setForm({ ...form, hatirlatmaTarihi: e.target.value })} disabled={pending} />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Açıklama</label>
            <Input value={form.aciklama} onChange={(e) => setForm({ ...form, aciklama: e.target.value })} disabled={pending} placeholder="Opsiyonel açıklama" />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={pending}>İptal</Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Ekle
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
