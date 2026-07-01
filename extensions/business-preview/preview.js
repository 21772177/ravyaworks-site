(function () {
  "use strict";

  var industries = [];
  var currentIndustry = null;
  var industriesReady = false;
  var pendingExcelFile = null;

  /* ---------- Load industry metadata ---------- */
  fetch("industries.json")
    .then(function (r) { return r.json(); })
    .then(function (data) {
      industries = data.industries;
      var select = document.getElementById("industry");
      var frag = document.createDocumentFragment();
      var blank = document.createElement("option");
      blank.value = "";
      blank.textContent = "-- Select Industry --";
      frag.appendChild(blank);
      industries.forEach(function (ind) {
        var opt = document.createElement("option");
        opt.value = ind.slug;
        opt.textContent = ind.label;
        frag.appendChild(opt);
      });
      select.appendChild(frag);
      industriesReady = true;
      if (pendingExcelFile) {
        handleExcelFile(pendingExcelFile);
        pendingExcelFile = null;
      }
    })
    .catch(function (err) {
      console.error("Failed to load industries.json", err);
    });

  /* ---------- Fetch & parse a template config.js ---------- */
  var templateCache = {};

  function fetchTemplate(slug) {
    if (templateCache[slug]) return templateCache[slug];
    var ind = industries.filter(function (i) { return i.slug === slug; })[0];
    if (!ind) return Promise.reject(new Error("Unknown industry: " + slug));
    currentIndustry = ind;

    var configUrl = ind.templatePath + "config.js";
    var promise = fetch(configUrl)
      .then(function (r) {
        if (!r.ok) throw new Error("Failed to fetch " + configUrl);
        return r.text();
      })
      .then(function (text) {
        var sandbox = {};
        new Function("window", text)(sandbox);
        if (!sandbox.SITE_CONFIG) throw new Error("No SITE_CONFIG found in " + configUrl);
        return sandbox.SITE_CONFIG;
      });
    templateCache[slug] = promise;
    return promise;
  }

  /* ---------- Excel state ---------- */
  var excelRows = [];
  var excelCurrentIndex = 0;

  /* ---------- Column name normalisation ---------- */
  var COLUMN_MAP = {
    "business name": "businessName",
    "businessname": "businessName",
    "name": "businessName",
    "tagline": "tagline",
    "description": "description",
    "about": "description",
    "phone": "phone",
    "contact": "phone",
    "address": "address",
    "industry": "industry",
    "category": "industry",
    "category searched": "industry",
    "search area": "searchArea",
    "searcharea": "searchArea",
    "ratings": "ratings",
    "rating": "ratings",
    "total reviews": "totalReviews",
    "totalreviews": "totalReviews",
    "reviews": "totalReviews",
    "contacted": "contacted"
  };

  function normaliseColName(raw) {
    return COLUMN_MAP[raw.trim().toLowerCase()] || null;
  }

  /* ---------- Parse Excel file ---------- */
  function handleExcelFile(file) {
    var reader = new FileReader();
    reader.onload = function (e) {
      try {
        var data = new Uint8Array(e.target.result);
        var workbook = XLSX.read(data, { type: "array" });
        var firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        var json = XLSX.utils.sheet_to_json(firstSheet, { defval: "" });

        if (!json || json.length === 0) {
          setExcelStatus("The file is empty.", false);
          return;
        }

        excelRows = [];
        json.forEach(function (rawRow) {
          var row = {};
          for (var key in rawRow) {
            var mapped = normaliseColName(key);
            if (mapped) row[mapped] = String(rawRow[key]).trim();
          }
          if (row.businessName || row.industry) {
            row.contacted = row.contacted === "Yes" || row.contacted === "yes";
            excelRows.push(row);
          }
        });

        if (excelRows.length === 0) {
          setExcelStatus("No recognised columns found. Expected: Business Name, Industry, Phone, Address, etc.", false);
          return;
        }

        excelCurrentIndex = 0;
        setExcelStatus(excelRows.length + " business" + (excelRows.length > 1 ? "es" : "") + " loaded", true);
        document.getElementById("rowNav").hidden = false;
        fillFormFromRow(0);
      } catch (err) {
        setExcelStatus("Error reading file: " + err.message, false);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  function setExcelStatus(msg, loaded) {
    var el = document.getElementById("excelStatus");
    el.textContent = msg;
    el.className = "upload-status" + (loaded ? " loaded" : "");
  }

  function fillFormFromRow(index) {
    if (!excelRows.length || index < 0 || index >= excelRows.length) return;
    var row = excelRows[index];
    excelCurrentIndex = index;

    if (row.industry) {
      var sel = document.getElementById("industry");
      var matchVal = "";
      for (var i = 0; i < sel.options.length; i++) {
        if (sel.options[i].value === row.industry.toLowerCase()) {
          matchVal = sel.options[i].value;
          break;
        }
      }
      if (!matchVal) {
        for (var j = 0; j < industries.length; j++) {
          if (industries[j].label.toLowerCase() === row.industry.toLowerCase()) {
            matchVal = industries[j].slug;
            break;
          }
        }
      }
      if (matchVal) sel.value = matchVal;
    }

  if (row.businessName) document.getElementById("businessName").value = row.businessName;
  if (row.tagline) document.getElementById("tagline").value = row.tagline;
  if (row.description) document.getElementById("description").value = row.description;
  if (row.phone) document.getElementById("phone").value = row.phone;
  if (row.address) document.getElementById("address").value = row.address;
  if (row.searchArea) document.getElementById("searchArea").value = row.searchArea;
  if (row.ratings) document.getElementById("ratings").value = row.ratings;
  if (row.totalReviews) document.getElementById("totalReviews").value = row.totalReviews;

    var badge = row.contacted ? " <span class=\"row-contact-badge\">\u2713</span>" : "";
    document.getElementById("rowCounter").innerHTML =
      "Row " + (index + 1) + " of " + excelRows.length + badge;

    document.getElementById("syncSection").hidden = false;

    updateContactedCount();
    generatePreview();
  }

  /* ---------- Read form data ---------- */
  function getFormData() {
    return {
      businessName: document.getElementById("businessName").value.trim(),
      tagline: document.getElementById("tagline").value.trim(),
      description: document.getElementById("description").value.trim(),
      phone: document.getElementById("phone").value.trim(),
      address: document.getElementById("address").value.trim(),
      searchArea: document.getElementById("searchArea").value.trim(),
      ratings: document.getElementById("ratings").value.trim(),
      totalReviews: document.getElementById("totalReviews").value.trim()
    };
  }

  /* ---------- Deep merge user data into template ---------- */
  function mergeConfig(template, form) {
    var cfg = JSON.parse(JSON.stringify(template));

    if (cfg.business) {
      cfg.business.name = form.businessName || cfg.business.name;
      cfg.business.tagline = form.tagline || cfg.business.tagline;
    }

    if (cfg.hero) {
      cfg.hero.heading = "Welcome to <span class=\"accent\">" + esc(form.businessName || cfg.business.name) + "</span>";
      cfg.hero.subheading = form.description || form.tagline || cfg.hero.subheading;
    }

    if (cfg.about) {
      cfg.about.title = "About " + (form.businessName || cfg.business.name);
      if (cfg.about.paragraphs && cfg.about.paragraphs.length > 0) {
        cfg.about.paragraphs[0] = form.description || cfg.about.paragraphs[0];
      }
    }

    if (cfg.contact) {
      cfg.contact.phone = form.phone || cfg.contact.phone;
      if (cfg.contact.address && typeof cfg.contact.address === "object") {
        var area = form.searchArea ? form.searchArea + ", " : "";
        cfg.contact.address.full = area + (form.address || cfg.contact.address.full);
      }
    }

    if (cfg.hero && form.ratings) {
      var hasRating = false;
      if (cfg.hero.quick) {
        cfg.hero.quick = cfg.hero.quick.filter(function (q) {
          return q.indexOf("\u2605") === -1 && q.indexOf("Rating") === -1 && q.indexOf("Review") === -1;
        });
      }
    }

    if (cfg.about && cfg.about.stats) {
      cfg.about.stats = cfg.about.stats.filter(function (s) {
        return s.label.indexOf("Rating") === -1 && s.label.indexOf("Review") === -1;
      });
      if (form.ratings) {
        cfg.about.stats.unshift({ value: form.ratings + "\u2605", label: "Rating" });
      }
      if (form.totalReviews) {
        cfg.about.stats.push({ value: form.totalReviews, label: "Reviews" });
      }
    }

    if (cfg.seo) {
      cfg.seo.description = form.description || cfg.seo.description;
    }

    if (cfg.ctaBand) {
      cfg.ctaBand.title = "Get in Touch with " + (form.businessName || cfg.business.name);
      cfg.ctaBand.subtitle = "Call, email or visit us today. We are here to help you.";
    }

    delete cfg._swPath;
    return cfg;
  }

  /* ---------- Build iframe srcdoc ---------- */
  function buildIframeContent(cfg, industry) {
    var base = new URL(industry.templatePath, window.location.href).href;
    var pageUrl = window.location.href;

    var cssFiles = [
      "../../demos/_framework/css/base.css",
      "../../demos/_framework/css/layout.css",
      "../../demos/_framework/css/components.css",
      "../../demos/_framework/css/theme.css",
      "../../demos/_framework/css/critical.css"
    ];

    var appJsUrl = new URL("../../demos/_framework/js/app.js", window.location.href).href;

    var cssLinks = cssFiles.map(function (p) {
      var url = new URL(p, window.location.href).href;
      return "    <link rel=\"stylesheet\" href=\"" + url + "\">";
    }).join("\n");

    var configJson = JSON.stringify(cfg)
      .replace(/<\/script>/gi, "<\\/script>")
      .replace(/<!--/g, "<\\!--");

    var waMsg = "Hi! I saw the \"" + cfg.business.name + "\" website preview and I'm interested." +
      "\n\nPreview: " + pageUrl +
      "\n\nWebsite: https://ravyaworks.com/" +
      "\nPortfolio: https://ravyaworks.com/portfolio/" +
      "\nOr reply here.";
    var waMsgJson = JSON.stringify(waMsg);

    var overrideScript =
      "  <script>\n" +
      "    (function() {\n" +
      "      var msg = " + waMsgJson + ";\n" +
      "      var phone = '919503196964';\n" +
      "      var waLink = 'https://wa.me/' + phone + '?text=' + encodeURIComponent(msg);\n" +
      "      function updateLinks() {\n" +
      "        document.querySelectorAll('[href*=\"wa.me\"]').forEach(function(a) {\n" +
      "          a.href = waLink;\n" +
      "        });\n" +
      "      }\n" +
      "      if (document.readyState === 'complete') { updateLinks(); }\n" +
      "      else { window.addEventListener('load', updateLinks); }\n" +
      "    })();\n" +
      "  <" + "/script>\n";

    return "<!DOCTYPE html>\n" +
      "<html lang=\"en\">\n" +
      "<head>\n" +
      "  <meta charset=\"UTF-8\">\n" +
      "  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n" +
      "  <base href=\"" + base + "\">\n" +
      "  <title>" + esc(cfg.business.name) + "</title>\n" +
      cssLinks + "\n" +
      "  <style>\n" +
      "    *, *::before, *::after { box-sizing: border-box; }\n" +
      "    body { margin: 0; }\n" +
      "  </style>\n" +
      "</head>\n" +
      "<body>\n" +
      "  <div id=\"app\"></div>\n" +
      "  <script>\n" +
      "    window.SITE_CONFIG = " + configJson + ";\n" +
      "  <" + "/script>\n" +
      "  <script src=\"" + appJsUrl + "\"><" + "/script>\n" +
      overrideScript +
      "</body>\n" +
      "</html>";
  }

  /* ---------- Generate preview ---------- */
  var isGenerating = false;

  function generatePreview() {
    if (isGenerating) return;
    var previewFrame = document.getElementById("previewFrame");
    var industrySlug = document.getElementById("industry").value;

    if (!industrySlug) {
      previewFrame.innerHTML = "<div class=\"preview-placeholder\"><p>Please select an industry first.</p></div>";
      return;
    }

    previewFrame.innerHTML = "<div class=\"preview-placeholder\"><p>Generating preview…</p></div>";
    isGenerating = true;

    fetchTemplate(industrySlug)
      .then(function (template) {
        var form = getFormData();
        var merged = mergeConfig(template, form);
        var ind = industries.filter(function (i) { return i.slug === industrySlug; })[0];
        var srcdoc = buildIframeContent(merged, ind);

        previewFrame.innerHTML = "";
        var iframe = document.createElement("iframe");
        iframe.srcdoc = srcdoc;
        iframe.title = "Live Preview — " + merged.business.name;
        previewFrame.appendChild(iframe);
        isGenerating = false;
      })
      .catch(function (err) {
        previewFrame.innerHTML = "<div class=\"preview-placeholder\"><p>Could not generate preview. " +
          esc(err.message) + "</p></div>";
        isGenerating = false;
      });

    updateOutreach();
  }

  /* ---------- Outreach message ---------- */
  function buildOutreachMessage() {
    var name = document.getElementById("businessName").value.trim() || "there";
    var pageUrl = window.location.href;

    return "Hi " + name + ",\n" +
      "We have created a preview website for " + name + ", which is missing in your online presence. Check this out:\n\n" +
      pageUrl + "\n\n" +
      "If you like what you see and would like to proceed, simply reply to this message or contact us:\n" +
      "info@ravyaworks.com\n\n" +
      "you can check our presence online :\n\n" +
      "Website: https://ravyaworks.com/\n" +
      "Portfolio: https://ravyaworks.com/portfolio/\n\n" +
      "We look forward to helping you build your online presence!\n\n" +
      "Best Regards,\nRavya Works Team";
  }

  function updateOutreach() {
    var msg = buildOutreachMessage();
    document.getElementById("outreachMessage").textContent = msg;
    document.getElementById("outreachSection").hidden = false;
  }

  /* ---------- Contacted count ---------- */
  function updateContactedCount() {
    var total = excelRows.length;
    var contacted = excelRows.filter(function (r) { return r.contacted; }).length;
    setExcelStatus(contacted + "/" + total + " contacted", true);
  }

  /* ---------- GitHub Sync ---------- */
  function loadSyncSettings() {
    try {
      var s = JSON.parse(localStorage.getItem("bp_sync") || "{}");
      if (s.token) document.getElementById("ghToken").value = s.token;
      if (s.repo) document.getElementById("ghRepo").value = s.repo;
      if (s.path) document.getElementById("ghPath").value = s.path;
    } catch (e) {}
  }

  function saveSyncSettings() {
    localStorage.setItem("bp_sync", JSON.stringify({
      token: document.getElementById("ghToken").value,
      repo: document.getElementById("ghRepo").value,
      path: document.getElementById("ghPath").value
    }));
  }

  function setSyncStatus(msg, type) {
    var el = document.getElementById("syncStatus");
    el.textContent = msg;
    el.className = "sync-status" + (type ? " " + type : "");
  }

  function syncToGitHub() {
    var token = document.getElementById("ghToken").value.trim();
    var repo = document.getElementById("ghRepo").value.trim();
    var path = document.getElementById("ghPath").value.trim();

    if (!token || !repo || !path) {
      setSyncStatus("Fill in token, repo, and file path.", "error");
      return;
    }

    saveSyncSettings();
    setSyncStatus("Fetching file from GitHub…", "");

    var apiUrl = "https://api.github.com/repos/" + encodeURIComponent(repo) + "/contents/" + encodeURIComponent(path);

    fetch(apiUrl, {
      headers: { "Authorization": "token " + token, "Accept": "application/vnd.github.v3+json" }
    })
      .then(function (r) {
        if (!r.ok) throw new Error("Failed to fetch file (" + r.status + ")");
        return r.json();
      })
      .then(function (data) {
        var sha = data.sha;
        var existingContent = XLSX.read(atob(data.content.replace(/-/g, "+").replace(/_/g, "/")), { type: "binary" });
        var sheet = existingContent.Sheets[existingContent.SheetNames[0]];
        var json = XLSX.utils.sheet_to_json(sheet, { defval: "" });

        var headers = json.length ? Object.keys(json[0]) : [];
        if (headers.indexOf("Contacted") === -1) {
          headers.push("Contacted");
        }

        var updatedJson = json.map(function (row, i) {
          var newRow = {};
          headers.forEach(function (h) { newRow[h] = row[h] !== undefined ? row[h] : ""; });
          if (i < excelRows.length) {
            newRow["Contacted"] = excelRows[i].contacted ? "Yes" : "No";
          }
          return newRow;
        });

        var newSheet = XLSX.utils.json_to_sheet(updatedJson);
        var newWb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(newWb, newSheet, "Sheet1");
        var wbOut = XLSX.write(newWb, { bookType: "xlsx", type: "base64" });

        setSyncStatus("Pushing to GitHub…", "");

        return fetch(apiUrl, {
          method: "PUT",
          headers: {
            "Authorization": "token " + token,
            "Accept": "application/vnd.github.v3+json",
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            message: "Sync contacted status",
            content: wbOut,
            sha: sha
          })
        });
      })
      .then(function (r) {
        if (!r.ok) throw new Error("Push failed (" + r.status + ")");
        return r.json();
      })
      .then(function () {
        setSyncStatus("Synced successfully!", "success");
      })
      .catch(function (err) {
        setSyncStatus(err.message, "error");
      });
  }

  /* ---------- Utility ---------- */
  function esc(s) {
    var d = document.createElement("div");
    d.textContent = String(s == null ? "" : s);
    return d.innerHTML;
  }

  /* ---------- Event binding ---------- */
  document.getElementById("industry").addEventListener("change", function () {
    if (!this.value) return;
    if (excelRows.length) {
      var targetSlug = this.value;
      for (var i = 0; i < excelRows.length; i++) {
        var indVal = excelRows[i].industry;
        if (!indVal) continue;
        var match = indVal.toLowerCase() === targetSlug;
        if (!match) {
          for (var k = 0; k < industries.length; k++) {
            if (industries[k].slug === targetSlug && industries[k].label.toLowerCase() === indVal.toLowerCase()) {
              match = true;
              break;
            }
          }
        }
        if (match) {
          fillFormFromRow(i);
          return;
        }
      }
    }
    generatePreview();
  });

  document.getElementById("previewBtn").addEventListener("click", generatePreview);

  /* ---------- Excel event binding ---------- */
  document.getElementById("uploadBtn").addEventListener("click", function () {
    document.getElementById("excelFile").click();
  });

  document.getElementById("excelFile").addEventListener("change", function () {
    if (this.files && this.files[0]) {
      if (!industriesReady) {
        pendingExcelFile = this.files[0];
        setExcelStatus("Loading industries, please wait…", false);
        return;
      }
      handleExcelFile(this.files[0]);
    }
  });

  document.getElementById("prevRow").addEventListener("click", function () {
    if (excelRows.length && excelCurrentIndex > 0) {
      fillFormFromRow(excelCurrentIndex - 1);
    }
  });

  document.getElementById("nextRow").addEventListener("click", function () {
    if (excelRows.length && excelCurrentIndex < excelRows.length - 1) {
      fillFormFromRow(excelCurrentIndex + 1);
    }
  });

  /* ---------- Outreach event binding ---------- */
  document.getElementById("copyMsgBtn").addEventListener("click", function () {
    var msg = document.getElementById("outreachMessage").textContent;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(msg).then(function () {
        var btn = document.getElementById("copyMsgBtn");
        btn.textContent = "Copied!";
        btn.classList.add("copied");
        setTimeout(function () {
          btn.textContent = "Copy Message";
          btn.classList.remove("copied");
        }, 2000);
      }).catch(function () {
        fallbackCopy(msg);
      });
    } else {
      fallbackCopy(msg);
    }
  });

  document.getElementById("sendWaBtn").addEventListener("click", function () {
    var msg = document.getElementById("outreachMessage").textContent;
    var phone = document.getElementById("phone").value.trim().replace(/[^0-9]/g, "");
    if (!phone) {
      alert("Please enter a phone number for the business first.");
      return;
    }
    window.open("https://wa.me/" + phone + "?text=" + encodeURIComponent(msg), "_blank");
    if (excelRows.length && excelCurrentIndex >= 0 && excelCurrentIndex < excelRows.length) {
      excelRows[excelCurrentIndex].contacted = true;
      var badge = " <span class=\"row-contact-badge\">\u2713</span>";
      document.getElementById("rowCounter").innerHTML =
        "Row " + (excelCurrentIndex + 1) + " of " + excelRows.length + badge;
      updateContactedCount();
    }
  });

  function fallbackCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
      var btn = document.getElementById("copyMsgBtn");
      btn.textContent = "Copied!";
      btn.classList.add("copied");
      setTimeout(function () {
        btn.textContent = "Copy Message";
        btn.classList.remove("copied");
      }, 2000);
    } catch (e) {}
    document.body.removeChild(ta);
  }

  document.getElementById("resetBtn").addEventListener("click", function () {
    document.getElementById("businessName").value = "My Business";
    document.getElementById("tagline").value = "We Build Trust, We Deliver Quality";
    document.getElementById("description").value = "A trusted name in our industry, serving customers with excellence and care. We are committed to delivering the best experience to every client who walks through our doors.";
    document.getElementById("phone").value = "+91 98765 43210";
    document.getElementById("address").value = "Bangalore, Karnataka";
    document.getElementById("searchArea").value = "";
    document.getElementById("ratings").value = "";
    document.getElementById("totalReviews").value = "";
    var sel = document.getElementById("industry");
    if (sel.value) generatePreview();
  });

  /* ---------- GitHub event binding ---------- */
  document.getElementById("toggleTokenBtn").addEventListener("click", function () {
    var input = document.getElementById("ghToken");
    if (input.type === "password") {
      input.type = "text";
      this.textContent = "Hide";
    } else {
      input.type = "password";
      this.textContent = "Show";
    }
  });

  document.getElementById("syncBtn").addEventListener("click", syncToGitHub);

  loadSyncSettings();

})();
