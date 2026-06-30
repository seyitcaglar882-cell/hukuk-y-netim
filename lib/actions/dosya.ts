"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DosyaTip, DosyaDurum } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { auditLog } from "@/lib/audit";

async function oturumKontrol() {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Oturum bulunamadı.");
  return session;
}

export async function dosyalariGetir(opts?: { arama?: string; durum?: DosyaDurum; tip?: DosyaTip; avukatId?: string; sadecePasif?: boolean }) {
  const session = await oturumKontrol();
  const { id: userId, rol } = session.user;

  const andConds: Record<string, unknown>[] = [];

  // Sahiplik filtresi: ben oluşturdum
  if (rol === "AVUKAT") {
    andConds.push({ olusturanId: userId });
  } else if (opts?.avukatId && rol === "PATRON") {
    andConds.push({ olusturanId: opts.avukatId });
  }

  // Arama filtresi
  if (opts?.arama) {
    andConds.push({
      OR: [
        { esasNo: { contains: opts.arama, mode: "insensitive" } },
        { dosyaNo: { contains: opts.arama, mode: "insensitive" } },
        { mahkeme: { contains: opts.arama, mode: "insensitive" } },
        { muvekkil: { ad: { contains: opts.arama, mode: "insensitive" } } },
      ],
    });
  }

  const where: Record<string, unknown> = {};
  if (opts?.sadecePasif) {
    where.arsiv = true;
  } else {
    where.arsiv = false;
    if (opts?.durum) where.durum = opts.durum;
  }
  if (opts?.tip) where.tip = opts.tip;
  if (andConds.length > 0) where.AND = andConds;

  return prisma.dosya.findMany({
    where,
    orderBy: { olusturulma: "desc" },
    include: {
      muvekkil: {
        select: {
          id: true,
          ad: true,
          tip: true,
          avukat: { select: { mtPrefiks: true } },
        },
      },
      _count: { select: { karsiTaraflar: true } },
    },
  });
}

export async function dosyayiGetir(id: string) {
  await oturumKontrol();
  return prisma.dosya.findUnique({
    where: { id },
    include: {
      muvekkil: {
        include: { avukat: { select: { mtPrefiks: true } } },
      },
      karsiTaraflar: true,
    },
  });
}

export async function dosyaEkle(data: {
  dosyaNo?: string;
  esasNo?: string;
  tip: DosyaTip;
  altTip?: string;
  mahkeme?: string;
  durum: DosyaDurum;
  acilisTarihi?: string;
  aciklama?: string;
  muvekkılId: string;
}) {
  const session = await oturumKontrol();
  const { id: userId } = session.user;

  const dosya = await prisma.dosya.create({
    data: {
      dosyaNo: data.dosyaNo,
      esasNo: data.esasNo,
      tip: data.tip,
      altTip: data.altTip,
      mahkeme: data.mahkeme,
      durum: data.durum,
      aciklama: data.aciklama,
      muvekkılId: data.muvekkılId,
      olusturanId: userId,
      acilisTarihi: data.acilisTarihi ? new Date(data.acilisTarihi) : null,
    },
  });

  await auditLog({
    kullaniciId: session.user.id,
    kullaniciAd: session.user.name ?? undefined,
    eylem: "DOSYA_OLUSTURULDU",
    kaynak: "dosya",
    kaynakId: dosya.id,
    detay: data.esasNo ?? data.dosyaNo ?? undefined,
  });

  revalidatePath("/dashboard/dosyalar");
  return dosya;
}

export async function dosyaGuncelle(
  id: string,
  data: {
    dosyaNo?: string;
    esasNo?: string;
    tip?: DosyaTip;
    altTip?: string;
    mahkeme?: string;
    durum?: DosyaDurum;
    acilisTarihi?: string;
    aciklama?: string;
    muvekkılId?: string;
  }
) {
  await oturumKontrol();

  await prisma.dosya.update({
    where: { id },
    data: {
      ...data,
      acilisTarihi: data.acilisTarihi ? new Date(data.acilisTarihi) : undefined,
    },
  });

  revalidatePath("/dashboard/dosyalar");
  revalidatePath(`/dashboard/dosyalar/${id}`);
}

export async function dosyaArsivle(id: string) {
  const session = await oturumKontrol();
  const dosya = await prisma.dosya.findUnique({ where: { id }, select: { esasNo: true, dosyaNo: true } });
  await prisma.dosya.update({ where: { id }, data: { arsiv: true } });
  await auditLog({
    kullaniciId: session.user.id,
    kullaniciAd: session.user.name ?? undefined,
    eylem: "DOSYA_GUNCELLENDI",
    kaynak: "dosya",
    kaynakId: id,
    detay: `Arşivlendi — ${dosya?.esasNo ?? dosya?.dosyaNo ?? id}`,
  });
  revalidatePath("/dashboard/dosyalar");
  revalidatePath(`/dashboard/dosyalar/${id}`);
}

