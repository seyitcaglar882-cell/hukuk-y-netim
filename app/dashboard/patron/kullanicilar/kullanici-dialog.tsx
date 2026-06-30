"use client";

import { useState, useTransition, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { kullaniciEkle, kullaniciGuncelle } from "@/lib/actions/kullanici";
import { Rol } from "@prisma/client";

type Kullanici = {
  id: string;
  ad: string;
  email: string;
  rol: Rol;
  telefon: string | null;
  mtPrefiks: boolean;
};

type Props = {
  open: boolean;
  onClose: () => void;
  kullanici?: Kullanici | null;
};

const ROL_ETIKETLERI: Record<Rol, string> = {
  PATRON: "Patron (Büro Sahibi)",
  AVUKAT: "Avukat",
  SEKRETER: "Sekreter",
};

export function KullaniciDialog({ open, onClose, kullanici }: Props) {
  const duzenle = !!kullanici;
  const [pending, startTransition] = useTransition();

  const [form, setForm] = useState({
    ad: kullanici?.ad ?? "",
    email: kullanici?.email ?? "",
    sifre: "",
    rol: kullanici?.rol ?? ("AVUKAT" as Rol),
    telefon: kullanici?.telefon ?? "",
    mtPrefiks: kullanici?.mtPrefiks ?? false,
  });

  useEffect(() => {
    if (open) {
      setForm({
        ad: kullanici?.ad ?? "",
        email: kullanici?.email ?? "",
        sifre: "",
        rol: kullanici?.rol ?? "AVUKAT",
        telefon: kullanici?.telefon ?? "",
        mtPrefiks: kullanici?.mtPrefiks ?? false,
      });
    }
  }, [open, kullanici]);

  function handleClose() {
    if (!pending) onClose();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      try {
        if (duzenle) {
          await kullaniciGuncelle(kullanici!.id, {
            ad: form.ad,
            email: form.email,
            rol: form.rol,
            telefon: form.telefon,
            mtPrefiks: form.mtPrefiks,
          });
          toast.success("Kullanıcı güncellendi.");
        } else {
          if (!form.sifre) {
            toast.error("Şifre zorunludur.");
            return;
          }
          await kullaniciEkle({
            ad: form.ad,
            email: form.email,
            sifre: form.sifre,
            rol: form.rol,
            telefon: form.telefon,
          });
          toast.success("Kullanıcı oluşturuldu.");
        }
        onClose();
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Bir hata oluştu.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{duzenle ? "Kullanıcıyı Düzenle" : "Yeni Kullanıcı"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="ad">Ad Soyad</label>
            <Input
              id="ad"
              value={form.ad}
              onChange={(e) => setForm({ ...form, ad: e.target.value })}
              required
              disabled={pending}
              placeholder="Ahmet Yılmaz"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="email">E-posta</label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              disabled={pending}
              placeholder="avukat@buro.com"
            />
          </div>

          {!duzenle && (
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="sifre">Şifre</label>
              <Input
                id="sifre"
                type="password"
                value={form.sifre}
                onChange={(e) => setForm({ ...form, sifre: e.target.value })}
                required
                disabled={pending}
                placeholder="En az 6 karakter"
                minLength={6}
              />
            </div>
          )}

          <div className="space-y-1">
            <label className="text-sm font-medium">Rol</label>
            <Select
              value={form.rol}
              onValueChange={(val) => setForm({ ...form, rol: val as Rol })}
              disabled={pending}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(ROL_ETIKETLERI) as Rol[]).map((rol) => (
                  <SelectItem key={rol} value={rol}>
                    {ROL_ETIKETLERI[rol]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="telefon">Telefon <span className="text-muted-foreground font-normal">(opsiyonel)</span></label>
            <Input
              id="telefon"
              type="tel"
              value={form.telefon}
              onChange={(e) => setForm({ ...form, telefon: e.target.value })}
              disabled={pending}
              placeholder="0532 000 00 00"
            />
          </div>

          <label className="flex items-start gap-2.5 cursor-pointer select-none rounded-lg border p-3 hover:bg-muted/50 transition-colors">
            <input
              type="checkbox"
              checked={form.mtPrefiks}
              onChange={(e) => setForm({ ...form, mtPrefiks: e.target.checked })}
              disabled={pending}
              className="mt-0.5 h-4 w-4 rounded border-input accent-primary"
            />
            <div>
              <p className="text-sm font-medium">MT Prefiks (Büro Müdürü)</p>
              <p className="text-xs text-muted-foreground">Bu avukatın müvekkilleri diğer avukatlar tarafından da görüntülenip yönetilebilir.</p>
            </div>
          </label>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={handleClose} disabled={pending}>
              İptal
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {duzenle ? "Kaydet" : "Oluştur"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
