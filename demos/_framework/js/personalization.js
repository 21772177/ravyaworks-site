/* ============================================================
   RAVYAWORKS PERSONALIZATION ENGINE — personalization.js
   Replaces the config.js + app.js loading pair with a smart
   loader that supports three modes:

   STATIC mode   (no ?client= and no ?n= param):
     Loads the industry's existing config.js normally, then
     loads app.js.  Identical behaviour to the original two-
     script loading — 100 % backward compatible.

   CLIENT mode   (?client=some-business):
     Reads the client slug from the URL, fetches the
     corresponding JSON from data/{industry}/{client}.json,
     builds a SITE_CONFIG object, then loads app.js.

   URL PARAM mode (?n=Business+Name&i=industry):
     Loads the industry's default config.js for theme/services/
     gallery/testimonials, then merges real business data
     (name, phone, address, rating, reviews) from URL params.
     Used by the business preview outreach links.

   Fallback: if fetching fails the page still renders
   with a minimal skeleton (business name from params, default
   theme from data-preset).
   ============================================================ */
(function () {
  "use strict";

  var params    = new URLSearchParams(location.search);
  var client    = params.get("client");
  var bizName   = params.get("n");
  var preset    = document.body.getAttribute("data-preset") || "";
  var urlBase   = "../_framework/";

  /* ─── Determine mode ─── */
  var hasBizParams = !!(bizName && preset);

  /* ─── STATIC MODE (backward compatible) ─── */
  if (!client && !hasBizParams) {
    document.write('<script src="config.js"><\/script>');
    document.write('<script src="' + urlBase + 'js/app.js"><\/script>');
    return;
  }

  /* ─── CLIENT MODE (?client=slug → JSON file) ─── */
  if (client) {
    var jsonUrl = "../data/" + preset + "/" + encodeURIComponent(client) + ".json";

    var xhr = new XMLHttpRequest();
    xhr.open("GET", jsonUrl, false);
    try { xhr.send(); } catch (_) {}

    if (xhr.status === 200) {
      try {
        var raw = JSON.parse(xhr.responseText);
        window.SITE_CONFIG = buildConfig(raw, preset);
      } catch (e) {
        console.warn("[Personalization] Failed to parse JSON for", client, e);
        window.SITE_CONFIG = fallbackConfig(client, preset);
      }
    } else {
      console.warn("[Personalization] Could not load", jsonUrl, "(" + xhr.status + ")");
      window.SITE_CONFIG = fallbackConfig(client, preset);
    }

    document.write('<script src="' + urlBase + 'js/app.js"><\/script>');
    return;
  }

  /* ─── URL PARAM MODE (?n=Business+Name&i=industry) ─── */
  var bizParams = readBizParams();

  /* 1. Inject config.js → sets window.SITE_CONFIG with demo content + theme */
  document.write('<script src="config.js"><\/script>');

  /* 2. Merge real business data from URL params into SITE_CONFIG */
  var mergeScript =
    '<script>\n' +
    '(function(){\n' +
    '  var c = window.SITE_CONFIG;\n' +
    '  if (!c) return;\n' +
    '  var p = ' + JSON.stringify(bizParams) + ';\n' +
    '  var ind = ' + JSON.stringify(preset) + ';\n' +
    '  if (p.n) {\n' +
    '    c.business.name = p.n;\n' +
    '    c.business.tagline = "";\n' +
    '    c.seo.description = p.n;\n' +
    '    c.seo.keywords = ind + ", " + p.n;\n' +
    '    c.hero.heading = "Welcome to <span class=\\\"accent\\\">' + escHtml(bizName) + '</span>";\n' +
    '    c.hero.subheading = "";\n' +
    '    c.about.title = "About ' + escHtml(bizName) + '";\n' +
    '    c.about.paragraphs = ["' + escHtml(bizName) + ' is a trusted ' + escHtml(preset) + ' in the area. We are committed to delivering quality and exceptional service to every customer."];\n' +
    '    c.about.footerBlurb = c.about.paragraphs[0];\n' +
    '    c.ctaBand.title = "Get in Touch with ' + escHtml(bizName) + '";\n' +
    '  }\n' +
    '  if (p.p) { c.contact.phone = p.p; c.contact.whatsapp = p.p; }\n' +
    '  if (p.a) { c.contact.address = c.contact.address || {}; c.contact.address.full = p.a; }\n' +
    '  if (p.r || p.rev) {\n' +
    '    c.about.stats = (c.about.stats || []).filter(function(s){ return s.label !== "Rating" && s.label !== "Reviews"; });\n' +
    '    if (p.r) c.about.stats.unshift({ value: p.r + "\\u2605", label: "Rating" });\n' +
    '    if (p.rev) c.about.stats.push({ value: p.rev, label: "Reviews" });\n' +
    '  }\n' +
    '})();\n' +
    '<' + '/script>';

  document.write(mergeScript);

  /* 3. Load app.js → reads the merged SITE_CONFIG and renders */
  document.write('<script src="' + urlBase + 'js/app.js"><\/script>');


  /* ============================================================
     helpers
     ============================================================ */

  /** Read business data from URL query parameters. */
  function readBizParams() {
    var out = {};
    var map = { n: "n", p: "p", a: "a", r: "r", rev: "rev" };
    Object.keys(map).forEach(function (k) {
      var v = params.get(k);
      if (v) out[map[k]] = v;
    });
    return out;
  }

  /** Basic HTML-entity escape for user-supplied strings. */
  function escHtml(s) {
    if (!s) return "";
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  /* ── CLIENT MODE helpers (unchanged) ── */

  /** Build a full SITE_CONFIG from a JSON data object. */
  function buildConfig(data, ind) {
    var name  = data.businessName  || formatName(client);
    var tag   = data.tagline       || "";
    var desc  = data.description   || "";
    var phone = data.phone         || "";
    var email = data.email         || "";
    var addr  = data.address       || "";
    var city  = data.city          || "";
    var img   = data.heroImage     || "assets/hero.jpg";

    var theme = parseTheme(data.theme || ind);

    var cfg = {
      business: {
        name: name,
        tagline: tag,
        industry: data.industry || ind,
        established: ""
      },
      theme: theme,
      darkMode: data.darkMode || false,
      seo: {
        description: desc || tag || name,
        keywords: (data.industry || ind) + ", " + name,
        ogImage: img
      },
      hero: {
        heading: "Welcome to <span class=\"accent\">" + escHtml(name) + "</span>",
        subheading: tag || desc,
        images: [img],
        quick: data.serviceOptions && data.serviceOptions.length ? data.serviceOptions.slice(0, 4) : []
      },
      cta: {
        header: data.bookingLinks && data.bookingLinks.website ? "Book Now" : "Get in Touch",
        primary: "Contact Us",
        secondary: ""
      },
      about: desc ? {
        title: "About " + name,
        image: "assets/about.jpg",
        paragraphs: [desc],
        footerBlurb: desc
      } : null,
      services: buildServices(data, ind),
      gallery: data.gallery || [],
      testimonials: data.reviews || [],
      team: data.team || [],
      faq: data.faq || [],
      ctaBand: {
        title: "Ready to Experience " + name + "?",
        subtitle: "Get in touch today and let us take care of the rest."
      },
      contact: {
        phone: phone,
        whatsapp: phone,
        email: email,
        address: { full: addr, city: city, pincode: data.pincode || "" },
        mapEmbed: data.googleMaps || ""
      },
      social: data.socialLinks || {},
      hours: buildHours(data.businessHours),
      navLabels: buildNavLabel(ind)
    };

    return cfg;
  }

  /** Minimal skeleton when JSON is missing. */
  function fallbackConfig(slug, ind) {
    var name = formatName(slug);
    var theme = parseTheme(ind);
    return {
      business: { name: name, tagline: "", industry: ind || "" },
      theme: theme,
      darkMode: false,
      seo: { description: name, keywords: ind || "", ogImage: "assets/hero.jpg" },
      hero: {
        heading: name,
        subheading: "",
        images: ["assets/hero.jpg"],
        quick: []
      },
      cta: { header: "Get in Touch", primary: "Contact Us" },
      about: null,
      services: ind === "restaurant" ? { style: "menu", items: [] } :
                ind === "gym"        ? { style: "pricing", items: [] } :
                                       null,
      gallery: [],
      testimonials: [],
      team: [],
      faq: [],
      ctaBand: { title: "Ready to Get Started?", subtitle: "" },
      contact: {},
      social: {},
      hours: [],
      navLabels: buildNavLabel(ind)
    };
  }

  /** Convert a services array + industry hint into the SITE_CONFIG.services shape. */
  function buildServices(data, ind) {
    var items = data.services || [];
    if (!items.length) return null;
    var style = "cards";
    if (ind === "restaurant" || ind === "caterer") style = "menu";
    else if (ind === "gym" || ind === "coaching" || ind === "salon") style = "pricing";
    return { style: style, items: items };
  }

  /** Convert businessHours object → array of { day, time }. */
  function buildHours(h) {
    if (!h || typeof h !== "object") return [];
    return Object.keys(h).map(function (d) { return { day: d, time: h[d] || "" }; });
  }

  /** Industry-specific nav label for "Services". */
  function buildNavLabel(ind) {
    var map = {
      restaurant: "Menu",
      hospital: "Departments",
      school: "Academics",
      salon: "Services",
      boutique: "Collections",
      caterer: "Packages",
      gym: "Programs",
      coaching: "Courses",
      grocery: "Categories"
    };
    return { services: map[ind] || "Services" };
  }

  /** Map industry slug → theme colour palette. */
  function parseTheme(t) {
    if (!t || typeof t !== "string") return {};
    var themes = {
      restaurant: { primary: "#c0392b", primaryDark: "#962d22", primaryLight: "#e74c3c", secondary: "#2c3e50", accent: "#f39c12", surfaceAlt: "#fff5f2" },
      school:     { primary: "#2563eb", primaryDark: "#1d4ed8", primaryLight: "#3b82f6", secondary: "#1e293b", accent: "#f59e0b", surfaceAlt: "#f0f4ff" },
      hospital:   { primary: "#0d9488", primaryDark: "#0f766e", primaryLight: "#14b8a6", secondary: "#1e293b", accent: "#f59e0b", surfaceAlt: "#f0fdfa" },
      gym:        { primary: "#16a34a", primaryDark: "#15803d", primaryLight: "#22c55e", secondary: "#1e293b", accent: "#f97316", surfaceAlt: "#f0fdf4" },
      salon:      { primary: "#be185d", primaryDark: "#9d174d", primaryLight: "#db2777", secondary: "#1e293b", accent: "#f59e0b", surfaceAlt: "#fdf2f8" },
      grocery:    { primary: "#65a30d", primaryDark: "#4d7c0f", primaryLight: "#84cc16", secondary: "#1e293b", accent: "#f59e0b", surfaceAlt: "#f7fee7" },
      boutique:   { primary: "#7c3aed", primaryDark: "#6d28d9", primaryLight: "#8b5cf6", secondary: "#1e293b", accent: "#f59e0b", surfaceAlt: "#f5f3ff" },
      caterer:    { primary: "#9f1239", primaryDark: "#881337", primaryLight: "#be123c", secondary: "#1e293b", accent: "#f59e0b", surfaceAlt: "#fff1f2" },
      coaching:   { primary: "#4f46e5", primaryDark: "#4338ca", primaryLight: "#6366f1", secondary: "#1e293b", accent: "#f59e0b", surfaceAlt: "#eef2ff" }
    };
    return themes[t.toLowerCase()] || themes.restaurant;
  }

  /** "the-boozy-griffin" → "The Boozy Griffin" */
  function formatName(slug) {
    if (!slug) return "Business";
    return slug.split(/[-_]/).map(function (w) {
      return w.charAt(0).toUpperCase() + w.slice(1);
    }).join(" ");
  }
})();
