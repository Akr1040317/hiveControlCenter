import { getStripeHealth } from "@/lib/integrations/stripe";
import { CommerceConsole } from "@/components/commerce/CommerceConsole";

export default async function CommercePage() {
  const stripe = await getStripeHealth();

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold text-white">Commerce</h1>
      <p className="text-sm hive-subtle">
        Stripe billing diagnostics, sync validation, and safe admin actions.
      </p>
      <CommerceConsole initialHealth={stripe} />
    </section>
  );
}
