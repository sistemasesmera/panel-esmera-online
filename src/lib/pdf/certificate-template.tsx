import "server-only";
import path from "path";
import fs from "fs";
import QRCode from "qrcode";
import { Document, Page, Image, Text, View, StyleSheet } from "@react-pdf/renderer";

const QR_BASE = "https://esmeraonline.com/verificar-certificado";
const TEMPLATE_PATH = path.join(process.cwd(), "public", "certificate-template.png");

function loadTemplate(): string {
  const buf = fs.readFileSync(TEMPLATE_PATH);
  return `data:image/png;base64,${buf.toString("base64")}`;
}

const s = StyleSheet.create({
  page:       { padding: 0 },
  bg:         { position: "absolute", top: 0, left: 0, width: "100%", height: "100%" },
  name:       { position: "absolute", top: 214, left: 0, right: 0, textAlign: "center", fontSize: 15, fontFamily: "Helvetica-Bold", color: "#1a1a1a", letterSpacing: 1.5 },
  course:     { position: "absolute", top: 252, left: 60, right: 60, textAlign: "center", fontSize: 12, fontFamily: "Helvetica-Bold", color: "#1a1a1a" },
  certNumber: { position: "absolute", top: 396, left: 370, fontSize: 7, fontFamily: "Helvetica", color: "#333" },
  qr:         { position: "absolute", top: 44,  left: 670, width: 118, height: 118 },
  startDate:  { position: "absolute", top: 505, left: 660, fontSize: 9, fontFamily: "Helvetica-Bold", color: "#1a1a1a" },
  endDate:    { position: "absolute", top: 529, left: 660, fontSize: 9, fontFamily: "Helvetica-Bold", color: "#1a1a1a" },
});

function fmtDate(d: string | null) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" });
}

export async function buildCertificatePdf(cert: {
  certificate_number: string;
  student_name: string;
  course_name: string;
  start_date: string | null;
  end_date: string | null;
}) {
  const templateDataUrl = loadTemplate();
  const qrDataUrl = await QRCode.toDataURL(
    `${QR_BASE}/${cert.certificate_number}`,
    { width: 200, margin: 1 }
  );

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={s.page}>
        <View style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}>
          <Image src={templateDataUrl} style={s.bg} />
          <Text style={s.name}>{cert.student_name.toUpperCase()}</Text>
          <Text style={s.course}>{cert.course_name.toUpperCase()}</Text>
          <Text style={s.certNumber}>{cert.certificate_number}</Text>
          <Image src={qrDataUrl} style={s.qr} />
          <Text style={s.startDate}>{fmtDate(cert.start_date)}</Text>
          <Text style={s.endDate}>{fmtDate(cert.end_date)}</Text>
        </View>
      </Page>
    </Document>
  );
}
