# Sitzplan - Wedding Seating Planner

A lightweight, interactive single-page application for planning a wedding seating arrangement. Built with vanilla HTML/CSS/JS and a simple Python backend for JSON-based state persistence.

## 🚀 Getting Started

The application runs locally and requires no build steps or complex dependencies. It uses a lightweight Python web server to save the layout state.

1. **Start the server:** Run the startup script to launch the local web server.
   ```bash
   ./start.sh
   ```
2. **Open the App:** Navigate to [http://localhost:8000](http://localhost:8000) in your web browser (Safari & Chrome are fully supported).
3. **Data Persistence:** All changes are automatically saved to `sitzplan_state.json`. The application auto-loads this file seamlessly upon refresh.

---

## 🎨 Layout Overview

The app is laid out in a responsive **two-panel split view**:
- **Venue Panel (Left):** A graphical, drag-and-drop representation of the seating tables.
- **Guest Panel (Right):** The master list of all guests, grouped either by table or flattened out.

You can hide the Venue Panel to enter **Full Table View**, which transforms the guest list into a wide, spreadsheet-like interface for rapid data entry.

---

## 💡 Key Features & How to Operate

### 1. Managing Tables
- **Adding Tables & Table Builder:** Use the **"➕ Tisch erstellen"** button at the top of the Venue Panel to open the dynamic **Table Builder**. This powerful tool lets you choose between circular or rectangular shapes, specify exact dimensions (e.g., seats on long vs. short sides), and instantly adds the custom table to your venue.
- **Moving Tables:** Click and drag the center area of any table in the venue diagram to position it.
- **Table Details Modal:** Click on a table's center circle to open the details. Here you can:
  - Rename the table.
  - Change seating capacity (seats automatically re-number and shrink down as long as occupancy allows).
  - Toggle **"Gäste platziert"**: Indicates the group of people assigned to the table is finalized. Turns the table's center circle green on the venue map.
  - Toggle **"Plätze fixiert"**: Indicates specific seat placements are finalized, turning individual seat borders green.
  - *Note:* These locks are physically linked. Unchecking "Gäste platziert" will automatically uncheck "Plätze fixiert" (you can't finalize seats if you don't know who is at the table!). If BOTH are checked, the entire detail modal illuminates with a bright green border, indicating the table is 100% complete!
  - **Bearbeitungsmodus (Edit Mode):** Click the "🔧 Bearbeitungsmodus" button to enter a distraction-free layout mode. Guest names and lists are hidden, allowing you to click individual seats to **disable** them (perfect for table legs or un-usable spots, marked with a ✕). You can also use the **"↻ Drehen"** button to physically rotate rectangular tables by 90° while perfectly preserving existing seat assignments!
  - Delete the table.
- **Table Groups (Split View):** In the split-view guest list, each table mirrors the **"Gäste platziert"** checkbox right in its header. Checking this directly from the guest list performs the same lock, turns the table's center green, and auto-collapses the group to save screen space!

### 2. Managing Guests
Guests can be added individually via the **"➕ Gast hinzufügen"** button or via bulk **"📄 CSV importieren"**. 
> [!NOTE] 
> The global guest actions (Add Guest, CSV Import, Age Config, and Diet Config) are uniquely engineered for bulk-management workflows and are strategically hidden until you hide the venue layout and enter the **Full Table View**.

- **Properties & Adjustments:** 
  - *Diet / Allergies*: Color-coded for rapid visual tracking. You can customize the name and color of dietary classes globally by clicking the **"🎨 Diäten"** button.
  - *Age Category*: Used for stats and accurate pricing breakdowns. You can configure and define your own dynamic demographic groups natively by selecting the **"👶 Altersgruppen"** button!
  - *High Chair (Hochstuhl)*: The seat shape on the visual layout changes perfectly from a circle into a rounded square. 

### 3. Placing Guests & Swapping Seats
There are two ways to assign a guest to a seat:
- **Via Dropdowns:** In the right panel, use the dropdown menus on a guest card to select the specific Table and Seat number.
- **Visual Click-to-Swap (Table Detail Modal):** Open a table's detail module. Click on any seat in the large graphic to select it (it gets a golden ring glow). Next, click another seat to instantly **swap** the guests.

### 4. Family Groups & Linking
To make bulk table assignment easier without sacrificing legibility, related guests are powerfully clustered into flat, spreadsheet-aligned Family Groups!
- **Implicit Grouping:** Whenever a user is placed into a family, they will be listed alphabetically at the top of the screen in a border-wrapped group.
- **Adding/Linking Members:** On any grouped family block, there is a dedicated Search Bar Pill (`👨‍👩‍👧‍👦 Mitglied hinzufügen...`). Start typing an ungrouped guest's name to instantly absorb them into the family!
- **Standalone Guest Linking:** Conversely, if you have a standalone spreadsheet row, you can link them directly to an overarching group via the "Familie" column.
- **Dissolving:** Use the precise '✕ Familie auflösen' action embedded at the top-right of any group boundary to separate all members instantly.
- **Bulk Table Assignment:** When viewing the split venue screen, families seated at precisely the same table show an interactive pill dropdown letting you instantly warp the whole group to another table! If they end up scattered, a "Split Tables" warning cleanly illustrates the fracture.

### 5. Printing Settings
Click the **"🖨️ Venue drucken"** button in the header when you are ready to produce physical documents.

The print view generates a polished, multi-page layout:
- **Page 1:** A clean, optimized graphical overview of the venue floor plan configured seamlessly in *Landscape*.
- **Subsequent Pages:** Generate a per-table breakdown, providing the list of guests sitting at each table, along with localized legends to describe used diet colors and high chairs. 

### 6. CSV Bulk Import
When in the Full Table View, click **"📄 CSV importieren"** to load a raw `.csv` list of your guests. Ensure your CSV is structured with the following format (No headers strictly required):
`[First Name], [Last Name], [Optional: High Chair True/False]`

---

## 🛠️ Technical Details

This project purposely avoids modern frontend build webs (Webpack, Vite, React, Node) to remain hyper-portable and lightweight.
- **`app.js`**: Core Javascript IIFE structure containing full DOM manipulation, graph calculations, and UI states.
- **`style.css`**: Styling utilizing vanilla CSS variables for layout, transitions, and native dark mode elements. Includes specific fixes required to handle robust SVG layout parsing in Safari. 
- **`server.py`**: A ~60-line Python implementation subclassing `http.server` specifically handling `GET /api/state` and `POST /api/state` routes for immediate disk writing to the JSON file.
