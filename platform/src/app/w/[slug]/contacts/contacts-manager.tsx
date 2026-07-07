"use client";

import { useMemo, useState, useTransition } from "react";
import type { Contact, ContactStatus, Workspace } from "@/lib/types";
import { STATUS_LABELS } from "@/lib/types";
import {
  addContact,
  eraseContact,
  exportContact,
  updateContact,
} from "./actions";

const STATUSES: ContactStatus[] = ["lead", "subscriber", "paid"];

export function ContactsManager({
  workspace,
  slug,
  contacts,
}: {
  workspace: Workspace;
  slug: string;
  contacts: Contact[];
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ContactStatus>("all");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const allTags = useMemo(
    () => [...new Set(contacts.flatMap((c) => c.tags))].sort(),
    [contacts]
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return contacts.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (tagFilter !== "all" && !c.tags.includes(tagFilter)) return false;
      if (q && !c.name.toLowerCase().includes(q) && !c.email.toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [contacts, query, statusFilter, tagFilter]);

  function handleAdd(formData: FormData) {
    startTransition(async () => {
      const result = await addContact(workspace.id, slug, formData);
      if (!result.ok) setError(result.error);
      else {
        setError(null);
        setShowAdd(false);
      }
    });
  }

  function handleUpdate(contactId: string, formData: FormData) {
    startTransition(async () => {
      const result = await updateContact(contactId, slug, formData);
      if (!result.ok) setError(result.error);
      else {
        setError(null);
        setEditingId(null);
      }
    });
  }

  function handleErase(contact: Contact) {
    const sure = window.confirm(
      `Erase ${contact.name} (${contact.email})?\n\nThis is the GDPR right-to-be-forgotten: it permanently deletes the contact and every membership or enrolment linked to them. It cannot be undone.`
    );
    if (!sure) return;
    startTransition(async () => {
      const result = await eraseContact(contact.id, slug);
      if (!result.ok) setError(result.error);
    });
  }

  function handleExport(contact: Contact) {
    startTransition(async () => {
      const result = await exportContact(contact.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const blob = new Blob([JSON.stringify(result.data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${contact.email}-export.json`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Contacts</h1>
          <p className="text-sm text-stone-600">
            The spine — every door into {workspace.name} writes here.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowAdd((v) => !v);
            setError(null);
          }}
          className="rounded-lg px-4 py-2 text-sm font-medium text-white"
          style={{ backgroundColor: workspace.brand_colour }}
        >
          {showAdd ? "Close" : "+ Add contact"}
        </button>
      </header>

      {error && (
        <p
          role="alert"
          className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800"
        >
          {error}
        </p>
      )}

      {showAdd && (
        <form
          action={handleAdd}
          className="mb-6 grid grid-cols-1 gap-4 rounded-2xl border border-stone-200 bg-white p-5 sm:grid-cols-2"
        >
          <h2 className="col-span-full text-lg font-semibold">New contact</h2>
          <Field label="Name" name="name" required />
          <Field label="Email" name="email" type="email" required />
          <label className="flex flex-col gap-1 text-sm font-medium">
            Status
            <select
              name="status"
              defaultValue="lead"
              className="rounded-lg border border-stone-300 px-3 py-2 text-base"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </label>
          <Field label="Source" name="source" placeholder="manual, event, referral…" />
          <Field label="Value (€)" name="value" type="number" step="0.01" min="0" />
          <Field label="Tags (comma-separated)" name="tags" placeholder="pilot, newsletter" />
          <div className="col-span-full flex flex-col gap-2 rounded-lg bg-stone-50 p-3">
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" name="consent" className="mt-0.5 h-4 w-4" />
              <span>
                <strong>Consent recorded.</strong> This person has agreed to be
                contacted. Contacts without recorded consent are stored but
                treated as un-emailable (GDPR).
              </span>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              How consent was given (optional)
              <input
                name="consent_note"
                placeholder="e.g. signed up at workshop, 6 Jul 2026"
                className="rounded-lg border border-stone-300 px-3 py-2 text-base font-normal"
              />
            </label>
          </div>
          <div className="col-span-full">
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              style={{ backgroundColor: workspace.brand_colour }}
            >
              {pending ? "Saving…" : "Save contact"}
            </button>
          </div>
        </form>
      )}

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="flex min-w-48 flex-1 flex-col gap-1 text-sm font-medium">
          Search
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name or email"
            className="rounded-lg border border-stone-300 px-3 py-2 text-base"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Status
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "all" | ContactStatus)}
            className="rounded-lg border border-stone-300 px-3 py-2 text-base"
          >
            <option value="all">All</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Tag
          <select
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            className="rounded-lg border border-stone-300 px-3 py-2 text-base"
          >
            <option value="all">All</option>
            {allTags.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="mb-2 text-sm text-stone-500" role="status">
        {visible.length} of {contacts.length} contact{contacts.length === 1 ? "" : "s"}
      </p>

      {visible.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-stone-300 p-8 text-center text-sm text-stone-600">
          {contacts.length === 0
            ? "No contacts yet — add the first one above."
            : "No contacts match these filters."}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {visible.map((c) =>
            editingId === c.id ? (
              <li key={c.id} className="rounded-2xl border-2 bg-white p-5" style={{ borderColor: workspace.brand_colour }}>
                <form
                  action={(fd) => handleUpdate(c.id, fd)}
                  className="grid grid-cols-1 gap-4 sm:grid-cols-2"
                >
                  <h2 className="col-span-full text-base font-semibold">
                    Edit {c.name}
                  </h2>
                  <Field label="Name" name="name" defaultValue={c.name} required />
                  <Field label="Email" name="email" type="email" defaultValue={c.email} required />
                  <label className="flex flex-col gap-1 text-sm font-medium">
                    Status
                    <select
                      name="status"
                      defaultValue={c.status}
                      className="rounded-lg border border-stone-300 px-3 py-2 text-base"
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {STATUS_LABELS[s]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <Field label="Source" name="source" defaultValue={c.source} />
                  <Field
                    label="Value (€)"
                    name="value"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={String(c.value)}
                  />
                  <Field label="Tags (comma-separated)" name="tags" defaultValue={c.tags.join(", ")} />
                  <div className="col-span-full flex gap-2">
                    <button
                      type="submit"
                      disabled={pending}
                      className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                      style={{ backgroundColor: workspace.brand_colour }}
                    >
                      {pending ? "Saving…" : "Save changes"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="rounded-lg border border-stone-300 px-4 py-2 text-sm hover:bg-stone-100"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </li>
            ) : (
              <li
                key={c.id}
                className="flex flex-wrap items-center gap-3 rounded-2xl border border-stone-200 bg-white p-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{c.name}</p>
                  <p className="truncate text-sm text-stone-500">{c.email}</p>
                  {c.tags.length > 0 && (
                    <p className="mt-1 flex flex-wrap gap-1">
                      {c.tags.map((t) => (
                        <span
                          key={t}
                          className="rounded-full px-2 py-0.5 text-xs font-medium"
                          style={{
                            backgroundColor: workspace.brand_config?.accent_soft ?? "#f5f5f4",
                            color: workspace.brand_colour,
                          }}
                        >
                          {t}
                        </span>
                      ))}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 text-right text-sm">
                  <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium">
                    {STATUS_LABELS[c.status]}
                  </span>
                  {Number(c.value) > 0 && (
                    <span className="font-semibold">€{Number(c.value).toFixed(2)}</span>
                  )}
                  <span className={c.consent_at ? "text-emerald-700" : "text-amber-700"}>
                    {c.consent_at ? "✓ Consent" : "⚠ No consent"}
                  </span>
                </div>
                <div className="flex w-full gap-2 border-t border-stone-100 pt-3 sm:w-auto sm:border-0 sm:pt-0">
                  <RowButton onClick={() => setEditingId(c.id)}>Edit</RowButton>
                  <RowButton onClick={() => handleExport(c)}>Export</RowButton>
                  <RowButton onClick={() => handleErase(c)} danger>
                    Erase
                  </RowButton>
                </div>
              </li>
            )
          )}
        </ul>
      )}
    </div>
  );
}

function Field({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium">
      {label}
      <input
        {...props}
        className="rounded-lg border border-stone-300 px-3 py-2 text-base font-normal"
      />
    </label>
  );
}

function RowButton({
  children,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-3 py-1.5 text-sm ${
        danger
          ? "border-red-200 text-red-700 hover:bg-red-50"
          : "border-stone-300 text-stone-700 hover:bg-stone-100"
      }`}
    >
      {children}
    </button>
  );
}
