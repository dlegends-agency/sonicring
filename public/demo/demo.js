// SonicRing demo call: rings once, then the AI receptionist answers with the visitor's business
// name. Runs entirely in the browser: Web Audio for the ring, speechSynthesis for the voice,
// optional SpeechRecognition (Chrome/Edge) so visitors can talk back. Replies are a sample script.
(() => {
  // ---------- Industry data used to tailor the script ----------
  const INDUSTRIES = {
    landscaping:  { label: "Landscaping", work: "lawn care, landscaping or a yard cleanup", visit: "a lawn care visit", urgent: "storm damage or a fallen tree" },
    plumbing:     { label: "Plumbing", work: "a leak, a clogged drain or a water heater", visit: "a plumber visit", urgent: "a burst pipe or flooding" },
    hvac:         { label: "HVAC", work: "AC repair, a furnace tune-up or a new system", visit: "an HVAC service call", urgent: "no heat or no AC" },
    electrical:   { label: "Electrical", work: "wiring, panel upgrades or lighting", visit: "an electrician visit", urgent: "sparking or a power outage" },
    cleaning:     { label: "Cleaning", work: "a regular clean, a deep clean or move-out cleaning", visit: "a cleaning", urgent: "a same-day clean" },
    roofing:      { label: "Roofing", work: "a roof repair, an inspection or a replacement", visit: "a roof inspection", urgent: "an active roof leak" },
    pest:         { label: "Pest control", work: "ants, rodents, termites or a general treatment", visit: "a pest treatment", urgent: "an infestation" },
    auto:         { label: "Auto repair", work: "an oil change, brakes or a check-engine light", visit: "a service appointment", urgent: "a breakdown" },
    medspa:       { label: "Med spa", work: "facials, injectables or laser treatments", visit: "a consultation", urgent: "a same-week appointment" },
    massage:      { label: "Massage & wellness", work: "a relaxation, deep tissue or sports massage", visit: "a massage session", urgent: "a same-day session" },
    dental:       { label: "Dental", work: "a cleaning, a check-up or whitening", visit: "a dental appointment", urgent: "a toothache or a broken tooth" },
    salon:        { label: "Hair & beauty salon", work: "a cut, color or styling", visit: "a salon appointment", urgent: "a same-day appointment" },
    realestate:   { label: "Real estate", work: "buying, selling or a home valuation", visit: "a call with an agent", urgent: "a showing today" },
    other:        { label: "Other", work: "the service you need", visit: "an appointment", urgent: "something urgent" },
  };

  // Intents: what a caller can say, and how the receptionist replies ({biz}, {name} and industry fields fill in)
  const INTENTS = {
    quote:     { say: "I'd like a quote", reply: "Happy to help with that. Is it for {work}? If you share the address and a few details, I'll have {biz} text you a quote shortly.", next: ["book", "price", "bye"] },
    book:      { say: "Can I book an appointment?", reply: "Absolutely. For {visit}, I have openings tomorrow at 9:30 AM or Thursday at 2 PM. Which works better for you?", next: ["slot1", "slot2", "hours"] },
    slot1:     { say: "Tomorrow at 9:30 works", reply: "You're all set for tomorrow at 9:30 AM. I'm texting you a confirmation now, and I'll send a reminder the day before. Is there anything else I can help with?", next: ["quote", "bye"] },
    slot2:     { say: "Thursday at 2 PM, please", reply: "Done. You're booked for Thursday at 2 PM. You'll get a confirmation text in a moment. Anything else I can do for you?", next: ["quote", "bye"] },
    hours:     { say: "When are you open?", reply: "The team at {biz} works Monday through Saturday, and I answer calls 24/7, so you can always reach us. Would you like me to book a time?", next: ["book", "quote", "bye"] },
    urgent:    { say: "It's an emergency", reply: "I'm sorry to hear that. If it's {urgent}, I'm flagging this as urgent and alerting the team right now. Can I get your address and the best number to reach you?", next: ["number", "bye"] },
    number:    { say: "Sure, it's 555-0142", reply: "Got it, thank you. Someone from {biz} will call you back within minutes. Hang tight, you're in good hands.", next: ["bye"] },
    price:     { say: "How much does it cost?", reply: "It depends on the details of the job, and I want to give you an accurate number. I can have {biz} send you an exact quote today. Can I get your name and number?", next: ["number", "book", "bye"] },
    bye:       { say: "That's all, thanks!", reply: "Thanks for calling {biz}! Have a great day.", next: [], end: true },
    fallback:  { reply: "Great question. I'll make sure the team at {biz} gets back to you on that today. Would you like to book an appointment in the meantime?", next: ["book", "quote", "bye"] },
  };
  const START_REPLIES = ["quote", "book", "urgent", "hours"];

  // ---------- Elements ----------
  const $ = (id) => document.getElementById(id);
  const form = $("demo-form"), phone = $("phone"), log = $("ph-log"), replies = $("ph-replies");
  const statusEl = $("ph-status"), timerEl = $("ph-timer"), nameEl = $("ph-name"), subEl = $("ph-sub"), initialEl = $("ph-initial");
  const hangBtn = $("ph-hang"), micBtn = $("ph-mic");
  const industrySel = form.industry;
  for (const [key, v] of Object.entries(INDUSTRIES)) industrySel.add(new Option(v.label, key));

  // ---------- Voices ----------
  const synth = window.speechSynthesis;
  const FEMALE = /female|aria|jenny|samantha|zira|susan|karen|moira|tessa|victoria|serena|google us english|libby|sonia|natasha/i;
  const MALE = /male|guy|david|daniel|mark|alex|fred|ryan|thomas|christopher|eric|google uk english male/i;
  function pickVoice(gender) {
    const voices = (synth?.getVoices() || []).filter((v) => /^en(-|_|$)/i.test(v.lang));
    if (!voices.length) return null;
    const want = gender === "m" ? MALE : FEMALE;
    const natural = voices.filter((v) => /natural|neural|online|google/i.test(v.name));
    return natural.find((v) => want.test(v.name)) || voices.find((v) => want.test(v.name) && !(gender === "f" && /male/i.test(v.name.replace(/female/i, "")))) || natural[0] || voices[0];
  }
  synth?.addEventListener?.("voiceschanged", () => {});

  // ---------- Call state ----------
  let call = null; // { biz, name, ind, started, timer, ended }
  const fill = (t) => t.replace(/\{biz\}/g, call.biz).replace(/\{name\}/g, call.name)
    .replace(/\{work\}/g, call.ind.work).replace(/\{visit\}/g, call.ind.visit).replace(/\{urgent\}/g, call.ind.urgent);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  function addMsg(kind, text) {
    const el = document.createElement("div");
    el.className = "ph-msg " + kind;
    if (kind === "ai") {
      const who = document.createElement("b");
      who.textContent = call.name + " · AI receptionist";
      el.append(who);
    }
    el.append(document.createTextNode(text));
    log.append(el);
    log.scrollTop = log.scrollHeight;
  }

  function speak(text) {
    return new Promise((resolve) => {
      phone.classList.add("speaking");
      const done = () => { phone.classList.remove("speaking"); resolve(); };
      if (!synth) return setTimeout(done, 1200 + text.length * 45);
      synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      const v = pickVoice(call.gender);
      if (v) u.voice = v;
      u.rate = 1.02; u.pitch = call.gender === "m" ? 0.95 : 1.05;
      u.onend = done; u.onerror = done;
      // Some browsers never fire onend for long text; fall back to a time estimate
      setTimeout(done, 2500 + text.length * 90);
      synth.speak(u);
    });
  }

  // One ring of a phone: 440 + 480 Hz for ~2 s (North American ring cadence)
  async function ringOnce() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return wait(2200);
    const ac = new AC();
    const gain = ac.createGain();
    gain.gain.value = 0;
    gain.connect(ac.destination);
    for (const f of [440, 480]) { const o = ac.createOscillator(); o.frequency.value = f; o.connect(gain); o.start(); o.stop(ac.currentTime + 2.2); }
    const t = ac.currentTime;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.12, t + 0.05);
    gain.gain.setValueAtTime(0.12, t + 1.95);
    gain.gain.linearRampToValueAtTime(0, t + 2.05);
    await wait(2300);
    // pick-up click
    const o = ac.createOscillator(), g = ac.createGain();
    o.frequency.value = 1200; g.gain.setValueAtTime(0.08, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.06);
    o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime + 0.07);
    await wait(250);
    ac.close();
  }

  function setReplies(keys) {
    replies.replaceChildren();
    for (const k of keys) {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = INTENTS[k].say;
      b.addEventListener("click", () => answer(k, INTENTS[k].say));
      replies.append(b);
    }
  }
  const lockReplies = (on) => replies.querySelectorAll("button").forEach((b) => (b.disabled = on));

  // Short "typing…" pause before the receptionist replies, like a person thinking
  async function think() {
    const el = document.createElement("div");
    el.className = "ph-msg ai ph-thinking";
    el.innerHTML = '<span class="dots"><i></i><i></i><i></i></span>';
    log.append(el);
    log.scrollTop = log.scrollHeight;
    await wait(700 + Math.random() * 500);
    el.remove();
  }

  async function answer(key, said) {
    if (!call || call.ended || call.busy) return;
    call.busy = true;
    lockReplies(true);
    addMsg("you", said);
    const intent = INTENTS[key];
    await think();
    if (call.ended) return;
    const text = fill(intent.reply);
    addMsg("ai", text);
    await speak(text);
    call.busy = false;
    if (intent.end) return hangUp(true);
    setReplies(intent.next);
  }

  // Map free speech to an intent (for the mic button)
  function intentFor(text) {
    const t = text.toLowerCase();
    if (/\b(bye|that'?s all|thanks|thank you|nothing else)\b/.test(t)) return "bye";
    if (/emergenc|urgent|burst|flood|leak|broke|no (heat|ac|power)|asap|right now/.test(t)) return "urgent";
    if (/thursday|2 ?pm|two/.test(t)) return "slot2";
    if (/tomorrow|9[: ]?30|nine/.test(t)) return "slot1";
    if (/quote|estimate/.test(t)) return "quote";
    if (/price|cost|how much|charge|rate/.test(t)) return "price";
    if (/book|appointment|schedule|come out|visit|available/.test(t)) return "book";
    if (/open|hours|weekend|saturday|sunday|when/.test(t)) return "hours";
    if (/\d{3}/.test(t)) return "number";
    return "fallback";
  }

  // ---------- Mic (optional) ----------
  // Keeps listening while the caller talks and only replies after ~1.5 s of silence,
  // so a pause between words doesn't cut them off. Tapping the mic again finishes early.
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const SILENCE_MS = 1500;
  let rec = null;
  function setMicLabel(listening) {
    micBtn.setAttribute("aria-pressed", String(listening));
    micBtn.querySelector(".ph-mic-label").textContent = listening ? "Listening… tap when done" : "Tap to talk";
  }
  function setupMic() {
    if (!SR) return;
    micBtn.hidden = false;
    micBtn.onclick = () => {
      if (!call || call.ended || call.busy) return;
      if (rec) { rec.finish(); return; }

      const r = new SR();
      r.lang = "en-US"; r.continuous = true; r.interimResults = true; r.maxAlternatives = 1;
      let heard = "", silence = null, done = false, live = null;

      const showLive = (text) => {
        if (!live) {
          live = document.createElement("div");
          live.className = "ph-msg you ph-live";
          log.append(live);
        }
        live.textContent = text;
        log.scrollTop = log.scrollHeight;
      };
      r.finish = () => {
        if (done) return;
        done = true;
        clearTimeout(silence);
        try { r.stop(); } catch {}
        live?.remove();
        const said = heard.trim();
        if (!said || !call || call.ended) return;
        const key = intentFor(said);
        if (key !== "fallback") return answer(key, said);
        answer("fallback", said); // unrecognized: a polite generic reply
      };

      r.onresult = (e) => {
        heard = Array.from(e.results, (res) => res[0].transcript).join(" ").replace(/\s+/g, " ");
        showLive(heard);
        clearTimeout(silence);
        silence = setTimeout(r.finish, SILENCE_MS);
      };
      r.onend = () => { rec = null; setMicLabel(false); r.finish(); };
      r.onerror = (e) => { if (e.error === "no-speech" || e.error === "aborted") heard = heard || ""; };
      rec = r;
      setMicLabel(true);
      r.start();
    };
  }

  // ---------- Call flow ----------
  function tick() {
    const s = Math.floor((Date.now() - call.started) / 1000);
    timerEl.textContent = String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
  }

  async function startCall(biz, indKey, name) {
    if (call && !call.ended) hangUp(false);
    log.replaceChildren(); replies.replaceChildren();
    call = { biz, name, ind: INDUSTRIES[indKey], gender: /^(Leo|Noah)$/.test(name) ? "m" : "f", ended: false, busy: true };
    nameEl.textContent = biz;
    subEl.textContent = INDUSTRIES[indKey].label + " · AI receptionist";
    initialEl.textContent = name[0];
    timerEl.textContent = "00:00";
    phone.dataset.state = "ringing";
    statusEl.textContent = "Calling " + biz + "…";
    hangBtn.disabled = false;
    phone.scrollIntoView({ behavior: "smooth", block: "center" });
    window.gtag?.("event", "demo_call", { industry: indKey });
    window.fbq?.("trackCustom", "DemoCall", { industry: indKey });

    // Warm up speech on this click so mobile browsers allow it to play after the ring
    if (synth) { synth.cancel(); synth.speak(new SpeechSynthesisUtterance("")); }

    const myCall = call;
    await ringOnce();
    if (myCall !== call || call.ended) return;
    phone.dataset.state = "live";
    statusEl.textContent = "Connected";
    call.started = Date.now();
    call.timer = setInterval(tick, 500);
    addMsg("sys", "Call connected");
    const greeting = `Thank you for calling ${biz}. This is ${name}. How can I help you today?`;
    addMsg("ai", greeting);
    await speak(greeting);
    if (myCall !== call || call.ended) return;
    call.busy = false;
    setReplies(START_REPLIES);
    setupMic();
  }

  function hangUp(byReceptionist) {
    if (!call || call.ended) return;
    call.ended = true;
    clearInterval(call.timer);
    synth?.cancel();
    if (rec) { rec.onend = null; try { rec.stop(); } catch {} rec = null; setMicLabel(false); }
    phone.classList.remove("speaking");
    phone.dataset.state = "ended";
    statusEl.textContent = "Call ended";
    hangBtn.disabled = true;
    micBtn.hidden = true;
    addMsg("sys", byReceptionist ? "Call ended" : "You hung up");
    replies.replaceChildren();
    const again = document.createElement("button");
    again.type = "button";
    again.textContent = "↻ Call again";
    again.addEventListener("click", () => startCall(call.biz, form.industry.value, call.name));
    replies.append(again);
  }
  hangBtn.addEventListener("click", () => hangUp(false));

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    let ok = true;
    for (const field of form.querySelectorAll("input, select")) {
      const bad = !field.checkValidity() || (field.name === "business" && !field.value.trim());
      field.closest("label").classList.toggle("invalid", bad);
      if (bad && ok) { field.focus(); ok = false; }
    }
    if (!ok) return;
    startCall(form.business.value.trim().replace(/\s+/g, " "), form.industry.value, form.receptionist.value);
  });
  form.addEventListener("input", (e) => e.target.closest("label")?.classList.remove("invalid"));

  // Prefill from the URL, e.g. /demo/?business=Grass%20Motion&industry=landscaping
  const q = new URLSearchParams(location.search);
  if (q.get("business")) form.business.value = q.get("business").slice(0, 60);
  if (q.get("industry") && INDUSTRIES[q.get("industry")]) form.industry.value = q.get("industry");
})();
