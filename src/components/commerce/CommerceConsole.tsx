"use client";

import { FormEvent, useEffect, useState } from "react";

import { getCsrfToken } from "@/lib/client/csrf";

type StripeHealth = {
  connected: boolean;
  livemode: boolean;
  accountId: string | null;
  accountEmail: string | null;
  error?: string;
};

type WebhookHealth = {
  configured: boolean;
  latestReceivedAt: string | null;
  latestEventType: string | null;
  events24h: number;
  failed24h: number;
  stale: boolean;
  warning?: string;
};

type StripeCustomer = {
  id: string;
  email: string | null;
  name: string | null;
  created: string;
  livemode: boolean;
};

type SyncCheck = {
  inSync: boolean;
  expectedAppStatus: string;
  reasons: string[];
  user: {
    uid: string;
    email: string | null;
    subscriptionStatus: string | null;
    stripeCustomerId: string | null;
    stripeSubscriptionStatus: string | null;
    billingInterval: string | null;
  };
  stripeSubscription: {
    id: string;
    status: string;
    interval: string | null;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
  } | null;
};

type PaymentFailure = {
  id: string;
  created: string;
  amount: number;
  currency: string;
  customerId: string | null;
  customerEmail: string | null;
  status: string;
  errorCode: string | null;
  errorMessage: string | null;
};

