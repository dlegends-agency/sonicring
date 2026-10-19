// SonicRing admin (static preview, no database).
// NOTE: this login runs entirely in the browser. It keeps casual visitors out of the
// screens, but it is NOT real security: anyone can read this file. Don't put private
// data behind it — move to server-side auth (e.g. Supabase Auth) before connecting data.
(() => {
  const CREDENTIALS_SHA256 = "d4a590f8fda89eb1a12cdca75d20c991a26a6b9e3f086bbe64f368868da3410b"; // "Admin:Admin"
  const SESSION_KEY = "sonicring_office_admin";

  const loginView = document.getElementById("login-view");
  const appView = document.getElementById("app-view");
  const form = document.getElementById("login-form");
  const error = document.getElementById("login-error");

  const store = {
    get: () => { try { return sessionStorage.getItem(SESSION_KEY) === "1"; } catch { return false; } },
    set: (on) => { try { on ? sessionStorage.setItem(SESSION_KEY, "1") : sessionStorage.removeItem(SESSION_KEY); } catch {} },
  };

  async function sha256(text) {
    const bytes = new TextEncoder().encode(text);
    const hash = await crypto.subtle.digest("SHA-256", bytes);
    return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  function show(authed) {
    loginView.hidden = authed;
    appView.hidden = !authed;
    document.title = authed ? "Dashboard — SonicRing Admin" : "Admin — SonicRing";
    if (!authed) form.username.focus();
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const user = form.username.value.trim();
    const pass = form.password.value;
    const ok = user && pass && (await sha256(`${user}:${pass}`)) === CREDENTIALS_SHA256;
    error.hidden = ok;
    if (!ok) {
      form.password.value = "";
      form.password.focus();
      form.classList.remove("shake"); void form.offsetWidth; form.classList.add("shake");
      return;
    }
    store.set(true);
    form.reset();
    show(true);
  });
  form.addEventListener("input", () => (error.hidden = true));

  document.getElementById("logout").addEventListener("click", () => {
    store.set(false);
    show(false);
  });

  // Sidebar navigation between the dashboard views
  const navButtons = [...document.querySelectorAll(".adm-nav button")];
  const views = [...document.querySelectorAll(".adm-view")];
  navButtons.forEach((btn) => btn.addEventListener("click", () => {
    navButtons.forEach((b) => b.classList.toggle("active", b === btn));
    views.forEach((v) => (v.hidden = v.dataset.view !== btn.dataset.view));
  }));

  show(store.get());
})();
