"use client";

import { useTransition } from "react";
import { toggleLessonComplete } from "../../../../courses/actions";

export function CompleteToggle({
  slug,
  enrolmentId,
  courseId,
  lessonId,
  isComplete,
  brandColour,
}: {
  slug: string;
  enrolmentId: string;
  courseId: string;
  lessonId: string;
  isComplete: boolean;
  brandColour: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      aria-pressed={isComplete}
      onClick={() =>
        startTransition(async () => {
          await toggleLessonComplete(slug, enrolmentId, courseId, lessonId);
        })
      }
      className={`rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50 ${
        isComplete ? "border border-stone-300 text-stone-700 hover:bg-stone-100" : "text-white"
      }`}
      style={isComplete ? undefined : { backgroundColor: brandColour }}
    >
      {pending ? "Saving…" : isComplete ? "✓ Done — tap to unmark" : "Mark as done"}
    </button>
  );
}
