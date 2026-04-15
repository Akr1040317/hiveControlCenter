"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type AdminRole =
  | "super_admin"
  | "ops_admin"
  | "marketing_admin"
  | "support_admin"
  | "finance_admin"
  | "viewer";
type AdminStatus = "active" | "suspended";

type AdminUser = {
  uid: string;
  email: string;
  displayName: string | null;
  role: AdminRole;
  status: AdminStatus;
  lastLoginAt?: string | null;
};

const roleOptions: AdminRole[] = [
  "super_admin",
  "ops_admin",
  "marketing_admin",
  "support_admin",
  "finance_admin",
  "viewer",
];

export default function UsersPage() {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<AdminRole | "all">("all");
  const [statusFilter, setStatusFilter] = useState<AdminStatus | "all">("all");

  const [formState, setFormState] = useState({
    uid: "",
    email: "",
    displayName: "",
    role: "viewer" as AdminRole,
    status: "active" as AdminStatus,
    reason: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const searchParams = useMemo(() => {
    const params = new URLSearchParams();
    if (query.trim()) {
      params.set("q", query.trim());
    }
    if (roleFilter !== "all") {
      params.set("role", roleFilter);
    }
    if (statusFilter !== "all") {
      params.set("status", statusFilter);
    }
    return params.toString();
  }, [query, roleFilter, statusFilter]);

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/users/search?${searchParams}`);
      const payload = (await response.json()) as {
        users?: AdminUser[];
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load users");
      }
      setUsers(payload.users ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setIsLoading(false);
    }
  }, [searchParams]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const handleGrantAccess = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaveMessage(null);
    setIsSaving(true);

    try {
      const response = await fetch("/api/users/grant-access", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(formState),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to save admin access");
      }

      setSaveMessage("Admin access updated.");
      setFormState({
        uid: "",
        email: "",
        displayName: "",
        role: "viewer",
        status: "active",
        reason: "",
      });
      await loadUsers();
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : "Request failed");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Users & Access</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Manage `adminUsers` access, roles, and status for the control center.
        </p>
      </div>

      <article className="rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="text-base font-medium text-zinc-900">
          Grant or update admin access
        </h2>
        <form className="mt-3 grid gap-3 md:grid-cols-2" onSubmit={handleGrantAccess}>
          <input
            value={formState.uid}
            onChange={(event) =>
              setFormState((prev) => ({ ...prev, uid: event.target.value }))
            }
            placeholder="Firebase UID"
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
            required
          />
          <input
            value={formState.email}
            onChange={(event) =>
              setFormState((prev) => ({ ...prev, email: event.target.value }))
            }
            placeholder="Email"
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
            type="email"
            required
          />
          <input
            value={formState.displayName}
            onChange={(event) =>
              setFormState((prev) => ({
                ...prev,
                displayName: event.target.value,
              }))
            }
            placeholder="Display name (optional)"
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
          <select
            value={formState.role}
            onChange={(event) =>
              setFormState((prev) => ({
                ...prev,
                role: event.target.value as AdminRole,
              }))
            }
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
          >
            {roleOptions.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
          <select
            value={formState.status}
            onChange={(event) =>
              setFormState((prev) => ({
                ...prev,
                status: event.target.value as AdminStatus,
              }))
            }
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
          >
            <option value="active">active</option>
            <option value="suspended">suspended</option>
          </select>
          <input
            value={formState.reason}
            onChange={(event) =>
              setFormState((prev) => ({ ...prev, reason: event.target.value }))
            }
            placeholder="Reason for change (audit log)"
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
            required
          />
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save access"}
            </button>
          </div>
        </form>
        {saveMessage ? (
          <p className="mt-3 text-sm text-zinc-700">{saveMessage}</p>
        ) : null}
      </article>

      <article className="rounded-xl border border-zinc-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-3">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by uid, email, display name"
            className="min-w-72 rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
          <select
            value={roleFilter}
            onChange={(event) =>
              setRoleFilter(event.target.value as AdminRole | "all")
            }
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
          >
            <option value="all">All roles</option>
            {roleOptions.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as AdminStatus | "all")
            }
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
          >
            <option value="all">All statuses</option>
            <option value="active">active</option>
            <option value="suspended">suspended</option>
          </select>
        </div>

        {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
        {isLoading ? (
          <p className="mt-3 text-sm text-zinc-500">Loading users...</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-zinc-500">
                <tr>
                  <th className="pb-2">Email</th>
                  <th className="pb-2">UID</th>
                  <th className="pb-2">Role</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Last Login</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.uid} className="border-t border-zinc-100">
                    <td className="py-2 text-zinc-900">
                      <div>{user.email}</div>
                      <div className="text-xs text-zinc-500">
                        {user.displayName ?? "—"}
                      </div>
                    </td>
                    <td className="py-2 font-mono text-xs text-zinc-600">
                      {user.uid}
                    </td>
                    <td className="py-2">{user.role}</td>
                    <td className="py-2">{user.status}</td>
                    <td className="py-2 text-zinc-600">
                      {user.lastLoginAt ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>
    </section>
  );
}
