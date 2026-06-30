"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Rol } from "@prisma/client";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

async function patronKontrol() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.rol !== "PATRON") {
    throw new Error("Yetkisiz erişim.");
  }
  return session;
}

export async function kullanicilariGetir() {
  await patronKontrol();
  return prisma.user.findMany({
    orderBy: { olusturulma: "desc" },
    select: {
      id: true,
      ad: true,
      email: true,
      rol: true,
      telefon: true,
      mtPrefiks: true,
      aktif: true,
      olusturulma: true,
    },
  });
}

export async function kullaniciEkle(data: {
  ad: string;
  email: string;
  sifre: string;
  rol: Rol;
  telefon?: string;
}) {
  await patronKontrol();

  const mevcut = await prisma.user.findUnique({ where: { email: data.email } });
  if (mevcut) throw new Error("Bu e-posta adresi zaten kayıtlı.");

  const sifreHash = await bcrypt.hash(data.sifre, 12);
  await prisma.user.create({
    data: {
      ad: data.ad,
      email: data.email,
      sifreHash,
      rol: data.rol,
      telefon: data.telefon || null,
    },
  });

  revalidatePath("/dashboard/patron/kullanicilar");
}

export async function kullaniciGuncelle(
  id: string,
  data: { ad: string; email: string; rol: Rol; telefon?: string; mtPrefiks?: boolean }
) {
  await patronKontrol();

  const mevcut = await prisma.user.findFirst({
    where: { email: data.email, NOT: { id } },
  });
  if (mevcut) throw new Error("Bu e-posta adresi başka kullanıcıya ait.");

  await prisma.user.update({
    where: { id },
    data: {
      ad: data.ad,
      email: data.email,
      rol: data.rol,
      telefon: data.telefon || null,
      mtPrefiks: data.mtPrefiks ?? false,
    },
  });

  revalidatePath("/dashboard/patron/kullanicilar");
}

export async function kullaniciDurumDegistir(id: string, aktif: boolean) {
  const session = await patronKontrol();

  if (session.user.id === id) throw new Error("Kendi hesabınızı pasifleştiremezsiniz.");

  await prisma.user.update({ where: { id }, data: { aktif } });
  revalidatePath("/patron/kullanicilar");
}

export async function sifreDegistir(data: {
  mevcutSifre: string;
  yeniSifre: string;
}) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Oturum bulunamadı.");

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) throw new Error("Kullanıcı bulunamadı.");

  const dogru = await bcrypt.compare(data.mevcutSifre, user.sifreHash);
  if (!dogru) throw new Error("Mevcut şifre hatalı.");

  const sifreHash = await bcrypt.hash(data.yeniSifre, 12);
  await prisma.user.update({ where: { id: user.id }, data: { sifreHash } });
}

export async function profilGuncelle(data: { ad: string; telefon?: string }) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Oturum bulunamadı.");

  await prisma.user.update({
    where: { id: session.user.id },
    data: { ad: data.ad, telefon: data.telefon || null },
  });
}
