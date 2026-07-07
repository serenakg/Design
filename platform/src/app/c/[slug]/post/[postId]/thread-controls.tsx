"use client";

import { useRef, useState, useTransition } from "react";
import { createSpaceComment, flagContent } from "../../actions";

export function CommentComposer({
  slug,
  postId,
  workspaceId,
  memberId,
  brandColour,
}: {
  slug: string;
  postId: string;
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
          const r = await createSpaceComment(slug, postId, workspaceId, memberId, fd);
          if (!r.ok) setError(r.error ?? "Something went wrong");
          else {
            setError(null);
            formRef.current?.reset();
          }
        })
      }
      className="flex flex-col gap-2 rounded-xl border border-stone-200 bg-white p-4"
    >
      <label className="flex flex-col gap-1 text-sm font-medium">
        Reply
        <textarea
          name="body"
          rows={3}
          required
          className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
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
          {pending ? "Sending…" : "Reply"}
        </button>
      </div>
    </form>
  );
}

export function FlagButton({
  slug,
  workspaceId,
  memberId,
  targetType,
  targetId,
}: {
  slug: string;
  workspaceId: string;
  memberId: string;
  targetType: "post" | "comment";
  targetId: string;
}) {
  const [state, setState] = useState<"idle" | "sent">("idle");
  const [pending, startTransition] = useTransition();

  if (state === "sent") {
    return (
      <p className="text-xs text-stone-500" role="status">
        Thank you — the team will take a quiet look.
      </p>
    );
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        const reason = window.prompt(
          "What's worrying about this? (a word or two is plenty — the team reviews every report)"
        );
        if (reason === null) return;
        startTransition(async () => {
          const r = await flagContent(slug, workspaceId, memberId, targetType, targetId, reason);
          if (r.ok) setState("sent");
        });
      }}
      className="text-xs text-stone-400 underline underline-offset-4 hover:text-stone-700"
    >
      Report to the team
    </button>
  );
}
