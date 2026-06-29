import { filtreSececenekleriGetir } from "@/lib/actions/belge";
import { BelgelerIstemci } from "./belgeler-istemci";

export default async function BelgelerPage() {
  const { muvekkillar, dosyalar } = await filtreSececenekleriGetir();
  return <BelgelerIstemci muvekkillar={muvekkillar} dosyalar={dosyalar} />;
}
