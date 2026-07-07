"use client";

import { useState, useTransition } from "react";
import type { Profile, TeamInvite, Workspace } from "@/lib/types";
import {
  createInvite,
  revokeInvite,
  setCanPublish,
  setRole,
  setWorkspaceAccess,
} from "./actions";

type Ws = Pick<Workspace, "id" | "slug" | "name" | "brand_colour">;

export function TeamAdmin({
  slug,
  brandColour,
  me,
  profiles,
  access,
  invites,
  workspaces,
}: {
  slug: string;
  brandColour: string;
  me: Profile;
  profiles: Profile[];
  access: { user_id: string; workspace_id: string }[];
  invites: TeamInvite[];
  workspaces: Ws[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    startTransition(async () => {
      const r = await action();
      setError(r.ok ? null : (r.error ?? "Something went wrong"));
    });
  }

  const hasAccess = (userId: string, workspaceId: string) =>
    access.some((a) => a.user_id === userId && a.workspace_id === workspaceId);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Team</h1>
          <p className="text-sm text-stone-600">
            Who sees which workspace, and who can publish vs only draft.
            Sign-off itself is enforced by the database — these switches
            decide who holds it.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowInvite((v) => !v)}
          className="rounded-lg px-4 py-2 text-sm font-medium text-white"
          style={{ backgroundColor: brandColour }}
        >
          {showInvite ? "Close" : "+ Invite someone"}
        </button>
      </header>

      {error && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">
          {error}
        </p>
      )}

      {showInvite && (
        <form
          action={(fd) => {
            run(() => createInvite(slug, fd));
            setShowInvite(false);
          }}
          className="flex flex-col gap-3 rounded-2xl border-2 bg-white p-5"
          style={{ borderColor: brandColour }}
        >
          <h2 className="text-base font-semibold">Invite a team member</h2>
          <p className="text-sm text-stone-600">
            When they sign up with this email, their access applies
            automatically. Send them the login link yourself — you stay in
            control of the conversation.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm font-medium">
              Email
              <input name="email" type="email" required className="rounded-lg border border-stone-300 px-3 py-2 text-base font-normal" />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Role
              <select name="role" defaultValue="editor" className="rounded-lg border border-stone-300 px-3 py-2 text-base">
                <option value="editor">Editor (drafts)</option>
                <option value="admin">Admin</option>
              </select>
            </label>
          </div>
          <fieldset className="flex flex-wrap gap-4">
            <legend className="pb-1 text-sm font-medium">Workspaces they may enter</legend>
            {workspaces.map((w) => (
              <label key={w.id} className="flex items-center gap-1.5 text-sm">
                <input type="checkbox" name={`ws_${w.slug}`} className="h-4 w-4" />
                {w.name}
              </label>
            ))}
          </fieldset>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="can_publish" className="h-4 w-4" />
            Can publish / approve (sign-off rights) — otherwise they draft and you approve
          </label>
          <div>
            <button type="submit" disabled={pending} className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50" style={{ backgroundColor: brandColour }}>
              Create invite
            </button>
          </div>
        </form>
      )}

      {invites.length > 0 && (
        <section aria-labelledby="invites-heading">
          <h2 id="invites-heading" className="mb-3 text-lg font-semibold">Pending invites</h2>
          <ul className="flex flex-col gap-2">
            {invites.map((inv) => (
              <li key={inv.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-stone-200 bg-white p-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{inv.email}</p>
                  <p className="text-sm text-stone-500">
                    {inv.role} · {inv.workspace_slugs.join(" + ")} ·{" "}
                    {inv.can_publish ? "can publish" : "drafts only"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => run(() => revokeInvite(inv.id, slug))}
                  className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50"
                >
                  Revoke
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="team-heading">
        <h2 id="team-heading" className="mb-3 text-lg font-semibold">The team</h2>
        <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Team members and their permissions</caption>
            <thead>
              <tr className="border-b border-stone-200 text-xs text-stone-500 uppercase">
                <th scope="col" className="px-4 py-2 font-medium">Person</th>
                <th scope="col" className="px-4 py-2 font-medium">Role</th>
                {workspaces.map((w) => (
                  <th key={w.id} scope="col" className="px-4 py-2 font-medium">{w.name}</th>
                ))}
                <th scope="col" className="px-4 py-2 font-medium">Publish</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((p) => {
                const isSelf = p.id === me.id;
                const isOwnerRow = p.role === "owner";
                return (
                  <tr key={p.id} className="border-b border-stone-100 last:border-0">
                    <td className="px-4 py-2">
                      <span className="font-medium">{p.full_name || p.email}</span>
                      {isSelf && <span className="ml-1 text-xs text-stone-400">(you)</span>}
                      <span className="block text-xs text-stone-500">{p.email}</span>
                    </td>
                    <td className="px-4 py-2">
                      {isOwnerRow ? (
                        <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-800">owner</span>
                      ) : (
                        <select
                          value={p.role}
                          onChange={(e) => run(() => setRole(slug, p.id, e.target.value as "admin" | "editor"))}
                          aria-label={`Role for ${p.email}`}
                          className="rounded-lg border border-stone-300 px-2 py-1 text-sm"
                        >
                          <option value="editor">editor</option>
                          <option value="admin">admin</option>
                        </select>
                      )}
                    </td>
                    {workspaces.map((w) => (
                      <td key={w.id} className="px-4 py-2">
                        <input
                          type="checkbox"
                          aria-label={`${p.email} access to ${w.name}`}
                          checked={isOwnerRow || hasAccess(p.id, w.id)}
                          disabled={isOwnerRow || pending}
                          onChange={(e) => run(() => setWorkspaceAccess(slug, p.id, w.id, e.target.checked))}
                          className="h-4 w-4"
                        />
                      </td>
                    ))}
                    <td className="px-4 py-2">
                      <input
                        type="checkbox"
                        aria-label={`${p.email} publish rights`}
                        checked={isOwnerRow || p.can_publish}
                        disabled={isOwnerRow || pending}
                        onChange={(e) => run(() => setCanPublish(slug, p.id, e.target.checked))}
                        className="h-4 w-4"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-stone-500">
          The owner always has everything — and the database refuses to let
          the platform become ownerless.
        </p>
      </section>
    </div>
  );
}
