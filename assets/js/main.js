// ScholarSpace — shared site behaviour
(function () {
  "use strict";

  // Mobile navigation
  var toggle = document.querySelector(".nav-toggle");
  var menu = document.getElementById("primary-nav");
  if (toggle && menu) {
    var setOpen = function (open) {
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      menu.classList.toggle("is-open", open);
    };
    toggle.addEventListener("click", function () {
      setOpen(toggle.getAttribute("aria-expanded") !== "true");
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && menu.classList.contains("is-open")) {
        setOpen(false);
        toggle.focus();
      }
    });
    document.addEventListener("click", function (e) {
      if (menu.classList.contains("is-open") && !menu.contains(e.target) && !toggle.contains(e.target)) {
        setOpen(false);
      }
    });
    window.addEventListener("resize", function () {
      if (window.innerWidth > 960) setOpen(false);
    });
  }

  // Broken remote thumbnails fall back to an icon tile
  document.querySelectorAll(".subject-card .thumb img").forEach(function (img) {
    var fail = function () {
      img.parentElement.classList.add("no-img");
      img.remove();
    };
    if (img.complete && img.naturalWidth === 0) fail();
    else img.addEventListener("error", fail);
  });

  // Subject search
  var search = document.getElementById("subject-search");
  if (search) {
    var cards = Array.prototype.slice.call(document.querySelectorAll("[data-subject]"));
    var bookmarks = [];
    try {
      var stored = JSON.parse(localStorage.getItem("scholarspace:subjects"));
      if (Array.isArray(stored)) bookmarks = stored.filter(function (v) { return typeof v === "string"; });
    } catch (_) { /* Continue without persistence. */ }
    var savedOnly = false;
    var savedFilter = document.createElement("button");
    savedFilter.type = "button";
    savedFilter.className = "bookmark-button";
    savedFilter.textContent = "Saved subjects";
    savedFilter.setAttribute("aria-pressed", "false");
    search.closest(".filter-bar").appendChild(savedFilter);
    cards.forEach(function (card) {
      var name = card.getAttribute("data-subject");
      var button = document.createElement("button");
      button.type = "button";
      button.className = "bookmark-button";
      var render = function () {
        var saved = bookmarks.indexOf(name) !== -1;
        button.textContent = saved ? "★ Saved" : "☆ Save subject";
        button.setAttribute("aria-pressed", String(saved));
        button.setAttribute("aria-label", (saved ? "Unsave " : "Save ") + name);
      };
      button.addEventListener("click", function () {
        bookmarks = bookmarks.indexOf(name) !== -1 ? bookmarks.filter(function (v) { return v !== name; }) : bookmarks.concat(name);
        try { localStorage.setItem("scholarspace:subjects", JSON.stringify(bookmarks)); } catch (_) { /* Session state remains usable. */ }
        render(); update();
      });
      render();
      card.querySelector(".body").appendChild(button);
    });
    savedFilter.addEventListener("click", function () {
      savedOnly = !savedOnly;
      savedFilter.setAttribute("aria-pressed", String(savedOnly));
      update();
    });
    var count = document.getElementById("subject-count");
    var empty = document.getElementById("subject-empty");
    var update = function () {
      var q = search.value.trim().toLowerCase();
      var shown = 0;
      cards.forEach(function (c) {
        var match = (!q || c.getAttribute("data-subject").toLowerCase().indexOf(q) !== -1) && (!savedOnly || bookmarks.indexOf(c.getAttribute("data-subject")) !== -1);
        c.hidden = !match;
        if (match) shown++;
      });
      if (count) count.textContent = shown + (shown === 1 ? " subject" : " subjects");
      if (empty) empty.style.display = shown ? "none" : "block";
    };
    search.addEventListener("input", update);
    update();
  }

  // Site root, worked out from this script's own URL (assets/js/main.js),
  // so links resolve the same from /, /sgpa/ and with Vercel clean URLs.
  var scriptEl = document.currentScript || document.querySelector('script[src$="assets/js/main.js"]');
  var ROOT = new URL("../../", scriptEl ? scriptEl.src : location.href);

  // Subject and course cards get stable ids so search results can link to them.
  // Must match slug() in scripts/build-search-index.mjs.
  var subjectId = function (name) {
    return "subject-" + name.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  };
  document.querySelectorAll("[data-subject]").forEach(function (card) {
    if (!card.id) card.id = subjectId(card.getAttribute("data-subject"));
  });
  var flashTarget = function (id) {
    var el = id && document.getElementById(id);
    if (!el) return false;
    if (el.hidden) {
      // Clear the page filter so the card is visible.
      var filter = document.getElementById("subject-search");
      if (filter) { filter.value = ""; filter.dispatchEvent(new Event("input")); }
      el.hidden = false;
    }
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.remove("is-target");
    void el.offsetWidth;
    el.classList.add("is-target");
    return true;
  };
  if (location.hash.indexOf("#subject-") === 0) flashTarget(decodeURIComponent(location.hash.slice(1)));

  // Recently viewed (stored only in this browser)
  var RECENT_KEY = "scholarspace:recent";
  var readRecent = function () {
    try {
      var list = JSON.parse(localStorage.getItem(RECENT_KEY));
      return Array.isArray(list) ? list.filter(function (r) { return r && typeof r.url === "string" && typeof r.title === "string"; }) : [];
    } catch (_) { return []; }
  };
  var addRecent = function (item) {
    var entry = { url: item.url, title: item.title, context: item.context || "", kind: item.kind || "page", external: !!item.external };
    var list = readRecent().filter(function (r) { return r.url !== entry.url; });
    list.unshift(entry);
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, 6))); } catch (_) { /* Storage unavailable. */ }
  };
  var clearRecent = function () {
    try { localStorage.removeItem(RECENT_KEY); } catch (_) { /* Storage unavailable. */ }
  };
  // Root-relative path of the current page, e.g. "first.html" or "sgpa/B_tech_cse_1st_sem.html".
  var currentPath = function () {
    var p = decodeURIComponent(location.pathname).slice(decodeURIComponent(ROOT.pathname).length);
    if (p === "" || /\/$/.test(p)) p += "index.html";
    else if (!/\.html$/.test(p)) p += ".html";
    return p;
  };
  // Opening a study resource from a card counts as viewing that subject.
  document.addEventListener("click", function (e) {
    var link = e.target.closest && e.target.closest("a.res");
    if (!link) return;
    var card = link.closest("[data-subject]");
    if (!card) return;
    var resLabel = link.childNodes[1] ? link.childNodes[1].textContent.trim() : "Resource";
    var page = document.querySelector(".page-hero h1");
    addRecent({
      url: link.href, external: true, kind: "resource",
      title: card.getAttribute("data-subject") + " — " + resLabel,
      context: page ? page.textContent.trim() : ""
    });
  });
  // Visiting an SGPA calculator counts too.
  if (document.getElementById("sgpaForm")) {
    addRecent({
      url: currentPath(), kind: "calculator",
      title: "SGPA — " + document.title.replace(/\s*\|\s*ScholarSpace$/, "").replace(" · ", ", "),
      context: "SGPA Calculator"
    });
  }

  // Global search (Ctrl+K / Cmd+K / "/")
  var KIND = {
    page: { icon: "fa-file", label: "Page" },
    university: { icon: "fa-building-columns", label: "University" },
    department: { icon: "fa-gears", label: "Department" },
    year: { icon: "fa-layer-group", label: "Year" },
    subject: { icon: "fa-book", label: "Subject" },
    course: { icon: "fa-laptop-code", label: "Course" },
    calculator: { icon: "fa-calculator", label: "Calculator" },
    resource: { icon: "fa-arrow-up-right-from-square", label: "Link" }
  };
  var RES_ICON = { "Notes": "fa-file-lines", "PYQ Papers": "fa-file-circle-question", "Video Lecture": "fa-circle-play", "Practice Set": "fa-pen-ruler", "Start Course": "fa-rocket" };
  var SUGGESTIONS = ["dbms pyq", "maths 2", "java notes", "sgpa cse 3", "cgpa"];
  var iconFor = function (r) {
    var resLabel = r.kind === "resource" ? r.title.split(" — ").pop() : "";
    return RES_ICON[resLabel] || (KIND[r.kind] || KIND.page).icon;
  };

  var nav = document.querySelector(".site-header .nav");
  if (nav) {
    var isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
    var trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "search-trigger";
    trigger.setAttribute("aria-haspopup", "dialog");
    trigger.setAttribute("aria-expanded", "false");
    trigger.setAttribute("aria-keyshortcuts", isMac ? "Meta+K /" : "Control+K /");
    trigger.setAttribute("aria-label", "Search subjects, notes and calculators");
    trigger.innerHTML = '<i class="fas fa-magnifying-glass" aria-hidden="true"></i><span class="label">Search</span><kbd aria-hidden="true">' + (isMac ? "⌘" : "Ctrl") + " K</kbd>";
    nav.appendChild(trigger);

    var overlay = document.createElement("div");
    overlay.className = "search-overlay";
    overlay.hidden = true;
    overlay.innerHTML =
      '<div class="search-dialog" role="dialog" aria-modal="true" aria-labelledby="gs-title">' +
        '<h2 id="gs-title" class="visually-hidden">Search ScholarSpace</h2>' +
        '<div class="search-field">' +
          '<i class="fas fa-magnifying-glass" aria-hidden="true"></i>' +
          '<input id="gs-input" type="text" role="combobox" aria-autocomplete="list" aria-expanded="true" aria-controls="gs-results" ' +
            'aria-label="Search subjects, notes, PYQs and calculators" placeholder="Search subjects, PYQs, calculators…" autocomplete="off" spellcheck="false">' +
          '<button type="button" class="search-close" aria-label="Close search"><span aria-hidden="true">Esc</span></button>' +
        "</div>" +
        '<div class="search-body">' +
          '<div class="search-head"><p class="search-label" id="gs-label"></p><button type="button" class="search-clear" hidden>Clear</button></div>' +
          '<ul class="search-results" id="gs-results" role="listbox" aria-labelledby="gs-label"></ul>' +
          '<div class="search-empty" hidden></div>' +
        "</div>" +
        '<div class="search-foot" aria-hidden="true"><span><kbd>↑</kbd><kbd>↓</kbd> move</span><span><kbd>Enter</kbd> open</span><span><kbd>Esc</kbd> close</span></div>' +
        '<p class="visually-hidden" id="gs-status" aria-live="polite"></p>' +
      "</div>";
    document.body.appendChild(overlay);

    var dialog = overlay.querySelector(".search-dialog");
    var input = overlay.querySelector("#gs-input");
    var list = overlay.querySelector("#gs-results");
    var label = overlay.querySelector("#gs-label");
    var emptyBox = overlay.querySelector(".search-empty");
    var clearBtn = overlay.querySelector(".search-clear");
    var statusLive = overlay.querySelector("#gs-status");
    var items = [];
    var active = -1;
    var engine = null;
    var loading = null;
    var lastFocus = null;

    var loadScript = function (src) {
      return new Promise(function (resolve, reject) {
        var s = document.createElement("script");
        s.src = src;
        s.async = true;
        s.onload = resolve;
        s.onerror = function () { reject(new Error("Could not load " + src)); };
        document.head.appendChild(s);
      });
    };
    var loadEngine = function () {
      if (loading) return loading;
      loading = Promise.all([
        window.MiniSearch ? Promise.resolve() : loadScript("https://cdn.jsdelivr.net/npm/minisearch@7.1.0/dist/umd/index.min.js"),
        fetch(new URL("assets/data/search-index.json", ROOT)).then(function (r) {
          if (!r.ok) throw new Error("Search index missing");
          return r.json();
        })
      ]).then(function (res) {
        var weight = { subject: 1.35, calculator: 1.2, page: 1.1, course: 1.1, resource: 0.95 };
        engine = new window.MiniSearch({
          fields: ["title", "keywords", "subject", "year", "context", "resources", "text"],
          storeFields: ["kind", "title", "context", "url", "external", "soon"],
          searchOptions: {
            boost: { title: 3, keywords: 3, subject: 2, year: 1.5, context: 1, resources: 0.4, text: 0.6 },
            prefix: true,
            // Allow 1 typo in 4–5 letter words and 2 in longer ones ("pyhton", "databse").
            fuzzy: function (term) { return term.length < 4 ? false : term.length < 6 ? 1 : 2; },
            boostDocument: function (id, term, stored) {
              return (weight[stored && stored.kind] || 1) * (stored && stored.soon ? 0.75 : 1);
            }
          }
        });
        engine.addAll(res[1].docs);
        return engine;
      });
      loading.catch(function () { loading = null; });
      return loading;
    };

    var escapeRe = function (s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); };
    // Wrap matched words in <mark>, building DOM nodes (never innerHTML) for safety.
    var highlight = function (el, str, terms) {
      el.textContent = "";
      if (!terms.length) { el.textContent = str; return; }
      var re = new RegExp("(" + terms.map(escapeRe).sort(function (a, b) { return b.length - a.length; }).join("|") + ")", "ig");
      var last = 0;
      str.replace(re, function (m, _g, idx) {
        if (idx > last) el.appendChild(document.createTextNode(str.slice(last, idx)));
        var mark = document.createElement("mark");
        mark.textContent = m;
        el.appendChild(mark);
        last = idx + m.length;
        return m;
      });
      if (last < str.length) el.appendChild(document.createTextNode(str.slice(last)));
    };

    var setActive = function (i) {
      var opts = list.querySelectorAll('[role="option"]');
      if (!opts.length) { active = -1; input.removeAttribute("aria-activedescendant"); return; }
      active = (i + opts.length) % opts.length;
      opts.forEach(function (o, n) { o.setAttribute("aria-selected", String(n === active)); });
      input.setAttribute("aria-activedescendant", opts[active].id);
      opts[active].scrollIntoView({ block: "nearest" });
    };

    var render = function (results, terms, opts) {
      opts = opts || {};
      list.textContent = "";
      items = results;
      results.forEach(function (r, i) {
        var li = document.createElement("li");
        li.id = "gs-opt-" + i;
        li.setAttribute("role", "option");
        li.setAttribute("aria-selected", "false");
        li.className = "search-item" + (r.soon ? " is-soon" : "");
        var kind = KIND[r.kind] || KIND.page;
        var ico = document.createElement("span");
        ico.className = "ico";
        ico.innerHTML = '<i class="fas ' + (opts.icon || iconFor(r)) + '" aria-hidden="true"></i>';
        var txt = document.createElement("span");
        txt.className = "txt";
        var t = document.createElement("strong");
        highlight(t, r.title, terms);
        var c = document.createElement("span");
        highlight(c, r.context || "", terms);
        txt.appendChild(t);
        if (c.textContent) txt.appendChild(c);
        var tag = document.createElement("span");
        tag.className = "tag";
        if (opts.tag) tag.textContent = opts.tag;
        else if (r.soon) tag.textContent = "Coming soon";
        else if (r.external) tag.innerHTML = '<i class="fas fa-arrow-up-right-from-square" aria-hidden="true"></i><span class="visually-hidden">Opens in a new tab</span>';
        else tag.textContent = kind.label;
        li.appendChild(ico);
        li.appendChild(txt);
        li.appendChild(tag);
        li.addEventListener("mousemove", function () { if (active !== i) setActive(i); });
        li.addEventListener("click", function () { choose(i); });
        list.appendChild(li);
      });
      setActive(0);
    };

    var showEmptyQuery = function () {
      var recent = readRecent();
      emptyBox.hidden = true;
      statusLive.textContent = "";
      if (recent.length) {
        label.textContent = "Recently viewed";
        clearBtn.hidden = false;
        render(recent, []);
      } else {
        clearBtn.hidden = true;
        label.textContent = "Try searching for";
        render(SUGGESTIONS.map(function (q) { return { title: q, suggestion: q }; }), [], { icon: "fa-magnifying-glass", tag: "Try" });
      }
    };

    var runSearch = function () {
      var q = input.value.trim();
      if (!q) return showEmptyQuery();
      clearBtn.hidden = true;
      if (!engine) {
        label.textContent = "Loading search…";
        list.textContent = "";
        emptyBox.hidden = true;
        loadEngine().then(runSearch, function () {
          label.textContent = "";
          emptyBox.hidden = false;
          emptyBox.textContent = "Search couldn't load. Check your connection and try again.";
        });
        return;
      }
      var results = engine.search(q, { combineWith: "AND" });
      if (!results.length) results = engine.search(q, { combineWith: "OR" });
      results = results.slice(0, 12);
      var terms = [];
      results.forEach(function (r) { r.terms.forEach(function (t) { if (terms.indexOf(t) === -1) terms.push(t); }); });
      if (!results.length) {
        list.textContent = "";
        items = [];
        active = -1;
        input.removeAttribute("aria-activedescendant");
        label.textContent = "";
        emptyBox.hidden = false;
        emptyBox.innerHTML = '<i class="fas fa-face-frown-open" aria-hidden="true"></i><strong></strong><span>Try a subject name, a short form like “dbms”, or words like “pyq” or “notes”.</span>';
        emptyBox.querySelector("strong").textContent = "No results for “" + q + "”";
        statusLive.textContent = "No results";
        return;
      }
      emptyBox.hidden = true;
      label.textContent = results.length === 1 ? "1 result" : results.length + " results";
      statusLive.textContent = label.textContent;
      render(results, terms);
    };

    var samePath = function (a, b) {
      var norm = function (p) { return p.replace(/\.html$/, "").replace(/\/index$/, "/"); };
      return norm(a) === norm(b);
    };
    var choose = function (i) {
      var r = items[i];
      if (!r) return;
      if (r.suggestion) {
        input.value = r.suggestion;
        runSearch();
        input.focus();
        return;
      }
      addRecent(r);
      if (r.external) {
        window.open(r.url, "_blank", "noopener");
        close();
        return;
      }
      var target = new URL(r.url, ROOT);
      var hashId = target.hash ? decodeURIComponent(target.hash.slice(1)) : "";
      close(true);
      if (samePath(target.pathname, location.pathname) && hashId && flashTarget(hashId)) {
        history.replaceState(null, "", "#" + hashId);
        return;
      }
      location.href = target.href;
    };

    var open = function () {
      if (!overlay.hidden) return;
      lastFocus = document.activeElement;
      if (menu && menu.classList.contains("is-open") && toggle) toggle.click();
      overlay.hidden = false;
      document.documentElement.classList.add("search-open");
      trigger.setAttribute("aria-expanded", "true");
      input.value = "";
      showEmptyQuery();
      input.focus();
      loadEngine().catch(function () { /* Reported when the user searches. */ });
    };
    var close = function (skipFocus) {
      if (overlay.hidden) return;
      overlay.hidden = true;
      document.documentElement.classList.remove("search-open");
      trigger.setAttribute("aria-expanded", "false");
      if (skipFocus !== true && lastFocus && lastFocus.focus) lastFocus.focus();
    };

    trigger.addEventListener("click", open);
    trigger.addEventListener("pointerenter", function () { loadEngine().catch(function () {}); }, { once: true });
    overlay.querySelector(".search-close").addEventListener("click", function () { close(); });
    overlay.addEventListener("mousedown", function (e) { if (e.target === overlay) close(); });
    clearBtn.addEventListener("click", function () { clearRecent(); showEmptyQuery(); input.focus(); });
    input.addEventListener("input", runSearch);
    input.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown") { e.preventDefault(); setActive(active + 1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setActive(active - 1); }
      else if (e.key === "Enter") { e.preventDefault(); if (active > -1) choose(active); }
    });
    dialog.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(); return; }
      if (e.key !== "Tab") return;
      // Keep focus inside the dialog.
      var f = Array.prototype.filter.call(dialog.querySelectorAll("input, button"), function (el) { return !el.hidden && el.offsetParent !== null; });
      if (!f.length) return;
      var firstEl = f[0], lastEl = f[f.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) { e.preventDefault(); lastEl.focus(); }
      else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); firstEl.focus(); }
    });
    document.addEventListener("keydown", function (e) {
      var typing = e.target.closest && e.target.closest("input, textarea, select, [contenteditable]");
      if ((e.key === "k" || e.key === "K") && (e.ctrlKey || e.metaKey) && !e.altKey) {
        e.preventDefault();
        if (overlay.hidden) open(); else close();
      } else if (e.key === "/" && !typing && !e.ctrlKey && !e.metaKey && !e.altKey && overlay.hidden) {
        e.preventDefault();
        open();
      }
    });
    // Test hook: ?search=<query> opens search pre-filled (used for screenshots).
    var preset = new URLSearchParams(location.search).get("search");
    if (preset !== null) {
      open();
      input.value = preset;
      runSearch();
    }
  }

  // Home page: "Recently viewed" strip
  var recentSection = document.getElementById("recent");
  if (recentSection) {
    var recentList = document.getElementById("recent-list");
    var drawRecent = function () {
      var recent = readRecent();
      recentSection.hidden = !recent.length;
      recentList.textContent = "";
      recent.forEach(function (r) {
        var li = document.createElement("li");
        var a = document.createElement("a");
        a.className = "recent-chip";
        a.href = r.external ? r.url : new URL(r.url, ROOT).href;
        if (r.external) { a.target = "_blank"; a.rel = "noopener"; }
        a.innerHTML = '<i class="fas ' + iconFor(r) + '" aria-hidden="true"></i><span></span>';
        a.querySelector("span").textContent = r.title;
        if (r.external) a.insertAdjacentHTML("beforeend", '<span class="visually-hidden"> (opens in a new tab)</span>');
        li.appendChild(a);
        recentList.appendChild(li);
      });
    };
    var clearRecentBtn = document.getElementById("recent-clear");
    if (clearRecentBtn) clearRecentBtn.addEventListener("click", function () { clearRecent(); drawRecent(); });
    drawRecent();
  }

  // Feedback form: static hosting has no backend, so compose an email
  var form = document.getElementById("feedback-form");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!form.reportValidity()) return;
      var to = form.getAttribute("data-mailto");
      var name = form.elements.name.value.trim();
      var email = form.elements.email.value.trim();
      var msg = form.elements.feedback.value.trim();
      var subject = "ScholarSpace feedback from " + name;
      var body = msg + "\n\n— " + name + " (" + email + ")";
      window.location.href =
        "mailto:" + to + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
      var status = document.getElementById("feedback-status");
      if (status) status.hidden = false;
    });
  }
})();
