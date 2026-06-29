"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus, Clock, MapPin, ClipboardList } from "lucide-react";
import { DurusmaTur, DurusmaDurum, GorevTur } from "@prisma/client";

type Durusma = {
  id: string; dosyaId: string; tarih: Date; tur: DurusmaTur; yer: string | null;
  sonucNotu: string | null; sonrakiAdim: string | null; durum: DurusmaDurum;
  dosya: { id: string; esasNo: string | null; dosyaNo: string | null; mahkeme: string | null; muvekkil: { ad: string } };
};

type Gorev = {
  id: string; dosyaId: string | null; baslik: string; tur: GorevTur; sonTarih: Date; durum: string;
  dosya: { id: string; esasNo: string | null; dosyaNo: string | null; muvekkil: { ad: string } } | null;
  atanan: { id: string; ad: string } | null;
};

type Props = {
  open: boolean;
  tarih: string;
  durusmalar: Durusma[];
  gorevler: Gorev[];
  onClose: () => void;
  onDurusmaClick: (d: Durusma) => void;
  onYeniEkle: () => void;
};

const TUR_RENK: Record<DurusmaTur, string> = {
  DURUSMA: "#2d5a8e",
  KESIF: "#0891b2",
  TOPLANTI: "#059669",
  SON_GUN: "#dc2626",
};

const TUR_ETIKET: Record<DurusmaTur, string> = {
  DURUSMA: "Duruşma", KESIF: "Keşif", TOPLANTI: "Toplantı", SON_GUN: "Son Gün",
};

const DURUM_STIL: Record<DurusmaDurum, string> = {
  BEKLIYOR: "bg-blue-50 text-blue-700",
  TAMAMLANDI: "bg-green-50 text-green-700",
  IPTAL: "bg-gray-100 text-gray-500",
};

const DURUM_ETIKET: Record<DurusmaDurum, string> = {
  BEKLIYOR: "Bekliyor", TAMAMLANDI: "Tamamlandı", IPTAL: "İptal",
};

function tarihFormat(tarih: string): string {
  const [yil, ay, gun] = tarih.split("-").map(Number);
  const d = new Date(yil, ay - 1, gun);
  return d.toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

export function GunOzetiDialog({ open, tarih, durusmalar, gorevler, onClose, onDurusmaClick, onYeniEkle }: Props) {
  const toplamEtkinlik = durusmalar.length + gorevler.length;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="capitalize">{tarih ? tarihFormat(tarih) : ""}</DialogTitle>
        </DialogHeader>

        <div className="space-y-2 py-1">
          {toplamEtkinlik === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Bu gün için etkinlik yok.</p>
          ) : (
            <>
              {durusmalar.map((d) => {
                const saat = new Date(d.tarih).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
                const dosyaAd = d.dosya.esasNo ?? d.dosya.dosyaNo ?? "—";
                return (
                  <button
                    key={d.id}
                    onClick={() => { onClose(); onDurusmaClick(d); }}
                    className="w-full text-left rounded-lg border bg-card p-3 hover:bg-muted/40 transition-colors group"
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className="mt-1 h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: d.durum === "IPTAL" ? "#9ca3af" : TUR_RENK[d.tur] }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold truncate">{TUR_ETIKET[d.tur]}</span>
                          <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${DURUM_STIL[d.durum]}`}>
                            {DURUM_ETIKET[d.durum]}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{d.dosya.muvekkil.ad} · {dosyaAd}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />{saat}
                          </span>
                          {d.yer && (
                            <span className="flex items-center gap-1 truncate">
                              <MapPin className="h-3 w-3 shrink-0" />{d.yer}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}

              {gorevler.map((g) => (
                <div
                  key={g.id}
                  className="w-full text-left rounded-lg border bg-card p-3"
                >
                  <div className="flex items-start gap-3">
                    <ClipboardList className="mt-0.5 h-4 w-4 text-violet-600 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{g.baslik}</p>
                      {g.dosya && (
                        <p className="text-xs text-muted-foreground truncate">
                          {g.dosya.muvekkil.ad} · {g.dosya.esasNo ?? g.dosya.dosyaNo ?? "—"}
                        </p>
                      )}
                      {g.atanan && (
                        <p className="text-xs text-muted-foreground">Atanan: {g.atanan.ad}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        <div className="flex justify-between items-center pt-1 border-t">
          <Button variant="ghost" size="sm" onClick={onClose}>Kapat</Button>
          <Button size="sm" onClick={() => { onClose(); onYeniEkle(); }}>
            <Plus className="h-4 w-4 mr-1.5" />Duruşma / Toplantı Oluştur
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
