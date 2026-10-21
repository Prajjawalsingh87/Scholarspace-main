// ScholarSpace "What do I need?" calculator. Data: localStorage "scholarspace:target".
(function () {
  "use strict";
  var T = window.ScholarTools;
  var form = document.getElementById("target-form");
  if (!T || !form) return;

  var KEY = "scholarspace:target";
  var CGPA_KEY = "scholarspace:cgpa";
  // Total credits per semester on the BBD B.Tech SGPA pages (same as sgpa/cgpa.js).
  var DEFAULT_CREDITS = { 1: 26, 2: 26, 3: 24, 4: 24 };
  var FIELDS = ["cgpa", "done", "target", "next"];
  var $ = function (id) { return document.getElementById(id); };
  var errorBox = $("target-error");
  var score = $("target-score");

  var load = function (key) { try { return JSON.parse(localStorage.getItem(key)); } catch (_) { return null; } };
  var save = function () {
    var data = {};
    FIELDS.forEach(function (f) { data[f] = form.elements[f].value; });
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (_) { /* Storage unavailable. */ }
  };
  var fmt = function (n) { return (Math.round(n * 100) / 100).toFixed(2); };

  var setMessage = function (tone, icon, text) {
    var el = $("target-message");
    el.className = "status is-" + tone;
    el.innerHTML = '<i class="fas ' + icon + '" aria-hidden="true"></i><span></span>';
    el.querySelector("span").textContent = text;
  };
  var blank = function (status) {
    $("target-status").textContent = status;
    score.textContent = "—";
    score.className = "result-big";
    setMessage("idle", "fa-circle-info", "The SGPA you need appears here.");
    $("target-best").textContent = $("target-worst").textContent = $("target-total").textContent = "—";
  };

  var update = function () {
    save();
    errorBox.hidden = true;
    form.querySelectorAll("[aria-invalid]").forEach(function (el) { el.removeAttribute("aria-invalid"); });
    var v = {}, missing = false;
    FIELDS.forEach(function (f) {
      var raw = form.elements[f].value.trim();
      if (raw === "") missing = true;
      v[f] = Number(raw);
    });
    var bad = function (f, msg) {
      errorBox.innerHTML = '<i class="fas fa-circle-exclamation" aria-hidden="true"></i><span></span>';
      errorBox.querySelector("span").textContent = msg;
      errorBox.hidden = false;
      form.elements[f].setAttribute("aria-invalid", "true");
      blank("Check your entries");
    };
    var filled = function (f) { return form.elements[f].value.trim() !== ""; };
    if (filled("cgpa") && !(v.cgpa >= 0 && v.cgpa <= 10)) return bad("cgpa", "Current CGPA must be between 0 and 10.");
    if (filled("done") && !(v.done >= 0)) return bad("done", "Credits completed must be 0 or more.");
    if (filled("target") && !(v.target >= 0 && v.target <= 10)) return bad("target", "Target CGPA must be between 0 and 10.");
    if (filled("next") && !(v.next > 0)) return bad("next", "Next semester credits must be more than 0.");
    if (filled("done") && v.done === 0 && filled("cgpa") && v.cgpa > 0) return bad("done", "Enter the credits behind your current CGPA (more than 0).");
    if (missing) return blank("Fill in all four numbers");

    var r = T.requiredSgpa(v.cgpa, v.done, v.target, v.next);
    var need = T.ceil2(r.required);
    $("target-best").textContent = fmt(r.best);
    $("target-worst").textContent = fmt(r.worst);
    $("target-total").textContent = String(v.done + v.next);
    if (!r.possible) {
      $("target-status").textContent = "Not possible next semester";
      score.textContent = fmt(need);
      score.className = "result-big is-bad";
      setMessage("bad", "fa-circle-exclamation",
        "You would need an SGPA of " + fmt(need) + ", which is above the maximum of 10. " +
        "The highest CGPA you can reach next semester is " + fmt(r.best) + ". Aim for that, or plan to reach " + fmt(v.target) + " over more semesters.");
    } else if (r.alreadyThere) {
      $("target-status").textContent = "You're already there";
      score.textContent = "Any";
      score.className = "result-big is-ok";
      setMessage("ok", "fa-circle-check", "Even an SGPA of 0 keeps your CGPA at " + fmt(v.target) + " or above. Keep it up anyway!");
    } else {
      $("target-status").textContent = "SGPA you need next semester";
      score.textContent = fmt(need);
      score.className = "result-big" + (need > 9.5 ? " is-bad" : need <= v.cgpa ? " is-ok" : "");
      setMessage(need > 9.5 ? "warn" : "ok", need > 9.5 ? "fa-triangle-exclamation" : "fa-circle-check",
        "Score at least " + fmt(need) + " SGPA over " + v.next + " credits to reach a CGPA of " + fmt(v.target) + "." +
        (need > 9.5 ? " That's very close to the maximum, so every subject counts." : ""));
    }
  };

  // Prefill offer from the CGPA calculator's saved rows.
  var fromCgpa = T.cgpaFromRows(load(CGPA_KEY));
  if (fromCgpa) {
    $("target-saved").hidden = false;
    $("target-saved-summary").textContent = "CGPA " + fmt(fromCgpa.cgpa) + " over " + fromCgpa.credits + " credits";
    $("target-fill").addEventListener("click", function () {
      form.elements.cgpa.value = fmt(fromCgpa.cgpa);
      form.elements.done.value = fromCgpa.credits;
      var nextSemCredits = DEFAULT_CREDITS[fromCgpa.lastSem + 1];
      if (nextSemCredits && !form.elements.next.value) form.elements.next.value = nextSemCredits;
      update();
      (form.elements.target.value ? form.elements.next : form.elements.target).focus();
    });
  }

  var previous = load(KEY);
  if (previous && typeof previous === "object") {
    FIELDS.forEach(function (f) { if (typeof previous[f] === "string") form.elements[f].value = previous[f]; });
  }
  form.addEventListener("input", update);
  form.addEventListener("submit", function (e) { e.preventDefault(); update(); });
  form.addEventListener("reset", function (e) {
    e.preventDefault();
    FIELDS.forEach(function (f) { form.elements[f].value = ""; });
    update();
    form.elements.cgpa.focus();
  });
  update();
})();
