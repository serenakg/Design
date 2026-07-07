"use client";

import { useRef, useState, useTransition } from "react";
import { createSpacePost } from "../../actions";

export function PostComposer({
  slug,
  spaceId,
  workspaceId,
  memberId,
  brandColour,
}: {
  slug: string;
  spaceId: string;
  workspaceId: string;
  memberId: string;
  brandColour: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={(fd) =>
        startTransition(async () => {
          const r = await createSpacePost(slug, spaceId, workspaceId, memberId, fd);
          if (!r.ok) setError(r.error ?? "Something went wrong");
          else {
            setError(null);
            formRef.current?.reset();
          }
        })
      }
      className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-5"
    >
      <label className="flex flex-col gap-1 text-sm font-medium">
        Title (optional)
        <input
          name="title"
          maxLength={200}
          className="rounded-lg border border-stone-300 px-3 py-2 text-base font-normal"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Share what you like
        <textarea
          name="body"
          rows={4}
          required
          className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Content note (optional — e.g. “health”, “money worries”; readers
        choose when to open it)
        <input
          name="content_warning"
          maxLength={100}
          className="rounded-lg border border-stone-300 px-3 py-2 text-base font-normal"
        />
      </label>

      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}

      <div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          style={{ backgroundColor: brandColour }}
        >
          {pending ? "Posting…" : "Post"}
        </button>
      </div>
    </form>
  );
}
