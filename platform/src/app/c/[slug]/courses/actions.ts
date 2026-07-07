"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function enrolInCourse(
  slug: string,
  workspaceId: string,
  courseId: string,
  contactId: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("enrolments").insert({
    workspace_id: workspaceId,
    course_id: courseId,
    contact_id: contactId,
  });
  if (error && error.code !== "23505") return { ok: false, error: error.message };
  revalidatePath(`/c/${slug}/course/${courseId}`);
  return { ok: true };
}

// Progress is a private checklist, nothing more. Marking and
// un-marking are both fine — life happens.
export async function toggleLessonComplete(
  slug: string,
  enrolmentId: string,
  courseId: string,
  lessonId: string
): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: enrolment } = await supabase
    .from("enrolments")
    .select("progress")
    .eq("id", enrolmentId)
    .single();
  if (!enrolment) return { ok: false, error: "Enrolment not found." };

  const completed: string[] = enrolment.progress?.completed ?? [];
  const next = completed.includes(lessonId)
    ? completed.filter((id) => id !== lessonId)
    : [...completed, lessonId];

  const { error } = await supabase
    .from("enrolments")
    .update({ progress: { completed: next } })
    .eq("id", enrolmentId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/c/${slug}/course/${courseId}`);
  return { ok: true };
}
