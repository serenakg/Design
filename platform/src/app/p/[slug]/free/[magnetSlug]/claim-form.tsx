"use client";

import { useState, useTransition } from "react";
import { claimLeadMagnet } from "./actions";

export function ClaimForm({
  workspaceSlug,
  magnetSlug,
  brandColour,
}: {
  workspaceSlug: string;
  magnetSlug: string;
  brandColour: string;
}) {
  const [result, setResult] = useState<
    { title: string; fileUrl: string } | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (result) {
    return (
      <div
        role="status"
        className="rounded-2xl border border-stone-200 bg-white p-6 text-center"
      >
        <p className="text-lg font-semibold">It&apos;s yours 🎉</p>
        <p className="mt-1 text-sm text-stone-600">
          Your download is ready below. We&apos;ve saved your details so you
          only ever have to ask once.
        </p>
        <a
          href={result.fileUrl}
          className="mt-4 inline-block rounded-lg px-5 py-2.5 font-medium text-white"
          style={{ backgroundColor: brandColour }}
          download
        >
          Download “{result.title}”
        </a>
      </div>
    );
  }

  return (
    <form
      action={(formData) =>
        startTransition(async () => {
          const r = await claimLeadMagnet(workspaceSlug, magnetSlug, formData);
          if (r.ok) {
            setError(null);
            setResult({ title: r.title, fileUrl: r.fileUrl });
          } else {
            setError(r.error);
          }
        })
      }
      className="flex flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-6"
    >
      <label className="flex flex-col gap-1 text-sm font-medium">
        Your name
        <input
          name="name"
          type="text"
          required
          autoComplete="name"
          className="rounded-lg border border-stone-300 px-3 py-2 text-base font-normal"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Email
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="rounded-lg border border-stone-300 px-3 py-2 text-base font-normal"
        />
      </label>
      <label className="flex items-start gap-2 text-sm text-stone-700">
        <input type="checkbox" name="consent" required className="mt-0.5 h-4 w-4" />
        <span>
          Yes — send me the download and occasional emails. Unsubscribe any
          time, and you can ask for a copy or deletion of your data whenever
          you like.
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
        {pending ? "One moment…" : "Send me the download"}
      </button>
    </form>
  );
}
