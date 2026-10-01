import React from "react";
import {
  Document,
  Image,
  Page,
  Text,
  View,
  StyleSheet,
  Svg,
  Path,
} from "@react-pdf/renderer";

const NAVY = "#0A4C7F";
const TEAL = "#1AB5C0";
const DARK = "#1A1A1A";
const BODY = "#3D3D3D";
const MUTED = "#666666";

const CO = {
  name:       "ESMERA SCHOOL SL",
  commercial: "ESMERA ONLINE",
  cif:        "B88329818",
  address:    "Paseo Santa Maria de la Cabeza 10, local 2.",
  email:      "info@esmeraonline.com",
  phone:      "",
  web:        "www.esmeraonline.com",
};

export type EnrollmentContractData = {
  enrollment_number: number | null;
  enrollment_date: string;
  start_date: string | null;
  end_date: string | null;
  duration_months: number | null;
  logoBase64: string | null;
  fontFamily: string;
  student: {
    full_name: string;
    dni_nie: string;
    birth_date: string | null;
    address: string | null;
    postal_code: string | null;
    province: string | null;
    phone: string | null;
    email: string;
  } | null;
  course: {
    name: string;
    duration_hours: number | null;
  } | null;
  formation: {
    name: string;
    courses: string[];
  } | null;
  platform: string | null;
  contract: {
    amount: number;
    payment_type: string | null;
    cash_method: string | null;
    cash_amount: number | null;
    financer: string | null;
    financed_amount: number | null;
  } | null;
  generatedAt: string;
};

