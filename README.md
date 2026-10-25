# Ledgerly Finance Analyst

A private, browser-based dashboard for Money Manager Excel exports. The workbook is read locally in the browser and is not uploaded to a server.

## Run locally

From this folder, start the development server bound to `0.0.0.0` (accessible from Mac and mobile devices on the same Wi-Fi):

```bash
python3 server.py
```

Or using the built-in Python module:

```bash
python3 -m http.server 4173 --bind 0.0.0.0
```

### Accessing the app

- **On your Mac:** Open [http://localhost:4173](http://localhost:4173)
- **On your iPhone (same Wi-Fi):** Open Safari and visit `http://<YOUR_MAC_IP>:4173` (e.g. `http://10.206.25.206:4173`)

> **Note for macOS Firewall:** When starting the server with `--bind 0.0.0.0`, macOS may prompt *"Do you want the application python3 to accept incoming network connections?"* — click **Allow**.

## Included analysis

- Excel import with transaction-type normalization and transfer separation
- Drill-down filters for category, transaction type, free-text search, and custom dates
- Weekly, monthly, quarterly, yearly, financial-year, custom, and all-time navigation
- Interactive category donut chart and sortable transaction list
- Expense, income, net-flow, and daily-spend metrics
- Data-driven saving suggestion and CSV export of the current filtered view
