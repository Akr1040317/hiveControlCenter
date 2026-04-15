import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <section className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-900">Unauthorized</h1>
        <p className="mt-2 text-sm text-zinc-600">
          This Google account is not allowlisted for Hive Control Center.
        </p>
        <Link
          href="/sign-in"
          className="mt-5 inline-flex rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
        >
          Try another account
        </Link>
      </section>
    </main>
  );
}
