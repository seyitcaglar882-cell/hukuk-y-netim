import { durusmalariGetir } from "@/lib/actions/durusma";
import { gorevleriGetir } from "@/lib/actions/gorev";
import { dosyalariGetir } from "@/lib/actions/dosya";
import { prisma } from "@/lib/prisma";
import { TakvimIstemci } from "./takvim-istemci";

export default async function TakvimPage() {
  const [durusmalar, gorevler, dosyalar, avukatlar] = await Promise.all([
    durusmalariGetir(),
    gorevleriGetir(),
    dosyalariGetir({ durum: undefined }),
    prisma.user.findMany({
      where: { aktif: true, rol: { in: ["PATRON", "AVUKAT"] } },
      select: { id: true, ad: true },
      orderBy: { ad: "asc" },
    }),
  ]);

  return (
    <TakvimIstemci
      durusmalar={durusmalar}
      gorevler={gorevler}
      dosyalar={dosyalar}
      avukatlar={avukatlar}
    />
  );
}
