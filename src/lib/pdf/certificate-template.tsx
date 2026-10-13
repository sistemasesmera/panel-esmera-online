import "server-only";
import path from "path";
import fs from "fs";
import QRCode from "qrcode";
import { Document, Page, Image, Text, View, StyleSheet } from "@react-pdf/renderer";

const QR_BASE = "https://esmeraonline.com/verificar-certificado";
const TEMPLATE_PATH = path.join(process.cwd(), "public", "certificate-template.png");
const LOGO_PATH     = path.join(process.cwd(), "public", "esmera-logo.png");

function loadImage(filePath: string): string {
  const buf = fs.readFileSync(filePath);
  const ext = filePath.endsWith(".png") ? "png" : "jpeg";
  return `data:image/${ext};base64,${buf.toString("base64")}`;
}

function fmtDate(d: string | null) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" });
}

const front = StyleSheet.create({
  page:       { padding: 0 },
  bg:         { position: "absolute", top: 0, left: 0, width: "100%", height: "100%" },
  name:       { position: "absolute", top: 295, left: 0, right: 0, textAlign: "center", fontSize: 18, fontFamily: "Helvetica-Bold", color: "#1a1a1a", letterSpacing: 1.5 },
  course:     { position: "absolute", top: 332, left: 60, right: 60, textAlign: "center", fontSize: 18, fontFamily: "Helvetica-Bold", color: "#1a1a1a" },
  certNumber: { position: "absolute", top: 454, left: 430, fontSize: 7, fontFamily: "Helvetica", color: "#333" },
  qr:         { position: "absolute", top: 66,  left: 678, width: 102, height: 102 },
  issuedDate: { position: "absolute", top: 505, left: 580, fontSize: 12, fontFamily: "Helvetica-Bold", color: "#1a1a1a" },
});

const back = StyleSheet.create({
  page:      { padding: 50, backgroundColor: "#ffffff" },
  logo:      { width: 130, height: 55, objectFit: "contain", alignSelf: "center", marginBottom: 28 },
  heading:   { fontSize: 14, fontFamily: "Helvetica-Bold", letterSpacing: 2, color: "#1a1a1a", textAlign: "center", marginBottom: 6 },
  duration:  { fontSize: 10, fontFamily: "Helvetica", color: "#555555", textAlign: "center", marginBottom: 24 },
  divider:   { borderBottomWidth: 1, borderBottomColor: "#e2e8f0", marginBottom: 20 },
  line:      { fontSize: 10, fontFamily: "Helvetica", color: "#333333", marginBottom: 7, lineHeight: 1.4 },
  empty:     { fontSize: 10, fontFamily: "Helvetica", color: "#aaaaaa", textAlign: "center", fontStyle: "italic" },
});

export async function buildCertificatePdf(cert: {
  certificate_number: string;
  student_name: string;
  course_name: string;
  hours: number | null;
  issued_at: string | null;
  syllabus: string | null;
}) {
  const templateDataUrl = loadImage(TEMPLATE_PATH);
  const logoDataUrl     = loadImage(LOGO_PATH);
  const qrDataUrl       = await QRCode.toDataURL(
    `${QR_BASE}/${cert.certificate_number}`,
    { width: 200, margin: 1 }
  );

  const syllabusLines = (cert.syllabus ?? "")
    .split("\n")
    .map(l => l.trim())
    .filter(Boolean);

  return (
    <Document>
      {/* Página 1 — anverso con plantilla */}
      <Page size="A4" orientation="landscape" style={front.page}>
        <View style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}>
          <Image src={templateDataUrl} style={front.bg} />
          <Text style={front.name}>{cert.student_name.toUpperCase()}</Text>
          <Text style={front.course}>{cert.course_name.toUpperCase()}</Text>
          <Text style={front.certNumber}>{cert.certificate_number}</Text>
          <Image src={qrDataUrl} style={front.qr} />
          <Text style={front.issuedDate}>{fmtDate(cert.issued_at)}</Text>
        </View>
      </Page>

      {/* Página 2 — reverso con temario */}
      <Page size="A4" orientation="landscape" style={back.page}>
        <Image src={logoDataUrl} style={back.logo} />
        <Text style={back.heading}>CONTENIDO FORMATIVO</Text>
        {cert.hours != null && (
          <Text style={back.duration}>DURACIÓN: {cert.hours} HORAS</Text>
        )}
        <View style={back.divider} />
        {syllabusLines.length > 0
          ? syllabusLines.map((line, i) => (
              <Text key={i} style={back.line}>{line}</Text>
            ))
          : <Text style={back.empty}>Sin temario especificado</Text>
        }
      </Page>
    </Document>
  );
}
