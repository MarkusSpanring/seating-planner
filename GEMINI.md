# Sitzplan – Architecture & Contributor Guide

Welcome to **Sitzplan**! This document serves as the primary technical entrypoint for developers and contributors. It provides an architectural overview, data models, interaction workflows, and an exhaustive directory/file catalog explaining what every module implements.

---

## 📖 General Description & Purpose

**Sitzplan** is a fast, local-first, privacy-focused interactive wedding and event seating planner.

### Core Philosophy
1. **Zero External Dependencies / No Build Step:** Built with pure vanilla HTML5, CSS3, and JavaScript (ES Modules). No Node.js build pipeline, no Webpack/Vite, no frontend frameworks (React/Vue/Angular). Simply launch the server and edit files directly in your browser.
2. **100% Local & Private:** All data is persisted locally in readable JSON files inside the `states/` directory. No cloud accounts, databases, or external analytics.
3. **Metric Scale (1 point = 1 cm):** The floor plan canvas coordinates align 1:1 with real-world physical measurements (e.g. 1500 × 1000 cm = 15.0 × 10.0 m room).
4. **Dual Reactive Views:** 
   - **Split Venue View:** Graphical SVG venue plan on the left + table-grouped accordion guest list on the right.
   - **Full Table View:** High-speed 2D Excel-like spreadsheet grid with arrow-key keyboard navigation, instant quick-add row, inline cell editing, and visual family grouping blocks.

---

## 🛠️ Tech Stack & Development Workflow

- **Frontend:** Pure HTML5, CSS3 (CSS Variables, CSS Grid, Flexbox), Vanilla JS (ES6+ Modules). Typography: Google Inter font.
- **Backend:** `server.py` — standard library Python 3 `http.server` (~320 LOC). Serves static assets and exposes JSON REST endpoints (`/api/state`, `/api/venues`).
- **Start Scripts:**
  - Linux: `./start.sh`
  - macOS: `./start.command`
  - Windows: `start.bat`
- **Setup/Install Scripts:**
  - Linux: `./install.sh`
  - macOS: `./install.command`
  - Windows: `install.bat`
- **Validating Code:**
  - Syntax check JS: `node -c <file.js>`
  - Syntax check Python: `python3 -m py_compile server.py`

---

## 🗄️ Data Model (`state`)

Each venue has its own state object persisted as JSON under `states/<VenueName>.json`. The active venue is tracked in `states/_active.json`.

```json
{
  "venueName": "Hauptsaal",
  "venueWidth": 1500,
  "venueHeight": 1000,
  "tables": [...],
  "guests": [...],
  "families": [...],
  "dietOptions": [...],
  "ageGroups": [...],
  "blueprints": [...],
  "nextTableNumber": 1
}
```

### Key Entities

#### 1. Table (`state.tables[]`)
| Field | Type | Description |
| --- | --- | --- |
| `id` | `number` | Unique timestamp ID |
| `number` | `string|number` | Display label/number (e.g. `1`, `Brauttisch`) |
| `shape` | `'round' \| 'rect'` | Table shape |
| `seatCount` | `number` | Total number of seats (including disabled) |
| `x`, `y` | `number` | Center coordinates on canvas (in cm) |
| `r` | `number` | Radius (in cm) for circular tables |
| `w`, `h` | `number` | Width & height (in cm) for rectangular tables |
| `seatsLong`, `seatsShort` | `number` | Seat layout for rectangular tables |
| `rotation` | `number` | Rotation angle in degrees (`0`, `90`, `180`, `270`) |
| `fixed` | `boolean` | "Gäste platziert" (green center circle; collapses group by default) |
| `seatsFixed` | `boolean` | "Plätze fixiert" (green border on seat circles; independent from `fixed`) |
| `disabledSeats` | `number[]` | 1-indexed seat numbers that are disabled (ghosted/unused) |
| `blueprintId` | `string` | ID of template from which the table was spawned |

