# Sitzplan – Wedding Seating Planner 💍🥂

A fast, interactive, and private seating planner for weddings and events. Built with vanilla HTML/CSS/JavaScript and a zero-dependency local Python backend.

All your data is saved **100% locally on your computer** in the `states/` folder. No accounts, no cloud servers, no subscriptions, and completely offline-capable.

---

## 🚀 Quick Start Guide (For Everyone)

You do **not** need any programming, git, or terminal experience to use Sitzplan! Just follow the simple 3-step guide below for your operating system.

---

### Step 1: Download & Extract the App

1. On the [GitHub page](https://github.com/MarkusSpanring/seating-planner), click the green **`<> Code`** button near the top right.
2. In the dropdown, click **`Download ZIP`**.
3. Locate the downloaded file (usually in your `Downloads` folder, named `seating-planner-main.zip` or `sitzplan-main.zip`).
4. **Extract (unzip) the file:**
   - **Windows:** Right-click the `.zip` file ➔ click **Extract All...** ➔ click **Extract**.
   - **Mac:** Double-click the `.zip` file. macOS will automatically extract it into a normal folder.
   - **Linux:** Right-click the `.zip` file ➔ click **Extract Here**.
5. Open the newly extracted folder. You will see files like `install.bat`, `start.bat`, `install.command`, `start.command`, etc.

---

### Step 2 & 3: Installation & Starting the App

Choose your operating system:

<details open>
<summary><h3>🪟 Windows (Click to expand / collapse)</h3></summary>

#### 1. One-Time Setup
- Double-click **`install.bat`**.
- A black window will appear:
  - If Python is already installed on your PC, it will say `[OK] Python is installed!` and you're done!
  - If Python is not yet installed, the script will offer to install it for you, or open the official Python download page in your web browser.
- **Very Important Note for Python Installation:**
  > When installing Python, make sure to check the box at the bottom of the installer:  
  > **☑️ Add python.exe to PATH**  
  > (This allows Windows to find and run Python).
- Once installed, press any key to close the window.

> **Note on Windows SmartScreen:** If Windows displays a blue pop-up saying *"Windows protected your PC"*, click **"More info"** and then **"Run anyway"**. This is a standard Windows warning for downloaded helper scripts.

#### 2. Starting the App
- Double-click **`start.bat`**.
- The server will start, and your default web browser (Chrome, Edge, Firefox, etc.) will **automatically open** to:
  👉 **http://localhost:8000**
- *Keep the black command window open while you use Sitzplan.*

#### 3. Stopping the App
- When you are finished, simply close your browser tab and close the black command window. All your changes are already saved automatically!

</details>

<details open>
<summary><h3>🍎 Mac / macOS (Click to expand / collapse)</h3></summary>

#### 1. One-Time Setup
- Double-click **`install.command`**.
- A Terminal window will open and verify that Python 3 is installed.
  - Python 3 is pre-installed on most modern Macs. If it is missing, the script will open the official Python download page for macOS.
- The script automatically configures the necessary launch permissions.
- Press **Enter** when prompted to close the window.

> **Note on macOS Security (Gatekeeper):**  
> If macOS displays a message saying the script *"cannot be opened because it is from an unidentified developer"*:
> 1. Right-click (or hold <kbd>Control</kbd> and click) on **`install.command`** (or `start.command`).
> 2. Click **Open** from the menu.
> 3. In the confirmation dialog, click **Open**.  
> *(You only need to do this the very first time!)*

#### 2. Starting the App
- Double-click **`start.command`**.
- A Terminal window will open, and your web browser (Safari, Chrome, etc.) will **automatically open** to:
  👉 **http://localhost:8000**
- *Keep the Terminal window open while you are working.*

#### 3. Stopping the App
- When you are done, close your browser and close the Terminal window (or press <kbd>Ctrl</kbd> + <kbd>C</kbd> in the Terminal).

</details>

<details open>
<summary><h3>🐧 Linux (Click to expand / collapse)</h3></summary>

#### 1. One-Time Setup
- Open your terminal in the extracted folder and run:
  ```bash
  ./install.sh
  ```
  *(If Python 3 is not installed, the script will show you the exact `apt`, `dnf`, or `pacman` command to install it).*

#### 2. Starting the App
- Run:
  ```bash
  ./start.sh
  ```
- Your default web browser will **automatically open** to:
  👉 **http://localhost:8000**

#### 3. Stopping the App
- Press <kbd>Ctrl</kbd> + <kbd>C</kbd> in your terminal.

</details>

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

The application offers two views:
- **Split Venue View (Default):** A visual graphical floor plan on the left and a table-grouped guest list on the right.
- **Full Table View:** Click **"Venue ausblenden"** to hide the canvas and expand into a full spreadsheet view for rapid data entry, bulk editing, and CSV import.

---

### 1. Managing Tables & Floor Plan
- **Add Tables:** Use the quick-add buttons in the toolbar (`+ 7er Tisch`, `+ 8er Tisch`, `+ 10er Tisch`) or use the **Blueprint Builder (Tischvorlagen)** to design custom rectangular or circular tables of any dimension.
- **Move Tables:** Click and drag the center circle/rectangle of any table to reposition it on the venue canvas.
- **Table Detail Modal:** Click on any table to open its detail view:
  - **Rename Table:** Change the table name or number.
  - **Resize Table:** Change the seat count (guests are safely renumbered so nobody is left out).
  - **Status Checkboxes:**
    - **Fixiert (Gäste platziert):** Locks the guest group assigned to the table. Gives the table a green center circle.
    - **Plätze fixiert:** Locks the specific seat numbers, giving all seat circles a green border.
  - **Bearbeitungsmodus (Edit Mode):** Click individual seats to disable/ghost them (useful for table legs, structural pillars, or asymmetric seating).
  - **Rotate Table:** Rotate rectangular tables by 90° with a single click while preserving guest assignments.
  - **Delete Table:** Remove a table (with confirmation if guests are currently seated).

### 2. Placing Guests & Swapping Seats
- **Via Dropdown:** In the guest list panel, choose the desired Table and Seat from the dropdown menus.
- **Interactive Click-to-Swap:** In the Table Detail Modal, click any seat circle to select it (highlighted with an amber ring), then click any other seat to instantly swap the two guests!

### 3. Managing Guests
- **Add Guests:** Click **"➕ Gast hinzufügen"** in the Full Table View.
- **Bulk CSV Import:** Click **"📄 CSV importieren"** to load guests from a `.csv` file. Format: `[First Name], [Last Name], [Optional: High Chair (yes/true)]`.
- **Diet & Allergies:** Color-coded circles make dietary requirements immediately visible at a glance. Customize diets and colors via the **"🎨 Diäten"** modal.
- **Age Categories:** Adult, under 12, under 6, under 3. Used for seating badges and accurate catering headcounts. Customize via **"👶 Altersgruppen"**.
- **High Chairs (Hochstuhl):** High-chair seats are rendered as distinct rounded squares instead of circles on the floor plan.

### 4. Family Groups & Linking
- **Group Families:** Link family members together so they stay organized.
- **Bulk Table Assignment:** When all members of a family are at the same table, you can move the entire family to another table with a single dropdown selection!
- **Split Warning:** If family members become separated across different tables, a subtle warning badge informs you.

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
  - `start.bat` / `install.bat` — Windows launcher and setup.
  - `start.command` / `install.command` — macOS launcher and setup.
  - `start.sh` / `install.sh` — Linux launcher and setup.
