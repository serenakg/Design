"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { ok: true } | { ok: false; error: string };

// -------------------- sequences --------------------

export async function createSequence(
  workspaceId: string,
  slug: string,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { ok: false, error: "A name is required." };

  const { error } = await supabase.from("email_sequences").insert({
    workspace_id: workspaceId,
    name,
    trigger_event: String(formData.get("trigger_event") ?? "contact_created"),
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/w/${slug}/email`);
  return { ok: true };
}

// Status moves — the database decides who may activate (can_publish
// trigger); pausing/drafting clears the sign-off so re-activating
// needs a fresh approval.
export async function setSequenceStatus(
  sequenceId: string,
  slug: string,
  status: "draft" | "pending_approval" | "active" | "paused"
): Promise<ActionResult> {
  const supabase = await createClient();
  const update: Record<string, unknown> = { status };
  if (status !== "active") update.approved_by = null;
  const { error } = await supabase
    .from("email_sequences")
    .update(update)
    .eq("id", sequenceId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/w/${slug}/email`);
  return { ok: true };
}

export async function deleteSequence(
  sequenceId: string,
  slug: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("email_sequences")
    .delete()
    .eq("id", sequenceId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/w/${slug}/email`);
  return { ok: true };
}

export async function saveSequenceEmail(
  workspaceId: string,
  sequenceId: string,
  slug: string,
  emailId: string | null,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient();
  const subject = String(formData.get("subject") ?? "").trim();
  if (!subject) return { ok: false, error: "A subject is required." };

  const values = {
    subject,
    body: String(formData.get("body") ?? ""),
    delay_hours: Math.max(0, Number(formData.get("delay_hours") ?? 0) || 0),
  };

  if (emailId) {
    const { error } = await supabase
      .from("sequence_emails")
      .update(values)
      .eq("id", emailId);
    if (error) return { ok: false, error: error.message };
  } else {
    const { data: last } = await supabase
      .from("sequence_emails")
      .select("position")
      .eq("sequence_id", sequenceId)
      .order("position", { ascending: false })
      .limit(1);
    const { error } = await supabase.from("sequence_emails").insert({
      ...values,
      workspace_id: workspaceId,
      sequence_id: sequenceId,
      position: (last?.[0]?.position ?? 0) + 1,
    });
    if (error) return { ok: false, error: error.message };
  }
  revalidatePath(`/w/${slug}/email`);
  return { ok: true };
}

export async function deleteSequenceEmail(
  emailId: string,
  slug: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("sequence_emails")
    .delete()
    .eq("id", emailId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/w/${slug}/email`);
  return { ok: true };
}

// -------------------- broadcasts --------------------

export async function saveBroadcast(
  workspaceId: string,
  slug: string,
  broadcastId: string | null,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient();
  const subject = String(formData.get("subject") ?? "").trim();
  if (!subject) return { ok: false, error: "A subject is required." };

  const values = {
    subject,
    body: String(formData.get("body") ?? ""),
    segment_status: String(formData.get("segment_status") ?? "all"),
    segment_tag: String(formData.get("segment_tag") ?? "").trim(),
  };

  if (broadcastId) {
    const { error } = await supabase
      .from("broadcasts")
      .update(values)
      .eq("id", broadcastId);
    if (error) return { ok: false, error: error.message };
  } else {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error } = await supabase.from("broadcasts").insert({
      ...values,
      workspace_id: workspaceId,
      created_by: user?.id,
    });
    if (error) return { ok: false, error: error.message };
  }
  revalidatePath(`/w/${slug}/email`);
  return { ok: true };
}

export async function submitBroadcast(
  broadcastId: string,
  slug: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("broadcasts")
    .update({ status: "pending_approval" })
    .eq("id", broadcastId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/w/${slug}/email`);
  return { ok: true };
}

// Approve & schedule — 'now' means the next cron run picks it up.
export async function scheduleBroadcast(
  broadcastId: string,
  slug: string,
  when: string | null
): Promise<ActionResult> {
  const supabase = await createClient();
  const scheduledAt = when ? new Date(when) : new Date();
  if (Number.isNaN(scheduledAt.getTime())) {
    return { ok: false, error: "That date didn't parse — try again." };
  }
  const { error } = await supabase
    .from("broadcasts")
    .update({ status: "scheduled", scheduled_at: scheduledAt.toISOString() })
    .eq("id", broadcastId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/w/${slug}/email`);
  return { ok: true };
}

export async function deleteBroadcast(
  broadcastId: string,
  slug: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("broadcasts")
    .delete()
    .eq("id", broadcastId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/w/${slug}/email`);
  return { ok: true };
}
