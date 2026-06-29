import { notFound } from "next/navigation";
import { dosyayiGetir } from "@/lib/actions/dosya";
import { muvekkilleriGetir } from "@/lib/actions/muvekkil";
import { durusmalariGetir } from "@/lib/actions/durusma";
import { gorevleriGetir } from "@/lib/actions/gorev";
import { odemeleriGetir } from "@/lib/actions/odeme";
import { belgeleriGetir } from "@/lib/actions/belge";
import { prisma } from "@/lib/prisma";
import { DosyaDetayIstemci } from "./dosya-detay-istemci";

export default async function DosyaDetayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [dosya, muvekkillar, avukatlar, durusmalar, gorevler, odemeler, belgeler] = await Promise.all([
    dosyayiGetir(id),
    muvekkilleriGetir(),
    prisma.user.findMany({
      where: { aktif: true, rol: { in: ["PATRON", "AVUKAT"] } },
      select: { id: true, ad: true },
      orderBy: { ad: "asc" },
    }),
    durusmalariGetir({ dosyaId: id }),
    gorevleriGetir({ dosyaId: id }),
    odemeleriGetir(id),
    belgeleriGetir(id),
  ]);

  if (!dosya) notFound();

  return (
    <DosyaDetayIstemci
      dosya={dosya}
      muvekkillar={muvekkillar}
      avukatlar={avukatlar}
      durusmalar={durusmalar}
      gorevler={gorevler}
      odemeler={odemeler.map((o) => ({ ...o, tutar: Number(o.tutar) }))}
      belgeler={belgeler}
    />
  );
}
