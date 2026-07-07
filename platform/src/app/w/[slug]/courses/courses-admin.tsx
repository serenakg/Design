"use client";

import { useState, useTransition } from "react";
import type { Course, Enrolment, Lesson, Workspace } from "@/lib/types";
import {
  deleteCourse,
  deleteLesson,
  saveCourse,
  saveLesson,
  setCoursePublished,
} from "./actions";

export function CoursesAdmin({
  workspace,
  slug,
  courses,
  lessons,
  enrolments,
  canPublish,
}: {
  workspace: Workspace;
  slug: string;
  courses: Course[];
  lessons: Lesson[];
  enrolments: Pick<Enrolment, "id" | "course_id">[];
  canPublish: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [editingLesson, setEditingLesson] = useState<string | "new" | null>(null);
  const [editingCourse, setEditingCourse] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    startTransition(async () => {
      const r = await action();
      setError(r.ok ? null : (r.error ?? "Something went wrong"));
    });
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Courses</h1>
          <p className="text-sm text-stone-600">
            Gated lessons for the {workspace.brand_config?.community_name ?? workspace.name} community.
            Progress is private and shame-free — no deadlines, no streaks.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAdd((v) => !v)}
          className="rounded-lg px-4 py-2 text-sm font-medium text-white"
          style={{ backgroundColor: workspace.brand_colour }}
        >
          {showAdd ? "Close" : "+ New course"}
        </button>
      </header>

      {error && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">
          {error}
        </p>
      )}

      {showAdd && (
        <CourseForm
          course={null}
          brandColour={workspace.brand_colour}
          pending={pending}
          onSave={(fd) => {
            run(() => saveCourse(workspace.id, slug, null, fd));
            setShowAdd(false);
          }}
          onCancel={() => setShowAdd(false)}
        />
      )}

      {courses.length === 0 && !showAdd && (
        <p className="rounded-2xl border border-dashed border-stone-300 p-8 text-center text-sm text-stone-600">
          No courses yet — create the first one.
        </p>
      )}

      {courses.map((c) => {
        const courseLessons = lessons.filter((l) => l.course_id === c.id);
        const enrolCount = enrolments.filter((e) => e.course_id === c.id).length;
        const isOpen = open === c.id;
        return (
          <div key={c.id} className="rounded-2xl border border-stone-200 bg-white">
            {editingCourse === c.id ? (
              <div className="p-4">
                <CourseForm
                  course={c}
                  brandColour={workspace.brand_colour}
                  pending={pending}
                  onSave={(fd) => {
                    run(() => saveCourse(workspace.id, slug, c.id, fd));
                    setEditingCourse(null);
                  }}
                  onCancel={() => setEditingCourse(null)}
                />
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-3 p-4">
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : c.id)}
                  aria-expanded={isOpen}
                  className="min-w-0 flex-1 text-left"
                >
                  <p className="font-medium">
                    {c.title}
                    {c.paid_only && <span className="ml-2 text-xs text-stone-500">🔒 paid members</span>}
                  </p>
                  <p className="text-sm text-stone-500">
                    {courseLessons.length} lesson{courseLessons.length === 1 ? "" : "s"} · {enrolCount} enrolled
                  </p>
                </button>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                    c.published ? "bg-emerald-100 text-emerald-800" : "bg-stone-100 text-stone-700"
                  }`}
                >
                  {c.published ? "Published" : "Draft"}
                </span>
                <div className="flex flex-wrap gap-2">
                  <Btn onClick={() => setEditingCourse(c.id)}>Edit</Btn>
                  {canPublish &&
                    (c.published ? (
                      <Btn onClick={() => run(() => setCoursePublished(c.id, slug, false))}>
                        Unpublish
                      </Btn>
                    ) : (
                      <Btn
                        accent={workspace.brand_colour}
                        onClick={() => run(() => setCoursePublished(c.id, slug, true))}
                      >
                        Approve &amp; publish
                      </Btn>
                    ))}
                  <Btn
                    danger
                    onClick={() => {
                      if (window.confirm(`Delete “${c.title}”, its lessons, and all enrolments?`))
                        run(() => deleteCourse(c.id, slug));
                    }}
                  >
                    Delete
                  </Btn>
                </div>
              </div>
            )}

            {isOpen && (
              <div className="border-t border-stone-100 p-4">
                <ol className="flex flex-col gap-2">
                  {courseLessons.map((l) => (
                    <li key={l.id} className="rounded-lg bg-stone-50 p-3">
                      {editingLesson === l.id ? (
                        <LessonForm
                          lesson={l}
                          brandColour={workspace.brand_colour}
                          pending={pending}
                          onSave={(fd) => {
                            run(() => saveLesson(workspace.id, c.id, slug, l.id, fd));
                            setEditingLesson(null);
                          }}
                          onCancel={() => setEditingLesson(null)}
                        />
                      ) : (
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-semibold text-stone-500">#{l.position}</span>
                          <span className="min-w-0 flex-1 truncate text-sm font-medium">{l.title}</span>
                          {l.video_url && <span className="text-xs text-stone-500">🎬 video</span>}
                          <Btn onClick={() => setEditingLesson(l.id)}>Edit</Btn>
                          <Btn
                            danger
                            onClick={() => {
                              if (window.confirm(`Delete lesson “${l.title}”?`))
                                run(() => deleteLesson(l.id, slug));
                            }}
                          >
                            Delete
                          </Btn>
                        </div>
                      )}
                    </li>
                  ))}
                </ol>
                {editingLesson === "new" ? (
                  <div className="mt-3 rounded-lg bg-stone-50 p-3">
                    <LessonForm
                      lesson={null}
                      brandColour={workspace.brand_colour}
                      pending={pending}
                      onSave={(fd) => {
                        run(() => saveLesson(workspace.id, c.id, slug, null, fd));
                        setEditingLesson(null);
                      }}
                      onCancel={() => setEditingLesson(null)}
                    />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditingLesson("new")}
                    className="mt-3 rounded-lg border border-dashed border-stone-300 px-3 py-2 text-sm text-stone-600 hover:bg-stone-50"
                  >
                    + Add lesson
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function CourseForm({
  course,
  brandColour,
  pending,
  onSave,
  onCancel,
}: {
  course: Course | null;
  brandColour: string;
  pending: boolean;
  onSave: (fd: FormData) => void;
  onCancel: () => void;
}) {
  return (
    <form
      action={onSave}
      className="flex flex-col gap-3 rounded-2xl border-2 bg-white p-5"
      style={{ borderColor: brandColour }}
    >
      <h2 className="text-base font-semibold">{course ? `Edit “${course.title}”` : "New course"}</h2>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Title
        <input name="title" required defaultValue={course?.title ?? ""} className="rounded-lg border border-stone-300 px-3 py-2 text-base font-normal" />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Description
        <textarea name="description" rows={2} defaultValue={course?.description ?? ""} className="rounded-lg border border-stone-300 px-3 py-2 text-sm" />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="paid_only" defaultChecked={course?.paid_only ?? false} className="h-4 w-4" />
        Paid members only
      </label>
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50" style={{ backgroundColor: brandColour }}>
          Save
        </button>
        <button type="button" onClick={onCancel} className="rounded-lg border border-stone-300 px-4 py-2 text-sm hover:bg-stone-100">
          Cancel
        </button>
      </div>
    </form>
  );
}

function LessonForm({
  lesson,
  brandColour,
  pending,
  onSave,
  onCancel,
}: {
  lesson: Lesson | null;
  brandColour: string;
  pending: boolean;
  onSave: (fd: FormData) => void;
  onCancel: () => void;
}) {
  return (
    <form action={onSave} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm font-medium">
        Lesson title
        <input name="title" required defaultValue={lesson?.title ?? ""} className="rounded-lg border border-stone-300 px-3 py-2 text-base font-normal" />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Content (Markdown)
        <textarea name="content" rows={8} defaultValue={lesson?.content ?? ""} className="rounded-lg border border-stone-300 px-3 py-2 font-mono text-sm" />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Video URL (optional — uploaded to storage or YouTube/Vimeo)
        <input name="video_url" type="url" defaultValue={lesson?.video_url ?? ""} className="rounded-lg border border-stone-300 px-3 py-2 text-base font-normal" />
      </label>
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="rounded-lg px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50" style={{ backgroundColor: brandColour }}>
          Save
        </button>
        <button type="button" onClick={onCancel} className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm hover:bg-stone-100">
          Cancel
        </button>
      </div>
    </form>
  );
}

function Btn({
  children,
  onClick,
  danger,
  accent,
}: {
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  accent?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-3 py-1.5 text-sm ${
        danger
          ? "border-red-200 text-red-700 hover:bg-red-50"
          : accent
            ? "border-transparent font-medium text-white"
            : "border-stone-300 text-stone-700 hover:bg-stone-100"
      }`}
      style={accent ? { backgroundColor: accent } : undefined}
    >
      {children}
    </button>
  );
}
