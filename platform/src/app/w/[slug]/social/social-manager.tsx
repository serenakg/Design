"use client";

import { useState, useTransition } from "react";
import type { SocialPost, Workspace } from "@/lib/types";
import { PLATFORMS, POST_STATUS_LABELS } from "@/lib/types";
import {
  deletePost,
  generateCaption,
  savePost,
  schedulePost,
  submitPost,
  unschedulePost,
} from "./actions";

export function SocialManager({
  workspace,
  slug,
  posts,
  canPublish,
}: {
  workspace: Workspace;
  slug: string;
  posts: SocialPost[];
  canPublish: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // composer state
  const [topic, setTopic] = useState("");
  const [caption, setCaption] = useState("");
  const [graphicText, setGraphicText] = useState("");
  const [generating, setGenerating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [scheduleFor, setScheduleFor] = useState<Record<string, string>>({});

  function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    startTransition(async () => {
      const r = await action();
      setError(r.ok ? null : (r.error ?? "Something went wrong"));
    });
  }

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    const r = await generateCaption(workspace.id, topic);
    if (r.ok) {
      setCaption(r.caption);
      setGraphicText(r.graphicText);
    } else {
      setError(r.error);
    }
    setGenerating(false);
  }

  function handleSave(formData: FormData) {
    startTransition(async () => {
      const r = await savePost(workspace.id, slug, editingId, formData);
      if (!r.ok) setError(r.error ?? "Something went wrong");
      else {
        setError(null);
        setTopic("");
        setCaption("");
        setGraphicText("");
        setEditingId(null);
      }
    });
  }

  const upcoming = posts
    .filter((p) => p.status === "scheduled" && p.scheduled_at)
    .sort((a, b) => (a.scheduled_at! < b.scheduled_at! ? -1 : 1));
  const byDay = new Map<string, SocialPost[]>();
  for (const p of upcoming) {
    const day = new Date(p.scheduled_at!).toLocaleDateString("en-IE", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
    byDay.set(day, [...(byDay.get(day) ?? []), p]);
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <header>
        <h1 className="text-2xl font-semibold">Social builder</h1>
        <p className="text-sm text-stone-600">
          Topic in → post out, in {workspace.name}&apos;s voice. Nothing is
          scheduled without sign-off.
        </p>
      </header>

      {error && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">
          {error}
        </p>
      )}

      {/* ---------- THE COMPOSER ---------- */}
      <form
        action={handleSave}
        className="flex flex-col gap-4 rounded-2xl border-2 bg-white p-5"
        style={{ borderColor: workspace.brand_colour }}
      >
        <h2 className="text-lg font-semibold">
          {editingId ? "Edit post" : "New post"}
        </h2>
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex min-w-60 flex-1 flex-col gap-1 text-sm font-medium">
            Topic
            <input
              name="topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. why women's pension gaps start with career breaks"
              className="rounded-lg border border-stone-300 px-3 py-2 text-base font-normal"
            />
          </label>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating || !topic.trim()}
            className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            style={{ backgroundColor: workspace.brand_colour }}
          >
            {generating ? "Writing…" : "✨ Write caption with AI"}
          </button>
        </div>

        <label className="flex flex-col gap-1 text-sm font-medium">
          Caption (edit freely — the AI drafts, you decide)
          <textarea
            name="caption"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={7}
            className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
          />
        </label>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm font-medium">
            Graphic hook (3–8 words on the branded image)
            <input
              name="graphic_text"
              value={graphicText}
              onChange={(e) => setGraphicText(e.target.value)}
              className="rounded-lg border border-stone-300 px-3 py-2 text-base font-normal"
            />
          </label>
          {/* live preview of the brand graphic */}
          {graphicText && (
            <div
              aria-hidden="true"
              className="flex aspect-square max-w-40 flex-col items-center justify-center gap-2 rounded-xl p-3 text-center"
              style={{
                background: `linear-gradient(135deg, ${workspace.brand_colour}, #1c1917)`,
              }}
            >
              <span className="text-[8px] text-white/80">{workspace.name}</span>
              <span className="font-serif text-xs font-bold text-white">
                {graphicText}
              </span>
              <span className="h-0.5 w-6 rounded bg-white/60" />
            </div>
          )}
        </div>

        <fieldset className="flex flex-wrap gap-4">
          <legend className="pb-1 text-sm font-medium">Platforms</legend>
          {PLATFORMS.map((p) => (
            <label key={p} className="flex items-center gap-1.5 text-sm capitalize">
              <input
                type="checkbox"
                name={`platform_${p}`}
                defaultChecked
                className="h-4 w-4"
              />
              {p}
            </label>
          ))}
        </fieldset>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={pending || !caption.trim()}
            className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            style={{ backgroundColor: workspace.brand_colour }}
          >
            {pending ? "Saving…" : editingId ? "Save changes" : "Save draft"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setTopic("");
                setCaption("");
                setGraphicText("");
              }}
              className="rounded-lg border border-stone-300 px-4 py-2 text-sm hover:bg-stone-100"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {/* ---------- THE CALENDAR ---------- */}
      <section aria-labelledby="calendar-heading">
        <h2 id="calendar-heading" className="mb-3 text-lg font-semibold">
          Calendar
        </h2>
        {upcoming.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-stone-300 p-6 text-center text-sm text-stone-600">
            Nothing scheduled yet. Approved posts land here.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {[...byDay.entries()].map(([day, dayPosts]) => (
              <div key={day}>
                <h3 className="mb-1 text-sm font-semibold text-stone-500">{day}</h3>
                <ul className="flex flex-col gap-2">
                  {dayPosts.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white p-3"
                    >
                      <span
                        className="w-14 shrink-0 text-sm font-semibold"
                        style={{ color: workspace.brand_colour }}
                      >
                        {new Date(p.scheduled_at!).toLocaleTimeString("en-IE", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm">
                        {p.caption}
                      </span>
                      <span className="shrink-0 text-xs text-stone-500">
                        {p.platforms.join(" · ")}
                      </span>
                      {canPublish && (
                        <Btn onClick={() => run(() => unschedulePost(p.id, slug))}>
                          Unschedule
                        </Btn>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ---------- THE QUEUE ---------- */}
      <section aria-labelledby="queue-heading">
        <h2 id="queue-heading" className="mb-3 text-lg font-semibold">
          All posts
        </h2>
        {posts.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-stone-300 p-6 text-center text-sm text-stone-600">
            No posts yet — type a topic above and let the AI draft the first one.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {posts.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-start gap-3 rounded-2xl border border-stone-200 bg-white p-4"
              >
                {p.media_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.media_url}
                    alt=""
                    className="h-16 w-16 shrink-0 rounded-lg object-cover"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm">{p.caption}</p>
                  <p className="mt-1 text-xs text-stone-500">
                    {p.topic && <>Topic: {p.topic} · </>}
                    {p.platforms.join(" · ")}
                  </p>
                  {p.status === "rejected" && p.post_error && (
                    <p className="mt-1 text-xs font-medium text-red-700">
                      Posting failed after retry: {p.post_error}
                    </p>
                  )}
                </div>
                <StatusChip status={p.status} />
                <div className="flex w-full flex-wrap items-center gap-2 border-t border-stone-100 pt-3 sm:w-auto sm:border-0 sm:pt-0">
                  {(p.status === "draft" ||
                    p.status === "pending_approval" ||
                    p.status === "rejected") && (
                    <>
                      <Btn
                        onClick={() => {
                          setEditingId(p.id);
                          setTopic(p.topic);
                          setCaption(p.caption);
                          setGraphicText(p.graphic_text);
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                      >
                        Edit
                      </Btn>
                      {p.status === "draft" && (
                        <Btn onClick={() => run(() => submitPost(p.id, slug))}>
                          Submit for sign-off
                        </Btn>
                      )}
                      {canPublish && (
                        <span className="flex items-center gap-1">
                          <label className="sr-only" htmlFor={`when-${p.id}`}>
                            Schedule time
                          </label>
                          <input
                            id={`when-${p.id}`}
                            type="datetime-local"
                            value={scheduleFor[p.id] ?? ""}
                            onChange={(e) =>
                              setScheduleFor((s) => ({ ...s, [p.id]: e.target.value }))
                            }
                            className="rounded-lg border border-stone-300 px-2 py-1.5 text-sm"
                          />
                          <Btn
                            accent={workspace.brand_colour}
                            onClick={() => {
                              const when = scheduleFor[p.id];
                              if (!when) setError("Pick a date and time first.");
                              else run(() => schedulePost(p.id, slug, when));
                            }}
                          >
                            Approve &amp; schedule
                          </Btn>
                        </span>
                      )}
                      <Btn
                        danger
                        onClick={() => {
                          if (window.confirm("Delete this post?"))
                            run(() => deletePost(p.id, slug));
                        }}
                      >
                        Delete
                      </Btn>
                    </>
                  )}
                  {p.status === "posted" && p.posted_at && (
                    <span className="text-xs text-stone-500">
                      Posted {new Date(p.posted_at).toLocaleString("en-IE")}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatusChip({ status }: { status: SocialPost["status"] }) {
  const tones: Record<string, string> = {
    draft: "bg-stone-100 text-stone-700",
    pending_approval: "bg-amber-100 text-amber-800",
    scheduled: "bg-sky-100 text-sky-800",
    posted: "bg-emerald-100 text-emerald-800",
    rejected: "bg-red-100 text-red-800",
  };
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${tones[status]}`}>
      {POST_STATUS_LABELS[status]}
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
