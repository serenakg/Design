"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { ok: true } | { ok: false; error: string };

function slugify(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export async function createSpace(
  workspaceId: string,
  slug: string,
  formData: FormData
): Promise<ActionResult> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { ok: false, error: "A name is required." };

  const supabase = await createClient();
  const { error } = await supabase.from("spaces").insert({
    workspace_id: workspaceId,
    slug: slugify(String(formData.get("slug") ?? "") || name),
    name,
    description: String(formData.get("description") ?? "").trim(),
    paid_only: formData.get("paid_only") === "on",
  });
  if (error) {
    return {
      ok: false,
      error:
        error.code === "23505"
          ? "A space with this slug already exists."
          : error.message,
    };
  }
  revalidatePath(`/w/${slug}/community`);
  return { ok: true };
}

export async function deleteSpace(
  spaceId: string,
  slug: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("spaces").delete().eq("id", spaceId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/w/${slug}/community`);
  return { ok: true };
}

// Moderation: hide (reversible, author still sees it) or restore.
export async function moderateContent(
  slug: string,
  targetType: "post" | "comment",
  targetId: string,
  status: "published" | "hidden" | "removed"
): Promise<ActionResult> {
  const supabase = await createClient();
  const table = targetType === "post" ? "space_posts" : "space_comments";
  const { error } = await supabase
    .from(table)
    .update({ status })
    .eq("id", targetId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/w/${slug}/community`);
  return { ok: true };
}

export async function resolveFlag(
  flagId: string,
  slug: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("flags")
    .update({ status: "resolved" })
    .eq("id", flagId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/w/${slug}/community`);
  return { ok: true };
}
