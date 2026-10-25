/**
 * CSV Export (Filtered Data vs Complete Workbook Data)
 */

import { $, toast } from './utils.js';
import { state } from './state.js';
import { filtered, closeAllPopovers } from './filters.js';

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
}
