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

function friendly(error: { code?: string; message: string }): string {
  if (error.code === "23505")
    return "A post with this slug already exists in this workspace.";
  return error.message;
}

export async function saveBlogPost(
  workspaceId: string,
  slug: string,
  postId: string | null,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient();

  const title = String(formData.get("title") ?? "").trim();
  const values = {
    title,
    slug: slugify(String(formData.get("slug") ?? "") || title),
    excerpt: String(formData.get("excerpt") ?? "").trim(),
    content: String(formData.get("content") ?? ""),
  };
  if (!values.title || !values.slug) {
    return { ok: false, error: "A title is required." };
  }

  if (postId) {
    const { error } = await supabase
      .from("blog_posts")
      .update(values)
      .eq("id", postId);
    if (error) return { ok: false, error: friendly(error) };
  } else {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error } = await supabase.from("blog_posts").insert({
      ...values,
      workspace_id: workspaceId,
      created_by: user?.id,
    });
    if (error) return { ok: false, error: friendly(error) };
  }

  revalidatePath(`/w/${slug}/blog`);
  return { ok: true };
}

// Status moves. The database enforces who may do what: anyone on the
// workspace can draft or submit; only can_publish profiles can set
// 'published' (trigger), and approved_by is stamped server-side.
export async function setBlogStatus(
  postId: string,
  slug: string,
  status: "draft" | "pending_approval" | "published"
): Promise<ActionResult> {
  const supabase = await createClient();
  const update: Record<string, unknown> = { status };
  if (status !== "published") {
    // back to draft/pending clears the sign-off — re-publishing
    // requires a fresh approval
    update.approved_by = null;
    update.published_at = null;
  }
  const { error } = await supabase
    .from("blog_posts")
    .update(update)
    .eq("id", postId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/w/${slug}/blog`);
  return { ok: true };
}

export async function deleteBlogPost(
  postId: string,
  slug: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("blog_posts").delete().eq("id", postId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/w/${slug}/blog`);
  return { ok: true };
}
