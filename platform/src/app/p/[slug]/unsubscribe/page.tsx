import { createClient } from "@/lib/supabase/server";

// One-click unsubscribe — no login, no guilt trip, no "are you sure".
// Clearing consent is all it takes; the queue functions never email a
// contact without consent again.
export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const { c } = await searchParams;
  let done = false;

  if (c && /^[0-9a-f-]{36}$/i.test(c)) {
    const supabase = await createClient();
    const { data } = await supabase.rpc("unsubscribe_contact", {
      p_contact_id: c,
    });
    done = Boolean(data);
  }

  return (
    <div className="mx-auto max-w-md py-12 text-center">
      {done ? (
        <>
          <h1 className="text-2xl font-semibold">You&apos;re unsubscribed</h1>
          <p className="mt-2 text-stone-600">
            Done — no more emails from us. If you ever want your data
            exported or deleted entirely, just reply to any email you
            received from us and we&apos;ll take care of it.
          </p>
        </>
      ) : (
        <>
          <h1 className="text-2xl font-semibold">Something&apos;s off</h1>
          <p className="mt-2 text-stone-600">
            This unsubscribe link doesn&apos;t look right (or was already used
            on a deleted contact). If you keep getting emails, reply to
            one of them and a human will sort it out.
          </p>
        </>
      )}
    </div>
  );
}
