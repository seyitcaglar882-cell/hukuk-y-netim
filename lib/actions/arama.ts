"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function aramaYap(q: string) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Oturum bulunamadı.");

  const term = q.trim();
  if (term.length < 2) return { muvekkillar: [], dosyalar: [] };

  const dosyaWhere = session.user.rol === "AVUKAT" ? { avukatId: session.user.id } : {};

  const [muvekkillar, dosyalar] = await Promise.all([
    prisma.muvekkil.findMany({
      where: {
        aktif: true,
        OR: [
          { ad: { contains: term, mode: "insensitive" } },
          { tckn: { contains: term } },
          { vkn: { contains: term } },
          { telefon: { contains: term } },
          { email: { contains: term, mode: "insensitive" } },
        ],
      },
      include: { _count: { select: { dosyalar: true } } },
      orderBy: { ad: "asc" },
      take: 25,
    }),
    prisma.dosya.findMany({
      where: {
        ...dosyaWhere,
        OR: [
          { dosyaNo: { contains: term, mode: "insensitive" } },
          { esasNo: { contains: term, mode: "insensitive" } },
          { mahkeme: { contains: term, mode: "insensitive" } },
          { altTip: { contains: term, mode: "insensitive" } },
          { aciklama: { contains: term, mode: "insensitive" } },
          { muvekkil: { ad: { contains: term, mode: "insensitive" } } },
        ],
      },
      include: {
        muvekkil: { select: { id: true, ad: true } },
        avukat: { select: { id: true, ad: true } },
      },
      orderBy: { olusturulma: "desc" },
      take: 25,
    }),
  ]);

  return { muvekkillar, dosyalar };
}
