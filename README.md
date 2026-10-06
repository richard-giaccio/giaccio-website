# Giaccio Properties — Website

The marketing + listings website for Giaccio Properties, a Westchester County, NY home builder.
It is a **static site** built with [Astro](https://astro.build), deployed free to **GitHub Pages**
at **https://giaccioproperties.com**.

There is no server, no database, and no CMS. All content lives in plain JSON and image files in
this repo. A push to `main` rebuilds and redeploys the whole site in about a minute.

---

## Table of contents

1. [Tech stack](#tech-stack)
2. [Quick start](#quick-start)
3. [Project structure](#project-structure)
4. [Editing site text](#editing-site-text)
5. [Managing listings](#managing-listings)
6. [Managing listing photos](#managing-listing-photos)
7. [How listing titles work](#how-listing-titles-work)
8. [Property maps](#property-maps)
9. [The contact form](#the-contact-form)
10. [SEO](#seo)
11. [Deployment](#deployment)
12. [Domain and hosting](#domain-and-hosting)
13. [Common tasks cookbook](#common-tasks-cookbook)
14. [Troubleshooting](#troubleshooting)
15. [Access and ownership](#access-and-ownership)

---

## Tech stack

| Piece        | What it is |
|--------------|------------|
| Framework    | Astro (static output, no SSR adapter) |
| Styling      | Plain CSS in `src/styles/global.css` (no framework) |
| Hosting      | GitHub Pages, deployed via GitHub Actions |
| Images       | Pre-optimized JPEG + WebP, served as static files |
| Forms        | Contact form posts to a Google Form (no backend) |
| Maps         | Google Maps `output=embed` iframe (no API key) |
| Sitemap      | `@astrojs/sitemap` integration |

Only two runtime dependencies: `astro` and `@astrojs/sitemap`. Everything else is build tooling.

---

## Quick start

**Prerequisites:** Node.js 18+ and npm. For the photo pipeline you also need
[ImageMagick](https://imagemagick.org) (`magick` on your PATH).

```bash
npm install        # install dependencies
npm run dev        # local dev server at http://localhost:4321
npm run build      # build the static site into dist/
npm run preview    # serve the built dist/ locally to check production output
```

To ship a change: edit, commit, and push to `main`. GitHub Actions does the rest (see
[Deployment](#deployment)).

---

## Project structure

```
giaccio-website/
├── data/
│   ├── site.json            # ALL site text (headlines, story, contact). Edit here.
│   ├── properties.json      # single source of truth for every listing
│   ├── properties.csv       # spreadsheet mirror; `npm run data` rebuilds the JSON
│   ├── photo-manifest.json  # maps each listing to its image set (generated)
│   └── SCHEMA.md            # field reference for the data files
├── public/
│   ├── assets/properties/<slug>/   # web-optimized photos per listing
│   ├── CNAME               # custom domain (giaccioproperties.com) — do not delete
│   ├── robots.txt          # points crawlers to the sitemap
│   └── favicon.png
├── scripts/
│   ├── apply-picks.mjs     # `npm run picks` — turn hand-picked photos into site assets
│   ├── csv-to-json.js      # `npm run data` — rebuild properties.json from the CSV
│   └── form-email-notify.gs# Google Apps Script for detailed contact-form emails
├── src/
│   ├── pages/
│   │   ├── index.astro             # home page
│   │   ├── about.astro             # Our Story page
│   │   ├── contact.astro           # contact form page
│   │   └── properties/[slug].astro # one page per listing (generated from data)
│   ├── components/PropertyCard.astro
│   ├── layouts/BaseLayout.astro    # <head>, SEO meta, structured data, header/footer
│   ├── lib/properties.js           # loads + enriches listing data for the templates
│   └── styles/global.css           # all styling
├── astro.config.mjs        # site URL, base path, sitemap integration
└── .github/workflows/deploy.yml   # build + deploy to GitHub Pages
```

---

## Editing site text

**Every piece of on-page wording lives in [`data/site.json`](data/site.json).** You rarely need to
touch `.astro` files to change copy. Edit the JSON, save, commit, push.

Key sections in `site.json`:

- `brand`, `tagline` — site name and tagline
- `story` — the home-page "Our Story" block: `eyebrow`, `title`, `founder_line`, `body` (array of
  paragraphs), `signature`
- `about` — the About page content, including `founder_note`
- `contact` — `email`, `phone`, `area`, `address` (these also feed the structured data)

Anything wrapped in `[SQUARE BRACKETS]` is a placeholder meant to be filled in.

---

## Managing listings

Listings are defined in [`data/properties.json`](data/properties.json). Each entry looks like:

```json
{
  "slug": "ashwood-road-19-south-salem",
  "address": "Ashwood Road",
  "town": "South Salem",
  "state": "NY",
  "price": null,
  "status": "",
  "bedrooms": null,
  "bathrooms": null,
  "source_folder": "Ashwood Road (#19) - South Salem",
  "mls_ref": "19"
}
```

- `slug` is the URL (`/properties/<slug>/`). Keep it stable once published.
- `source_folder` is the exact name of this listing's photo folder (see below). It must match.
- `price: null` or `status: ""` renders as "Contact for pricing" with no badge.
- See [`data/SCHEMA.md`](data/SCHEMA.md) for the full field reference.

You can edit `properties.json` directly, or edit `data/properties.csv` and run `npm run data` to
regenerate the JSON from the spreadsheet.

---

## Managing listing photos

Photos are **hand-picked** from large source folders and optimized into the site by a pipeline.
This keeps the original photo library out of the repo and ships only small web-ready images.

### Source photos

Original photos live **outside the repo**, at:

```
~/Downloads/Website Photos rich/<folder name>/
```

Each folder matches a listing's `source_folder` in `properties.json`
(for example `Ashwood Road (#19) - South Salem`).

### Picking the photos to show

Inside a listing's source folder, rename the images you want the site to use:

| File name    | Role on the site |
|--------------|------------------|
| `main.jpg`   | the hero / card image |
| `thumb1.jpg` | gallery thumbnail 1 |
| `thumb2.jpg` | gallery thumbnail 2 |
| `thumb3.jpg` | gallery thumbnail 3 |

`.png`, `.webp`, and `.heic` also work. You do not have to set all four; `main` alone is fine.

### Applying the picks

```bash
npm run picks     # reads the source folders, optimizes picks into public/assets, updates the manifest
npm run build     # rebuild the site
```

`apply-picks.mjs` uses ImageMagick to generate the optimized `main.jpg` + WebP + thumbnail variants
into `public/assets/properties/<slug>/` and records them in `data/photo-manifest.json`. It only
processes folders that have a matching manifest entry, so a brand-new listing needs a
`properties.json` entry (and therefore a manifest entry) first.

### Removing a listing's photos

Delete the files from `public/assets/properties/<slug>/` and clear that listing's `images` (and
`main`/`thumbs`) in `data/photo-manifest.json`. A listing with no photos automatically shows a
"Photos coming soon" placeholder.

---

## How listing titles work

Titles display the house number automatically. The number is parsed from the `(#NN)` in each
listing's `source_folder` (and verified against `mls_ref`), then combined with the street in
`src/lib/properties.js` as `displayAddress`.

Example: `source_folder: "Ashwood Road (#19) - South Salem"` renders as **"19 Ashwood Road"** with
"South Salem, NY" beneath it. Listings with no number fall back to just the street name. You do not
edit titles by hand.

---

## Property maps

Each listing page has a **Location** section with an embedded Google Map, generated in
`src/pages/properties/[slug].astro` from the listing's address. It uses Google's free
`maps?q=<address>&output=embed` iframe, so there is **no API key or billing**. Named-street
addresses pin precisely; vague condo/development addresses center on the area.

---

## The contact form

The contact form (`src/pages/contact.astro`) has no backend. On submit it POSTs in the background to
a **Google Form**, so responses collect in that form's Responses tab / linked sheet.

- The Google Form's `formResponse` endpoint and the `entry.XXXX` field IDs are hard-coded in the
  `<script>` at the bottom of `contact.astro`.
- Client-side validation requires a valid email and a 10-digit phone (phone optional).
- **If you rebuild or replace the Google Form, you must update the endpoint and entry IDs.** Get
  new entry IDs by loading the form's public `viewform` URL and reading the `entry.NNN` values out
  of the page's `FB_PUBLIC_LOAD_DATA_` blob.

### Detailed email notifications (optional)

Google's built-in form notification does not include the submitted data. To get the full
name/email/phone/message emailed on each submission, install the Apps Script in
[`scripts/form-email-notify.gs`](scripts/form-email-notify.gs) (setup steps are in the file header).
It must be set up by the Google account that owns the form.

---

## SEO

Configured and shipping on every build:

- **Structured data (JSON-LD):** `RealEstateAgent` schema site-wide (business name, address,
  founder, area served) plus `Residence` + `BreadcrumbList` per listing. Built in `BaseLayout.astro`
  and `[slug].astro`.
- **Meta:** unique, location-rich `<title>` and description per page; canonical URL; Open Graph and
  Twitter cards with per-listing images.
- **Sitemap:** `@astrojs/sitemap` generates `sitemap-index.xml` on every build.
- **robots.txt:** `public/robots.txt` allows all and points to the sitemap.

**One-time external step:** submit `https://giaccioproperties.com/sitemap-index.xml` in
[Google Search Console](https://search.google.com/search-console).

---

## Deployment

Deployment is automatic via GitHub Actions ([`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)):

1. Push to `main` (or run the workflow manually from the Actions tab).
2. The workflow builds the Astro site and deploys it to GitHub Pages.
3. The site is live at https://giaccioproperties.com within about a minute.

You do not build or upload anything by hand. Just commit and push.

> **Avoid overlapping deploys.** GitHub Pages serializes deployments. Firing several at once (or
> mixing a branch-based Pages build with the Actions workflow) makes them cancel each other at the
> timeout. Let one deploy finish before starting another.

---

## Domain and hosting

- **Domain:** `giaccioproperties.com`, managed through the WordPress.com DNS panel (that is only the
  DNS host; the site itself is on GitHub Pages).
- **DNS:** four apex `A` records point at GitHub Pages: `185.199.108.153`, `185.199.109.153`,
  `185.199.110.153`, `185.199.111.153`. The `www` record is a CNAME to the apex.
- **Custom domain** is set in the repo's **Settings → Pages**, and `public/CNAME` holds
  `giaccioproperties.com`. Do not delete that file.
- **HTTPS** is a free auto-provisioned GitHub/Let's Encrypt certificate. After first attaching the
  domain it can take up to an hour to issue; "Enforce HTTPS" turns on once it is ready.

---

## Common tasks cookbook

**Change a headline or any wording** → edit `data/site.json`, push.

**Add a new listing** → add an entry to `data/properties.json`, create its photo source folder, run
`npm run picks`, then `npm run build`, then push.

**Swap a listing's photos** → re-pick `main`/`thumb1-3` in the source folder, run `npm run picks`,
build, push.

**Change a price or status** → edit that listing in `data/properties.json`, push.

**Update the contact email recipient** → change the Apps Script `NOTIFY_TO`, or the Google Form
settings.

**Preview before pushing** → `npm run build && npm run preview`.

---

## Troubleshooting

**The `richard-giaccio.github.io/giaccio-website/` URL looks unstyled.** Expected. The config uses
`base: '/'` for the apex domain, so assets 404 under the project sub-path. Judge the site at
`giaccioproperties.com` or via `npm run preview`, not the project github.io URL.

**A deploy "times out" or cancels.** Almost always overlapping deploys, not a real limit. Cancel the
extras, let a single clean run finish. See the note under [Deployment](#deployment).

**Images 404 after editing.** Make sure you ran `npm run picks` and committed both the new files in
`public/assets/` and the updated `data/photo-manifest.json`.

**A listing shows "Photos coming soon."** That listing has no `main`/`images` in the manifest. Add
picks to its source folder and run `npm run picks`.

**HTTPS shows a certificate error right after a domain change.** The cert is still provisioning. Give
it up to an hour; do not toggle the domain repeatedly.

---

## Access and ownership

- The repository is owned by the **richard-giaccio** GitHub account:
  https://github.com/richard-giaccio/giaccio-website
- Collaborators have push access and can deploy by pushing to `main`.
- Managing Pages, the custom domain, or collaborators requires the owner (admin) account.
