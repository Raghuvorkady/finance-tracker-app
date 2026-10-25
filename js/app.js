/**
 * Ledgerly Finance Tracker - Application Entrypoint & Coordinator
 */

import { state } from './state.js';
import { $, money, periodDays, toast } from './utils.js';
import { normalizeRows } from './parser.js';
import { bounds, movePeriod, priorExpense } from './dates.js';
import { renderDonut, renderMacroDonut } from './charts.js';
import { renderTable, registerTableRenderCallback, initColumnMenu } from './table.js';
import {
  filtered,
  categoryTotals,
  syncSortPill,
  syncFilterPills,
  populateCategories,
  populateAccounts,
  initFilterListeners,
  registerRenderCallback
} from './filters.js';
import { initExportListeners } from './export.js';
import {
  initSettings,
  initSettingsListeners,
  registerSettingsCallback
} from './settings.js';

export function render() {
  populateCategories();
  populateAccounts();
  syncSortPill();
  syncFilterPills();

  const range = bounds();
  const rows = filtered();
  const expenses = rows.filter(r => r.type === 'expense').reduce((s, r) => s + r.amount, 0);
  const income = rows.filter(r => r.type === 'income').reduce((s, r) => s + r.amount, 0);
  const transfers = rows.filter(r => r.type === 'transfer').reduce((s, r) => s + r.amount, 0);
  const prior = priorExpense();
  const chartType = state.type === 'transfer' ? 'transfer' : state.type === 'income' ? 'income' : 'expense';
  const chartTotal = chartType === 'transfer' ? transfers : chartType === 'income' ? income : expenses;

  // Header period labels
  if ($('period-label')) $('period-label').textContent = range.label;
  if ($('period-mode-label')) {
    $('period-mode-label').textContent = state.period === 'financial' ? 'FINANCIAL YEAR' : state.period.toUpperCase();
  }

  // Top metric cards
  if ($('spent-title')) {
    $('spent-title').textContent = chartType === 'transfer' ? 'Money moved' : chartType === 'income' ? 'Money received' : 'Total spent';
  }
  if ($('spent-value')) {
    $('spent-value').textContent = money(chartType === 'transfer' ? transfers : chartType === 'income' ? income : expenses);
    $('spent-value').className = chartType === 'transfer' ? 'amount-neutral' : chartType === 'income' ? 'amount-income' : 'amount-expense';
  }
  if ($('income-value')) {
    $('income-value').textContent = money(income);
    $('income-value').className = 'amount-income';
  }
  const net = income - expenses;
  if ($('net-value')) {
    $('net-value').textContent = money(net);
    $('net-value').className = net >= 0 ? 'amount-net-positive' : 'amount-net-negative';
  }
  if ($('daily-value')) {
    $('daily-value').textContent = money(expenses / periodDays(range));
    $('daily-value').className = 'amount-neutral';
  }
  if ($('income-count')) {
    const incLen = rows.filter(r => r.type === 'income').length;
    $('income-count').textContent = `${incLen} income transaction${incLen === 1 ? '' : 's'}`;
  }
  if ($('records-copy')) {
    $('records-copy').textContent = `${rows.filter(r => r.type === 'expense').length} recorded expenses`;
  }
  if ($('spent-compare')) {
    $('spent-compare').textContent = chartType === 'transfer'
      ? `${rows.filter(r => r.type === 'transfer').length} transfer record${rows.filter(r => r.type === 'transfer').length === 1 ? '' : 's'} in this view`
      : prior === null || prior === 0
        ? 'No prior period to compare'
        : `${Math.abs((expenses - prior) / prior * 100).toFixed(0)}% ${expenses > prior ? 'more' : 'less'} than prior period`;
  }

  // Panel title
  if ($('breakdown-title')) {
    if (state.type === 'all' && state.selectedCategories.size === 0) {
      $('breakdown-title').textContent = 'Cashflow Breakdown';
    } else if (state.type === 'income') {
      $('breakdown-title').textContent = 'Income Breakdown';
    } else if (state.type === 'transfer') {
      $('breakdown-title').textContent = 'Transfers Breakdown';
    } else {
      $('breakdown-title').textContent = 'Expense Breakdown';
    }
  }

  // Clear drilldown button in spending panel
  if ($('clear-category')) {
    $('clear-category').classList.toggle('hidden', state.selectedCategories.size === 0);
  }

  // Charts
  if (state.type === 'all' && state.selectedCategories.size === 0) {
    renderMacroDonut(expenses, income, transfers, net);
  } else {
    renderDonut(categoryTotals(rows, chartType), chartTotal, chartType);
  }

  // Table
  renderTable(rows);
}

