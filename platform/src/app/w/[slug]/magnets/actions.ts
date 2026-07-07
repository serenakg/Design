"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { ok: true } | { ok: false; error: string };

function slugify(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export async function createMagnet(
  workspaceId: string,
  slug: string,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient();

  const title = String(formData.get("title") ?? "").trim();
  const fileUrl = String(formData.get("file_url") ?? "").trim();
  if (!title) return { ok: false, error: "A title is required." };
  if (!fileUrl)
    return { ok: false, error: "Upload a file (or paste a file URL) first." };

  const { error } = await supabase.from("lead_magnets").insert({
    workspace_id: workspaceId,
    slug: slugify(String(formData.get("slug") ?? "") || title),
    title,
    description: String(formData.get("description") ?? "").trim(),
    file_url: fileUrl,
    tag: slugify(String(formData.get("tag") ?? "")) || "lead-magnet",
  });

  if (error) {
    return {
      ok: false,
      error:
        error.code === "23505"
          ? "A lead magnet with this slug already exists in this workspace."
          : error.message,
    };
  }
  revalidatePath(`/w/${slug}/magnets`);
  return { ok: true };
}

export async function setMagnetActive(
  magnetId: string,
  slug: string,
  active: boolean
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("lead_magnets")
    .update({ active })
    .eq("id", magnetId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/w/${slug}/magnets`);
  return { ok: true };
}

// Link a magnet to a sequence: landing page → capture → sequence.
export async function setMagnetSequence(
  magnetId: string,
  slug: string,
  sequenceId: string | null
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("lead_magnets")
    .update({ sequence_id: sequenceId })
    .eq("id", magnetId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/w/${slug}/magnets`);
  return { ok: true };
}

export async function deleteMagnet(
  magnetId: string,
  slug: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("lead_magnets")
    .delete()
    .eq("id", magnetId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/w/${slug}/magnets`);
  return { ok: true };
}
