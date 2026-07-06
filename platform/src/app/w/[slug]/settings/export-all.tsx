"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function ExportAllButton({
  workspaceId,
  workspaceName,
}: {
  workspaceId: string;
  workspaceName: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleExport() {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("contacts")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at");

    if (error) {
      setError(error.message);
      setBusy(false);
      return;
    }

    const blob = new Blob(
      [JSON.stringify({ workspace: workspaceName, exported_at: new Date().toISOString(), contacts: data }, null, 2)],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${workspaceName.toLowerCase().replace(/\s+/g, "-")}-contacts-export.json`;
    a.click();
    URL.revokeObjectURL(url);
    setBusy(false);
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleExport}
        disabled={busy}
        className="w-fit rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium hover:bg-stone-100 disabled:opacity-50"
      >
        {busy ? "Exporting…" : "Export all contacts (JSON)"}
      </button>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
