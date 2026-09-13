# Sitzplan – Wedding Seating Planner 💍🥂

A fast, interactive, and private seating planner for weddings and events. Built with vanilla HTML/CSS/JavaScript and a zero-dependency local Python backend.

All your data is saved **100% locally on your computer** in the `states/` folder. No accounts, no cloud servers, no subscriptions, and completely offline-capable.

---

## 🚀 Quick Start Guide (For Everyone)

You do **not** need any programming, git, or terminal experience to use Sitzplan! Just follow the simple 3-step guide below for your operating system.

---

### Step 1: Download the App

You have two simple ways to get Sitzplan:

- **Option A (Simplest for beginners — ZIP Download):**
  1. On the [GitHub page](https://github.com/MarkusSpanring/seating-planner), click the green **`<> Code`** button near the top right.
  2. In the dropdown, click **`Download ZIP`**.
  3. Locate the downloaded file in your `Downloads` folder (`seating-planner-main.zip`).
  4. **Extract (unzip) the file:**
     - **Windows:** Right-click the `.zip` file ➔ click **Extract All...** ➔ click **Extract**.
     - **Mac:** Double-click the `.zip` file (macOS extracts it automatically).
     - **Linux:** Right-click the `.zip` file ➔ click **Extract Here**.
  5. Open the extracted folder. You will see files like `install.bat`, `start.bat`, `update.bat`, etc.

- **Option B (For users familiar with Git):**
  ```bash
  git clone https://github.com/MarkusSpanring/seating-planner.git
  cd seating-planner
  ```

---

### Step 2 & 3: Installation & Starting the App

Choose your operating system:

<details open>
<summary><h3>🪟 Windows (Click to expand / collapse)</h3></summary>

#### 1. One-Time Setup
- Double-click **`install.bat`**.
- A black window will appear:
  - The script checks for **Python 3** and **Git** (Git is used for 1-click updates).
  - If Python or Git is missing, the script offers to install them automatically, or opens the official download page.
- **Important Note for Python Installation:**
  > When installing Python, make sure to check the box at the bottom of the installer:  
  > **☑️ Add python.exe to PATH**
- If you downloaded via ZIP, the script automatically links your folder to the update channel so you can receive future updates with 1 click!
- Once complete, press any key to close the window.

> **Note on Windows SmartScreen:** If Windows displays a blue pop-up saying *"Windows protected your PC"*, click **"More info"** and then **"Run anyway"**. This is a standard Windows prompt for downloaded scripts.

#### 2. Starting the App
- Double-click **`start.bat`**.
- The server will start, and your default web browser (Chrome, Edge, Firefox, etc.) will **automatically open** to:  
  👉 **http://localhost:8000**
- *Keep the black command window open while you use Sitzplan.*

#### 3. Stopping the App
- When finished, simply close your browser tab and close the black command window. All your changes are saved automatically!

</details>

<details open>
<summary><h3>🍎 Mac / macOS (Click to expand / collapse)</h3></summary>

#### 1. One-Time Setup
- Double-click **`install.command`**.
- A Terminal window will open and verify that Python 3 and Git are installed.
  - Python 3 is pre-installed on most modern Macs. If missing, the official installer page will open.
  - If Git is missing, macOS will prompt you to install Apple Developer Tools with one click.
- The script automatically configures launch permissions and sets up the update channel.
- Press **Enter** when prompted to close the window.

> **Note on macOS Security (Gatekeeper):**  
> If macOS displays a message saying the script *"cannot be opened because it is from an unidentified developer"*:
> 1. Right-click (or hold <kbd>Control</kbd> and click) on **`install.command`**, `start.command`, or `update.command`.
> 2. Click **Open** from the menu.
> 3. In the confirmation dialog, click **Open**.  
> *(You only need to do this the very first time!)*

#### 2. Starting the App
- Double-click **`start.command`**.
- A Terminal window will open, and your web browser will **automatically open** to:  
  👉 **http://localhost:8000**
- *Keep the Terminal window open while working.*

#### 3. Stopping the App
- When done, close your browser and close the Terminal window (or press <kbd>Ctrl</kbd> + <kbd>C</kbd> in Terminal).

</details>

<details open>
<summary><h3>🐧 Linux (Click to expand / collapse)</h3></summary>

#### 1. One-Time Setup
- Open your terminal in the extracted folder and run:
  ```bash
  ./install.sh
  ```
  *(Verifies Python 3 and Git; shows exact package manager commands if anything is missing).*

#### 2. Starting the App
- Run:
  ```bash
  ./start.sh
  ```
- Your web browser will **automatically open** to:  
  👉 **http://localhost:8000**

#### 3. Stopping the App
- Press <kbd>Ctrl</kbd> + <kbd>C</kbd> in your terminal.

</details>

---

## 🔄 How to Update Sitzplan

Whenever new features or bug fixes are released, you can update Sitzplan in seconds **without losing any of your data**!

### Method 1: In the Browser (Easiest!)
1. Open Sitzplan and click **⚙️ Einstellungen** in the top navigation bar.
2. Click the **🔄 Updates & Info** tab on the left.
3. Click **"🔍 Auf Updates prüfen"**.
4. If an update is available, click **"📥 Jetzt aktualisieren"**.
5. The application will automatically create a backup of your data, download the latest version, and refresh your browser!

### Method 2: Desktop 1-Click Update Script
If the app is closed, you can update directly from your computer:
- **Windows:** Double-click **`update.bat`**.
- **Mac:** Double-click **`update.command`**.
- **Linux:** Run **`./update.sh`**.

> **🛡️ Data Safety Guarantee:**  
> Your seating plans, venues, tables, and guests are saved in the `states/` folder.  
> The update mechanism **never touches or overwrites your data**. In addition, every update automatically creates a timestamped safety backup (e.g. `states_backup_.../`).

---

## ❓ Frequently Asked Questions & Troubleshooting

### The browser didn't open automatically. What should I do?
Just open your favorite browser (Chrome, Safari, Edge, Firefox) and type:
`http://localhost:8000` into the address bar, then press Enter.

### Where is my data saved? Can I make backups?
All tables, guests, venues, and custom table blueprints are saved as readable `.json` files inside the **`states/`** folder (e.g. `states/Hauptsaal.json`).
- Your changes are saved **instantly in real time** as you work.
- To make a backup, simply make a copy of the `states/` folder and store it on a USB drive or cloud drive.

### Can I plan multiple venues or rooms (e.g., Dinner Hall, Garden, Reception)?
Yes! Sitzplan supports multi-venue management. Click the venue name in the top navigation bar to create new rooms, switch between venues, or rename them.

### Can multiple people work on this at the same time?
Because Sitzplan runs locally on your computer, it is designed for a single user at a time on one machine. If you want someone else to work on the seating plan, simply send them the project folder including your `states/` folder!

---

## 🎨 Overview & How to Use Sitzplan

The application offers two versatile views:
- **Split Venue View (Default):** A visual graphical floor plan on the left and an accordion table-grouped guest list on the right.
- **Full Table View:** Click **"Venue ausblenden"** to hide the canvas and expand into an Excel-like interactive spreadsheet grid with 2D arrow-key navigation, quick-add row, and inline editing.

---

### 1. Managing Tables & Floor Plan
- **Add Tables via Blueprints (Tischvorlagen):** Design custom circular or rectangular tables with exact dimensions (in cm) and interactive seat disabling in the **Blueprint Builder**. Placed tables can be spawned near the canvas center with one click via `+ <Vorlage>`. If a venue has no templates yet, a helpful prompt appears in the canvas center to create your first template.
- **Move Tables:** Click and drag the center of any table to reposition it freely on the venue canvas (with collision detection and automatic canvas boundary expansion).
- **Table Detail Modal:** Click on any table to open its detailed management view:
  - **Inline Renaming:** Edit the table label directly; changes save automatically on blur, Enter, or modal close.
  - **Change Blueprint / Size:** Switch between saved blueprints (guests are safely compacted onto active seats).
  - **Status Badges:**
    - **Gäste platziert (`table.fixed`):** Locks the guest group assigned to the table; turns the table center green on the floor plan.
    - **Plätze fixiert (`table.seatsFixed`):** Locks specific seat assignments; all seat circles receive a green border.
  - **Bearbeitungsmodus (Edit Mode):** Toggle seat editing right inside the table canvas overlay to disable or re-enable individual chairs (e.g. for table legs, structural pillars, or asymmetric seating).
  - **Rotate Table:** Rotate rectangular tables by 90° with a single click while preserving guest assignments.
  - **Delete Table:** Remove a table (with confirmation if guests are seated).

### 2. Placing Guests & Swapping Seats
- **Interactive Click-to-Swap:** In the Table Detail Modal SVG, click any seat circle to select it (highlighted with an amber ring), then click any other seat to instantly swap the two guests (works for occupied↔occupied, occupied↔empty, empty↔empty).
- **Dropdown Assignment:** In either view, choose table and seat numbers from the dropdown menus. Occupied seats are marked with `⇄` for instant seat swaps.

### 3. Spreadsheet Grid & Rapid Guest Entry
- **Excel-like 2D Grid:** 8 streamlined columns: `Vorname | Nachname | Adresse | Tisch | Platz | HS | Alter | Diät`.
  - **Keyboard Navigation:** Navigate with `ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`, `Tab`, and `Enter`.
  - **Quick-Add Empty Row:** A persistent empty row (`*`) at the bottom. Start typing a name and a new guest record is instantiated while spawning a fresh blank row below for continuous high-speed data entry. If cleared back to blank, the extra row vanishes automatically.
- **Unified Settings Modal ("⚙️ Einstellungen"):**
  - **Diäten & Allergien:** Color-coded dietary options with custom color picker and real-time canvas updates.
  - **Altersgruppen:** Configurable age brackets for headcounts and catering.
  - **Daten & CSV:** 1-click Excel-compatible CSV export (with UTF-8 BOM) and quick CSV file import.
- **High Chairs (Hochstuhl):** High-chair seats are rendered as distinct rounded squares instead of circles on the floor plan.

### 4. Family Groups & Linking
- **Family Distinguishability:** Families are organized into dedicated container blocks with a pill label (`👨‍👩‍👧‍👦 Familie <Name> (<Count>)`), soft tinted background, and purple left accent stripe.
- **Add Members:** Click the subtle `➕ Mitglied` button in the family header to search and attach guests on-demand.
- **Form Families:** Single guests feature a quick `👨‍👩‍👧‍👦` action button to link with another guest and start a family.
- **Bulk Table Assignment:** When a family is together in split view, the pill acts as a dropdown to move the entire family to another table with a single click.
- **Split Detection:** If members are separated across different tables, a warning badge highlights the split.

### 5. Multi-Page Print & PDF Export
Click **"🖨️ Venue drucken"** in the header to generate a printout or export to PDF:
- **Page 1 (Floor Plan Overview):** Automatically crops tightly to your placed tables with paper-optimized light colors, high contrast, and clean legends.
- **Pages 2–N (Table Detail Sheets):** One dedicated page per table featuring an enlarged table diagram, seat list, dietary summaries, and notes.

---

## 🛠️ Technical Details (For Developers)

- **Frontend:** Vanilla HTML5, CSS3, and JavaScript (ES Modules). No Node.js, no Webpack, no external runtime dependencies. Uses the Inter font family via Google Fonts.
- **Backend:** `server.py` — a lightweight Python 3 `http.server` (~320 LOC) handling static file serving and JSON REST endpoints (`/api/state`, `/api/venues`).
- **Data Directory:** `states/` contains JSON files per venue (`Hauptsaal.json`, `Agape.json`, etc.) and `_active.json` for active venue tracking.
- **Scripts:**
  - `start.bat` / `install.bat` / `update.bat` — Windows launcher, setup, and 1-click updater.
  - `start.command` / `install.command` / `update.command` — macOS launcher, setup, and 1-click updater.
  - `start.sh` / `install.sh` / `update.sh` — Linux launcher, setup, and 1-click updater.
