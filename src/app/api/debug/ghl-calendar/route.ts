import { NextResponse } from "next/server";

export async function GET() {
  const calendarId = process.env.GHL_CALENDAR_ID;
  const locationId = process.env.GHL_LOCATION_ID;
  const apiKey     = process.env.GHL_API_KEY;

  if (!calendarId || !apiKey) {
    return NextResponse.json({ error: "missing env vars" }, { status: 500 });
  }

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    Version: "2021-04-15",
  };

  const base = "https://services.leadconnectorhq.com";

  // free-slots needs epoch ms, not date strings, and no locationId in query
  const startMs = Date.now();
  const endMs   = startMs + 7 * 24 * 60 * 60 * 1000; // next 7 days

  const [calRes, slotsRes] = await Promise.all([
    fetch(`${base}/calendars/${calendarId}`, { headers }),
    fetch(`${base}/calendars/${calendarId}/free-slots?startDate=${startMs}&endDate=${endMs}&timezone=Europe%2FMadrid`, { headers }),
  ]);

  const [calData, slotsData] = await Promise.all([
    calRes.json().catch(() => ({ _status: calRes.status })),
    slotsRes.json().catch(() => ({ _status: slotsRes.status })),
  ]);

  return NextResponse.json({
    calendar:         { status: calRes.status,   data: calData },
    free_slots:       { status: slotsRes.status, data: slotsData },
    staff_userId:     calData?.calendar?.teamMembers?.[0]?.userId ?? null,
  }, { status: 200 });
}
