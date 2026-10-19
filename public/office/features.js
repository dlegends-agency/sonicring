// Feature tile animations: incoming calls answered one by one, and a typed follow-up.
(() => {
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  // Runs `loop` while the element is on screen; pauses it when scrolled away.
  function whileVisible(el, loop) {
    let on = false, running = false;
    new IntersectionObserver(([e]) => {
      on = e.isIntersecting;
      if (on && !running) {
        running = true;
        loop(() => on).finally(() => (running = false));
      }
    }, { threshold: 0.35 }).observe(el);
  }

  // ---- Every call answered ----
  const calls = document.querySelector('[data-anim="calls"]');
  if (calls) {
    const items = [...calls.querySelectorAll(".call")];
    const tags = items.map((c) => c.querySelector(".tag"));
    const reset = () => items.forEach((c, i) => {
      c.classList.remove("show", "ringing", "answered");
      tags[i].textContent = "Ringing…";
    });

    if (reduceMotion) {
      items.forEach((c) => c.classList.add("show", "answered"));
    } else {
      reset();
      whileVisible(calls, async (alive) => {
        while (alive()) {
          for (let i = 0; i < items.length && alive(); i++) {
            items[i].classList.add("show", "ringing");
            await wait(1300);
            items[i].classList.replace("ringing", "answered");
            tags[i].textContent = "Answered";
            await wait(700);
          }
          await wait(2600);
          if (!alive()) break;
          calls.classList.add("fade");
          await wait(450);
          reset();
          calls.classList.remove("fade");
          await wait(400);
        }
      });
    }
  }

  // ---- Every lead followed up ----
  const chat = document.querySelector('[data-anim="chat"]');
  if (chat) {
    const bot = chat.querySelector(".bubble-bot");
    const me = chat.querySelector(".bubble-me");
    const message = bot.textContent.trim();

    if (reduceMotion) {
      me.classList.add("show");
    } else {
      const text = document.createElement("span");
      const caret = document.createElement("i");
      caret.className = "caret";
      const dots = document.createElement("span");
      dots.className = "dots";
      dots.innerHTML = "<i></i><i></i><i></i>";

      const reset = () => {
        bot.replaceChildren(dots);
        bot.classList.add("is-typing");
        me.classList.remove("show");
      };
      reset();

      whileVisible(chat, async (alive) => {
        while (alive()) {
          await wait(1400); // "SonicRing is typing…"
          bot.classList.remove("is-typing");
          text.textContent = "";
          bot.replaceChildren(text, caret);
          for (const ch of message) {
            if (!alive()) return;
            text.textContent += ch;
            await wait(ch === " " ? 45 : ch === "—" || ch === "," ? 220 : 32 + Math.random() * 40);
          }
          caret.remove();
          await wait(900);
          me.classList.add("show");
          await wait(3200);
          if (!alive()) break;
          chat.classList.add("fade");
          await wait(450);
          reset();
          chat.classList.remove("fade");
        }
      });
    }
  }
  // ---- Every appointment booked: clock ticks, open slots get booked one by one ----
  const sched = document.querySelector('[data-anim="sched"]');
  if (sched) {
    const slots = [...sched.querySelectorAll(".slot")];
    const clock = sched.querySelector(".sched-clock");
    const fmt = (m) => {
      const h = Math.floor(m / 60) % 24, mm = String(m % 60).padStart(2, "0");
      return `${((h + 11) % 12) + 1}:${mm} ${h < 12 ? "AM" : "PM"}`;
    };
    const reset = () => slots.forEach((sl) => {
      sl.classList.remove("checking", "booked");
      sl.querySelector("span").textContent = "Open";
    });
    const book = (sl) => {
      sl.classList.replace("checking", "booked");
      sl.querySelector("span").textContent = "✓ " + sl.dataset.job;
    };

    if (reduceMotion) {
      slots.forEach((sl) => { sl.classList.add("checking"); book(sl); });
    } else {
      let minutes = 14 * 60 + 4;
      setInterval(() => { minutes++; clock.textContent = fmt(minutes); }, 700);
      whileVisible(sched, async (alive) => {
        while (alive()) {
          for (const i of [1, 0, 2]) {
            if (!alive()) return;
            await wait(900);
            slots[i].classList.add("checking");
            slots[i].querySelector("span").textContent = "Booking…";
            await wait(1100);
            book(slots[i]);
          }
          await wait(2600);
          if (!alive()) break;
          sched.classList.add("fade");
          await wait(450);
          reset();
          sched.classList.remove("fade");
        }
      });
    }
  }

  // ---- Never calls in sick: agent at work, finished tasks float up ----
  const agent = document.querySelector('[data-anim="agent"]');
  if (agent && !reduceMotion) {
    const chips = agent.querySelector(".ag-chips");
    const count = agent.querySelector(".ag-count");
    const TASKS = ["Follow-up sent", "Call logged", "Quote emailed", "Review requested", "Lead qualified", "Job booked", "Invoice sent", "Reminder texted"];
    let t = 0, n = 128;
    whileVisible(agent, async (alive) => {
      while (alive()) {
        const chip = document.createElement("span");
        chip.className = "ag-chip";
        chip.textContent = "✓ " + TASKS[t++ % TASKS.length];
        chip.style.left = 18 + Math.random() * 40 + "%";
        chips.appendChild(chip);
        setTimeout(() => chip.remove(), 2600);
        count.textContent = ++n;
        await wait(1500);
      }
    });
  }

  // ---- 24/7: the hour hand sweeps round the clock, still answering at every hour ----
  const always = document.querySelector('[data-anim="always"]');
  if (always) {
    const ticks = always.querySelector(".dial-ticks");
    for (let h = 0; h < 24; h++) {
      const a = (h / 24) * Math.PI * 2, big = h % 6 === 0;
      const r1 = big ? 70 : 74, r2 = 80;
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", 100 + Math.sin(a) * r1); line.setAttribute("y1", 100 - Math.cos(a) * r1);
      line.setAttribute("x2", 100 + Math.sin(a) * r2); line.setAttribute("y2", 100 - Math.cos(a) * r2);
      line.setAttribute("stroke", big ? "rgba(13,15,28,.45)" : "rgba(13,15,28,.18)");
      line.setAttribute("stroke-width", big ? 3 : 2);
      line.setAttribute("stroke-linecap", "round");
      ticks.appendChild(line);
    }
    if (!reduceMotion) {
      const hand = always.querySelector(".dial-hand");
      const sweep = always.querySelector(".dial-sweep");
      const label = always.querySelector(".now-time");
      let minutes = 14 * 60 + 4, turn = 0;
      whileVisible(always, async (alive) => {
        while (alive()) {
          minutes += 47 + Math.floor(Math.random() * 90);   // jump ahead through the day and night
          if (minutes >= 24 * 60) { minutes -= 24 * 60; turn++; }
          const frac = minutes / (24 * 60);
          hand.style.transform = `rotate(${(turn + frac) * 360}deg)`;
          sweep.style.strokeDashoffset = 100 - frac * 100;
          const h = Math.floor(minutes / 60), mm = String(minutes % 60).padStart(2, "0");
          label.textContent = `${((h + 11) % 12) + 1}:${mm} ${h < 12 ? "AM" : "PM"}`;
          label.classList.remove("pop"); void label.offsetWidth; label.classList.add("pop");
          await wait(1100);
        }
      });
    }
  }
})();

