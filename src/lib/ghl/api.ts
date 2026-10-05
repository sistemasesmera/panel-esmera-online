import "server-only";

const GHL_API_BASE = "https://services.leadconnectorhq.com";
const GHL_TIMEOUT_MS = 12_000;

function ghlHeaders() {
  return {
    Authorization: `Bearer ${process.env.GHL_API_KEY}`,
    "Content-Type": "application/json",
    Version: "2021-04-15",
  };
}

function ghlFetch(url: string, init?: RequestInit): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), GHL_TIMEOUT_MS);
  return fetch(url, { ...init, signal: ctrl.signal }).finally(() => clearTimeout(timer));
}

export type GhlPipelineStage = {
  id: string;
  name: string;
  position: number;
};

export type GhlPipeline = {
  id: string;
  name: string;
  stages: GhlPipelineStage[];
};

export type GhlOpportunity = {
  id: string;
  name: string;
  pipelineId: string;
  pipelineStageId: string;
  pipelineStageName?: string;
  status: "open" | "won" | "lost" | "abandoned";
  monetaryValue: number | null;
  assignedTo: string | null;
  contact: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
  };
  customFields?: Array<{ id: string; fieldValueString?: string; type?: string }>;
  createdAt: string;
  updatedAt: string;
  lastStageChangeAt?: string | null;
};

export type GhlContact = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  customFields?: Array<{ id: string; value: string; fieldKey?: string }>;
};