#### 2. Guest (`state.guests[]`)
| Field | Type | Description |
| --- | --- | --- |
| `id` | `number` | Unique timestamp ID |
| `firstName` | `string` | Guest first name |
| `lastName` | `string` | Guest last name |
| `address` | `string` | Postal/street address (optional) |
| `dietId` | `string` | Reference to `dietOptions[].id` (`'none'`, `'vegetarian'`, etc.) |
| `needsHighChair` | `boolean` | Renders seat as a square instead of a circle |
| `age` | `string` | Reference to `ageGroups[].id` (`'age-adult'`, `'age-under3'`, etc.) |
| `tableId` | `number\|null` | Assigned table ID (`null` = unassigned) |
| `seatNumber` | `number\|null` | 1-indexed seat number at `tableId` (`null` = unassigned) |

#### 3. Family (`state.families[]`)
| Field | Type | Description |
| --- | --- | --- |
| `id` | `string` | Unique ID (e.g. `'fam-1712345678'`) |
| `name` | `string` | Display name (derived from `nameSourceGuestId`) |
| `nameSourceGuestId`| `number` | Guest ID whose name defines the family name |
| `memberIds` | `number[]` | Array of member guest IDs |

#### 4. Blueprint (`state.blueprints[]`)
Custom reusable table templates configured in the Blueprint Builder:
- `id`: Unique template ID.
- `name`: Blueprint display name (e.g. "8er Rundtisch", "Brauttisch Lang").
- `shape`: `'round'` or `'rect'`.
- `seatCount`, `r`, `w`, `h`, `seatsLong`, `seatsShort`.
- `disabledSeats`: Array of default disabled seats.

#### 5. Diet Option (`state.dietOptions[]`)
- `id`: Diet identifier (`'none'`, `'vegetarian'`, `'vegan'`, `'gluten-free'`, custom IDs).
- `name`: Display label.
- `color`: CSS hex color used for seat fills and legend swatches.

#### 6. Age Group (`state.ageGroups[]`)
- `id`: Age bracket identifier (`'age-adult'`, `'age-under12'`, `'age-under6'`, `'age-under3'`).
- `name`: Display label.
- `badge`: Short symbol/emoji or label.

---

## 🖥️ Application Views & Key User Flows

### 1. Split Venue View (Default)
- **Venue SVG Canvas (Left):**
  - Dot grid (50cm minor, 1m major).
  - Accurate physical collision detection: tables cannot overlap, and overlap calculations strictly **ignore disabled seats**.
  - Tables can be dragged freely; positions are auto-saved on mouse-up.
  - Hover tooltips: on seats (guest name, diet, high chair) and on table centers (compact seated guest summary).
  - Floating screen-fixed legends (Diäten, Sitzplatz-Typen, Altersgruppen-Zusammenfassung).
  - Toolbar with dynamic `+ <Vorlage>` spawner buttons and "✏️ Vorlage erstellen" button. If a venue has no templates, an empty-state prompt button appears in the canvas center.
- **Guest Panel (Right, fixed 480px width):**
  - Collapsible accordion groups for each table + "Nicht zugeteilt" group.
  - "Fixiert" checkbox per table header.
  - Family container blocks with pill badges: bulk table re-assignment dropdown if all members are together; "split tables" warning if separated.
  - "⬇ Alle ausklappen" / "⬆ Fixierte einklappen" toggle button.

### 2. Full Table View (Spreadsheet Grid)
- Triggered by **"Venue ausblenden"**.
- Full-width Excel-like interactive data table with 8 core columns:
  `Vorname | Nachname | Adresse | Tisch | Platz | HS | Alter | Diät | [Actions]`
- **2D Keyboard Navigation:** Full arrow-key navigation (`ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`), `Tab` / `Shift+Tab` with row wrapping, and `Enter`. Active cell shows a purple focus ring.
- **Persistent Quick-Add Row:** Bottom `*` row instantiates a guest as soon as you start typing and immediately spawns a fresh empty row below. If text is cleared back to blank, the extra spawned row **automatically vanishes**.
- **Family Distinguishability:** Families are wrapped in distinct container blocks with a pill label (`👨‍👩‍👧‍👦 Familie <Name> (<Count>)`), soft background tint, and purple left stripe.
  - **`➕ Mitglied`** action button: reveals a searchable guest picker on-demand to add members.
  - **`✕ Auflösen`** action button: dissolves the family back into individual guests.
  - **Single Guests:** Feature a subtle `👨‍👩‍👧‍👦` action button in their row actions to link and form a new family on-demand.

