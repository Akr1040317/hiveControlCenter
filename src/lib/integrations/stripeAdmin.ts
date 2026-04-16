import "server-only";

import { FieldValue, Timestamp } from "firebase-admin/firestore";
import Stripe from "stripe";

import { getAdminDb } from "@/lib/firebase/admin";
import { getStripeClient } from "@/lib/integrations/stripe";

type UserBillingRecord = {
  uid: string;
  email: string | null;
  displayName: string | null;
  status: string | null;
  tier: string | null;
  subscriptionStatus: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripeSubscriptionStatus: string | null;
  billingInterval: string | null;
  currentPeriodEnd: string | null;
};

type StripeCustomerSummary = {
  id: string;
  email: string | null;
  name: string | null;
  created: string;
  livemode: boolean;
};

function toUserBillingRecord(
  uid: string,
  data: Record<string, unknown>,
): UserBillingRecord {
  return {
    uid,
    email: (data.email as string | null) ?? null,
    displayName: (data.displayName as string | null) ?? null,
    status: (data.status as string | null) ?? null,
    tier: (data.tier as string | null) ?? null,
    subscriptionStatus: (data.subscriptionStatus as string | null) ?? null,
    stripeCustomerId: (data.stripeCustomerId as string | null) ?? null,
    stripeSubscriptionId: (data.stripeSubscriptionId as string | null) ?? null,
    stripeSubscriptionStatus:
      (data.stripeSubscriptionStatus as string | null) ?? null,
    billingInterval: (data.billingInterval as string | null) ?? null,
    currentPeriodEnd:
      (data.currentPeriodEnd as string | null) ??
      (data.subscriptionCurrentPeriodEnd as string | null) ??
      null,
  };
}

function toStripeCustomerSummary(
  customer: Stripe.Customer | Stripe.DeletedCustomer,
): StripeCustomerSummary {
  if (customer.deleted) {
    return {
      id: customer.id,
      email: null,
      name: null,
      created: new Date().toISOString(),
      livemode: false,
    };
  }

  return {
    id: customer.id,
    email: customer.email ?? null,
    name: customer.name ?? null,
    created: new Date(customer.created * 1000).toISOString(),
    livemode: customer.livemode,
  };
}

function deriveAppSubscriptionStatus(
  stripeStatus: string | null,
): "active" | "free" {
  if (!stripeStatus) {
    return "free";
  }
  if (["active", "trialing", "past_due", "unpaid"].includes(stripeStatus)) {
    return "active";
  }
  return "free";
}

async function getUserByIdentifier(identifier: string) {
  const db = getAdminDb();
  const value = identifier.trim().toLowerCase();
  if (!value) {
    return null;
  }

  const direct = await db.collection("users").doc(value).get();
  if (direct.exists) {
    return toUserBillingRecord(
      direct.id,
      (direct.data() as Record<string, unknown>) ?? {},
    );
  }

  const byEmail = await db
    .collection("users")
    .where("email", "==", value)
    .limit(1)
    .get();
  if (byEmail.empty) {
    return null;
  }

  const doc = byEmail.docs[0];
  return toUserBillingRecord(doc.id, (doc.data() as Record<string, unknown>) ?? {});
}

export async function lookupStripeCustomers(query: string) {
  const stripe = getStripeClient();
  const value = query.trim();
  if (!value) {
    return [];
  }

  if (value.startsWith("cus_")) {
    const customer = await stripe.customers.retrieve(value);
    if (customer.deleted) {
      return [];
    }
    return [toStripeCustomerSummary(customer)];
  }

  if (value.includes("@")) {
    const list = await stripe.customers.list({ email: value, limit: 20 });
    return list.data.map((customer) => toStripeCustomerSummary(customer));
  }

  const list = await stripe.customers.list({ limit: 100 });
  const normalized = value.toLowerCase();
  return list.data
    .filter((customer) => {
      const email = (customer.email ?? "").toLowerCase();
      const name = (customer.name ?? "").toLowerCase();
      return (
        customer.id.toLowerCase().includes(normalized) ||
        email.includes(normalized) ||
        name.includes(normalized)
      );
    })
    .slice(0, 20)
    .map((customer) => toStripeCustomerSummary(customer));
}

