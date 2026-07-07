"use client";

import { useState, useTransition } from "react";
import { joinCommunity } from "./actions";

export function JoinForm({
  slug,
  brandColour,
}: {
  slug: string;
  brandColour: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(fd) =>
        startTransition(async () => {
          const r = await joinCommunity(slug, fd);
          setError(r.ok ? null : (r.error ?? "Something went wrong"));
        })
      }
      className="flex flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-6"
    >
      <label className="flex flex-col gap-1 text-sm font-medium">
        Display name (how you&apos;ll appear here — it doesn&apos;t have to be
        your legal name)
        <input
          name="display_name"
          required
          maxLength={100}
          className="rounded-lg border border-stone-300 px-3 py-2 text-base font-normal"
        />
      </label>

      <label className="flex items-start gap-2 text-sm text-stone-700">
        <input type="checkbox" name="email_consent" className="mt-0.5 h-4 w-4" />
        <span>
          Also email me community news now and then. <strong>Optional</strong> —
          joining works either way, and you can unsubscribe any time.
        </span>
      </label>

      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg px-4 py-2.5 font-medium text-white disabled:opacity-50"
        style={{ backgroundColor: brandColour }}
      >
        {pending ? "One moment…" : "Join free"}
      </button>
    </form>
  );
}
