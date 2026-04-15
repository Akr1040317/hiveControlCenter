"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { getCsrfToken } from "@/lib/client/csrf";

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

type PlatformUser = {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: string | null;
  status: string | null;
  tier: string | null;
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
  const [platformQuery, setPlatformQuery] = useState("");
  const [platformUsers, setPlatformUsers] = useState<PlatformUser[]>([]);
  const [isPlatformLoading, setIsPlatformLoading] = useState(false);
  const [platformError, setPlatformError] = useState<string | null>(null);

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

  const loadPlatformUsers = useCallback(async () => {
    setIsPlatformLoading(true);
    setPlatformError(null);

    try {
      const params = new URLSearchParams();
      if (platformQuery.trim()) {
        params.set("q", platformQuery.trim());
      }

      const response = await fetch(`/api/users/platform-search?${params}`);
      const payload = (await response.json()) as {
        users?: PlatformUser[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load platform users");
      }

      setPlatformUsers(payload.users ?? []);
    } catch (error) {
      setPlatformError(
        error instanceof Error ? error.message : "Failed to load platform users",
      );
    } finally {
      setIsPlatformLoading(false);
    }
  }, [platformQuery]);

  useEffect(() => {
    void loadPlatformUsers();
  }, [loadPlatformUsers]);

  const handleGrantAccess = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaveMessage(null);
    setIsSaving(true);

    try {
      const response = await fetch("/api/users/grant-access", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-csrf-token": await getCsrfToken(),
        },
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

  const fillFromPlatformUser = (user: PlatformUser) => {
    setFormState((prev) => ({
      ...prev,
      uid: user.uid,
      email: user.email ?? "",
      displayName: user.displayName ?? "",
      role: prev.role,
      status: "active",
    }));
    setSaveMessage("Prefilled form from main users collection.");
  };

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Users & Access</h1>
        <p className="mt-1 text-sm hive-subtle">
          Manage `adminUsers` access, roles, and status for the control center.
        </p>
      </div>

      <article className="hive-card p-4">
        <h2 className="text-base font-medium text-white">
          Main platform users (`users` collection)
        </h2>
        <p className="mt-1 text-sm hive-subtle">
          Pull from `hivewebsite` user data and prefill admin access updates.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <input
            value={platformQuery}
            onChange={(event) => setPlatformQuery(event.target.value)}
            placeholder="Search platform users by email, uid, display name"
            className="hive-input min-w-72 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => void loadPlatformUsers()}
            className="hive-secondary-btn px-4 py-2 text-sm font-medium"
          >
            Refresh
          </button>
        </div>
        {platformError ? (
          <p className="mt-3 text-sm text-red-700">{platformError}</p>
        ) : null}
        {isPlatformLoading ? (
          <p className="mt-3 text-sm hive-subtle">Loading platform users...</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-[#bbbcd1]">
                <tr>
                  <th className="pb-2">Email</th>
                  <th className="pb-2">UID</th>
                  <th className="pb-2">App Role</th>
                  <th className="pb-2">App Status</th>
                  <th className="pb-2">Tier</th>
                  <th className="pb-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {platformUsers.map((user) => (
                  <tr key={user.uid} className="border-t border-[#2a2a46]">
                    <td className="py-2 text-[#ececff]">
                      <div>{user.email ?? "—"}</div>
                      <div className="text-xs text-[#a4a4be]">
                        {user.displayName ?? "—"}
                      </div>
                    </td>
                    <td className="py-2 font-mono text-xs text-[#a4a4be]">
                      {user.uid}
                    </td>
                    <td className="py-2 text-[#ececff]">{user.role ?? "—"}</td>
                    <td className="py-2 text-[#ececff]">{user.status ?? "—"}</td>
                    <td className="py-2 text-[#ececff]">{user.tier ?? "—"}</td>
                    <td className="py-2">
                      <button
                        type="button"
                        onClick={() => fillFromPlatformUser(user)}
                        className="hive-secondary-btn px-3 py-1.5 text-xs font-medium"
                      >
                        Use in admin form
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>

      <article className="hive-card p-4">
        <h2 className="text-base font-medium text-white">
          Grant or update admin access
        </h2>
        <form className="mt-3 grid gap-3 md:grid-cols-2" onSubmit={handleGrantAccess}>
          <input
            value={formState.uid}
            onChange={(event) =>
              setFormState((prev) => ({ ...prev, uid: event.target.value }))
            }
            placeholder="Firebase UID"
            className="hive-input px-3 py-2 text-sm"
            required
          />
          <input
            value={formState.email}
            onChange={(event) =>
              setFormState((prev) => ({ ...prev, email: event.target.value }))
            }
            placeholder="Email"
            className="hive-input px-3 py-2 text-sm"
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
            className="hive-input px-3 py-2 text-sm"
          />
          <select
            value={formState.role}
            onChange={(event) =>
              setFormState((prev) => ({
                ...prev,
                role: event.target.value as AdminRole,
              }))
            }
            className="hive-input px-3 py-2 text-sm"
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
            className="hive-input px-3 py-2 text-sm"
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
            className="hive-input px-3 py-2 text-sm"
            required
          />
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={isSaving}
              className="hive-primary-btn px-4 py-2 text-sm disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save access"}
            </button>
          </div>
        </form>
        {saveMessage ? (
          <p className="mt-3 text-sm text-[#dcdcef]">{saveMessage}</p>
        ) : null}
      </article>

      <article className="hive-card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by uid, email, display name"
            className="hive-input min-w-72 px-3 py-2 text-sm"
          />
          <select
            value={roleFilter}
            onChange={(event) =>
              setRoleFilter(event.target.value as AdminRole | "all")
            }
            className="hive-input px-3 py-2 text-sm"
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
            className="hive-input px-3 py-2 text-sm"
          >
            <option value="all">All statuses</option>
            <option value="active">active</option>
            <option value="suspended">suspended</option>
          </select>
        </div>

        {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
        {isLoading ? (
          <p className="mt-3 text-sm hive-subtle">Loading users...</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-[#bbbcd1]">
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
                  <tr key={user.uid} className="border-t border-[#2a2a46]">
                    <td className="py-2 text-[#ececff]">
                      <div>{user.email}</div>
                      <div className="text-xs text-[#a4a4be]">
                        {user.displayName ?? "—"}
                      </div>
                    </td>
                    <td className="py-2 font-mono text-xs text-[#a4a4be]">
                      {user.uid}
                    </td>
                    <td className="py-2 text-[#ececff]">{user.role}</td>
                    <td className="py-2 text-[#ececff]">{user.status}</td>
                    <td className="py-2 text-[#a4a4be]">
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
