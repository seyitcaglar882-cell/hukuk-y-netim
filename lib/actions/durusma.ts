"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DurusmaTur, DurusmaDurum } from "@prisma/client";
import { revalidatePath } from "next/cache";

// --- UYAP Duruşma Import yardımcıları ---
function normalizeEsasNo(s: string): string {
  return s.replace(/[^0-9/]/g, "").replace(/\/+/g, "/").trim();
}

function parseTarih(tarihStr: string, saatStr?: string): Date | null {
  const parcalar = tarihStr.trim().split(/[.\/\-]/);
  if (parcalar.length < 3) return null;
  const gun = parseInt(parcalar[0]);
  const ay = parseInt(parcalar[1]) - 1;
  const yil = parseInt(parcalar[2].substring(0, 4));
  let saat = 9, dakika = 0;
  if (saatStr) {
    const [s, d] = saatStr.trim().split(":");
    saat = parseInt(s) || 9;
    dakika = parseInt(d) || 0;
  }
  const d = new Date(yil, ay, gun, saat, dakika);
  return isNaN(d.getTime()) ? null : d;
}

function belirleTur(tur?: string): DurusmaTur {
  if (!tur) return "DURUSMA";
  const t = tur.toLowerCase();
  if (t.includes("keşif") || t.includes("kesif")) return "KESIF";
  if (t.includes("toplantı") || t.includes("toplanti")) return "TOPLANTI";
  if (t.includes("son gün") || t.includes("son gun") || t.includes("süre") || t.includes("sure")) return "SON_GUN";
  return "DURUSMA";
}

export type UyapDurusmaSatiri = {
  esasNo: string;
  tarih: string;
  saat?: string;
  tur?: string;
  yer?: string;
};

export async function uyapDurusmalariImportEt(satirlar: UyapDurusmaSatiri[]) {
  await oturumKontrol();

  const dosyalar = await prisma.dosya.findMany({
    select: { id: true, esasNo: true, dosyaNo: true },
  });

  // Normalize → dosyaId haritası
  const dosyaHarita = new Map<string, string>();
  for (const d of dosyalar) {
    if (d.esasNo) dosyaHarita.set(normalizeEsasNo(d.esasNo), d.id);
    if (d.dosyaNo) dosyaHarita.set(normalizeEsasNo(d.dosyaNo), d.id);
  }

  function dosyaBul(esasNo: string): string | undefined {
    const norm = normalizeEsasNo(esasNo);
    if (!norm) return undefined;
    const entries = Array.from(dosyaHarita.entries());
    for (const [key, id] of entries) {
      if (key && (key.includes(norm) || norm.includes(key))) return id;
    }
    return undefined;
  }

  let eklenen = 0, atlanan = 0, eslenmedi = 0;

  for (const satir of satirlar) {
    if (!satir.esasNo?.trim() || !satir.tarih?.trim()) { atlanan++; continue; }

    const dosyaId = dosyaBul(satir.esasNo);
    if (!dosyaId) { eslenmedi++; continue; }

    const tarih = parseTarih(satir.tarih, satir.saat);
    if (!tarih) { atlanan++; continue; }

    // Duplicate: aynı dosya + aynı tarih ±5dk
    const mevcut = await prisma.durusma.findFirst({
      where: {
        dosyaId,
        tarih: {
          gte: new Date(tarih.getTime() - 5 * 60_000),
          lte: new Date(tarih.getTime() + 5 * 60_000),
        },
      },
    });
    if (mevcut) { atlanan++; continue; }

    await prisma.durusma.create({
      data: { dosyaId, tarih, tur: belirleTur(satir.tur), yer: satir.yer || null },
    });
    eklenen++;
  }

  revalidatePath("/dashboard/takvim");
  return { eklenen, atlanan, eslenmedi };
}

async function oturumKontrol() {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Oturum bulunamadı.");
  return session;
}

export async function durusmalariGetir(opts?: { dosyaId?: string; baslangic?: Date; bitis?: Date }) {
  const session = await oturumKontrol();

  const where: Record<string, unknown> = {};

  if (session.user.rol === "AVUKAT") {
    where.dosya = {
      OR: [
        { avukatId: session.user.id },
        { olusturanId: session.user.id },
      ],
    };
  }
  if (opts?.dosyaId) where.dosyaId = opts.dosyaId;
  if (opts?.baslangic || opts?.bitis) {
    where.tarih = {
      ...(opts.baslangic ? { gte: opts.baslangic } : {}),
      ...(opts.bitis ? { lte: opts.bitis } : {}),
    };
  }

  return prisma.durusma.findMany({
    where,
    orderBy: { tarih: "asc" },
    include: {
      dosya: {
        select: { id: true, esasNo: true, dosyaNo: true, mahkeme: true, muvekkil: { select: { ad: true } } },
      },
    },
  });
}