// Waitlist form: validate, then show the thank-you state.
// TODO: send the data to your email/CRM service before showing the success state.
(() => {
  const form = document.getElementById("waitlist-form");
  if (!form) return;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    let ok = true;
    for (const field of form.querySelectorAll("input, select")) {
      const bad = !field.checkValidity();
      field.closest("label").classList.toggle("invalid", bad);
      if (bad && ok) { field.focus(); ok = false; }
    }
    if (!ok) return;
    window.srTrack?.lead({ content_name: "waitlist", business_type: form.business_type.value, plan_interest: form.plan_interest.value });
    form.hidden = true;
    form.parentElement.querySelector(".early-done").hidden = false;
  });
  form.addEventListener("input", (e) => e.target.closest("label")?.classList.remove("invalid"));
})();

// ---- War Room: agents (and the owner) coordinate, message by message ----
(() => {
  const panel = document.querySelector('[data-anim="warroom"]');
  if (!panel) return;
  const feed = panel.querySelector(".wr-feed");
  const P = {
    G: ["Grant", "Strategy", "#ffd21f"], M: ["Maya", "Receptionist", "#36d6ff"], A: ["Alex", "Sales", "#2fd06a"],
    D: ["Dani", "Marketing", "#ff7fc8"], C: ["Chloe", "Support", "#a99bff"], Y: ["You", "Owner", ""],
  };
  const SCRIPT = [
    ["M", "New lead from a missed-call text: kitchen leak, wants someone this week. Booked for Thursday 9:30 AM."],
    ["G", "Prediction: Thursday looks busier than usual. Let's open two extra slots in the afternoon.", "AI prediction"],
    ["A", "On it. I'll follow up the 3 open quotes from last week and offer them Thursday."],
    ["D", "I'll text past customers about the open Thursday slots."],
    ["Y", "Love it. Approve the text."],
    ["D", "Approved ✓ Sending at 10 AM."],
    ["C", "I'll check in with this week's customers and make sure every job went smoothly."],
  ];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const make = (who, html, cls = "") => {
    const [name, role, color] = P[who];
    const el = document.createElement("div");
    el.className = "wr-msg " + cls + (who === "Y" ? " you" : "");
    if (color) el.style.setProperty("--c", color);
    el.innerHTML = `<span class="av">${who === "Y" ? "Y" : name[0]}</span><div class="bub"><b>${name} · ${role}</b></div>`;
    if (html) el.querySelector(".bub").append(html);
    feed.append(el);
    while (feed.children.length > 6) feed.firstElementChild.remove();
    return el;
  };
  const say = (who, text, tag) => {
    const frag = document.createDocumentFragment();
    frag.append(document.createTextNode(text));
    if (tag) { const t = document.createElement("span"); t.className = "tag"; t.textContent = "⚡ " + tag; frag.append(document.createElement("br"), t); }
    return make(who, frag);
  };
  if (reduce) { SCRIPT.slice(-5).forEach(([w, t, g]) => say(w, t, g)); return; }

  let on = false, running = false;
  new IntersectionObserver(([e]) => {
    on = e.isIntersecting;
    if (on && !running) { running = true; loop().finally(() => (running = false)); }
  }, { threshold: 0.3 }).observe(panel);

  async function loop() {
    while (on) {
      for (const [who, text, tag] of SCRIPT) {
        if (!on) return;
        if (who !== "Y") {
          const dots = document.createElement("span");
          dots.className = "dots"; dots.innerHTML = "<i></i><i></i><i></i>";
          const typing = make(who, dots, "wr-typing");
          await wait(900 + Math.random() * 500);
          typing.remove();
        } else await wait(700);
        say(who, text, tag);
        await wait(1500 + text.length * 18);
      }
      await wait(2500);
      feed.classList.add("fade");
      await wait(450);
      feed.replaceChildren();
      feed.classList.remove("fade");
    }
  }
})();

