import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type PlanId = "starter" | "growth" | "pro";

const PLANS: Record<
  PlanId,
  { name: string; amountCents: number; description: string }
> = {
  starter: {
    name: "SonicRing Starter",
    amountCents: 19900,
    description: "1 business · 2 users · 5 AI employees",
  },
  growth: {
    name: "SonicRing Growth",
    amountCents: 39900,
    description: "3 businesses · 5 users · 10 AI employees",
  },
  pro: {
    name: "SonicRing Pro",
    amountCents: 79900,
    description: "10 businesses · 15 users · 25 AI employees",
  },
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecret) {
      return new Response(
        JSON.stringify({
          error:
            "STRIPE_SECRET_KEY is not set. Add your Stripe test secret key in Supabase Edge Function secrets.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const body = await req.json();
    const plan = body.plan as PlanId;
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const contactId =
      typeof body.contactId === "string" ? body.contactId.trim() : "";
    const origin =
      typeof body.origin === "string" && body.origin.startsWith("http")
        ? body.origin.replace(/\/$/, "")
        : "http://127.0.0.1:5173";

    const planConfig = PLANS[plan];
    if (!planConfig) {
      return new Response(JSON.stringify({ error: "Invalid plan" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cancelParams = new URLSearchParams();
    if (email) cancelParams.set("email", email);
    if (name) cancelParams.set("name", name);
    if (contactId) cancelParams.set("contact", contactId);

    const params = new URLSearchParams();
    params.set("mode", "subscription");
    params.set("success_url", `${origin}/checkout/success?plan=${plan}${contactId ? `&contact=${contactId}` : ""}`);
    params.set(
      "cancel_url",
      `${origin}/checkout/cancel${cancelParams.toString() ? `?${cancelParams}` : ""}`,
    );
    params.set("line_items[0][price_data][currency]", "usd");
    params.set(
      "line_items[0][price_data][product_data][name]",
      planConfig.name,
    );
    params.set(
      "line_items[0][price_data][product_data][description]",
      planConfig.description,
    );
    params.set(
      "line_items[0][price_data][unit_amount]",
      String(planConfig.amountCents),
    );
    params.set("line_items[0][price_data][recurring][interval]", "month");
    params.set("line_items[0][quantity]", "1");
    params.set("allow_promotion_codes", "true");
    params.set("metadata[plan]", plan);
    if (contactId) params.set("metadata[contact_id]", contactId);
    if (email) {
      params.set("customer_email", email);
      params.set("metadata[email]", email);
    }
    if (name) params.set("metadata[first_name]", name);

    const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeSecret}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const session = await stripeRes.json();

    if (!stripeRes.ok) {
      return new Response(
        JSON.stringify({
          error: session?.error?.message || "Stripe checkout failed",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(JSON.stringify({ url: session.url, id: session.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unexpected error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
