import { getStripeHealth } from "@/lib/integrations/stripe";

export default async function CommercePage() {
  const stripe = await getStripeHealth();

  return (
    <section className="space-y-3">
      <h1 className="text-2xl font-semibold text-white">Commerce</h1>
      <p className="text-sm hive-subtle">
        Stripe subscription diagnostics and billing-safe actions will be added
        behind audited mutation routes.
      </p>
      <article className="hive-card p-4">
        <h2 className="text-base font-medium text-white">Stripe connection</h2>
        <p className="mt-2 text-sm text-[#dcdcef]">
          Status:{" "}
          {stripe.connected
            ? stripe.livemode
              ? "Connected (live)"
              : "Connected (test)"
            : "Not connected"}
        </p>
        {stripe.connected ? (
          <p className="mt-1 text-xs text-[#a4a4be]">
            Account: {stripe.accountId} {stripe.accountEmail ? `(${stripe.accountEmail})` : ""}
          </p>
        ) : (
          <p className="mt-1 text-xs text-[#a4a4be]">
            {stripe.error || "Set STRIPE_SECRET_KEY in environment variables."}
          </p>
        )}
      </article>
    </section>
  );
}
