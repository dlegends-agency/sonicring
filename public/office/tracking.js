// SonicRing tracking for the static /office/ pages.
// Mirrors the React site: GA4 site-wide tag + Facebook Pixel (PageView, ViewContent, Lead).
// IDs are copied from the main site (src/data/siteConfig.ts and /admin/settings). If they change
// there, update them here too: these static pages can't read the Supabase settings.
(() => {
  const GA4_ID = "G-2283FYD6CE";
  const FB_PIXEL_ID = "2400032310521798";
  const GOOGLE_ADS_ID = "";        // e.g. "AW-123456789" (not configured on the main site yet)
  const GOOGLE_ADS_LEAD_LABEL = "";

  // Don't send local development visits to the real analytics accounts. Add ?track=1 to test.
  const isLocal = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) || location.protocol === "file:";
  const enabled = !isLocal || new URLSearchParams(location.search).has("track");

  const noop = () => {};
  window.srTrack = { lead: noop };
  if (!enabled) return;

  // ---- Google tag (GA4 + Google Ads share gtag.js) ----
  const gtagIds = [GA4_ID, GOOGLE_ADS_ID].filter(Boolean);
  if (gtagIds.length) {
    const s = document.createElement("script");
    s.async = true;
    s.id = "gtag-script";
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(gtagIds[0]);
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    for (const id of gtagIds) window.gtag("config", id); // automatic page_view, like the main site
  }

  // ---- Facebook Pixel ----
  if (FB_PIXEL_ID) {
    const fbq = function () {
      fbq.callMethod ? fbq.callMethod.apply(fbq, arguments) : fbq.queue.push(arguments);
    };
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = "2.0";
    fbq.queue = [];
    window.fbq = window._fbq = fbq;
    const s = document.createElement("script");
    s.async = true;
    s.id = "fb-pixel-script";
    s.src = "https://connect.facebook.net/en_US/fbevents.js";
    document.head.appendChild(s);
    fbq("init", FB_PIXEL_ID);
    fbq("track", "PageView");
    fbq("track", "ViewContent", { content_name: location.pathname, content_category: "office" });
  }

  // ---- Lead event (waitlist signup). Never pass personal data (email, phone) here. ----
  window.srTrack.lead = (extra = {}) => {
    if (window.fbq && FB_PIXEL_ID) window.fbq("track", "Lead", extra);
    if (window.gtag && GA4_ID) window.gtag("event", "generate_lead", { send_to: GA4_ID, ...extra });
    if (window.gtag && GOOGLE_ADS_ID) {
      window.gtag("event", "conversion", { send_to: GOOGLE_ADS_LEAD_LABEL ? `${GOOGLE_ADS_ID}/${GOOGLE_ADS_LEAD_LABEL}` : GOOGLE_ADS_ID, ...extra });
    }
  };
})();
