import { format, formatDistanceToNow, parseISO } from "date-fns";
import { tr } from "date-fns/locale";

export const TZ = "Europe/Istanbul";

export function formatTR(date: Date | string, pattern = "dd.MM.yyyy") {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, pattern, { locale: tr });
}

export function formatDateTimeTR(date: Date | string) {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "dd.MM.yyyy HH:mm", { locale: tr });
}

export function relativeTimeTR(date: Date | string) {
  const d = typeof date === "string" ? parseISO(date) : date;
  return formatDistanceToNow(d, { addSuffix: true, locale: tr });
}

// Adli tatil: 20 Temmuz – 31 Ağustos
export function isAdliTatil(date: Date): boolean {
  const ay = date.getMonth(); // 0-indexed
  const gun = date.getDate();
  return (ay === 6 && gun >= 20) || ay === 7;
}
