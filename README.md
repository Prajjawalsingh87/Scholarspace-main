# ScholarSpace

**Live site:** [https://scholarspace-seven.vercel.app](https://scholarspace-seven.vercel.app)

ScholarSpace is a one-stop study hub for university students: subject-wise notes, previous year question papers (PYQs), video lectures, practice sets, hand-picked programming courses and an SGPA calculator for BBD University B.Tech (CSE and CS-AI).

## Features

- **Explore Notes**: University → Department → Year → subject cards with links to Notes, PYQ Papers, Video Lectures and Practice Sets (B.Tech first and second year). Each year has a subject search.
- **Courses**: curated courses and YouTube playlists (DSA, C, C++ and more).
- **SGPA Calculator**: B.Tech CSE and CS-AI, semesters 1–4. It uses the BBD University grade points and per-subject credits, checks inputs inline and runs entirely in the browser.
- **Global search**: press <kbd>Ctrl</kbd>+<kbd>K</kbd> (<kbd>⌘</kbd>+<kbd>K</kbd> on Mac), <kbd>/</kbd>, or the Search button in the header to search every subject, notes/PYQ/video/practice link, course, year, department and SGPA calculator from any page. It is fuzzy and typo-tolerant (powered by [MiniSearch](https://github.com/lucaong/minisearch)), understands short forms like "dbms", "coa", "evs" or "maths 2", and ranks the best match first. Use the arrow keys and <kbd>Enter</kbd> to jump straight to a subject card or open a resource in a new tab; <kbd>Esc</kbd> closes it. `?search=dbms` in any page URL opens search pre-filled.
- **Recently viewed**: subjects, resources and calculators you open are listed on the home page and in the search box (stored only in your browser, with a Clear button).
- **CGPA Calculator** (`sgpa/cgpa.html`): combine semester SGPAs into a credit-weighted CGPA. Credits for B.Tech semesters 1–4 are pre-filled, results from the SGPA calculator can be filled in with one click, and your entries are kept in this browser.
- **Feedback**: opens your email app with the message filled in.
- Responsive layout with a mobile menu, keyboard focus styles, a skip link and accessible labels.

## Tech

Plain static HTML, CSS and JavaScript, with no build step and no backend. Search loads MiniSearch 7.1.0 from jsDelivr the first time it is opened.

```
index.html              Home
uni1.html, dep1.html,   Notes browser (university → department → year)
year1.html
first.html, second.html Subject resources for 1st / 2nd year
course1.html            Courses
feedback1.html          Feedback (mailto)
about.html              About the creator
404.html
sgpa/                   SGPA calculator (course → semester → calculator, sgpa.js)
sgpa/cgpa.html, cgpa.js CGPA calculator (combines semesters)
assets/css/styles.css   Shared design system
assets/js/main.js       Mobile nav, global search, recently viewed, subject filter,
                        feedback form, image fallbacks
assets/data/search-index.json  Search index generated from the pages
scripts/build-search-index.mjs Builds the search index (Node, no dependencies)
assets/img/             Favicon, hero and subject images
vercel.json             Clean URLs + asset caching
```

## Search index

The search index is generated from the HTML pages themselves, so it stays in step with the subject cards, links and calculators. After editing any page, rebuild it and commit the result:

```bash
node scripts/build-search-index.mjs          # writes assets/data/search-index.json
node scripts/build-search-index.mjs --check  # fails if the committed index is out of date
```

Short forms that students commonly type (for example "dbms", "coa", "maths 2") live in the `ALIASES` list in the script.

## Run locally

```bash
python3 -m http.server 5187
# open http://localhost:5187
```

## Deploy

This is a static site, so the repository root deploys as-is on Vercel (`vercel deploy --prod`), with no framework or build command.

## Notes and limitations

- The feedback form has no server. It opens the visitor's email client (`mailto:`). If the visitor has no mail app set up, the page shows the address to write to directly.
- Study materials are hosted on Google Drive and YouTube. Availability depends on those links staying public.
- Some subject thumbnails are hot-linked from third-party sites. If one fails to load, the card falls back to an icon tile.
- `new22/` (a New Year 2025 greeting page) and `sgpa/demosgpa.html` (an early SGPA prototype) are kept as-is from the original project and are not linked from the site.

## Credits

- ScholarSpace was created by **[Priyanshu Kumar](https://github.com/priyanshu-p7)**, a B.Tech CSE student at BBD University.
- This repository is a fork of **[Rahul-web01/Scholarspace-main](https://github.com/Rahul-web01/Scholarspace-main)**. All content, study links and the original idea come from the upstream project. This fork updates the UI (design system, responsive layout, accessibility) and the deployment.


## October 2026 improvements

Save subject cards on first- and second-year pages and filter to saved subjects. Bookmarks combine with subject search and persist on the current browser when storage is available. All upstream attribution and resource links are retained.


## Terminal verification and deployment

```bash
python3 -m http.server 5187
```

No package installation or build is required.

```bash
vercel link --project scholarspace
vercel deploy          # preview
vercel deploy --prod   # publish production
```

The local `.vercel/` link is ignored by Git. Deployment credentials belong in
the CLI's login session, never in this repository.
