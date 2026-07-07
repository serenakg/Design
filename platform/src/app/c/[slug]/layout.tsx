import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Workspace } from "@/lib/types";

export default async function CommunityLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: branding } = await supabase
    .from("workspace_branding")
    .select("*")
    .eq("slug", slug)
    .single();
  if (!branding) notFound();
  const ws = branding as Workspace;
  const communityName = ws.brand_config?.community_name ?? `${ws.name} Community`;

  return (
    <div
      className="flex min-h-screen flex-col"
      style={{ ["--brand" as string]: ws.brand_colour }}
    >
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4">
          <Link
            href={`/c/${slug}`}
            className="text-lg font-semibold"
            style={{ color: ws.brand_colour }}
          >
            {communityName}
          </Link>
          <nav aria-label="Community" className="flex items-center gap-4 text-sm">
            <Link href={`/c/${slug}`} className="text-stone-700 hover:text-stone-900">
              Spaces
            </Link>
            <Link
              href={`/c/${slug}/courses`}
              className="text-stone-700 hover:text-stone-900"
            >
              Courses
            </Link>
            <Link
              href={`/c/${slug}/profile`}
              className="text-stone-700 hover:text-stone-900"
            >
              My profile
            </Link>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="text-stone-500 underline underline-offset-4 hover:text-stone-800"
              >
                Sign out
              </button>
            </form>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">{children}</main>

      <footer className="border-t border-stone-200 bg-white">
        <div className="mx-auto max-w-3xl px-4 py-5 text-xs text-stone-500">
          <p>
            This is a shame-free space: no streaks, no leaderboards, and
            nothing happens if you&apos;re away for a while. Take the pace
            your life allows.
          </p>
        </div>
      </footer>
    </div>
  );
}
