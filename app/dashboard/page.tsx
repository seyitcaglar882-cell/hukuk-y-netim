import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { yaklaşanDurusmalar } from "@/lib/actions/durusma";
import { yaklaşanGorevler } from "@/lib/actions/gorev";
import Link from "next/link";
import {
  FolderOpen, Users, Calendar, Clock,
  Scale, AlertCircle, CheckCircle2,
} from "lucide-react";

const DURUSMA_TUR: Record<string, string> = {
  DURUSMA: "Duruşma", KESIF: "Keşif", TOPLANTI: "Toplantı", SON_GUN: "Son Gün",
};

const GOREV_TUR: Record<string, string> = {
  GOREV: "Görev", SURE: "Süre", TEMYIZ: "Temyiz", ITIRAZ: "İtiraz",
};

function gunFarki(tarih: Date) {
  const bugun = new Date();
  bugun.setHours(0, 0, 0, 0);
  const t = new Date(tarih);
  t.setHours(0, 0, 0, 0);
  return Math.round((t.getTime() - bugun.getTime()) / 86400000);
}

const NAVY = "#2d5a8e";
const NAV_GRAD = "linear-gradient(150deg, #2d5a8e 0%, #3a72a8 100%)";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const rol = session?.user?.rol;
  const userId = session?.user?.id;

  const dosyaWhere = rol === "AVUKAT"
    ? { OR: [{ avukatId: userId }, { olusturanId: userId }] }
    : rol === "PATRON"
    ? { muvekkil: { avukatId: userId } }
    : {};

  const muvekkılWhere = rol === "AVUKAT"
    ? { OR: [{ avukatId: userId }, { olusturanId: userId }] }
    : rol === "PATRON"
    ? { avukatId: userId }
    : {};

  const [acikDosya, toplamDosya, muvekkılSayisi, durusmalar, gorevler] = await Promise.all([
    prisma.dosya.count({ where: { ...dosyaWhere, durum: { not: "KAPALI" } } }),
    prisma.dosya.count({ where: dosyaWhere }),
    prisma.muvekkil.count({ where: muvekkılWhere }),
    yaklaşanDurusmalar(14),
    yaklaşanGorevler(14),
  ]);


  return (
    <div className="space-y-7">
      {/* Özet kartlar — solid navy */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          href="/dashboard/dosyalar"
          className="group rounded-xl shadow-md hover:shadow-xl hover:scale-[1.03] transition-all duration-200 overflow-hidden cursor-pointer"
          style={{ background: NAV_GRAD }}
        >
          <div className="p-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg mb-4" style={{ backgroundColor: "rgba(255,255,255,0.12)" }}>
              <FolderOpen className="h-4 w-4 text-white" />
            </div>
            <p className="text-3xl font-bold text-white">{acikDosya}</p>
            <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.55)" }}>Açık dosya · Toplam {toplamDosya}</p>
          </div>
        </Link>

        <Link
          href="/dashboard/muvekkillar"
          className="group rounded-xl shadow-md hover:shadow-xl hover:scale-[1.03] transition-all duration-200 overflow-hidden cursor-pointer"
          style={{ background: NAV_GRAD }}
        >
          <div className="p-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg mb-4" style={{ backgroundColor: "rgba(255,255,255,0.12)" }}>
              <Users className="h-4 w-4 text-white" />
            </div>
            <p className="text-3xl font-bold text-white">{muvekkılSayisi}</p>
            <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.55)" }}>Kayıtlı müvekkil</p>
          </div>
        </Link>

        <Link
          href="/dashboard/takvim"
          className="group rounded-xl shadow-md hover:shadow-xl hover:scale-[1.03] transition-all duration-200 overflow-hidden cursor-pointer"
          style={{ background: NAV_GRAD }}
        >
          <div className="p-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg mb-4" style={{ backgroundColor: "rgba(255,255,255,0.12)" }}>
              <Calendar className="h-4 w-4 text-white" />
            </div>
            <p className="text-3xl font-bold text-white">{durusmalar.length}</p>
            <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.55)" }}>Yaklaşan duruşma</p>
          </div>
        </Link>

        <Link
          href="/dashboard/takvim"
          className="group rounded-xl shadow-md hover:shadow-xl hover:scale-[1.03] transition-all duration-200 overflow-hidden cursor-pointer"
          style={{ background: NAV_GRAD }}
        >
          <div className="p-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg mb-4" style={{ backgroundColor: "rgba(255,255,255,0.12)" }}>
              <Clock className="h-4 w-4 text-white" />
            </div>
            <p className="text-3xl font-bold text-white">{gorevler.length}</p>
            <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.55)" }}>Bekleyen görev</p>
          </div>
        </Link>
      </div>

      {/* İki kolon */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Yaklaşan duruşmalar */}
        <div className="rounded-xl overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-5 py-3.5" style={{ backgroundColor: NAVY }}>
            <div className="flex items-center gap-2">
              <Scale className="h-4 w-4" style={{ color: "rgba(255,255,255,0.60)" }} />
              <h2 className="text-sm font-semibold text-white">Yaklaşan Duruşmalar</h2>
            </div>
            <Link href="/dashboard/takvim" className="text-xs transition-colors" style={{ color: "rgba(255,255,255,0.50)" }}>
              Tümünü gör →
            </Link>
          </div>
          <div className="divide-y bg-card">
            {durusmalar.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-center text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 mb-2 opacity-20" />
                <p className="text-sm">Yaklaşan duruşma yok</p>
              </div>
            ) : (
              durusmalar.slice(0, 6).map((d) => {
                const gun = gunFarki(d.tarih);
                const bugun = gun === 0;
                const yarin = gun === 1;
                return (
                  <Link
                    key={d.id}
                    href={`/dashboard/dosyalar/${d.dosyaId}`}
                    className="flex items-start gap-4 px-5 py-3.5 hover:bg-[#2d5a8e]/8 transition-all duration-150"
                  >
                    <div className={`shrink-0 w-12 text-center rounded-lg py-1.5 ${bugun ? "text-white" : "bg-muted"}`}
                      style={bugun ? { backgroundColor: NAVY } : {}}>
                      <p className="text-xs font-medium">
                        {new Date(d.tarih).toLocaleDateString("tr-TR", { month: "short" })}
                      </p>
                      <p className="text-lg font-bold leading-tight">
                        {new Date(d.tarih).getDate()}
                      </p>
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <p className="text-sm font-semibold truncate">{d.dosya.muvekkil.ad}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {DURUSMA_TUR[d.tur]} · {d.dosya.esasNo || d.dosya.dosyaNo || "—"}
                        {d.dosya.mahkeme ? ` · ${d.dosya.mahkeme}` : ""}
                      </p>
                    </div>
                    <div className="shrink-0 pt-0.5">
                      {bugun && <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">Bugün</span>}
                      {yarin && <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">Yarın</span>}
                      {!bugun && !yarin && <span className="text-xs text-muted-foreground">{gun} gün</span>}
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>

        {/* Bekleyen görevler */}
        <div className="rounded-xl overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-5 py-3.5" style={{ backgroundColor: NAVY }}>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" style={{ color: "rgba(255,255,255,0.60)" }} />
              <h2 className="text-sm font-semibold text-white">Bekleyen Görevler</h2>
            </div>
            <Link href="/dashboard/takvim" className="text-xs transition-colors" style={{ color: "rgba(255,255,255,0.50)" }}>
              Tümünü gör →
            </Link>
          </div>
          <div className="divide-y bg-card">
            {gorevler.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-center text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 mb-2 opacity-20" />
                <p className="text-sm">Bekleyen görev yok</p>
              </div>
            ) : (
              gorevler.slice(0, 6).map((g) => {
                const gun = gunFarki(g.sonTarih);
                const gecikti = gun < 0;
                const kritik = gun <= 1 && gun >= 0;
                return (
                  <div key={g.id} className="flex items-start gap-4 px-5 py-3.5">
                    <div className="shrink-0 mt-0.5">
                      {gecikti
                        ? <AlertCircle className="h-4 w-4 text-red-500" />
                        : kritik
                        ? <AlertCircle className="h-4 w-4 text-amber-500" />
                        : <Clock className="h-4 w-4 text-muted-foreground" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{g.baslik}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {GOREV_TUR[g.tur]}
                        {g.dosya ? ` · ${g.dosya.esasNo || g.dosya.dosyaNo || g.dosya.muvekkil.ad}` : ""}
                      </p>
                    </div>
                    <div className="shrink-0 pt-0.5">
                      {gecikti
                        ? <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">{Math.abs(gun)}g gecikti</span>
                        : gun === 0
                        ? <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">Bugün</span>
                        : gun === 1
                        ? <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">Yarın</span>
                        : <span className="text-xs text-muted-foreground">{gun} gün</span>
                      }
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
