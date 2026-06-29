import { NextResponse } from "next/server";
import { hatirlatmalariOlustur } from "@/lib/actions/bildirim";

// GET /api/cron — node-cron veya harici cron servisi tarafından günlük tetiklenir
export async function GET(req: Request) {
  const secret = req.headers.get("x-cron-secret");
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const sonuc = await hatirlatmalariOlustur();
  return NextResponse.json(sonuc);
}
