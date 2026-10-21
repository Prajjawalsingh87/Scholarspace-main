// ScholarSpace exam countdown. Data: localStorage "scholarspace:exams".
(function () {
  "use strict";
  var T = window.ScholarTools;
  var form = document.getElementById("exam-add");
  if (!T || !form) return;

  var KEY = "scholarspace:exams";
  var $ = function (id) { return document.getElementById(id); };
  var upList = $("exam-upcoming"), pastList = $("exam-past");
  var errorBox = $("exam-error");
  var DAY = 864e5;

  var exams = [];
  try {
    var saved = JSON.parse(localStorage.getItem(KEY));
    if (Array.isArray(saved)) {
      exams = saved.filter(function (e) { return e && typeof e.subject === "string" && T.parseLocal(e.when); })
        .map(function (e) { return { id: String(e.id), subject: e.subject.slice(0, 80), when: e.when, note: typeof e.note === "string" ? e.note.slice(0, 80) : "" }; });
    }
  } catch (_) { /* Storage unavailable or corrupt: start empty. */ }
  var persist = function () {
    try { localStorage.setItem(KEY, JSON.stringify(exams)); } catch (_) { /* Storage unavailable. */ }
  };

  var dateFmt = new Intl.DateTimeFormat(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  var timeFmt = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
  var monthFmt = new Intl.DateTimeFormat(undefined, { month: "short" });
  var startOfDay = function (d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); };

  var card = function (e, now, past) {
    var d = T.parseLocal(e.when);
    var li = document.createElement("li");
    var days = Math.round((startOfDay(d) - startOfDay(new Date(now))) / DAY);
    li.className = "exam-card" + (past ? " is-past" : days === 0 ? " is-today" : days <= 3 ? " is-near" : "");
    li.innerHTML =
      '<div class="exam-date" aria-hidden="true"><b></b><span></span></div>' +
      '<div><h3></h3><div class="exam-when"></div><div class="exam-count"></div></div>' +
      '<button type="button" class="icon-btn"><i class="fas fa-trash-can" aria-hidden="true"></i></button>';
    li.querySelector(".exam-date b").textContent = d.getDate();
    li.querySelector(".exam-date span").textContent = monthFmt.format(d);
    li.querySelector("h3").textContent = e.subject;
    li.querySelector(".exam-when").textContent = dateFmt.format(d) + " · " + timeFmt.format(d) + (e.note ? " · " + e.note : "");
    var text = T.countdown(d, now);
    if (!past && days === 0) text = "Today · " + text;
    else if (!past && days === 1) text = "Tomorrow · " + text;
    li.querySelector(".exam-count").textContent = past ? "Finished · " + text : text;
    var btn = li.querySelector("button");
    btn.setAttribute("aria-label", "Remove " + e.subject + " exam");
    btn.setAttribute("data-id", e.id);
    return li;
  };

  var render = function () {
    var now = Date.now();
    var sorted = T.sortExams(exams, now);
    var focusedId = document.activeElement && document.activeElement.getAttribute("data-id");
    upList.textContent = "";
    pastList.textContent = "";
    sorted.upcoming.forEach(function (e) { upList.appendChild(card(e, now, false)); });
    sorted.past.forEach(function (e) { pastList.appendChild(card(e, now, true)); });
    $("exam-empty").hidden = sorted.upcoming.length > 0;
    $("exam-past-title").hidden = !sorted.past.length;
    $("exam-clear-past").hidden = !sorted.past.length;
    $("exam-next").textContent = sorted.upcoming.length ? "· next " + T.countdown(T.parseLocal(sorted.upcoming[0].when), now) : "";
    if (focusedId) {
      var again = document.querySelector('button[data-id="' + focusedId + '"]');
      if (again) again.focus();
    }
  };

  var onRemove = function (e) {
    var btn = e.target.closest("button[data-id]");
    if (!btn) return;
    var id = btn.getAttribute("data-id");
    var li = btn.closest("li");
    var next = li.nextElementSibling || li.previousElementSibling;
    var nextId = next && next.querySelector("button[data-id]").getAttribute("data-id");
    exams = exams.filter(function (x) { return x.id !== id; });
    persist();
    render();
    var target = nextId && document.querySelector('button[data-id="' + nextId + '"]');
    (target || $("exam-subject")).focus();
  };
  upList.addEventListener("click", onRemove);
  pastList.addEventListener("click", onRemove);

  $("exam-clear-past").addEventListener("click", function () {
    var now = Date.now();
    exams = exams.filter(function (e) { return T.parseLocal(e.when).getTime() >= now; });
    persist();
    render();
    $("exam-subject").focus();
  });

  var showError = function (msg, field) {
    errorBox.innerHTML = '<i class="fas fa-circle-exclamation" aria-hidden="true"></i><span></span>';
    errorBox.querySelector("span").textContent = msg;
    errorBox.hidden = false;
    field.setAttribute("aria-invalid", "true");
    field.focus();
  };
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    errorBox.hidden = true;
    form.querySelectorAll("[aria-invalid]").forEach(function (el) { el.removeAttribute("aria-invalid"); });
    var subject = form.elements.subject.value.trim().replace(/\s+/g, " ");
    var date = form.elements.date.value, time = form.elements.time.value || "09:00";
    if (!subject) return showError("Enter the subject or paper name.", form.elements.subject);
    if (!date) return showError("Pick the exam date.", form.elements.date);
    var when = date + "T" + time;
    if (!T.parseLocal(when)) return showError("That date or time isn't valid.", form.elements.date);
    exams.push({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      subject: subject.slice(0, 80), when: when, note: form.elements.note.value.trim().slice(0, 80)
    });
    persist();
    render();
    var keepTime = form.elements.time.value;
    form.reset();
    form.elements.time.value = keepTime;
    form.elements.subject.focus();
  });

  render();
  // Keep countdowns fresh; minutes are the smallest unit shown.
  setInterval(render, 30000);
  document.addEventListener("visibilitychange", function () { if (!document.hidden) render(); });
})();