function fmtDate(d: string | null | undefined): string {
  if (!d) return "";
  return new Date(d).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function fmtEur(n: number | null | undefined): string {
  if (n == null) return "";
  return n.toLocaleString("es-ES", { style: "currency", currency: "EUR" });
}

const FINANCER_LABELS: Record<string, string> = {
  alma:     "Alma",
  sabadell: "Sabadell",
  sequra:   "SeQura",
  esmera:   "Esmera (pago aplazado)",
};

const CASH_METHOD_LABELS: Record<string, string> = {
  transferencia: "Transferencia bancaria",
  efectivo:      "Efectivo",
};

function buildPaymentLines(ct: EnrollmentContractData["contract"]): string[] {
  if (!ct) return [];
  const pt = ct.payment_type;
  if (pt === "contado") {
    const method = CASH_METHOD_LABELS[ct.cash_method ?? ""] ?? ct.cash_method ?? "";
    return [
      `Precio total del curso:  ${fmtEur(ct.amount)}`,
      `Forma de pago:  Contado`,
      `Método de pago:  ${method}`,
    ];
  }
  if (pt === "financiado") {
    const fin = FINANCER_LABELS[ct.financer ?? ""] ?? ct.financer ?? "";
    return [
      `Precio total del curso:  ${fmtEur(ct.amount)}`,
      `Forma de pago:  Financiado`,
      `Entidad financiadora:  ${fin}`,
    ];
  }
  if (pt === "mixto") {
    const method = CASH_METHOD_LABELS[ct.cash_method ?? ""] ?? ct.cash_method ?? "";
    const fin    = FINANCER_LABELS[ct.financer ?? ""] ?? ct.financer ?? "";
    return [
      `Precio total del curso:  ${fmtEur(ct.amount)}`,
      `Forma de pago:  Mixto (contado + financiación)`,
      `Pago en contado:  ${fmtEur(ct.cash_amount)}  (${method})`,
      `Pago financiado:  ${fmtEur(ct.financed_amount)}  (${fin})`,
    ];
  }
  return [`Precio total del curso:  ${fmtEur(ct.amount)}`];
}

function makeStyles(ff: string) {
  const isMontserrat = ff === "Montserrat";
  const boldFamily   = isMontserrat ? ff : "Helvetica-Bold";
  const boldWeight   = isMontserrat ? 700 : undefined;

  return StyleSheet.create({
    page: {
      backgroundColor: "#FFFFFF",
      paddingTop:       72,
      paddingBottom:    72,
      paddingHorizontal: 52,
      fontSize:         10,
      fontFamily:       ff,
      fontWeight:       400,
      color:            BODY,
    },
    cornerTR:   { position: "absolute", top: 0, right: 0 },
    cornerBL:   { position: "absolute", bottom: 0, left: 0 },
    logoArea:   { alignItems: "center", marginBottom: 12 },
    logoImg:    { width: 200, height: 80, objectFit: "contain" as const },
    pageTitle: {
      fontSize:       12,
      fontFamily:     boldFamily,
      fontWeight:     boldWeight,
      textAlign:      "center" as const,
      color:          DARK,
      marginBottom:   18,
      textTransform:  "uppercase" as const,
      letterSpacing:  0.5,
    },
    sectionTitle: {
      fontFamily:   boldFamily,
      fontWeight:   boldWeight,
      fontSize:     10,
      color:        DARK,
      marginTop:    16,
      marginBottom: 6,
    },
    field:   { fontSize: 9.5, color: BODY, marginBottom: 3.5, lineHeight: 1.5 },
    divider: { borderBottomWidth: 0.5, borderBottomColor: "#CCCCCC", marginVertical: 10 },
    clause:  { fontSize: 9, color: BODY, lineHeight: 1.65, marginBottom: 9 },
    sigHeading: {
      fontSize:     16,
      fontFamily:   boldFamily,
      fontWeight:   boldWeight,
      color:        DARK,
      marginTop:    28,
      marginBottom: 10,
    },
    fechaRow: { fontSize: 9.5, marginBottom: 48, color: BODY },
    sigBox:  { width: "50%" },
    sigLine: {
      borderBottomWidth:  0.8,
      borderBottomColor:  "#444444",
      marginBottom:       8,
      paddingBottom:      48,
    },
    sigLabel: { fontSize: 8.5, color: MUTED, textAlign: "center" as const },
    footer: {
      position:  "absolute",
      bottom:    24,
      left:      52,
      right:     52,
      textAlign: "center" as const,
      fontSize:  7.5,
      color:     MUTED,
    },
  });
}

function CornerTR() {
  return (
    <View style={{ position: "absolute", top: 0, right: 0 }}>
      <Svg width="115" height="95">
        <Path d="M 115,0 L 115,95 Q 58,75 0,0 Z" fill={NAVY} />
        <Path d="M 115,0 L 115,58 Q 72,42 28,0 Z" fill="#1565C0" opacity="0.45" />
      </Svg>
    </View>
  );
}

function CornerBL() {
  return (
    <View style={{ position: "absolute", bottom: 0, left: 0 }}>
      <Svg width="115" height="82">
        <Path d="M 0,82 L 115,82 Q 95,24 0,0 Z" fill={NAVY} />
        <Path d="M 0,82 L 68,82 Q 55,34 0,12 Z" fill="#1565C0" opacity="0.45" />
      </Svg>
    </View>
  );
}

export function EnrollmentContractPDF({ data }: { data: EnrollmentContractData }) {
  const s  = makeStyles(data.fontFamily);
  const st = data.student;
  const co = data.course;
  const ct = data.contract;
  const paymentLines = buildPaymentLines(ct);

  const fm = data.formation;

  const duracion =
    co?.duration_hours != null
      ? `${co.duration_hours} horas`
      : data.duration_months != null
      ? `${data.duration_months} meses`
      : "";

  const footerText = `${CO.web} · ${CO.email}`;
  const docRef = data.enrollment_number != null
    ? `Ref. matrícula nº ${data.enrollment_number} · Generado el ${fmtDate(data.generatedAt)}`
    : `Generado el ${fmtDate(data.generatedAt)}`;

  function PageWrapper({ children, footer }: { children: React.ReactNode; footer?: string }) {
    return (
      <Page size="A4" style={s.page}>
        <CornerTR />
        <CornerBL />
        <View style={s.logoArea}>
          {data.logoBase64 ? (
            <Image src={`data:image/png;base64,${data.logoBase64}`} style={s.logoImg} />
          ) : (
            <Text style={{ fontFamily: s.sectionTitle.fontFamily, fontSize: 16, color: TEAL }}>
              ESMERA FORMACIÓN
            </Text>
          )}
        </View>
        {children}
        {footer && <Text style={s.footer}>{footer}</Text>}
      </Page>
    );
  }

  return (
    <Document
      title={`Documento de Matrícula — ${st?.full_name ?? ""}`}
      author="Esmera Formación SL"
    >
      {/* ─── PÁGINA 1 ─── */}
      <PageWrapper footer={footerText}>
        <Text style={s.pageTitle}>Documento de Matrícula — Formación Online</Text>

        <Text style={s.sectionTitle}>1. Documentación</Text>
        <Text style={s.field}>Denominación Social:  {CO.name}</Text>
        <Text style={s.field}>Nombre Comercial:  {CO.commercial}</Text>
        <Text style={s.field}>CIF/NIF:  {CO.cif}</Text>
        <Text style={s.field}>Dirección:  {CO.address}</Text>
        <Text style={s.field}>Correo Electrónico:  {CO.email}</Text>
        <Text style={s.field}>Página web:  {CO.web}</Text>

        <Text style={s.sectionTitle}>2. Datos del/a alumno/a</Text>
        <Text style={s.field}>Nombre y apellidos:  {st?.full_name ?? ""}</Text>
        <Text style={s.field}>DNI / NIE / Pasaporte:  {st?.dni_nie ?? ""}</Text>
        <Text style={s.field}>Teléfono:  {st?.phone ?? ""}</Text>
        <Text style={s.field}>Correo electrónico:  {st?.email ?? ""}</Text>

        <Text style={s.sectionTitle}>3. Datos del curso</Text>
        {fm ? (
          <>
            <Text style={s.field}>Formación:  {fm.name}</Text>
            <Text style={s.field}>Cursos incluidos:  {fm.courses.join(" · ")}</Text>
          </>
        ) : (
          <Text style={s.field}>Nombre del curso:  {co?.name ?? ""}</Text>
        )}
        <Text style={s.field}>Modalidad:  Formación online</Text>
        {duracion ? <Text style={s.field}>Duración:  {duracion}</Text> : null}
        {data.end_date ? <Text style={s.field}>Fecha de finalización:  {fmtDate(data.end_date)}</Text> : null}
        {data.platform ? <Text style={s.field}>Plataforma:  {data.platform}</Text> : null}
      </PageWrapper>

      {/* ─── PÁGINA 2 ─── */}
      <PageWrapper footer={footerText}>
        <Text style={s.sectionTitle}>4. Condiciones económicas</Text>
        {paymentLines.map((line, i) => (
          <Text key={i} style={s.field}>{line}</Text>
        ))}
        <Text style={{ ...s.field, marginTop: 6, color: MUTED }}>
          El/la alumno/a declara conocer y aceptar el importe total del curso y las condiciones de pago indicadas.
        </Text>

        <View style={s.divider} />

        <Text style={s.sectionTitle}>5. Acceso a la formación</Text>
        <Text style={s.clause}>
          Una vez formalizada la matrícula y confirmado el pago, el centro facilitará al/a la alumno/a el acceso a la plataforma de formación online. El acceso es de carácter personal e intransferible. El alumno/a se compromete a no ceder sus credenciales a terceros.
        </Text>

        <Text style={s.sectionTitle}>6. Sistema de evaluación y certificación</Text>
        <Text style={s.clause}>
          La evaluación se realizará a través de la visualización de los contenidos formativos y la realización de las actividades propuestas en la plataforma. Una vez superado satisfactoriamente el curso, se expedirá el diploma o certificado correspondiente al alumno/a.
        </Text>

        <Text style={s.sectionTitle}>7. Política de desistimiento y bajas</Text>
        <Text style={s.clause}>
          De conformidad con la normativa vigente, el/la alumno/a dispone de 14 días naturales desde la formalización de la matrícula para ejercer su derecho de desistimiento, siempre que no haya accedido al contenido formativo. Una vez iniciado el acceso a los contenidos, no procederá la devolución del importe abonado.
        </Text>

        <Text style={s.sectionTitle}>8. Protección de datos personales</Text>
        <Text style={s.clause}>
          De conformidad con el Reglamento (UE) 2016/679 (RGPD) y la Ley Orgánica 3/2018 (LOPDGDD), los datos personales facilitados serán tratados por Esmera Formación SL con la finalidad de gestionar la relación formativa. El/la alumno/a podrá ejercer sus derechos de acceso, rectificación, supresión, limitación, portabilidad y oposición contactando en {CO.email}.
        </Text>
      </PageWrapper>

      {/* ─── PÁGINA 3 ─── */}
      <PageWrapper footer={`${footerText}  ·  ${docRef}`}>
        <Text style={s.sectionTitle}>9. Declaración y aceptación</Text>
        <Text style={s.clause}>
          El/la alumno/a declara que los datos personales y de contacto facilitados son veraces y se compromete a comunicar al centro cualquier modificación de los mismos. Asimismo, declara haber leído, comprendido y aceptado íntegramente las condiciones recogidas en el presente documento de matrícula, incluyendo las condiciones económicas, la política de desistimiento, las normas de acceso a la plataforma y la política de protección de datos.
        </Text>
        <Text style={s.clause}>
          La firma del presente documento implica la aceptación de todas las condiciones descritas y la formalización de la matrícula en el curso indicado.
        </Text>

        <View style={s.divider} />

        <Text style={s.sigHeading}>Lugar, Fecha y Firmas</Text>

        <Text style={s.fechaRow}>
          {`Fecha:  ${fmtDate(data.generatedAt)}`}
        </Text>

        <View style={s.sigBox}>
          <View style={s.sigLine} />
          <Text style={s.sigLabel}>Firma del/de la alumno/a</Text>
          <Text style={{ ...s.sigLabel, marginTop: 3 }}>{st?.full_name ?? ""}</Text>
        </View>
      </PageWrapper>
    </Document>
  );
}
