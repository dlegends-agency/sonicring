import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function toHtml(body: string) {
  return body
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replaceAll("\n", "<br>")}</p>`)
    .join("");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      return new Response(
        JSON.stringify({
          error:
            "RESEND_API_KEY is not set. Add it in Supabase Dashboard → Edge Functions → Secrets.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const body = await req.json();
    const to = asString(body.to).toLowerCase();
    const subject = asString(body.subject);
    const text = asString(body.body) || asString(body.text);
    const htmlInput = asString(body.html);
    const from =
      asString(body.from) ||
      Deno.env.get("RESEND_FROM_EMAIL") ||
      "SonicRing <onboarding@resend.dev>";

    if (!isValidEmail(to)) {
      return new Response(JSON.stringify({ error: "Enter a valid recipient email." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!subject) {
      return new Response(JSON.stringify({ error: "Subject is required." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!text && !htmlInput) {
      return new Response(JSON.stringify({ error: "Email body is required." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const html = htmlInput || (text ? toHtml(text) : undefined);
    const payloadBody: Record<string, unknown> = {
      from,
      to: [to],
      subject,
    };
    if (text) payloadBody.text = text;
    if (html) payloadBody.html = html;

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payloadBody),
    });

    const payload = await resendRes.json();
    if (!resendRes.ok) {
      return new Response(
        JSON.stringify({
          error:
            payload?.message ||
            payload?.error?.message ||
            "Resend rejected the email.",
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({
        ok: true,
        id: payload?.id ?? null,
        to,
        from,
        subject,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
