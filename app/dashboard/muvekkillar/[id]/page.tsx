import { notFound } from "next/navigation";
import { muvekkiliProfilGetir } from "@/lib/actions/muvekkil";
import { MuvekkılProfil } from "./muvekkil-profil";

export default async function MuvekkılProfilPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const muvekkil = await muvekkiliProfilGetir(id);
  if (!muvekkil) notFound();
  return <MuvekkılProfil muvekkil={muvekkil} />;
}