function initEventListeners() {
  // File Import Listener
  const fileInput = $('file-input');
  if (fileInput) {
    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (!window.XLSX) {
        toast('The Excel reader is still loading. Please try again.');
        return;
      }
      try {
        const wb = window.XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows = window.XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
        state.data = normalizeRows(rows);
        if (!state.data.length) throw new Error('No usable transactions were found.');

        state.anchor = new Date(Math.max(...state.data.map(r => +r.date)));
        state.customStart = state.data.reduce((a, r) => a < r.date ? a : r.date, state.data[0].date).toISOString().slice(0, 10);
        state.customEnd = state.anchor.toISOString().slice(0, 10);

        if ($('custom-start')) $('custom-start').value = state.customStart;
        if ($('custom-end')) $('custom-end').value = state.customEnd;

        populateCategories();
        populateAccounts();

        $('empty-state')?.classList.add('hidden');
        $('dashboard')?.classList.remove('hidden');
        $('app-topbar')?.classList.remove('hidden');
        $('bottom-nav')?.classList.remove('hidden');

        render();
        toast(`${state.data.length.toLocaleString('en-IN')} transactions imported from ${file.name}`);
      } catch (err) {
        toast(err.message || 'Could not read that workbook.');
        console.error(err);
      }
    });
  }

  // Period Tabs
  document.querySelectorAll('[data-period]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.period = btn.dataset.period;
      document.querySelectorAll('[data-period]').forEach(b => b.classList.toggle('selected', b === btn));
      $('custom-dates')?.classList.toggle('hidden', state.period !== 'custom');
      render();
    });
  });

  // Prev / Next Period
  if ($('prev-period')) $('prev-period').onclick = () => { movePeriod(-1); render(); };
  if ($('next-period')) $('next-period').onclick = () => { movePeriod(1); render(); };

  // Custom Dates
  if ($('custom-start')) $('custom-start').onchange = (e) => { state.customStart = e.target.value; render(); };
  if ($('custom-end')) $('custom-end').onchange = (e) => { state.customEnd = e.target.value; render(); };

  // Clear Workspace
  if ($('clear-data')) {
    $('clear-data').onclick = () => {
      state.data = [];
      state.selectedCategories.clear();
      state.selectedAccounts.clear();
      state.category = 'all';
      state.account = 'all';

      $('dashboard')?.classList.add('hidden');
      $('app-topbar')?.classList.add('hidden');
      $('bottom-nav')?.classList.add('hidden');
      $('display-settings')?.classList.add('hidden');
      $('empty-state')?.classList.remove('hidden');
      if ($('file-input')) $('file-input').value = '';
      toast('Workspace cleared');
    };
  }

  // Bottom Navigation Scroll Targets
  const navTargets = {
    overview: 'dashboard',
    spending: 'spending-section',
    transactions: 'transactions-section'
  };
  document.querySelectorAll('[data-nav]').forEach(button => {
    button.onclick = () => {
      const target = $(navTargets[button.dataset.nav]);
      if (!target || target.classList.contains('hidden')) return;
      document.querySelectorAll('[data-nav]').forEach(item => item.classList.toggle('active', item.dataset.nav === button.dataset.nav));
      button.classList.remove('pulse');
      requestAnimationFrame(() => button.classList.add('pulse'));
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (button.dataset.nav === 'transactions') {
        setTimeout(() => $('search')?.focus({ preventScroll: true }), 450);
      }
    };
  });
}

// ── Application Initialization ──
(function bootstrap() {
  registerRenderCallback(render);
  registerTableRenderCallback(() => {
    if (state.data.length) render();
    else renderTable([]);
  });
  registerSettingsCallback(() => {
    if (state.data.length) render();
    else renderTable([]);
  });

  initSettings();
  initSettingsListeners();
  initFilterListeners();
  initColumnMenu();
  initExportListeners();
  initEventListeners();
})();
