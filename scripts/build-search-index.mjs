#!/usr/bin/env node
// Builds assets/data/search-index.json from the site's own HTML pages.
// Run after changing any page:  node scripts/build-search-index.mjs
// No dependencies: the pages share one predictable structure, so simple
// pattern matching is enough. `--check` fails if the committed index is stale.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(root, "assets/data/search-index.json");

const read = (p) => readFileSync(join(root, p), "utf8");

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
function decode(s) {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m);
}
const text = (html) => decode(html.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
const first = (html, re) => { const m = html.match(re); return m ? text(m[1]) : ""; };

// Must match subjectId() in assets/js/main.js.
export const slug = (s) => "subject-" + s.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// Loose name matching so "Database Management Systems" (calculator) finds
// "Database Management System" (notes page).
const STOP = new Set(["and", "of", "in", "with", "using", "the", "lab"]);
function tokens(name) {
  return decode(name).toLowerCase()
    .replace(/organis/g, "organiz").replace(/advanced/g, "advance").replace(/transformation/g, "transform")
    .replace(/[^a-z0-9]+/g, " ").split(" ")
    .map((w) => w.replace(/s$/, ""))
    .filter((w) => w && !STOP.has(w) && w !== "c");
}
function sameSubject(a, b) {
  const A = new Set(tokens(a)), B = new Set(tokens(b));
  let common = 0;
  A.forEach((t) => { if (B.has(t)) common++; });
  return common / Math.max(A.size, B.size) >= 0.75;
}
const acronym = (name) => tokens(name).map((w) => w[0]).join("");

// Common short names students type. Kept small and factual.
const ALIASES = [
  [/matrices and calculus/i, "maths math mathematics maths 1 m1"],
  [/differential equation/i, "maths math mathematics maths 2 m2 fourier"],
  [/complex analysis/i, "maths math mathematics maths 3 m3"],
  [/statistical/i, "maths math mathematics maths 4 m4 snt statistics numerical"],
  [/discrete mathematics/i, "maths math dm discrete"],
  [/programming in c|structure using c/i, "c language c programming"],
  [/data structure/i, "ds dsa data structures"],
  [/database management/i, "dbms database sql"],
  [/organisation (&|and) architecture/i, "coa computer architecture"],
  [/digital logic/i, "dld digital electronics"],
  [/java/i, "java oops oop"],
  [/python/i, "python"],
  [/artificial intelligence/i, "ai"],
  [/environmental/i, "evs environment"],
  [/communicative english/i, "english communication"],
  [/electrical/i, "electrical"],
  [/electronics/i, "electronics"],
  [/software engineering/i, "se"],
  [/indian constitution/i, "constitution coi"],
  [/organisational behaviour/i, "ob"],
  [/sociology/i, "sociology"],
];
const aliasesFor = (name) => ALIASES.filter(([re]) => re.test(name)).map(([, a]) => a).join(" ");

const RESOURCE_WORDS = {
  "Notes": "notes study material",
  "PYQ Papers": "pyq pyqs previous year question papers past papers exam",
  "Video Lecture": "video lectures youtube playlist",
  "Practice Set": "practice set questions assignment",
  "Start Course": "course tutorial start",
};

const docs = [];
const add = (doc) => docs.push({ id: docs.length + 1, ...doc });

// --- SGPA calculator pages: subjects per semester -----------------------
const CALCS = [];
for (const [course, code, label] of [["cse", "CSE", "B.Tech CSE"], ["ai", "CS-AI", "B.Tech CS-AI"]]) {
  ["1st", "2nd", "3rd", "4th"].forEach((ord, i) => {
    const path = `sgpa/B_tech_${course}_${ord}_sem.html`;
    const html = read(path);
    const subjects = [...html.matchAll(/class="name">([^<]+)/g)].map((m) => decode(m[1]).trim());
    CALCS.push({ path, code, label, sem: i + 1, ord, subjects });
  });
}

// --- Plain pages ----------------------------------------------------------
const PAGES = [
  ["index.html", "Home", "home start"],
  ["uni1.html", "Explore Notes", "notes universities study material browse"],
  ["dep1.html", "BBD University departments", "bbd university departments schools"],
  ["year1.html", "B.Tech years", "btech b tech years"],
  ["first.html", "First Year — B.Tech", "1st year first year year 1 semester 1 2 fy"],
  ["second.html", "Second Year — B.Tech", "2nd year second year year 2 semester 3 4 sy"],
  ["course1.html", "Courses", "courses programming playlists learn coding"],
  ["sgpa/index.html", "SGPA Calculator", "sgpa calculator marks grade result gpa"],
  ["sgpa/selectcourse.html", "SGPA Calculator — choose course", "sgpa cse cs-ai course"],
  ["sgpa/select_semester_cs.html", "SGPA Calculator — B.Tech CSE semesters", "sgpa cse semester"],
  ["sgpa/select_semester_ai.html", "SGPA Calculator — B.Tech CS-AI semesters", "sgpa ai cs-ai semester"],
  ["sgpa/cgpa.html", "CGPA Calculator", "cgpa calculator cumulative overall average semesters combine gpa"],
  ["feedback1.html", "Feedback", "feedback contact suggest report broken link email"],
  ["about.html", "About ScholarSpace", "about creator priyanshu contact"],
];
for (const [path, title, keywords] of PAGES) {
  if (!existsSync(join(root, path))) throw new Error("Missing page " + path);
  const html = read(path);
  add({
    kind: "page", title, url: path, keywords,
    context: first(html, /<section class="page-hero">[\s\S]*?<p>([\s\S]*?)<\/p>/) ||
      decode((html.match(/<meta name="description" content="([^"]*)"/) || [, ""])[1]),
  });
}

// --- University / department / year choices ------------------------------
for (const path of ["uni1.html", "dep1.html", "year1.html"]) {
  const html = read(path);
  for (const m of html.matchAll(/<li>(<a class="choice" href="([^"]+)"|<div class="choice is-soon")[\s\S]*?<strong>([\s\S]*?)<\/strong><span>([\s\S]*?)<\/span>/g)) {
    const soon = !m[2];
    add({
      kind: path === "uni1.html" ? "university" : path === "dep1.html" ? "department" : "year",
      title: text(m[3]),
      context: soon ? "Coming soon" : text(m[4]),
      url: soon ? path : m[2],
      keywords: path === "year1.html" ? text(m[3]).replace(/First/, "1st year 1").replace(/Second/, "2nd year 2").replace(/Third/, "3rd year 3").replace(/Fourth/, "4th year 4") : "",
      soon: soon || undefined,
    });
  }
}

// --- Subjects and their resources (first / second year) -------------------
for (const [path, yearLabel, yearWords] of [
  ["first.html", "First Year", "first year 1st year year 1 fy"],
  ["second.html", "Second Year", "second year 2nd year year 2 sy"],
]) {
  const html = read(path);
  for (const m of html.matchAll(/<article class="subject-card" data-subject="([^"]+)">([\s\S]*?)<\/article>/g)) {
    const name = decode(m[1]);
    const sems = CALCS.filter((c) => c.subjects.some((s) => !/lab$/i.test(s) && sameSubject(s, name)))
      .map((c) => `${c.code} sem ${c.sem}`);
    const semWords = [...new Set(sems.map((s) => "semester " + s.split(" sem ")[1] + " sem " + s.split(" sem ")[1]))].join(" ");
    // Live links (<a class="res">) and "coming soon" placeholders (<span class="res is-soon">).
    const resources = [...m[2].matchAll(/<(?:a class="res" href="([^"]+)"|span class="res is-soon")[^>]*>[\s\S]*?<\/i>([^<]+)</g)]
      .map((r) => ({ label: r[2].trim(), href: r[1] ? decode(r[1]) : null }));
    const live = resources.filter((r) => r.href);
    const keywords = [...new Set((aliasesFor(name) + " " + acronym(name)).split(" ").filter(Boolean))].join(" ");
    const context = `${yearLabel} · B.Tech` + (sems.length ? " · " + sems.join(", ") : "");
    add({
      kind: "subject", title: name, url: `${path}#${slug(name)}`, context,
      keywords, year: `${yearWords} ${semWords}`,
      resources: live.map((r) => r.label).join(" · "),
      soon: !live.length || undefined,
    });
    for (const r of resources) {
      // Placeholders still get an entry so "dbms pyq" finds the subject and says
      // the papers are coming soon, instead of matching something unrelated.
      add({
        kind: "resource", title: `${name} — ${r.label}`, subject: name,
        url: r.href || `${path}#${slug(name)}`, external: !!r.href || undefined, soon: !r.href || undefined,
        context: `${yearLabel} · ${r.label}`, keywords: `${keywords} ${RESOURCE_WORDS[r.label] || r.label}`,
        year: `${yearWords} ${semWords}`,
      });
    }
  }
}

// --- Courses ---------------------------------------------------------------
{
  const html = read("course1.html");
  for (const m of html.matchAll(/<article class="subject-card" data-subject="([^"]+)">([\s\S]*?)<\/article>/g)) {
    const name = decode(m[1]);
    const desc = first(m[2], /<p class="desc">([\s\S]*?)<\/p>/);
    const live = [...m[2].matchAll(/<a class="res" href="([^"]+)"[^>]*>[\s\S]*?<\/i>([^<]+)</g)];
    add({
      kind: "course", title: name, url: `course1.html#${slug(name)}`, context: desc,
      keywords: `course ${aliasesFor(name)} ${acronym(name)}`, soon: !live.length || undefined,
    });
    for (const r of live) {
      add({
        kind: "resource", title: `${name} — ${r[2].trim()}`, subject: name, url: decode(r[1]), external: true,
        context: `Courses · ${r[2].trim()}`, keywords: `course ${aliasesFor(name)} ${RESOURCE_WORDS[r[2].trim()] || ""}`,
      });
    }
  }
}

// --- SGPA calculators ------------------------------------------------------
for (const c of CALCS) {
  add({
    kind: "calculator", title: `SGPA Calculator — ${c.label}, ${c.ord} semester`, url: c.path,
    context: `${c.subjects.filter((s) => !/lab$/i.test(s)).length} subjects · ${c.subjects.slice(0, 3).join(", ")}…`,
    keywords: `sgpa gpa calculator marks result ${c.code} ${c.code === "CS-AI" ? "ai csai" : "cse cs"} semester ${c.sem} sem ${c.sem} ${c.ord}`,
    text: [...new Set(c.subjects)].join(" "),
  });
}

const json = JSON.stringify({ generated: "scripts/build-search-index.mjs", count: docs.length, docs }) + "\n";
if (process.argv.includes("--check")) {
  const current = existsSync(OUT) ? readFileSync(OUT, "utf8") : "";
  if (current !== json) {
    console.error("search-index.json is out of date. Run: node scripts/build-search-index.mjs");
    process.exit(1);
  }
  console.log(`search-index.json is up to date (${docs.length} entries).`);
} else {
  writeFileSync(OUT, json);
  console.log(`Wrote ${docs.length} entries to assets/data/search-index.json`);
}
