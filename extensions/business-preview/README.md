# Business Preview Extension

A standalone tool that generates live previews of demo websites for any business, using the existing Ravya Works demo templates.

## How It Works

The extension reads the existing industry templates (`demos/{industry}/config.js`) and asset structures at runtime via `fetch()`. It never modifies any existing project file.

1. Select an industry (restaurant, hospital, school, etc.)
2. Fill in business details (name, tagline, description, phone, etc.)
3. See a live preview of the website rendered using the existing framework (`app.js`)

## Architecture

```
extensions/business-preview/
├── README.md              # This file
├── industries.json         # Industry metadata (names, themes, slugs)
├── index.html             # Main preview generator page
├── style.css              # Preview builder styles (dark theme)
└── preview.js             # Core preview rendering logic
```

## Usage

Open `extensions/business-preview/index.html` in a browser (served via any HTTP server).

## Design Principles

- **Read-only access**: The extension reads existing project files but never writes to them.
- **Zero modifications**: No existing HTML, CSS, JS, or templates are changed.
- **Self-contained**: All code lives under `extensions/business-preview/`.
- **Reversible**: Deleting `extensions/business-preview/` restores the project exactly.
