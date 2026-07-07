import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile, Workspace } from "@/lib/types";
import { WorkspaceNav } from "./nav";

// The workspace shell. RLS means the workspaces query only returns
// workspaces this user has been granted — so landing on a URL for the
// other workspace 404s instead of leaking anything.
export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: workspaces }, { data: profile }] = await Promise.all([
    supabase.from("workspaces").select("*").order("name"),
    supabase.from("profiles").select("*").eq("id", user.id).single(),
  ]);

  const accessible = (workspaces ?? []) as Workspace[];
  const current = accessible.find((w) => w.slug === slug);
  if (!current) notFound();

  return (
    <div
      className="flex min-h-screen flex-col md:flex-row"
      style={{ ["--brand" as string]: current.brand_colour }}
    >
      <aside className="flex w-full shrink-0 flex-col gap-4 border-b border-stone-200 bg-white p-4 md:min-h-screen md:w-64 md:border-b-0 md:border-r">
        {/* Workspace switcher — Notion-style, one click between worlds */}
        <nav aria-label="Workspaces" className="flex flex-col gap-1">
          <p className="px-2 pb-1 text-xs font-semibold tracking-wide text-stone-500 uppercase">
            Workspace
          </p>
          {accessible.map((w) => {
            const active = w.slug === slug;
            return (
              <Link
                key={w.id}
                href={`/w/${w.slug}`}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium ${
                  active
                    ? "text-white"
                    : "text-stone-700 hover:bg-stone-100"
                }`}
                style={active ? { backgroundColor: w.brand_colour } : undefined}
              >
                <span
                  aria-hidden="true"
                  className="flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold"
                  style={{
                    backgroundColor: active ? "rgba(255,255,255,.25)" : w.brand_colour,
                    color: "#fff",
                  }}
                >
                  {w.name.charAt(0)}
                </span>
                {w.name}
              </Link>
            );
          })}
        </nav>

        <WorkspaceNav slug={slug} />

        <div className="mt-auto flex flex-col gap-2 border-t border-stone-200 pt-4">
          <p className="truncate px-2 text-sm text-stone-700">
            {(profile as Profile | null)?.full_name || user.email}
            <span className="block text-xs text-stone-500">
              {(profile as Profile | null)?.role ?? "member"}
            </span>
          </p>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="w-full rounded-lg border border-stone-300 px-3 py-1.5 text-left text-sm text-stone-700 hover:bg-stone-100"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}
