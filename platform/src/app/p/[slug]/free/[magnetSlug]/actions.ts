"use server";

import { createClient } from "@/lib/supabase/server";

// The public door into the spine. Runs as the anonymous role — the
// SECURITY DEFINER function claim_lead_magnet() is the only opening,
// and it refuses anything without explicit consent.
export async function claimLeadMagnet(
  workspaceSlug: string,
  magnetSlug: string,
  formData: FormData
): Promise<
  | { ok: true; title: string; fileUrl: string }
  | { ok: false; error: string }
> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("claim_lead_magnet", {
    p_workspace_slug: workspaceSlug,
    p_magnet_slug: magnetSlug,
    p_name: String(formData.get("name") ?? ""),
    p_email: String(formData.get("email") ?? ""),
    p_consent: formData.get("consent") === "on",
  });

  if (error) {
    return { ok: false, error: error.message };
  }
  return {
    ok: true,
    title: data.title as string,
    fileUrl: data.file_url as string,
  };
}
