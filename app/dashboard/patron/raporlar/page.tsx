import { patronRaporGetir } from "@/lib/actions/rapor";
import {
  BarChart3, TrendingUp, Wallet,
  FolderOpen, Scale, CheckCircle2,
  Banknote, AlertCircle,
} from "lucide-react";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Link from "next/link";

const NAVY = "#2d5a8e";
const NAV_GRAD = "linear-gradient(150deg, #2d5a8e 0%, #3a72a8 100%)";

const ODEME_TUR: Record<string, string> = {
  VEKALET_UCRETI: "Vekalet Ücreti",
  AVANS: "Avans",
  TAHSILAT: "Tahsilat",
  MASRAF: "Masraf",
};

const ODEME_DURUM_STIL: Record<string, string> = {
  ODENDI: "bg-emerald-50 text-emerald-700 border-emerald-200",
  BEKLIYOR: "bg-amber-50 text-amber-700 border-amber-200",
  KISMI_ODENDI: "bg-blue-50 text-blue-700 border-blue-200",
  IPTAL: "bg-gray-50 text-gray-500 border-gray-200",
};

const ODEME_DURUM_ETIKET: Record<string, string> = {
  ODENDI: "Ödendi",
  BEKLIYOR: "Bekliyor",
  KISMI_ODENDI: "Kısmi",
  IPTAL: "İptal",
};

function formatPara(n: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(n);
}

function KpiKart({
  ikon: Ikon,
  baslik,
  deger,
  alt,
  renk,
}: {
  ikon: React.ElementType;
  baslik: string;
  deger: string;
  alt?: string;
  renk?: string;
}) {
  return (
    <div className="rounded-xl p-5 shadow-md overflow-hidden" style={{ background: NAV_GRAD }}>
      <div className="flex h-9 w-9 items-center justify-center rounded-lg mb-4" style={{ backgroundColor: "rgba(255,255,255,0.12)" }}>
        <Ikon className={`h-4 w-4 ${renk ?? "text-white"}`} />
      </div>
      <p className="text-2xl font-bold text-white leading-tight">{deger}</p>
      <p className="text-xs font-medium text-white mt-0.5">{baslik}</p>
      {alt && <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.50)" }}>{alt}</p>}
    </div>
  );
}

