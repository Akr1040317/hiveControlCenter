import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <section className="hive-panel w-full max-w-md p-6">
        <h1 className="text-2xl font-semibold text-white">Unauthorized</h1>
        <p className="mt-2 text-sm text-[#d1d1e4]">
          This Google account is not allowlisted for Hive Control Center.
        </p>
        <Link
          href="/sign-in"
          className="hive-primary-btn mt-5 inline-flex px-4 py-2 text-sm"
        >
          Try another account
        </Link>
      </section>
    </main>
  );
}
