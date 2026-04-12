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
- **Adding Tables:** Use the buttons at the top of the Venue Panel (`+ 7er Tisch`, `+ 8er Tisch`, etc.) to add tables. 
- **Moving Tables:** Click and drag the center area of any table in the venue diagram to position it.
- **Table Details Modal:** Click on a table's center circle to open the details. Here you can:
  - Rename the table.
  - Change seating capacity (seats automatically re-number and shrink down as long as occupancy allows).
  - Enable the **"Fixierte Plätze"** lock (turns individual seats green, indicating seat assignments are final).
  - Delete the table.
- **Locking Table Groups (Split View):** In the split-view guest list, each table has a **"Fixiert"** checkbox in its header. Checking this locks the table's position into a "collapsed" state by default and gives the table's center a stable green ring on the visual diagram!

### 2. Managing Guests
Guests can be added individually via the **"➕ Gast hinzufügen"** button (only available in Full Table View) or via bulk CSV import. 
- **Properties & Adjustments:** 
  - *Diet / Allergies*: Color-coded for rapid visual tracking. You can customize the name and color of dietary classes globally by clicking the **"🎨 Diäten"** button in the guest panel header!
  - *Age Category*: Used for stats and accurate pricing breakdowns.
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
Click **"📄 CSV importieren"** to load a raw `.csv` list of your guests. Ensure your CSV is structured with the following format (No headers strictly required):
`[First Name], [Last Name], [Optional: High Chair True/False]`

---

## 🛠️ Technical Details

This project purposely avoids modern frontend build webs (Webpack, Vite, React, Node) to remain hyper-portable and lightweight.
- **`app.js`**: Core Javascript IIFE structure containing full DOM manipulation, graph calculations, and UI states.
- **`style.css`**: Styling utilizing vanilla CSS variables for layout, transitions, and native dark mode elements. Includes specific fixes required to handle robust SVG layout parsing in Safari. 
- **`server.py`**: A ~60-line Python implementation subclassing `http.server` specifically handling `GET /api/state` and `POST /api/state` routes for immediate disk writing to the JSON file.