// ---- Core team: cards pin and pile up; buried cards shrink back with a slight 3D lean ----
(() => {
  const cards = [...document.querySelectorAll(".team-card")];
  if (!cards.length || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const inners = cards.map((c) => c.querySelector(".tc-inner"));
  const covers = cards.map((c) => c.querySelector(".tc-cover"));
  const clamp = (v) => Math.min(1, Math.max(0, v));
  let queued = false;
  function update() {
    queued = false;
    const vh = innerHeight;
    // How far each card has slid into its pinned spot (0 = just entering, 1 = pinned)
    const arrive = cards.map((c) => {
      const top = c.getBoundingClientRect().top;
      const pin = parseFloat(getComputedStyle(c).top) || 0;
      return clamp((vh - top) / (vh - pin));
    });
    cards.forEach((c, i) => {
      let depth = 0; // how many cards now sit on top of this one
      for (let j = i + 1; j < cards.length; j++) depth += arrive[j];
      const lean = Math.min(depth, 1);
      inners[i].style.transform = `translateY(${-depth * 6}px) scale(${1 - depth * 0.045}) rotateX(${lean * 5}deg)`;
      inners[i].style.filter = `brightness(${1 - Math.min(depth, 3) * 0.12})`;
      // The cover zooms to life as its card arrives
      covers[i].style.setProperty("--zoom", (1.18 - 0.18 * arrive[i]).toFixed(3));
    });
  }
  const queue = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
  addEventListener("scroll", queue, { passive: true });
  addEventListener("resize", queue);
  // Lazy-loaded photos: refresh the stack once each one arrives so it's painted straight away
  document.querySelectorAll(".team-card .tc-photo").forEach((img) => img.complete || img.addEventListener("load", queue, { once: true }));
  update();
})();

// ---- Floating demo widget: the /demo/ call in a panel (demo.js runs the call itself) ----
(() => {
  const root = document.getElementById("fdemo");
  if (!root) return;
  const toggle = document.getElementById("fdemo-toggle");
  const panel = document.getElementById("fdemo-panel");
  const phone = document.getElementById("phone");
  const back = document.getElementById("fdemo-back");
  const hang = () => { const b = document.getElementById("ph-hang"); if (b && !b.disabled) b.click(); };

  // Show the button once the visitor scrolls past the hero
  const onScroll = () => root.classList.toggle("show", scrollY > innerHeight * 0.7);
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  const open = () => {
    panel.hidden = false;
    root.classList.add("open");
    toggle.setAttribute("aria-expanded", "true");
    if (!root.classList.contains("calling")) panel.querySelector("input")?.focus({ preventScroll: true });
  };
  const close = () => {
    hang();
    panel.hidden = true;
    root.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.focus({ preventScroll: true });
  };
  toggle.addEventListener("click", open);
  document.getElementById("fdemo-close").addEventListener("click", close);
  addEventListener("keydown", (e) => { if (e.key === "Escape" && !panel.hidden) close(); });

  // Swap the form for the phone once a call starts; "Change details" goes back
  new MutationObserver(() => {
    const calling = phone.dataset.state !== "idle";
    root.classList.toggle("calling", calling);
    back.hidden = !calling;
  }).observe(phone, { attributes: true, attributeFilter: ["data-state"] });
  back.addEventListener("click", () => {
    hang();
    phone.dataset.state = "idle";
  });
})();
