// ScholarSpace SGPA calculator (BBD University grading scheme).
// Each .subject-row carries data-credits; General Proficiency is #gpMarks.
(function () {
  "use strict";

  var MIN_INTERNAL = 22;
  var MIN_EXTERNAL = 18;
  var MIN_GP = 40;

  function gradePoint(marks) {
    if (marks >= 90) return 10;
    if (marks >= 75) return 9;
    if (marks >= 60) return 8;
    if (marks >= 55) return 7;
    if (marks >= 50) return 6;
    if (marks >= 45) return 5;
    if (marks >= 40) return 4;
    return 0;
  }

  var form = document.getElementById("sgpaForm");
  if (!form) return;
  var errorBox = document.getElementById("sgpa-error");
  var scoreEl = document.getElementById("sgpa-score");
  var marksEl = document.getElementById("sgpa-marks");
  var pctEl = document.getElementById("sgpa-percent");
  var creditsEl = document.getElementById("sgpa-credits");
  var statusEl = document.getElementById("sgpa-status");

  function readNumber(input) {
    var raw = input.value.trim();
    if (raw === "") return NaN;
    return Number(raw);
  }

  function showError(msg, input) {
    errorBox.innerHTML = '<i class="fas fa-circle-exclamation" aria-hidden="true"></i><span></span>';
    errorBox.querySelector("span").textContent = msg;
    errorBox.hidden = false;
    statusEl.textContent = "Not calculated";
    scoreEl.textContent = "—";
    if (input) {
      input.setAttribute("aria-invalid", "true");
      input.focus();
    }
  }

  form.addEventListener("input", function (e) {
    if (e.target.matches(".input")) e.target.removeAttribute("aria-invalid");
  });

  form.addEventListener("reset", function () {
    errorBox.hidden = true;
    scoreEl.textContent = "—";
    marksEl.textContent = pctEl.textContent = creditsEl.textContent = "—";
    statusEl.textContent = "Enter your marks to calculate";
    form.querySelectorAll("[aria-invalid]").forEach(function (el) { el.removeAttribute("aria-invalid"); });
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    errorBox.hidden = true;

    var totalCreditPoints = 0;
    var totalCredits = 0;
    var obtained = 0;
    var full = 0;

    var rows = form.querySelectorAll(".subject-row");
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      var name = row.querySelector(".name").firstChild.textContent.trim();
      var ext = row.querySelector(".ext");
      var int = row.querySelector(".int");
      var external = readNumber(ext);
      var internal = readNumber(int);

      if (isNaN(external)) return showError("Enter external marks for " + name + ".", ext);
      if (isNaN(internal)) return showError("Enter internal marks for " + name + ".", int);
      if (external < 0 || internal < 0) return showError("Marks can't be negative (" + name + ").", external < 0 ? ext : int);
      if (internal + external > 100) return showError("Internal + external marks for " + name + " can't exceed 100.", ext);
      if (internal < MIN_INTERNAL || external < MIN_EXTERNAL) {
        return showError(
          name + ": below passing marks (needs at least " + MIN_INTERNAL + " internal and " + MIN_EXTERNAL + " external).",
          internal < MIN_INTERNAL ? int : ext
        );
      }

      var credits = Number(row.getAttribute("data-credits"));
      var total = internal + external;
      obtained += total;
      full += 100;
      totalCreditPoints += gradePoint(total) * credits;
      totalCredits += credits;
    }

    var gpInput = document.getElementById("gpMarks");
    var gp = readNumber(gpInput);
    if (isNaN(gp)) return showError("Enter your General Proficiency marks.", gpInput);
    if (gp < 0 || gp > 100) return showError("General Proficiency marks must be between 0 and 100.", gpInput);
    if (gp < MIN_GP) return showError("Below passing marks in General Proficiency (needs at least " + MIN_GP + ").", gpInput);

    var gpCredits = Number(gpInput.getAttribute("data-credits"));
    obtained += gp;
    full += 100;
    totalCreditPoints += gradePoint(gp) * gpCredits;
    totalCredits += gpCredits;

    var sgpa = (totalCreditPoints / totalCredits).toFixed(2);
    var pct = ((obtained / full) * 100).toFixed(2);

    scoreEl.textContent = sgpa;
    marksEl.textContent = obtained + " / " + full;
    pctEl.textContent = pct + "%";
    creditsEl.textContent = String(totalCredits);
    statusEl.textContent = "Your SGPA";

    if (window.matchMedia("(max-width: 960px)").matches) {
      document.getElementById("result").scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
})();
