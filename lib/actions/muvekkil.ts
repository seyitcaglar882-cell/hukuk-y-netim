"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MuvekkılTip } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { auditLog } from "@/lib/audit";

async function oturumKontrol() {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Oturum bulunamadı.");
  return session;
}

const avukatInclude = { select: { id: true, ad: true, rol: true, mtPrefiks: true } } as const;

// AVUKAT: kendi oluşturduklarını VE sahibi olduklarını görür
function avukatGorunurlukFiltresi(userId: string) {
  return {
    OR: [
      { avukatId: userId },    // sahibi ben
      { olusturanId: userId }, // ben oluşturdum
    ],
  };
}

export async function muvekkilleriGetir(opts?: { aktif?: boolean }) {
  const session = await oturumKontrol();
  const { id: userId, rol } = session.user;

  const where: Record<string, unknown> = { aktif: opts?.aktif ?? true };
  if (rol === "AVUKAT") {
    Object.assign(where, avukatGorunurlukFiltresi(userId));
  }

  return prisma.muvekkil.findMany({
    where,
    orderBy: { olusturulma: "desc" },
    include: {
      _count: { select: { dosyalar: true } },
      avukat: avukatInclude,
    },
  });
}

export async function muvekkiliGetir(id: string) {
  const session = await oturumKontrol();
  const { id: userId, rol } = session.user;

  const muvekkil = await prisma.muvekkil.findUnique({
    where: { id },
    include: {
      avukat: avukatInclude,
      dosyalar: {
        include: { avukat: { select: { id: true, ad: true } } },
        orderBy: { olusturulma: "desc" },
      },
    },
  });

  if (!muvekkil) return null;
  if (rol === "AVUKAT") {
    const izin = muvekkil.avukatId === userId || muvekkil.olusturanId === userId;
    if (!izin) return null;
  }
  return muvekkil;
}

export async function muvekkiliProfilGetir(id: string) {
  const session = await oturumKontrol();
  const { id: userId, rol } = session.user;

  const muvekkil = await prisma.muvekkil.findUnique({
    where: { id },
    include: {
      avukat: avukatInclude,
      dosyalar: {
        orderBy: { olusturulma: "desc" },
        include: {
          avukat: { select: { id: true, ad: true } },
          durusmalar: { orderBy: { tarih: "desc" } },
          gorevler: { orderBy: { sonTarih: "desc" } },
          belgeler: {
            orderBy: { yuklendi: "desc" },
            select: { id: true, ad: true, tur: true, mimeTipi: true },
          },
        },
      },
    },
  });

  if (!muvekkil) return null;
  if (rol === "AVUKAT") {
    const izin = muvekkil.avukatId === userId || muvekkil.olusturanId === userId;
    if (!izin) return null;
  }
  return muvekkil;
}

export async function muvekkiliNoileGetir(no: number) {
  const session = await oturumKontrol();
  const { id: userId, rol } = session.user;

  const muvekkil = await prisma.muvekkil.findUnique({
    where: { muvekkılNo: no },
    select: { id: true, avukatId: true, olusturanId: true },
  });

  if (!muvekkil) return null;
  if (rol === "AVUKAT") {
    const izin = muvekkil.avukatId === userId || muvekkil.olusturanId === userId;
    if (!izin) return null;
  }
  return { id: muvekkil.id };
}

export async function mtPrefiksAvukatlariGetir() {
  await oturumKontrol();
  return prisma.user.findMany({
    where: { mtPrefiks: true, aktif: true, rol: "PATRON" },
    select: { id: true, ad: true },
    orderBy: { ad: "asc" },
  });
}

export async function muvekkılEkle(data: {
  tip: MuvekkılTip;
  ad: string;
  tckn?: string;
  vkn?: string;
  telefon?: string;
  isTelefon?: string;
  email?: string;
  email2?: string;
  adres?: string;
  iban?: string;
  notlar?: string;
  kvkkOnay?: boolean;
  sahibiAvukatId?: string;
}) {
  const session = await oturumKontrol();
  const { id: userId, rol } = session.user;

  if (data.tckn && data.tckn.length !== 11) throw new Error("TCKN 11 haneli olmalıdır.");
  if (data.vkn && data.vkn.length !== 10) throw new Error("VKN 10 haneli olmalıdır.");

  // avukatId = sadece MT checkbox işaretlendiyse set et, yoksa null
  const avukatId = data.sahibiAvukatId || null;
  const olusturanId = userId;

  const son = await prisma.muvekkil.findFirst({
    orderBy: { muvekkılNo: "desc" },
    select: { muvekkılNo: true },
  });
  const muvekkılNo = (son?.muvekkılNo ?? 0) + 1;

  const { sahibiAvukatId: _omit, ...rest } = data; // eslint-disable-line @typescript-eslint/no-unused-vars
  const muvekkil = await prisma.muvekkil.create({
    data: {
      ...rest,
      muvekkılNo,
      avukatId,
      olusturanId,
      kvkkOnayTarihi: data.kvkkOnay ? new Date() : null,
    },
  });

  await auditLog({
    kullaniciId: session.user.id,
    kullaniciAd: session.user.name ?? undefined,
    eylem: "MUVEKKIL_OLUSTURULDU",
    kaynak: "muvekkil",
    kaynakId: muvekkil.id,
    detay: muvekkil.ad,
  });
  revalidatePath("/dashboard/muvekkillar");
  return muvekkil;
}

