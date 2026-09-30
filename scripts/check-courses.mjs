const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNuZ2p1aWRib2RsYnN1bGhsb2VtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDU1MDY0MiwiZXhwIjoyMTA2MTI2NjQyfQ.uXWFuSmqA_AL24urhFttGyLzP-6WfFGCWuisXbtkS8s";
const res = await fetch("https://cngjuidbodlbsulhloem.supabase.co/rest/v1/courses?select=name,category,active&order=category.asc,name.asc", {
  headers: { apikey: KEY, Authorization: `Bearer ${KEY}` }
});
const data = await res.json();
const counts = {};
data.forEach(r => { const k = r.category || "(sin categoría)"; counts[k] = (counts[k] || 0) + 1; });
console.log(`TOTAL: ${data.length} cursos\n`);
Object.entries(counts).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`  ${v}  ${k}`));
