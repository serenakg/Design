"use client";

import { useState, useTransition } from "react";
import type { BlogPost, Workspace } from "@/lib/types";
import { BLOG_STATUS_LABELS } from "@/lib/types";
import { deleteBlogPost, saveBlogPost, setBlogStatus } from "./actions";

export function BlogManager({
  workspace,
  slug,
  posts,
  canPublish,
}: {
  workspace: Workspace;
  slug: string;
  posts: BlogPost[];
  canPublish: boolean;
}) {
  const [editing, setEditing] = useState<BlogPost | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    startTransition(async () => {
      const r = await action();
      if (!r.ok) setError(r.error ?? "Something went wrong");
      else {
        setError(null);
        setEditing(null);
      }
    });
  }

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Blog</h1>
          <p className="text-sm text-stone-600">
            {workspace.name} — drafts stay behind the wall; nothing goes live
            without sign-off.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href={`/p/${slug}/blog`}
            target="_blank"
            rel="noreferrer"
            className="text-sm underline underline-offset-4"
            style={{ color: workspace.brand_colour }}
          >
            View public blog ↗
          </a>
          <button
            type="button"
            onClick={() => {
              setEditing(editing === "new" ? null : "new");
              setError(null);
            }}
            className="rounded-lg px-4 py-2 text-sm font-medium text-white"
            style={{ backgroundColor: workspace.brand_colour }}
          >
            {editing === "new" ? "Close" : "+ New post"}
          </button>
        </div>
      </header>

      {error && (
        <p
          role="alert"
          className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800"
        >
          {error}
        </p>
      )}

      {editing !== null && (
        <PostEditor
          key={editing === "new" ? "new" : editing.id}
          post={editing === "new" ? null : editing}
          brandColour={workspace.brand_colour}
          pending={pending}
          onCancel={() => setEditing(null)}
          onSave={(formData) =>
            run(() =>
              saveBlogPost(
                workspace.id,
                slug,
                editing === "new" ? null : editing.id,
                formData
              )
            )
          }
        />
      )}

      {posts.length === 0 && editing === null ? (
        <p className="rounded-2xl border border-dashed border-stone-300 p-8 text-center text-sm text-stone-600">
          No posts yet — write the first one.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {posts.map((p) => (
            <li
              key={p.id}
              className="flex flex-wrap items-center gap-3 rounded-2xl border border-stone-200 bg-white p-4"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{p.title}</p>
                <p className="truncate text-sm text-stone-500">/{p.slug}</p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                  p.status === "published"
                    ? "bg-emerald-100 text-emerald-800"
                    : p.status === "pending_approval"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-stone-100 text-stone-700"
                }`}
              >
                {BLOG_STATUS_LABELS[p.status]}
              </span>
              <div className="flex w-full flex-wrap gap-2 border-t border-stone-100 pt-3 sm:w-auto sm:border-0 sm:pt-0">
                {p.status !== "published" && (
                  <Btn onClick={() => setEditing(p)}>Edit</Btn>
                )}
                {p.status === "draft" && (
                  <Btn onClick={() => run(() => setBlogStatus(p.id, slug, "pending_approval"))}>
                    Submit for sign-off
                  </Btn>
                )}
                {canPublish && p.status !== "published" && (
                  <Btn
                    onClick={() => run(() => setBlogStatus(p.id, slug, "published"))}
                    accent={workspace.brand_colour}
                  >
                    Approve &amp; publish
                  </Btn>
                )}
                {p.status === "published" && (
                  <>
                    <a
                      href={`/p/${slug}/blog/${p.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm text-stone-700 hover:bg-stone-100"
                    >
                      View ↗
                    </a>
                    {canPublish && (
                      <Btn onClick={() => run(() => setBlogStatus(p.id, slug, "draft"))}>
                        Unpublish
                      </Btn>
                    )}
                  </>
                )}
                {p.status !== "published" && (
                  <Btn
                    danger
                    onClick={() => {
                      if (window.confirm(`Delete “${p.title}”? This cannot be undone.`))
                        run(() => deleteBlogPost(p.id, slug));
                    }}
                  >
                    Delete
                  </Btn>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PostEditor({
  post,
  brandColour,
  pending,
  onSave,
  onCancel,
}: {
  post: BlogPost | null;
  brandColour: string;
  pending: boolean;
  onSave: (formData: FormData) => void;
  onCancel: () => void;
}) {
  return (
    <form
      action={onSave}
      className="mb-6 flex flex-col gap-4 rounded-2xl border-2 bg-white p-5"
      style={{ borderColor: brandColour }}
    >
      <h2 className="text-lg font-semibold">
        {post ? `Edit “${post.title}”` : "New post"}
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Title
          <input
            name="title"
            defaultValue={post?.title ?? ""}
            required
            className="rounded-lg border border-stone-300 px-3 py-2 text-base font-normal"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Slug (URL — leave blank to use the title)
          <input
            name="slug"
            defaultValue={post?.slug ?? ""}
            pattern="[a-z0-9\-]*"
            className="rounded-lg border border-stone-300 px-3 py-2 text-base font-normal"
          />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Excerpt (shows in lists and search results)
        <input
          name="excerpt"
          defaultValue={post?.excerpt ?? ""}
          className="rounded-lg border border-stone-300 px-3 py-2 text-base font-normal"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Content (Markdown — # headings, **bold**, - lists, [links](https://…))
        <textarea
          name="content"
          defaultValue={post?.content ?? ""}
          rows={14}
          className="rounded-lg border border-stone-300 px-3 py-2 font-mono text-sm"
        />
      </label>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          style={{ backgroundColor: brandColour }}
        >
          {pending ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-stone-300 px-4 py-2 text-sm hover:bg-stone-100"
        >
          Cancel
        </button>
      </div>
    </form>
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
