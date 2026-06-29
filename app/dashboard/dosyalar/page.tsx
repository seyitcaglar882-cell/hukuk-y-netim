import { dosyalariGetir } from "@/lib/actions/dosya";
import { muvekkilleriGetir } from "@/lib/actions/muvekkil";
import { DosyalarIstemci } from "./dosyalar-istemci";

export default async function DosyalarPage() {
  const [aktifDosyalar, kapaliDosyalar, muvekkillar] = await Promise.all([
    dosyalariGetir(),
    dosyalariGetir({ sadecePasif: true }),
    muvekkilleriGetir(),
  ]);

  return (
    <DosyalarIstemci
      aktifDosyalar={aktifDosyalar}
      kapaliDosyalar={kapaliDosyalar}
      muvekkillar={muvekkillar}
    />
  );
}