export async function fetchGhlPipelines(): Promise<GhlPipeline[]> {
  const locationId = process.env.GHL_LOCATION_ID;
  if (!locationId) throw new Error("GHL_LOCATION_ID not set");
  if (!process.env.GHL_API_KEY) throw new Error("GHL_API_KEY not set");

  const url = new URL(`${GHL_API_BASE}/opportunities/pipelines`);
  url.searchParams.set("locationId", locationId);

  const res = await ghlFetch(url.toString(), { headers: ghlHeaders(), cache: "no-store" });
  if (!res.ok) throw new Error(`GHL pipelines error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return (data.pipelines ?? []) as GhlPipeline[];
}

export async function fetchGhlOpportunities(
  pipelineId: string,
  maxResults = Infinity,
): Promise<GhlOpportunity[]> {
  const locationId = process.env.GHL_LOCATION_ID;
  if (!locationId) throw new Error("GHL_LOCATION_ID not set");
  if (!process.env.GHL_API_KEY) throw new Error("GHL_API_KEY not set");

  const all: GhlOpportunity[] = [];
  let startAfterId: string | undefined;

  do {
    const url = new URL(`${GHL_API_BASE}/opportunities/search`);
    url.searchParams.set("location_id", locationId);
    url.searchParams.set("pipeline_id", pipelineId);
    url.searchParams.set("limit", "100");
    if (startAfterId) url.searchParams.set("startAfterId", startAfterId);

    const res = await ghlFetch(url.toString(), { headers: ghlHeaders(), cache: "no-store" });
    if (!res.ok) throw new Error(`GHL opportunities error ${res.status}: ${await res.text()}`);
    const data = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const page = (data.opportunities ?? []) as any[] as GhlOpportunity[];
    all.push(...page);
    if (all.length >= maxResults) break;
    startAfterId = data.meta?.startAfterId ?? undefined;
    if (page.length < 100) break;
  } while (startAfterId);

  return all;
}

// Una página — cursor por número de página, filtro opcional por etapa
export async function fetchGhlOpportunitiesPage(
  pipelineId: string,
  page  = 1,
  opts: { stageId?: string; limit?: number } = {},
): Promise<{ opps: GhlOpportunity[]; total: number | null; nextPage: number | null }> {
  const locationId = process.env.GHL_LOCATION_ID;
  if (!locationId) throw new Error("GHL_LOCATION_ID not set");
  if (!process.env.GHL_API_KEY) throw new Error("GHL_API_KEY not set");

  const limit = opts.limit ?? 100;

  const url = new URL(`${GHL_API_BASE}/opportunities/search`);
  url.searchParams.set("location_id", locationId);
  url.searchParams.set("pipeline_id", pipelineId);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("page", String(page));
  if (opts.stageId) url.searchParams.set("pipeline_stage_id", opts.stageId);

  const res = await ghlFetch(url.toString(), { headers: ghlHeaders(), cache: "no-store" });
  if (!res.ok) throw new Error(`GHL opportunities error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const opps  = (data.opportunities ?? []) as GhlOpportunity[];
  const total    = (data.meta?.total ?? null) as number | null;
  const nextPage = opps.length >= limit ? page + 1 : null;
  return { opps, total, nextPage };
}

export async function fetchGhlOpportunity(id: string): Promise<GhlOpportunity | null> {
  if (!process.env.GHL_API_KEY) return null;
  const res = await ghlFetch(`${GHL_API_BASE}/opportunities/${id}`, {
    headers: ghlHeaders(),
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = await res.json();
  return (data.opportunity ?? data) as GhlOpportunity;
}

export async function updateGhlOpportunity(
  id: string,
  data: { pipelineStageId?: string; status?: string; monetaryValue?: number }
): Promise<void> {
  if (!process.env.GHL_API_KEY) throw new Error("GHL_API_KEY not set");
  const res = await fetch(`${GHL_API_BASE}/opportunities/${id}`, {
    method: "PUT",
    headers: ghlHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`GHL update opportunity error ${res.status}: ${await res.text()}`);
}

export async function fetchGhlContact(contactId: string): Promise<GhlContact | null> {
  if (!process.env.GHL_API_KEY) return null;
  const res = await fetch(`${GHL_API_BASE}/contacts/${contactId}`, {
    headers: ghlHeaders(),
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = await res.json();
  return (data.contact ?? data) as GhlContact;
}



export type GhlNote = {
  id: string;
  body: string;
  dateAdded: string;
  userId: string | null;
};

export async function fetchGhlContactNotes(contactId: string): Promise<GhlNote[]> {
  if (!process.env.GHL_API_KEY) return [];
  const url = new URL(`${GHL_API_BASE}/contacts/${contactId}/notes`);
  const res = await fetch(url.toString(), { headers: ghlHeaders(), cache: "no-store" });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.notes ?? []) as GhlNote[];
}

export async function searchGhlOpportunitiesByPhone(phone: string): Promise<GhlOpportunity[]> {
  const locationId = process.env.GHL_LOCATION_ID;
  if (!locationId || !process.env.GHL_API_KEY) return [];

  const url = new URL(`${GHL_API_BASE}/opportunities/search`);
  url.searchParams.set("location_id", locationId);
  url.searchParams.set("q", phone);
  url.searchParams.set("limit", "20");

  const res = await fetch(url.toString(), { headers: ghlHeaders(), cache: "no-store" });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.opportunities ?? []) as GhlOpportunity[];
}

// GHL service calendars expect local datetime strings (no Z suffix) + selectedTimezone
function toLocalDateTimeString(date: Date, tz = "Europe/Madrid"): string {
  return date.toLocaleString("sv-SE", { timeZone: tz }).replace(" ", "T");
}

export async function createGhlAppointment(opts: {
  contactId: string;
  title:     string;
  startTime: string; // ISO 8601 UTC from client
  endTime:   string; // ISO 8601 UTC from client
  notes?:    string;
}): Promise<{ id: string }> {
  const locationId  = process.env.GHL_LOCATION_ID;
  const calendarId  = process.env.GHL_CALENDAR_ID;
  if (!locationId)  throw new Error("GHL_LOCATION_ID not set");
  if (!calendarId)  throw new Error("GHL_CALENDAR_ID not set");
  if (!process.env.GHL_API_KEY) throw new Error("GHL_API_KEY not set");

  const startLocal = toLocalDateTimeString(new Date(opts.startTime));
  const endLocal   = toLocalDateTimeString(new Date(opts.endTime));

  const body: Record<string, unknown> = {
    calendarId,
    locationId,
    contactId:         opts.contactId,
    title:             opts.title,
    startTime:         startLocal,
    endTime:           endLocal,
    selectedTimezone:  "Europe/Madrid",
    appointmentStatus: "new",
    ignoreDateRange:   true,
    toNotify:          false,
  };
  if (opts.notes) body.notes = opts.notes;

  const res = await fetch(`${GHL_API_BASE}/calendars/events/appointments`, {
    method:  "POST",
    headers: ghlHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`GHL appointment error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return { id: data.id ?? data.event?.id ?? "" };
}

export async function updateGhlContact(
  contactId: string,
  data: { name?: string; email?: string; phone?: string },
): Promise<void> {
  if (!process.env.GHL_API_KEY) throw new Error("GHL_API_KEY not set");

  const body: Record<string, unknown> = {};
  if (data.name) {
    const [firstName, ...rest] = data.name.trim().split(" ");
    body.firstName = firstName;
    if (rest.length) body.lastName = rest.join(" ");
  }
  if (data.email !== undefined) body.email = data.email;
  if (data.phone !== undefined) body.phone = data.phone;

  const res = await fetch(`${GHL_API_BASE}/contacts/${contactId}`, {
    method:  "PUT",
    headers: ghlHeaders(),
    body:    JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`GHL update contact error ${res.status}: ${await res.text()}`);
}

export async function createGhlContact(data: {
  name:   string;
  email?: string;
  phone?: string;
}): Promise<GhlContact> {
  const locationId = process.env.GHL_LOCATION_ID;
  if (!locationId)              throw new Error("GHL_LOCATION_ID not set");
  if (!process.env.GHL_API_KEY) throw new Error("GHL_API_KEY not set");

  const [firstName, ...rest] = data.name.trim().split(" ");
  const lastName = rest.join(" ") || undefined;

  const body: Record<string, unknown> = { locationId, firstName };
  if (lastName)    body.lastName = lastName;
  if (data.email)  body.email   = data.email;
  if (data.phone)  body.phone   = data.phone;

  const res = await fetch(`${GHL_API_BASE}/contacts/`, {
    method:  "POST",
    headers: ghlHeaders(),
    body:    JSON.stringify(body),
  });

  if (!res.ok) {
    const errJson = await res.json().catch(() => null);
    // Duplicate contact — reuse the existing one
    const existingId = errJson?.meta?.contactId as string | undefined;
    if (existingId) {
      const existing = await fetchGhlContact(existingId);
      if (existing) return existing;
    }
    throw new Error(`GHL create contact error ${res.status}: ${JSON.stringify(errJson)}`);
  }

  const json = await res.json();
  return (json.contact ?? json) as GhlContact;
}

export async function createGhlOpportunity(data: {
  pipelineId:      string;
  pipelineStageId: string;
  contactId:       string;
  name:            string;
  monetaryValue?:  number;
  customFields?:   Array<{ id: string; field_value: string }>;
}): Promise<GhlOpportunity> {
  const locationId = process.env.GHL_LOCATION_ID;
  if (!locationId)              throw new Error("GHL_LOCATION_ID not set");
  if (!process.env.GHL_API_KEY) throw new Error("GHL_API_KEY not set");

  const body: Record<string, unknown> = {
    locationId,
    pipelineId:      data.pipelineId,
    pipelineStageId: data.pipelineStageId,
    contactId:       data.contactId,
    name:            data.name,
    status:          "open",
  };
  if (data.monetaryValue)          body.monetaryValue = data.monetaryValue;
  if (data.customFields?.length)   body.customFields  = data.customFields;

  const res = await fetch(`${GHL_API_BASE}/opportunities/`, {
    method:  "POST",
    headers: ghlHeaders(),
    body:    JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`GHL create opportunity error ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return (json.opportunity ?? json) as GhlOpportunity;
}

export type GhlCustomFieldDef = {
  id: string;
  name: string;
  fieldKey: string;
};

export async function fetchGhlCustomFieldDefs(): Promise<GhlCustomFieldDef[]> {
  const locationId = process.env.GHL_LOCATION_ID;
  if (!locationId || !process.env.GHL_API_KEY) return [];
  const res = await ghlFetch(`${GHL_API_BASE}/locations/${locationId}/customFields`, {
    headers: ghlHeaders(),
    cache: "no-store",
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.customFields ?? []) as GhlCustomFieldDef[];
}

export async function fetchGhlUsers(): Promise<Array<{ id: string; name: string; email: string }>> {
  const locationId = process.env.GHL_LOCATION_ID;
  if (!locationId || !process.env.GHL_API_KEY) return [];

  const url = new URL(`${GHL_API_BASE}/users`);
  url.searchParams.set("locationId", locationId);

  const res = await fetch(url.toString(), { headers: ghlHeaders(), cache: "no-store" });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.users ?? []) as Array<{ id: string; name: string; email: string }>;
}