export async function dosyaArsivdenCikar(id: string) {
  const session = await oturumKontrol();
  const dosya = await prisma.dosya.findUnique({ where: { id }, select: { esasNo: true, dosyaNo: true } });
  await prisma.dosya.update({ where: { id }, data: { arsiv: false } });
  await auditLog({
    kullaniciId: session.user.id,
    kullaniciAd: session.user.name ?? undefined,
    eylem: "DOSYA_GUNCELLENDI",
    kaynak: "dosya",
    kaynakId: id,
    detay: `Arşivden çıkarıldı — ${dosya?.esasNo ?? dosya?.dosyaNo ?? id}`,
  });
  revalidatePath("/dashboard/dosyalar");
  revalidatePath(`/dashboard/dosyalar/${id}`);
}

export async function dosyaSil(id: string) {
  const session = await oturumKontrol();
  if (session.user.rol !== "PATRON") throw new Error("Sadece patron dosya silebilir.");
  const dosya = await prisma.dosya.findUnique({ where: { id }, select: { esasNo: true, dosyaNo: true } });
  await prisma.dosya.delete({ where: { id } });
  await auditLog({
    kullaniciId: session.user.id,
    kullaniciAd: session.user.name ?? undefined,
    eylem: "DOSYA_SILINDI",
    kaynak: "dosya",
    kaynakId: id,
    detay: dosya?.esasNo ?? dosya?.dosyaNo ?? undefined,
  });
  revalidatePath("/dashboard/dosyalar");
}

export async function danismanlikaDonustur(id: string, ekBilgiler?: { mahkeme?: string; esasNo?: string }) {
  await oturumKontrol();

  const dosya = await prisma.dosya.findUnique({ where: { id } });
  if (!dosya) throw new Error("Dosya bulunamadı.");
  if (dosya.tip !== "DANISMANLIK") throw new Error("Bu dosya zaten dava dosyası.");

  await prisma.dosya.update({
    where: { id },
    data: {
      tip: "DAVA",
      durum: "DERDEST",
      mahkeme: ekBilgiler?.mahkeme ?? dosya.mahkeme,
      esasNo: ekBilgiler?.esasNo ?? dosya.esasNo,
    },
  });

  revalidatePath("/dashboard/dosyalar");
  revalidatePath(`/dashboard/dosyalar/${id}`);
}

export async function karsiTarafEkle(dosyaId: string, data: { ad: string; vekili?: string; iletisim?: string }) {
  await oturumKontrol();
  await prisma.karsiTaraf.create({ data: { dosyaId, ...data } });
  revalidatePath(`/dashboard/dosyalar/${dosyaId}`);
}

export async function karsiTarafGuncelle(id: string, dosyaId: string, data: { ad: string; vekili?: string; iletisim?: string }) {
  await oturumKontrol();
  await prisma.karsiTaraf.update({ where: { id }, data });
  revalidatePath(`/dashboard/dosyalar/${dosyaId}`);
}

export async function karsiTarafSil(id: string, dosyaId: string) {
  await oturumKontrol();
  await prisma.karsiTaraf.delete({ where: { id } });
  revalidatePath(`/dashboard/dosyalar/${dosyaId}`);
}

export async function uyapDosyalariImportEt(
  satirlar: {
    esasNo: string;
    mahkeme?: string;
    muvekkılAd?: string;
    durum?: string;
    acilisTarihi?: string;
  }[],
  muvekkılId: string,
  avukatId?: string
) {
  const session = await oturumKontrol();

  let eklenen = 0;
  let atlanan = 0;

  for (const satir of satirlar) {
    if (!satir.esasNo) { atlanan++; continue; }

    const mevcut = await prisma.dosya.findFirst({ where: { esasNo: satir.esasNo } });
    if (mevcut) { atlanan++; continue; }

    await prisma.dosya.create({
      data: {
        esasNo: satir.esasNo,
        mahkeme: satir.mahkeme ?? null,
        tip: "DAVA",
        durum: satir.durum === "Kapalı" ? "KAPALI" : "DERDEST",
        acilisTarihi: satir.acilisTarihi ? new Date(satir.acilisTarihi) : null,
        muvekkılId,
        avukatId: avukatId ?? session.user.id,
        olusturanId: session.user.id,
      },
    });
    eklenen++;
  }

  revalidatePath("/dashboard/dosyalar");
  return { eklenen, atlanan };
}
