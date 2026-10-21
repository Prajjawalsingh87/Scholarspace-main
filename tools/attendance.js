// ScholarSpace attendance tracker. Data: localStorage "scholarspace:attendance".
(function () {
  "use strict";
  var T = window.ScholarTools;
  var KEY = "scholarspace:attendance";
  var list = document.getElementById("att-list");
  if (!T || !list) return;

  var addForm = document.getElementById("att-add");
  var errorBox = document.getElementById("att-error");
  var thresholdIn = document.getElementById("att-threshold");
  var emptyEl = document.getElementById("att-empty");
  var live = document.getElementById("att-live");

  var state = { threshold: 75, subjects: [] };
  try {
    var saved = JSON.parse(localStorage.getItem(KEY));
    if (saved && Array.isArray(saved.subjects)) {
      state.threshold = saved.threshold > 0 && saved.threshold <= 100 ? Number(saved.threshold) : 75;
      state.subjects = saved.subjects.filter(function (s) {
        return s && typeof s.name === "string" && s.attended >= 0 && s.total >= s.attended && Math.floor(s.total) === s.total && Math.floor(s.attended) === s.attended;
      }).map(function (s) { return { id: String(s.id || Math.random().toString(36).slice(2)), name: s.name.slice(0, 60), attended: s.attended, total: s.total }; });
    }
  } catch (_) { /* Storage unavailable or corrupt: start empty. */ }
  var persist = function () {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (_) { /* Storage unavailable. */ }
  };

  var plural = function (n, word) { return n + " " + word + (n === 1 ? "" : "es"); };
  var fmtPct = function (p) { return p == null ? "—" : (Math.round(p * 10) / 10) + "%"; };
  var tone = function (r) {
    if (r.percent == null) return "idle";
    if (!r.meets) return "bad";
    return r.canSkip === 0 ? "warn" : "ok";
  };
  var ICON = { ok: "fa-circle-check", warn: "fa-triangle-exclamation", bad: "fa-circle-exclamation", idle: "fa-circle-info" };
  var message = function (r) {
    if (r.percent == null) return "No classes yet.";
    if (!r.meets) {
      return r.mustAttend === Infinity
        ? "You can no longer reach " + state.threshold + "% this term."
        : "Attend the next " + plural(r.mustAttend, "class") + " in a row to reach " + state.threshold + "%.";
    }
    if (r.canSkip === 0) return "Right at the limit. Don't skip the next class.";
    return "You can skip " + plural(r.canSkip, "more class") + " and stay at " + state.threshold + "% or above.";
  };
  var paintStatus = function (el, r) {
    var t = tone(r);
    el.className = "status is-" + t;
    el.innerHTML = '<i class="fas ' + ICON[t] + '" aria-hidden="true"></i><span></span>';
    el.querySelector("span").textContent = message(r);
  };
  var paintMeter = function (el, r) {
    var t = tone(r);
    el.className = "meter" + (t === "idle" ? "" : " is-" + t);
    el.querySelector("span").style.width = (r.percent == null ? 0 : Math.min(100, r.percent)) + "%";
    el.querySelector(".mark").style.left = "calc(" + state.threshold + "% - 1px)";
  };

  var buildCard = function (s) {
    var li = document.createElement("li");
    li.className = "att-card";
    li.setAttribute("data-id", s.id);
    var uid = "att-" + s.id;
    li.innerHTML =
      '<header><h3 id="' + uid + '-name"></h3>' +
      '<button type="button" class="icon-btn" data-act="remove"><i class="fas fa-trash-can" aria-hidden="true"></i></button></header>' +
      '<div class="att-pct"><span class="pct"></span><small class="frac"></small></div>' +
      '<div class="meter" aria-hidden="true"><span></span><i class="mark"></i></div>' +
      '<p class="status"></p>' +
      '<div class="att-counts">' +
      '<label>Attended<input class="input" type="number" inputmode="numeric" min="0" step="1" data-field="attended"></label>' +
      '<label>Total<input class="input" type="number" inputmode="numeric" min="0" step="1" data-field="total"></label>' +
      '</div>' +
      '<div class="att-actions">' +
      '<button type="button" class="btn btn-present" data-act="present"><i class="fas fa-check" aria-hidden="true"></i> Present</button>' +
      '<button type="button" class="btn btn-absent" data-act="absent"><i class="fas fa-xmark" aria-hidden="true"></i> Absent</button>' +
      '</div>';
    li.querySelector("h3").textContent = s.name;
    li.querySelector('[data-act="remove"]').setAttribute("aria-label", "Remove " + s.name);
    li.querySelector('[data-act="present"]').setAttribute("aria-label", "Mark present in " + s.name);
    li.querySelector('[data-act="absent"]').setAttribute("aria-label", "Mark absent in " + s.name);
    li.querySelector('[data-field="attended"]').setAttribute("aria-label", "Classes attended, " + s.name);
    li.querySelector('[data-field="total"]').setAttribute("aria-label", "Total classes, " + s.name);
    li.setAttribute("aria-labelledby", uid + "-name");
    return li;
  };

  var paintCard = function (li, s, keepInputs) {
    var r = T.attendance(s.attended, s.total, state.threshold);
    li.querySelector(".pct").textContent = fmtPct(r.percent);
    li.querySelector(".frac").textContent = s.attended + " / " + s.total;
    li.classList.toggle("is-bad", r.percent != null && !r.meets);
    paintMeter(li.querySelector(".meter"), r);
    paintStatus(li.querySelector(".status"), r);
    if (!keepInputs) {
      li.querySelector('[data-field="attended"]').value = s.attended;
      li.querySelector('[data-field="total"]').value = s.total;
    }
    return r;
  };

  var render = function () {
    // Reuse existing cards so focus is kept after a button press.
    var cards = {};
    Array.prototype.forEach.call(list.children, function (li) { cards[li.getAttribute("data-id")] = li; });
    Object.keys(cards).forEach(function (id) { if (!find(id)) { cards[id].remove(); delete cards[id]; } });
    state.subjects.forEach(function (s, i) {
      var li = cards[s.id] || buildCard(s);
      // Only move a card when it is out of place: moving it would drop keyboard focus.
      if (list.children[i] !== li) list.insertBefore(li, list.children[i] || null);
      paintCard(li, s);
    });
    emptyEl.hidden = state.subjects.length > 0;
    renderOverall();
  };

  var renderOverall = function () {
    var r = T.overallAttendance(state.subjects, state.threshold);
    var score = document.getElementById("att-overall");
    score.textContent = fmtPct(r.percent);
    score.className = "sgpa-score" + (r.percent == null ? "" : " is-" + tone(r));
    paintMeter(document.getElementById("att-overall-meter"), r);
    var status = document.getElementById("att-overall-status");
    if (!state.subjects.length) {
      status.className = "status is-idle";
      status.textContent = "Add a subject to get started.";
    } else {
      paintStatus(status, r);
    }
    var below = state.subjects.filter(function (s) { return s.total > 0 && !T.attendance(s.attended, s.total, state.threshold).meets; }).length;
    document.getElementById("att-sum-attended").textContent = state.subjects.length ? String(r.attended) : "—";
    document.getElementById("att-sum-total").textContent = state.subjects.length ? String(r.total) : "—";
    document.getElementById("att-sum-below").textContent = state.subjects.length ? String(below) : "—";
    document.getElementById("att-reset").hidden = !state.subjects.length;
  };

  var find = function (id) { return state.subjects.filter(function (s) { return s.id === id; })[0]; };
  var announce = function (s) {
    var r = T.attendance(s.attended, s.total, state.threshold);
    live.textContent = s.name + ": " + s.attended + " of " + s.total + ", " + fmtPct(r.percent) + ". " + message(r);
  };

  list.addEventListener("click", function (e) {
    var btn = e.target.closest("button[data-act]");
    if (!btn) return;
    var li = btn.closest(".att-card");
    var s = find(li.getAttribute("data-id"));
    if (!s) return;
    var act = btn.getAttribute("data-act");
    if (act === "remove") {
      if (!window.confirm("Remove " + s.name + " and its attendance?")) return;
      var next = li.nextElementSibling || li.previousElementSibling;
      state.subjects = state.subjects.filter(function (x) { return x !== s; });
      persist();
      render();
      live.textContent = s.name + " removed.";
      (next ? next.querySelector('[data-act="present"]') : document.getElementById("att-name")).focus();
      return;
    }
    if (act === "present") s.attended++;
    s.total++;
    persist();
    render();
    announce(s);
  });

  list.addEventListener("input", function (e) {
    var input = e.target.closest("input[data-field]");
    if (!input) return;
    var li = input.closest(".att-card");
    var s = find(li.getAttribute("data-id"));
    var a = li.querySelector('[data-field="attended"]'), t = li.querySelector('[data-field="total"]');
    var av = Number(a.value), tv = Number(t.value);
    var ok = a.value !== "" && t.value !== "" && Math.floor(av) === av && Math.floor(tv) === tv && av >= 0 && tv >= av;
    a.toggleAttribute("aria-invalid", !ok);
    t.toggleAttribute("aria-invalid", !ok);
    if (!ok) return;
    s.attended = av;
    s.total = tv;
    persist();
    paintCard(li, s, true);
    renderOverall();
  });
  // Put back the stored numbers if the user leaves a card with invalid input.
  list.addEventListener("focusout", function (e) {
    var input = e.target.closest("input[data-field]");
    if (input && input.hasAttribute("aria-invalid")) {
      var li = input.closest(".att-card");
      input.removeAttribute("aria-invalid");
      li.querySelectorAll("[aria-invalid]").forEach(function (el) { el.removeAttribute("aria-invalid"); });
      paintCard(li, find(li.getAttribute("data-id")));
    }
  });

  var showError = function (msg, field) {
    errorBox.innerHTML = '<i class="fas fa-circle-exclamation" aria-hidden="true"></i><span></span>';
    errorBox.querySelector("span").textContent = msg;
    errorBox.hidden = false;
    if (field) { field.setAttribute("aria-invalid", "true"); field.focus(); }
  };
  addForm.addEventListener("submit", function (e) {
    e.preventDefault();
    errorBox.hidden = true;
    addForm.querySelectorAll("[aria-invalid]").forEach(function (el) { el.removeAttribute("aria-invalid"); });
    var nameIn = addForm.elements.name, aIn = addForm.elements.attended, tIn = addForm.elements.total;
    var name = nameIn.value.trim().replace(/\s+/g, " ");
    var a = aIn.value.trim() === "" ? 0 : Number(aIn.value);
    var t = tIn.value.trim() === "" ? 0 : Number(tIn.value);
    if (!name) return showError("Enter a subject name.", nameIn);
    if (state.subjects.some(function (s) { return s.name.toLowerCase() === name.toLowerCase(); })) return showError(name + " is already in your list.", nameIn);
    if (!(a >= 0) || Math.floor(a) !== a) return showError("Attended classes must be a whole number, 0 or more.", aIn);
    if (!(t >= 0) || Math.floor(t) !== t) return showError("Total classes must be a whole number, 0 or more.", tIn);
    if (a > t) return showError("Attended classes can't be more than the total.", aIn);
    var s = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name: name.slice(0, 60), attended: a, total: t };
    state.subjects.push(s);
    persist();
    render();
    announce(s);
    addForm.reset();
    nameIn.focus();
  });

  thresholdIn.value = state.threshold;
  thresholdIn.addEventListener("input", function () {
    var v = Number(thresholdIn.value);
    var ok = thresholdIn.value !== "" && v >= 1 && v <= 100;
    thresholdIn.toggleAttribute("aria-invalid", !ok);
    if (!ok) return;
    state.threshold = v;
    persist();
    render();
  });
  thresholdIn.addEventListener("blur", function () {
    thresholdIn.value = state.threshold;
    thresholdIn.removeAttribute("aria-invalid");
  });

  document.getElementById("att-reset").addEventListener("click", function () {
    if (!window.confirm("Remove all subjects and their attendance?")) return;
    state.subjects = [];
    persist();
    render();
    document.getElementById("att-name").focus();
  });

  render();
})();
