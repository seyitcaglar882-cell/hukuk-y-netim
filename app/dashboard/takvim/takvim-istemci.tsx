"use client";

import { useState, useRef } from "react";
import FullCalendar from "@fullcalendar/react";
import type { EventClickArg } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import trLocale from "@fullcalendar/core/locales/tr";
import type { EventContentArg } from "@fullcalendar/core";
import { Button } from "@/components/ui/button";
import { Plus, List } from "lucide-react";
import { DurusmaDialog } from "./durusma-dialog";
import { GorevDialog } from "./gorev-dialog";
import { DurusmaDetayDialog } from "./durusma-detay-dialog";
import { GunOzetiDialog } from "./gun-ozeti-dialog";
import { DurusmaTur, DurusmaDurum, GorevTur, GorevDurum, MuvekkılTip } from "@prisma/client";

type Dosya = { id: string; esasNo: string | null; dosyaNo: string | null; muvekkil: { ad: string; tip: MuvekkılTip }; avukatId: string | null; avukat?: { ad: string; mtPrefiks: boolean } | null };
type Avukat = { id: string; ad: string };

type Durusma = {
  id: string; dosyaId: string; tarih: Date; tur: DurusmaTur; yer: string | null;
  sonucNotu: string | null; sonrakiAdim: string | null; durum: DurusmaDurum;
  dosya: { id: string; esasNo: string | null; dosyaNo: string | null; mahkeme: string | null; muvekkil: { ad: string } };
};

type Gorev = {
  id: string; dosyaId: string | null; baslik: string; tur: GorevTur; sonTarih: Date; durum: GorevDurum;
  dosya: { id: string; esasNo: string | null; dosyaNo: string | null; muvekkil: { ad: string } } | null;
  atanan: { id: string; ad: string } | null;
};

const TUR_RENK: Record<DurusmaTur, string> = {
  DURUSMA: "#2d5a8e",
  KESIF: "#0891b2",
  TOPLANTI: "#059669",
  SON_GUN: "#dc2626",
};

const GOREV_RENK: Record<GorevTur, string> = {
  GOREV: "#7c3aed",
  SURE: "#ea580c",
  TEMYIZ: "#b45309",
  ITIRAZ: "#be123c",
};

const TUR_ETIKET: Record<DurusmaTur, string> = {
  DURUSMA: "Duruşma", KESIF: "Keşif", TOPLANTI: "Toplantı", SON_GUN: "Son Gün",
};

