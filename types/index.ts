export type Role = "PATRON" | "AVUKAT" | "SEKRETER";

export type DosyaTipi = "DANISMANLIK" | "DAVA";

export type DosyaDurumu = "DERDEST" | "KARAR" | "TEMYIZ" | "KAPALI";

export type OdemeTipi = "AVANS" | "TAHSILAT";

export type GorevDurumu = "BEKLIYOR" | "TAMAMLANDI";

export interface NavItem {
  title: string;
  href: string;
  icon?: string;
  roles?: Role[];
}
