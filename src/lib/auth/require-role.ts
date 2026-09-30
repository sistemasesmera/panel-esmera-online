import "server-only";
import { redirect } from "next/navigation";
import { getCurrentUser } from "./get-current-user";
import { roleHasCapability, type AppRole, type Capability } from "@/lib/domain/shared/permissions";

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireCapability(capability: Capability) {
  const user = await requireAuth();
  if (!roleHasCapability(user.role, capability)) redirect("/dashboard");
  return user;
}

export async function requireRole(...roles: AppRole[]) {
  const user = await requireAuth();
  if (!roles.includes(user.role)) redirect("/dashboard");
  return user;
}
