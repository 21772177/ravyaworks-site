(function () {
  "use strict";

  var industries = [];
  var currentIndustry = null;
  var industriesReady = false;
  var pendingExcelFile = null;
  var pendingPreviewHash = false;

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
      if (pendingPreviewHash) {
        checkPreviewHash();
        pendingPreviewHash = false;
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
    "contacted": "contacted",
    "response": "response",
    "status": "response",
    "outcome": "response",
    "no revert": "noRevert",
    "norevert": "noRevert",
    "resent": "resent",
    "preview time": "previewTime",
    "previewtime": "previewTime",
    "preview timestamp": "previewTime"
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
            row.resent = row.resent === "Yes" || row.resent === "yes";
            row.noRevert = row.noRevert === "Yes" || row.noRevert === "yes";
            if (row.previewTime) row.previewTime = parseInt(row.previewTime, 10) || 0;
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
        updateResendList();
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
    document.getElementById("platformSection").hidden = false;

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
      "      var phone = '919480196964';\n" +
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

        updateOutreach(form);
      })
      .catch(function (err) {
        previewFrame.innerHTML = "<div class=\"preview-placeholder\"><p>Could not generate preview. " +
          esc(err.message) + "</p></div>";
        isGenerating = false;
      });

    updateOutreach(getFormData());
  }

  /* ---------- Outreach message ---------- */
  function buildOutreachMessage(form) {
    var name = (form && form.businessName) || document.getElementById("businessName").value.trim() || "there";
    var demoUrl = buildPreviewUrl(form || getFormData());

    return "Hi " + name + ",\n\n" +
      "We came across your business online and noticed that you don't currently have a dedicated website. To help you visualize your online presence, we've created a personalized website preview tailored specifically for " + name + ".\n\n" +
      "You can view your preview here:\n" +
      demoUrl + "\n\n" +
      "If you'd like a website like this for your business or have any questions, simply reply to this message or email us at info@ravyaworks.com.\n\n" +
      "Explore our work:\n" +
      "\uD83C\uDF10 Website: https://ravyaworks.com/\n\n" +
      "Best regards,\nRavya Works Team";
  }

  function updateOutreach(form) {
    var msg = buildOutreachMessage(form);
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

  /* ---------- Platform Connection ---------- */
  function loadPlatformSettings() {
    try {
      var s = JSON.parse(localStorage.getItem("bp_platform") || "{}");
      if (s.url) document.getElementById("platformUrl").value = s.url;
      if (s.key) document.getElementById("platformKey").value = s.key;
    } catch (e) {}
  }

  function savePlatformSettings() {
    localStorage.setItem("bp_platform", JSON.stringify({
      url: document.getElementById("platformUrl").value,
      key: document.getElementById("platformKey").value
    }));
  }

  function setPlatformStatus(msg, type) {
    var el = document.getElementById("platformStatus");
    el.textContent = msg;
    el.className = "platform-status" + (type ? " " + type : "");
  }

  function setSubmitStatus(msg, type) {
    var el = document.getElementById("platformSubmitStatus");
    var icon = el.querySelector(".platform-status-icon");
    var text = el.querySelector(".platform-status-text");
    el.hidden = false;
    el.className = "platform-submit-status" + (type ? " " + type : "");
    if (type === "loading") {
      icon.textContent = "\u23F3";
    } else if (type === "success") {
      icon.textContent = "\u2713";
    } else {
      icon.textContent = "\u2717";
    }
    text.textContent = msg;
  }

  function testPlatformConnection() {
    var url = document.getElementById("platformUrl").value.trim();
    var key = document.getElementById("platformKey").value.trim();

    if (!url || !key) {
      setPlatformStatus("Fill in API endpoint and key.", "error");
      return;
    }

    savePlatformSettings();
    setPlatformStatus("Testing connection\u2026", "loading");

    var testUrl = url.replace(/\/$/, "") + "/api-keys";

    fetch(testUrl, {
      method: "GET",
      headers: {
        "Authorization": "Bearer " + key,
        "Content-Type": "application/json"
      }
    })
      .then(function (r) {
        if (r.status === 401) throw new Error("Authentication failed. Check your API key.");
        if (r.status === 404) throw new Error("Endpoint not found. Check the API URL.");
        if (!r.ok) throw new Error("Connection failed (" + r.status + ")");
        return r.json();
      })
      .then(function (data) {
        setPlatformStatus("Connected successfully!", "success");
      })
      .catch(function (err) {
        setPlatformStatus(err.message, "error");
      });
  }

  function toE164(raw) {
    if (!raw) return "";
    var digits = raw.replace(/[^0-9]/g, "");
    if (!digits) return "";
    if (raw.charAt(0) === "+") return "+" + digits;
    if (digits.length === 10) return "+91" + digits;
    if (digits.length === 11 && digits.charAt(0) === "0") return "+91" + digits.slice(1);
    if (digits.length === 12 && digits.startsWith("91")) return "+" + digits;
    return "+" + digits;
  }

  function submitToPlatform() {
    var url = document.getElementById("platformUrl").value.trim();
    var key = document.getElementById("platformKey").value.trim();

    if (!url || !key) {
      setSubmitStatus("Configure platform connection first.", "error");
      return;
    }

    var form = getFormData();
    if (!form.businessName) {
      setSubmitStatus("Business name is required.", "error");
      return;
    }

    var phone = toE164(form.phone);
    if (!phone) {
      setSubmitStatus("Phone number is required for platform submission.", "error");
      return;
    }

    var message = buildOutreachMessage(form);
    var previewUrl = buildPreviewUrl(form);
    var ind = document.getElementById("industry").value;

    var payload = {
      businessName: form.businessName,
      phone: phone,
      personalizedMessage: message,
      previewUrl: previewUrl,
      industry: ind || undefined,
      contactPerson: undefined,
      campaignName: ind ? ind.charAt(0).toUpperCase() + ind.slice(1) + " Outreach" : undefined,
      metadata: {
        source: "business-preview-generator",
        searchArea: form.searchArea || undefined,
        ratings: form.ratings || undefined,
        totalReviews: form.totalReviews || undefined
      }
    };

    savePlatformSettings();
    setSubmitStatus("Submitting to platform\u2026", "loading");

    var submitUrl = url.replace(/\/$/, "") + "/";

    fetch(submitUrl, {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + key,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    })
      .then(function (r) {
        return r.json().then(function (body) {
          return { status: r.status, body: body };
        });
      })
      .then(function (res) {
        if (res.status === 401) throw new Error("Authentication failed. Check your API key.");
        if (res.status === 404) throw new Error("Endpoint not found. Check the API URL.");
        if (res.status === 422 && res.body.data && res.body.data.errors) {
          var errs = res.body.data.errors.map(function (e) { return e.message; }).join("; ");
          throw new Error("Validation error: " + errs);
        }
        if (!res.body.success) throw new Error(res.body.error || "Submission failed");
        var data = res.body.data;
        var parts = ["Submitted successfully!"];
        if (data.campaignId) parts.push("Campaign: " + data.campaignId.substring(0, 8) + "\u2026");
        if (data.businesses && data.businesses[0] && data.businesses[0].campaignBusinessId) {
          parts.push("Job: " + data.businesses[0].campaignBusinessId.substring(0, 8) + "\u2026");
        }
        setSubmitStatus(parts.join(" | "), "success");
      })
      .catch(function (err) {
        setSubmitStatus(err.message, "error");
      });
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
        if (headers.indexOf("Response") === -1) {
          headers.push("Response");
        }
        if (headers.indexOf("Resent") === -1) {
          headers.push("Resent");
        }
        if (headers.indexOf("No Revert") === -1) {
          headers.push("No Revert");
        }
        if (headers.indexOf("Preview Time") === -1) {
          headers.push("Preview Time");
        }

        var updatedJson = json.map(function (row, i) {
          var newRow = {};
          headers.forEach(function (h) { newRow[h] = row[h] !== undefined ? row[h] : ""; });
          if (i < excelRows.length) {
            newRow["Contacted"] = excelRows[i].contacted ? "Yes" : "No";
            newRow["Resent"] = excelRows[i].resent ? "Yes" : "No";
            newRow["No Revert"] = excelRows[i].noRevert ? "Yes" : "No";
            if (excelRows[i].previewTime) {
              newRow["Preview Time"] = String(excelRows[i].previewTime);
            }
            if (excelRows[i].response) {
              newRow["Response"] = excelRows[i].response;
            }
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

  /* ---------- Preview URL encoding ---------- */
  function buildPreviewUrl(form) {
    form = form || getFormData();
    var name = form.businessName || document.getElementById("businessName").value.trim();
    var ind = document.getElementById("industry").value;
    if (!name || !ind) return window.location.href.split("#")[0].split("?")[0];

    var ts = Math.floor(Date.now() / 1000);
    if (excelRows.length && excelCurrentIndex >= 0 && excelCurrentIndex < excelRows.length) {
      excelRows[excelCurrentIndex].previewTime = ts;
    }

    /* Build personalized demo site URL with real business data */
    var demoBase = "https://ravyaworks.com/demos/" + ind + "/";
    var qs = "n=" + encodeURIComponent(name);
    if (form.phone) qs += "&p=" + encodeURIComponent(form.phone);
    if (form.address) {
      var fullAddr = (form.searchArea ? form.searchArea + ", " : "") + form.address;
      qs += "&a=" + encodeURIComponent(fullAddr);
    }
    if (form.ratings) qs += "&r=" + encodeURIComponent(form.ratings);
    if (form.totalReviews) qs += "&rev=" + encodeURIComponent(form.totalReviews);

    return demoBase + "?" + qs;
  }

  function checkPreviewHash() {
    var hash = window.location.hash;
    if (hash.indexOf("#/p?") !== 0) return;

    var qs = hash.substring("#/p?".length);
    var params = {};
    qs.split("&").forEach(function (pair) {
      var idx = pair.indexOf("=");
      if (idx === -1) return;
      params[decodeURIComponent(pair.substring(0, idx))] = decodeURIComponent(pair.substring(idx + 1) || "");
    });

    if (!params.n || !params.i) return;

    document.getElementById("businessName").value = params.n;

    if (params.t) {
      var now = Math.floor(Date.now() / 1000);
      var created = parseInt(params.t, 10) || now;
      if (excelRows.length && excelCurrentIndex >= 0 && excelCurrentIndex < excelRows.length) {
        excelRows[excelCurrentIndex].previewTime = created;
      }
    }

    document.body.classList.add("preview-mode");

    var sel = document.getElementById("industry");
    sel.value = params.i;
    generatePreview();
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

  /* ---------- Resend list ---------- */
  function updateResendList() {
    var list = document.getElementById("resendList");
    var section = document.getElementById("resendSection");
    if (!excelRows.length) { section.hidden = true; return; }

    var now = Math.floor(Date.now() / 1000);
    var cutoff = now - 172800;
    var items = [];

    for (var i = 0; i < excelRows.length; i++) {
      var row = excelRows[i];
      var ts = row.previewTime || 0;
      if (ts > 0 && ts < cutoff && !row.resent && !row.noRevert) {
        items.push({ index: i, row: row });
      }
    }

    if (!items.length) { section.hidden = true; return; }
    section.hidden = false;

    var html = "";
    for (var j = 0; j < items.length; j++) {
      var item = items[j];
      var name = item.row.businessName || "Unnamed";
      var ind = item.row.industry || "";
      var elapsed = formatElapsed(now - item.row.previewTime);
      html += "<div class=\"resend-item\">" +
        "<div class=\"resend-info\">" +
        "<strong>" + escapeHtml(name) + "</strong>" +
        "<span class=\"resend-meta\">" + escapeHtml(ind) + " &middot; " + elapsed + "</span>" +
        "</div>" +
        "<div class=\"resend-actions\">" +
        "<button class=\"btn btn--small\" onclick=\"resendBusiness(" + item.index + ")\">Resend</button>" +
        "<button class=\"btn btn--small btn--secondary\" onclick=\"markNoRevert(" + item.index + ")\">No Revert</button>" +
        "</div>" +
        "</div>";
    }
    list.innerHTML = html;
  }

  function formatElapsed(diffSec) {
    var days = Math.floor(diffSec / 86400);
    var hours = Math.floor((diffSec % 86400) / 3600);
    if (days > 0) return days + "d " + hours + "h ago";
    return hours + "h ago";
  }

  window.resendBusiness = function (i) {
    if (i < 0 || i >= excelRows.length) return;
    var row = excelRows[i];
    if (row.resent) { alert("Already resent."); return; }
    if (row.noRevert) { alert("Marked as No Revert."); return; }

    fillFormFromRow(i);
    setTimeout(function () {
      var msgEl = document.getElementById("outreachMessage");
      if (!msgEl || !msgEl.textContent) return;
      var phone = row.phone || document.getElementById("phone").value;
      var phoneClean = String(phone).replace(/[^0-9]/g, "");
      if (!phoneClean) { alert("No phone number for this business."); return; }
      window.open("https://wa.me/" + phoneClean + "?text=" + encodeURIComponent(msgEl.textContent), "_blank");
      row.contacted = true;
      row.resent = true;
      updateResendList();
      updateContactedCount();
    }, 200);
  };

  window.markNoRevert = function (i) {
    if (i < 0 || i >= excelRows.length) return;
    excelRows[i].noRevert = true;
    excelRows[i].response = "No Revert";
    updateResendList();
  };

  setInterval(updateResendList, 60000);
  updateResendList();

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

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

  /* ---------- Platform Connection event binding ---------- */
  document.getElementById("togglePlatformKeyBtn").addEventListener("click", function () {
    var input = document.getElementById("platformKey");
    if (input.type === "password") {
      input.type = "text";
      this.textContent = "Hide";
    } else {
      input.type = "password";
      this.textContent = "Show";
    }
  });

  document.getElementById("testPlatformBtn").addEventListener("click", testPlatformConnection);
  document.getElementById("submitPlatformBtn").addEventListener("click", submitToPlatform);

  loadPlatformSettings();

  /* ---------- Check for preview URL hash ---------- */
  var hasPreviewHash = window.location.hash.indexOf("#/p?") === 0;
  if (industriesReady && hasPreviewHash) {
    checkPreviewHash();
  } else if (hasPreviewHash) {
    pendingPreviewHash = true;
  }

})();
