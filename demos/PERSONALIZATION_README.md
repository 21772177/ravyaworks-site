# RavyaWorks Personalization System

Convert every industry demo website into a reusable template. One HTML file per industry — unlimited businesses share it.

## How It Works

**Before:** Each industry had a static `config.js` — one website, one config.

```
portfolio/restaurant/  →  config.js  →  "Spice Garden Restaurant"
portfolio/hospital/    →  config.js  →  "CarePlus Hospital"
```

**After:** One `index.html` per industry serves unlimited businesses. Content loads from JSON.

```
portfolio/restaurant/              →  config.js  →  "Spice Garden Restaurant"   (static — unchanged)
portfolio/restaurant/?client=the-boozy-griffin  →  data/restaurant/the-boozy-griffin.json
portfolio/restaurant/?client=spice-garden       →  data/restaurant/spice-garden.json
```

## URL Format

```
https://ravyaworks.com/portfolio/{industry}/?client={business-slug}
```

### Examples

| Industry | URL |
|----------|-----|
| Restaurant | `https://ravyaworks.com/portfolio/restaurant/?client=the-boozy-griffin` |
| Hospital | `https://ravyaworks.com/portfolio/hospital/?client=careplus` |
| School | `https://ravyaworks.com/portfolio/school/?client=bright-future-academy` |
| Gym | `https://ravyaworks.com/portfolio/gym/?client=iron-forge-fitness` |
| Salon | `https://ravyaworks.com/portfolio/salon/?client=glam-studio` |
| Boutique | `https://ravyaworks.com/portfolio/boutique/?client=fashion-hub` |
| Caterer | `https://ravyaworks.com/portfolio/caterer/?client=royal-taste-caterers` |
| Grocery | `https://ravyaworks.com/portfolio/grocery/?client=daily-fresh-store` |
| Coaching | `https://ravyaworks.com/portfolio/coaching/?client=excel-academy` |

Without `?client=`, the original static page loads (backward compatible).

## Architecture

```
demos/
├── _framework/
│   └── js/
│       ├── personalization.js        ←  NEW  — smart loader
│       └── app.js                    ←  unchanged (engine)
├── data/                             ←  NEW  — business data
│   ├── restaurant/
│   │   ├── the-boozy-griffin.json
│   │   ├── spice-garden.json
│   │   └── ...
│   ├── hospital/
│   │   ├── careplus.json
│   │   └── ...
│   ├── school/
│   ├── gym/
│   ├── salon/
│   ├── boutique/
│   ├── caterer/
│   ├── grocery/
│   └── coaching/
├── restaurant/
│   └── index.html                    ←  modified (1 line changed)
├── hospital/
│   └── index.html                    ←  modified (1 line changed)
└── ...
```

### Loading Flow

Every industry `index.html` now loads only one script:

```html
<script src="../_framework/js/personalization.js"></script>
```

`personalization.js` handles both modes:

1. **Static mode** (no `?client=`) — injects `config.js` then `app.js` via `document.write`. Identical to original behaviour.
2. **Personalized mode** (`?client=xyz`) — fetches `data/{industry}/{xyz}.json`, builds a `SITE_CONFIG` object, then loads `app.js`.

If the JSON fetch fails, a minimal fallback config is used so the page always renders.

## JSON Schema

```json
{
  "businessName": "The Boozy Griffin",
  "industry": "Restaurant / Gastropub",
  "slug": "the-boozy-griffin",
  "tagline": "Where Every Meal Feels Like a Celebration",
  "description": "Full business description used in hero, about, meta.",
  "heroImage": "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=1600",
  "theme": "restaurant",
  "phone": "+91 96115 47239",
  "email": "hello@example.com",
  "website": "",
  "address": "Full street address",
  "city": "Bengaluru",
  "state": "Karnataka",
  "country": "India",
  "pincode": "560095",
  "googleMaps": "https://www.google.com/maps?q=...&output=embed",
  "latitude": "12.9352",
  "longitude": "77.6245",
  "googleRating": "4.5",
  "reviewCount": "2500+",
  "businessHours": {
    "Monday": "11:00 AM – 10:30 PM",
    "Tuesday": "11:00 AM – 10:30 PM",
    "Wednesday": "11:00 AM – 10:30 PM",
    "Thursday": "11:00 AM – 10:30 PM",
    "Friday": "11:00 AM – 11:30 PM",
    "Saturday": "11:00 AM – 11:30 PM",
    "Sunday": "10:00 AM – 10:30 PM"
  },
  "serviceOptions": ["Reservations Required", "Live Music"],
  "bookingLinks": {
    "website": "https://example.com/reserve",
    "zomato": "",
    "swiggy": "",
    "district": ""
  },
  "socialLinks": {
    "facebook": "https://facebook.com/...",
    "instagram": "https://instagram.com/...",
    "linkedin": "",
    "youtube": ""
  },
  "services": [
    {
      "title": "Dish Name",
      "price": "₹459",
      "description": "Description of the service/item.",
      "image": "",
      "tag": "Signature | Veg | Starter",
      "features": [],
      "cta": "",
      "featured": true
    }
  ],
  "gallery": [
    "https://images.unsplash.com/photo-xxx?w=800",
    "https://images.unsplash.com/photo-yyy?w=800"
  ],
  "reviews": [
    {
      "name": "Customer Name",
      "role": "Regular Patron",
      "rating": 5,
      "text": "Review text.",
      "avatar": ""
    }
  ],
  "team": [
    {
      "name": "Dr. Name",
      "role": "Chief Cardiologist",
      "specialty": "Interventional Cardiology",
      "description": "MD, DM, 18+ years experience.",
      "photo": "",
      "phone": "",
      "email": ""
    }
  ],
  "faq": [
    { "q": "Question?", "a": "Answer." }
  ]
}
```

