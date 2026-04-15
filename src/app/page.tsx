import { redirect } from "next/navigation";

import { getAdminSession } from "@/lib/auth/guards";

export default async function Home() {
  const session = await getAdminSession();
  if (session) {
    redirect("/dashboard");
  }
  redirect("/sign-in");
}
