"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function bildirimleriGetir() {
  const session = await getServerSession(authOptions);
  if (!session) return [];

  return prisma.bildirim.findMany({
    where: { userId: session.user.id },
    orderBy: { olusturulma: "desc" },
    take: 50,
  });
}

export async function bildirimOkundu(id: string) {
  const session = await getServerSession(authOptions);
  if (!session) return;
  await prisma.bildirim.update({ where: { id }, data: { okundu: true } });
  revalidatePath("/dashboard");
}

export async function tumunuOku() {
  const session = await getServerSession(authOptions);
  if (!session) return;
  await prisma.bildirim.updateMany({
    where: { userId: session.user.id, okundu: false },
    data: { okundu: true },
  });
  revalidatePath("/dashboard");
}

// Hatırlatma motoru — API route'tan tetiklenir
export async function hatirlatmalariOlustur() {
  const simdi = new Date();
  const yarn3Gun = new Date(simdi.getTime() + 3 * 24 * 60 * 60 * 1000);

  // Yaklaşan duruşmalar (1 gün ve 3 gün önce uyarı)
  const yaklaşanDurusmalar = await prisma.durusma.findMany({
    where: {
      tarih: { gte: simdi, lte: yarn3Gun },
      durum: "BEKLIYOR",
    },
    include: {
      dosya: {
        select: {
          esasNo: true, dosyaNo: true, mahkeme: true, avukatId: true,
          muvekkil: { select: { ad: true } },
        },
      },
    },
  });

  for (const d of yaklaşanDurusmalar) {
    if (!d.dosya.avukatId) continue;
    const mevcutBildirim = await prisma.bildirim.findFirst({
      where: { userId: d.dosya.avukatId, ilgiliId: d.id, ilgiliTip: "durusma" },
    });
    if (mevcutBildirim) continue;

    const gun = Math.ceil((d.tarih.getTime() - simdi.getTime()) / (1000 * 60 * 60 * 24));
    const dosyaAd = d.dosya.esasNo || d.dosya.dosyaNo || "Bilinmiyor";
    await prisma.bildirim.create({
      data: {
        userId: d.dosya.avukatId,
        tur: "DURUSMA_HATIRLATMA",
        mesaj: `${gun} gün sonra duruşma: ${dosyaAd} — ${d.dosya.muvekkil.ad}`,
        ilgiliId: d.id,
        ilgiliTip: "durusma",
      },
    });
  }

  // Yaklaşan görev süreleri
  const yaklaşanGorevler = await prisma.gorev.findMany({
    where: {
      sonTarih: { gte: simdi, lte: yarn3Gun },
      durum: "BEKLIYOR",
    },
    include: { dosya: { select: { esasNo: true, dosyaNo: true, muvekkil: { select: { ad: true } } } } },
  });

  for (const g of yaklaşanGorevler) {
    if (!g.atananId) continue;
    const mevcutBildirim = await prisma.bildirim.findFirst({
      where: { userId: g.atananId, ilgiliId: g.id, ilgiliTip: "gorev" },
    });
    if (mevcutBildirim) continue;

    const gun = Math.ceil((g.sonTarih.getTime() - simdi.getTime()) / (1000 * 60 * 60 * 24));
    await prisma.bildirim.create({
      data: {
        userId: g.atananId,
        tur: "SURE_HATIRLATMA",
        mesaj: `${gun} günde süre doluyor: ${g.baslik}`,
        ilgiliId: g.id,
        ilgiliTip: "gorev",
      },
    });
  }

  // Süresi geçen görevleri GECTI yap
  await prisma.gorev.updateMany({
    where: { sonTarih: { lt: simdi }, durum: "BEKLIYOR" },
    data: { durum: "GECTI" },
  });

  return { ok: true };
}