### Field Notes

| Field | Required | Notes |
|-------|----------|-------|
| `businessName` | **Yes** | Used in hero, title, brand, all sections |
| `industry` | No | Used in meta tags and title fallback |
| `tagline` | No | Hero subheading |
| `description` | No | About section + meta description |
| `theme` | Yes | Must match one of the 9 industry keys |
| `phone` | No | Contact section, WhatsApp |
| `email` | No | Contact section |
| `address` / `city` / `pincode` | No | Contact section |
| `googleMaps` | No | Embed URL (must include `&output=embed`) |
| `businessHours` | No | Object with day keys |
| `serviceOptions` | No | Hero quick highlights (max 4 shown) |
| `services` | No | Array of service objects |
| `gallery` | No | Array of image URLs |
| `reviews` | No | Array of review objects |
| `team` | No | Array of team member objects |
| `faq` | No | Array of Q&A objects |
| `socialLinks` | No | Footer social icons (false if empty) |
| `bookingLinks` | No | Used for CTA label hint |
| All other fields | No | Gracefully omitted if empty/null |

### Theme Values

The `theme` field must match one of these keys:

| Key | Industry |
|-----|----------|
| `restaurant` | Restaurants, cafes, pubs |
| `school` | Schools, educational institutions |
| `hospital` | Hospitals, clinics, medical centres |
| `gym` | Gyms, fitness centres, yoga studios |
| `salon` | Salons, beauty parlours, spas |
| `grocery` | Grocery stores, supermarkets |
| `boutique` | Fashion boutiques, clothing stores |
| `caterer` | Catering companies, event planners |
| `coaching` | Coaching centres, tuition academies |

## How to Add a New Business

1. Create a JSON file in the correct industry folder:
   ```
   data/restaurant/your-business-name.json
   ```

2. Copy an existing JSON or use the schema above.

3. Fill in the business details.

4. Share the URL:
   ```
   https://ravyaworks.com/portfolio/restaurant/?client=your-business-name
   ```

That's it. No HTML changes. No CSS changes. No deployment of new folders.

### Example

```bash
# Create JSON
cp data/restaurant/the-boozy-griffin.json data/restaurant/spice-garden.json
# Edit spice-garden.json with Spice Garden's details
# URL: https://ravyaworks.com/portfolio/restaurant/?client=spice-garden
```

## How Personalization Works (Technical)

1. **Script replacement**: Each `index.html` now loads `personalization.js` instead of `config.js` + `app.js`.

2. **URL detection**: `personalization.js` reads `?client=` from `location.search`.

3. **Industry detection**: Reads `<body data-preset="restaurant">` attribute. All 9 industries have this set.

4. **JSON loading**: Uses synchronous `XMLHttpRequest` to fetch `data/{industry}/{client}.json`. Synchronous is safe because the script runs during HTML parsing. The JSON files are small (2–15 KB), so load time is negligible.

5. **Config building**: The `buildConfig()` function maps the flat JSON schema to the nested `window.SITE_CONFIG` structure that `app.js` expects — theme colours, hero, about, services, gallery, testimonials, team, FAQ, contact, hours, social links.

6. **Fallback**: If JSON fetch fails (404, network error, parse error), `fallbackConfig()` creates a minimal working config with the business name derived from the URL slug. The page always renders.

7. **Static mode**: When no `?client=` param exists, `personalization.js` uses `document.write` to inject `config.js` then `app.js` — identical to the original two-script loading. 100% backward compatible.

## Backward Compatibility

All existing URLs continue to work without changes:

| URL | Before | After |
|-----|--------|-------|
| `/portfolio/restaurant/` | loads `config.js` + `app.js` | loads `personalization.js` → injects `config.js` + `app.js` |
| `/portfolio/hospital/` | same | same |
| All 9 industries | same | same — identical behaviour |

The visual output is indistinguishable. No CSS, no layout, no content changes for existing pages.

## Bulk Personalization

To generate N business JSON files:

```bash
for business in "${clients[@]}"; do
  cp data/restaurant/template.json "data/restaurant/$business.json"
  # Edit the JSON with business-specific data
done
```

Each business gets its own unique URL with zero additional HTML.

## Deploying New Data

After adding JSON files to `data/`, re-deploy:

```bash
# Deploy a single industry (does NOT include data/ yet)
./deploy.sh restaurant

# Deploy all (updated — includes data/)
./deploy.sh all
```

## Best Practices

- **Slug format**: Use lowercase with hyphens (`the-boozy-griffin`, `careplus`). The system auto-formats slugs to business names: `the-boozy-griffin` → `The Boozy Griffin`.
- **Images**: Use absolute Unsplash URLs in JSON for gallery images and hero. The static assets (`assets/hero.jpg`) work as fallback.
- **Services style**: The system auto-detects the best rendering style based on industry: `menu` for restaurant/caterer, `pricing` for gym/coaching/salon, `cards` for all others.
- **Empty arrays**: Set `"gallery": []`, `"reviews": []`, etc. if not available. The section won't render.
- **Testing**: Always test both the static URL (`/portfolio/{industry}/`) and the personalized URL (`/portfolio/{industry}/?client=your-slug`).
