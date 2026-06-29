"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { odemeEkle, odemeGuncelle, odemeSil } from "@/lib/actions/odeme";
import { toast } from "sonner";
import { OdemeTur, OdemeDurum } from "@prisma/client";
import { Plus, Pencil, Trash2, Loader2, TrendingUp, TrendingDown, Clock, Wallet } from "lucide-react";

type Odeme = {
  id: string;
  tur: OdemeTur;
  tutar: number | { toFixed: (n: number) => string };
  aciklama: string | null;
  tarih: Date | string;
  durum: OdemeDurum;
};

const TUR_ETIKET: Record<OdemeTur, string> = {
  VEKALET_UCRETI: "Vekâlet Ücreti",
  AVANS: "Avans",
  TAHSILAT: "Tahsilat",
  MASRAF: "Masraf",
};

const TUR_RENK: Record<OdemeTur, string> = {
  VEKALET_UCRETI: "default",
  AVANS: "secondary",
  TAHSILAT: "outline",
  MASRAF: "destructive",
};

const DURUM_ETIKET: Record<OdemeDurum, string> = {
  BEKLIYOR: "Bekliyor",
  ODENDI: "Ödendi",
  KISMI_ODENDI: "Kısmi Ödendi",
  IPTAL: "İptal",
};

const DURUM_RENK: Record<OdemeDurum, string> = {
  BEKLIYOR: "bg-amber-100 text-amber-800",
  ODENDI: "bg-green-100 text-green-800",
  KISMI_ODENDI: "bg-blue-100 text-blue-800",
  IPTAL: "bg-gray-100 text-gray-500",
};

function para(tutar: Odeme["tutar"]): number {
  return typeof tutar === "number" ? tutar : parseFloat(String(tutar));
}

function formatPara(tutar: Odeme["tutar"]): string {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(para(tutar));
}

const bos = { tur: "VEKALET_UCRETI" as OdemeTur, tutar: "", aciklama: "", tarih: "", durum: "BEKLIYOR" as OdemeDurum };

