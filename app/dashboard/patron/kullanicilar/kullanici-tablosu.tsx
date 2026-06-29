"use client";

import { useState, useTransition } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { KullaniciDialog } from "./kullanici-dialog";
import { kullaniciDurumDegistir } from "@/lib/actions/kullanici";
import { toast } from "sonner";
import { Pencil, UserCheck, UserX, Plus } from "lucide-react";
import { Rol } from "@prisma/client";

type Kullanici = {
  id: string;
  ad: string;
  email: string;
  rol: Rol;
  telefon: string | null;
  mtPrefiks: boolean;
  aktif: boolean;
  olusturulma: Date;
};

const ROL_RENK: Record<Rol, "default" | "secondary" | "outline"> = {
  PATRON: "default",
  AVUKAT: "secondary",
  SEKRETER: "outline",
};

const ROL_ETIKET: Record<Rol, string> = {
  PATRON: "Patron",
  AVUKAT: "Avukat",
  SEKRETER: "Sekreter",
};

export function KullaniciTablosu({ kullanicilar }: { kullanicilar: Kullanici[] }) {
  const [dialogAcik, setDialogAcik] = useState(false);
  const [secili, setSecili] = useState<Kullanici | null>(null);
  const [pending, startTransition] = useTransition();

  function yeniKullanici() {
    setSecili(null);
    setDialogAcik(true);
  }

  function duzenle(k: Kullanici) {
    setSecili(k);
    setDialogAcik(true);
  }

  function durumDegistir(k: Kullanici) {
    startTransition(async () => {
      try {
        await kullaniciDurumDegistir(k.id, !k.aktif);
        toast.success(k.aktif ? "Kullanıcı pasifleştirildi." : "Kullanıcı aktifleştirildi.");
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Bir hata oluştu.");
      }
    });
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Kullanıcı Yönetimi</h1>
          <p className="text-muted-foreground text-sm mt-1">Büro çalışanlarını ekleyin ve yönetin.</p>
        </div>
        <Button onClick={yeniKullanici}>
          <Plus className="h-4 w-4 mr-2" />
          Yeni Kullanıcı
        </Button>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ad Soyad</TableHead>
              <TableHead>E-posta</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Telefon</TableHead>
              <TableHead>Durum</TableHead>
              <TableHead className="text-right">İşlemler</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {kullanicilar.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                  Henüz kullanıcı yok.
                </TableCell>
              </TableRow>
            )}
            {kullanicilar.map((k) => (
              <TableRow key={k.id} className={!k.aktif ? "opacity-50" : ""}>
                <TableCell className="font-medium">
                  <span className="flex items-center gap-1.5">
                    {k.ad}
                    {k.mtPrefiks && (
                      <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 border border-amber-200 text-amber-700 tracking-wider">
                        {k.ad.split(" ").map((s: string) => s[0] ?? "").join("").toUpperCase()}
                      </span>
                    )}
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground">{k.email}</TableCell>
                <TableCell>
                  <Badge variant={ROL_RENK[k.rol]}>{ROL_ETIKET[k.rol]}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{k.telefon ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant={k.aktif ? "default" : "outline"} className={k.aktif ? "bg-green-100 text-green-800 hover:bg-green-100" : ""}>
                    {k.aktif ? "Aktif" : "Pasif"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => duzenle(k)}
                      disabled={pending}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => durumDegistir(k)}
                      disabled={pending}
                      title={k.aktif ? "Pasifleştir" : "Aktifleştir"}
                    >
                      {k.aktif ? (
                        <UserX className="h-4 w-4 text-destructive" />
                      ) : (
                        <UserCheck className="h-4 w-4 text-green-600" />
                      )}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <KullaniciDialog
        open={dialogAcik}
        onClose={() => setDialogAcik(false)}
        kullanici={secili}
      />
    </>
  );
}
