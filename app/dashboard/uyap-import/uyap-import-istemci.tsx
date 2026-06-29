"use client";

import { useState, useTransition, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { uyapDosyalariImportEt } from "@/lib/actions/dosya";
import { toast } from "sonner";
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2, ArrowRight } from "lucide-react";
import { MuvekkılTip } from "@prisma/client";
import { read, utils } from "xlsx";

type Muvekkil = { id: string; ad: string; tip: MuvekkılTip };
type Avukat = { id: string; ad: string };

type Satir = Record<string, string>;

// UYAP Excel kolon tahmin eşlemesi
const KOLON_TAHMIN: Record<string, string> = {
  "esas no": "esasNo",
  "esas numarası": "esasNo",
  "dosya no": "esasNo",
  "mahkeme": "mahkeme",
  "birim": "mahkeme",
  "yargı birimi": "mahkeme",
  "taraf": "muvekkılAd",
  "taraflar": "muvekkılAd",
  "durum": "durum",
  "açılış tarihi": "acilisTarihi",
  "açılma tarihi": "acilisTarihi",
  "tarih": "acilisTarihi",
};

function tahminEt(baslik: string): string {
  const kucuk = baslik.toLowerCase().trim();
  for (const [anahtar, alan] of Object.entries(KOLON_TAHMIN)) {
    if (kucuk.includes(anahtar)) return alan;
  }
  return "";
}

const HEDEF_ALANLAR = [
  { value: "esasNo", label: "Esas No" },
  { value: "mahkeme", label: "Mahkeme / Birim" },
  { value: "muvekkılAd", label: "Taraf Adı" },
  { value: "durum", label: "Durum" },
  { value: "acilisTarihi", label: "Açılış Tarihi" },
  { value: "atla", label: "— Atla —" },
];

