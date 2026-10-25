# 🪙 Ledgerly — Finance Analyst

> **A private, local-first personal finance analytics dashboard tailored for Money Manager Excel exports.**  
> Transform raw expense workbooks into interactive cashflow visualizations, spending breakdowns, and actionable financial insights — directly in your browser.

---

## ⚡ Highlights

- 🔒 **100% Client-Side Privacy:** All Excel parsing and aggregations run entirely in your local browser using client-side Web APIs and SheetJS. Zero financial data is ever transmitted to a server or third party.
- 🚀 **Zero NPM Dependencies:** No `node_modules`, no `package.json`, and no bundler needed to run. Powered by native ES Modules (ES2022+).
- 📱 **Responsive & Mobile-Ready:** Clean Notion-inspired design system with dedicated mobile card views, touch-friendly slide-up bottom sheets, and full-width search.
- 🇮🇳 **Indian Financial Standard & INR Native:** Built-in Indian Rupee (`₹`) currency formatting with Lakhs/Crores grouping and Indian Financial Year (`FY`: April 1 – March 31) navigation.
- 🎛️ **Notion-Style Property Customization:** Reorder and toggle table columns (Shown vs. Hidden) with search, drag-and-drop, and clean SVG controls.
- 📊 **Interactive SVG Visualizations:** Pure SVG donut charts for macro cashflow streams and category breakdowns with dynamic palettes and hover drill-downs.

---

## 🚀 Quick Start

### 1. Prerequisites
- **Python 3** (pre-installed on macOS/Linux) or any static file server.
- Modern web browser (Chrome, Safari, Firefox, or Edge).

### 2. Start the Development Server
From the project root directory, run the bundled server:

```bash
python3 server.py
```

*Or using Python's built-in module:*

```bash
python3 -m http.server 4173 --bind 0.0.0.0
```

### 3. Access the Dashboard

