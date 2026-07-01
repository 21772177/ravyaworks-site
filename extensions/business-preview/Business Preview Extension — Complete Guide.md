# Business Preview Extension — Complete Guide

---

## 1. WHAT IT DOES (Use Case)

You have an **Excel file** with business data (name, industry, phone, address, ratings, etc.). This extension:

- Reads each business from the Excel
- Generates a **live website preview** for it using your existing demo templates (`demos/restaurant/`, `demos/school/`, etc.)
- Creates a **WhatsApp outreach message** you can send to the business owner
- Tracks which businesses you've **contacted** and syncs that status back to your GitHub repo

**Real scenario**: You have 40 leads — 20 restaurants, 10 schools, 10 gyms. Upload the Excel, browse through each business, see their live website, send them a WhatsApp message, and the `Contacted` column updates in your repo automatically.

---

## 2. HOW TO USE (Step by Step)

### Setup (one time)

```bash
# 1. Serve the project locally
cd /home/nikhilesh-shingane/Android/Sdk/Website\ Creation
python3 -m http.server 8000

# 2. Open in browser
# http://localhost:8000/extensions/business-preview/
```

### Daily workflow

```
1. Upload your Excel (.xlsx) containing:
   Business Name | Category | Search Area | Address | Phone | Ratings | Total Reviews | Contacted

2. Extension shows the first row — selects industry, fills form, generates live preview in the iframe

3. Browse rows using ◄ Prev / Next ► buttons
   - Dropdown filter: change "Industry" to jump to first restaurant/school/etc.
   - ✓ badge shows which businesses are already contacted

4. For each business:
   a. See the live website preview (right panel)
   b. Review the outreach message (below preview)
   c. Click "Send via WhatsApp" → opens wa.me with pre-filled message
   d. Row is automatically marked as contacted ✓

5. End of session: Click "Sync to GitHub"
   - Reads your Excel from the repo
   - Updates Contacted column (Yes/No)
   - Pushes back as a new commit
```

### The outreach message looks like:

```
Hi Pizza Palace,
We have created a preview website for Pizza Palace, which is missing in your online presence. Check this out:

http://localhost:8000/extensions/business-preview/

If you like what you see and would like to proceed, simply reply to this message or contact us:
info@ravyaworks.com

you can check our presence online :

Website: https://ravyaworks.com/
Portfolio: https://ravyaworks.com/portfolio/

We look forward to helping you build your online presence!

Best Regards,
Ravya Works Team
```

### GitHub Token setup (one time)

```
1. Go to https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Name: "business-preview-sync"
4. Scope: check "repo" (full control)
5. Copy the token
6. Paste into the GitHub Sync section in the extension
7. Token is saved in your browser for next time
```

---

## 3. HOW IT WAS BUILT (Steps Implemented)

