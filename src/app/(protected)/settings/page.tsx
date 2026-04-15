import { getAllowlistedEmails } from "@/lib/auth/allowlist";

export default function SettingsPage() {
  const allowlist = getAllowlistedEmails();

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Settings</h1>
        <p className="text-sm text-zinc-600">
          Environment and security controls for the admin center.
        </p>
      </div>

      <article className="rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="font-medium text-zinc-900">Current allowlisted emails</h2>
        <ul className="mt-2 space-y-1 text-sm text-zinc-700">
          {allowlist.map((email) => (
            <li key={email}>{email}</li>
          ))}
        </ul>
      </article>
    </section>
  );
}