export async function muvekkılGuncelle(
  id: string,
  data: {
    tip: MuvekkılTip;
    ad: string;
    tckn?: string;
    vkn?: string;
    telefon?: string;
    isTelefon?: string;
    email?: string;
    email2?: string;
    adres?: string;
    iban?: string;
    notlar?: string;
    kvkkOnay?: boolean;
    sahibiAvukatId?: string;
  }
) {
  const session = await oturumKontrol();
  const { id: userId, rol } = session.user;

  if (rol === "AVUKAT") {
    const mevcut = await prisma.muvekkil.findUnique({
      where: { id },
      select: { avukatId: true, olusturanId: true },
    });
    const izin = mevcut?.avukatId === userId || mevcut?.olusturanId === userId;
    if (!izin) throw new Error("Bu müvekkili düzenleme yetkiniz yok.");
  }

  if (data.tckn && data.tckn.length !== 11) throw new Error("TCKN 11 haneli olmalıdır.");
  if (data.vkn && data.vkn.length !== 10) throw new Error("VKN 10 haneli olmalıdır.");

  const mevcut = await prisma.muvekkil.findUnique({ where: { id }, select: { kvkkOnay: true, kvkkOnayTarihi: true } });
  const kvkkTarih = data.kvkkOnay && !mevcut?.kvkkOnay ? new Date() : (data.kvkkOnay ? mevcut?.kvkkOnayTarihi : null);

  const { sahibiAvukatId, ...geriKalan } = data;
  await prisma.muvekkil.update({
    where: { id },
    data: {
      ...geriKalan,
      avukatId: sahibiAvukatId !== undefined ? (sahibiAvukatId || null) : undefined,
      kvkkOnayTarihi: kvkkTarih ?? null,
    },
  });
  await auditLog({
    kullaniciId: session.user.id,
    kullaniciAd: session.user.name ?? undefined,
    eylem: "MUVEKKIL_GUNCELLENDI",
    kaynak: "muvekkil",
    kaynakId: id,
    detay: data.ad,
  });
  revalidatePath("/dashboard/muvekkillar");
  revalidatePath(`/dashboard/muvekkillar/${id}`);
}

export async function muvekkılPasifYap(id: string) {
  const session = await oturumKontrol();
  const { id: userId, rol } = session.user;

  if (rol === "AVUKAT") {
    const mevcut = await prisma.muvekkil.findUnique({
      where: { id },
      select: { avukatId: true, olusturanId: true },
    });
    const izin = mevcut?.avukatId === userId || mevcut?.olusturanId === userId;
    if (!izin) throw new Error("Bu işlem için yetkiniz yok.");
  }

  const acikDosyaSayisi = await prisma.dosya.count({
    where: { muvekkılId: id, arsiv: false },
  });
  if (acikDosyaSayisi > 0) throw new Error("Arşivlenemiyor, aktif dosyalar mevcut.");
  const muvekkil = await prisma.muvekkil.findUnique({ where: { id }, select: { ad: true } });
  await prisma.muvekkil.update({ where: { id }, data: { aktif: false } });
  await auditLog({
    kullaniciId: session.user.id,
    kullaniciAd: session.user.name ?? undefined,
    eylem: "MUVEKKIL_PASIFE_ALINDI",
    kaynak: "muvekkil",
    kaynakId: id,
    detay: muvekkil?.ad,
  });
  revalidatePath("/dashboard/muvekkillar");
}

export async function muvekkılAktifYap(id: string) {
  const session = await oturumKontrol();
  const muvekkil = await prisma.muvekkil.findUnique({ where: { id }, select: { ad: true } });
  await prisma.muvekkil.update({ where: { id }, data: { aktif: true } });
  await auditLog({
    kullaniciId: session.user.id,
    kullaniciAd: session.user.name ?? undefined,
    eylem: "MUVEKKIL_AKTIFE_ALINDI",
    kaynak: "muvekkil",
    kaynakId: id,
    detay: muvekkil?.ad,
  });
  revalidatePath("/dashboard/muvekkillar");
}

export async function muvekkiliSahipAtama(muvekkılId: string, avukatId: string | null) {
  const session = await oturumKontrol();
  if (session.user.rol !== "PATRON") throw new Error("Bu işlem için yetkiniz yok.");

  await prisma.muvekkil.update({
    where: { id: muvekkılId },
    data: { avukatId },
  });
  revalidatePath("/dashboard/muvekkillar");
  revalidatePath(`/dashboard/muvekkillar/${muvekkılId}`);
}
