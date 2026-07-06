"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// All mutations run through the user's own Supabase session, so
// row-level security applies: nobody can write into a workspace
// they haven't been granted, no matter what the form submits.

export type ActionResult = { ok: true } | { ok: false; error: string };

function parseTags(raw: string): string[] {
  return raw
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
}

export async function addContact(
  workspaceId: string,
  slug: string,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient();

  const hasConsent = formData.get("consent") === "on";
  const { error } = await supabase.from("contacts").insert({
    workspace_id: workspaceId,
    name: String(formData.get("name") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    status: String(formData.get("status") ?? "lead"),
    source: String(formData.get("source") ?? "manual").trim() || "manual",
    value: Number(formData.get("value") ?? 0) || 0,
    tags: parseTags(String(formData.get("tags") ?? "")),
    consent_at: hasConsent ? new Date().toISOString() : null,
    consent_note: hasConsent
      ? String(formData.get("consent_note") ?? "Added manually with recorded consent")
      : null,
  });

  if (error) {
    return {
      ok: false,
      error: error.code === "23505"
        ? "A contact with this email already exists in this workspace."
        : error.message,
    };
  }
  revalidatePath(`/w/${slug}/contacts`);
  return { ok: true };
}

export async function updateContact(
  contactId: string,
  slug: string,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("contacts")
    .update({
      name: String(formData.get("name") ?? "").trim(),
      email: String(formData.get("email") ?? "").trim().toLowerCase(),
      status: String(formData.get("status") ?? "lead"),
      source: String(formData.get("source") ?? "manual").trim() || "manual",
      value: Number(formData.get("value") ?? 0) || 0,
      tags: parseTags(String(formData.get("tags") ?? "")),
    })
    .eq("id", contactId);

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/w/${slug}/contacts`);
  return { ok: true };
}

// GDPR right to erasure — removes the contact and everything
// referencing them (memberships, enrolments) via the DB function.
export async function eraseContact(
  contactId: string,
  slug: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("gdpr_delete_contact", {
    p_contact_id: contactId,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/w/${slug}/contacts`);
  return { ok: true };
}

// GDPR right of access / portability — returns everything held on
// this person as JSON, for download.
export async function exportContact(
  contactId: string
): Promise<{ ok: true; data: unknown } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("gdpr_export_contact", {
    p_contact_id: contactId,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, data };
}
