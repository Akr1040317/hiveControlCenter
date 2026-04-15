"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithPopup } from "firebase/auth";

import { getFirebaseAuth, getGoogleProvider } from "@/lib/firebase/client";

export default function SignInPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const credential = await signInWithPopup(
        getFirebaseAuth(),
        getGoogleProvider(),
      );
      const idToken = await credential.user.getIdToken();

      const response = await fetch("/api/auth/session", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ idToken }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Unable to create admin session.");
      }

      router.replace("/dashboard");
      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Unexpected sign-in error. Please retry.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <section className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
          Hive Control Center
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900">
          Sign in with Google
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          Access is limited to allowlisted admins on the beeapp Firebase
          project.
        </p>

        {error ? (
          <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="mt-5 w-full rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
        >
          {isLoading ? "Signing in..." : "Continue with Google"}
        </button>
      </section>
    </main>
  );
}
