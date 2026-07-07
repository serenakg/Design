import { createClient } from "@/lib/supabase/server";
import type { Member, Workspace } from "@/lib/types";

// Shared loader for the community area. Members can't see the
// workspaces table (the wall) — branding comes from the public view,
// membership from their own members row.
export async function loadCommunity(slug: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: branding } = await supabase
    .from("workspace_branding")
    .select("*")
    .eq("slug", slug)
    .single();

  let member: Member | null = null;
  if (user && branding) {
    const { data } = await supabase
      .from("members")
      .select("*")
      .eq("workspace_id", branding.id)
      .eq("user_id", user.id)
      .maybeSingle();
    member = (data as Member | null) ?? null;
  }

  return {
    supabase,
    user,
    workspace: (branding as Workspace | null) ?? null,
    member,
  };
}