| Phase | File | What Was Done |
|---|---|---|
| **1. Setup** | `extensions/business-preview/README.md` | Directory created, documentation |
| **2. Metadata** | `industries.json` | All 9 industries with theme colors, template paths, hero images |
| **3. Page** | `index.html` | Form (industry, name, tagline, desc, phone, address, search area, ratings, reviews), Excel upload, row nav, preview panel, outreach section, GitHub sync section |
| **4. Styles** | `style.css` | Dark theme (#0B0F19) matching main site, all panel/card/button/input styles, responsive layout |
| **5. Core Engine** | `preview.js` | |
| 5a | — | **Industry metadata loader** — fetches `industries.json`, populates dropdown |
| 5b | — | **Template fetcher** — reads existing `demos/{industry}/config.js`, parses it in a sandbox to get the full site config |
| 5c | — | **Excel parser** — uses SheetJS to read `.xlsx`, normalizes column names (flexible: "Category" / "Category Searched" → industry) |
| 5d | — | **Data merger** — deep merges form/Excel data into the template config (name, tagline, phone, address, ratings, reviews → stats bar) |
| 5e | — | **Preview builder** — constructs a complete HTML iframe with framework CSS + merged config + app.js. `<base>` tag ensures asset paths resolve correctly |
| 5f | — | **WhatsApp override** — after app.js renders, overrides all `wa.me` links with the preview URL + Ravya Works contact info |
| 5g | — | **Outreach message** — generates the message text with business name + preview URL + your contact details. Copy or send buttons |
| 5h | — | **Contacted tracking** — when "Send via WhatsApp" is clicked, marks the row as contacted, shows ✓ badge on row counter |
| 5i | — | **GitHub sync** — reads current Excel from repo via API, updates `Contacted` column, pushes back. Settings (token/repo/path) saved to localStorage |
| 5j | — | **Industry filter** — changing the dropdown searches Excel rows for first match instead of just regenerating the preview |

---

## 4. ARCHITECTURE

```
extensions/business-preview/     ← ALL new code lives here
├── index.html                    # Main page — form, preview, upload, outreach, sync
├── industries.json               # 9 industries with theme colors and paths
├── preview.js                    # Core logic — template fetch, Excel parse, merge, preview build, WhatsApp, GitHub sync
├── style.css                     # Dark theme styles
├── README.md                     # Short documentation
└── Business Preview Extension — Complete Guide.md  # This file

demos/_framework/                 ← NEVER touched (Project Protection)
demos/restaurant/                 ← NEVER touched
...other demos...                 ← NEVER touched
```

**0 existing files modified. Deleting `extensions/` restores the project to its exact original state.**

---

## 5. FILE DETAILS

### `index.html` (158 lines)
- Header with Ravya Works branding and navigation
- Hero section with title
- Builder grid: form panel (left) + preview panel (right)
- Form panel: Excel upload area, row navigation, all business fields
- Preview panel: toolbar with Generate button, iframe container
- Outreach section: message display, Copy + Send buttons
- GitHub Sync section: token, repo, path inputs, Sync button
- Footer
- SheetJS CDN + preview.js loaded at end

### `industries.json` (184 lines)
- 9 industries: restaurant, hospital, school, gym, salon, grocery, boutique, caterer, coaching
- Each has: slug, label, description, templatePath, dataPath, heroImage, navLabel, servicesStyle, theme (primary, secondary, accent, fonts, etc.)

### `preview.js` (608 lines)
- **IIFE** (immediately invoked function expression) — no globals leaked
- Industry metadata loader (fetches `industries.json`)
- Template fetcher (fetches `config.js`, parses in sandbox via `new Function`)
- Excel state: `excelRows[]`, `excelCurrentIndex`, `contacted` per row
- Column name normalisation (flexible mapping: "Category Searched" → industry, etc.)
- Excel parser (FileReader → SheetJS → row array)
- `fillFormFromRow()` — sets form fields, updates business name, tagline, phone, address, search area, ratings, reviews. Shows ✓ badge if contacted. Shows sync section
- `getFormData()` — reads all form field values
- `mergeConfig()` — deep merges form data into template config. Injects ratings/reviews into about stats. Removes previous rating/review entries before adding new ones
- `buildIframeContent()` — constructs srcdoc HTML with framework CSS, merged config as inline script, app.js, WhatsApp override script. Sets `<base>` tag for asset resolution
- `generatePreview()` — fetches template, merges, renders iframe, updates outreach
- `buildOutreachMessage()` — generates WhatsApp message with business name, preview URL, Ravya Works contact info
- `updateOutreach()` — shows outreach section with current message
- `updateContactedCount()` — updates upload status with contacted/total
- `loadSyncSettings()` / `saveSyncSettings()` — persist GitHub config to localStorage
- `syncToGitHub()` — GET file from GitHub API, parse with SheetJS, update Contacted column, PUT back
- `fallbackCopy()` — clipboard fallback using textarea + execCommand
- All event listeners: industry filter, preview button, Excel upload, prev/next, copy/send, reset, token toggle, sync

### `style.css` (512 lines)
- CSS reset, dark theme variables (#0B0F19 background)
- Header (sticky, border-bottom)
- Hero section (centered, accent colors)
- Builder grid (380px form | 1fr preview, responsive to single column)
- Form panel (sticky, card with border)
- Form inputs (dark backgrounds, focus states)
- Buttons (primary blue, secondary ghost, small variant)
- Upload area (file input, status indicator)
- Row navigation (card background, prev/next buttons)
- Preview frame (white background for iframe, placeholder text)
- Outreach panel (message with pre-wrap, copy/send buttons with hover/active states)
- GitHub sync (card layout, input fields, status with success/error colors)
- Responsive breakpoint at 900px

---

## 6. EXCEL COLUMN REFERENCE

| Column in Excel | Mapped Field | Form Field | Used In Preview |
|---|---|---|---|
| `Business Name` / `Name` | businessName | Business Name | Hero, about, outreach message |
| `Category` / `Category Searched` / `Industry` | industry | Industry dropdown | Selects demo template |
| `Search Area` | searchArea | Search Area | Prepended to address |
| `Address` | address | Address | Contact section |
| `Phone` / `Contact` | phone | Phone | Contact section, WhatsApp send |
| `Ratings` / `Rating` | ratings | Ratings | About stats (4.5★ Rating) |
| `Total Reviews` / `Reviews` | totalReviews | Total Reviews | About stats (500+ Reviews) |
| `Contacted` (Yes/No) | contacted | — (auto) | ✓ badge, GitHub sync |
| `Tagline` | tagline | Tagline | Hero subheading (optional) |
| `Description` / `About` | description | Description | Hero subheading, about first paragraph (optional) |

---

## 7. WHAT IS NOT STORED

- No message text content
- No timestamps
- No preview URLs
- No WhatsApp conversation history

Only the `Contacted` column with `Yes`/`No` is synced to GitHub.
