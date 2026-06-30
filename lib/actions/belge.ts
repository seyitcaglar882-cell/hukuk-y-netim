"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auditLog } from "@/lib/audit";

async function oturumKontrol() {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Oturum bulunamadı.");
  return session;
}

export async function belgeleriGetir(dosyaId: string) {
  await oturumKontrol();
  return prisma.belge.findMany({
    where: { dosyaId },
    orderBy: { yuklendi: "desc" },
  });
}

export async function tumBelgeleriGetir() {
  await oturumKontrol();
  return prisma.belge.findMany({
    orderBy: { yuklendi: "desc" },
    include: {
      dosya: {
        select: {
          id: true,
          esasNo: true,
          dosyaNo: true,
          muvekkil: { select: { ad: true } },
          avukat: { select: { ad: true, mtPrefiks: true } },
        },
      },
    },
  });
}

const BELGE_DOSYA_INCLUDE = {
  dosya: {
    select: {
      id: true,
      esasNo: true,
      dosyaNo: true,
      muvekkil: {
        select: {
          ad: true,
          avukat: { select: { mtPrefiks: true } },
        },
      },
    },
  },
} as const;

export async function filtreSececenekleriGetir() {
  const session = await oturumKontrol();
  const { id: userId, rol } = session.user;

  const muvekkılWhere: Record<string, unknown> = { aktif: true };
  const dosyaWhere: Record<string, unknown> = { arsiv: false };

  if (rol === "AVUKAT") {
    muvekkılWhere.OR = [
      { avukatId: userId },
      { olusturanId: userId },
    ];
    dosyaWhere.OR = [
      { avukatId: userId },
      { olusturanId: userId },
    ];
  } else if (rol === "PATRON") {
    muvekkılWhere.avukatId = userId;
    dosyaWhere.muvekkil = { avukatId: userId };
  }

  const [muvekkillar, dosyalar] = await Promise.all([
    prisma.muvekkil.findMany({
      where: muvekkılWhere,
      select: { id: true, ad: true, muvekkılNo: true },
      orderBy: { ad: "asc" },
    }),
    prisma.dosya.findMany({
      where: dosyaWhere,
      select: {
        id: true,
        esasNo: true,
        dosyaNo: true,
        muvekkil: { select: { ad: true } },
      },
      orderBy: { olusturulma: "desc" },
    }),
  ]);

  return { muvekkillar, dosyalar };
}

export async function belgeleriFiltrele(opts: { dosyaId?: string; muvekkılId?: string }) {
  const session = await oturumKontrol();
  const { id: userId, rol } = session.user;

  if (!opts.dosyaId && !opts.muvekkılId) return [];

  const where: Record<string, unknown> = opts.dosyaId
    ? { dosyaId: opts.dosyaId }
    : { dosya: { muvekkılId: opts.muvekkılId } };

  if (rol === "PATRON") {
    where.dosya = { ...(where.dosya as Record<string, unknown> ?? {}), muvekkil: { avukatId: userId } };
  }

  return prisma.belge.findMany({
    where,
    orderBy: { yuklendi: "desc" },
    include: BELGE_DOSYA_INCLUDE,
  });
}

export async function belgeSil(id: string) {
  const session = await oturumKontrol();
  const belge = await prisma.belge.findUnique({ where: { id } });
  if (!belge) throw new Error("Belge bulunamadı.");

  const { unlink } = await import("fs/promises");
  const path = await import("path");
  const tamYol = path.join(process.cwd(), "uploads", "belgeler", belge.dosyaYolu);
  await unlink(tamYol).catch(() => {});

  await prisma.belge.delete({ where: { id } });
  await auditLog({
    kullaniciId: session.user.id,
    kullaniciAd: session.user.name ?? undefined,
    eylem: "BELGE_SILINDI",
    kaynak: "belge",
    kaynakId: id,
    detay: belge.ad,
  });
  revalidatePath(`/dashboard/dosyalar/${belge.dosyaId}`);
  revalidatePath("/dashboard/belgeler");
}
