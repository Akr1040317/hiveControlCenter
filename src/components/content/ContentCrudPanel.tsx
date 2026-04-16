"use client";

import { useCallback, useEffect, useState } from "react";
import { getCsrfToken } from "@/lib/client/csrf";

export type FieldDef = {
  key: string;
  label: string;
  type: "text" | "textarea" | "number" | "select" | "tags" | "boolean" | "date";
  options?: string[];
  required?: boolean;
  placeholder?: string;
  defaultValue?: unknown;
};

type ContentCrudPanelProps = {
  title: string;
  apiBase: string;
  fields: FieldDef[];
  nameKey: string;
  columns: { key: string; label: string; render?: (val: unknown, row: Record<string, unknown>) => string }[];
};

type Item = Record<string, unknown> & { id: string };

export function ContentCrudPanel({
  title,
  apiBase,
  fields,
  nameKey,
  columns,
}: ContentCrudPanelProps) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(apiBase);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = (await res.json()) as { items: Item[] };
      setItems(data.items ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fetch failed");
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  function openCreate() {
    const defaults: Record<string, unknown> = {};
    for (const f of fields) {
      if (f.defaultValue !== undefined) {
        defaults[f.key] = f.defaultValue;
      } else if (f.type === "tags") {
        defaults[f.key] = [];
      } else if (f.type === "boolean") {
        defaults[f.key] = false;
      } else if (f.type === "number") {
        defaults[f.key] = 0;
      } else {
        defaults[f.key] = "";
      }
    }
    setFormData(defaults);
    setEditingId(null);
    setShowForm(true);
  }

  function openEdit(item: Item) {
    const populated: Record<string, unknown> = {};
    for (const f of fields) {
      populated[f.key] = item[f.key] ?? (f.type === "tags" ? [] : f.type === "boolean" ? false : "");
    }
    setFormData(populated);
    setEditingId(item.id);
    setShowForm(true);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const csrf = await getCsrfToken();
      const url = editingId ? `${apiBase}/${editingId}` : apiBase;
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "content-type": "application/json",
          "x-csrf-token": csrf,
        },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Save failed");
      }

      setShowForm(false);
      setEditingId(null);
      await fetchItems();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      const csrf = await getCsrfToken();
      const res = await fetch(`${apiBase}/${id}`, {
        method: "DELETE",
        headers: { "x-csrf-token": csrf },
      });
      if (!res.ok) throw new Error("Delete failed");
      setDeleteConfirm(null);
      await fetchItems();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    }
  }

  function updateField(key: string, value: unknown) {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }

  function renderField(f: FieldDef) {
    const value = formData[f.key];

    if (f.type === "textarea") {
      return (
        <textarea
          className="w-full rounded-md border border-[#2a2a40] bg-[#15152a] px-3 py-2 text-sm text-[#d8d8ea] placeholder-[#6b6b8a] focus:border-[#ffa500] focus:outline-none"
          rows={4}
          placeholder={f.placeholder}
          value={(value as string) ?? ""}
          onChange={(e) => updateField(f.key, e.target.value)}
        />
      );
    }

    if (f.type === "select" && f.options) {
      return (
        <select
          className="w-full rounded-md border border-[#2a2a40] bg-[#15152a] px-3 py-2 text-sm text-[#d8d8ea] focus:border-[#ffa500] focus:outline-none"
          value={(value as string) ?? ""}
          onChange={(e) => updateField(f.key, e.target.value)}
        >
          <option value="">Select...</option>
          {f.options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      );
    }

    if (f.type === "boolean") {
      return (
        <label className="flex items-center gap-2 text-sm text-[#d8d8ea]">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => updateField(f.key, e.target.checked)}
            className="accent-[#ffa500]"
          />
          {f.label}
        </label>
      );
    }

    if (f.type === "tags") {
      const tags = (Array.isArray(value) ? value : []) as string[];
      return (
        <div>
          <div className="mb-1 flex flex-wrap gap-1">
            {tags.map((tag, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 rounded-full bg-[rgba(255,165,0,0.15)] px-2 py-0.5 text-xs text-[#ffc36b]"
              >
                {tag}
                <button
                  type="button"
                  onClick={() =>
                    updateField(
                      f.key,
                      tags.filter((_, j) => j !== i),
                    )
                  }
                  className="ml-0.5 text-[#ffa500] hover:text-white"
                >
                  x
                </button>
              </span>
            ))}
          </div>
          <input
            className="w-full rounded-md border border-[#2a2a40] bg-[#15152a] px-3 py-2 text-sm text-[#d8d8ea] placeholder-[#6b6b8a] focus:border-[#ffa500] focus:outline-none"
            placeholder="Type and press Enter to add"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                const v = e.currentTarget.value.trim();
                if (v && !tags.includes(v)) {
                  updateField(f.key, [...tags, v]);
                  e.currentTarget.value = "";
                }
              }
            }}
          />
        </div>
      );
    }

    if (f.type === "number") {
      return (
        <input
          type="number"
          className="w-full rounded-md border border-[#2a2a40] bg-[#15152a] px-3 py-2 text-sm text-[#d8d8ea] placeholder-[#6b6b8a] focus:border-[#ffa500] focus:outline-none"
          placeholder={f.placeholder}
          value={(value as number) ?? 0}
          onChange={(e) => updateField(f.key, Number(e.target.value))}
        />
      );
    }

    if (f.type === "date") {
      return (
        <input
          type="date"
          className="w-full rounded-md border border-[#2a2a40] bg-[#15152a] px-3 py-2 text-sm text-[#d8d8ea] focus:border-[#ffa500] focus:outline-none"
          value={(value as string) ?? ""}
          onChange={(e) => updateField(f.key, e.target.value)}
        />
      );
    }

    return (
      <input
        type="text"
        className="w-full rounded-md border border-[#2a2a40] bg-[#15152a] px-3 py-2 text-sm text-[#d8d8ea] placeholder-[#6b6b8a] focus:border-[#ffa500] focus:outline-none"
        placeholder={f.placeholder}
        value={(value as string) ?? ""}
        onChange={(e) => updateField(f.key, e.target.value)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <button
          onClick={openCreate}
          className="rounded-md bg-[#ffa500] px-4 py-2 text-sm font-medium text-black hover:bg-[#ffb732] transition-colors"
        >
          + New
        </button>
      </div>

      {error && (
        <div className="rounded-md bg-red-900/30 border border-red-700/40 px-3 py-2 text-sm text-red-300">
          {error}
          <button onClick={() => setError(null)} className="ml-2 text-red-400 hover:text-white">
            Dismiss
          </button>
        </div>
      )}

      {/* Form modal overlay */}
      {showForm && (
        <div className="rounded-lg border border-[#2a2a40] bg-[#1a1a2e] p-5">
          <h3 className="mb-4 text-base font-medium text-white">
            {editingId ? "Edit" : "Create"} {title.replace(/s$/, "")}
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {fields.map((f) =>
              f.type === "boolean" ? (
                <div key={f.key} className="flex items-end">
                  {renderField(f)}
                </div>
              ) : (
                <div key={f.key} className={f.type === "textarea" ? "sm:col-span-2" : ""}>
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[#9b9bb4]">
                    {f.label}
                    {f.required && <span className="text-red-400"> *</span>}
                  </label>
                  {renderField(f)}
                </div>
              ),
            )}
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-md bg-[#ffa500] px-4 py-2 text-sm font-medium text-black hover:bg-[#ffb732] disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving..." : editingId ? "Update" : "Create"}
            </button>
            <button
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
              }}
              className="rounded-md border border-[#2a2a40] px-4 py-2 text-sm text-[#d8d8ea] hover:bg-[#2a2a40] transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <p className="text-sm text-[#9b9bb4]">Loading...</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-[#9b9bb4]">No items yet. Click "+ New" to create one.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[#1e1e34]">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#1e1e34] bg-[#121220]">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-[#9b9bb4]"
                  >
                    {col.label}
                  </th>
                ))}
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-[#9b9bb4]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-[#1e1e34] hover:bg-[rgba(255,165,0,0.04)] transition-colors"
                >
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3 text-[#d8d8ea]">
                      {col.render
                        ? col.render(item[col.key], item)
                        : String(item[col.key] ?? "")}
                    </td>
                  ))}
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEdit(item)}
                        className="text-xs text-[#ffa500] hover:text-[#ffb732]"
                      >
                        Edit
                      </button>
                      {deleteConfirm === item.id ? (
                        <>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="text-xs text-red-400 hover:text-red-300"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="text-xs text-[#9b9bb4] hover:text-white"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(item.id)}
                          className="text-xs text-red-400/70 hover:text-red-400"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-[#6b6b8a]">
        {items.length} item{items.length !== 1 ? "s" : ""} &middot; Data from Firestore &middot;{" "}
        <button onClick={fetchItems} className="text-[#ffa500] hover:underline">
          Refresh
        </button>
      </p>
    </div>
  );
}
