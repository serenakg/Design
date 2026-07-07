"use client";

import { useState, useTransition } from "react";
import type { Member } from "@/lib/types";
import { updateMyProfile } from "../actions";

export function ProfileForm({
  slug,
  member,
  brandColour,
}: {
  slug: string;
  member: Member;
  brandColour: string;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(fd) =>
        startTransition(async () => {
          const r = await updateMyProfile(slug, member.id, fd);
          setMessage(r.ok ? "Saved." : (r.error ?? "Something went wrong"));
        })
      }
      className="flex flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-6"
    >
      <label className="flex flex-col gap-1 text-sm font-medium">
        Display name
        <input
          name="display_name"
          defaultValue={member.display_name}
          required
          maxLength={100}
          className="rounded-lg border border-stone-300 px-3 py-2 text-base font-normal"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Pronouns (optional)
        <input
          name="pronouns"
          defaultValue={member.pronouns}
          maxLength={40}
          placeholder="e.g. she/her"
          className="rounded-lg border border-stone-300 px-3 py-2 text-base font-normal"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        About you (optional)
        <textarea
          name="bio"
          defaultValue={member.bio}
          rows={4}
          maxLength={1000}
          className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
        />
      </label>

      {message && (
        <p role="status" className="text-sm text-stone-700">
          {message}
        </p>
      )}

      <div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          style={{ backgroundColor: brandColour }}
        >
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}
