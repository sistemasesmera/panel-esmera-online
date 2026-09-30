export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 9 && !digits.startsWith("0")) return `+34${digits}`;
  if (digits.startsWith("34") && digits.length === 11) return `+${digits}`;
  if (digits.startsWith("0034")) return `+${digits.slice(2)}`;
  return raw.trim();
}
