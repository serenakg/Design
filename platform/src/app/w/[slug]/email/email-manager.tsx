"use client";

import { useState, useTransition } from "react";
import type {
  Broadcast,
  EmailLogEntry,
  EmailSequence,
  SequenceEmail,
  Workspace,
} from "@/lib/types";
import {
  BROADCAST_STATUS_LABELS,
  SEQUENCE_STATUS_LABELS,
  STATUS_LABELS,
} from "@/lib/types";
import {
  createSequence,
  deleteBroadcast,
  deleteSequence,
  deleteSequenceEmail,
  saveBroadcast,
  saveSequenceEmail,
  scheduleBroadcast,
  setSequenceStatus,
  submitBroadcast,
} from "./actions";

type Tab = "sequences" | "broadcasts" | "activity";

export function EmailManager({
  workspace,
  slug,
  sequences,
  sequenceEmails,
  broadcasts,
  log,
  canPublish,
}: {
  workspace: Workspace;
  slug: string;
  sequences: EmailSequence[];
  sequenceEmails: SequenceEmail[];
  broadcasts: Broadcast[];
  log: EmailLogEntry[];
  canPublish: boolean;
}) {
  const [tab, setTab] = useState<Tab>("sequences");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    startTransition(async () => {
      const r = await action();
      setError(r.ok ? null : (r.error ?? "Something went wrong"));
    });
  }

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Email &amp; funnels</h1>
        <p className="text-sm text-stone-600">
          {workspace.name} — sequences and broadcasts go only to contacts
          with recorded consent, always with one-click unsubscribe.
        </p>
      </header>

      <div role="tablist" aria-label="Email sections" className="mb-6 flex gap-1 rounded-xl bg-stone-100 p-1">
        {(
          [
            ["sequences", "Sequences"],
            ["broadcasts", "Broadcasts"],
            ["activity", "Activity"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-medium ${
              tab === key ? "bg-white text-stone-900 shadow-sm" : "text-stone-600 hover:text-stone-900"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">
          {error}
        </p>
      )}

      {tab === "sequences" && (
        <SequencesTab
          workspace={workspace}
          slug={slug}
          sequences={sequences}
          sequenceEmails={sequenceEmails}
          canPublish={canPublish}
          pending={pending}
          run={run}
        />
      )}
      {tab === "broadcasts" && (
        <BroadcastsTab
          workspace={workspace}
          slug={slug}
          broadcasts={broadcasts}
          canPublish={canPublish}
          pending={pending}
          run={run}
        />
      )}
      {tab === "activity" && <ActivityTab log={log} />}
    </div>
  );
}

// ==================== SEQUENCES ====================

function SequencesTab({
  workspace,
  slug,
  sequences,
  sequenceEmails,
  canPublish,
  pending,
  run,
}: {
  workspace: Workspace;
  slug: string;
  sequences: EmailSequence[];
  sequenceEmails: SequenceEmail[];
  canPublish: boolean;
  pending: boolean;
  run: (a: () => Promise<{ ok: boolean; error?: string }>) => void;
}) {
  const [showNew, setShowNew] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [editingEmail, setEditingEmail] = useState<string | "new" | null>(null);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setShowNew((v) => !v)}
          className="rounded-lg px-4 py-2 text-sm font-medium text-white"
          style={{ backgroundColor: workspace.brand_colour }}
        >
          {showNew ? "Close" : "+ New sequence"}
        </button>
      </div>

      {showNew && (
        <form
          action={(fd) => {
            run(() => createSequence(workspace.id, slug, fd));
            setShowNew(false);
          }}
          className="flex flex-col gap-3 rounded-2xl border-2 bg-white p-5"
          style={{ borderColor: workspace.brand_colour }}
        >
          <label className="flex flex-col gap-1 text-sm font-medium">
            Name
            <input name="name" required placeholder="Welcome series" className="rounded-lg border border-stone-300 px-3 py-2 text-base font-normal" />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Starts when
            <select name="trigger_event" className="rounded-lg border border-stone-300 px-3 py-2 text-base">
              <option value="contact_created">A new contact joins this workspace</option>
              <option value="lead_magnet">A linked lead magnet is claimed</option>
            </select>
          </label>
          <div>
            <button type="submit" disabled={pending} className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50" style={{ backgroundColor: workspace.brand_colour }}>
              Create sequence
            </button>
          </div>
        </form>
      )}

      {sequences.length === 0 && !showNew && (
        <p className="rounded-2xl border border-dashed border-stone-300 p-8 text-center text-sm text-stone-600">
          No sequences yet. Start with a welcome series — it greets every
          new contact in {workspace.name}&apos;s voice.
        </p>
      )}

      {sequences.map((s) => {
        const emails = sequenceEmails.filter((e) => e.sequence_id === s.id);
        const isOpen = open === s.id;
        return (
          <div key={s.id} className="rounded-2xl border border-stone-200 bg-white">
            <div className="flex flex-wrap items-center gap-3 p-4">
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : s.id)}
                aria-expanded={isOpen}
                className="min-w-0 flex-1 text-left"
              >
                <p className="truncate font-medium">{s.name}</p>
                <p className="text-sm text-stone-500">
                  {s.trigger_event === "contact_created" ? "On new contact" : "On lead magnet"} · {emails.length} email{emails.length === 1 ? "" : "s"}
                </p>
              </button>
              <StatusChip
                label={SEQUENCE_STATUS_LABELS[s.status]}
                tone={s.status === "active" ? "green" : s.status === "pending_approval" ? "amber" : "stone"}
              />
              <div className="flex flex-wrap gap-2">
                {s.status === "draft" && (
                  <Btn onClick={() => run(() => setSequenceStatus(s.id, slug, "pending_approval"))}>Submit for sign-off</Btn>
                )}
                {canPublish && s.status !== "active" && emails.length > 0 && (
                  <Btn accent={workspace.brand_colour} onClick={() => run(() => setSequenceStatus(s.id, slug, "active"))}>
                    Approve &amp; activate
                  </Btn>
                )}
                {s.status === "active" && (
                  <Btn onClick={() => run(() => setSequenceStatus(s.id, slug, "paused"))}>Pause</Btn>
                )}
                <Btn
                  danger
                  onClick={() => {
                    if (window.confirm(`Delete “${s.name}” and its emails? People currently in it stop receiving them.`))
                      run(() => deleteSequence(s.id, slug));
                  }}
                >
                  Delete
                </Btn>
              </div>
            </div>

            {isOpen && (
              <div className="border-t border-stone-100 p-4">
                <ol className="flex flex-col gap-2">
                  {emails.map((e) => (
                    <li key={e.id} className="rounded-lg bg-stone-50 p-3">
                      {editingEmail === e.id ? (
                        <EmailForm
                          email={e}
                          brandColour={workspace.brand_colour}
                          pending={pending}
                          onCancel={() => setEditingEmail(null)}
                          onSave={(fd) => {
                            run(() => saveSequenceEmail(workspace.id, s.id, slug, e.id, fd));
                            setEditingEmail(null);
                          }}
                        />
                      ) : (
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-semibold text-stone-500">#{e.position}</span>
                          <span className="min-w-0 flex-1 truncate text-sm font-medium">{e.subject}</span>
                          <span className="text-xs text-stone-500">
                            {e.delay_hours === 0 ? "immediately" : `after ${e.delay_hours}h`}
                          </span>
                          <Btn onClick={() => setEditingEmail(e.id)}>Edit</Btn>
                          <Btn
                            danger
                            onClick={() => {
                              if (window.confirm(`Delete step #${e.position}?`)) run(() => deleteSequenceEmail(e.id, slug));
                            }}
                          >
                            Delete
                          </Btn>
                        </div>
                      )}
                    </li>
                  ))}
                </ol>
                {editingEmail === "new" ? (
                  <div className="mt-3 rounded-lg bg-stone-50 p-3">
                    <EmailForm
                      email={null}
                      brandColour={workspace.brand_colour}
                      pending={pending}
                      onCancel={() => setEditingEmail(null)}
                      onSave={(fd) => {
                        run(() => saveSequenceEmail(workspace.id, s.id, slug, null, fd));
                        setEditingEmail(null);
                      }}
                    />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditingEmail("new")}
                    className="mt-3 rounded-lg border border-dashed border-stone-300 px-3 py-2 text-sm text-stone-600 hover:bg-stone-50"
                  >
                    + Add email step
                  </button>
                )}
                <p className="mt-3 text-xs text-stone-500">
                  Personalisation: {"{{name}}"} and {"{{first_name}}"} are replaced at send time.
                  An unsubscribe link is added to every email automatically.
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function EmailForm({
  email,
  brandColour,
  pending,
  onSave,
  onCancel,
}: {
  email: SequenceEmail | null;
  brandColour: string;
  pending: boolean;
  onSave: (fd: FormData) => void;
  onCancel: () => void;
}) {
  return (
    <form action={onSave} className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm font-medium sm:col-span-2">
          Subject
          <input name="subject" required defaultValue={email?.subject ?? ""} className="rounded-lg border border-stone-300 px-3 py-2 text-base font-normal" />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Send after (hours)
          <input name="delay_hours" type="number" min={0} defaultValue={email?.delay_hours ?? 0} className="rounded-lg border border-stone-300 px-3 py-2 text-base font-normal" />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Body (plain text)
        <textarea name="body" rows={6} defaultValue={email?.body ?? ""} className="rounded-lg border border-stone-300 px-3 py-2 text-sm" />
      </label>
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="rounded-lg px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50" style={{ backgroundColor: brandColour }}>
          Save
        </button>
        <button type="button" onClick={onCancel} className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm hover:bg-stone-100">
          Cancel
        </button>
      </div>
    </form>
  );
}

// ==================== BROADCASTS ====================

function BroadcastsTab({
  workspace,
  slug,
  broadcasts,
  canPublish,
  pending,
  run,
}: {
  workspace: Workspace;
  slug: string;
  broadcasts: Broadcast[];
  canPublish: boolean;
  pending: boolean;
  run: (a: () => Promise<{ ok: boolean; error?: string }>) => void;
}) {
  const [editing, setEditing] = useState<Broadcast | "new" | null>(null);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setEditing(editing === "new" ? null : "new")}
          className="rounded-lg px-4 py-2 text-sm font-medium text-white"
          style={{ backgroundColor: workspace.brand_colour }}
        >
          {editing === "new" ? "Close" : "+ New broadcast"}
        </button>
      </div>

      {editing !== null && (
        <form
          action={(fd) => {
            run(() => saveBroadcast(workspace.id, slug, editing === "new" ? null : editing.id, fd));
            setEditing(null);
          }}
          className="flex flex-col gap-3 rounded-2xl border-2 bg-white p-5"
          style={{ borderColor: workspace.brand_colour }}
        >
          <h2 className="text-base font-semibold">{editing === "new" ? "New broadcast" : "Edit broadcast"}</h2>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Subject
            <input name="subject" required defaultValue={editing === "new" ? "" : editing.subject} className="rounded-lg border border-stone-300 px-3 py-2 text-base font-normal" />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Body (plain text — {"{{name}}"} / {"{{first_name}}"} work here too)
            <textarea name="body" rows={8} defaultValue={editing === "new" ? "" : editing.body} className="rounded-lg border border-stone-300 px-3 py-2 text-sm" />
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm font-medium">
              Send to
              <select name="segment_status" defaultValue={editing === "new" ? "all" : editing.segment_status} className="rounded-lg border border-stone-300 px-3 py-2 text-base">
                <option value="all">Everyone (with consent)</option>
                <option value="lead">{STATUS_LABELS.lead}s only</option>
                <option value="subscriber">{STATUS_LABELS.subscriber}s only</option>
                <option value="paid">{STATUS_LABELS.paid} only</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              …and only with tag (optional)
              <input name="segment_tag" defaultValue={editing === "new" ? "" : editing.segment_tag} placeholder="e.g. pilot" className="rounded-lg border border-stone-300 px-3 py-2 text-base font-normal" />
            </label>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={pending} className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50" style={{ backgroundColor: workspace.brand_colour }}>
              Save draft
            </button>
            <button type="button" onClick={() => setEditing(null)} className="rounded-lg border border-stone-300 px-4 py-2 text-sm hover:bg-stone-100">
              Cancel
            </button>
          </div>
        </form>
      )}

      {broadcasts.length === 0 && editing === null && (
        <p className="rounded-2xl border border-dashed border-stone-300 p-8 text-center text-sm text-stone-600">
          No broadcasts yet.
        </p>
      )}

      {broadcasts.map((b) => (
        <div key={b.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-stone-200 bg-white p-4">
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{b.subject}</p>
            <p className="text-sm text-stone-500">
              To: {b.segment_status === "all" ? "everyone" : STATUS_LABELS[b.segment_status]}
              {b.segment_tag && ` · tag “${b.segment_tag}”`}
              {b.scheduled_at && b.status === "scheduled" && ` · ${new Date(b.scheduled_at).toLocaleString("en-IE")}`}
            </p>
          </div>
          <StatusChip
            label={BROADCAST_STATUS_LABELS[b.status]}
            tone={b.status === "sent" ? "green" : b.status === "pending_approval" ? "amber" : b.status === "scheduled" || b.status === "sending" ? "blue" : "stone"}
          />
          <div className="flex flex-wrap gap-2">
            {(b.status === "draft" || b.status === "pending_approval") && (
              <>
                <Btn onClick={() => setEditing(b)}>Edit</Btn>
                {b.status === "draft" && (
                  <Btn onClick={() => run(() => submitBroadcast(b.id, slug))}>Submit for sign-off</Btn>
                )}
                {canPublish && (
                  <Btn
                    accent={workspace.brand_colour}
                    onClick={() => {
                      if (window.confirm(`Approve and send “${b.subject}” on the next run (within ~10 minutes)?`))
                        run(() => scheduleBroadcast(b.id, slug, null));
                    }}
                  >
                    Approve &amp; send
                  </Btn>
                )}
                <Btn
                  danger
                  onClick={() => {
                    if (window.confirm(`Delete “${b.subject}”?`)) run(() => deleteBroadcast(b.id, slug));
                  }}
                >
                  Delete
                </Btn>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ==================== ACTIVITY ====================

function ActivityTab({ log }: { log: EmailLogEntry[] }) {
  if (log.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-stone-300 p-8 text-center text-sm text-stone-600">
        Nothing sent yet. When sequences and broadcasts run, every send,
        skip, and failure shows here — nothing fails silently.
      </p>
    );
  }
  return (
    <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">Recent email activity</caption>
        <thead>
          <tr className="border-b border-stone-200 text-xs text-stone-500 uppercase">
            <th scope="col" className="px-4 py-2 font-medium">To</th>
            <th scope="col" className="px-4 py-2 font-medium">Subject</th>
            <th scope="col" className="px-4 py-2 font-medium">Status</th>
            <th scope="col" className="px-4 py-2 font-medium">When</th>
          </tr>
        </thead>
        <tbody>
          {log.map((l) => (
            <tr key={l.id} className="border-b border-stone-100 last:border-0">
              <td className="max-w-40 truncate px-4 py-2">{l.to_email}</td>
              <td className="max-w-60 truncate px-4 py-2">{l.subject}</td>
              <td className="px-4 py-2">
                <StatusChip
                  label={l.status === "skipped_no_consent" ? "Skipped — no consent" : l.status}
                  tone={l.status === "sent" ? "green" : l.status === "failed" ? "red" : "stone"}
                />
                {l.error && <p className="mt-1 text-xs text-red-700">{l.error}</p>}
              </td>
              <td className="px-4 py-2 whitespace-nowrap text-stone-500">
                {new Date(l.sent_at ?? l.queued_at).toLocaleString("en-IE")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ==================== shared bits ====================

function StatusChip({
  label,
  tone,
}: {
  label: string;
  tone: "green" | "amber" | "blue" | "red" | "stone";
}) {
  const tones: Record<string, string> = {
    green: "bg-emerald-100 text-emerald-800",
    amber: "bg-amber-100 text-amber-800",
    blue: "bg-sky-100 text-sky-800",
    red: "bg-red-100 text-red-800",
    stone: "bg-stone-100 text-stone-700",
  };
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${tones[tone]}`}>
      {label}
    </span>
  );
}

function Btn({
  children,
  onClick,
  danger,
  accent,
}: {
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  accent?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-3 py-1.5 text-sm ${
        danger
          ? "border-red-200 text-red-700 hover:bg-red-50"
          : accent
            ? "border-transparent font-medium text-white"
            : "border-stone-300 text-stone-700 hover:bg-stone-100"
      }`}
      style={accent ? { backgroundColor: accent } : undefined}
    >
      {children}
    </button>
  );
}
