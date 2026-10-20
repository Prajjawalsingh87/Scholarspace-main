// ScholarSpace CGPA calculator: credit-weighted average of semester SGPAs.
(function () {
  "use strict";

  var form = document.getElementById("cgpaForm");
  if (!form) return;

  // Total credits per semester on the BBD B.Tech SGPA pages (same for CSE and CS-AI).
  var DEFAULT_CREDITS = { 1: 26, 2: 26, 3: 24, 4: 24 };
  var STORE_KEY = "scholarspace:cgpa";
  var RESULTS_KEY = "scholarspace:sgpa-results";

  var rowsEl = document.getElementById("cgpa-rows");
  var scoreEl = document.getElementById("cgpa-score");
  var statusEl = document.getElementById("cgpa-status");
  var countEl = document.getElementById("cgpa-count");
  var creditsEl = document.getElementById("cgpa-credits");
  var errorBox = document.getElementById("cgpa-error");
  var savedBox = document.getElementById("cgpa-saved");

  var load = function (key) {
    try { return JSON.parse(localStorage.getItem(key)); } catch (_) { return null; }
  };
  var save = function (key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) { /* Storage unavailable. */ }
  };

  var ordinal = function (n) {
    var s = ["th", "st", "nd", "rd"], v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  // Each row keeps its own semester number, so removing one never renumbers the rest.
  var semOf = function (row) { return Number(row.getAttribute("data-sem")); };
  var nextSem = function () {
    var max = 0;
    Array.prototype.forEach.call(rowsEl.children, function (row) { max = Math.max(max, semOf(row)); });
    return max + 1;
  };
  var setNote = function (row, note) {
    var meta = row.querySelector(".meta");
    if (!note) { if (meta) meta.remove(); return; }
    if (!meta) {
      meta = document.createElement("span");
      meta.className = "meta";
      row.querySelector(".name").appendChild(meta);
    }
    meta.textContent = note;
  };

  var addRow = function (sem, sgpa, credits, note) {
    sem = sem || nextSem();
    var name = ordinal(sem) + " semester";
    var row = document.createElement("div");
    row.className = "cgpa-row";
    row.setAttribute("data-sem", String(sem));
    row.innerHTML =
      '<span class="name"></span>' +
      '<label class="visually-hidden" for="cgpa-sgpa-' + sem + '"></label>' +
      '<input class="input sgpa" type="number" inputmode="decimal" min="0" max="10" step="0.01" placeholder="SGPA" id="cgpa-sgpa-' + sem + '">' +
      '<label class="visually-hidden" for="cgpa-cred-' + sem + '"></label>' +
      '<input class="input cred" type="number" inputmode="numeric" min="1" max="60" step="1" placeholder="Credits" id="cgpa-cred-' + sem + '">' +
      '<button type="button" class="icon-btn"><i class="fas fa-trash-can" aria-hidden="true"></i></button>';
    row.querySelector(".name").textContent = name;
    var labels = row.querySelectorAll("label");
    labels[0].textContent = "SGPA, " + name;
    labels[1].textContent = "Credits, " + name;
    row.querySelector("button").setAttribute("aria-label", "Remove " + name);
    row.querySelector(".sgpa").value = sgpa == null ? "" : sgpa;
    row.querySelector(".cred").value = credits == null ? (DEFAULT_CREDITS[sem] || "") : credits;
    setNote(row, note);
    row.querySelector("button").addEventListener("click", function () {
      var next = row.nextElementSibling || row.previousElementSibling;
      row.remove();
      update();
      (next ? next.querySelector(".sgpa") : document.getElementById("cgpa-add")).focus();
    });
    // Keep rows in semester order.
    var after = Array.prototype.find.call(rowsEl.children, function (r) { return semOf(r) > sem; });
    rowsEl.insertBefore(row, after || null);
    return row;
  };
  var rowFor = function (sem) {
    return Array.prototype.find.call(rowsEl.children, function (r) { return semOf(r) === sem; });
  };

  var update = function () {
    errorBox.hidden = true;
    form.querySelectorAll("[aria-invalid]").forEach(function (el) { el.removeAttribute("aria-invalid"); });
    var points = 0, credits = 0, count = 0, error = null;
    var stored = [];
    Array.prototype.forEach.call(rowsEl.children, function (row) {
      var sIn = row.querySelector(".sgpa"), cIn = row.querySelector(".cred");
      var meta = row.querySelector(".meta");
      stored.push({ sem: semOf(row), sgpa: sIn.value, credits: cIn.value, note: meta ? meta.textContent : "" });
      if (error || sIn.value.trim() === "") return;
      var s = Number(sIn.value), c = Number(cIn.value);
      var name = ordinal(semOf(row)) + " semester";
      if (!(s >= 0 && s <= 10)) { error = ["SGPA for the " + name + " must be between 0 and 10.", sIn]; return; }
      if (cIn.value.trim() === "" || !(c > 0)) { error = ["Enter the credits for the " + name + ".", cIn]; return; }
      points += s * c;
      credits += c;
      count++;
    });
    save(STORE_KEY, stored);
    if (error) {
      errorBox.innerHTML = '<i class="fas fa-circle-exclamation" aria-hidden="true"></i><span></span>';
      errorBox.querySelector("span").textContent = error[0];
      errorBox.hidden = false;
      error[1].setAttribute("aria-invalid", "true");
      scoreEl.textContent = "—";
      statusEl.textContent = "Check your entries";
      countEl.textContent = creditsEl.textContent = "—";
      return;
    }
    if (!count) {
      scoreEl.textContent = "—";
      statusEl.textContent = "Enter at least one SGPA";
      countEl.textContent = creditsEl.textContent = "—";
      return;
    }
    scoreEl.textContent = (points / credits).toFixed(2);
    statusEl.textContent = "Your CGPA";
    countEl.textContent = String(count);
    creditsEl.textContent = String(credits);
  };

  // SGPA results saved by sgpa.js, keyed like "CSE-3".
  var savedResults = function () {
    var all = load(RESULTS_KEY);
    if (!all || typeof all !== "object") return [];
    var bySem = {};
    Object.keys(all).forEach(function (k) {
      var r = all[k];
      if (!r || !(r.sem >= 1) || isNaN(Number(r.sgpa))) return;
      if (!bySem[r.sem] || (r.at || 0) > (bySem[r.sem].at || 0)) bySem[r.sem] = r;
    });
    return Object.keys(bySem).map(function (k) { return bySem[k]; }).sort(function (a, b) { return a.sem - b.sem; });
  };

  var fillFromResults = function () {
    savedResults().forEach(function (r) {
      var row = rowFor(r.sem) || addRow(r.sem);
      row.querySelector(".sgpa").value = r.sgpa;
      row.querySelector(".cred").value = r.credits;
      setNote(row, "From your " + r.course + " SGPA result");
    });
    update();
  };

  // Restore the last session, or start with four semesters.
  var previous = load(STORE_KEY);
  if (Array.isArray(previous) && previous.length) {
    previous.slice(0, 12).forEach(function (r) {
      if (r && typeof r === "object") addRow(Number(r.sem) >= 1 && Number(r.sem) <= 12 && !rowFor(Number(r.sem)) ? Number(r.sem) : null, r.sgpa, r.credits, r.note);
    });
  } else {
    for (var i = 0; i < 4; i++) addRow();
  }
  savedBox.hidden = !savedResults().length;

  form.addEventListener("input", update);
  form.addEventListener("submit", function (e) { e.preventDefault(); update(); });
  form.addEventListener("reset", function (e) {
    e.preventDefault();
    rowsEl.textContent = "";
    for (var i = 0; i < 4; i++) addRow();
    update();
    rowsEl.querySelector(".sgpa").focus();
  });
  document.getElementById("cgpa-add").addEventListener("click", function () {
    if (nextSem() > 12) return;
    addRow().querySelector(".sgpa").focus();
    update();
  });
  document.getElementById("cgpa-fill").addEventListener("click", fillFromResults);
  update();
})();
