import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile, TeamInvite, Workspace } from "@/lib/types";
import { TeamAdmin } from "./team-admin";

export default async function TeamPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("*")
    .eq("slug", slug)
    .single();
  if (!workspace) notFound();
  const ws = workspace as Workspace;

  const { data: me } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  const isOwner = (me as Profile | null)?.role === "owner";

  if (!isOwner) {
    return (
      <div className="mx-auto max-w-md py-12 text-center">
        <h1 className="text-2xl font-semibold">Team</h1>
        <p className="mt-2 text-sm text-stone-600">
          Only the owner manages the team — rule #3 of the house: the owner
          holds every key.
        </p>
      </div>
    );
  }

  const [{ data: profiles }, { data: access }, { data: invites }, { data: allWorkspaces }] =
    await Promise.all([
      supabase.from("profiles").select("*").order("created_at"),
      supabase.from("workspace_access").select("user_id, workspace_id"),
      supabase
        .from("team_invites")
        .select("*")
        .is("accepted_at", null)
        .order("created_at", { ascending: false }),
      supabase.from("workspaces").select("id, slug, name, brand_colour").order("name"),
    ]);

  return (
    <TeamAdmin
      slug={slug}
      brandColour={ws.brand_colour}
      me={me as Profile}
      profiles={(profiles ?? []) as Profile[]}
      access={(access ?? []) as { user_id: string; workspace_id: string }[]}
      invites={(invites ?? []) as TeamInvite[]}
      workspaces={(allWorkspaces ?? []) as Pick<Workspace, "id" | "slug" | "name" | "brand_colour">[]}
    />
  );
}
