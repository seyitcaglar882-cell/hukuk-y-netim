import { kullanicilariGetir } from "@/lib/actions/kullanici";
import { KullaniciTablosu } from "./kullanici-tablosu";

export default async function KullanicilarPage() {
  const kullanicilar = await kullanicilariGetir();
  return <KullaniciTablosu kullanicilar={kullanicilar} />;
}
