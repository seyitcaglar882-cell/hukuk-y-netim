"use client";

import { useState, useTransition } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Trash2, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { durusmaGuncelle, durusmaSil } from "@/lib/actions/durusma";
import { DurusmaTur, DurusmaDurum } from "@prisma/client";
import { useRouter } from "next/navigation";

const TUR_ETIKET: Record<DurusmaTur, string> = {
  DURUSMA: "Duruşma", KESIF: "Keşif", TOPLANTI: "Toplantı", SON_GUN: "Son Gün",
};

const DURUM_RENK: Record<DurusmaDurum, string> = {
  BEKLIYOR: "bg-blue-100 text-blue-800",
  TAMAMLANDI: "bg-green-100 text-green-800",
  IPTAL: "bg-gray-100 text-gray-600",
};

type Durusma = {
  id: string; dosyaId: string; tarih: Date; tur: DurusmaTur; yer: string | null;
  sonucNotu: string | null; sonrakiAdim: string | null; durum: DurusmaDurum;
  dosya: { id: string; esasNo: string | null; dosyaNo: string | null; mahkeme: string | null; muvekkil: { ad: string } };
};

type Props = { open: boolean; onClose: () => void; durusma: Durusma };

export function DurusmaDetayDialog({ open, onClose, durusma }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [duzenleModu, setDuzenleModu] = useState(false);

  const [form, setForm] = useState({
    sonucNotu: durusma.sonucNotu ?? "",
    sonrakiAdim: durusma.sonrakiAdim ?? "",
    durum: durusma.durum,
    yer: durusma.yer ?? "",
  });

  const dosyaAd = durusma.dosya.esasNo || durusma.dosya.dosyaNo || "Bilinmiyor";

  function handleKaydet(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      try {
        await durusmaGuncelle(durusma.id, form);
        toast.success("Duruşma güncellendi.");
        router.refresh();
        onClose();
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Hata.");
      }
    });
  }

  function handleSil() {
    if (!confirm("Duruşmayı silmek istediğinize emin misiniz?")) return;
    startTransition(async () => {
      try {
        await durusmaSil(durusma.id);
        toast.success("Duruşma silindi.");
        router.refresh();
        onClose();
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Hata.");
      }
    });
  }

  function handleTamamla() {
    startTransition(async () => {
      try {
        await durusmaGuncelle(durusma.id, { durum: "TAMAMLANDI" });
        toast.success("Duruşma tamamlandı olarak işaretlendi.");
        router.refresh();
        onClose();
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Hata.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={() => !pending && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>{TUR_ETIKET[durusma.tur]}</DialogTitle>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${DURUM_RENK[durusma.durum]}`}>
              {durusma.durum === "BEKLIYOR" ? "Bekliyor" : durusma.durum === "TAMAMLANDI" ? "Tamamlandı" : "İptal"}
            </span>
          </div>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="rounded-lg bg-muted/40 p-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Dosya</span>
              <span className="font-medium">{dosyaAd}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Müvekkil</span>
              <span>{durusma.dosya.muvekkil.ad}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tarih</span>
              <span>{new Date(durusma.tarih).toLocaleString("tr-TR", { dateStyle: "long", timeStyle: "short" })}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Yer</span>
              <span>{durusma.yer || "—"}</span>
            </div>
          </div>

          {duzenleModu ? (
            <form onSubmit={handleKaydet} className="space-y-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Yer</label>
                <Input value={form.yer} onChange={(e) => setForm({ ...form, yer: e.target.value })} disabled={pending} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Durum</label>
                <Select value={form.durum} onValueChange={(v) => setForm({ ...form, durum: (v ?? form.durum) as DurusmaDurum })} disabled={pending}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BEKLIYOR">Bekliyor</SelectItem>
                    <SelectItem value="TAMAMLANDI">Tamamlandı</SelectItem>
                    <SelectItem value="IPTAL">İptal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Sonuç Notu</label>
                <Input value={form.sonucNotu} onChange={(e) => setForm({ ...form, sonucNotu: e.target.value })} disabled={pending} placeholder="Duruşma sonucu..." />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Sonraki Adım</label>
                <Input value={form.sonrakiAdim} onChange={(e) => setForm({ ...form, sonrakiAdim: e.target.value })} disabled={pending} placeholder="Bir sonraki yapılacak..." />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDuzenleModu(false)} disabled={pending}>İptal</Button>
                <Button type="submit" disabled={pending}>
                  {pending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Kaydet
                </Button>
              </DialogFooter>
            </form>
          ) : (
            <>
              {durusma.sonucNotu && (
                <div className="text-sm rounded bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground mb-1">Sonuç Notu</p>
                  <p>{durusma.sonucNotu}</p>
                </div>
              )}
              {durusma.sonrakiAdim && (
                <div className="text-sm rounded bg-blue-50 p-3">
                  <p className="text-xs text-muted-foreground mb-1">Sonraki Adım</p>
                  <p>{durusma.sonrakiAdim}</p>
                </div>
              )}
              <DialogFooter className="flex-wrap gap-2 pt-2">
                <Button variant="ghost" size="sm" onClick={handleSil} disabled={pending} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-1" />Sil
                </Button>
                {durusma.durum === "BEKLIYOR" && (
                  <Button variant="outline" size="sm" onClick={handleTamamla} disabled={pending}>
                    <CheckCircle className="h-4 w-4 mr-1" />Tamamlandı
                  </Button>
                )}
                <Button size="sm" onClick={() => setDuzenleModu(true)} disabled={pending}>
                  Düzenle / Not Ekle
                </Button>
              </DialogFooter>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
