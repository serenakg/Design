import { createHmac, timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// The paywall webhook. Point a Stripe webhook (checkout.session.completed)
// here. The Payment Link / Checkout Session must carry
// metadata.workspace_slug = "serena" | "femnest" so the payment lands
// behind the right wall — payments without it are logged, not guessed.
// Signature is verified with STRIPE_WEBHOOK_SECRET (whsec_…).

export const dynamic = "force-dynamic";

function verifyStripeSignature(
  payload: string,
  header: string,
  secret: string
): boolean {
  const parts = new Map(
    header.split(",").map((kv) => kv.split("=") as [string, string])
  );
  const timestamp = parts.get("t");
  const signature = parts.get("v1");
  if (!timestamp || !signature) return false;

  // reject replays older than 5 minutes
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${payload}`)
    .digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "STRIPE_WEBHOOK_SECRET is not configured" },
      { status: 500 }
    );
  }

  const payload = await request.text();
  const signature = request.headers.get("stripe-signature") ?? "";
  if (!verifyStripeSignature(payload, signature, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: {
    id: string;
    type: string;
    data: {
      object: {
        metadata?: Record<string, string>;
        customer_details?: { email?: string };
        customer_email?: string;
        amount_total?: number;
      };
    };
  };
  try {
    event = JSON.parse(payload);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true, ignored: event.type });
  }

  const session = event.data.object;
  const workspaceSlug = session.metadata?.workspace_slug ?? "";
  const email =
    session.customer_details?.email ?? session.customer_email ?? "";
  const amount = (session.amount_total ?? 0) / 100;

  if (!workspaceSlug || !email) {
    // never guess which wall a payment belongs behind
    return NextResponse.json(
      { received: true, outcome: "missing workspace_slug metadata or email" },
      { status: 200 }
    );
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { data, error } = await supabase.rpc("record_stripe_payment", {
    p_event_id: event.id,
    p_workspace_slug: workspaceSlug,
    p_email: email,
    p_amount: amount,
  });
  if (error) {
    // 500 makes Stripe retry — the function is idempotent, so that's safe
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ received: true, outcome: data });
}
