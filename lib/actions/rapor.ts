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

export async function patronRaporGetir() {
  await patronKontrol();

  const simdi = new Date();
  // Son 12 ayın başlangıcı
  const onIkiAyOnce = new Date(simdi.getFullYear(), simdi.getMonth() - 11, 1);

  const [
    tumOdemeler,
    aylikOdemeler,
    avukatlar,
    dosyaDurumlari,
    toplamMuvekkil,
    sonOdemeler,
  ] = await Promise.all([
    // Tüm zamanlar finansal özet
    prisma.odeme.findMany({ select: { tur: true, tutar: true, durum: true } }),

    // Son 12 ayın ödemeleri — aylık gruplama için
    prisma.odeme.findMany({
      where: { tarih: { gte: onIkiAyOnce }, durum: "ODENDI" },
      select: { tarih: true, tutar: true, tur: true },
      orderBy: { tarih: "asc" },
    }),

    // Avukat performansı
    prisma.user.findMany({
      where: { aktif: true, rol: { in: ["PATRON", "AVUKAT"] } },
      select: {
        id: true,
        ad: true,
        rol: true,
        dosyalar: {
          select: {
            durum: true,
            odemeler: { select: { tutar: true, durum: true, tur: true } },
          },
        },
        gorevler: { where: { durum: "TAMAMLANDI" }, select: { id: true } },
      },
      orderBy: { ad: "asc" },
    }),

    // Dosya durum sayıları
    Promise.all([
      prisma.dosya.count({ where: { durum: "ACIK" } }),
      prisma.dosya.count({ where: { durum: "DERDEST" } }),
      prisma.dosya.count({ where: { durum: "KARAR" } }),
      prisma.dosya.count({ where: { durum: "TEMYIZ" } }),
      prisma.dosya.count({ where: { durum: "KAPALI" } }),
    ]),

    prisma.muvekkil.count(),

    // Son ödemeler
    prisma.odeme.findMany({
      take: 10,
      orderBy: { tarih: "desc" },
      select: {
        id: true,
        tur: true,
        tutar: true,
        durum: true,
        tarih: true,
        aciklama: true,
        dosya: {
          select: {
            id: true,
            esasNo: true,
            dosyaNo: true,
            muvekkil: { select: { ad: true } },
          },
        },
      },
    }),
  ]);

  // ── Finansal özet ──────────────────────────────────────────────
  const topla = (tur?: string, durum?: string) =>
    tumOdemeler
      .filter((o) => (!tur || o.tur === tur) && (!durum || o.durum === durum))
      .reduce((s, o) => s + Number(o.tutar), 0);

  const finansOzeti = {
    toplamGelir: topla("VEKALET_UCRETI") + topla("TAHSILAT"),
    tahsilEdilen: topla("VEKALET_UCRETI", "ODENDI") + topla("TAHSILAT", "ODENDI"),
    bekleyenTahsilat: topla("VEKALET_UCRETI", "BEKLIYOR") + topla("VEKALET_UCRETI", "KISMI_ODENDI"),
    toplamMasraf: topla("MASRAF"),
    toplamAvans: topla("AVANS"),
  };

  // ── Aylık gelir (son 12 ay) ─────────────────────────────────────
  const aylikGelir: { ay: string; yil: number; ay_no: number; tutar: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(simdi.getFullYear(), simdi.getMonth() - i, 1);
    const sonraki = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const ay_no = d.getMonth();
    const yil = d.getFullYear();
    const ay = d.toLocaleDateString("tr-TR", { month: "short" });
    const tutar = aylikOdemeler
      .filter((o) => {
        const t = new Date(o.tarih);
        return t >= d && t < sonraki;
      })
      .reduce((s, o) => s + Number(o.tutar), 0);
    aylikGelir.push({ ay, yil, ay_no, tutar });
  }

  // ── Avukat performansı ─────────────────────────────────────────
  const avukatPerformans = avukatlar.map((a) => {
    const toplamDosya = a.dosyalar.length;
    const acikDosya = a.dosyalar.filter((d) => d.durum !== "KAPALI").length;
    const kapaliDosya = a.dosyalar.filter((d) => d.durum === "KAPALI").length;
    const tamamlananGorev = a.gorevler.length;
    const gelir = a.dosyalar
      .flatMap((d) => d.odemeler)
      .filter((o) => o.durum === "ODENDI" && (o.tur === "VEKALET_UCRETI" || o.tur === "TAHSILAT"))
      .reduce((s, o) => s + Number(o.tutar), 0);
    return { id: a.id, ad: a.ad, rol: a.rol, toplamDosya, acikDosya, kapaliDosya, tamamlananGorev, gelir };
  });

  // ── Dosya durum dağılımı ────────────────────────────────────────
  const [acik, derdest, karar, temyiz, kapali] = dosyaDurumlari;
  const toplamDosya = acik + derdest + karar + temyiz + kapali;
  const dosyaDagilimi = [
    { durum: "Açık", sayi: acik, renk: "bg-emerald-500" },
    { durum: "Derdest", sayi: derdest, renk: "bg-blue-500" },
    { durum: "Karar", sayi: karar, renk: "bg-amber-500" },
    { durum: "Temyiz", sayi: temyiz, renk: "bg-orange-500" },
    { durum: "Kapalı", sayi: kapali, renk: "bg-gray-400" },
  ];

  return {
    finansOzeti,
    aylikGelir,
    avukatPerformans,
    dosyaDagilimi,
    toplamDosya,
    toplamMuvekkil,
    sonOdemeler: sonOdemeler.map((o) => ({ ...o, tutar: Number(o.tutar) })),
  };
}
