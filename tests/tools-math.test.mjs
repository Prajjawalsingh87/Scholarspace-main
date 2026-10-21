// Run: node --test
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const T = createRequire(import.meta.url)("../tools/tools-math.js");

// Brute force reference: simulate classes one at a time.
function bruteSkip(a, t, p) { let n = 0; while ((a / (t + n + 1)) * 100 >= p - 1e-12) n++; return n; }
function bruteNeed(a, t, p) { let n = 0; while (((a + n) / (t + n)) * 100 < p - 1e-12) n++; return n; }

test("attendance: examples", () => {
  assert.deepEqual(T.attendance(30, 40, 75), { percent: 75, meets: true, canSkip: 0, mustAttend: 0 });
  assert.equal(T.attendance(36, 40, 75).canSkip, 8);   // 36/48 = 75%
  assert.equal(T.attendance(20, 40, 75).mustAttend, 40); // 60/80 = 75%
  assert.equal(T.attendance(29, 40, 75).mustAttend, 4);  // 33/44 = 75%
  assert.equal(T.attendance(0, 1, 75).mustAttend, 3);    // 3/4
  assert.equal(T.attendance(0, 0, 75).percent, null);
});

test("attendance: matches brute force for many cases and thresholds", () => {
  for (const p of [50, 60, 65, 70, 75, 80, 85, 90, 33.3, 66.67]) {
    for (let t = 1; t <= 60; t++) {
      for (let a = 0; a <= t; a++) {
        const r = T.attendance(a, t, p);
        assert.equal(r.meets, (a / t) * 100 >= p - 1e-9, `meets ${a}/${t}@${p}`);
        if (r.meets) assert.equal(r.canSkip, bruteSkip(a, t, p), `skip ${a}/${t}@${p}`);
        else assert.equal(r.mustAttend, bruteNeed(a, t, p), `need ${a}/${t}@${p}`);
      }
    }
  }
});

test("attendance: 100% threshold and invalid input", () => {
  assert.equal(T.attendance(9, 10, 100).mustAttend, Infinity);
  assert.equal(T.attendance(10, 10, 100).canSkip, 0);
  assert.throws(() => T.attendance(5, 4, 75), RangeError);
  assert.throws(() => T.attendance(-1, 4, 75), RangeError);
  assert.throws(() => T.attendance(1.5, 4, 75), RangeError);
  assert.throws(() => T.attendance(1, 4, 0), RangeError);
  assert.throws(() => T.attendance(1, 4, 101), RangeError);
});

test("overall attendance sums subjects", () => {
  const r = T.overallAttendance([{ attended: 30, total: 40 }, { attended: 18, total: 20 }], 75);
  assert.equal(r.attended, 48);
  assert.equal(r.total, 60);
  assert.equal(r.percent, 80);
  assert.equal(r.canSkip, 4); // 48/64 = 75%
});

test("required SGPA", () => {
  // 8.0 over 100 credits, want 8.2 after 25 more: (8.2*125 - 800) / 25 = 9.0
  let r = T.requiredSgpa(8, 100, 8.2, 25);
  assert.ok(Math.abs(r.required - 9) < 1e-9);
  assert.equal(r.possible, true);
  assert.equal(r.alreadyThere, false);
  assert.ok(Math.abs(r.best - 8.4) < 1e-9);

  // Impossible: needs > 10
  r = T.requiredSgpa(6, 100, 8, 24);
  assert.equal(r.possible, false);
  assert.ok(r.required > 10);

  // Target below current CGPA still needs a minimum SGPA to not drop under it
  r = T.requiredSgpa(9, 50, 8, 26);
  assert.equal(r.alreadyThere, false);
  assert.equal(T.ceil2(r.required), 6.08); // (8*76 - 450) / 26 = 6.0769

  // Already there: even an SGPA of 0 keeps the CGPA at or above target
  r = T.requiredSgpa(9, 100, 6, 10);
  assert.equal(r.alreadyThere, true);

  // First semester (no credits yet): need exactly the target
  assert.ok(Math.abs(T.requiredSgpa(0, 0, 8.5, 26).required - 8.5) < 1e-9);

  // Exactly 10 is possible
  r = T.requiredSgpa(8, 26, 9, 26);
  assert.ok(Math.abs(r.required - 10) < 1e-9);
  assert.equal(r.possible, true);

  assert.throws(() => T.requiredSgpa(11, 10, 8, 20), RangeError);
  assert.throws(() => T.requiredSgpa(8, 10, 8, 0), RangeError);
});

test("ceil2 never rounds below what is needed", () => {
  assert.equal(T.ceil2(7.0001), 7.01);
  assert.equal(T.ceil2(9), 9);
  assert.equal(T.ceil2(8.2 * 3 / 3), 8.2);
  assert.equal(T.ceil2(8.123), 8.13);
});

test("cgpaFromRows reads the CGPA calculator's saved rows", () => {
  const rows = [
    { sem: 1, sgpa: "8", credits: "26" },
    { sem: 2, sgpa: "9", credits: "26" },
    { sem: 3, sgpa: "", credits: "24" },
    { sem: 4, sgpa: "12", credits: "24" },
  ];
  assert.deepEqual(T.cgpaFromRows(rows), { cgpa: 8.5, credits: 52, semesters: 2, lastSem: 2 });
  assert.equal(T.cgpaFromRows([]), null);
  assert.equal(T.cgpaFromRows(null), null);
});

test("countdown text", () => {
  const MIN = 60000, HOUR = 60 * MIN, DAY = 24 * HOUR;
  const now = Date.UTC(2026, 9, 21, 10, 0);
  assert.equal(T.countdown(now + 3 * DAY + 4 * HOUR + 5 * MIN, now), "in 3 days 4 hours");
  assert.equal(T.countdown(now + 1 * DAY, now), "in 1 day");
  assert.equal(T.countdown(now + 2 * HOUR + 1 * MIN, now), "in 2 hours 1 minute");
  assert.equal(T.countdown(now + 12 * MIN + 30000, now), "in 12 minutes");
  assert.equal(T.countdown(now + 30000, now), "starting now");
  assert.equal(T.countdown(now - 30000, now), "just started");
  assert.equal(T.countdown(now - 2 * DAY - 3 * HOUR, now), "2 days 3 hours ago");
});

test("parseLocal and sortExams", () => {
  const d = T.parseLocal("2026-11-05T09:30");
  assert.equal(d.getFullYear(), 2026);
  assert.equal(d.getMonth(), 10);
  assert.equal(d.getHours(), 9);
  assert.equal(T.parseLocal("2026-02-30T09:00"), null);
  assert.equal(T.parseLocal("nope"), null);

  const now = T.parseLocal("2026-11-10T12:00").getTime();
  const exams = [
    { id: "a", when: "2026-11-20T09:00" },
    { id: "b", when: "2026-11-01T09:00" },
    { id: "c", when: "2026-11-12T14:00" },
    { id: "d", when: "2026-11-05T09:00" },
  ];
  const { upcoming, past } = T.sortExams(exams, now);
  assert.deepEqual(upcoming.map((e) => e.id), ["c", "a"]);
  assert.deepEqual(past.map((e) => e.id), ["d", "b"]);
});
