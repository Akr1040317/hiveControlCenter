"use client";

import { useState } from "react";
import { signOut } from "firebase/auth";

import { getFirebaseAuth } from "@/lib/firebase/client";
import { getCsrfToken } from "@/lib/client/csrf";

export function SignOutButton() {
  const [isLoading, setIsLoading] = useState(false);

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      const csrfToken = await getCsrfToken();
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          "x-csrf-token": csrfToken,
        },
      });
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
      className="hive-secondary-btn px-3 py-2 text-sm font-medium disabled:opacity-50"
    >
      {isLoading ? "Signing out..." : "Sign out"}
    </button>
  );
}
