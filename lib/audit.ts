import { prisma } from "@/lib/prisma";

export type AuditEylem =
  | "DOSYA_OLUSTURULDU"
  | "DOSYA_GUNCELLENDI"
  | "DOSYA_SILINDI"
  | "MUVEKKIL_OLUSTURULDU"
  | "MUVEKKIL_GUNCELLENDI"
  | "MUVEKKIL_SILINDI"
  | "MUVEKKIL_PASIFE_ALINDI"
  | "MUVEKKIL_AKTIFE_ALINDI"
  | "BELGE_YUKLENDI"
  | "BELGE_SILINDI"
  | "ODEME_EKLENDI"
  | "ODEME_GUNCELLENDI"
  | "ODEME_SILINDI"
  | "DURUSMA_EKLENDI"
  | "DURUSMA_SILINDI"
  | "EMSAL_EKLENDI"
  | "EMSAL_SILINDI"
  | "GIRIS_YAPILDI";

export async function auditLog(params: {
  kullaniciId?: string;
  kullaniciAd?: string;
  eylem: AuditEylem;
  kaynak: string;
  kaynakId?: string;
  detay?: string;
}) {
  try {
    await prisma.auditLog.create({ data: params });
  } catch {
    // Log hatası ana işlemi engellememeli
  }
}
