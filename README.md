# ScholarSpace

**Live site:** [https://scholarspace-seven.vercel.app](https://scholarspace-seven.vercel.app)

ScholarSpace is a one-stop study hub for university students: subject-wise notes, previous year question papers (PYQs), video lectures, practice sets, hand-picked programming courses and an SGPA calculator for BBD University B.Tech (CSE and CS-AI).

## Features

- **Explore Notes**: University → Department → Year → subject cards with links to Notes, PYQ Papers, Video Lectures and Practice Sets (B.Tech first and second year). Each year has a subject search.
- **Courses**: curated courses and YouTube playlists (DSA, C, C++ and more).
- **SGPA Calculator**: B.Tech CSE and CS-AI, semesters 1–4. It uses the BBD University grade points and per-subject credits, checks inputs inline and runs entirely in the browser.
- **Feedback**: opens your email app with the message filled in.
- Responsive layout with a mobile menu, keyboard focus styles, a skip link and accessible labels.

## Tech

Plain static HTML, CSS and JavaScript, with no build step and no backend.

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
assets/css/styles.css   Shared design system
assets/js/main.js       Mobile nav, subject search, feedback form, image fallbacks
assets/img/             Favicon, hero and subject images
vercel.json             Clean URLs + asset caching
```

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
