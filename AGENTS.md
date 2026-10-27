# AGENTS.md — Developer & AI Agent Guide

Welcome to the **Ledgerly Finance Analyst** codebase. This guide provides AI agents (such as Antigravity) and human developers with essential context on repository architecture, design principles, build tools, workflows, and coding conventions to ensure rapid, error-free modifications.

---

## 1. Project Overview & Architecture

**Ledgerly** is a high-performance, private, browser-based financial analytics dashboard tailored for personal finance exports (such as Money Manager `.xlsx` and `.xls` workbooks).

### Core Architectural Principles
- **Privacy-First & Local-Only:** All Excel parsing and aggregations run purely client-side inside the user's browser. No financial data is ever transmitted to a backend or remote server.
- **Strict TypeScript Authoring:** All application logic is authored in strongly typed TypeScript (`src/*.ts`).
- **Zero Runtime Dependencies:** The browser executes standard, unbundled native ES Modules in `js/` compiled by `tsc`. No runtime libraries, polyfills, or complex runtime bundlers are used.
- **Single Source of Truth:** Centralized mutable state in `src/state.ts` drives reactive re-renders across all view modules.
- **Responsive & Multi-Theme:** Supports 3 visual themes (`ledgerly`, `mobile`, `notion`) and 3 layout views (`stacked`, `split`, `tabbed`), engineered for both desktop displays and mobile touch screens.

---

## 2. Tech Stack & Dependencies

