# Sitzplan – Wedding Seating Planner

Interactive wedding seating plan manager built with vanilla HTML/CSS/JS and a Python persistence backend.

## Tech Stack

- **Frontend:** Single-page app — `index.html`, `app.js` (~2500 LOC), `style.css` (~1720 LOC). No build step, no framework. Uses the Inter font via Google Fonts.
- **Backend:** `server.py` — a minimal Python `http.server` that serves static files and exposes REST APIs (`/api/state`, `/api/venues`) to persist venue states in the `states/` folder.
- **Startup:** `start.sh` — kills any existing server, ensures the `states/` directory exists, and launches `python3 server.py` on port 8000.

## Data Model (`state`)

All application state lives in a venue-specific JS object persisted as JSON under `states/<VenueName>.json`:

| Field             | Type       | Description                                                                             |
| ----------------- | ---------- | --------------------------------------------------------------------------------------- |
| `venueName`       | `string`   | Name of the venue (e.g. "Hauptsaal", "Agape", "Garten").                                |
| `venueWidth`      | `number`   | Venue width in cm (1 point = 1 cm, e.g. 1500 for 15.0 m).                               |
| `venueHeight`     | `number`   | Venue length/depth in cm (1 point = 1 cm, e.g. 1000 for 10.0 m).                         |
| `guests`          | `Guest[]`  | All guests. Each has `id`, `firstName`, `lastName`, `dietId`, `needsHighChair`, `age`, `tableId`, `seatNumber`. |
| `dietOptions`     | `Diet[]`   | Configurable diet/allergy options. Each has `id`, `name`, `color`.                      |
| `tables`          | `Table[]`  | All tables. Each has `id`, `number` (display label), `seatCount`, `x`, `y` (canvas pos), `fixed` (boolean), `seatsFixed` (boolean). |
| `families`        | `Family[]` | Family groups. Each has `id`, `name`, `nameSourceGuestId`, `memberIds[]`.               |
| `blueprints`      | `Blueprint[]` | Saved table template blueprints.                                                     |
| `nextTableNumber` | `number`   | Legacy counter (actual numbering now uses gap-filling logic).                            |

### Guest Properties

- **`age`**: `'adult'` (default), `'under3'`, `'under6'`, `'under12'`
- **`dietId`**: References a `dietOptions[].id`. Default diet options: None, Vegetarian, Vegan, Gluten-free.
- **`needsHighChair`**: Boolean. Rendered as a **square** instead of a circle on the venue SVG.
- **`tableId` / `seatNumber`**: Assignment. `null` when unassigned.

### Table Properties

- **`fixed`**: Boolean. Set by the "Fixiert" checkbox in the split-view group header. When true: the group header gets a green border, the table center circle on the venue SVG gets a green border, and the group defaults to collapsed.
- **`seatsFixed`**: Boolean. Set by the "Fixiert" checkbox in the Table Detail Modal. When true: all seat circles/rects on the venue SVG get green borders. Completely independent from `fixed`.

---

## Application Views

The app has a two-panel layout: a **Venue Panel** (left) and a **Guest Panel** (right). The guest panel switches between two modes depending on whether the venue is visible or collapsed.

### 1. Split Venue View (default — venue visible)

**Layout:** Venue SVG on the left, narrow guest list on the right (fixed 480px width).

