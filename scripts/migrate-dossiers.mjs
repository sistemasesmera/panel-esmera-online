/**
 * Migra los dossiers de esmera-online-manager → esmera-online-panel
 * 1. Crea el bucket course-docs (público) en el nuevo proyecto
 * 2. Descarga cada PDF del proyecto antiguo
 * 3. Lo sube al nuevo Supabase Storage
 * 4. Actualiza dossier_url en la tabla courses
 */

const OLD_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2d3JndXNmcnd4Z3ZpdmpybGZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjIzMDYzNCwiZXhwIjoyMDk3ODA2NjM0fQ.mmommpw-mXQX2NoMtDzQcBlECrq6rpAPmrRQScFERNE";
const NEW_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNuZ2p1aWRib2RsYnN1bGhsb2VtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDU1MDY0MiwiZXhwIjoyMTA2MTI2NjQyfQ.uXWFuSmqA_AL24urhFttGyLzP-6WfFGCWuisXbtkS8s";
const NEW_URL  = "https://cngjuidbodlbsulhloem.supabase.co";
const BUCKET   = "course-docs";

const headers = (key) => ({ apikey: key, Authorization: `Bearer ${key}` });

// ── 1. Crear bucket público ───────────────────────────────────────────────────
async function ensureBucket() {
  const res = await fetch(`${NEW_URL}/storage/v1/bucket`, {
    method: "POST",
    headers: { ...headers(NEW_KEY), "Content-Type": "application/json" },
    body: JSON.stringify({ id: BUCKET, name: BUCKET, public: true }),
  });
  const body = await res.json();
  if (res.ok) {
    console.log(`✓ Bucket '${BUCKET}' creado`);
  } else if (body?.error === "The resource already exists") {
    console.log(`  Bucket '${BUCKET}' ya existe`);
  } else {
    throw new Error(`Error creando bucket: ${JSON.stringify(body)}`);
  }
}

// ── 2. Obtener cursos con dossier ────────────────────────────────────────────
async function getCoursesWithDossier() {
  const res = await fetch(
    `${NEW_URL}/rest/v1/courses?select=id,name,dossier_url&dossier_url=not.is.null`,
    { headers: headers(NEW_KEY) }
  );
  return await res.json();
}

// ── 3. Migrar un dossier ─────────────────────────────────────────────────────
async function migrateDossier(course) {
  const oldUrl = course.dossier_url;

  // Descargar del proyecto antiguo
  const dlRes = await fetch(oldUrl);
  if (!dlRes.ok) {
    console.warn(`  ✗ No se pudo descargar: ${course.name} (${dlRes.status})`);
    return false;
  }
  const pdfBuffer = await dlRes.arrayBuffer();

  // Subir al nuevo proyecto
  const storagePath = `${course.id}/dossier.pdf`;
  const upRes = await fetch(
    `${NEW_URL}/storage/v1/object/${BUCKET}/${storagePath}`,
    {
      method: "POST",
      headers: {
        ...headers(NEW_KEY),
        "Content-Type": "application/pdf",
        "x-upsert": "true",
      },
      body: pdfBuffer,
    }
  );

  if (!upRes.ok) {
    const err = await upRes.text();
    console.warn(`  ✗ Error subiendo ${course.name}: ${err}`);
    return false;
  }

  // URL pública del nuevo proyecto
  const newUrl = `${NEW_URL}/storage/v1/object/public/${BUCKET}/${storagePath}`;

  // Actualizar dossier_url en la tabla
  const updRes = await fetch(
    `${NEW_URL}/rest/v1/courses?id=eq.${course.id}`,
    {
      method: "PATCH",
      headers: { ...headers(NEW_KEY), "Content-Type": "application/json", "Prefer": "return=minimal" },
      body: JSON.stringify({ dossier_url: newUrl }),
    }
  );

  if (!updRes.ok) {
    console.warn(`  ✗ Error actualizando URL de ${course.name}`);
    return false;
  }

  return true;
}

// ── Main ─────────────────────────────────────────────────────────────────────
await ensureBucket();

const courses = await getCoursesWithDossier();
console.log(`\nMigrando ${courses.length} dossiers...\n`);

let ok = 0, fail = 0;
for (const course of courses) {
  process.stdout.write(`  → ${course.name.substring(0, 50).padEnd(50)} `);
  const success = await migrateDossier(course);
  if (success) { console.log("✓"); ok++; }
  else { fail++; }
}

console.log(`\n✓ ${ok} migrados  ✗ ${fail} fallidos`);
