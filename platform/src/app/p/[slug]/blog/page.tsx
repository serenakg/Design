import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { BlogPost, Workspace } from "@/lib/types";

export default async function PublicBlogIndex({
  params,
}: {
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

  const { data: posts } = await supabase
    .from("blog_posts")
    .select("id, slug, title, excerpt, published_at")
    .eq("workspace_id", ws.id)
    .eq("status", "published")
    .order("published_at", { ascending: false });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Blog</h1>
      {(posts ?? []).length === 0 ? (
        <p className="text-sm text-stone-500">First posts coming soon.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {(posts as BlogPost[]).map((p) => (
            <li key={p.id}>
              <article className="rounded-2xl border border-stone-200 bg-white p-5">
                <h2 className="text-lg font-semibold">
                  <Link
                    href={`/p/${slug}/blog/${p.slug}`}
                    className="hover:underline"
                  >
                    {p.title}
                  </Link>
                </h2>
                {p.published_at && (
                  <p className="mt-0.5 text-xs text-stone-500">
                    <time dateTime={p.published_at}>
                      {new Date(p.published_at).toLocaleDateString("en-IE", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </time>
                  </p>
                )}
                {p.excerpt && (
                  <p className="mt-2 text-sm text-stone-600">{p.excerpt}</p>
                )}
              </article>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
