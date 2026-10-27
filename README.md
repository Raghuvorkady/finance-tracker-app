# 🪙 Ledgerly — Finance Analyst

> **A private, local-first personal finance analytics dashboard tailored for Money Manager Excel exports.**  
> Transform raw expense workbooks into interactive cashflow visualizations, spending breakdowns, and actionable financial insights — directly in your browser.

---

## ⚡ Highlights

- 🔒 **100% Client-Side Privacy:** All Excel parsing and aggregations run entirely in your local browser using client-side Web APIs and SheetJS. Zero financial data is ever transmitted to a server or third party.
- 📘 **Strict TypeScript Architecture:** Author with complete type safety in `src/*.ts`. Zero runtime dependencies in the browser — `tsc` compiles clean, unbundled ES2022 modules.
- 📱 **Responsive & Mobile-Ready:** Clean Notion-inspired design system with dedicated mobile card views, touch-friendly slide-up bottom sheets, and full-width search.
- 🇮🇳 **Indian Financial Standard & INR Native:** Built-in Indian Rupee (`₹`) currency formatting with Lakhs/Crores grouping and Indian Financial Year (`FY`: April 1 – March 31) navigation.
- 🎛️ **Notion-Style Property Customization:** Reorder and toggle table columns (Shown vs. Hidden) with search, drag-and-drop, and clean SVG controls.
- 📊 **Interactive SVG Visualizations:** Pure SVG donut charts for macro cashflow streams and category breakdowns with dynamic palettes and hover drill-downs.

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js** (v18+) & **npm**
- **Python 3** (pre-installed on macOS/Linux) or any static file server.
- Modern web browser (Chrome, Safari, Firefox, or Edge).

### 2. Build the Application
After cloning the repository, install dev dependencies and compile TypeScript:

```bash
npm install
npm run build
```

*During development, you can run auto-compilation:*
```bash
npm run watch
```

### 3. Start the Development Server
From the project root directory, run the bundled server:

```bash
python3 server.py
```

*Or using Python's built-in module:*

```bash
python3 -m http.server 4173 --bind 0.0.0.0
```

### 4. Access the Dashboard

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
- Interactive calendar popover with grayed-out periods that have no recorded transactions.
- Quick-jump button to return to the current active calendar period with a single click.

### 🍩 Interactive SVG Donut Charts & Trend Lines
- **Macro Cashflow Chart:** Visualizes proportional distribution across Income, Expenses, and Transfers with interactive center metrics.
- **Category Breakdown Chart:** Deep drill-down into expenses, income, or transfers with vibrant color palettes and a golden-angle fallback algorithm for unbounded categories.
- **Cash Flow Trends View:** Time-series timeline with area fills, interactive scrubber line, and tooltip breakdown.

### 🔍 Notion-Style Filtering & Search
- **Transaction Type Pills:** Quick-toggle between `All`, `Expenses`, `Income`, and `Transfers`.
- **Inclusion / Exclusion Operator (`is` vs `is not`):** Filter to specific categories or exclude unwanted categories from calculations.
- **Multi-Select Filter Popovers:** Interactive chip-box filters with search for both **Categories** and **Accounts**.
- **Instant Search:** Real-time search across notes, descriptions, categories, and accounts.

### 🗂️ Customizable Notion-Style Table & Mobile Card View
- **Desktop Table View:** Notion-styled properties with category tags, account badges, and clean typography.
- **Property Visibility Panel:** Customize which columns are shown or hidden, search properties, reorder columns, or reset back to default.
- **Mobile Card View:** Adaptive card list with quick-glance dates, amounts, and category badges designed for small viewports.
- **Mobile Slide-up Bottom Sheet:** Easily access file import, CSV exports, layout modes, and font settings on touch devices.

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

| Layer | Technology | Details |
|---|---|---|
| **Language** | TypeScript (ES2022+ ESM) | Authored in `src/*.ts`, compiled to `js/*.js` via `tsc` (gitignored) |
| **Styling** | HTML5 & CSS3 | CSS Custom Properties, CSS Grid, Flexbox, Notion aesthetics |
| **Spreadsheet Engine** | [SheetJS (xlsx)](https://sheetjs.com/) | Loaded via CDN in `index.html` (`xlsx.full.min.js`) |
| **Typography** | Google Fonts | `Inter`, `Manrope`, `DM Mono` |
| **Visualizations** | Native SVG | Pure SVG Donut Charts & Trend Line Timelines |
| **Server** | Python 3 | `server.py` with automatic LAN IP discovery |
| **Test Runner** | Node.js | Integration test suite in `tests/test_modules.mjs` |

### Project Directory Structure

```
finance-tracker/
├── index.html              # Single-page application entry point & DOM markup
├── styles.css              # Core design system, variables, layouts, and Notion themes
├── enhancements.css        # Micro-animations, SVG hover effects, and typography polish
├── server.py               # Development server with LAN discovery (binds 0.0.0.0:4173)
├── build.js                # Optional script to compile an IIFE bundle to dist/
├── package.json            # npm scripts and TypeScript devDependencies
├── tsconfig.json           # TypeScript compilation configuration
├── AGENTS.md               # Architecture and guidelines for AI agents & contributors
├── README.md               # User documentation (this file)
├── src/                    # TypeScript source code (single source of truth)
│   ├── types.ts            # Central interfaces, types, and Window declarations
│   ├── app.ts              # Application bootstrap and render coordinator
│   ├── categories.ts       # Category colors, emoji maps, and color generators
│   ├── charts.ts           # Native SVG Donut charts & trend line timeline
│   ├── dates.ts            # Date bounds (week/month/quarter/FY), period calculations
│   ├── export.ts           # CSV export logic & PDF print statement generation
│   ├── filters.ts          # Multi-select popovers, chip input filters, sort logic
│   ├── parser.ts           # In-browser Excel workbook parsing and type normalization
│   ├── period-picker.ts    # Interactive period picker popover with data-presence grayout
│   ├── settings.ts         # Layout switcher (Stacked/Split/Tabbed), font scaling
│   ├── state.ts            # Centralized reactive application state
│   ├── table.ts            # Notion property table, column manager, mobile card list
│   └── utils.ts            # Currency formatting (INR), DOM utilities, sanitization
└── tests/
    └── test_modules.mjs    # Node.js headless integration and assertion test suite
```

---

## 🧪 Testing & Verification

Run the test suite:

```bash
npm test
```

Verify type checking:

```bash
npm run typecheck
```

Generate optional bundle:

```bash
npm run bundle
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
