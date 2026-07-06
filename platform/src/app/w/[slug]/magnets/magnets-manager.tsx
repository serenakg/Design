"use client";

import { useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import type { EmailSequence, LeadMagnet, Workspace } from "@/lib/types";
import {
  createMagnet,
  deleteMagnet,
  setMagnetActive,
  setMagnetSequence,
} from "./actions";

export function MagnetsManager({
  workspace,
  slug,
  magnets,
  sequences,
}: {
  workspace: Workspace;
  slug: string;
  magnets: LeadMagnet[];
  sequences: Pick<EmailSequence, "id" | "name" | "status">[];
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [fileUrl, setFileUrl] = useState("");
  const [pending, startTransition] = useTransition();
  const fileInput = useRef<HTMLInputElement>(null);

  // Freebie files go to this workspace's PUBLIC bucket (they're free
  // downloads); writes still require workspace access.
  async function handleUpload(file: File) {
    setUploading(true);
    setError(null);
    const supabase = createClient();
    const path = `lead-magnets/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const bucket = `${slug}-public`;
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(path, file);
    if (uploadError) {
      setError(`Upload failed: ${uploadError.message}`);
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    setFileUrl(data.publicUrl);
    setUploading(false);
  }

  function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    startTransition(async () => {
      const r = await action();
      if (!r.ok) setError(r.error ?? "Something went wrong");
      else {
        setError(null);
        setShowAdd(false);
        setFileUrl("");
      }
    });
  }

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Lead magnets</h1>
          <p className="text-sm text-stone-600">
            Freebies that write straight into the {workspace.name} spine — with
            consent, automatically.
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
          {showAdd ? "Close" : "+ New lead magnet"}
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
          action={(fd) => run(() => createMagnet(workspace.id, slug, fd))}
          className="mb-6 flex flex-col gap-4 rounded-2xl border-2 bg-white p-5"
          style={{ borderColor: workspace.brand_colour }}
        >
          <h2 className="text-lg font-semibold">New lead magnet</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm font-medium">
              Title
              <input
                name="title"
                required
                placeholder="The Money Map"
                className="rounded-lg border border-stone-300 px-3 py-2 text-base font-normal"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Slug (URL — leave blank to use the title)
              <input
                name="slug"
                pattern="[a-z0-9\-]*"
                className="rounded-lg border border-stone-300 px-3 py-2 text-base font-normal"
              />
            </label>
          </div>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Description (shows on the landing page)
            <input
              name="description"
              className="rounded-lg border border-stone-300 px-3 py-2 text-base font-normal"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Tag applied to new contacts
            <input
              name="tag"
              placeholder="money-map"
              className="rounded-lg border border-stone-300 px-3 py-2 text-base font-normal"
            />
          </label>

          <div className="flex flex-col gap-2 rounded-lg bg-stone-50 p-3">
            <label className="flex flex-col gap-1 text-sm font-medium">
              The file (PDF, workbook, …)
              <input
                ref={fileInput}
                type="file"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleUpload(f);
                }}
                className="text-sm"
              />
            </label>
            {uploading && (
              <p className="text-sm text-stone-600" role="status">
                Uploading…
              </p>
            )}
            <label className="flex flex-col gap-1 text-sm font-medium">
              …or paste a file URL
              <input
                name="file_url"
                value={fileUrl}
                onChange={(e) => setFileUrl(e.target.value)}
                placeholder="https://…"
                className="rounded-lg border border-stone-300 px-3 py-2 text-base font-normal"
              />
            </label>
          </div>

          <div>
            <button
              type="submit"
              disabled={pending || uploading}
              className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              style={{ backgroundColor: workspace.brand_colour }}
            >
              {pending ? "Saving…" : "Create lead magnet"}
            </button>
          </div>
        </form>
      )}

      {magnets.length === 0 && !showAdd ? (
        <p className="rounded-2xl border border-dashed border-stone-300 p-8 text-center text-sm text-stone-600">
          No lead magnets yet — create the first freebie.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {magnets.map((m) => (
            <li
              key={m.id}
              className="flex flex-wrap items-center gap-3 rounded-2xl border border-stone-200 bg-white p-4"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{m.title}</p>
                <p className="truncate text-sm text-stone-500">
                  /p/{slug}/free/{m.slug} · tags new contacts “{m.tag}”
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                  m.active
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-stone-100 text-stone-600"
                }`}
              >
                {m.active ? "Live" : "Off"}
              </span>
              <label className="flex shrink-0 items-center gap-2 text-xs font-medium text-stone-600">
                Then start sequence:
                <select
                  value={m.sequence_id ?? ""}
                  onChange={(e) =>
                    run(() =>
                      setMagnetSequence(m.id, slug, e.target.value || null)
                    )
                  }
                  className="rounded-lg border border-stone-300 px-2 py-1.5 text-sm font-normal"
                >
                  <option value="">None</option>
                  {sequences.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                      {s.status !== "active" ? " (not active)" : ""}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex w-full flex-wrap gap-2 border-t border-stone-100 pt-3 sm:w-auto sm:border-0 sm:pt-0">
                <a
                  href={`/p/${slug}/free/${m.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm text-stone-700 hover:bg-stone-100"
                >
                  View page ↗
                </a>
                <button
                  type="button"
                  onClick={() => run(() => setMagnetActive(m.id, slug, !m.active))}
                  className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm text-stone-700 hover:bg-stone-100"
                >
                  {m.active ? "Switch off" : "Switch on"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (
                      window.confirm(
                        `Delete “${m.title}”? Its landing page stops working. Contacts it created are kept.`
                      )
                    )
                      run(() => deleteMagnet(m.id, slug));
                  }}
                  className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
