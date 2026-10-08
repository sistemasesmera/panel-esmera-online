import { getCurrentUser } from "@/lib/auth/get-current-user";
import { redirect } from "next/navigation";
import { listCertificates } from "@/lib/data/certificates.repository";
import { CertificatesClient } from "@/components/features/certificates/certificates-client";

export default async function CertificatesPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "administracion") redirect("/dashboard");

  const certificates = await listCertificates();

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <CertificatesClient initial={certificates} />
    </div>
  );
}
