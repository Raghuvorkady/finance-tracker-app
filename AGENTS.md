# AGENTS.md — Developer & AI Agent Guide

Welcome to the **Ledgerly Finance Analyst** codebase. This guide provides AI agents (such as Antigravity) and human developers with essential context on repository architecture, design principles, build tools, workflows, and coding conventions to ensure rapid, error-free modifications.

---

## 1. Project Overview & Architecture

**Ledgerly** is a high-performance, private, browser-based financial analytics dashboard tailored for personal finance exports (such as Money Manager `.xlsx` and `.xls` workbooks).

### Core Architectural Principles
- **Privacy-First & Local-Only:** All Excel parsing and aggregations run purely client-side inside the user's browser. No financial data is ever transmitted to a backend or remote server.
- **Zero NPM Dependencies:** The project has **no** `package.json`, `node_modules`, or complex JS toolchains (no Webpack, Vite, or Babel). It runs natively in any modern browser via ES Modules.
- **Single Source of Truth:** Centralized mutable state in `js/state.js` drives reactive re-renders across all view modules.
- **Responsive & Multi-Theme:** Supports 3 visual themes (`ledgerly`, `mobile`, `notion`) and 3 layout views (`stacked`, `split`, `tabbed`), engineered for both desktop displays and mobile touch screens.

---

## 2. Tech Stack & Dependencies

