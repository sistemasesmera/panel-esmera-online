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
  name:       { position: "absolute", top: 295, left: 0, right: 0, textAlign: "center", fontSize: 18, fontFamily: "Helvetica-Bold", color: "#1a1a1a", letterSpacing: 1.5 },
  course:     { position: "absolute", top: 332, left: 60, right: 60, textAlign: "center", fontSize: 18, fontFamily: "Helvetica-Bold", color: "#1a1a1a" },
  certNumber: { position: "absolute", top: 454, left: 430, fontSize: 7, fontFamily: "Helvetica", color: "#333" },
  qr:         { position: "absolute", top: 66,  left: 678, width: 102, height: 102 },
  issuedDate: { position: "absolute", top: 505, left: 580, fontSize: 12, fontFamily: "Helvetica-Bold", color: "#1a1a1a" },
});

function fmtDate(d: string | null) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" });
}

export async function buildCertificatePdf(cert: {
  certificate_number: string;
  student_name: string;
  course_name: string;
  issued_at: string | null;
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
          <Text style={s.issuedDate}>{fmtDate(cert.issued_at)}</Text>
        </View>
      </Page>
    </Document>
  );
}
