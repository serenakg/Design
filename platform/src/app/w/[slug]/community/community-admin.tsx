"use client";

import { useState, useTransition } from "react";
import type { Flag, Member, Space, Workspace } from "@/lib/types";
import {
  createSpace,
  deleteSpace,
  moderateContent,
  resolveFlag,
} from "./actions";

type FlagWithContent = Flag & { body: string; contentStatus: string };

export function CommunityAdmin({
  workspace,
  slug,
  spaces,
  members,
  flags,
}: {
  workspace: Workspace;
  slug: string;
  spaces: Space[];
  members: Member[];
  flags: FlagWithContent[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    startTransition(async () => {
      const r = await action();
      setError(r.ok ? null : (r.error ?? "Something went wrong"));
    });
  }

  const paidCount = members.filter((m) => m.tier === "paid").length;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Community</h1>
          <p className="text-sm text-stone-600">
            {workspace.brand_config?.community_name ?? workspace.name} —{" "}
            {members.length} member{members.length === 1 ? "" : "s"} ({paidCount} paid)
          </p>
        </div>
        <a
          href={`/c/${slug}`}
          target="_blank"
          rel="noreferrer"
          className="text-sm underline underline-offset-4"
          style={{ color: workspace.brand_colour }}
        >
          View community ↗
        </a>
      </header>

      {error && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">
          {error}
        </p>
      )}

      {/* ---------- MODERATION QUEUE ---------- */}
      <section aria-labelledby="flags-heading">
        <h2 id="flags-heading" className="mb-3 text-lg font-semibold">
          Reports {flags.length > 0 && <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-sm text-amber-800">{flags.length}</span>}
        </h2>
        {flags.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-stone-300 p-6 text-center text-sm text-stone-600">
            No open reports. 💚
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {flags.map((f) => (
              <li key={f.id} className="rounded-2xl border border-amber-200 bg-white p-4">
                <p className="text-xs font-medium text-amber-800 uppercase">
                  {f.target_type} reported · {new Date(f.created_at).toLocaleString("en-IE")}
                </p>
                {f.reason && (
                  <p className="mt-1 text-sm text-stone-700">
                    Reason: “{f.reason}”
                  </p>
                )}
                <blockquote className="mt-2 border-l-2 border-stone-200 pl-3 text-sm whitespace-pre-line text-stone-600">
                  {f.body.slice(0, 400)}
                </blockquote>
                <div className="mt-3 flex flex-wrap gap-2">
                  {f.contentStatus === "published" ? (
                    <Btn onClick={() => run(() => moderateContent(slug, f.target_type, f.target_id, "hidden"))}>
                      Hide content
                    </Btn>
                  ) : (
                    <Btn onClick={() => run(() => moderateContent(slug, f.target_type, f.target_id, "published"))}>
                      Restore content
                    </Btn>
                  )}
                  <Btn
                    danger
                    onClick={() => {
                      if (window.confirm("Remove this content permanently from the community view? The author keeps a copy of their words."))
                        run(() => moderateContent(slug, f.target_type, f.target_id, "removed"));
                    }}
                  >
                    Remove
                  </Btn>
                  <Btn onClick={() => run(() => resolveFlag(f.id, slug))}>
                    Mark handled
                  </Btn>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ---------- SPACES ---------- */}
      <section aria-labelledby="spaces-heading">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="spaces-heading" className="text-lg font-semibold">Spaces</h2>
          <button
            type="button"
            onClick={() => setShowAdd((v) => !v)}
            className="rounded-lg px-4 py-2 text-sm font-medium text-white"
            style={{ backgroundColor: workspace.brand_colour }}
          >
            {showAdd ? "Close" : "+ New space"}
          </button>
        </div>

        {showAdd && (
          <form
            action={(fd) => {
              run(() => createSpace(workspace.id, slug, fd));
              setShowAdd(false);
            }}
            className="mb-4 flex flex-col gap-3 rounded-2xl border-2 bg-white p-5"
            style={{ borderColor: workspace.brand_colour }}
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm font-medium">
                Name
                <input name="name" required className="rounded-lg border border-stone-300 px-3 py-2 text-base font-normal" />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium">
                Slug (optional)
                <input name="slug" pattern="[a-z0-9\-]*" className="rounded-lg border border-stone-300 px-3 py-2 text-base font-normal" />
              </label>
            </div>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Description
              <input name="description" className="rounded-lg border border-stone-300 px-3 py-2 text-base font-normal" />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="paid_only" className="h-4 w-4" />
              Paid members only
            </label>
            <div>
              <button type="submit" disabled={pending} className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50" style={{ backgroundColor: workspace.brand_colour }}>
                Create space
              </button>
            </div>
          </form>
        )}

        <ul className="flex flex-col gap-2">
          {spaces.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-stone-200 bg-white p-4">
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {s.name}
                  {s.paid_only && <span className="ml-2 text-xs text-stone-500">🔒 paid</span>}
                </p>
                {s.description && <p className="text-sm text-stone-500">{s.description}</p>}
              </div>
              <Btn
                danger
                onClick={() => {
                  if (window.confirm(`Delete “${s.name}” and everything posted in it? This cannot be undone.`))
                    run(() => deleteSpace(s.id, slug));
                }}
              >
                Delete
              </Btn>
            </li>
          ))}
        </ul>
      </section>

      {/* ---------- MEMBERS ---------- */}
      <section aria-labelledby="members-heading">
        <h2 id="members-heading" className="mb-3 text-lg font-semibold">Members</h2>
        {members.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-stone-300 p-6 text-center text-sm text-stone-600">
            Nobody has joined yet — share the community link: /c/{slug}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Community members</caption>
              <thead>
                <tr className="border-b border-stone-200 text-xs text-stone-500 uppercase">
                  <th scope="col" className="px-4 py-2 font-medium">Name</th>
                  <th scope="col" className="px-4 py-2 font-medium">Tier</th>
                  <th scope="col" className="px-4 py-2 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id} className="border-b border-stone-100 last:border-0">
                    <td className="px-4 py-2">
                      {m.display_name || "—"}
                      {m.pronouns && <span className="ml-1 text-xs text-stone-500">({m.pronouns})</span>}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${m.tier === "paid" ? "bg-emerald-100 text-emerald-800" : "bg-stone-100 text-stone-600"}`}>
                        {m.tier}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-stone-500">
                      {new Date(m.joined_at).toLocaleDateString("en-IE")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Btn({
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
