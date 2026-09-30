import type { Metadata } from "next";
import { requireCapability } from "@/lib/auth/require-role";
import { requireAuth } from "@/lib/auth/require-role";
import { listUsers } from "@/lib/data/users.repository";
import { UsersClient } from "@/components/features/users/users-client";

export const metadata: Metadata = { title: "Usuarios" };

export default async function UsersPage() {
  await requireCapability("manageUsers");
  const [users, current] = await Promise.all([listUsers(), requireAuth()]);

  return <UsersClient users={users} currentUserId={current.id} />;
}
