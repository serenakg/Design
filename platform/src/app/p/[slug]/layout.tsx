import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Workspace } from "@/lib/types";

// Public site shell — no auth. Branding comes from the
// workspace_branding view, which exposes only brand-safe columns.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("workspace_branding")
    .select("name, brand_config")
    .eq("slug", slug)
    .single();
  if (!data) return {};
  return {
    title: data.name,
    description: data.brand_config?.tagline ?? undefined,
  };
}

export default async function PublicSiteLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("workspace_branding")
    .select("*")
    .eq("slug", slug)
    .single();
  if (!data) notFound();
  const ws = data as Workspace;

  return (
    <div
      className="flex min-h-screen flex-col"
      style={{ ["--brand" as string]: ws.brand_colour }}
    >
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4">
          <Link
            href={`/p/${slug}`}
            className="text-lg font-semibold"
            style={{ color: ws.brand_colour }}
          >
            {ws.name}
          </Link>
          <nav aria-label="Site" className="flex items-center gap-4 text-sm">
            <Link
              href={`/p/${slug}`}
              className="text-stone-700 hover:text-stone-900"
            >
              Home
            </Link>
            <Link
              href={`/p/${slug}/blog`}
              className="text-stone-700 hover:text-stone-900"
            >
              Blog
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        {children}
      </main>

      <footer className="border-t border-stone-200 bg-white">
        <div className="mx-auto max-w-3xl px-4 py-6 text-sm text-stone-500">
          <p>© {new Date().getFullYear()} {ws.name}</p>
          <p className="mt-1">
            Your data stays yours: we only store what you give us, with your
            consent, and you can ask for a copy or deletion at any time.
          </p>
        </div>
      </footer>
    </div>
  );
}
