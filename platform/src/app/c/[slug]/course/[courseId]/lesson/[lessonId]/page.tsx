import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Enrolment, Lesson } from "@/lib/types";
import { loadCommunity } from "../../../../community";
import { CompleteToggle } from "./complete-toggle";

export default async function LessonPage({
  params,
}: {
  params: Promise<{ slug: string; courseId: string; lessonId: string }>;
}) {
  const { slug, courseId, lessonId } = await params;
  const { supabase, user, workspace, member } = await loadCommunity(slug);
  if (!workspace) notFound();
  if (!user) redirect("/login");
  if (!member) redirect(`/c/${slug}`);

  const [{ data: lesson }, { data: enrolment }, { data: siblings }] =
    await Promise.all([
      supabase
        .from("lessons")
        .select("*")
        .eq("id", lessonId)
        .eq("course_id", courseId)
        .single(),
      supabase
        .from("enrolments")
        .select("*")
        .eq("course_id", courseId)
        .eq("contact_id", member.contact_id)
        .maybeSingle(),
      supabase
        .from("lessons")
        .select("id, position")
        .eq("course_id", courseId)
        .order("position"),
    ]);
  if (!lesson) notFound();
  const l = lesson as Lesson;
  const enrolled = (enrolment as Enrolment | null) ?? null;
  if (!enrolled) redirect(`/c/${slug}/course/${courseId}`);

  const completed = new Set(enrolled.progress?.completed ?? []);
  const ordered = (siblings ?? []) as Pick<Lesson, "id" | "position">[];
  const idx = ordered.findIndex((s) => s.id === l.id);
  const next = idx >= 0 ? ordered[idx + 1] : undefined;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <Link
          href={`/c/${slug}/course/${courseId}`}
          className="text-sm text-stone-500 hover:underline"
        >
          ← Back to the course
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">{l.title}</h1>
      </header>

      {l.video_url && (
        <p className="rounded-2xl border border-stone-200 bg-white p-4 text-sm">
          🎬{" "}
          <a
            href={l.video_url}
            target="_blank"
            rel="noreferrer"
            className="font-medium underline underline-offset-4"
            style={{ color: workspace.brand_colour }}
          >
            Watch the video for this lesson
          </a>{" "}
          <span className="text-stone-500">
            (opens separately — handy on slow connections)
          </span>
        </p>
      )}

      <div className="rounded-2xl border border-stone-200 bg-white p-6">
        <div className="flex max-w-none flex-col gap-4 text-sm leading-relaxed [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-stone-300 [&_blockquote]:pl-4 [&_blockquote]:text-stone-600 [&_code]:rounded [&_code]:bg-stone-100 [&_code]:px-1 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:text-base [&_h3]:font-semibold [&_li]:ml-5 [&_ol]:list-decimal [&_ul]:list-disc">
          <Markdown remarkPlugins={[remarkGfm]}>{l.content}</Markdown>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <CompleteToggle
          slug={slug}
          enrolmentId={enrolled.id}
          courseId={courseId}
          lessonId={l.id}
          isComplete={completed.has(l.id)}
          brandColour={workspace.brand_colour}
        />
        {next && (
          <Link
            href={`/c/${slug}/course/${courseId}/lesson/${next.id}`}
            className="rounded-lg border border-stone-300 px-4 py-2 text-sm hover:bg-stone-100"
          >
            Next lesson →
          </Link>
        )}
      </div>
    </div>
  );
}