export async function getStripeSubscriptionSyncCheck(identifier: string) {
  const stripe = getStripeClient();
  const user = await getUserByIdentifier(identifier);
  if (!user) {
    throw new Error("USER_NOT_FOUND");
  }

  let customerId = user.stripeCustomerId;
  if (!customerId && user.email) {
    const byEmail = await stripe.customers.list({ email: user.email, limit: 1 });
    customerId = byEmail.data[0]?.id ?? null;
  }

  if (!customerId) {
    return {
      user,
      customer: null,
      stripeSubscription: null,
      expectedAppStatus: "free",
      inSync: user.subscriptionStatus === "free" || !user.subscriptionStatus,
      reasons: ["No Stripe customer was found for this user."],
    };
  }

  const customerRaw = await stripe.customers.retrieve(customerId);
  if (customerRaw.deleted) {
    return {
      user,
      customer: null,
      stripeSubscription: null,
      expectedAppStatus: "free",
      inSync: user.subscriptionStatus === "free" || !user.subscriptionStatus,
      reasons: ["Stripe customer record is deleted."],
    };
  }

  const subs = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 20,
  });
  const ranked = subs.data.sort((a, b) => b.created - a.created);
  const current =
    ranked.find((sub) =>
      ["active", "trialing", "past_due", "unpaid"].includes(sub.status),
    ) ?? ranked[0] ?? null;

  const stripeStatus = current?.status ?? null;
  const expectedAppStatus = deriveAppSubscriptionStatus(stripeStatus);
  const reasons: string[] = [];

  if ((user.subscriptionStatus ?? "free") !== expectedAppStatus) {
    reasons.push(
      `User subscriptionStatus is "${user.subscriptionStatus ?? "unset"}" but Stripe suggests "${expectedAppStatus}".`,
    );
  }
  if ((user.stripeCustomerId ?? null) !== customerId) {
    reasons.push("User stripeCustomerId does not match Stripe customer record.");
  }
  if ((user.stripeSubscriptionStatus ?? null) !== stripeStatus) {
    reasons.push(
      `User stripeSubscriptionStatus is "${user.stripeSubscriptionStatus ?? "unset"}" but Stripe is "${stripeStatus ?? "none"}".`,
    );
  }

  const interval =
    current?.items.data[0]?.price.recurring?.interval ??
    (user.billingInterval as string | null);
  if ((user.billingInterval ?? null) !== (interval ?? null)) {
    reasons.push("User billingInterval does not match active Stripe subscription.");
  }

  return {
    user,
    customer: toStripeCustomerSummary(customerRaw),
    stripeSubscription: current
      ? (() => {
          const currentPeriodEndUnix = (current as unknown as Record<string, unknown>)
            .current_period_end as number | undefined;
          return {
            id: current.id,
            status: current.status,
            currentPeriodEnd: currentPeriodEndUnix
              ? new Date(currentPeriodEndUnix * 1000).toISOString()
              : null,
            interval: current.items.data[0]?.price.recurring?.interval ?? null,
            cancelAtPeriodEnd: current.cancel_at_period_end,
          };
        })()
      : null,
    expectedAppStatus,
    inSync: reasons.length === 0,
    reasons,
  };
}

export async function listStripePaymentFailures(days = 14) {
  const stripe = getStripeClient();
  const cutoff = Math.floor((Date.now() - days * 24 * 60 * 60 * 1000) / 1000);
  const failures: Array<{
    id: string;
    created: string;
    amount: number;
    currency: string;
    customerId: string | null;
    customerEmail: string | null;
    status: string;
    errorCode: string | null;
    errorMessage: string | null;
  }> = [];

  const iterator = stripe.paymentIntents.list({
    created: { gte: cutoff },
    limit: 100,
  });

  for await (const intent of iterator) {
    const failed =
      intent.status === "requires_payment_method" ||
      intent.status === "canceled" ||
      Boolean(intent.last_payment_error);
    if (!failed) {
      continue;
    }

    let customerEmail: string | null = null;
    let customerId: string | null = null;
    if (typeof intent.customer === "string") {
      customerId = intent.customer;
      try {
        const customer = await stripe.customers.retrieve(intent.customer);
        if (!customer.deleted) {
          customerEmail = customer.email ?? null;
        }
      } catch {
        customerEmail = null;
      }
    }

    failures.push({
      id: intent.id,
      created: new Date(intent.created * 1000).toISOString(),
      amount: intent.amount ?? 0,
      currency: intent.currency,
      customerId,
      customerEmail,
      status: intent.status,
      errorCode: intent.last_payment_error?.code ?? null,
      errorMessage: intent.last_payment_error?.message ?? null,
    });

    if (failures.length >= 50) {
      break;
    }
  }

  return failures;
}

