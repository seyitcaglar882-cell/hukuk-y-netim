import { auditLoglarGetir } from "@/lib/actions/audit";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Shield, User, FolderOpen, FileText, Users, Banknote, BookOpen } from "lucide-react";

const NAVY = "#2d5a8e";

const EYLEM_ETIKET: Record<string, string> = {
  DOSYA_OLUSTURULDU: "Dosya oluşturuldu",
  DOSYA_GUNCELLENDI: "Dosya güncellendi",
  DOSYA_SILINDI: "Dosya silindi",
  MUVEKKIL_OLUSTURULDU: "Müvekkil eklendi",
  MUVEKKIL_GUNCELLENDI: "Müvekkil güncellendi",
  MUVEKKIL_SILINDI: "Müvekkil silindi",
  BELGE_YUKLENDI: "Belge yüklendi",
  BELGE_SILINDI: "Belge silindi",
  ODEME_EKLENDI: "Ödeme eklendi",
  ODEME_GUNCELLENDI: "Ödeme güncellendi",
  ODEME_SILINDI: "Ödeme silindi",
  DURUSMA_EKLENDI: "Duruşma eklendi",
  DURUSMA_SILINDI: "Duruşma silindi",
  EMSAL_EKLENDI: "Emsal karar eklendi",
  EMSAL_SILINDI: "Emsal karar silindi",
  GIRIS_YAPILDI: "Giriş yapıldı",
};

const EYLEM_IKON: Record<string, React.ElementType> = {
  DOSYA_OLUSTURULDU: FolderOpen,
  DOSYA_GUNCELLENDI: FolderOpen,
  DOSYA_SILINDI: FolderOpen,
  MUVEKKIL_OLUSTURULDU: Users,
  MUVEKKIL_GUNCELLENDI: Users,
  MUVEKKIL_SILINDI: Users,
  BELGE_YUKLENDI: FileText,
  BELGE_SILINDI: FileText,
  ODEME_EKLENDI: Banknote,
  ODEME_GUNCELLENDI: Banknote,
  ODEME_SILINDI: Banknote,
  DURUSMA_EKLENDI: FolderOpen,
  DURUSMA_SILINDI: FolderOpen,
  EMSAL_EKLENDI: BookOpen,
  EMSAL_SILINDI: BookOpen,
  GIRIS_YAPILDI: User,
};

const EYLEM_RENK: Record<string, string> = {
  DOSYA_OLUSTURULDU: "text-emerald-600 bg-emerald-50",
  DOSYA_GUNCELLENDI: "text-blue-600 bg-blue-50",
  DOSYA_SILINDI: "text-red-600 bg-red-50",
  MUVEKKIL_OLUSTURULDU: "text-emerald-600 bg-emerald-50",
  MUVEKKIL_GUNCELLENDI: "text-blue-600 bg-blue-50",
  MUVEKKIL_SILINDI: "text-red-600 bg-red-50",
  BELGE_YUKLENDI: "text-purple-600 bg-purple-50",
  BELGE_SILINDI: "text-red-600 bg-red-50",
  ODEME_EKLENDI: "text-teal-600 bg-teal-50",
  ODEME_GUNCELLENDI: "text-blue-600 bg-blue-50",
  ODEME_SILINDI: "text-red-600 bg-red-50",
  DURUSMA_EKLENDI: "text-amber-600 bg-amber-50",
  DURUSMA_SILINDI: "text-red-600 bg-red-50",
  EMSAL_EKLENDI: "text-indigo-600 bg-indigo-50",
  EMSAL_SILINDI: "text-red-600 bg-red-50",
  GIRIS_YAPILDI: "text-gray-600 bg-gray-50",
};

function zamanaGore(tarih: Date | string): string {
  const t = new Date(tarih);
  const simdi = new Date();
  const fark = Math.floor((simdi.getTime() - t.getTime()) / 1000);
  if (fark < 60) return "Az önce";
  if (fark < 3600) return `${Math.floor(fark / 60)} dk önce`;
  if (fark < 86400) return `${Math.floor(fark / 3600)} sa önce`;
  return t.toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default async function AuditLogPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.rol !== "PATRON") redirect("/dashboard");

  const loglar = await auditLoglarGetir(200);

  return (
    <div className="space-y-5">
      <div className="rounded-xl overflow-hidden shadow-md">

        {/* Header */}
        <div className="px-5 py-4" style={{ backgroundColor: NAVY }}>
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4" style={{ color: "rgba(255,255,255,0.60)" }} />
            <h1 className="text-sm font-semibold text-white">Sistem Aktivite Kaydı</h1>
          </div>
          <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>
            Son {loglar.length} işlem · Tüm kullanıcı aktiviteleri
          </p>
        </div>

        {/* Liste */}
        <div className="bg-card divide-y">
          {loglar.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
              <Shield className="h-10 w-10 opacity-20" />
              <p className="text-sm font-medium">Henüz kayıt yok</p>
              <p className="text-xs">Sistem aktiviteleri burada görünecek</p>
            </div>
          ) : (
            loglar.map((log) => {
              const Ikon = EYLEM_IKON[log.eylem] ?? Shield;
              const renk = EYLEM_RENK[log.eylem] ?? "text-gray-600 bg-gray-50";
              return (
                <div key={log.id} className="flex items-start gap-4 px-5 py-3.5 hover:bg-muted/20 transition-colors">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${renk}`}>
                    <Ikon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium">{EYLEM_ETIKET[log.eylem] ?? log.eylem}</p>
                      {log.detay && (
                        <span className="text-xs text-muted-foreground font-mono truncate max-w-[200px]">
                          — {log.detay}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-muted-foreground">
                        {log.kullaniciAd ?? "Sistem"}
                      </p>
                      <span className="text-muted-foreground/40 text-xs">·</span>
                      <p className="text-xs text-muted-foreground">{log.kaynak}</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground shrink-0 pt-0.5">{zamanaGore(log.tarih)}</p>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
