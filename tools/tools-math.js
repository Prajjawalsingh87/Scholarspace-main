// ScholarSpace student tools: pure maths shared by the tool pages and the Node tests.
// Works as a browser script (window.ScholarTools) and as a CommonJS module.
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.ScholarTools = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var EPS = 1e-9;
  var isCount = function (n) { return typeof n === "number" && isFinite(n) && n >= 0 && Math.floor(n) === n; };

  /**
   * Attendance status for `attended` of `total` classes against a threshold in percent.
   * Returns { percent, meets, canSkip, mustAttend } where:
   *   canSkip    = classes you can miss in a row and still be at/above the threshold,
   *   mustAttend = classes you must attend in a row to reach it (Infinity if impossible).
   * With no classes yet, percent is null and nothing is owed.
   */
  function attendance(attended, total, threshold) {
    if (!isCount(attended) || !isCount(total) || attended > total) throw new RangeError("attended must be a whole number between 0 and total");
    if (!(threshold > 0 && threshold <= 100)) throw new RangeError("threshold must be > 0 and <= 100");
    if (total === 0) return { percent: null, meets: true, canSkip: 0, mustAttend: 0 };
    var percent = (attended / total) * 100;
    // Integer-safe comparisons: attended / total >= P / 100  <=>  100 * attended >= P * total.
    var meets = 100 * attended - threshold * total >= -EPS;
    if (meets) {
      // Largest n with 100a >= P (t + n).
      var canSkip = Math.floor((100 * attended - threshold * total) / threshold + EPS);
      return { percent: percent, meets: true, canSkip: Math.max(0, canSkip), mustAttend: 0 };
    }
    if (threshold >= 100) return { percent: percent, meets: false, canSkip: 0, mustAttend: Infinity };
    // Smallest n with 100 (a + n) >= P (t + n).
    var mustAttend = Math.ceil((threshold * total - 100 * attended) / (100 - threshold) - EPS);
    return { percent: percent, meets: false, canSkip: 0, mustAttend: Math.max(1, mustAttend) };
  }

  /** Sum attendance over subjects: { attended, total, ...attendance() }. */
  function overallAttendance(subjects, threshold) {
    var a = 0, t = 0;
    (subjects || []).forEach(function (s) { a += s.attended; t += s.total; });
    var r = attendance(a, t, threshold);
    r.attended = a;
    r.total = t;
    return r;
  }

  /**
   * SGPA needed next semester to reach `target` CGPA.
   * Returns { required, possible, alreadyThere, best } where `best` is the highest
   * CGPA reachable next semester (SGPA 10) and `required` may be <= 0 or > maxSgpa.
   */
  function requiredSgpa(currentCgpa, creditsDone, target, nextCredits, maxSgpa) {
    maxSgpa = maxSgpa || 10;
    if (!(currentCgpa >= 0 && currentCgpa <= maxSgpa)) throw new RangeError("current CGPA must be between 0 and " + maxSgpa);
    if (!(creditsDone >= 0)) throw new RangeError("credits completed must be 0 or more");
    if (!(target >= 0 && target <= maxSgpa)) throw new RangeError("target CGPA must be between 0 and " + maxSgpa);
    if (!(nextCredits > 0)) throw new RangeError("next semester credits must be more than 0");
    var totalCredits = creditsDone + nextCredits;
    var required = (target * totalCredits - currentCgpa * creditsDone) / nextCredits;
    var best = (currentCgpa * creditsDone + maxSgpa * nextCredits) / totalCredits;
    var worst = (currentCgpa * creditsDone) / totalCredits;
    return {
      required: required,
      possible: required <= maxSgpa + EPS,
      alreadyThere: required <= EPS,
      best: best,
      worst: worst
    };
  }

  /** Round up to 2 decimals so the shown SGPA is always enough (7.0001 -> 7.01). */
  function ceil2(x) { return Math.ceil(x * 100 - 1e-7) / 100; }

  /**
   * CGPA from the CGPA calculator's saved rows [{ sem, sgpa, credits }] (strings or numbers).
   * Skips empty or invalid rows. Returns null when nothing usable is saved.
   */
  function cgpaFromRows(rows) {
    if (!Array.isArray(rows)) return null;
    var points = 0, credits = 0, lastSem = 0, count = 0;
    rows.forEach(function (r) {
      if (!r || r.sgpa === "" || r.sgpa == null || r.credits === "" || r.credits == null) return;
      var s = Number(r.sgpa), c = Number(r.credits);
      if (!(s >= 0 && s <= 10) || !(c > 0)) return;
      points += s * c;
      credits += c;
      count++;
      lastSem = Math.max(lastSem, Number(r.sem) || 0);
    });
    if (!count) return null;
    return { cgpa: points / credits, credits: credits, semesters: count, lastSem: lastSem };
  }

  /**
   * Human countdown from `now` to `when` (Date or ms), e.g. "in 3 days 4 hours",
   * "in 2 hours 5 minutes", "in 12 minutes", "starting now", or "3 days ago".
   */
  function countdown(when, now) {
    var diff = Number(when) - Number(now);
    var MIN = 60000, HOUR = 60 * MIN, DAY = 24 * HOUR;
    var unit = function (n, word) { return n + " " + word + (n === 1 ? "" : "s"); };
    var parts = function (ms) {
      var d = Math.floor(ms / DAY), h = Math.floor((ms % DAY) / HOUR), m = Math.floor((ms % HOUR) / MIN);
      if (d > 0) return unit(d, "day") + (h ? " " + unit(h, "hour") : "");
      if (h > 0) return unit(h, "hour") + (m ? " " + unit(m, "minute") : "");
      return unit(m, "minute");
    };
    if (diff >= MIN) return "in " + parts(diff);
    if (diff >= 0) return "starting now";
    if (-diff < MIN) return "just started";
    return parts(-diff) + " ago";
  }

  /** Parse "YYYY-MM-DDTHH:MM" (datetime-local) as local time. Returns a Date or null. */
  function parseLocal(value) {
    var m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?$/.exec(String(value || ""));
    if (!m) return null;
    var d = new Date(+m[1], +m[2] - 1, +m[3], m[4] ? +m[4] : 9, m[5] ? +m[5] : 0);
    return isNaN(d.getTime()) || d.getMonth() !== +m[2] - 1 ? null : d;
  }

  /** Upcoming exams first (soonest first), then past exams (most recent first). */
  function sortExams(exams, now) {
    var t = function (e) { var d = parseLocal(e.when); return d ? d.getTime() : Infinity; };
    var upcoming = [], past = [];
    exams.forEach(function (e) { (t(e) >= Number(now) ? upcoming : past).push(e); });
    upcoming.sort(function (a, b) { return t(a) - t(b); });
    past.sort(function (a, b) { return t(b) - t(a); });
    return { upcoming: upcoming, past: past };
  }

  return {
    attendance: attendance,
    overallAttendance: overallAttendance,
    requiredSgpa: requiredSgpa,
    ceil2: ceil2,
    cgpaFromRows: cgpaFromRows,
    countdown: countdown,
    parseLocal: parseLocal,
    sortExams: sortExams
  };
});