| Layer | Technology | Details |
|---|---|---|
| **Language** | TypeScript (ES2022+ ESM) | Authored in `src/*.ts`, compiled to `js/*.js` via `tsc` (gitignored) |
| **Markup & Styling** | HTML5 & CSS3 | CSS Custom Properties, CSS Grid, Flexbox, responsive design |
| **Spreadsheet Engine** | [SheetJS (xlsx)](https://sheetjs.com/) | Loaded via CDN in `index.html` (`xlsx.full.min.js`) |
| **Typography** | Google Fonts | `Manrope`, `Inter`, `DM Mono` |
| **Data Visualization** | Native SVG | Pure SVG Donut Charts (Macro Cashflow and Category Breakdowns) |
| **Development Server** | Python 3 (`http.server`) | Custom zero-config server (`server.py`) binding to `0.0.0.0:4173` |
| **Compiler & Testing** | TypeScript & Node.js | `tsc` compiler, `build.js` (bundler), and `tests/test_modules.mjs` |

---

## 3. Directory & File Structure

```
finance-tracker/
├── AGENTS.md               # Agent & developer operational guidelines (this file)
├── README.md               # End-user setup and product documentation
├── package.json            # npm scripts and TypeScript devDependency
├── tsconfig.json           # TypeScript configuration emitting ES2022 modules to js/
├── index.html              # Main single-page application entry point & DOM markup
├── styles.css              # Core design system, theme variables, and layout modes
├── enhancements.css        # Micro-animations, SVG hover states, and typography overrides
├── server.py               # Development server with LAN discovery (binds 0.0.0.0:4173)
├── build.js                # Optional bundler script (outputs to dist/app.bundle.js)
├── dist/                   # Optional standalone bundle output (gitignored)
├── js/                     # Compiled JavaScript output from tsc (gitignored)
├── src/                    # Modular TypeScript source code (single source of truth)
│   ├── types.ts            # Central domain interfaces, types, and Window declarations
│   ├── app.ts              # Orchestrator, render coordinator, and top-level event listeners
│   ├── categories.ts       # Category styling, Notion emoji mappings, color palettes
│   ├── charts.ts           # SVG Donut charts (macro cashflow & category breakdown) & trend lines
│   ├── dates.ts            # Date bounds, periods (weekly/monthly/quarterly/FY), calculations
│   ├── export.ts           # CSV export logic (current filtered view vs entire dataset) & PDF print
│   ├── filters.ts          # Filtering pipeline, multi-select popovers, sort & operator mechanisms
│   ├── parser.ts           # Excel workbook parsing, header detection, row normalization
│   ├── period-picker.ts    # Interactive period calendar popover with data-presence grayout
│   ├── settings.ts         # Theme switcher, font scaling, layout views, persistent localStorage
│   ├── state.ts            # Central reactive state object and default constants
│   ├── table.ts            # Transaction table (desktop) and card list (mobile) rendering
│   └── utils.ts            # DOM helpers ($), currency formatting (INR), sanitization, storage
└── tests/
    └── test_modules.mjs    # Headless Node.js integration tests with mocked DOM environment
```

---

## 4. Development & Build Commands

### 1. Build TypeScript Source
```bash
npm run build
```
- Compiles `src/*.ts` to `js/*.js` via `tsc`. Run once after cloning or making modifications.

### 2. Auto-Compile During Development
```bash
npm run watch
```
- Runs `tsc --watch` to automatically compile TypeScript on save.

### 3. Type Checking
```bash
npm run typecheck
```
- Verifies static type checking without emitting files (`tsc --noEmit`).

### 4. Start the Development Server
```bash
python3 server.py
```
- **Local Mac URL:** [http://localhost:4173](http://localhost:4173)
- **Mobile Wi-Fi URL:** `http://<YOUR_LOCAL_IP>:4173` (detected automatically by `server.py`).
- *Note:* If port 4173 is already in use, run:
  ```bash
  lsof -ti :4173 | xargs kill -9
  ```

### 5. Run the Test Suite
```bash
npm test
```
- Compiles TypeScript and runs headless tests in `tests/test_modules.mjs`.

### 6. Optional Standalone Bundle
```bash
npm run bundle
```
- Concatenates and strips ESM exports from compiled `js/*.js` modules into `dist/app.bundle.js` (gitignored).

---

## 5. Key Workflows & Golden Rules for Agents

### ⚠️ The Golden Rule: Edit `src/*.ts` Modules Only
- **`src/*.ts` is the single source of truth:** All modifications must be made inside `src/*.ts`.
- **Do not edit `js/` directly:** `js/` is the compiled output generated by `tsc` and is gitignored.
- **Always verify changes:**
  ```bash
  npm test
  ```

### State Modification Workflow
When adding or altering features:
1. Mutate state properties inside `state` (`src/state.ts`) or define interfaces in `src/types.ts`.
2. Call `render()` (or trigger it via registered render callback) so metric cards, charts, popovers, and table rows update coherently.
3. If new state properties need persistence, save and retrieve them via `getStorage` / `setStorage` in `src/utils.ts`.

### Adding a New Module
If you introduce a new source module (e.g. `src/analytics.ts`):
1. Create the module using standard TypeScript syntax (`export function ...`).
2. Add the compiled filename to `moduleOrder` in `build.js` in the correct dependency order.
3. Import the required exports into `src/app.ts` or sibling modules using `.js` specifiers (e.g. `import { ... } from './analytics.js'`).
4. Run `npm test` and `npm run bundle`.

---

## 6. Coding Conventions & Best Practices

### TypeScript
- **Formatting:** 2 spaces indentation, semicolons, single quotes where standard.
- **Strict Types:** Avoid `any` where possible. Use explicit interfaces from `src/types.ts`.
- **Defensive Parsing:** Always sanitize strings with `cleanText()`, escape HTML user inputs with `escapeHtml()`, and handle invalid dates/numbers gracefully with fallbacks.
- **Indian Financial Standard:** Currency formatting defaults to Indian Rupee (`en-IN`, INR `₹`, Lakhs and Crores grouping). Use the `money(amount, compact)` helper from `src/utils.ts`.

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

---

## 7. Summary Checklist Before Completing Any Agent Task

1. [ ] Changes made directly in `src/*.ts` modules.
2. [ ] `npm run typecheck` passes with zero errors.
3. [ ] `npm test` passes with all assertions passing.
4. [ ] No compiled files in `js/` committed to git.