export default async function RaporlarPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.rol !== "PATRON") redirect("/dashboard");

  const rapor = await patronRaporGetir();
  const { finansOzeti, aylikGelir, avukatPerformans, dosyaDagilimi, toplamDosya, toplamMuvekkil, sonOdemeler } = rapor;

  const maxAylik = Math.max(...aylikGelir.map((a) => a.tutar), 1);

  return (
    <div className="space-y-6">
      {/* Başlık */}
      <div className="flex items-end justify-between">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-xl font-bold text-foreground">Yönetim Raporu</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">Tüm zamanlara ait operasyonel ve finansal özet</p>
        </div>
        <p className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {/* KPI Kartları */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiKart
          ikon={TrendingUp}
          baslik="Toplam Gelir"
          deger={formatPara(finansOzeti.toplamGelir)}
          alt="Vekalet + tahsilat"
        />
        <KpiKart
          ikon={CheckCircle2}
          baslik="Tahsil Edilen"
          deger={formatPara(finansOzeti.tahsilEdilen)}
          alt="Onaylı ödemeler"
        />
        <KpiKart
          ikon={AlertCircle}
          baslik="Bekleyen Tahsilat"
          deger={formatPara(finansOzeti.bekleyenTahsilat)}
          alt="Bekliyor + kısmi"
        />
        <KpiKart
          ikon={FolderOpen}
          baslik="Aktif Dosya"
          deger={String(dosyaDagilimi.find((d) => d.durum === "Açık")?.sayi ?? 0)}
          alt={`${toplamDosya} toplam · ${toplamMuvekkil} müvekkil`}
        />
      </div>

      {/* İki kolon: Avukat performansı + Dosya dağılımı */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Avukat Performansı */}
        <div className="rounded-xl overflow-hidden shadow-md">
          <div className="flex items-center gap-2 px-5 py-3.5" style={{ backgroundColor: NAVY }}>
            <Scale className="h-4 w-4" style={{ color: "rgba(255,255,255,0.60)" }} />
            <h2 className="text-sm font-semibold text-white">Avukat Performansı</h2>
          </div>
          <div className="bg-card divide-y">
            {avukatPerformans.map((a) => (
              <div key={a.id} className="px-5 py-3.5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white"
                      style={{ backgroundColor: NAVY }}>
                      {a.ad.split(" ").slice(0, 2).map((s: string) => s[0]).join("").toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{a.ad}</p>
                      <p className="text-xs text-muted-foreground">{a.rol === "PATRON" ? "Patron" : "Avukat"}</p>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-emerald-700">{formatPara(a.gelir)}</p>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span><span className="font-semibold text-foreground">{a.acikDosya}</span> açık dosya</span>
                  <span><span className="font-semibold text-foreground">{a.kapaliDosya}</span> kapalı</span>
                  <span><span className="font-semibold text-foreground">{a.tamamlananGorev}</span> tamamlanan dava</span>
                </div>
              </div>
            ))}
            {avukatPerformans.length === 0 && (
              <div className="py-12 text-center text-muted-foreground text-sm">Avukat bulunamadı</div>
            )}
          </div>
        </div>

        {/* Dosya Durum Dağılımı */}
        <div className="rounded-xl overflow-hidden shadow-md">
          <div className="flex items-center gap-2 px-5 py-3.5" style={{ backgroundColor: NAVY }}>
            <FolderOpen className="h-4 w-4" style={{ color: "rgba(255,255,255,0.60)" }} />
            <h2 className="text-sm font-semibold text-white">Dosya Durum Dağılımı</h2>
            <span className="text-xs ml-auto" style={{ color: "rgba(255,255,255,0.45)" }}>{toplamDosya} toplam</span>
          </div>
          <div className="bg-card p-5 space-y-4">
            {dosyaDagilimi.map((d) => {
              const yuzde = toplamDosya > 0 ? Math.round((d.sayi / toplamDosya) * 100) : 0;
              return (
                <div key={d.durum}>
                  <div className="flex items-center justify-between mb-1.5 text-sm">
                    <div className="flex items-center gap-2">
                      <div className={`h-2.5 w-2.5 rounded-full ${d.renk}`} />
                      <span className="font-medium">{d.durum}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span>{d.sayi}</span>
                      <span className="text-xs">({yuzde}%)</span>
                    </div>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${d.renk}`}
                      style={{ width: `${yuzde}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {toplamDosya === 0 && (
              <div className="py-8 text-center text-muted-foreground text-sm">Henüz dosya yok</div>
            )}
          </div>
        </div>
      </div>

      {/* Son 12 Ay Gelir Grafiği */}
      <div className="rounded-xl overflow-hidden shadow-md">
        <div className="flex items-center gap-2 px-5 py-3.5" style={{ backgroundColor: NAVY }}>
          <Wallet className="h-4 w-4" style={{ color: "rgba(255,255,255,0.60)" }} />
          <h2 className="text-sm font-semibold text-white">Son 12 Ay Tahsil Edilen Gelir</h2>
        </div>
        <div className="bg-card px-6 pt-6 pb-4">
          <div className="flex items-end gap-2 h-44">
            {aylikGelir.map((a) => {
              const yuzde = (a.tutar / maxAylik) * 100;
              return (
                <div key={`${a.yil}-${a.ay_no}`} className="flex-1 flex flex-col items-center gap-1 group">
                  <div className="relative w-full flex flex-col justify-end" style={{ height: "140px" }}>
                    <div
                      className="w-full rounded-t-md transition-all"
                      style={{
                        height: `${Math.max(yuzde, a.tutar > 0 ? 4 : 0)}%`,
                        backgroundColor: a.tutar > 0 ? NAVY : "transparent",
                        border: a.tutar === 0 ? "1px dashed #e5e7eb" : "none",
                        minHeight: a.tutar > 0 ? "4px" : undefined,
                      }}
                    />
                    {a.tutar > 0 && (
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap rounded bg-foreground px-1.5 py-0.5 text-[10px] text-background">
                        {formatPara(a.tutar)}
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground">{a.ay}</p>
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground border-t pt-3">
            <span>
              Bu yıl toplam:{" "}
              <span className="font-semibold text-foreground">
                {formatPara(
                  aylikGelir
                    .filter((a) => a.yil === new Date().getFullYear())
                    .reduce((s, a) => s + a.tutar, 0)
                )}
              </span>
            </span>
            <span>Çubuğun üzerine gelin → tutar</span>
          </div>
        </div>
      </div>

      {/* Son Ödemeler */}
      <div className="rounded-xl overflow-hidden shadow-md">
        <div className="flex items-center justify-between px-5 py-3.5" style={{ backgroundColor: NAVY }}>
          <div className="flex items-center gap-2">
            <Banknote className="h-4 w-4" style={{ color: "rgba(255,255,255,0.60)" }} />
            <h2 className="text-sm font-semibold text-white">Son Ödemeler</h2>
          </div>
          <Link href="/dashboard/finans" className="text-xs transition-colors" style={{ color: "rgba(255,255,255,0.50)" }}>
            Tümünü gör →
          </Link>
        </div>
        <div className="bg-card divide-y">
          {sonOdemeler.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              <Banknote className="h-8 w-8 mx-auto mb-2 opacity-20" />
              Henüz ödeme yok
            </div>
          ) : (
            sonOdemeler.map((o) => (
              <Link
                key={o.id}
                href={`/dashboard/dosyalar/${o.dosya.id}`}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/30 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{o.dosya.muvekkil.ad}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {ODEME_TUR[o.tur]}
                    {o.aciklama ? ` · ${o.aciklama}` : ""}
                    {o.dosya.esasNo || o.dosya.dosyaNo ? ` · ${o.dosya.esasNo ?? o.dosya.dosyaNo}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${ODEME_DURUM_STIL[o.durum]}`}>
                    {ODEME_DURUM_ETIKET[o.durum]}
                  </span>
                  <p className="text-sm font-semibold w-28 text-right">{formatPara(o.tutar)}</p>
                  <p className="text-xs text-muted-foreground w-20 text-right">
                    {new Date(o.tarih).toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
