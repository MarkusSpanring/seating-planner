# Sitzplan – Wedding Seating Planner

Interactive wedding seating plan manager built with vanilla HTML/CSS/JS and a Python persistence backend.

## Tech Stack

- **Frontend:** Single-page app — `index.html`, `app.js` (~2500 LOC), `style.css` (~1720 LOC). No build step, no framework. Uses the Inter font via Google Fonts.
- **Backend:** `server.py` — a minimal Python `http.server` that serves static files and exposes a REST API (`GET/POST /api/state`) to persist all state in `sitzplan_state.json`.
- **Startup:** `start.sh` — kills any existing server, ensures the state file exists, and launches `python3 server.py` on port 8000.

## Data Model (`state`)

All application state lives in a single JS object persisted as JSON:

| Field             | Type       | Description                                                                             |
| ----------------- | ---------- | --------------------------------------------------------------------------------------- |
| `guests`          | `Guest[]`  | All guests. Each has `id`, `firstName`, `lastName`, `dietId`, `needsHighChair`, `age`, `tableId`, `seatNumber`. |
| `dietOptions`     | `Diet[]`   | Configurable diet/allergy options. Each has `id`, `name`, `color`.                      |
| `tables`          | `Table[]`  | All tables. Each has `id`, `number` (display label), `seatCount`, `x`, `y` (canvas pos), `fixed` (boolean), `seatsFixed` (boolean). |
| `families`        | `Family[]` | Family groups. Each has `id`, `name`, `nameSourceGuestId`, `memberIds[]`.               |
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
- Renders all tables as draggable circular groups on a 1200×700 SVG canvas with a dot grid.
- Each table shows a center circle with the table number and surrounding seat circles.
- **Seats** are colored by diet (diet color fill) or left empty (hollow). High-chair seats render as rounded squares instead of circles.
- **`table.fixed`** → table center circle gets a green border + fill tint.
- **`table.seatsFixed`** → all seat circles/rects get green borders.
- **Drag & drop:** Tables can be repositioned by dragging. Positions are saved on mouse-up.
- **Click → Table Detail Modal** (see below).
- **Hover tooltips on seats:** guest name, table/seat number, diet, and high-chair status.
- **Hover tooltip on table center circle:** compact list of all seated guests (seat # · Name), sorted by seat number. Appears to the right of the table circle. Not shown for empty tables.
- **Legends** (top-right of canvas):
  - *Diet legend* — color swatches for all diets in use on seated guests.
  - *Seat-type legend* — circle = normal seat, square = Hochstuhl (high chair).
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
- **Rename table:** Text input + "Name aktualisieren" button. If the name conflicts with another table, the numbers are swapped.
- **Tischgröße:** Dropdown (7 / 8 / 10). Options smaller than the current seated count are disabled. On change, seat numbers are **compacted** (guests renumbered 1, 2, 3… in order) so no one ends up on a non-existent seat.
- **Fixiert checkbox:** Controls `table.seatsFixed`. When checked, all seat circles/rects in the venue SVG get green borders. Independent from `table.fixed`.
- **"🗑️ Tisch entfernen"** button: removes the table (with confirmation if guests are assigned), then closes the modal.

**Detail SVG features:**
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
- The full venue SVG is printed in **landscape** orientation, filling 100vw × 98vh.
- The `beforeprint` event handler **crops the SVG viewBox** tightly around the actual tables (with 80px padding) and extends it to include the legends.
- **Color mapping for paper:** Dark-mode fills become white/light-grey; table centers (both normal and `fixed`) become `#f3f4f6`; seat borders (both normal and `seatsFixed`) become `#d1d5db`; text becomes `#374151`; legend backgrounds become white with light borders. Diet colors are preserved with `print-color-adjust: exact`.
- The `afterprint` handler restores the original viewBox and legend positions.

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

### Persistence
- Every mutation calls `saveState()` → `POST /api/state` with the full state JSON.
- On load, `loadState()` → `GET /api/state` reads from `sitzplan_state.json`.

### UI State (not persisted)
- `collapsedGroups` — which table groups are collapsed in split view.
- `expandedGuests` / `expandedGuestsDetail` — which guest cards are expanded (unused now since detail view is always inline).
- `expandedFamilies` — which family cards are expanded in full table view.
- `venueCollapsed` — whether the venue panel is hidden.
- `useFamilyGrouping` — whether family cards are shown in full table view.
- `allGroupsExpanded` — whether the "Alle ausklappen" button has force-expanded all split-view groups.
- `selectedDetailSeat` — the seat number currently selected for swap in the Table Detail Modal SVG (`null` when none selected).

---

## File Overview

| File                     | Purpose                                      |
| ------------------------ | -------------------------------------------- |
| `index.html`             | DOM structure, modals, hidden print container |
| `app.js`                 | All application logic (IIFE, ~2530 lines)    |
| `style.css`              | Dark-mode styles + print stylesheet          |
| `server.py`              | Python HTTP server with JSON persistence API |
| `start.sh`               | Startup script (kill old, ensure state, run) |
| `sitzplan_state.json`    | Persisted application state                  |
| `guests.csv`             | Example CSV import file                      |
| `sitzplan.jpeg`          | Reference venue layout image                 |
| `instructions.md`        | Original feature requirements                |