#### Venue Canvas (SVG)
- Renders all tables as draggable circular/rectangular groups on an SVG canvas with a 50cm / 1m dot grid.
- **1 coordinate point = 1 cm**: Dimensions align 1:1 with table sizes configured in the Blueprint Builder (`seatR = 30` cm).
- **Configurable Venue Size**: Set in cm / meters via the header button `📐` or the venue dropdown menu. Cannot shrink below the bounding envelope of placed tables.
- Each table shows a center circle or rectangle with the table number/name and surrounding seats.
- **Seats** are colored by diet (diet color fill) or left empty (hollow). High-chair seats render as rounded squares instead of circles.
- **`table.fixed`** → table center circle gets a green border + fill tint.
- **`table.seatsFixed`** → all seat circles/rects get green borders.
- **Drag & drop:** Tables can be repositioned by dragging. Positions are saved on mouse-up.
- **Click → Table Detail Modal** (see below).
- **Hover tooltips on seats:** guest name, table/seat number, diet, and high-chair status.
- **Hover tooltip on table center circle:** compact list of all seated guests (seat # · Name), sorted by seat number. Appears to the right of the table circle. Not shown for empty tables.
- **Legends** (top-right overlay, constant screen size decoupled from 1cm venue scale):
  - *Diet legend* — color swatches for all diets in use on seated guests.
  - *Seat-type legend* — normal seat + Hochstuhl (high chair).
  - *Age summary legend* — counts of guests by age category with a total.

#### Guest List (grouped by table)
- Guests are organized into collapsible groups: one per table (sorted by table number) + an "Nicht zugeteilt" (unassigned) group at the bottom.
- Each group header shows the table name and a guest count (e.g. `5/8`).
- **"Fixiert" checkbox** in each table group header: sets `table.fixed`. When checked, the header gets a green border and the table center on the SVG turns green. Fixed tables default to **collapsed**; user can still expand/collapse manually.
- **"⬇ Alle ausklappen" / "⬆ Fixierte einklappen" toggle button** (top of panel, split view only): first press force-expands all groups; second press clears explicit states so defaults (fixed = collapsed, rest = expanded) resume.
- **Family grouping in split view:** Within each table group, guests belonging to the same family are wrapped in a `family-group-block` — a subtle bordered container with a pill-shaped label in the top-left corner.
  - If all family members are at the same table, the pill is a **native `<select>`** that allows bulk-reassigning the family to a different table.
  - If members are split across tables, a static "split tables" warning pill is shown instead.
- **Individual guest cards (compact):** Show the guest name, a table-assignment dropdown, and a diet color dot. No inline editing of diet/age/HC in this mode.
- **Single (non-family) guests** in split view are rendered in a card visually identical to the family card layout (with a 👤 icon).

#### Venue Toolbar
- Buttons to add tables: `+ 7er Tisch`, `+ 8er Tisch`, `+ 10er Tisch`. New tables appear near the canvas center with a random offset.
- Table chips have been **removed**. Tables are managed and deleted via the Table Detail Modal.

---

### 2. Full Table View (venue collapsed)

Triggered by clicking **"Venue ausblenden"** (hide venue). The venue SVG and toolbar disappear, and the guest panel expands to fill the full width.

**Additional header controls appear:**
- **"Familien gruppieren" toggle** — when on, family members are rendered as collapsible family cards at the top of the list; when off (or when a filter is active), all guests are shown individually.
- **Name filter** — text input that filters guests by first/last name. Automatically disables family grouping while filtering.
- **"➕ Gast hinzufügen"** — opens the Add Guest modal.

**Guest list layout:** A spreadsheet-like table with a sticky column header row:

| Vorname | Nachname | Tisch | Platz | HS  | Alter | Diät | Familie |
| ------- | -------- | ----- | ----- | --- | ----- | ---- | ------- |

- **First / Last name:** Inline-editable text inputs (save on blur or Enter, revert on Escape).
- **Tisch (Table):** Dropdown of available tables (only tables with enough free seats are shown).
- **Platz (Seat):** Dropdown of seats 1–N. Already-taken seats are marked with `⇄`. Selecting an occupied seat triggers a **seat swap** — the previous occupant gets the current guest's old seat.
- **HS (High Chair):** Yes/No dropdown.
- **Alter (Age):** Dropdown: Erwachsen, < 3 J., < 6 J., < 12 J.
- **Diät (Diet):** Dropdown of all configured diet options.
- **Familie (Family):** Either a searchable guest picker to create/link a family, or a static label if the guest is already in a family.
- **🗑️ Delete button** per row (with confirmation).

**Family cards** (when grouping is enabled):
- Collapsible card with a 👨‍👩‍👧‍👦 icon, family name, and member count.
- Expanded view shows all members in a sub-table with radio buttons to select the name-source member (the family's display name derives from this guest).
- Each member row has a ✕ button to remove from family.
- **Actions bar:** A searchable picker to add members, and a "Familie auflösen" (dissolve) button.
- Families auto-dissolve when reduced to ≤ 1 member.

---

### 3. Table Detail Modal

Opened by clicking a table on the venue SVG. A wide (1250px) modal with two columns:

| Left Column                | Right Column                            |
| -------------------------- | --------------------------------------- |
| Large SVG rendering of the table (400×340) with diet-colored seats, seat numbers, and guest names | Scrollable guest list with the full column layout (same as Full Table View) |

**Header controls (above both columns):**
- **Rename table:** Text input saves automatically on blur, Enter, or modal close. If the name conflicts with another table, the numbers are swapped.
- **Tischvorlage / Größe:** Dropdown listing both standard presets (7, 8, 10) and saved custom Vorlagen (blueprints). Options smaller than the current seated count are disabled. On change, seat numbers are **compacted** (guests renumbered onto active seats in order) so no one ends up on a non-existent or disabled seat.
- **Status badges:** "Gäste platziert" (`table.fixed`) and "Plätze fixiert" (`table.seatsFixed`) styled as aligned toggle badges.
- **"🗑️ Tisch entfernen"** button: removes the table (with confirmation if guests are assigned), then closes the modal.

**Detail SVG features:**
- **Overlay actions:** "🔧 Bearbeitungsmodus" toggle (and "↻ Drehen" for rectangular tables) placed directly in the top-left corner of the table canvas; zoom controls (- / + / Fit) placed in the top-right corner.
- Each seat always shows its number (small, above the guest name).
- **Click-to-swap:** Click a seat to select it (amber/gold highlight ring + glow). Click the same seat to deselect. Click a different seat while one is selected → swaps the two guests (works for occupied↔occupied, occupied↔empty, empty↔empty), saves, and re-renders. Selection is cleared on modal close.

**Guest list:**
- Shows only guests assigned to this table, sorted by seat number.
- All inline editing (name, table, seat, HC, age, diet) works identically to the full table view.
- Delete button per guest.

---

### 4. Print View

Triggered by the **"🖨️ Venue drucken"** button in the header (`window.print()`).

The print stylesheet (`@media print`) orchestrates a multi-page document:

#### Page 1 — Venue Overview
- The `beforeprint` event handler **crops the SVG viewBox** tightly around the actual tables (with 80px padding).
- **Color mapping for paper:** Dark-mode fills become white/light-grey; table centers (both normal and `fixed`) become `#f3f4f6`; seat borders (both normal and `seatsFixed`) become `#d1d5db`; text becomes `#374151`; legend overlay prints crisp with white background and light borders. Diet colors are preserved with `print-color-adjust: exact`.
- The `afterprint` handler restores the original viewBox.

#### Pages 2–N — Per-Table Detail Pages
- One page per table (sorted by table number), generated by `renderPrintTablePages()` into a hidden `#print-table-pages` div.
- Each page contains:
  - **Heading:** "Tisch N" with a purple underline.
  - **Layout:** SVG of the table (left, 560px) + guest list table (right, flexible).
  - **Guest table columns:** Platz, Vorname, Nachname, Alter.
  - **Legend** (below the guest table): Shows diet color swatches and high-chair symbol only for diets/HC actually in use at that table.
- The SVG is a simplified version for print: light backgrounds, crisp borders, seat numbers above guest names, first name + last initial displayed.

**Hidden elements during print:** App header, guest panel, venue toolbar, modals, tooltips, grid dots.

---

## Modals

### Add Guest Modal
- Fields: Vorname, Nachname, Diät (dropdown), Hochstuhl (checkbox).
- Opens only in full table view.

### Diet Config Modal
- Lists all diet options with color swatches; non-"None" options can be removed.
- Add new diet: name input + color picker. Colors cycle through a preset palette of 10 harmonious colors.
- Removing a diet resets all guests using it to "None".

### Blueprint Builder Modal (Tischvorlagen)
- **Direct Seat Disabling:** Seat editing in the blueprint preview is always active. Clicking seats toggles them disabled (ghosted with ✕). Disabled seats are preserved when tweaking dimensions and carry over to placed tables.
- **Placed Table Reactivation:** Tables created from blueprints inherit `disabledSeats`. When opened in the Table Detail Modal, activating Bearbeitungsmodus allows clicking disabled seats to re-enable them at any time.
- **Click-to-Edit Vorlagen:** Saved templates in the "Vorhandene Vorlagen" list are interactive. Clicking any blueprint loads its full configuration (name, shape, dimensions, disabled seats) into the editor, switches the save button to "Änderungen speichern", and highlights the active template. A "+ Neu" button allows resetting back to creating a new blueprint.
- **In-Use Protection:** Editing and deleting a template is only possible if there is currently no table of that type on the venue canvas. Templates in use display a lock icon (🔒) and disable click/delete interactions.

---

## Other Features

### CSV Import
- Accepts a CSV file with columns: first name, last name, high chair (optional: `yes`/`true`).
- No header row expected — all lines are parsed. Guests are appended to the existing list.

### Family System
- **Create:** Via the "Familie" column picker in full table view — select another guest or an existing family group to link.
- **Merge:** Linking a guest already in a family to another family merges them.
- **Name source:** Controlled by radio buttons in the expanded family card. The family display name is `firstName + lastName` of the source guest.
- **Dissolve:** Removes the family grouping; all guests become independent.
- **Split detection:** In split venue view, if family members are at different tables, the pill label shows "split tables" as a warning.

### Multi-Venue Persistence & Storage
- **Directory:** All state files live inside the `states/` directory (e.g. `states/Hauptsaal.json`, `states/Agape.json`).
- **Active Venue Tracker:** `states/_active.json` stores the currently active venue name.
- **REST Endpoints:**
  - `GET /api/venues` — lists all venues with summary stats (`tableCount`, `guestCount`) and `activeVenue`.
  - `GET /api/state?venue=<name>` — loads full state JSON for the specified venue (or active venue if omitted).
  - `POST /api/state?venue=<name>` — persists full state JSON for the specified venue.
  - `POST /api/venues/create` — creates a new venue state file (optional cloned guests/families/diets with unassigned seats).
  - `POST /api/venues/rename` — renames a venue state file and updates its internal `venueName`.
  - `POST /api/venues/delete` — deletes a venue state file (blocked if only 1 venue exists).
  - `POST /api/venues/active` — updates the active venue selection.
- Every state mutation triggers `saveState()` → `POST /api/state?venue=...`.
- Switching venues calls `switchVenue(venueName)` → reloads state and re-renders venue canvas, toolbars, guest lists, and print layouts.

### UI State (not persisted)
- `venues` — list of available venues and their stats.
- `activeVenue` — current venue name.
- `collapsedGroups` — which table groups are collapsed in split view.
- `expandedGuests` / `expandedGuestsDetail` — which guest cards are expanded (unused now since detail view is always inline).
- `expandedFamilies` — which family cards are expanded in full table view.
- `venueCollapsed` — whether the venue panel is hidden.
- `useFamilyGrouping` — whether family cards are shown in full table view.
- `allGroupsExpanded` — whether the "Alle ausklappen" button has force-expanded all split-view groups.
- `selectedDetailSeat` — the seat number currently selected for swap in the Table Detail Modal SVG (`null` when none selected).

---

## Modular Architecture Overview

### CSS Modules (`css/`)
- `base.css`: CSS reset, design tokens/variables, base form controls & button styles.
- `layout.css`: App header, panel containers, responsive breakpoints.
- `venue-selector.css`: Venue dropdown selector in header, badge styles, create/rename modal dialogs.
- `venue.css`: Canvas container, SVG styles, table circles/rects, seats, tooltips.
- `guests.css`: Split-view accordion groups, compact cards, family blocks, spreadsheet table.
- `modals.css`: Modal backdrops, shared modal containers, searchable picker component.
- `table-detail.css`: Table detail modal layout, zoom bar, edit-mode toggles.
- `blueprint.css`: Blueprint builder modal layout, dimension controls, toolbar chips.
- `print.css`: Multi-page print layout, paper color mapping.
- `style.css`: Master `@import` registry.

### JS Modules (`js/`)
- `app.js`: Clean ~50 LOC coordinator bootstrap and initial state loader.
- `core/`:
  - `state.js`: Single source of truth (`state`, `uiState`), multi-venue REST API (`loadState`, `saveState`, `switchVenue`, `createVenue`, `renameVenue`, `deleteVenue`).
  - `events.js`: Event pub/sub bus (`state:loaded`, `venues:updated`, etc.).
  - `constants.js`: Canvas dimensions, default diet & age options, preset color palettes.
- `utils/`:
  - `dom.js`: `$`, `escHtml`, `getAdjustedFontSize`.
  - `geometry.js`: Trigonometry, orbits, table center sizes, collision detection, empty space finder.
  - `seating.js`: Seating capacity queries, table assignment, seat number active sets.
  - `family.js`: Family CRUD operations and membership resolution.
- `components/`:
  - `searchable-picker.js`: Reusable guest and group picker dropdown.
- `features/`:
  - `venue/`: `venue-selector.js`, `venue-canvas.js`, `venue-toolbar.js`, `venue-tooltips.js`.
  - `guest-list/`: `guest-list.js`, `split-view.js`, `table-view.js`, `guest-row.js`, `add-guest-modal.js`.
  - `table-detail/`: `table-detail-modal.js`, `table-detail-svg.js`, `table-detail-edit.js`.
  - `blueprint-builder/`: `blueprint-modal.js`, `blueprint-preview.js`.
  - `config-modals/`: `diet-modal.js`, `age-modal.js`.
  - `print/`: `print-manager.js`, `print-pages.js`.

### Backend & Environment
- `server.py`: Python HTTP server with JSON persistence & venue management REST API (`/api/state`, `/api/venues`).
- `start.sh` / `start.command` / `start.bat`: Startup scripts for Linux, macOS, and Windows that launch the server and open the browser.
- `install.sh` / `install.command` / `install.bat`: One-time setup scripts for Linux, macOS, and Windows.
- `states/`: Dedicated directory for persisted venue state files (`states/<VenueName>.json`) and `states/_active.json`.
- `index.html`: Streamlined host application shell (~90 LOC).

