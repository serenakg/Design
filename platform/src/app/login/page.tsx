"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const supabase = createClient();

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setMessage(error.message);
        setBusy(false);
        return;
      }
      router.push("/");
      router.refresh();
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      if (error) {
        setMessage(error.message);
        setBusy(false);
        return;
      }
      setMessage(
        "Account created. If email confirmation is on, check your inbox — then the owner grants your workspace access."
      );
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center gap-6 p-6">
      <header className="text-center">
        <div
          className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl text-lg font-bold text-white"
          style={{
            background: "linear-gradient(135deg, #7C3AED 0%, #EC4899 100%)",
          }}
          aria-hidden="true"
        >
          SF
        </div>
        <h1 className="text-2xl font-semibold">The Platform</h1>
        <p className="mt-1 text-sm text-stone-600">
          Serena Gasparini · FemNEST — two workspaces, one roof
        </p>
      </header>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
      >
        {mode === "signup" && (
          <label className="flex flex-col gap-1 text-sm font-medium">
            Full name
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoComplete="name"
              className="rounded-lg border border-stone-300 px-3 py-2 text-base"
              required
            />
          </label>
        )}
        <label className="flex flex-col gap-1 text-sm font-medium">
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            className="rounded-lg border border-stone-300 px-3 py-2 text-base"
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={
              mode === "signin" ? "current-password" : "new-password"
            }
            minLength={8}
            className="rounded-lg border border-stone-300 px-3 py-2 text-base"
            required
          />
        </label>

        {message && (
          <p role="status" className="text-sm text-stone-700">
            {message}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-stone-900 px-4 py-2.5 font-medium text-white hover:bg-stone-700 disabled:opacity-50"
        >
          {busy
            ? "One moment…"
            : mode === "signin"
              ? "Sign in"
              : "Create account"}
        </button>
      </form>

      <button
        type="button"
        onClick={() => {
          setMode(mode === "signin" ? "signup" : "signin");
          setMessage(null);
        }}
        className="text-sm text-stone-600 underline underline-offset-4 hover:text-stone-900"
      >
        {mode === "signin"
          ? "New team member? Create an account"
          : "Already have an account? Sign in"}
      </button>
    </main>
  );
}
