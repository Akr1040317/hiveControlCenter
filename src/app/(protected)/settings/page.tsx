import { getAllowlistedEmails } from "@/lib/auth/allowlist";

export default function SettingsPage() {
  const allowlist = getAllowlistedEmails();

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-white">Settings</h1>
        <p className="text-sm hive-subtle">
          Environment and security controls for the admin center.
        </p>
      </div>

      <article className="hive-card p-4">
        <h2 className="font-medium text-white">Current allowlisted emails</h2>
        <ul className="mt-2 space-y-1 text-sm text-[#ddddef]">
          {allowlist.map((email) => (
            <li key={email}>{email}</li>
          ))}
        </ul>
      </article>
    </section>
  );
}
