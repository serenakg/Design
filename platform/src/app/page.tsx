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

  // Signed in but not yet granted a workspace — new team member state.
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-semibold">Almost there</h1>
      <p className="text-stone-600">
        Your account exists, but you haven&apos;t been given a workspace yet.
        Ask the owner to grant you access — access is per workspace, on
        purpose.
      </p>
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