export function UyapImportIstemci({ muvekkillar, avukatlar }: { muvekkillar: Muvekkil[]; avukatlar: Avukat[] }) {
  const [adim, setAdim] = useState<"yukle" | "esle" | "onizle" | "tamam">("yukle");
  const [satirlar, setSatirlar] = useState<Satir[]>([]);
  const [kolonlar, setKolonlar] = useState<string[]>([]);
  const [esleme, setEsleme] = useState<Record<string, string>>({});
  const [muvekkılId, setMuvekkılId] = useState("");
  const [avukatId, setAvukatId] = useState("");
  const [sonuc, setSonuc] = useState<{ eklenen: number; atlanan: number } | null>(null);
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
      const json: Satir[] = utils.sheet_to_json(ws, { defval: "" });
      if (json.length === 0) { toast.error("Dosya boş veya okunamadı."); return; }
      const cols = Object.keys(json[0]);
      setKolonlar(cols);
      setSatirlar(json);
      // Otomatik tahmin
      const ilkEsleme: Record<string, string> = {};
      cols.forEach((k) => { ilkEsleme[k] = tahminEt(k); });
      setEsleme(ilkEsleme);
      setAdim("esle");
    };
    reader.readAsArrayBuffer(file);
  }

  function donustur(): { esasNo: string; mahkeme?: string; muvekkılAd?: string; durum?: string; acilisTarihi?: string }[] {
    return satirlar.map((satir) => {
      const sonuc: Record<string, string> = {};
      Object.entries(esleme).forEach(([kaynak, hedef]) => {
        if (hedef && hedef !== "atla") sonuc[hedef] = String(satir[kaynak] ?? "");
      });
      return sonuc as { esasNo: string; mahkeme?: string; muvekkılAd?: string; durum?: string; acilisTarihi?: string };
    });
  }

  function handleImport() {
    if (!muvekkılId) { toast.error("Müvekkil seçiniz."); return; }
    const donusturulmus = donustur();
    startTransition(async () => {
      try {
        const res = await uyapDosyalariImportEt(donusturulmus, muvekkılId, avukatId || undefined);
        setSonuc(res);
        setAdim("tamam");
        toast.success(`${res.eklenen} dosya aktarıldı.`);
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Hata oluştu.");
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Adım göstergesi */}
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

      {/* Adım 1: Dosya yükle */}
      {adim === "yukle" && (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={dosyaDusur}
          className="border-2 border-dashed rounded-xl p-12 text-center cursor-pointer hover:border-primary transition-colors"
          onClick={() => document.getElementById("xl-input")?.click()}
        >
          <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="font-medium">Excel dosyasını buraya sürükleyin</p>
          <p className="text-sm text-muted-foreground mt-1">veya tıklayarak seçin (.xlsx, .xls, .csv)</p>
          <input
            id="xl-input"
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
              {satirlar.length} satır yüklendi. Her kolonu ilgili sistem alanıyla eşleyin:
            </p>
            <div className="space-y-2">
              {kolonlar.map((k) => (
                <div key={k} className="flex items-center gap-3">
                  <span className="w-48 text-sm text-muted-foreground truncate" title={k}>{k}</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  <Select value={esleme[k] || "atla"} onValueChange={(v) => setEsleme({ ...esleme, [k]: v ?? "atla" })}>
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
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setAdim("yukle")}>Geri</Button>
            <Button onClick={() => setAdim("onizle")}>Önizlemeye Geç</Button>
          </div>
        </div>
      )}

      {/* Adım 3: Önizleme & aktar */}
      {adim === "onizle" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Müvekkil *</label>
              <Select value={muvekkılId} onValueChange={(v) => setMuvekkılId(v ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Müvekkil seçin">
                    {muvekkılId ? muvekkillar.find(m => m.id === muvekkılId)?.ad : undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {muvekkillar.map((m) => <SelectItem key={m.id} value={m.id}>{m.ad}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Atanan Avukat</label>
              <Select value={avukatId || "none"} onValueChange={(v) => setAvukatId(v === "none" || !v ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="— Seçilmedi —">
                    {avukatId ? avukatlar.find(a => a.id === avukatId)?.ad : undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Seçilmedi —</SelectItem>
                  {avukatlar.map((a) => <SelectItem key={a.id} value={a.id}>{a.ad}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-lg border bg-card overflow-auto max-h-72">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Esas No</TableHead>
                  <TableHead>Mahkeme</TableHead>
                  <TableHead>Açılış Tarihi</TableHead>
                  <TableHead>Durum</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {donustur().slice(0, 20).map((d, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{d.esasNo || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{d.mahkeme || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{d.acilisTarihi || "—"}</TableCell>
                    <TableCell><Badge variant="outline">{d.durum || "Derdest"}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {satirlar.length > 20 && (
            <p className="text-xs text-muted-foreground">İlk 20 satır gösteriliyor. Toplam {satirlar.length} satır aktarılacak.</p>
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setAdim("esle")}>Geri</Button>
            <Button onClick={handleImport} disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {satirlar.length} Dosyayı Aktar
            </Button>
          </div>
        </div>
      )}

      {/* Tamamlandı */}
      {adim === "tamam" && sonuc && (
        <div className="rounded-xl border bg-card p-8 text-center space-y-4">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
          <h2 className="text-xl font-semibold">İçe Aktarma Tamamlandı</h2>
          <div className="flex justify-center gap-6 text-sm">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle className="h-4 w-4" />
              <span>{sonuc.eklenen} dosya eklendi</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              <span>{sonuc.atlanan} satır atlandı (mevcut/boş)</span>
            </div>
          </div>
          <div className="flex justify-center gap-3 pt-2">
            <Button variant="outline" onClick={() => { setAdim("yukle"); setSatirlar([]); setSonuc(null); }}>
              Yeni İçe Aktarma
            </Button>
            <a href="/dashboard/dosyalar" className="inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-medium h-8 px-2.5 hover:bg-primary/80 transition-colors">
              Dosyalara Git
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