export function TakvimIstemci({
  durusmalar, gorevler, dosyalar, avukatlar,
}: {
  durusmalar: Durusma[];
  gorevler: Gorev[];
  dosyalar: Dosya[];
  avukatlar: Avukat[];
}) {
  const calendarRef = useRef<FullCalendar>(null);
  const [durusmaDialogAcik, setDurusmaDialogAcik] = useState(false);
  const [gorevDialogAcik, setGorevDialogAcik] = useState(false);
  const [seciliDurusma, setSeciliDurusma] = useState<Durusma | null>(null);
  const [detayDialogAcik, setDetayDialogAcik] = useState(false);
  const [onSecilenTarih, setOnSecilenTarih] = useState<string>("");
  const [gunOzetiAcik, setGunOzetiAcik] = useState(false);
  const [gunOzetiTarih, setGunOzetiTarih] = useState<string>("");
  const [gunOzetiDurusmalar, setGunOzetiDurusmalar] = useState<Durusma[]>([]);
  const [gunOzetiGorevler, setGunOzetiGorevler] = useState<Gorev[]>([]);

  const events = [
    ...durusmalar.map((d) => ({
      id: `durusma-${d.id}`,
      title: `${TUR_ETIKET[d.tur]}: ${d.dosya.muvekkil.ad}`,
      start: d.tarih,
      backgroundColor: d.durum === "IPTAL" ? "#9ca3af" : TUR_RENK[d.tur],
      borderColor: "transparent",
      extendedProps: { tip: "durusma", data: d },
      classNames: d.durum === "TAMAMLANDI" ? ["opacity-60"] : [],
    })),
    ...gorevler.filter((g) => g.durum === "BEKLIYOR").map((g) => ({
      id: `gorev-${g.id}`,
      title: `📋 ${g.baslik}`,
      start: g.sonTarih,
      allDay: true,
      backgroundColor: GOREV_RENK[g.tur],
      borderColor: "transparent",
      extendedProps: { tip: "gorev", data: g },
    })),
  ];

  function handleEventClick(info: EventClickArg) {
    const props = info.event.extendedProps as { tip: string; data: Durusma | Gorev };
    if (props.tip === "durusma") {
      setSeciliDurusma(props.data as Durusma);
      setDetayDialogAcik(true);
    }
  }

  function renderEventContent(arg: EventContentArg) {
    const { event } = arg;
    const renk = event.backgroundColor;
    const baslangic = event.start;
    const saat =
      !event.allDay && baslangic
        ? baslangic.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })
        : null;
    const props = event.extendedProps as { tip: string; data: Durusma | Gorev };
    const isGorev = props.tip === "gorev";
    const tamamlandi = event.classNames.includes("opacity-60");

    // Kısa isim: duruşma için müvekkil adı, görev için başlık
    let kisaAd = "";
    if (isGorev) {
      kisaAd = (props.data as Gorev).baslik;
    } else {
      kisaAd = (props.data as Durusma).dosya.muvekkil.ad;
    }

    return (
      <div
        style={{
          backgroundColor: renk,
          borderRadius: "4px",
          padding: "3px 7px 4px",
          width: "100%",
          overflow: "hidden",
          boxSizing: "border-box",
          opacity: tamamlandi ? 0.55 : 1,
          borderLeft: `3px solid rgba(0,0,0,0.18)`,
        }}
      >
        {saat && (
          <div
            style={{
              color: "rgba(255,255,255,0.82)",
              fontSize: "10px",
              fontWeight: 700,
              lineHeight: "13px",
              letterSpacing: "0.02em",
            }}
          >
            {saat}
          </div>
        )}
        <div
          style={{
            color: "white",
            fontSize: "11.5px",
            fontWeight: 600,
            lineHeight: "15px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {isGorev && <span style={{ opacity: 0.8, marginRight: 2 }}>📋</span>}
          {kisaAd}
        </div>
      </div>
    );
  }

  function toDateStr(tarih: Date): string {
    const d = new Date(tarih);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const g = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${g}`;
  }

  function handleDateClick(info: { dateStr: string }) {
    const gunStr = info.dateStr;
    const gunDurusmalar = durusmalar.filter((d) => toDateStr(new Date(d.tarih)) === gunStr);
    const gunGorevler = gorevler.filter((g) => toDateStr(new Date(g.sonTarih)) === gunStr && g.durum === "BEKLIYOR");

    if (gunDurusmalar.length === 0 && gunGorevler.length === 0) {
      setOnSecilenTarih(gunStr);
      setDurusmaDialogAcik(true);
    } else {
      setGunOzetiTarih(gunStr);
      setGunOzetiDurusmalar(gunDurusmalar);
      setGunOzetiGorevler(gunGorevler);
      setGunOzetiAcik(true);
    }
  }

  return (
    <div className="space-y-5">
      {/* Başlık */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Takvim</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Duruşmalar, keşifler ve görev süreleri</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setGorevDialogAcik(true)}>
            <List className="h-4 w-4 mr-1.5" />Görev Ekle
          </Button>
          <Button size="sm" onClick={() => { setOnSecilenTarih(""); setDurusmaDialogAcik(true); }}>
            <Plus className="h-4 w-4 mr-1.5" />Duruşma / Toplantı Oluştur
          </Button>
        </div>
      </div>

      {/* Renk Açıklaması */}
      <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
        {(Object.entries(TUR_RENK) as [DurusmaTur, string][]).map(([tur, renk]) => (
          <span key={tur} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full inline-block shrink-0" style={{ backgroundColor: renk }} />
            {TUR_ETIKET[tur]}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full inline-block shrink-0" style={{ backgroundColor: "#7c3aed" }} />
          Görev / Süre
        </span>
      </div>

      {/* Takvim */}
      <div className="rounded-xl border bg-card p-5">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
          initialView="dayGridMonth"
          locale={trLocale}
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek,listWeek",
          }}
          buttonText={{ today: "Bugün", month: "Ay", week: "Hafta", list: "Liste" }}
          events={events}
          eventClick={handleEventClick}
          dateClick={handleDateClick}
          eventContent={renderEventContent}
          height="auto"
          eventDisplay="block"
          dayMaxEvents={3}
          nowIndicator
          businessHours={{ daysOfWeek: [1, 2, 3, 4, 5], startTime: "08:00", endTime: "18:00" }}
        />
      </div>

      <DurusmaDialog
        open={durusmaDialogAcik}
        onClose={() => setDurusmaDialogAcik(false)}
        dosyalar={dosyalar}
        avukatlar={avukatlar}
        baslangicTarihi={onSecilenTarih}
      />

      <GorevDialog
        open={gorevDialogAcik}
        onClose={() => setGorevDialogAcik(false)}
        dosyalar={dosyalar}
        avukatlar={avukatlar}
      />

      {seciliDurusma && (
        <DurusmaDetayDialog
          open={detayDialogAcik}
          onClose={() => setDetayDialogAcik(false)}
          durusma={seciliDurusma}
        />
      )}

      <GunOzetiDialog
        open={gunOzetiAcik}
        tarih={gunOzetiTarih}
        durusmalar={gunOzetiDurusmalar}
        gorevler={gunOzetiGorevler}
        onClose={() => setGunOzetiAcik(false)}
        onDurusmaClick={(d) => {
          setSeciliDurusma(d);
          setDetayDialogAcik(true);
        }}
        onYeniEkle={() => {
          setOnSecilenTarih(gunOzetiTarih);
          setDurusmaDialogAcik(true);
        }}
      />
    </div>
  );
}
