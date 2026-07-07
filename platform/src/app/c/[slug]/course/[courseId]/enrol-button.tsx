"use client";

import { useState, useTransition } from "react";
import { enrolInCourse } from "../../courses/actions";

export function EnrolButton({
  slug,
  workspaceId,
  courseId,
  contactId,
  brandColour,
}: {
  slug: string;
  workspaceId: string;
  courseId: string;
  contactId: string;
  brandColour: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="mt-3 flex flex-col items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const r = await enrolInCourse(slug, workspaceId, courseId, contactId);
            setError(r.ok ? null : (r.error ?? "Something went wrong"));
          })
        }
        className="rounded-lg px-5 py-2.5 font-medium text-white disabled:opacity-50"
        style={{ backgroundColor: brandColour }}
      >
        {pending ? "One moment…" : "Start this course"}
      </button>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
