"use client";

import { useState } from "react";
import { signOut } from "firebase/auth";

import { getFirebaseAuth } from "@/lib/firebase/client";

export function SignOutButton() {
  const [isLoading, setIsLoading] = useState(false);

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      await signOut(getFirebaseAuth());
      window.location.href = "/sign-in";
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={isLoading}
      className="rounded-md border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
    >
      {isLoading ? "Signing out..." : "Sign out"}
    </button>
  );
}
