"use client";

import { useState, useTransition, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { muvekkılEkle, muvekkılGuncelle } from "@/lib/actions/muvekkil";
import { MuvekkılTip } from "@prisma/client";

type Muvekkil = {
  id: string;
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
  kvkkOnay: boolean;
  avukatId: string | null;
};

type MtAvukat = { id: string; ad: string };

type Props = {
  open: boolean;
  onClose: () => void;
  muvekkil?: Muvekkil | null;
  mtAvukatlar?: MtAvukat[];
};

export function MuvekkılDialog({ open, onClose, muvekkil, mtAvukatlar = [] }: Props) {
  const duzenle = !!muvekkil;
  const [pending, startTransition] = useTransition();

  const [form, setForm] = useState({
    tip: muvekkil?.tip ?? ("KISI" as MuvekkılTip),
    ad: muvekkil?.ad ?? "",
    tckn: muvekkil?.tckn ?? "",
    vkn: muvekkil?.vkn ?? "",
    telefon: muvekkil?.telefon ?? "",
    isTelefon: muvekkil?.isTelefon ?? "",
    email: muvekkil?.email ?? "",
    email2: muvekkil?.email2 ?? "",
    adres: muvekkil?.adres ?? "",
    iban: muvekkil?.iban ?? "",
    notlar: muvekkil?.notlar ?? "",
    kvkkOnay: muvekkil?.kvkkOnay ?? false,
    sahibiAvukatId: muvekkil?.avukatId ?? "",
  });

  useEffect(() => {
    if (open) {
      setForm({
        tip: muvekkil?.tip ?? "KISI",
        ad: muvekkil?.ad ?? "",
        tckn: muvekkil?.tckn ?? "",
        vkn: muvekkil?.vkn ?? "",
        telefon: muvekkil?.telefon ?? "",
        isTelefon: muvekkil?.isTelefon ?? "",
        email: muvekkil?.email ?? "",
        email2: muvekkil?.email2 ?? "",
        adres: muvekkil?.adres ?? "",
        iban: muvekkil?.iban ?? "",
        notlar: muvekkil?.notlar ?? "",
        kvkkOnay: muvekkil?.kvkkOnay ?? false,
        sahibiAvukatId: muvekkil?.avukatId ?? "",
      });
    }
  }, [open, muvekkil]);

  const kisi = form.tip === "KISI";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      try {
        const data = {
          tip: form.tip,
          ad: form.ad,
          tckn: kisi && form.tckn ? form.tckn : undefined,
          vkn: !kisi && form.vkn ? form.vkn : undefined,
          telefon: form.telefon || undefined,
          isTelefon: form.isTelefon || undefined,
          email: form.email || undefined,
          email2: form.email2 || undefined,
          adres: form.adres || undefined,
          iban: form.iban || undefined,
          notlar: form.notlar || undefined,
          kvkkOnay: form.kvkkOnay,
          sahibiAvukatId: form.sahibiAvukatId || undefined,
        };
        if (duzenle) {
          await muvekkılGuncelle(muvekkil!.id, data);
          toast.success("Müvekkil güncellendi.");
        } else {
          await muvekkılEkle(data);
          toast.success("Müvekkil eklendi.");
        }
        onClose();
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Bir hata oluştu.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={() => !pending && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{duzenle ? "Müvekkili Düzenle" : "Yeni Müvekkil"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Müvekkil Tipi</label>
              <Select value={form.tip} onValueChange={(v) => setForm({ ...form, tip: v as MuvekkılTip })} disabled={pending}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="KISI">Bireysel (Kişi)</SelectItem>
                  <SelectItem value="SIRKET">Kurumsal (Şirket)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">{kisi ? "Ad Soyad" : "Şirket Adı"} *</label>
              <Input value={form.ad} onChange={(e) => setForm({ ...form, ad: e.target.value })} required disabled={pending} placeholder={kisi ? "Ahmet Yılmaz" : "ABC Ltd. Şti."} />
            </div>
          </div>

          {mtAvukatlar.length > 0 && (
            <div className="space-y-2">
              {mtAvukatlar.map((mt) => (
                <label
                  key={mt.id}
                  className="flex items-start gap-2.5 cursor-pointer select-none rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={form.sahibiAvukatId === mt.id}
                    onChange={(e) =>
                      setForm({ ...form, sahibiAvukatId: e.target.checked ? mt.id : "" })
                    }
                    disabled={pending}
                    className="mt-0.5 h-4 w-4 rounded border-input accent-primary"
                  />
                  <div>
                    <p className="text-sm font-medium">{mt.ad} adına ekle</p>
                    <p className="text-xs text-muted-foreground">Müvekkil listesinde isminin başında <span className="font-semibold text-amber-600">MT *</span> kodu ile görünecektir.</p>
                  </div>
                </label>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {kisi ? (
              <div className="space-y-1">
                <label className="text-sm font-medium">TC Kimlik No</label>
                <Input value={form.tckn} onChange={(e) => setForm({ ...form, tckn: e.target.value.replace(/\D/g, "").slice(0, 11) })} disabled={pending} placeholder="11 haneli" maxLength={11} />
              </div>
            ) : (
              <div className="space-y-1">
                <label className="text-sm font-medium">Vergi Kimlik No</label>
                <Input value={form.vkn} onChange={(e) => setForm({ ...form, vkn: e.target.value.replace(/\D/g, "").slice(0, 10) })} disabled={pending} placeholder="10 haneli" maxLength={10} />
              </div>
            )}
            <div className="space-y-1">
              <label className="text-sm font-medium">Adres</label>
              <Input value={form.adres} onChange={(e) => setForm({ ...form, adres: e.target.value })} disabled={pending} placeholder="İlçe, İl" />
            </div>
          </div>

          {/* Telefon grubu */}
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Telefon</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Cep Telefonu</label>
                <Input value={form.telefon} onChange={(e) => setForm({ ...form, telefon: e.target.value })} disabled={pending} placeholder="0532 000 00 00" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">İş Telefonu</label>
                <Input value={form.isTelefon} onChange={(e) => setForm({ ...form, isTelefon: e.target.value })} disabled={pending} placeholder="0212 000 00 00" />
              </div>
            </div>
          </div>

          {/* E-posta grubu */}
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">E-posta</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">1. E-posta</label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} disabled={pending} placeholder="ornek@mail.com" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">2. E-posta</label>
                <Input type="email" value={form.email2} onChange={(e) => setForm({ ...form, email2: e.target.value })} disabled={pending} placeholder="is@firma.com" />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">IBAN</label>
            <Input
              value={form.iban.replace(/(.{4})/g, "$1 ").trim()}
              onChange={(e) => setForm({ ...form, iban: e.target.value.replace(/\s/g, "").toUpperCase() })}
              disabled={pending}
              placeholder="TR00 0000 0000 0000 0000 0000 00"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Notlar</label>
            <Input value={form.notlar} onChange={(e) => setForm({ ...form, notlar: e.target.value })} disabled={pending} placeholder="İsteğe bağlı not" />
          </div>

          <label className="flex items-start gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.kvkkOnay}
              onChange={(e) => setForm({ ...form, kvkkOnay: e.target.checked })}
              disabled={pending}
              className="mt-0.5 h-4 w-4 rounded border-input accent-primary"
            />
            <div>
              <p className="text-sm font-medium">KVKK Onayı</p>
              <p className="text-xs text-muted-foreground">Müvekkil kişisel verilerinin işlenmesine onay verdi.</p>
            </div>
          </label>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={pending}>İptal</Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {duzenle ? "Kaydet" : "Ekle"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