export async function getStripeWebhookHealth() {
  const db = getAdminDb();
  const configured = Boolean(process.env.STRIPE_WEBHOOK_SECRET);
  const cutoff = Timestamp.fromDate(new Date(Date.now() - 24 * 60 * 60 * 1000));

  try {
    const [latestSnap, count24hSnap, failed24hSnap] = await Promise.all([
      db.collection("stripeWebhookEvents").orderBy("receivedAt", "desc").limit(1).get(),
      db
        .collection("stripeWebhookEvents")
        .where("receivedAt", ">=", cutoff)
        .count()
        .get(),
      db
        .collection("stripeWebhookEvents")
        .where("receivedAt", ">=", cutoff)
        .where("status", "==", "failed")
        .count()
        .get(),
    ]);

    const latestDoc = latestSnap.docs[0];
    const latestData = latestDoc?.data() as Record<string, unknown> | undefined;
    const receivedAtRaw = latestData?.receivedAt as
      | { toDate?: () => Date }
      | undefined;
    const latestReceivedAt = receivedAtRaw?.toDate
      ? receivedAtRaw.toDate().toISOString()
      : null;

    return {
      configured,
      source: "stripeWebhookEvents",
      latestReceivedAt,
      latestEventType: (latestData?.eventType as string | null) ?? null,
      events24h: count24hSnap.data().count,
      failed24h: failed24hSnap.data().count,
      stale:
        latestReceivedAt === null
          ? true
          : Date.now() - new Date(latestReceivedAt).getTime() > 6 * 60 * 60 * 1000,
    };
  } catch {
    return {
      configured,
      source: "stripeWebhookEvents",
      latestReceivedAt: null,
      latestEventType: null,
      events24h: 0,
      failed24h: 0,
      stale: true,
      warning:
        "Webhook event telemetry unavailable. Ensure stripeWebhookEvents is populated.",
    };
  }
}

export async function resyncUserBillingState(input: {
  identifier: string;
  reason: string;
  actorUid: string;
  actorEmail: string;
}) {
  const db = getAdminDb();
  const stripe = getStripeClient();
  const user = await getUserByIdentifier(input.identifier);
  if (!user) {
    throw new Error("USER_NOT_FOUND");
  }

  let customerId = user.stripeCustomerId;
  if (!customerId && user.email) {
    const byEmail = await stripe.customers.list({ email: user.email, limit: 1 });
    customerId = byEmail.data[0]?.id ?? null;
  }

  let subscriptionId: string | null = null;
  let subscriptionStatus: string | null = null;
  let billingInterval: string | null = user.billingInterval;
  let currentPeriodEnd: string | null = null;

  if (customerId) {
    const subs = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 20,
    });
    const ranked = subs.data.sort((a, b) => b.created - a.created);
    const current =
      ranked.find((sub) =>
        ["active", "trialing", "past_due", "unpaid"].includes(sub.status),
      ) ?? ranked[0] ?? null;

    if (current) {
      subscriptionId = current.id;
      subscriptionStatus = current.status;
      billingInterval = current.items.data[0]?.price.recurring?.interval ?? null;
      const currentPeriodEndUnix = (current as unknown as Record<string, unknown>)
        .current_period_end as number | undefined;
      currentPeriodEnd = currentPeriodEndUnix
        ? new Date(currentPeriodEndUnix * 1000).toISOString()
        : null;
    }
  }

  const appSubscriptionStatus = deriveAppSubscriptionStatus(subscriptionStatus);
  const userRef = db.collection("users").doc(user.uid);
  await userRef.set(
    {
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      stripeSubscriptionStatus: subscriptionStatus,
      subscriptionStatus: appSubscriptionStatus,
      billingInterval: billingInterval ?? null,
      subscriptionCurrentPeriodEnd: currentPeriodEnd,
      billingLastSyncedAt: FieldValue.serverTimestamp(),
      billingLastSyncedBy: input.actorUid,
      billingLastSyncedByEmail: input.actorEmail,
      billingSyncReason: input.reason,
      lastUpdated: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  return {
    uid: user.uid,
    email: user.email,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscriptionId,
    stripeSubscriptionStatus: subscriptionStatus,
    subscriptionStatus: appSubscriptionStatus,
    billingInterval: billingInterval ?? null,
    currentPeriodEnd,
  };
}
