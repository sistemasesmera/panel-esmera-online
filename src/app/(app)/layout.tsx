import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { signOut } from "@/lib/auth/sign-out";
import { AppSidebar } from "@/components/features/sidebar/app-sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="flex h-screen overflow-hidden bg-[#f0f4f8]">
      <AppSidebar role={user.role} userName={user.fullName} signOut={signOut} />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 lg:p-8 max-w-[1600px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
