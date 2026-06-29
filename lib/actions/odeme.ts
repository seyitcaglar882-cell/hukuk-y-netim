"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { OdemeTur, OdemeDurum } from "@prisma/client";
import { revalidatePath } from "next/cache";

async function oturumKontrol() {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Oturum bulunamadı.");
  return session;
}

export async function odemeleriGetir(dosyaId: string) {
  await oturumKontrol();
  return prisma.odeme.findMany({
    where: { dosyaId },
    orderBy: { tarih: "desc" },
  });
}

export async function tumOdemeleriGetir() {
  const session = await oturumKontrol();
  const where =
    session.user.rol === "AVUKAT"
      ? { dosya: { avukatId: session.user.id } }
      : {};
  return prisma.odeme.findMany({
    where,
    orderBy: { tarih: "desc" },
    include: {
      dosya: {
        select: {
          id: true,
          esasNo: true,
          dosyaNo: true,
          muvekkil: { select: { ad: true } },
        },
      },
    },
  });
}

export async function odemeEkle(data: {
  dosyaId: string;
  tur: OdemeTur;
  tutar: number;
  aciklama?: string;
  tarih: string;
  durum?: OdemeDurum;
}) {
  await oturumKontrol();
  const odeme = await prisma.odeme.create({
    data: {
      dosyaId: data.dosyaId,
      tur: data.tur,
      tutar: data.tutar,
      aciklama: data.aciklama ?? null,
      tarih: new Date(data.tarih),
      durum: data.durum ?? "BEKLIYOR",
    },
  });
  revalidatePath(`/dashboard/dosyalar/${data.dosyaId}`);
  revalidatePath("/dashboard/finans");
  return odeme;
}

export async function odemeGuncelle(
  id: string,
  data: {
    tur?: OdemeTur;
    tutar?: number;
    aciklama?: string;
    tarih?: string;
    durum?: OdemeDurum;
  }
) {
  await oturumKontrol();
  const odeme = await prisma.odeme.findUnique({ where: { id } });
  if (!odeme) throw new Error("Ödeme bulunamadı.");
  await prisma.odeme.update({
    where: { id },
    data: {
      ...(data.tur ? { tur: data.tur } : {}),
      ...(data.tutar !== undefined ? { tutar: data.tutar } : {}),
      aciklama: data.aciklama ?? undefined,
      ...(data.tarih ? { tarih: new Date(data.tarih) } : {}),
      ...(data.durum ? { durum: data.durum } : {}),
    },
  });
  revalidatePath(`/dashboard/dosyalar/${odeme.dosyaId}`);
  revalidatePath("/dashboard/finans");
}

export async function odemeSil(id: string) {
  await oturumKontrol();
  const odeme = await prisma.odeme.findUnique({ where: { id } });
  if (!odeme) return;
  await prisma.odeme.delete({ where: { id } });
  revalidatePath(`/dashboard/dosyalar/${odeme.dosyaId}`);
  revalidatePath("/dashboard/finans");
}

export async function finansOzeti() {
  const session = await oturumKontrol();
  const where =
    session.user.rol === "AVUKAT"
      ? { dosya: { avukatId: session.user.id } }
      : {};

  const odemeler = await prisma.odeme.findMany({ where });

  const topla = (tur: OdemeTur, durum?: OdemeDurum) =>
    odemeler
      .filter((o) => o.tur === tur && (durum ? o.durum === durum : true))
      .reduce((s, o) => s + Number(o.tutar), 0);

  return {
    toplamVekalet: topla("VEKALET_UCRETI"),
    tahsilEdilen: topla("TAHSILAT") + topla("VEKALET_UCRETI", "ODENDI"),
    bekleyenTahsilat:
      topla("VEKALET_UCRETI", "BEKLIYOR") + topla("VEKALET_UCRETI", "KISMI_ODENDI"),
    toplamMasraf: topla("MASRAF"),
    toplamAvans: topla("AVANS"),
  };
}
