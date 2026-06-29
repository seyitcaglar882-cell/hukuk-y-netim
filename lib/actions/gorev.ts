"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GorevTur, GorevDurum } from "@prisma/client";
import { revalidatePath } from "next/cache";

async function oturumKontrol() {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Oturum bulunamadı.");
  return session;
}

export async function gorevleriGetir(opts?: { dosyaId?: string; durum?: GorevDurum; atananId?: string }) {
  const session = await oturumKontrol();

  const where: Record<string, unknown> = {};
  if (session.user.rol === "AVUKAT") where.atananId = session.user.id;
  if (opts?.dosyaId) where.dosyaId = opts.dosyaId;
  if (opts?.durum) where.durum = opts.durum;
  if (opts?.atananId) where.atananId = opts.atananId;

  return prisma.gorev.findMany({
    where,
    orderBy: { sonTarih: "asc" },
    include: {
      dosya: { select: { id: true, esasNo: true, dosyaNo: true, muvekkil: { select: { ad: true } } } },
      atanan: { select: { id: true, ad: true } },
    },
  });
}

export async function gorevEkle(data: {
  dosyaId?: string;
  baslik: string;
  aciklama?: string;
  tur: GorevTur;
  sonTarih: string;
  atananId?: string;
  hatirlatmaTarihi?: string;
}) {
  await oturumKontrol();

  const gorev = await prisma.gorev.create({
    data: {
      dosyaId: data.dosyaId ?? null,
      baslik: data.baslik,
      aciklama: data.aciklama ?? null,
      tur: data.tur,
      sonTarih: new Date(data.sonTarih),
      atananId: data.atananId ?? null,
      hatirlatmaTarihi: data.hatirlatmaTarihi ? new Date(data.hatirlatmaTarihi) : null,
    },
  });

  revalidatePath("/dashboard/takvim");
  if (data.dosyaId) revalidatePath(`/dashboard/dosyalar/${data.dosyaId}`);
  return gorev;
}

export async function gorevGuncelle(
  id: string,
  data: {
    baslik?: string;
    aciklama?: string;
    tur?: GorevTur;
    sonTarih?: string;
    atananId?: string | null;
    durum?: GorevDurum;
    hatirlatmaTarihi?: string;
  }
) {
  await oturumKontrol();

  const g = await prisma.gorev.findUnique({ where: { id } });

  await prisma.gorev.update({
    where: { id },
    data: {
      ...(data.baslik ? { baslik: data.baslik } : {}),
      aciklama: data.aciklama ?? undefined,
      ...(data.tur ? { tur: data.tur } : {}),
      ...(data.sonTarih ? { sonTarih: new Date(data.sonTarih) } : {}),
      atananId: data.atananId ?? undefined,
      ...(data.durum ? { durum: data.durum } : {}),
      hatirlatmaTarihi: data.hatirlatmaTarihi ? new Date(data.hatirlatmaTarihi) : undefined,
    },
  });

  revalidatePath("/dashboard/takvim");
  if (g?.dosyaId) revalidatePath(`/dashboard/dosyalar/${g.dosyaId}`);
}

export async function gorevTamamla(id: string) {
  await oturumKontrol();
  const g = await prisma.gorev.update({ where: { id }, data: { durum: "TAMAMLANDI" } });
  revalidatePath("/dashboard/takvim");
  if (g.dosyaId) revalidatePath(`/dashboard/dosyalar/${g.dosyaId}`);
}

export async function gorevSil(id: string) {
  await oturumKontrol();
  const g = await prisma.gorev.findUnique({ where: { id } });
  await prisma.gorev.delete({ where: { id } });
  revalidatePath("/dashboard/takvim");
  if (g?.dosyaId) revalidatePath(`/dashboard/dosyalar/${g.dosyaId}`);
}

export async function yaklaşanGorevler(gunSayisi = 7) {
  const session = await oturumKontrol();
  const simdi = new Date();
  const bitis = new Date(simdi.getTime() + gunSayisi * 24 * 60 * 60 * 1000);

  const where: Record<string, unknown> = {
    sonTarih: { gte: simdi, lte: bitis },
    durum: "BEKLIYOR",
  };
  if (session.user.rol === "AVUKAT") where.atananId = session.user.id;

  return prisma.gorev.findMany({
    where,
    orderBy: { sonTarih: "asc" },
    include: { dosya: { select: { esasNo: true, dosyaNo: true, muvekkil: { select: { ad: true } } } } },
  });
}
