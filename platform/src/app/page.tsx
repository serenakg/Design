import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Landing router: send the user to the first workspace they can access.
export default async function Home() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: workspaces } = await supabase
    .from("workspaces")
    .select("slug")
    .order("name");

  if (workspaces && workspaces.length > 0) {
    redirect(`/w/${workspaces[0].slug}`);
  }

  // Not on the team — maybe a community member? Their members row
  // points at their community.
  const { data: memberships } = await supabase
    .from("members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .limit(1);
  if (memberships && memberships.length > 0) {
    const { data: branding } = await supabase
      .from("workspace_branding")
      .select("slug")
      .eq("id", memberships[0].workspace_id)
      .single();
    if (branding) redirect(`/c/${branding.slug}`);
  }

  // Signed in, no team access, no membership yet — offer the communities.
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-semibold">Welcome</h1>
      <p className="text-stone-600">
        Join a community below — or, if you&apos;re joining the team, ask the
        owner to grant you workspace access.
      </p>
      <div className="flex gap-3">
        <Link
          href="/c/serena"
          className="rounded-lg px-4 py-2 text-sm font-medium text-white"
          style={{ backgroundColor: "#7C3AED" }}
        >
          Delia
        </Link>
        <Link
          href="/c/femnest"
          className="rounded-lg px-4 py-2 text-sm font-medium text-white"
          style={{ backgroundColor: "#EC4899" }}
        >
          FemNEST
        </Link>
      </div>
      <form action="/auth/signout" method="post">
        <button
          type="submit"
          className="rounded-lg border border-stone-300 px-4 py-2 text-sm hover:bg-stone-100"
        >
          Sign out
        </button>
      </form>
    </main>
  );
}