- **On your Mac / PC:** Open [http://localhost:4173](http://localhost:4173)
- **On your iPhone / Android (same Wi-Fi):** Open your mobile browser and enter the LAN URL displayed in the terminal (e.g., `http://192.168.1.5:4173`).

> [!NOTE]
> **macOS Firewall:** When starting the server with `--bind 0.0.0.0`, macOS may prompt *"Do you want the application python3 to accept incoming network connections?"* — click **Allow** so your phone can access the dashboard.

---

## 📸 Key Features & Capabilities

### 📥 Smart Excel Ingestion & Normalization
- Supports Money Manager `.xlsx` and `.xls` workbook exports.
- **Dynamic Header Detection:** Automatically detects synonyms for Date/Period, Category, Subcategory, Amount, Income/Expense, Account, Note, and Description.
- **Transfer Isolation:** Distinguishes internal account-to-account transfers from real income and expenses, preventing inflated spending metrics.
- **Defensive Date & Number Handling:** Handles varying date representations (DD/MM/YYYY, MM/DD/YYYY, and Excel serial timestamps).

### 📈 Real-Time Financial Health Metrics
- **Total Spent:** Aggregated spending for the active window with comparison deltas against the preceding period.
- **Income:** Total inflow amount and transaction count.
- **Net Flow:** Immediate cashflow balance (`Income − Expenses`).
- **Daily Average:** Granular daily burn rate calculated across the exact number of days in the period.

### 📅 Time Horizon & Period Navigation
- Switch between **Week**, **Month**, **Quarter**, **Year**, **FY** (Indian Financial Year: Apr 1 – Mar 31), **Custom Date Range**, and **All Time**.
- One-click minimal chevron navigation (`←` / `→`) to jump between contiguous periods.

### 🍩 Interactive SVG Donut Charts
- **Macro Cashflow Chart:** Visualizes proportional distribution across Income, Expenses, and Transfers with interactive center metrics.
- **Category Breakdown Chart:** Deep drill-down into expenses, income, or transfers with vibrant color palettes and a golden-angle fallback algorithm for unbounded categories.
- Click any chart slice or legend item to filter transactions instantly.

### 🔍 Notion-Style Filtering & Search
- **Transaction Type Pills:** Quick-toggle between `All`, `Expenses`, `Income`, and `Transfers`.
- **Multi-Select Filter Popovers:** Interactive chip-box filters with search for both **Categories** and **Accounts**.
- **Instant Search:** Real-time search across notes, descriptions, categories, and accounts.
- **Flexible Sorting:** Sort transactions by Date (Newest / Oldest first) or Amount (Highest / Lowest first).

### 🗂️ Customizable Notion-Style Table & Mobile Card View
- **Desktop Table View:** Notion-styled properties with category tags, account badges, and clean typography.
- **Property Visibility Panel:** Customize which columns are shown or hidden, search properties, reorder columns, or reset back to default.
- **Mobile Card View:** Adaptive card list with quick-glance dates, amounts, and category badges designed for small viewports.
- **Mobile Slide-up Bottom Sheet:** Easily access file import, CSV exports, layout modes, and font settings on touch devices.

### 🖥️ Adaptive Layout Views & Display Settings
- **Stacked View (Default):** Classical vertical layout flowing from summary metrics to charts and transaction lists.
- **Split View:** Side-by-side arrangement of charts and transaction records for wide monitors.
- **Tabbed View:** Focused layout with sub-tabs to switch between Transactions and Breakdown.
- **Font Size Stepper:** Adjust interface scaling from 80% to 150% (`A−` / `100%` / `A+`) with persistent browser storage.

### 💾 CSV Data Export
- **Export Filtered Data:** Download a clean CSV containing only the currently active filtered view and date window.
- **Export All Data:** Export the complete, normalized dataset in CSV format.

---

## 📋 Supported File Format

Ledgerly is built to ingest standard personal finance exports, notably from the **Money Manager** mobile app (Realbyte Inc.).

| Field | Recognized Column Synonyms |
|---|---|
| **Date** | `Period`, `Date`, `Transaction Date`, `Time` |
| **Category** | `Category`, `Expense Category`, `Income Category` |
| **Subcategory** | `Subcategory`, `Sub Category` |
| **Amount** | `Amount`, `Total`, `Value`, `INR`, `Debit`, `Credit` |
| **Type** | `Income/Expense`, `Type`, `Transaction Type`, `Flow` |
| **Account** | `Account`, `Payment Method`, `Source`, `Wallet` |
| **Note / Description** | `Note`, `Description`, `Memo`, `Remarks` |

---

## 🛠️ Tech Stack & Architecture

Ledgerly intentionally uses standard web technologies without external framework overhead:

| Layer | Technology | Details |
|---|---|---|
| **Language** | Vanilla JavaScript (ES2022+ ESM) | Native modular architecture in `js/` |
| **Styling** | HTML5 & CSS3 | CSS Custom Properties, CSS Grid, Flexbox, Notion aesthetics |
| **Spreadsheet Engine** | [SheetJS (xlsx)](https://sheetjs.com/) | Loaded via CDN in `index.html` (`xlsx.full.min.js`) |
| **Typography** | Google Fonts | `Inter`, `Manrope`, `DM Mono` |
| **Visualizations** | Native SVG | Pure SVG Donut Charts (Macro Cashflow & Category Breakdown) |
| **Server** | Python 3 | `server.py` with automatic LAN IP discovery |
| **Test Runner** | Node.js | Built-in zero-dependency integration suite in `tests/` |

### Project Directory Structure

```
finance-tracker/
├── index.html              # Single-page application entry point & DOM markup
├── styles.css              # Core design system, variables, layouts, and Notion themes
├── enhancements.css        # Micro-animations, SVG hover effects, and typography polish
├── server.py               # Zero-dependency Python 3 development server with LAN discovery
├── build.js                # Optional script to compile an IIFE bundle to dist/
├── AGENTS.md               # Architecture and guidelines for AI agents & contributors
├── README.md               # User documentation (this file)
├── js/                     # Modular frontend source code (ES Modules)
│   ├── app.js              # Application bootstrap and render coordinator
│   ├── categories.js       # Category colors, emoji maps, and golden-angle generator
│   ├── charts.js           # Native SVG Donut charts (macro stream & categories)
│   ├── dates.js            # Date bounds (week/month/quarter/FY), prior-period deltas
│   ├── export.js           # CSV export logic (filtered view vs. complete dataset)
│   ├── filters.js          # Multi-select popovers, chip input filters, sort logic
│   ├── parser.js           # In-browser Excel workbook parsing and type normalization
│   ├── settings.js         # Layout switcher (Stacked/Split/Tabbed), font scaling
│   ├── state.js            # Centralized reactive application state
│   ├── table.js            # Notion property table, column manager, mobile card list
│   └── utils.js            # Currency formatting (INR), DOM utilities, sanitization
└── tests/
    └── test_modules.mjs    # Node.js headless integration and assertion test suite
```

---

## 🧪 Testing & Verification

Ledgerly includes a headless test suite that validates module exports, normalization logic, date boundaries, custom column management, and formatting without requiring a browser.

Run the test suite using Node.js:

```bash
node tests/test_modules.mjs
```

### Optional Bundling
To generate an optional standalone production bundle in `dist/app.bundle.js`:

```bash
node build.js
```

---

## 🔒 Privacy & Security

Your financial information is sensitive and belongs to you:
- **No Cloud Ingestion:** Files selected via the import button are processed in-memory via the browser's `FileReader` and SheetJS API.
- **No Telemetry / No Cookies:** Ledgerly contains zero analytics trackers, third-party trackers, or marketing pixels.
- **Local Settings:** Layout preferences, column visibility, and font scaling are saved exclusively in your browser's `localStorage`.

---

## 📖 Contributing & Developer Guide

For detailed guidelines on architecture, state management patterns, and conventions, please refer to [AGENTS.md](file:///Users/raghavendrakm/Documents/ChatGPT/finance-tracker/AGENTS.md).
