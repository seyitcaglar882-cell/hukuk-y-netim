import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { BelgeTur } from "@prisma/client";
import { auditLog } from "@/lib/audit";

const IZIN_VERILEN_TIPLER = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/plain",
];

const MAX_BOYUT = 20 * 1024 * 1024; // 20 MB

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ hata: "Yetkisiz." }, { status: 401 });

  try {
    const form = await req.formData();
    const dosya = form.get("dosya") as File | null;
    const dosyaId = form.get("dosyaId") as string | null;
    const tur = (form.get("tur") as string | null) ?? "DIGER";
    const aciklama = (form.get("aciklama") as string | null) ?? "";
    const adOverride = (form.get("ad") as string | null) ?? "";

    if (!dosya || !dosyaId) {
      return NextResponse.json({ hata: "Dosya veya dosyaId eksik." }, { status: 400 });
    }

    if (!IZIN_VERILEN_TIPLER.includes(dosya.type)) {
      return NextResponse.json({ hata: "Desteklenmeyen dosya türü." }, { status: 400 });
    }

    if (dosya.size > MAX_BOYUT) {
      return NextResponse.json({ hata: "Dosya 20 MB sınırını aşıyor." }, { status: 400 });
    }

    // Kayıt oluştur (ID al)
    const belge = await prisma.belge.create({
      data: {
        dosyaId,
        ad: adOverride || dosya.name,
        dosyaYolu: "temp",
        boyut: dosya.size,
        mimeTipi: dosya.type,
        tur: tur as BelgeTur,
        aciklama: aciklama || null,
      },
    });

    // Uzantıyı koru, ID ile isimlendiriyoruz
    const uzanti = path.extname(dosya.name);
    const dosyaAdi = `${belge.id}${uzanti}`;
    const yuklemeDizini = path.join(process.cwd(), "uploads", "belgeler");
    await mkdir(yuklemeDizini, { recursive: true });
    const tamYol = path.join(yuklemeDizini, dosyaAdi);

    const buffer = Buffer.from(await dosya.arrayBuffer());
    await writeFile(tamYol, buffer);

    // Yolu güncelle
    await prisma.belge.update({
      where: { id: belge.id },
      data: { dosyaYolu: dosyaAdi },
    });

    await auditLog({
      kullaniciId: session.user.id,
      kullaniciAd: session.user.name ?? undefined,
      eylem: "BELGE_YUKLENDI",
      kaynak: "belge",
      kaynakId: belge.id,
      detay: belge.ad,
    });

    return NextResponse.json({ id: belge.id, ad: belge.ad });
  } catch {
    return NextResponse.json({ hata: "Yükleme başarısız." }, { status: 500 });
  }
}
