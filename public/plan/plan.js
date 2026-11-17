// /plan: pick a plan, then hand off to the React checkout (/checkout), which creates the
// Stripe Checkout session via the Supabase `create-checkout` function and redirects to Stripe.
// Stripe collects the email and card, so no personal data passes through URLs or analytics.
(() => {
  const cards = [...document.querySelectorAll(".plan-card")];
  const barName = document.getElementById("bar-name");
  const barPrice = document.getElementById("bar-price");
  const barBtn = document.getElementById("bar-btn");
  const PAID = ["starter", "growth", "pro"];

  function select(planId, { scroll = false } = {}) {
    const card = cards.find((c) => c.dataset.plan === planId) || cards.find((c) => c.dataset.plan === "growth");
    cards.forEach((c) => {
      const on = c === card;
      c.classList.toggle("is-selected", on);
      const btn = c.querySelector(".plan-choose");
      btn.setAttribute("aria-checked", String(on));
      btn.textContent = on ? "✓ Selected" : `Choose ${c.dataset.name}`;
    });

    const id = card.dataset.plan;
    barName.textContent = card.dataset.name;
    if (PAID.includes(id)) {
      barPrice.textContent = `$${card.dataset.price} / month · billed monthly`;
      barBtn.textContent = "Continue to secure checkout →";
      barBtn.href = `/checkout?plan=${id}&autostart=1`;
    } else {
      barPrice.textContent = "Custom pricing · we'll tailor it with you";
      barBtn.textContent = "Talk to us →";
      barBtn.href = "/#join";
    }
    try { history.replaceState(null, "", `?plan=${id}`); } catch {}
    if (scroll) document.getElementById("plan-bar").scrollIntoView({ block: "nearest" });
  }

  cards.forEach((card) => {
    card.addEventListener("click", () => select(card.dataset.plan));
    card.querySelector(".plan-choose").addEventListener("keydown", (e) => {
      // Arrow keys move between plans, like a radio group
      const i = cards.indexOf(card);
      const next = e.key === "ArrowRight" || e.key === "ArrowDown" ? i + 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? i - 1 : null;
      if (next === null) return;
      e.preventDefault();
      const target = cards[(next + cards.length) % cards.length];
      select(target.dataset.plan);
      target.querySelector(".plan-choose").focus();
    });
  });

  barBtn.addEventListener("click", () => {
    const card = cards.find((c) => c.classList.contains("is-selected"));
    const id = card?.dataset.plan;
    if (!PAID.includes(id)) return;
    const value = Number(card.dataset.price);
    window.gtag?.("event", "begin_checkout", { currency: "USD", value, items: [{ item_name: `SonicRing ${card.dataset.name}` }] });
    window.fbq?.("track", "InitiateCheckout", { currency: "USD", value, content_name: card.dataset.name });
  });

  // Preselect from ?plan=… (links from the homepage pricing cards), defaulting to Growth
  select(new URLSearchParams(location.search).get("plan") || "growth");
})();
