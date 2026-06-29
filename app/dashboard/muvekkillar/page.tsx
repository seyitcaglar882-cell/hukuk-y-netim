import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { muvekkilleriGetir, mtPrefiksAvukatlariGetir } from "@/lib/actions/muvekkil";
import { MuvekkillerIstemci } from "./muvekkillar-istemci";

export default async function MuvekkillerPage() {
  const [session, aktifler, pasifler, mtPrefiksAvukatlar] = await Promise.all([
    getServerSession(authOptions),
    muvekkilleriGetir({ aktif: true }),
    muvekkilleriGetir({ aktif: false }),
    mtPrefiksAvukatlariGetir(),
  ]);

  const userId = session?.user?.id ?? "";
  const userRol = session?.user?.rol ?? "AVUKAT";

  // Sadece MT kullanıcılar (kendin hariç) — checkbox için
  const mtAvukatlar = mtPrefiksAvukatlar.filter((a) => a.id !== userId);

  return (
    <MuvekkillerIstemci
      aktifler={aktifler}
      pasifler={pasifler}
      userRol={userRol}
      mtAvukatlar={mtAvukatlar}
    />
  );
}
