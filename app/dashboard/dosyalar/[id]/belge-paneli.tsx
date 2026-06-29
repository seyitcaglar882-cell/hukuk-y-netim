"use client";

import { useState, useTransition, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { belgeSil } from "@/lib/actions/belge";
import { toast } from "sonner";
import {
  FolderOpen, Upload, Trash2, Download, Eye, FileText,
  FileSpreadsheet, Image, File, Loader2, Plus,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { BelgeTur } from "@prisma/client";
import { cn } from "@/lib/utils";
import { BelgeOnizleme } from "@/components/belge-onizleme";

const NAVY = "#1e3a5f";

const TUR_ETIKET: Record<BelgeTur, string> = {
  VEKALETNAME: "Vekaletname",
  DILEKCE: "Dilekçe",
  SOZLESME: "Sözleşme",
  KARAR: "Mahkeme Kararı",
  TUTANAK: "Tutanak",
  MAKBUZ: "Makbuz",
  DIGER: "Diğer",
};

const TUR_RENK: Record<BelgeTur, string> = {
  VEKALETNAME: "bg-purple-50 text-purple-700 border-purple-200",
  DILEKCE: "bg-blue-50 text-blue-700 border-blue-200",
  SOZLESME: "bg-emerald-50 text-emerald-700 border-emerald-200",
  KARAR: "bg-amber-50 text-amber-700 border-amber-200",
  TUTANAK: "bg-orange-50 text-orange-700 border-orange-200",
  MAKBUZ: "bg-teal-50 text-teal-700 border-teal-200",
  DIGER: "bg-gray-50 text-gray-600 border-gray-200",
};

type Belge = {
  id: string;
  ad: string;
  boyut: number;
  mimeTipi: string;
  tur: BelgeTur;
  aciklama: string | null;
  yuklendi: Date | string;
};

function boyutFormatla(bayt: number): string {
  if (bayt < 1024) return `${bayt} B`;
  if (bayt < 1024 * 1024) return `${(bayt / 1024).toFixed(1)} KB`;
  return `${(bayt / (1024 * 1024)).toFixed(1)} MB`;
}

function dosyaIkonu(mime: string) {
  if (mime === "application/pdf") return <FileText className="h-4 w-4 text-red-500" />;
  if (mime.includes("spreadsheet") || mime.includes("excel")) return <FileSpreadsheet className="h-4 w-4 text-green-600" />;
  if (mime.startsWith("image/")) return <Image className="h-4 w-4 text-blue-500" />;
  if (mime.includes("word")) return <FileText className="h-4 w-4 text-blue-600" />;
  return <File className="h-4 w-4 text-muted-foreground" />;
}

const ONIZLENEBILIR = [
  "application/pdf",
  "image/jpeg", "image/png", "image/webp",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export function BelgePaneli({ dosyaId, belgeler: baslangicBelgeler }: { dosyaId: string; belgeler: Belge[] }) {
  const router = useRouter();
  const [belgeler, setBelgeler] = useState<Belge[]>(baslangicBelgeler);
  const [yukleAcik, setYukleAcik] = useState(false);
  const [onizlenen, setOnizlenen] = useState<Belge | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSil(id: string) {
    if (!confirm("Bu belgeyi silmek istediğinize emin misiniz?")) return;
    startTransition(async () => {
      try {
        await belgeSil(id);
        setBelgeler((prev) => prev.filter((b) => b.id !== id));
        toast.success("Belge silindi.");
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Hata.");
      }
    });
  }

  function handleYuklendi(yeni: Belge) {
    setBelgeler((prev) => [yeni, ...prev]);
    setYukleAcik(false);
    router.refresh();
  }

  return (
    <div className="rounded-xl overflow-hidden shadow-md">
      <div className="flex items-center justify-between px-5 py-3.5" style={{ backgroundColor: NAVY }}>
        <div className="flex items-center gap-2">
          <FolderOpen className="h-4 w-4" style={{ color: "rgba(255,255,255,0.55)" }} />
          <span className="text-sm font-semibold text-white">Belge Arşivi</span>
          <span className="text-xs" style={{ color: "rgba(255,255,255,0.40)" }}>{belgeler.length}</span>
        </div>
        <button
          onClick={() => setYukleAcik(true)}
          className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-colors"
          style={{ backgroundColor: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.20)" }}
        >
          <Plus className="h-3.5 w-3.5" />Belge Ekle
        </button>
      </div>

      {belgeler.length === 0 ? (
        <div className="bg-card flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
            <FolderOpen className="h-7 w-7 opacity-30" />
          </div>
          <div className="text-center">
            <p className="font-medium text-sm">Henüz belge yüklenmedi</p>
            <p className="text-xs mt-0.5">Vekaletname, dilekçe, sözleşme vb. dosyaları yükleyin</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => setYukleAcik(true)}>
            <Upload className="h-4 w-4 mr-1.5" />İlk Belgeyi Yükle
          </Button>
        </div>
      ) : (
        <div className="bg-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="text-[11px] font-bold uppercase tracking-wider text-foreground/50 w-8"></TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-wider text-foreground/50">Ad</TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-wider text-foreground/50">Tür</TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-wider text-foreground/50">Boyut</TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-wider text-foreground/50">Yüklendi</TableHead>
                <TableHead className="text-right text-[11px] font-bold uppercase tracking-wider text-foreground/50">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {belgeler.map((b) => (
                <TableRow key={b.id} className="hover:bg-blue-50/40">
                  <TableCell>{dosyaIkonu(b.mimeTipi)}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{b.ad}</p>
                      {b.aciklama && <p className="text-xs text-muted-foreground truncate max-w-[200px]">{b.aciklama}</p>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium", TUR_RENK[b.tur])}>
                      {TUR_ETIKET[b.tur]}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{boyutFormatla(b.boyut)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(b.yuklendi).toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" })}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {ONIZLENEBILIR.includes(b.mimeTipi) && (
                        <Button
                          variant="ghost" size="sm"
                          className="h-8 w-8 p-0"
                          title="Önizle"
                          onClick={() => setOnizlenen(b)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <a href={`/api/belgeler/${b.id}`} download>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="İndir">
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                      </a>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        disabled={pending}
                        onClick={() => handleSil(b.id)}
                        title="Sil"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <BelgeYukleDialog
        open={yukleAcik}
        onClose={() => setYukleAcik(false)}
        dosyaId={dosyaId}
        onYuklendi={handleYuklendi}
      />

      <BelgeOnizleme belge={onizlenen} onClose={() => setOnizlenen(null)} />
    </div>
  );
}

function BelgeYukleDialog({
  open, onClose, dosyaId, onYuklendi,
}: {
  open: boolean;
  onClose: () => void;
  dosyaId: string;
  onYuklendi: (belge: Belge) => void;
}) {
  const [yukleniyor, setYukleniyor] = useState(false);
  const [seciliDosya, setSeciliDosya] = useState<File | null>(null);
  const [surukleme, setSurukleme] = useState(false);
  const [form, setForm] = useState({ ad: "", tur: "DIGER" as BelgeTur, aciklama: "" });
  const inputRef = useRef<HTMLInputElement>(null);

  const secilenDosyayiAyarla = useCallback((file: File) => {
    setSeciliDosya(file);
    if (!form.ad) setForm((f) => ({ ...f, ad: file.name.replace(/\.[^.]+$/, "") }));
  }, [form.ad]);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setSurukleme(false);
    const file = e.dataTransfer.files[0];
    if (file) secilenDosyayiAyarla(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!seciliDosya) { toast.error("Lütfen bir dosya seçin."); return; }

    setYukleniyor(true);
    try {
      const fd = new FormData();
      fd.append("dosya", seciliDosya);
      fd.append("dosyaId", dosyaId);
      fd.append("tur", form.tur);
      fd.append("aciklama", form.aciklama);
      fd.append("ad", form.ad || seciliDosya.name);

      const res = await fetch("/api/belgeler/upload", { method: "POST", body: fd });
      const json = await res.json();

      if (!res.ok) { toast.error(json.hata ?? "Yükleme başarısız."); return; }

      toast.success("Belge yüklendi.");
      onYuklendi({
        id: json.id,
        ad: form.ad || seciliDosya.name,
        boyut: seciliDosya.size,
        mimeTipi: seciliDosya.type,
        tur: form.tur,
        aciklama: form.aciklama || null,
        yuklendi: new Date().toISOString(),
      });
      setSeciliDosya(null);
      setForm({ ad: "", tur: "DIGER", aciklama: "" });
    } catch {
      toast.error("Yükleme sırasında hata oluştu.");
    } finally {
      setYukleniyor(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={() => !yukleniyor && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Belge Yükle</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 pt-2">

          {/* Sürükle-bırak alanı */}
          <div
            onDragOver={(e) => { e.preventDefault(); setSurukleme(true); }}
            onDragLeave={() => setSurukleme(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
              surukleme ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
              seciliDosya && "border-green-400 bg-green-50"
            )}
          >
            {seciliDosya ? (
              <div className="flex items-center justify-center gap-2 text-green-700">
                {dosyaIkonu(seciliDosya.type)}
                <div className="text-left">
                  <p className="text-sm font-medium truncate max-w-[260px]">{seciliDosya.name}</p>
                  <p className="text-xs text-muted-foreground">{boyutFormatla(seciliDosya.size)}</p>
                </div>
              </div>
            ) : (
              <div className="text-muted-foreground">
                <Upload className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm font-medium">Dosyayı buraya sürükleyin</p>
                <p className="text-xs mt-0.5">veya seçmek için tıklayın — PDF, Word, Excel, görsel (max 20 MB)</p>
              </div>
            )}
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp,.txt"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) secilenDosyayiAyarla(f); }}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Belge Adı</label>
            <Input
              value={form.ad}
              onChange={(e) => setForm({ ...form, ad: e.target.value })}
              disabled={yukleniyor}
              placeholder="Vekaletname - İstanbul 2024..."
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Tür</label>
            <Select value={form.tur} onValueChange={(v) => setForm({ ...form, tur: v as BelgeTur })} disabled={yukleniyor}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.entries(TUR_ETIKET) as [BelgeTur, string][]).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Açıklama (opsiyonel)</label>
            <Input
              value={form.aciklama}
              onChange={(e) => setForm({ ...form, aciklama: e.target.value })}
              disabled={yukleniyor}
              placeholder="Kısa açıklama..."
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={yukleniyor}>İptal</Button>
            <Button type="submit" disabled={yukleniyor || !seciliDosya}>
              {yukleniyor && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Yükle
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
