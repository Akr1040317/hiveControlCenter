import "server-only";

import Stripe from "stripe";

let cachedStripe: Stripe | null = null;

export function getStripeClient() {
  if (cachedStripe) {
    return cachedStripe;
  }

  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!apiKey) {
    throw new Error("STRIPE_NOT_CONFIGURED");
  }

  cachedStripe = new Stripe(apiKey);
  return cachedStripe;
}

export async function getStripeHealth() {
  try {
    const stripe = getStripeClient();
    const balance = await stripe.balance.retrieve();
    return {
      connected: true,
      accountId: null,
      accountEmail: null,
      livemode: balance.livemode,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      connected: false,
      accountId: null,
      accountEmail: null,
      livemode: false,
      error: message,
    };
  }
}

export async function getStripeRevenueLast30DaysCents() {
  const stripe = getStripeClient();
  const cutoffUnix = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);

  let totalCents = 0;
  const iterator = stripe.paymentIntents.list({
    created: { gte: cutoffUnix },
    limit: 100,
  });

  for await (const intent of iterator) {
    if (intent.status === "succeeded") {
      totalCents += intent.amount_received ?? 0;
    }
  }

  return totalCents;
}
