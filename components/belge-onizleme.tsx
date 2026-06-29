"use client";

import { useState, useEffect, useRef } from "react";
import { X, ZoomIn, ZoomOut, Download, Printer, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export type BelgeOnizlemeTip = {
  id: string;
  ad: string;
  mimeTipi: string;
};

type Props = {
  belge: BelgeOnizlemeTip | null;
  onClose: () => void;
};

const ZOOM_STEP = 0.25;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 3;

export function BelgeOnizleme({ belge, onClose }: Props) {
  const [zoom, setZoom] = useState(1);
  const [textIcerik, setTextIcerik] = useState<string | null>(null);
  const [wordHtml, setWordHtml] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    setZoom(1);
    setTextIcerik(null);
    setWordHtml(null);
    setHata(null);
    if (!belge) return;

    const inlineUrl = `/api/belgeler/${belge.id}?inline=1`;

    if (belge.mimeTipi === "text/plain") {
      setYukleniyor(true);
      fetch(inlineUrl)
        .then((r) => r.text())
        .then((t) => { setTextIcerik(t); setYukleniyor(false); })
        .catch(() => { setHata("Belge yüklenemedi."); setYukleniyor(false); });
      return;
    }

    if (belge.mimeTipi === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      setYukleniyor(true);
      fetch(inlineUrl)
        .then((r) => r.arrayBuffer())
        .then(async (buf) => {
          const mammoth = await import("mammoth");
          const result = await mammoth.convertToHtml({ arrayBuffer: buf });
          setWordHtml(result.value);
          setYukleniyor(false);
        })
        .catch(() => { setHata("Word belgesi önizlenemiyor."); setYukleniyor(false); });
    }
  }, [belge?.id]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  if (!belge) return null;

  const inlineUrl = `/api/belgeler/${belge.id}?inline=1`;
  const downloadUrl = `/api/belgeler/${belge.id}`;
  const isPdf = belge.mimeTipi === "application/pdf";
  const isImage = belge.mimeTipi.startsWith("image/");
  const isText = belge.mimeTipi === "text/plain";
  const isWord = belge.mimeTipi === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

  function zoomIn() { setZoom(z => Math.min(+(z + ZOOM_STEP).toFixed(2), ZOOM_MAX)); }
  function zoomOut() { setZoom(z => Math.max(+(z - ZOOM_STEP).toFixed(2), ZOOM_MIN)); }

  function handlePrint() {
    if (isPdf && iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.print();
    } else {
      const w = window.open(inlineUrl, "_blank");
      if (w) w.onload = () => w.print();
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex bg-black/75 p-4"
      onClick={onClose}
    >
      <div
        className="flex flex-col w-full max-w-4xl mx-auto rounded-xl overflow-hidden shadow-2xl bg-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Toolbar */}
        <div className="flex items-center gap-3 px-4 py-2.5 border-b bg-gray-50 shrink-0">
          <p className="text-sm font-semibold flex-1 truncate text-gray-800">{belge.ad}</p>

          {isImage && (
            <div className="flex items-center bg-white border rounded-lg overflow-hidden shrink-0">
              <Button
                variant="ghost" size="sm"
                className="h-8 w-8 p-0 rounded-none hover:bg-gray-100"
                onClick={zoomOut}
                disabled={zoom <= ZOOM_MIN}
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </Button>
              <span className="text-xs text-gray-600 w-12 text-center font-mono select-none border-x py-1">
                {Math.round(zoom * 100)}%
              </span>
              <Button
                variant="ghost" size="sm"
                className="h-8 w-8 p-0 rounded-none hover:bg-gray-100"
                onClick={zoomIn}
                disabled={zoom >= ZOOM_MAX}
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              variant="outline" size="sm"
              className="h-8 gap-1.5 px-3 text-xs"
              onClick={handlePrint}
            >
              <Printer className="h-3.5 w-3.5" />
              Yazdır
            </Button>
            <a href={downloadUrl} download>
              <Button variant="outline" size="sm" className="h-8 gap-1.5 px-3 text-xs">
                <Download className="h-3.5 w-3.5" />
                İndir
              </Button>
            </a>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Yükleniyor */}
        {yukleniyor && (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        )}

        {/* Hata */}
        {hata && !yukleniyor && (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <p className="text-sm text-muted-foreground">{hata}</p>
          </div>
        )}

        {/* PDF */}
        {isPdf && (
          <div className="flex-1 overflow-hidden">
            <iframe
              ref={iframeRef}
              src={inlineUrl}
              style={{ width: "100%", height: "100%", border: "none" }}
            />
          </div>
        )}

        {/* Görsel */}
        {isImage && (
          <div className="flex-1 overflow-auto bg-gray-200">
            <div className="flex justify-center p-6">
              <img
                src={inlineUrl}
                alt={belge.ad}
                className="rounded-lg shadow-xl block"
                style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: "top center",
                  maxWidth: "none",
                  transition: "transform 0.15s ease",
                }}
              />
            </div>
          </div>
        )}

        {/* Düz metin (.txt) */}
        {isText && !yukleniyor && !hata && textIcerik !== null && (
          <div className="flex-1 overflow-auto bg-gray-50 p-6">
            <pre className="text-sm font-mono text-gray-800 whitespace-pre-wrap break-words leading-relaxed">
              {textIcerik}
            </pre>
          </div>
        )}

        {/* Word belgesi (.docx) */}
        {isWord && !yukleniyor && !hata && wordHtml !== null && (
          <div className="flex-1 overflow-auto bg-white">
            <div
              className="mx-auto max-w-3xl px-12 py-8 text-sm text-gray-800 leading-relaxed [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-4 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mb-3 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mb-2 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-3 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-gray-300 [&_td]:p-2 [&_th]:border [&_th]:border-gray-300 [&_th]:p-2 [&_th]:bg-gray-100 [&_th]:font-semibold"
              dangerouslySetInnerHTML={{ __html: wordHtml }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
