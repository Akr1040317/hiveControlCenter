import type { ReactNode } from "react";

import { requireAdminSession } from "@/lib/auth/guards";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { SignOutButton } from "@/components/auth/SignOutButton";

type ProtectedLayoutProps = {
  children: ReactNode;
};

export default async function ProtectedLayout({
  children,
}: ProtectedLayoutProps) {
  const session = await requireAdminSession();

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <AppSidebar />
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-[#1e1e34] bg-[#121220] px-5 py-3">
          <div>
            <p className="hive-section-label">
              Signed in
            </p>
            <p className="text-sm font-medium text-[#ececff]">{session.email}</p>
          </div>
          <SignOutButton />
        </header>
        <main className="flex-1 p-5">{children}</main>
      </div>
    </div>
  );
}