| Layer | Technology | Details |
|---|---|---|
| **Language** | Vanilla JavaScript (ES2022+ ESM) | Native ES modules in `js/`, bundled IIFE in root `app.js` |
| **Markup & Styling** | HTML5 & CSS3 | CSS Custom Properties, CSS Grid, Flexbox, responsive design |
| **Spreadsheet Engine** | [SheetJS (xlsx)](https://sheetjs.com/) | Loaded via CDN in `index.html` (`xlsx.full.min.js`) |
| **Typography** | Google Fonts | `Manrope`, `Inter`, `DM Mono` |
| **Data Visualization** | Native SVG | Pure SVG Donut Charts (Macro Cashflow and Category Breakdowns) |
| **Development Server** | Python 3 (`http.server`) | Custom zero-config server (`server.py`) binding to `0.0.0.0:4173` |
| **Bundling & Testing** | Node.js (Built-in standard library) | `build.js` (bundler) and `tests/test_modules.mjs` (test suite) |

---

## 3. Directory & File Structure

```
finance-tracker/
├── AGENTS.md               # Agent & developer operational guidelines (this file)
├── README.md               # End-user setup and product documentation
├── index.html              # Main single-page application entry point & DOM markup
├── styles.css              # Core design system, theme variables, and layout modes
├── enhancements.css        # Micro-animations, SVG hover states, and typography overrides
├── server.py               # Zero-dependency Python 3 development server with LAN discovery
├── build.js                # Optional bundler script (outputs to dist/app.bundle.js)
├── js/                     # Modular frontend source code (ES Modules - single source of truth)
│   ├── app.js              # Orchestrator, render coordinator, and top-level event listeners
│   ├── categories.js       # Category styling, Notion emoji mappings, color palettes
│   ├── charts.js           # SVG Donut charts (macro cashflow & category breakdown)
│   ├── dates.js            # Date bounds, periods (weekly/monthly/quarterly/FY), calculations
│   ├── export.js           # CSV export logic (current filtered view vs entire dataset)
│   ├── filters.js          # Filtering pipeline, multi-select popovers, sort mechanisms
│   ├── parser.js           # Excel workbook parsing, header detection, row normalization
│   ├── settings.js         # Theme switcher, font scaling, layout views, persistent localStorage
│   ├── state.js            # Central reactive state object and default constants
│   ├── table.js            # Transaction table (desktop) and card list (mobile) rendering
│   └── utils.js            # DOM helpers ($), currency formatting (INR), sanitization, storage
└── tests/
    └── test_modules.mjs    # Headless Node.js integration tests with mocked DOM environment
```

### Detailed Module Responsibilities (`js/`)

- **`js/state.js`**:
  Defines the global `state` object holding:
  - `data`: Array of normalized transaction objects.
  - `period`: Active time range (`'monthly'`, `'weekly'`, `'quarterly'`, `'yearly'`, `'financial'`, `'custom'`, `'all'`).
  - `anchor`: Reference `Date` object for the active period.
  - `selectedCategories` / `selectedAccounts`: `Set` instances for multi-select filtering.
  - `type`: Transaction type filter (`'all'`, `'expense'`, `'income'`, `'transfer'`).
  - `search`: Free-text search string.
  - `sort`: Sort criteria (`'date-desc'`, `'date-asc'`, `'amount-desc'`, `'amount-asc'`).
  - `layoutView`: Layout mode (`'a'` Stacked, `'b'` Split, `'c'` Tabbed).

- **`js/parser.js`**:
  Handles flexible ingestion of Excel files. Dynamically inspects column headers (supports various synonyms for Date, Category, Amount, Type, Account, Note, Description). Parses diverse date formats (DD/MM/YYYY, MM/DD/YYYY, Excel serial dates) and normalizes transaction types into `'expense'`, `'income'`, or `'transfer'`.

- **`js/dates.js`**:
  Computes precise date boundaries via `bounds()` based on the selected `period` and `anchor` date. Supports Indian Financial Year (April 1 to March 31). Calculates prior period spending for delta metrics via `priorExpense()`.

- **`js/filters.js`**:
  Implements `filtered()`, which takes `state.data` and filters it by date range, transaction type, category set, account set, and search keywords. Manages popovers for multi-selection and sort toggling.

- **`js/charts.js`**:
  Constructs accessible, SVG-based donut charts:
  - `renderMacroDonut()`: High-level overview of Income, Expenses, Transfers, and Net Flow with hover inspection.
  - `renderDonut()`: Detailed category breakdown for specific transaction types.

- **`js/table.js`**:
  Renders transaction rows with category badges, account tags, formatted INR currency values, and hoverable transaction notes/descriptions. Renders Notion-styled property columns when the Notion theme is active.

- **`js/export.js`**:
  Provides `downloadCsv()`, allowing users to export either the currently filtered transaction set or the full unfiltered dataset as a CSV blob.

- **`js/settings.js`**:
  Manages UI appearance and preferences:
  - Theme switching: `'ledgerly'` (natural tones), `'mobile'` (Apple/Money Manager style), `'notion'` (clean monochrome style).
  - Font scaling: Adjustable zoom scale (`0.8` to `1.5`).
  - Layout switching: Stacked, Split, Tabbed views.
  - Persists all settings to browser `localStorage`.

- **`js/app.js`**:
  Application bootstrap and render coordinator. Subscribes callbacks, manages file input drag-and-drop / file upload events, period navigation buttons, and bottom tab switches.

---

## 4. Development & Build Commands

No `npm install` is required. The project relies strictly on built-in tools.

### 1. Start the Development Server
```bash
python3 server.py
```
- **Local Mac URL:** [http://localhost:4173](http://localhost:4173)
- **Mobile Wi-Fi URL:** `http://<YOUR_LOCAL_IP>:4173` (detected automatically by `server.py`).
- *Note:* If port 4173 is already in use, run:
  ```bash
  lsof -ti :4173 | xargs kill -9
  ```

Alternative server using Python's standard module:
```bash
python3 -m http.server 4173 --bind 0.0.0.0
```

### 2. Optional Bundle (Production Distribution)
```bash
node build.js
```
- Concatenates and strips ESM exports from `js/*.js` modules in topological order.
- Generates an optional standalone IIFE in `dist/app.bundle.js` (gitignored). Not needed during development or local usage.

### 3. Run the Test Suite
```bash
node tests/test_modules.mjs
```
- Executes headless tests against refactored modules.
- Verifies module exports, `normalizeRows()`, `bounds()`, `render()`, filter state, sorting, and multi-category selection.

---

## 5. Key Workflows & Golden Rules for Agents

### ⚠️ The Golden Rule: Edit `js/*.js` Modules
`index.html` loads the ES module directly:
```html
<script type="module" src="js/app.js"></script>
```
All frontend application logic lives in `js/*.js`.
1. **Always edit source files within `js/<module>.js`**.
2. **Always run tests to verify integrity**:
   ```bash
   node tests/test_modules.mjs
   ```

### State Modification Workflow
When adding or altering features:
1. Mutate state properties inside `state` (`js/state.js`).
2. Call `render()` (or trigger it via registered render callback) so metric cards, charts, popovers, and table rows update coherently.
3. If new state properties need persistence, save and retrieve them via `getStorage` / `setStorage` in `js/utils.js`.

### Adding a New JS Module
If you introduce a new source module (e.g. `js/analytics.js`):
1. Create the module using standard ES Module syntax (`export function ...`).
2. Add the module filename to `moduleOrder` in `build.js` in the correct dependency order.
3. Import the required exports into `js/app.js` or sibling modules.
4. Run `node build.js` and `node tests/test_modules.mjs`.

---

## 6. Coding Conventions & Best Practices

### JavaScript (ESM)
- **Formatting:** 2 spaces indentation, semicolons, single quotes where standard.
- **Pure Helpers:** Utility functions in `utils.js`, `parser.js`, and `dates.js` should remain side-effect-free where possible.
- **Defensive Parsing:** Always sanitize strings with `cleanText()`, escape HTML user inputs with `escapeHtml()`, and handle invalid dates/numbers gracefully with fallbacks.
- **Indian Financial Standard:** Currency formatting defaults to Indian Rupee (`en-IN`, INR `₹`, Lakhs and Crores grouping). Use the `money(amount, compact)` helper from `js/utils.js`.

### CSS & Themes
- Use CSS Custom Properties defined in `:root` and `[data-theme="..."]`:
  - `--ink`: Text color
  - `--paper`: Background color
  - `--card`: Surface/card background
  - `--line`: Borders and dividers
  - `--muted`: Secondary/caption text
  - `--accent`: Active highlight color
  - `--font-scale`: Multiplied font size scaling
- Always verify that UI additions look balanced across all three themes (`ledgerly`, `mobile`, `notion`).
- Avoid inline hardcoded colors; use semantic CSS classes like `.amount-expense`, `.amount-income`, `.amount-neutral`.

### Git Commit Guidelines
Follow conventional commit message formatting:
- `feat: ...` for user-facing features or UI capabilities.
- `fix: ...` for bug fixes.
- `refactor: ...` for code restructurings without behavior change.
- `test: ...` for testing updates or additions.
- `docs: ...` for documentation updates.

---

## 7. Testing in Node.js

The test file `tests/test_modules.mjs` mocks browser DOM essentials (`document`, `$`, `window`, `requestAnimationFrame`).
When writing new tests or updating existing ones:
- If your module accesses new DOM APIs or elements by ID, register their mock behavior inside `mockElement` in `tests/test_modules.mjs`.
- Keep the test script dependency-free so it executes quickly with standard `node`.

---

## 8. Summary Checklist Before Completing Any Agent Task

1. [ ] Changes made directly in `js/*.js` modules.
2. [ ] `node tests/test_modules.mjs` executed and all assertions passed.
3. [ ] No unexpected files created outside the project root.
4. [ ] Code follows existing indentation, naming conventions, and currency formatting standards.
