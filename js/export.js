/**
 * CSV & Vector PDF Statement Export
 */

import { $, toast } from './utils.js';
import { state } from './state.js';
import { filtered, closeAllPopovers } from './filters.js';
import { bounds } from './dates.js';
import { renderTable, getTableDisplayLimit, setTableDisplayLimit } from './table.js';

export function downloadCsv(all = false) {
  const rows = all ? [...state.data].sort((a, b) => b.date - a.date) : filtered();
  if (!rows.length) {
    toast('No transactions to export.');
    return;
  }
  const csv = [
    'Date,Category,Note,Description,Account,Type,Amount',
    ...rows.map(r => [
      r.date.toISOString().slice(0, 10),
      r.category,
      r.note,
      r.description || '',
      r.account,
      r.type,
      r.amount
    ].map(v => `"${String(v).replaceAll('"', '""')}"`).join(','))
  ].join('\n');
  const filename = all ? 'ledgerly-all-transactions.csv' : 'ledgerly-filtered-transactions.csv';
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
  toast(`Exported ${rows.length.toLocaleString('en-IN')} transactions (${all ? 'All data' : 'Filtered data'})`);
}

export function exportPdf() {
  closeAllPopovers();

  const rows = filtered();
  const range = bounds();

  // Populate print statement header
  const printPeriod = $('print-period-label');
  if (printPeriod) printPeriod.textContent = range.label;

  const printDate = $('print-date-generated');
  if (printDate) {
    const now = new Date();
    printDate.textContent = now.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  const printFilters = $('print-filter-summary');
  if (printFilters) {
    const filterParts = [];
    if (state.type !== 'all') {
      filterParts.push(`Type: ${state.type.charAt(0).toUpperCase() + state.type.slice(1)}`);
    }
    if (state.selectedCategories.size > 0) {
      filterParts.push(`Categories: ${Array.from(state.selectedCategories).join(', ')}`);
    } else {
      filterParts.push('All Categories');
    }
    if (state.selectedAccounts.size > 0) {
      filterParts.push(`Accounts: ${Array.from(state.selectedAccounts).join(', ')}`);
    } else {
      filterParts.push('All Accounts');
    }
    if (state.search) {
      filterParts.push(`Search: "${state.search}"`);
    }
    filterParts.push(`${rows.length.toLocaleString('en-IN')} transaction${rows.length === 1 ? '' : 's'}`);
    printFilters.textContent = filterParts.join(' · ');
  }

  // Temporarily show all transactions for a complete printed statement
  const prevLimit = getTableDisplayLimit();
  setTableDisplayLimit(Infinity);
  renderTable(rows);

  const originalTitle = typeof document !== 'undefined' ? document.title : '';
  const cleanLabel = (range.label || 'Statement').replace(/[^a-zA-Z0-9_\-]/g, '_');
  if (typeof document !== 'undefined') {
    document.title = `Ledgerly_Statement_${cleanLabel}`;
  }

  toast('Opening print dialog... Select "Save as PDF"');

  const restoreState = () => {
    if (typeof document !== 'undefined') {
      document.title = originalTitle;
    }
    setTableDisplayLimit(prevLimit);
    renderTable(rows);
  };

  if (typeof window !== 'undefined' && typeof window.print === 'function') {
    // Slight delay to allow DOM painting before dialog freezes rendering thread
    setTimeout(() => {
      try {
        window.print();
      } finally {
        restoreState();
      }
    }, 150);
  } else {
    restoreState();
  }
}

export function initExportListeners() {
  if ($('export-toggle-btn')) {
    $('export-toggle-btn').onclick = (e) => {
      e.stopPropagation();
      const menu = $('export-menu');
      if (!menu) return;
      const opening = menu.classList.contains('hidden');
      closeAllPopovers();
      if (opening) {
        menu.classList.remove('hidden');
        $('export-toggle-btn').setAttribute('aria-expanded', 'true');
        const filteredCount = filtered().length;
        const allCount = state.data.length;
        if ($('export-filtered-count')) $('export-filtered-count').textContent = `${filteredCount.toLocaleString('en-IN')} transaction${filteredCount === 1 ? '' : 's'}`;
        if ($('export-all-count')) $('export-all-count').textContent = `${allCount.toLocaleString('en-IN')} transaction${allCount === 1 ? '' : 's'}`;
      }
    };
  }
  if ($('export-filtered-btn')) {
    $('export-filtered-btn').onclick = (e) => {
      e.stopPropagation();
      closeAllPopovers();
      downloadCsv(false);
    };
  }
  if ($('export-all-btn')) {
    $('export-all-btn').onclick = (e) => {
      e.stopPropagation();
      closeAllPopovers();
      downloadCsv(true);
    };
  }
  if ($('export-pdf-btn')) {
    $('export-pdf-btn').onclick = (e) => {
      e.stopPropagation();
      closeAllPopovers();
      exportPdf();
    };
  }
  if ($('sheet-export-pdf')) {
    $('sheet-export-pdf').onclick = (e) => {
      e.stopPropagation();
      closeAllPopovers();
      const sheet = $('action-bottom-sheet');
      const backdrop = $('bottom-sheet-backdrop');
      if (sheet) sheet.classList.remove('open');
      if (backdrop) backdrop.classList.add('hidden');
      exportPdf();
    };
  }
}
