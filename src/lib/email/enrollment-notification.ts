import "server-only";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEnrollmentNotification({
  enrollmentNumber,
  enrollmentId,
  studentName,
  courseName,
  amount,
  paymentType,
  paymentOption,
  recipientEmails,
}: {
  enrollmentNumber: number;
  enrollmentId:     string;
  studentName:      string;
  courseName:       string;
  amount:           number;
  paymentType:      "contado" | "financiado";
  paymentOption:    string;
  recipientEmails:  string[];
}) {
  if (!process.env.RESEND_API_KEY) return;
  const unique = [...new Set(recipientEmails.filter(Boolean))];
  if (!unique.length) return;

  const from      = process.env.RESEND_FROM_EMAIL ?? "Esmera Online <noreply@esmeraschool.com>";
  const appUrl    = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const url       = `${appUrl}/enrollments/${enrollmentId}`;
  const amountFmt = amount.toLocaleString("es-ES", { style: "currency", currency: "EUR" });
  const pagoFmt   = paymentType === "contado" ? `Contado · ${paymentOption}` : `Financiado · ${paymentOption}`;

  await resend.emails.send({
    from,
    to: unique,
    subject: `✅ Nueva matrícula #${enrollmentNumber} — ${studentName}`,
    html: `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">

        <tr>
          <td style="background:linear-gradient(135deg,#1ab5c0,#0a8a94);padding:28px 32px;">
            <p style="margin:0;color:#fff;font-size:13px;font-weight:600;opacity:.85;letter-spacing:.04em;text-transform:uppercase;">Esmera Online · Panel</p>
            <h1 style="margin:6px 0 0;color:#fff;font-size:22px;font-weight:700;">✅ Nueva matrícula generada</h1>
          </td>
        </tr>

        <tr>
          <td style="padding:28px 32px 20px;">
            <p style="margin:0 0 20px;font-size:15px;color:#1e293b;">
              Se ha generado la matrícula <strong>#${enrollmentNumber}</strong>:
            </p>
            <table width="100%" cellpadding="0" cellspacing="0">
              ${row("Alumno",  studentName)}
              ${row("Curso",   courseName)}
              ${row("Importe", amountFmt)}
              ${row("Pago",    pagoFmt)}
            </table>
          </td>
        </tr>

        <tr>
          <td style="padding:0 32px 28px;">
            <a href="${url}" style="display:inline-block;background:#1ab5c0;color:#fff;font-size:13px;font-weight:700;padding:12px 24px;border-radius:8px;text-decoration:none;">
              Ver matrícula en el panel →
            </a>
          </td>
        </tr>

        <tr>
          <td style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0;">
            <p style="margin:0;font-size:11px;color:#94a3b8;">
              Correo automático generado por el panel interno de Esmera Online.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
  });
}

function row(label: string, value: string) {
  return `
  <tr>
    <td style="padding:7px 0;border-bottom:1px solid #f1f5f9;">
      <table width="100%" cellpadding="0" cellspacing="0"><tr>
        <td width="110" style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em;">${label}</td>
        <td style="font-size:14px;color:#1e293b;font-weight:500;">${value}</td>
      </tr></table>
    </td>
  </tr>`;
}
