"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function patronKontrol() {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Oturum bulunamadı.");
  if (session.user.rol !== "PATRON") throw new Error("Bu sayfa yalnızca patrona açıktır.");
  return session;
}

export async function auditLoglarGetir(limit = 100) {
  await patronKontrol();
  return prisma.auditLog.findMany({
    orderBy: { tarih: "desc" },
    take: limit,
  });
}