// Çakışma kontrolü: aynı avukat aynı gün ±1 saatlik pencerede başka duruşma var mı?
export async function cakismaKontrol(avukatId: string, tarih: Date, hariciId?: string) {
  const baslangic = new Date(tarih.getTime() - 60 * 60 * 1000);
  const bitis = new Date(tarih.getTime() + 60 * 60 * 1000);

  const cakisan = await prisma.durusma.findFirst({
    where: {
      id: hariciId ? { not: hariciId } : undefined,
      dosya: { avukatId },
      tarih: { gte: baslangic, lte: bitis },
      durum: { not: "IPTAL" },
    },
    include: { dosya: { select: { esasNo: true, dosyaNo: true } } },
  });

  return cakisan;
}

export async function durusmaEkle(data: {
  dosyaId: string;
  tarih: string;
  tur: DurusmaTur;
  yer?: string;
  avukatId?: string;
  zorunluKaydet?: boolean;
}) {
  await oturumKontrol();

  const tarih = new Date(data.tarih);

  // Çakışma kontrolü (zorunluKaydet=true ise atla)
  if (data.avukatId && !data.zorunluKaydet) {
    const cakisan = await cakismaKontrol(data.avukatId, tarih);
    if (cakisan) {
      const dosyaNo = cakisan.dosya.esasNo || cakisan.dosya.dosyaNo || "başka bir dosya";
      throw new Error(`Çakışma! Bu saatte ${dosyaNo} dosyasında zaten bir duruşma var.`);
    }
  }

  const durusma = await prisma.durusma.create({
    data: {
      dosyaId: data.dosyaId,
      tarih,
      tur: data.tur,
      yer: data.yer ?? null,
    },
  });

  revalidatePath("/dashboard/takvim");
  revalidatePath(`/dashboard/dosyalar/${data.dosyaId}`);
  return durusma;
}

export async function durusmaGuncelle(
  id: string,
  data: {
    tarih?: string;
    tur?: DurusmaTur;
    yer?: string;
    sonucNotu?: string;
    sonrakiAdim?: string;
    durum?: DurusmaDurum;
  }
) {
  await oturumKontrol();

  const durusma = await prisma.durusma.findUnique({ where: { id }, include: { dosya: true } });
  if (!durusma) throw new Error("Duruşma bulunamadı.");

  // Tarih değişiyorsa çakışma kontrolü
  if (data.tarih && durusma.dosya.avukatId) {
    const yeniTarih = new Date(data.tarih);
    const cakisan = await cakismaKontrol(durusma.dosya.avukatId, yeniTarih, id);
    if (cakisan) {
      throw new Error(
        `Çakışma! Bu saatte ${cakisan.dosya.esasNo || cakisan.dosya.dosyaNo || "başka bir dosya"} duruşması var.`
      );
    }
  }

  await prisma.durusma.update({
    where: { id },
    data: {
      ...(data.tarih ? { tarih: new Date(data.tarih) } : {}),
      ...(data.tur ? { tur: data.tur } : {}),
      yer: data.yer ?? undefined,
      sonucNotu: data.sonucNotu ?? undefined,
      sonrakiAdim: data.sonrakiAdim ?? undefined,
      ...(data.durum ? { durum: data.durum } : {}),
    },
  });

  revalidatePath("/dashboard/takvim");
  revalidatePath(`/dashboard/dosyalar/${durusma.dosyaId}`);
}

export async function durusmaSil(id: string) {
  await oturumKontrol();
  const d = await prisma.durusma.findUnique({ where: { id } });
  await prisma.durusma.delete({ where: { id } });
  revalidatePath("/dashboard/takvim");
  if (d) revalidatePath(`/dashboard/dosyalar/${d.dosyaId}`);
}

export async function yaklaşanDurusmalar(gunSayisi = 7) {
  const session = await oturumKontrol();
  const simdi = new Date();
  const bitis = new Date(simdi.getTime() + gunSayisi * 24 * 60 * 60 * 1000);

  const where: Record<string, unknown> = {
    tarih: { gte: simdi, lte: bitis },
    durum: "BEKLIYOR",
  };
  if (session.user.rol === "AVUKAT") where.dosya = { avukatId: session.user.id };

  return prisma.durusma.findMany({
    where,
    orderBy: { tarih: "asc" },
    include: { dosya: { select: { esasNo: true, dosyaNo: true, mahkeme: true, muvekkil: { select: { ad: true } } } } },
  });
}