export function OdemePaneli({ dosyaId, odemeler: ilkOdemeler }: { dosyaId: string; odemeler: Odeme[] }) {
  const [odemeler, setOdemeler] = useState<Odeme[]>(ilkOdemeler);
  const [form, setForm] = useState(bos);
  const [duzenlenen, setDuzenlenen] = useState<string | null>(null);
  const [formAcik, setFormAcik] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    setOdemeler(ilkOdemeler);
  }, [ilkOdemeler]);

  const toplamVekalet = odemeler.filter((o) => o.tur === "VEKALET_UCRETI").reduce((s, o) => s + para(o.tutar), 0);
  const tahsilEdilen = odemeler.filter((o) => o.tur === "TAHSILAT" || (o.tur === "VEKALET_UCRETI" && o.durum === "ODENDI")).reduce((s, o) => s + para(o.tutar), 0);
  const bekleyen = odemeler.filter((o) => o.tur === "VEKALET_UCRETI" && (o.durum === "BEKLIYOR" || o.durum === "KISMI_ODENDI")).reduce((s, o) => s + para(o.tutar), 0);
  const masraflar = odemeler.filter((o) => o.tur === "MASRAF").reduce((s, o) => s + para(o.tutar), 0);

  function formAc(odeme?: Odeme) {
    if (odeme) {
      setForm({
        tur: odeme.tur,
        tutar: String(para(odeme.tutar)),
        aciklama: odeme.aciklama ?? "",
        tarih: new Date(odeme.tarih).toISOString().split("T")[0],
        durum: odeme.durum,
      });
      setDuzenlenen(odeme.id);
    } else {
      setForm({ ...bos, tarih: new Date().toISOString().split("T")[0] });
      setDuzenlenen(null);
    }
    setFormAcik(true);
  }

  function handleKaydet() {
    if (!form.tutar || !form.tarih) { toast.error("Tutar ve tarih zorunludur."); return; }
    startTransition(async () => {
      try {
        if (duzenlenen) {
          await odemeGuncelle(duzenlenen, {
            tur: form.tur,
            tutar: parseFloat(form.tutar),
            aciklama: form.aciklama || undefined,
            tarih: form.tarih,
            durum: form.durum,
          });
          setOdemeler((prev) => prev.map((o) => o.id === duzenlenen
            ? { ...o, tur: form.tur, tutar: parseFloat(form.tutar), aciklama: form.aciklama || null, tarih: new Date(form.tarih), durum: form.durum }
            : o
          ));
          toast.success("Ödeme güncellendi.");
          router.refresh();
        } else {
          const kayit = await odemeEkle({
            dosyaId,
            tur: form.tur,
            tutar: parseFloat(form.tutar),
            aciklama: form.aciklama || undefined,
            tarih: form.tarih,
            durum: form.durum,
          });
          const yeni: Odeme = {
            id: kayit.id,
            tur: kayit.tur,
            tutar: Number(kayit.tutar),
            aciklama: kayit.aciklama,
            tarih: kayit.tarih,
            durum: kayit.durum,
          };
          setOdemeler((prev) => [yeni, ...prev]);
          toast.success("Ödeme eklendi.");
          router.refresh();
        }
        setFormAcik(false);
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Hata oluştu.");
      }
    });
  }

  function handleSil(id: string) {
    startTransition(async () => {
      try {
        await odemeSil(id);
        setOdemeler((prev) => prev.filter((o) => o.id !== id));
        toast.success("Ödeme silindi.");
        router.refresh();
      } catch {
        toast.error("Silinemedi.");
      }
    });
  }

  return (
    <div className="space-y-5">
      {/* Özet kartlar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Vekâlet Ücreti", value: toplamVekalet, icon: Wallet, renk: "text-primary" },
          { label: "Tahsil Edilen", value: tahsilEdilen, icon: TrendingUp, renk: "text-green-600" },
          { label: "Bekleyen", value: bekleyen, icon: Clock, renk: "text-amber-600" },
          { label: "Masraflar", value: masraflar, icon: TrendingDown, renk: "text-red-600" },
        ].map((k) => (
          <div key={k.label} className="rounded-lg border bg-card p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <k.icon className={`h-3.5 w-3.5 ${k.renk}`} />
              {k.label}
            </div>
            <p className="text-lg font-semibold">{formatPara(k.value)}</p>
          </div>
        ))}
      </div>

      {/* Form */}
      {formAcik && (
        <div className="rounded-lg border bg-card p-4 space-y-3">
          <p className="text-sm font-medium">{duzenlenen ? "Ödeme Düzenle" : "Yeni Ödeme"}</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Tür *</label>
              <select
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={form.tur}
                onChange={(e) => setForm({ ...form, tur: e.target.value as OdemeTur })}
              >
                {(Object.keys(TUR_ETIKET) as OdemeTur[]).map((t) => (
                  <option key={t} value={t}>{TUR_ETIKET[t]}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Tutar (₺) *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                placeholder="0.00"
                value={form.tutar}
                onChange={(e) => setForm({ ...form, tutar: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Tarih *</label>
              <input
                type="date"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={form.tarih}
                onChange={(e) => setForm({ ...form, tarih: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Durum</label>
              <select
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={form.durum}
                onChange={(e) => setForm({ ...form, durum: e.target.value as OdemeDurum })}
              >
                {(Object.keys(DURUM_ETIKET) as OdemeDurum[]).map((d) => (
                  <option key={d} value={d}>{DURUM_ETIKET[d]}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2 space-y-1">
              <label className="text-xs text-muted-foreground">Açıklama</label>
              <input
                type="text"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                placeholder="İsteğe bağlı not..."
                value={form.aciklama}
                onChange={(e) => setForm({ ...form, aciklama: e.target.value })}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleKaydet} disabled={pending}>
              {pending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
              Kaydet
            </Button>
            <Button size="sm" variant="outline" onClick={() => setFormAcik(false)}>İptal</Button>
          </div>
        </div>
      )}

      {/* Üst bar */}
      {!formAcik && (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => formAc()}>
            <Plus className="h-4 w-4 mr-1" />Ödeme Ekle
          </Button>
        </div>
      )}

      {/* Liste */}
      {odemeler.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground text-sm">
          Henüz finansal kayıt yok.
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Tür</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Tarih</th>
                <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Tutar</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Durum</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Açıklama</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {odemeler.map((o) => (
                <tr key={o.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <Badge variant={TUR_RENK[o.tur] as "default" | "secondary" | "outline" | "destructive"}>
                      {TUR_ETIKET[o.tur]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(o.tarih).toLocaleDateString("tr-TR")}
                  </td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums">
                    {formatPara(o.tutar)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${DURUM_RENK[o.durum]}`}>
                      {DURUM_ETIKET[o.durum]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{o.aciklama || "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 justify-end">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => formAc(o)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => handleSil(o.id)} disabled={pending}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
