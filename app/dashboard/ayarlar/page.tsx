"use client";

import { useState, useTransition } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, User, Lock } from "lucide-react";
import { toast } from "sonner";
import { sifreDegistir, profilGuncelle } from "@/lib/actions/kullanici";

export default function AyarlarPage() {
  const { data: session, update } = useSession();
  const [profilPending, startProfil] = useTransition();
  const [sifrePending, startSifre] = useTransition();

  const [profil, setProfil] = useState({
    ad: session?.user?.name ?? "",
    telefon: "",
  });

  const [sifre, setSifre] = useState({
    mevcut: "",
    yeni: "",
    tekrar: "",
  });

  function handleProfilSubmit(e: React.FormEvent) {
    e.preventDefault();
    startProfil(async () => {
      try {
        await profilGuncelle({ ad: profil.ad, telefon: profil.telefon });
        await update({ name: profil.ad });
        toast.success("Profil bilgileri güncellendi.");
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Bir hata oluştu.");
      }
    });
  }

  function handleSifreSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (sifre.yeni !== sifre.tekrar) {
      toast.error("Yeni şifreler eşleşmiyor.");
      return;
    }
    if (sifre.yeni.length < 6) {
      toast.error("Şifre en az 6 karakter olmalıdır.");
      return;
    }
    startSifre(async () => {
      try {
        await sifreDegistir({ mevcutSifre: sifre.mevcut, yeniSifre: sifre.yeni });
        toast.success("Şifre başarıyla değiştirildi.");
        setSifre({ mevcut: "", yeni: "", tekrar: "" });
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Bir hata oluştu.");
      }
    });
  }

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold">Ayarlar</h1>
        <p className="text-muted-foreground text-sm mt-1">Hesap bilgilerinizi ve şifrenizi yönetin.</p>
      </div>

      {/* Profil */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4" />
            Profil Bilgileri
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfilSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="profil-ad">Ad Soyad</label>
              <Input
                id="profil-ad"
                value={profil.ad}
                onChange={(e) => setProfil({ ...profil, ad: e.target.value })}
                required
                disabled={profilPending}
                placeholder="Adınız Soyadınız"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="profil-email">E-posta</label>
              <Input
                id="profil-email"
                value={session?.user?.email ?? ""}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">E-posta değiştirilemez.</p>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="profil-tel">Telefon <span className="text-muted-foreground font-normal">(opsiyonel)</span></label>
              <Input
                id="profil-tel"
                type="tel"
                value={profil.telefon}
                onChange={(e) => setProfil({ ...profil, telefon: e.target.value })}
                disabled={profilPending}
                placeholder="0532 000 00 00"
              />
            </div>
            <Button type="submit" disabled={profilPending}>
              {profilPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Kaydet
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Şifre */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Lock className="h-4 w-4" />
            Şifre Değiştir
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSifreSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="sifre-mevcut">Mevcut Şifre</label>
              <Input
                id="sifre-mevcut"
                type="password"
                value={sifre.mevcut}
                onChange={(e) => setSifre({ ...sifre, mevcut: e.target.value })}
                required
                disabled={sifrePending}
                placeholder="••••••••"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="sifre-yeni">Yeni Şifre</label>
              <Input
                id="sifre-yeni"
                type="password"
                value={sifre.yeni}
                onChange={(e) => setSifre({ ...sifre, yeni: e.target.value })}
                required
                disabled={sifrePending}
                placeholder="En az 6 karakter"
                minLength={6}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="sifre-tekrar">Yeni Şifre (Tekrar)</label>
              <Input
                id="sifre-tekrar"
                type="password"
                value={sifre.tekrar}
                onChange={(e) => setSifre({ ...sifre, tekrar: e.target.value })}
                required
                disabled={sifrePending}
                placeholder="••••••••"
              />
            </div>
            <Button type="submit" disabled={sifrePending}>
              {sifrePending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Şifreyi Değiştir
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
