"use client";

import { useState, useTransition, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { uyapDurusmalariImportEt, type UyapDurusmaSatiri } from "@/lib/actions/durusma";
import { toast } from "sonner";
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2, ArrowRight, Link2Off } from "lucide-react";
import { read, utils } from "xlsx";

type Dosya = { id: string; esasNo: string | null; dosyaNo: string | null };
type Satir = Record<string, string>;

const KOLON_TAHMIN: Record<string, string> = {
  "esas no": "esasNo",
  "esas numarası": "esasNo",
  "dosya no": "esasNo",
  "dosya numarası": "esasNo",
  "dosya esas": "esasNo",
  "duruşma tarihi": "tarih",
  "durusma tarihi": "tarih",
  "tarih": "tarih",
  "duruşma saati": "saat",
  "durusma saati": "saat",
  "saat": "saat",
  "duruşma türü": "tur",
  "durusma turu": "tur",
  "tür": "tur",
  "salon": "yer",
  "salon no": "yer",
  "yer": "yer",
  "birim adı": "yer",
};

function tahminEt(baslik: string): string {
  const kucuk = baslik.toLowerCase().trim();
  for (const [anahtar, alan] of Object.entries(KOLON_TAHMIN)) {
    if (kucuk.includes(anahtar)) return alan;
  }
  return "atla";
}

const HEDEF_ALANLAR = [
  { value: "esasNo", label: "Esas / Dosya No *" },
  { value: "tarih", label: "Duruşma Tarihi *" },
  { value: "saat", label: "Saat" },
  { value: "tur", label: "Duruşma Türü" },
  { value: "yer", label: "Yer / Salon" },
  { value: "atla", label: "— Atla —" },
];

function normalizeEsasNo(s: string): string {
  return s.replace(/[^0-9/]/g, "").replace(/\/+/g, "/").trim();
}

function dosyaBul(esasNo: string, dosyalar: Dosya[]): Dosya | undefined {
  const norm = normalizeEsasNo(esasNo);
  if (!norm) return undefined;
  return dosyalar.find((d) => {
    const dNorm = normalizeEsasNo(d.esasNo ?? "");
    const dNorm2 = normalizeEsasNo(d.dosyaNo ?? "");
    return (dNorm && (dNorm.includes(norm) || norm.includes(dNorm))) ||
           (dNorm2 && (dNorm2.includes(norm) || norm.includes(dNorm2)));
  });
}

