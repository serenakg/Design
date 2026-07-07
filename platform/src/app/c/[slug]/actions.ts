"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function joinCommunity(
  slug: string,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("join_community", {
    p_workspace_slug: slug,
    p_display_name: String(formData.get("display_name") ?? "").trim(),
    p_email_consent: formData.get("email_consent") === "on",
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/c/${slug}`);
  return { ok: true };
}

export async function createSpacePost(
  slug: string,
  spaceId: string,
  workspaceId: string,
  memberId: string,
  formData: FormData
): Promise<ActionResult> {
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return { ok: false, error: "Write something first." };

  const supabase = await createClient();
  const { error } = await supabase.from("space_posts").insert({
    workspace_id: workspaceId,
    space_id: spaceId,
    author_member_id: memberId,
    title: String(formData.get("title") ?? "").trim(),
    body,
    content_warning: String(formData.get("content_warning") ?? "").trim(),
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/c/${slug}`);
  return { ok: true };
}

export async function createSpaceComment(
  slug: string,
  postId: string,
  workspaceId: string,
  memberId: string,
  formData: FormData
): Promise<ActionResult> {
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return { ok: false, error: "Write something first." };

  const supabase = await createClient();
  const { error } = await supabase.from("space_comments").insert({
    workspace_id: workspaceId,
    post_id: postId,
    author_member_id: memberId,
    body,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/c/${slug}/post/${postId}`);
  return { ok: true };
}

// The report button. Quiet, judgment-free; goes straight to the team.
export async function flagContent(
  slug: string,
  workspaceId: string,
  memberId: string,
  targetType: "post" | "comment",
  targetId: string,
  reason: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("flags").insert({
    workspace_id: workspaceId,
    target_type: targetType,
    target_id: targetId,
    reporter_member_id: memberId,
    reason: reason.trim().slice(0, 500),
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function updateMyProfile(
  slug: string,
  memberId: string,
  formData: FormData
): Promise<ActionResult> {
  const displayName = String(formData.get("display_name") ?? "").trim();
  if (!displayName) return { ok: false, error: "A display name is required." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("members")
    .update({
      display_name: displayName,
      pronouns: String(formData.get("pronouns") ?? "").trim(),
      bio: String(formData.get("bio") ?? "").trim(),
    })
    .eq("id", memberId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/c/${slug}`);
  return { ok: true };
}
