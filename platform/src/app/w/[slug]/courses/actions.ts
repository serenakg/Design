"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function saveCourse(
  workspaceId: string,
  slug: string,
  courseId: string | null,
  formData: FormData
): Promise<ActionResult> {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { ok: false, error: "A title is required." };

  const supabase = await createClient();
  const values = {
    title,
    description: String(formData.get("description") ?? "").trim(),
    paid_only: formData.get("paid_only") === "on",
  };

  if (courseId) {
    const { error } = await supabase
      .from("courses")
      .update(values)
      .eq("id", courseId);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase
      .from("courses")
      .insert({ ...values, workspace_id: workspaceId });
    if (error) return { ok: false, error: error.message };
  }
  revalidatePath(`/w/${slug}/courses`);
  return { ok: true };
}

// Publishing is guarded in the database: only can_publish profiles
// can flip published to true.
export async function setCoursePublished(
  courseId: string,
  slug: string,
  published: boolean
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("courses")
    .update({ published })
    .eq("id", courseId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/w/${slug}/courses`);
  return { ok: true };
}

export async function deleteCourse(
  courseId: string,
  slug: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("courses").delete().eq("id", courseId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/w/${slug}/courses`);
  return { ok: true };
}

export async function saveLesson(
  workspaceId: string,
  courseId: string,
  slug: string,
  lessonId: string | null,
  formData: FormData
): Promise<ActionResult> {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { ok: false, error: "A title is required." };

  const supabase = await createClient();
  const values = {
    title,
    content: String(formData.get("content") ?? ""),
    video_url: String(formData.get("video_url") ?? "").trim() || null,
  };

  if (lessonId) {
    const { error } = await supabase
      .from("lessons")
      .update(values)
      .eq("id", lessonId);
    if (error) return { ok: false, error: error.message };
  } else {
    const { data: last } = await supabase
      .from("lessons")
      .select("position")
      .eq("course_id", courseId)
      .order("position", { ascending: false })
      .limit(1);
    const { error } = await supabase.from("lessons").insert({
      ...values,
      workspace_id: workspaceId,
      course_id: courseId,
      position: (last?.[0]?.position ?? 0) + 1,
    });
    if (error) return { ok: false, error: error.message };
  }
  revalidatePath(`/w/${slug}/courses`);
  return { ok: true };
}

export async function deleteLesson(
  lessonId: string,
  slug: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("lessons").delete().eq("id", lessonId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/w/${slug}/courses`);
  return { ok: true };
}