export function UyapDurusmaImportIstemci({ dosyalar }: { dosyalar: Dosya[] }) {
  const [adim, setAdim] = useState<"yukle" | "esle" | "onizle" | "tamam">("yukle");
  const [satirlar, setSatirlar] = useState<Satir[]>([]);
  const [kolonlar, setKolonlar] = useState<string[]>([]);
  const [esleme, setEsleme] = useState<Record<string, string>>({});
  const [sonuc, setSonuc] = useState<{ eklenen: number; atlanan: number; eslenmedi: number } | null>(null);
  const [pending, startTransition] = useTransition();

  const dosyaDusur = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) dosyaIsle(file);
  }, []);

  function dosyaIsle(file: File) {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = ev.target?.result;
      const wb = read(data, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json: Satir[] = utils.sheet_to_json(ws, { defval: "", raw: false });
      if (json.length === 0) { toast.error("Dosya boş veya okunamadı."); return; }
      const cols = Object.keys(json[0]);
      setKolonlar(cols);
      setSatirlar(json);
      const ilkEsleme: Record<string, string> = {};
      cols.forEach((k) => { ilkEsleme[k] = tahminEt(k); });
      setEsleme(ilkEsleme);
      setAdim("esle");
    };
    reader.readAsArrayBuffer(file);
  }

  function donustur(): UyapDurusmaSatiri[] {
    return satirlar.map((satir) => {
      const sonuc: Record<string, string> = {};
      Object.entries(esleme).forEach(([kaynak, hedef]) => {
        if (hedef && hedef !== "atla") sonuc[hedef] = String(satir[kaynak] ?? "");
      });
      return sonuc as UyapDurusmaSatiri;
    });
  }

  function handleImport() {
    const donusturulmus = donustur();
    const gecerli = donusturulmus.filter((r) => r.esasNo?.trim() && r.tarih?.trim());
    if (gecerli.length === 0) { toast.error("Aktarılabilecek satır yok. Esas No ve Tarih kolonlarını kontrol edin."); return; }
    startTransition(async () => {
      try {
        const res = await uyapDurusmalariImportEt(donusturulmus);
        setSonuc(res);
        setAdim("tamam");
        toast.success(`${res.eklenen} duruşma takvime eklendi.`);
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Hata oluştu.");
      }
    });
  }

  // Önizleme için eşlenme durumu
  const onizleSatirlari = donustur().slice(0, 20).map((r) => ({
    ...r,
    eslendi: !!r.esasNo && !!dosyaBul(r.esasNo, dosyalar),
  }));
  const toplamEslenen = donustur().filter((r) => r.esasNo && dosyaBul(r.esasNo, dosyalar)).length;

  return (
    <div className="space-y-6">
      {/* Adım göstergesi */}
      {adim !== "tamam" && (
        <div className="flex items-center gap-2 text-sm">
          {["Dosya Yükle", "Kolon Eşle", "Önizle & Aktar"].map((a, i) => {
            const aktif = ["yukle", "esle", "onizle"].indexOf(adim) >= i;
            return (
              <span key={a} className="flex items-center gap-2">
                {i > 0 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
                <span className={aktif ? "font-semibold text-primary" : "text-muted-foreground"}>{a}</span>
              </span>
            );
          })}
        </div>
      )}

      {/* Adım 1: Dosya yükle */}
      {adim === "yukle" && (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={dosyaDusur}
          className="border-2 border-dashed rounded-xl p-12 text-center cursor-pointer hover:border-primary transition-colors"
          onClick={() => document.getElementById("xl-durusma-input")?.click()}
        >
          <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="font-medium">UYAP duruşma listesini buraya sürükleyin</p>
          <p className="text-sm text-muted-foreground mt-1">
            UYAP &apos;Duruşmalarım&apos; menüsünden indirilen Excel (.xlsx, .xls, .csv)
          </p>
          <input
            id="xl-durusma-input"
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) dosyaIsle(f); }}
          />
        </div>
      )}

      {/* Adım 2: Kolon eşleme */}
      {adim === "esle" && (
        <div className="space-y-4">
          <div className="rounded-lg border bg-card p-4">
            <p className="text-sm font-medium mb-3">
              <Upload className="h-4 w-4 inline mr-1" />
              {satirlar.length} satır yüklendi. Her kolonu sistem alanıyla eşleyin:
            </p>
            <div className="space-y-2">
              {kolonlar.map((k) => (
                <div key={k} className="flex items-center gap-3">
                  <span className="w-52 text-sm text-muted-foreground truncate" title={k}>{k}</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  <Select
                    value={esleme[k] || "atla"}
                    onValueChange={(v) => setEsleme({ ...esleme, [k]: v ?? "atla" })}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {HEDEF_ALANLAR.map((h) => (
                        <SelectItem key={h.value} value={h.value}>{h.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              * Tarih formatı: GG.AA.YYYY &nbsp;|&nbsp; Saat formatı: SS:dd
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setAdim("yukle")}>Geri</Button>
            <Button onClick={() => setAdim("onizle")}>Önizlemeye Geç</Button>
          </div>
        </div>
      )}

      {/* Adım 3: Önizleme */}
      {adim === "onizle" && (
        <div className="space-y-4">
          {/* Özet */}
          <div className="flex gap-3 text-sm">
            <div className="flex items-center gap-1.5 text-green-700">
              <CheckCircle className="h-4 w-4" />
              {toplamEslenen} satır eşlendi
            </div>
            <div className="flex items-center gap-1.5 text-amber-600">
              <Link2Off className="h-4 w-4" />
              {satirlar.length - toplamEslenen} satır eşlenemedi (sistemde dosya yok)
            </div>
          </div>

          <div className="rounded-lg border bg-card overflow-auto max-h-72">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Esas No</TableHead>
                  <TableHead>Tarih</TableHead>
                  <TableHead>Saat</TableHead>
                  <TableHead>Tür</TableHead>
                  <TableHead>Yer</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {onizleSatirlari.map((r, i) => (
                  <TableRow key={i} className={!r.eslendi ? "opacity-50" : ""}>
                    <TableCell>
                      {r.eslendi
                        ? <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                        : <Link2Off className="h-3.5 w-3.5 text-amber-500" />
                      }
                    </TableCell>
                    <TableCell className="font-medium">{r.esasNo || "—"}</TableCell>
                    <TableCell>{r.tarih || "—"}</TableCell>
                    <TableCell>{r.saat || "—"}</TableCell>
                    <TableCell>{r.tur || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{r.yer || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {satirlar.length > 20 && (
            <p className="text-xs text-muted-foreground">
              İlk 20 satır gösteriliyor. Toplam {satirlar.length} satır işlenecek.
            </p>
          )}

          {toplamEslenen === 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              Hiçbir satır sistemdeki dosyalarla eşleşmedi. &quot;Esas No&quot; kolonunu doğru eşlediğinizden emin olun veya önce dosyaları sisteme aktarın.
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setAdim("esle")}>Geri</Button>
            <Button onClick={handleImport} disabled={pending || toplamEslenen === 0}>
              {pending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {toplamEslenen} Duruşmayı Aktar
            </Button>
          </div>
        </div>
      )}

      {/* Tamamlandı */}
      {adim === "tamam" && sonuc && (
        <div className="rounded-xl border bg-card p-8 text-center space-y-4">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
          <h2 className="text-xl font-semibold">İçe Aktarma Tamamlandı</h2>
          <div className="flex justify-center gap-6 text-sm flex-wrap">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle className="h-4 w-4" />
              {sonuc.eklenen} duruşma eklendi
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              {sonuc.atlanan} satır atlandı (mevcut/geçersiz)
            </div>
            <div className="flex items-center gap-2 text-amber-600">
              <Link2Off className="h-4 w-4" />
              {sonuc.eslenmedi} satır eşlenemedi
            </div>
          </div>
          <div className="flex justify-center gap-3 pt-2">
            <Button variant="outline" onClick={() => { setAdim("yukle"); setSatirlar([]); setSonuc(null); }}>
              Yeni İçe Aktarma
            </Button>
            <a
              href="/dashboard/takvim"
              className="inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-medium h-8 px-2.5 hover:bg-primary/80 transition-colors"
            >
              Takvime Git
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