### 3. Table Detail Modal
- Opened by clicking any table on the venue floor plan.
- **Left Column:** Enlarged SVG view of the table with seat numbers, guest names, and diet colors.
  - **Canvas Overlays:** "🔧 Bearbeitungsmodus" and "↻ Drehen" buttons in top-left; zoom controls (`-`, `+`, `Fit`) in top-right.
  - **Click-to-Swap:** Click a seat to highlight in amber, then click another seat to swap guests (occupied↔occupied, occupied↔empty, empty↔empty).
  - **Bearbeitungsmodus:** Click any seat to disable/ghost or re-enable it.
- **Right Column:** Guest list for this table with full inline editing.
- **Header Controls:** Inline auto-saving table rename, Vorlagen/Size dropdown (with automatic seat-compaction so no guests are orphaned), status badges ("Gäste platziert", "Plätze fixiert"), and delete table button.

### 4. Blueprint Builder Modal (Tischvorlagen)
- Opened via "✏️ Vorlage erstellen" in the venue toolbar.
- Configure round or rectangular table templates with custom dimensions in centimeters.
- Direct seat editing in live preview: click seats to toggle disabled status (✕).
- Saved templates list with click-to-edit, "+ Neu" reset, and in-use protection (locked 🔒 when placed on the venue floor plan).

### 5. Unified Settings Modal ("⚙️ Einstellungen")
- Two-column modal with sidebar navigation:
  - **Diäten & Allergien:** Configured diets with swatches and deletion; form to create new diets with name input, color picker, and real-time canvas updates.
  - **Altersgruppen:** Manage age categories for catering headcounts.
  - **Daten & CSV:** 1-click Excel-compatible CSV export (with UTF-8 BOM) and CSV file import.

### 6. Multi-Page Print & PDF Export
- Triggered by **"🖨️ Venue drucken"** (`window.print()`).
- **Page 1:** High-contrast, paper-optimized overview of the venue floor plan (tightly auto-cropped around actual placed tables).
- **Pages 2–N:** Dedicated single-page sheet per table featuring an enlarged table diagram, seat list, dietary summaries, and notes.

---

## 📁 Complete Codebase File Map

Below is an exhaustive catalog of every source file in the repository and its role:

