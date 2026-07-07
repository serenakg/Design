"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Every action here is owner-only — enforced by RLS (is_owner()
// policies on profiles, workspace_access, and team_invites), not by
// this file. A non-owner calling these gets a database refusal.

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function createInvite(
  slug: string,
  formData: FormData
): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return { ok: false, error: "An email is required." };
  const workspaces = ["serena", "femnest"].filter(
    (w) => formData.get(`ws_${w}`) === "on"
  );
  if (workspaces.length === 0) {
    return { ok: false, error: "Pick at least one workspace for them." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await supabase.from("team_invites").insert({
    email,
    role: String(formData.get("role") ?? "editor"),
    can_publish: formData.get("can_publish") === "on",
    workspace_slugs: workspaces,
    invited_by: user?.id,
  });
  if (error) {
    return {
      ok: false,
      error:
        error.code === "23505"
          ? "There's already a pending invite for this email."
          : error.message,
    };
  }
  revalidatePath(`/w/${slug}/team`);
  return { ok: true };
}

export async function revokeInvite(
  inviteId: string,
  slug: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("team_invites")
    .delete()
    .eq("id", inviteId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/w/${slug}/team`);
  return { ok: true };
}

export async function setWorkspaceAccess(
  slug: string,
  userId: string,
  workspaceId: string,
  granted: boolean
): Promise<ActionResult> {
  const supabase = await createClient();
  if (granted) {
    const { error } = await supabase
      .from("workspace_access")
      .insert({ user_id: userId, workspace_id: workspaceId });
    if (error && error.code !== "23505")
      return { ok: false, error: error.message };
  } else {
    const { error } = await supabase
      .from("workspace_access")
      .delete()
      .eq("user_id", userId)
      .eq("workspace_id", workspaceId);
    if (error) return { ok: false, error: error.message };
  }
  revalidatePath(`/w/${slug}/team`);
  return { ok: true };
}

export async function setCanPublish(
  slug: string,
  userId: string,
  canPublish: boolean
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ can_publish: canPublish })
    .eq("id", userId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/w/${slug}/team`);
  return { ok: true };
}

export async function setRole(
  slug: string,
  userId: string,
  role: "admin" | "editor"
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ role })
    .eq("id", userId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/w/${slug}/team`);
  return { ok: true };
}
