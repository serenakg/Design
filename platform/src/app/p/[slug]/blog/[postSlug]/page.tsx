import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { createClient } from "@/lib/supabase/server";
import type { BlogPost } from "@/lib/types";

async function getPost(slug: string, postSlug: string) {
  const supabase = await createClient();
  const { data: branding } = await supabase
    .from("workspace_branding")
    .select("id")
    .eq("slug", slug)
    .single();
  if (!branding) return null;

  const { data: post } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("workspace_id", branding.id)
    .eq("slug", postSlug)
    .eq("status", "published")
    .single();
  return post as BlogPost | null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; postSlug: string }>;
}): Promise<Metadata> {
  const { slug, postSlug } = await params;
  const post = await getPost(slug, postSlug);
  if (!post) return {};
  return { title: post.title, description: post.excerpt || undefined };
}

export default async function PublicBlogPost({
  params,
}: {
  params: Promise<{ slug: string; postSlug: string }>;
}) {
  const { slug, postSlug } = await params;
  const post = await getPost(slug, postSlug);
  if (!post) notFound();

  return (
    <article>
      <header className="mb-6">
        <h1 className="text-3xl font-semibold">{post.title}</h1>
        {post.published_at && (
          <p className="mt-1 text-sm text-stone-500">
            <time dateTime={post.published_at}>
              {new Date(post.published_at).toLocaleDateString("en-IE", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </time>
          </p>
        )}
      </header>
      <div className="prose-sm flex max-w-none flex-col gap-4 leading-relaxed [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-stone-300 [&_blockquote]:pl-4 [&_blockquote]:text-stone-600 [&_code]:rounded [&_code]:bg-stone-100 [&_code]:px-1 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:text-lg [&_h3]:font-semibold [&_li]:ml-5 [&_ol]:list-decimal [&_ul]:list-disc">
        <Markdown remarkPlugins={[remarkGfm]}>{post.content}</Markdown>
      </div>
    </article>
  );
}