export function CommerceConsole({ initialHealth }: { initialHealth: StripeHealth }) {
  const [stripeHealth, setStripeHealth] = useState<StripeHealth>(initialHealth);
  const [webhookHealth, setWebhookHealth] = useState<WebhookHealth | null>(null);

  const [customerQuery, setCustomerQuery] = useState("");
  const [customers, setCustomers] = useState<StripeCustomer[]>([]);
  const [customerError, setCustomerError] = useState<string | null>(null);
  const [isSearchingCustomers, setIsSearchingCustomers] = useState(false);

  const [syncIdentifier, setSyncIdentifier] = useState("");
  const [syncCheck, setSyncCheck] = useState<SyncCheck | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isCheckingSync, setIsCheckingSync] = useState(false);

  const [resyncIdentifier, setResyncIdentifier] = useState("");
  const [resyncReason, setResyncReason] = useState("");
  const [resyncMessage, setResyncMessage] = useState<string | null>(null);
  const [isResyncing, setIsResyncing] = useState(false);

  const [failureDays, setFailureDays] = useState(14);
  const [failures, setFailures] = useState<PaymentFailure[]>([]);
  const [isLoadingFailures, setIsLoadingFailures] = useState(false);
  const [failureError, setFailureError] = useState<string | null>(null);

  async function refreshStripeHealth() {
    const response = await fetch("/api/integrations/stripe/health");
    const payload = (await response.json()) as StripeHealth & { error?: string };
    if (response.ok) {
      setStripeHealth(payload);
    }
  }

  async function loadWebhookHealth() {
    const response = await fetch("/api/commerce/stripe/webhook-health");
    const payload = (await response.json()) as WebhookHealth;
    if (response.ok) {
      setWebhookHealth(payload);
    }
  }

  async function loadFailures(days = failureDays) {
    setIsLoadingFailures(true);
    setFailureError(null);
    try {
      const response = await fetch(`/api/commerce/stripe/payment-failures?days=${days}`);
      const payload = (await response.json()) as {
        error?: string;
        failures?: PaymentFailure[];
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load payment failures");
      }
      setFailures(payload.failures ?? []);
    } catch (error) {
      setFailureError(
        error instanceof Error ? error.message : "Failed to load payment failures",
      );
    } finally {
      setIsLoadingFailures(false);
    }
  }

  useEffect(() => {
    void loadWebhookHealth();
    void loadFailures();
  }, []);

  const handleCustomerSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSearchingCustomers(true);
    setCustomerError(null);
    try {
      const params = new URLSearchParams();
      if (customerQuery.trim()) {
        params.set("q", customerQuery.trim());
      }
      const response = await fetch(`/api/commerce/stripe/customer-lookup?${params.toString()}`);
      const payload = (await response.json()) as {
        error?: string;
        customers?: StripeCustomer[];
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "Customer lookup failed");
      }
      setCustomers(payload.customers ?? []);
    } catch (error) {
      setCustomerError(error instanceof Error ? error.message : "Customer lookup failed");
    } finally {
      setIsSearchingCustomers(false);
    }
  };

  const handleSyncCheck = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsCheckingSync(true);
    setSyncError(null);
    setSyncCheck(null);
    try {
      const params = new URLSearchParams({ identifier: syncIdentifier.trim() });
      const response = await fetch(`/api/commerce/stripe/sync-check?${params.toString()}`);
      const payload = (await response.json()) as SyncCheck & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Sync check failed");
      }
      setSyncCheck(payload);
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : "Sync check failed");
    } finally {
      setIsCheckingSync(false);
    }
  };

  const handleResync = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsResyncing(true);
    setResyncMessage(null);
    try {
      const response = await fetch("/api/commerce/stripe/resync", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-csrf-token": await getCsrfToken(),
        },
        body: JSON.stringify({
          identifier: resyncIdentifier.trim(),
          reason: resyncReason.trim(),
        }),
      });
      const payload = (await response.json()) as {
        error?: string;
        user?: { uid: string; subscriptionStatus: string; stripeSubscriptionStatus: string | null };
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "Resync failed");
      }
      setResyncMessage(
        `Resync complete for ${payload.user?.uid}. App status: ${payload.user?.subscriptionStatus}, Stripe status: ${payload.user?.stripeSubscriptionStatus ?? "none"}.`,
      );
      await refreshStripeHealth();
      await loadFailures();
    } catch (error) {
      setResyncMessage(error instanceof Error ? error.message : "Resync failed");
    } finally {
      setIsResyncing(false);
    }
  };

  return (
    <section className="space-y-6">
      <article className="hive-card p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-medium text-white">Stripe health</h2>
          <button
            type="button"
            onClick={() => void refreshStripeHealth()}
            className="hive-secondary-btn px-3 py-1.5 text-xs"
          >
            Refresh
          </button>
        </div>
        <p className="mt-2 text-sm text-[#dcdcef]">
          API status:{" "}
          {stripeHealth.connected
            ? stripeHealth.livemode
              ? "Connected (live)"
              : "Connected (test)"
            : "Not connected"}
        </p>
        <p className="mt-1 text-xs text-[#a4a4be]">
          {stripeHealth.connected
            ? "Stripe key is valid and API calls are succeeding."
            : stripeHealth.error ?? "Set STRIPE_SECRET_KEY."}
        </p>
        <div className="mt-3 rounded-md border border-[#2a2a46] bg-[#17172a] p-3">
          <h3 className="text-xs font-medium uppercase tracking-wide text-[#9b9bb4]">
            Webhook health
          </h3>
          {webhookHealth ? (
            <div className="mt-2 grid gap-1 text-xs text-[#dcdcef]">
              <p>Configured: {webhookHealth.configured ? "Yes" : "No (set STRIPE_WEBHOOK_SECRET)"}</p>
              <p>Latest event: {webhookHealth.latestEventType ?? "—"}</p>
              <p>Latest received: {webhookHealth.latestReceivedAt ? new Date(webhookHealth.latestReceivedAt).toLocaleString() : "—"}</p>
              <p>Events (24h): {webhookHealth.events24h}</p>
              <p>Failed (24h): {webhookHealth.failed24h}</p>
              <p>Stale: {webhookHealth.stale ? "Yes" : "No"}</p>
              {webhookHealth.warning ? <p className="text-[#d7a75f]">{webhookHealth.warning}</p> : null}
            </div>
          ) : (
            <p className="mt-2 text-xs text-[#a4a4be]">Loading webhook health...</p>
          )}
        </div>
      </article>

      <article className="hive-card p-4">
        <h2 className="text-base font-medium text-white">Customer lookup</h2>
        <form className="mt-3 flex flex-wrap items-center gap-2" onSubmit={handleCustomerSearch}>
          <input
            value={customerQuery}
            onChange={(event) => setCustomerQuery(event.target.value)}
            placeholder="Email, customer id (cus_), or name"
            className="hive-input min-w-72 px-3 py-2 text-sm"
            required
          />
          <button
            type="submit"
            disabled={isSearchingCustomers}
            className="hive-primary-btn px-4 py-2 text-sm disabled:opacity-50"
          >
            {isSearchingCustomers ? "Searching..." : "Lookup"}
          </button>
        </form>
        {customerError ? <p className="mt-2 text-sm text-red-400">{customerError}</p> : null}
        {customers.length ? (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-[#bbbcd1]">
                <tr>
                  <th className="pb-2">Customer</th>
                  <th className="pb-2">Name</th>
                  <th className="pb-2">Email</th>
                  <th className="pb-2">Created</th>
                  <th className="pb-2">Mode</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.id} className="border-t border-[#2a2a46]">
                    <td className="py-2 font-mono text-xs text-[#dcdcef]">{customer.id}</td>
                    <td className="py-2 text-[#ececff]">{customer.name ?? "—"}</td>
                    <td className="py-2 text-[#ececff]">{customer.email ?? "—"}</td>
                    <td className="py-2 text-[#a4a4be]">{new Date(customer.created).toLocaleString()}</td>
                    <td className="py-2 text-[#a4a4be]">{customer.livemode ? "live" : "test"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </article>

      <article className="hive-card p-4">
        <h2 className="text-base font-medium text-white">Subscription sync check</h2>
        <form className="mt-3 flex flex-wrap items-center gap-2" onSubmit={handleSyncCheck}>
          <input
            value={syncIdentifier}
            onChange={(event) => setSyncIdentifier(event.target.value)}
            placeholder="User UID or email"
            className="hive-input min-w-72 px-3 py-2 text-sm"
            required
          />
          <button
            type="submit"
            disabled={isCheckingSync}
            className="hive-secondary-btn px-4 py-2 text-sm disabled:opacity-50"
          >
            {isCheckingSync ? "Checking..." : "Run check"}
          </button>
        </form>
        {syncError ? <p className="mt-2 text-sm text-red-400">{syncError}</p> : null}
        {syncCheck ? (
          <div className="mt-3 rounded-md border border-[#2a2a46] bg-[#17172a] p-3">
            <p className="text-sm text-[#ececff]">
              Sync status:{" "}
              <span className={syncCheck.inSync ? "text-green-400" : "text-yellow-400"}>
                {syncCheck.inSync ? "In sync" : "Out of sync"}
              </span>
            </p>
            <p className="mt-1 text-xs text-[#a4a4be]">
              Expected app status from Stripe: {syncCheck.expectedAppStatus}
            </p>
            <div className="mt-2 grid gap-1 text-xs text-[#dcdcef]">
              <p>User UID: {syncCheck.user.uid}</p>
              <p>User email: {syncCheck.user.email ?? "—"}</p>
              <p>App subscriptionStatus: {syncCheck.user.subscriptionStatus ?? "—"}</p>
              <p>Stripe customer id: {syncCheck.user.stripeCustomerId ?? "—"}</p>
              <p>Stripe subscription status (saved): {syncCheck.user.stripeSubscriptionStatus ?? "—"}</p>
              <p>Billing interval (saved): {syncCheck.user.billingInterval ?? "—"}</p>
            </div>
            {syncCheck.stripeSubscription ? (
              <div className="mt-2 rounded border border-[#2a2a46] bg-[#121220] p-2 text-xs text-[#dcdcef]">
                <p>Stripe subscription: {syncCheck.stripeSubscription.id}</p>
                <p>Status: {syncCheck.stripeSubscription.status}</p>
                <p>Interval: {syncCheck.stripeSubscription.interval ?? "—"}</p>
                <p>Current period end: {new Date(syncCheck.stripeSubscription.currentPeriodEnd).toLocaleString()}</p>
                <p>Cancel at period end: {syncCheck.stripeSubscription.cancelAtPeriodEnd ? "Yes" : "No"}</p>
              </div>
            ) : null}
            {syncCheck.reasons.length ? (
              <ul className="mt-2 space-y-1 text-xs text-[#d7a75f]">
                {syncCheck.reasons.map((reason) => (
                  <li key={reason}>- {reason}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </article>

      <article className="hive-card p-4">
        <h2 className="text-base font-medium text-white">One-click billing resync</h2>
        <p className="mt-1 text-xs text-[#a4a4be]">
          Pulls latest Stripe customer/subscription state and rewrites billing fields on the user document.
        </p>
        <form className="mt-3 grid gap-2 md:grid-cols-2" onSubmit={handleResync}>
          <input
            value={resyncIdentifier}
            onChange={(event) => setResyncIdentifier(event.target.value)}
            placeholder="User UID or email"
            className="hive-input px-3 py-2 text-sm"
            required
          />
          <input
            value={resyncReason}
            onChange={(event) => setResyncReason(event.target.value)}
            placeholder="Reason for resync (audit log)"
            className="hive-input px-3 py-2 text-sm"
            required
          />
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={isResyncing}
              className="hive-primary-btn px-4 py-2 text-sm disabled:opacity-50"
            >
              {isResyncing ? "Resyncing..." : "Resync user billing from Stripe"}
            </button>
          </div>
        </form>
        {resyncMessage ? <p className="mt-2 text-sm text-[#dcdcef]">{resyncMessage}</p> : null}
      </article>

      <article className="hive-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-medium text-white">Payment failure queue</h2>
          <div className="flex items-center gap-2">
            <select
              value={failureDays}
              onChange={(event) => {
                const nextDays = Number(event.target.value);
                setFailureDays(nextDays);
                void loadFailures(nextDays);
              }}
              className="hive-input px-2 py-1 text-xs"
            >
              <option value={7}>Last 7 days</option>
              <option value={14}>Last 14 days</option>
              <option value={30}>Last 30 days</option>
              <option value={60}>Last 60 days</option>
            </select>
            <button
              type="button"
              onClick={() => void loadFailures()}
              className="hive-secondary-btn px-3 py-1.5 text-xs"
            >
              Refresh
            </button>
          </div>
        </div>
        {failureError ? <p className="mt-2 text-sm text-red-400">{failureError}</p> : null}
        {isLoadingFailures ? (
          <p className="mt-2 text-sm hive-subtle">Loading failures...</p>
        ) : failures.length ? (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-[#bbbcd1]">
                <tr>
                  <th className="pb-2">Payment Intent</th>
                  <th className="pb-2">Created</th>
                  <th className="pb-2">Amount</th>
                  <th className="pb-2">Customer</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Error</th>
                </tr>
              </thead>
              <tbody>
                {failures.map((failure) => (
                  <tr key={failure.id} className="border-t border-[#2a2a46]">
                    <td className="py-2 font-mono text-xs text-[#dcdcef]">{failure.id}</td>
                    <td className="py-2 text-[#a4a4be]">{new Date(failure.created).toLocaleString()}</td>
                    <td className="py-2 text-[#ececff]">
                      {(failure.amount / 100).toFixed(2)} {failure.currency.toUpperCase()}
                    </td>
                    <td className="py-2 text-[#ececff]">
                      <div>{failure.customerEmail ?? "—"}</div>
                      <div className="text-xs text-[#a4a4be]">{failure.customerId ?? "—"}</div>
                    </td>
                    <td className="py-2 text-[#d7a75f]">{failure.status}</td>
                    <td className="py-2 text-xs text-red-300">
                      {failure.errorCode ?? "unknown"} {failure.errorMessage ? `- ${failure.errorMessage}` : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-2 text-sm text-[#a4a4be]">No payment failures in selected window.</p>
        )}
      </article>
    </section>
  );
}
