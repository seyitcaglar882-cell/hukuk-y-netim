import { muvekkilleriGetir } from "@/lib/actions/muvekkil";
import { dosyalariGetir } from "@/lib/actions/dosya";
import { prisma } from "@/lib/prisma";
import { UyapImportIstemci } from "./uyap-import-istemci";
import { UyapDurusmaImportIstemci } from "./uyap-durusma-import-istemci";

export default async function UyapImportPage({
  searchParams,
}: {
  searchParams: Promise<{ sekme?: string }>;
}) {
  const { sekme } = await searchParams;
  const aktifSekme = sekme === "durusma" ? "durusma" : "dosya";

  const [muvekkillar, avukatlar, dosyalar] = await Promise.all([
    muvekkilleriGetir(),
    prisma.user.findMany({
      where: { aktif: true, rol: { in: ["PATRON", "AVUKAT"] } },
      select: { id: true, ad: true },
      orderBy: { ad: "asc" },
    }),
    dosyalariGetir({ durum: undefined }),
  ]);

  const dosyaListesi = dosyalar.map((d) => ({
    id: d.id,
    esasNo: d.esasNo,
    dosyaNo: d.dosyaNo,
  }));

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">UYAP İçe Aktarma</h1>
        <p className="text-muted-foreground text-sm mt-1">
          UYAP&apos;tan indirdiğiniz Excel dosyalarını sisteme aktarın.
        </p>
      </div>

      {/* Sekme seçici */}
      <div className="flex gap-1 rounded-lg bg-muted p-1 w-fit">
        <a
          href="/dashboard/uyap-import?sekme=dosya"
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            aktifSekme === "dosya"
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Dosya Aktarma
        </a>
        <a
          href="/dashboard/uyap-import?sekme=durusma"
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            aktifSekme === "durusma"
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Duruşma Aktarma
        </a>
      </div>

      {aktifSekme === "dosya" ? (
        <UyapImportIstemci muvekkillar={muvekkillar} avukatlar={avukatlar} />
      ) : (
        <UyapDurusmaImportIstemci dosyalar={dosyaListesi} />
      )}
    </div>
  );
}
