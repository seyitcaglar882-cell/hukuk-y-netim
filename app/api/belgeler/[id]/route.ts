import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readFile, unlink } from "fs/promises";
import path from "path";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ hata: "Yetkisiz." }, { status: 401 });

  const { id } = await params;
  const belge = await prisma.belge.findUnique({ where: { id } });
  if (!belge) return NextResponse.json({ hata: "Bulunamadı." }, { status: 404 });

  try {
    const tamYol = path.join(process.cwd(), "uploads", "belgeler", belge.dosyaYolu);
    const buffer = await readFile(tamYol);

    const inline = req.nextUrl.searchParams.get("inline") === "1";
    const disposition = inline ? "inline" : `attachment; filename="${encodeURIComponent(belge.ad)}"`;

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": belge.mimeTipi,
        "Content-Disposition": disposition,
        "Content-Length": String(buffer.length),
        "Cache-Control": "private, no-cache",
      },
    });
  } catch {
    return NextResponse.json({ hata: "Dosya okunamadı." }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ hata: "Yetkisiz." }, { status: 401 });

  const { id } = await params;
  const belge = await prisma.belge.findUnique({ where: { id } });
  if (!belge) return NextResponse.json({ hata: "Bulunamadı." }, { status: 404 });

  try {
    const tamYol = path.join(process.cwd(), "uploads", "belgeler", belge.dosyaYolu);
    await unlink(tamYol).catch(() => {});
  } catch { /* dosya zaten yoksa geç */ }

  await prisma.belge.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