```
sitzplan/
├── index.html                           # Single-page app host shell & HTML structure
├── server.py                            # Python 3 static file server & JSON REST API
├── start.sh / .command / .bat           # Launch scripts (Linux, macOS, Windows)
├── install.sh / .command / .bat         # Setup scripts (Linux, macOS, Windows)
├── README.md                            # End-user guide & quick-start manual
├── GEMINI.md                            # Contributor guide & architecture documentation
├── style.css                            # Master CSS file imports
├── states/                              # Persisted venue state JSON files
│   ├── _active.json                     # Name of currently active venue
│   └── <VenueName>.json                 # Venue state JSON files (e.g. Hauptsaal.json)
│
├── css/                                 # Modular CSS stylesheets
│   ├── base.css                         # CSS reset, design tokens, form controls, buttons
│   ├── layout.css                       # Header, dual-panel layout, responsive breakpoints
│   ├── venue.css                        # SVG canvas, dot grid, table shapes, seats, legends
│   ├── venue-selector.css               # Header venue dropdown menu & dialogs
│   ├── guests.css                       # Accordion groups, spreadsheet table, family blocks
│   ├── modals.css                       # Modal overlays, containers, settings 2-column layout
│   ├── table-detail.css                 # Table detail modal, overlay toolbars, seat styling
│   ├── blueprint.css                    # Blueprint builder modal layout & chips
│   └── print.css                        # Multi-page print stylesheet (@media print)
│
└── js/                                  # Modular JavaScript (ES6 Modules)
    ├── app.js                           # App coordinator bootstrap & state initialization
    │
    ├── core/                            # Core data management & events
    │   ├── constants.js                 # Dimensions, default diets/ages, color presets
    │   ├── events.js                    # Pub/sub event bus (events.on, events.emit)
    │   └── state.js                     # State store, UI state, REST API (load, save, switch)
    │
    ├── utils/                           # Pure utility functions
    │   ├── dom.js                       # DOM helpers ($, escHtml, adjusted font size)
    │   ├── geometry.js                  # Geometry, orbits, bounding boxes, collision detection
    │   ├── seating.js                   # Seating calculations, assignments, seat swapping
    │   └── family.js                    # Family CRUD, membership queries, name resolution
    │
    ├── components/                      # Reusable UI components
    │   └── searchable-picker.js         # Searchable dropdown guest/group picker
    │
    └── features/                        # Domain feature modules
        ├── venue/                       # Venue floor plan canvas & toolbars
        │   ├── venue-canvas.js          # SVG canvas rendering, table dragging, collision
        │   ├── venue-selector.js        # Header venue switcher, create, rename, delete
        │   ├── venue-size-modal.js      # Modal to adjust room dimensions (in cm)
        │   ├── venue-toolbar.js         # Dynamic template spawner buttons & canvas prompt
        │   └── venue-tooltips.js        # Hover tooltips on seats and table centers
        │
        ├── guest-list/                  # Guest list management
        │   ├── guest-list.js            # Coordinator: routes between split view & table view
        │   ├── guest-row.js             # Individual guest card & spreadsheet row renderer
        │   ├── split-view.js            # Accordion table groups & family containers
        │   ├── table-view.js            # Full spreadsheet grid, 2D arrow nav, quick-add row
        │   └── add-guest-modal.js       # Modal to create a new guest record
        │
        ├── table-detail/                # Table detail view & seat manipulation
        │   ├── table-detail-modal.js    # Coordinator for the 2-column detail modal
        │   ├── table-detail-svg.js      # Large interactive table SVG canvas with click-to-swap
        │   └── table-detail-edit.js     # Bearbeitungsmodus, seat toggling, rotation, resizing
        │
        ├── blueprint-builder/           # Table template editor
        │   ├── blueprint-modal.js       # Blueprint builder modal form & template list
        │   └── blueprint-preview.js     # Interactive SVG blueprint preview with seat disabling
        │
        ├── config-modals/               # Settings & configuration
        │   ├── settings-modal.js        # Unified 2-column settings modal (Diäten, Alter, CSV)
        │   ├── diet-modal.js            # Standalone diet manager (legacy/fallback)
        │   └── age-modal.js             # Standalone age manager (legacy/fallback)
        │
        └── print/                       # Printing & PDF generation
            ├── print-manager.js         # window.print handler, viewBox auto-crop
            └── print-pages.js           # Multi-page per-table detail sheet generator
```

---

## 🧩 Architectural Principles & Rules for Contributors

When writing or modifying code in this repository, strictly adhere to these conventions:

### 1. Vanilla JavaScript Only
- Do not introduce `npm`, `package.json`, or external bundle steps.
- Always use native ES modules (`import`/`export`).
- Use native DOM APIs (`document.createElement`, `classList`, `addEventListener`).

### 2. State Mutation & Rendering Pipeline
- All application data resides in `state` (`core/state.js`).
- Mutating UI state (e.g. which modal is open, which groups are collapsed) goes into `uiState` (not persisted to disk).
- **Persisting Changes:** Call `saveState()` to send changes to the backend. Call `saveAndRender()` to simultaneously save to disk and re-render the UI via the event bus.

### 3. Collision Detection & Metric Geometry
- **1 point = 1 cm**. Never mix arbitrary pixel scaling with table coordinate space.
- Table collision detection (`utils/geometry.js`): Table clearance and collisions are computed strictly based on **active/enabled seats**. Ghosted or disabled chairs must never trigger false-positive collision boundaries.

### 4. Full Table View Navigation
- The spreadsheet view (`js/features/guest-list/table-view.js`) uses dynamic `data-grid-row` and `data-grid-col` attributes. Keep keyboard navigation resilient to added/removed columns.
- The quick-add row must remain at the bottom: when typing begins, a new guest record is added to `state.guests` and the next row spawns. If cleared back to blank, it must clean up and restore the single empty line.

### 5. Multi-Venue Safety
- Never assume `Hauptsaal` is the only venue. Always reference `uiState.activeVenue` and use `core/state.js` functions (`switchVenue`, `createVenue`, `deleteVenue`).
