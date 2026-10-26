/**
 * Ledgerly Finance Tracker - Application Entrypoint & Coordinator
 */

import { state } from './state.js';
import { $, money, periodDays, toast, showLoading, hideLoading } from './utils.js';
import { normalizeRows } from './parser.js';
import { bounds, movePeriod, priorExpense, getPriorPeriodBounds } from './dates.js';
import { renderDonut, renderMacroDonut, renderLineChart, initChartViewToggle, syncChartViewToggle } from './charts.js';
import { renderTable, registerTableRenderCallback, initColumnMenu, resetTableDisplayLimit } from './table.js';
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
import { initExportListeners, updatePrintHeader } from './export.js';
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
  const chartType = state.type === 'transfer' ? 'transfer' : state.type === 'income' ? 'income' : 'expense';
  const chartTotal = chartType === 'transfer' ? transfers : chartType === 'income' ? income : expenses;
  const priorRange = getPriorPeriodBounds();
  const prior = priorExpense(chartType === 'income' ? 'income' : 'expense');

  // Header period labels & navigation controls
  if ($('period-label')) $('period-label').textContent = range.label;
  const isNavigable = state.period !== 'all' && state.period !== 'custom';
  if ($('prev-period')) {
    $('prev-period').disabled = !isNavigable;
    if (typeof $('prev-period').classList?.toggle === 'function') {
      $('prev-period').classList.toggle('disabled', !isNavigable);
    }
  }
  if ($('next-period')) {
    $('next-period').disabled = !isNavigable;
    if (typeof $('next-period').classList?.toggle === 'function') {
      $('next-period').classList.toggle('disabled', !isNavigable);
    }
  }

  // Top metric cards
  if ($('spent-title')) {
    $('spent-title').textContent = chartType === 'transfer' ? 'Transfers' : chartType === 'income' ? 'Income' : 'Total spent';
  }
  if ($('spent-value')) {
    $('spent-value').textContent = money(chartType === 'transfer' ? transfers : chartType === 'income' ? income : expenses);
    $('spent-value').className = chartType === 'transfer' ? 'amount-transfer' : chartType === 'income' ? 'amount-income' : 'amount-expense';
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
    $('income-count').textContent = `${incLen} transaction${incLen === 1 ? '' : 's'}`;
  }
  if ($('records-copy')) {
    const expLen = rows.filter(r => r.type === 'expense').length;
    $('records-copy').textContent = `${expLen} expense${expLen === 1 ? '' : 's'}`;
  }
  if ($('net-copy')) {
    $('net-copy').textContent = 'Income − expenses';
  }
  const compareEl = $('spent-compare');
  const tooltipEl = $('spent-tooltip');
  if (compareEl) {
    if (chartType === 'transfer') {
      const txLen = rows.filter(r => r.type === 'transfer').length;
      compareEl.textContent = `${txLen} transfer${txLen === 1 ? '' : 's'}`;
      compareEl.setAttribute('aria-label', `${txLen} transfer${txLen === 1 ? '' : 's'} recorded`);
      if (typeof compareEl.removeAttribute === 'function') compareEl.removeAttribute('title'); else compareEl.title = '';
      if (tooltipEl) tooltipEl.textContent = `${txLen} transfer${txLen === 1 ? '' : 's'} recorded in this period`;
    } else if (!priorRange || prior === null || prior === 0) {
      compareEl.textContent = 'No prior period';
      const msg = !priorRange ? 'No prior period to compare against' : `No prior activity recorded (${priorRange.label})`;
      compareEl.setAttribute('aria-label', msg);
      if (typeof compareEl.removeAttribute === 'function') compareEl.removeAttribute('title'); else compareEl.title = '';
      if (tooltipEl) tooltipEl.textContent = msg;
    } else {
      const targetVal = chartType === 'income' ? income : expenses;
      const pct = Math.abs((targetVal - prior) / prior * 100).toFixed(0);
      const sign = targetVal >= prior ? '+' : '-';
      compareEl.textContent = `${sign}${pct}%`;

      const directionWord = targetVal >= prior ? 'more' : 'less';
      const typeWord = chartType === 'income' ? 'earned' : 'spent';
      const pctDetailed = Math.abs((targetVal - prior) / prior * 100).toFixed(1);
      const fullDetail = `${pctDetailed}% ${directionWord} ${typeWord} compared to ${priorRange.label} (${money(prior)})`;

      compareEl.setAttribute('aria-label', fullDetail);
      if (typeof compareEl.removeAttribute === 'function') compareEl.removeAttribute('title'); else compareEl.title = '';
      if (tooltipEl) tooltipEl.textContent = fullDetail;
    }
  }

  // Clear drilldown button in spending panel
  if ($('clear-category')) {
    $('clear-category').classList.toggle('hidden', state.selectedCategories.size === 0);
  }

  // Synchronize Breakdown / Trend View Toggle
  syncChartViewToggle();

  // Charts
  if (state.type === 'all' && state.selectedCategories.size === 0) {
    renderMacroDonut(expenses, income, transfers, net);
  } else {
    renderDonut(categoryTotals(rows, chartType), chartTotal, chartType);
  }
  renderLineChart(rows, range, state.type);

  // Table
  renderTable(rows);

  // Synchronize Printable Statement Metadata
  updatePrintHeader(range, rows);
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
        showLoading('Reading spreadsheet...');
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

        resetTableDisplayLimit();
        render();
        hideLoading();
        toast(`${state.data.length.toLocaleString('en-IN')} transactions imported from ${file.name}`);
      } catch (err) {
        hideLoading();
        toast(err.message || 'Could not read that workbook.');
        console.error(err);
      }
    });
  }

  // Period Tabs
  document.querySelectorAll('[data-period]').forEach(btn => {
    btn.addEventListener('click', () => {
      const nextPeriod = btn.dataset.period;
      if (state.period === nextPeriod) return;
      state.period = nextPeriod;
      document.querySelectorAll('[data-period]').forEach(b => b.classList.toggle('selected', b === btn));
      $('custom-dates')?.classList.toggle('hidden', state.period !== 'custom');
      
      showLoading(state.period === 'all' ? 'Loading all activity...' : `Loading ${state.period}...`);
      requestAnimationFrame(() => {
        setTimeout(() => {
          resetTableDisplayLimit();
          render();
          hideLoading();
        }, 12);
      });
    });
  });

  // Prev / Next Period
  if ($('prev-period')) {
    $('prev-period').onclick = () => {
      if (state.period === 'all' || state.period === 'custom') return;
      showLoading('Updating period...');
      requestAnimationFrame(() => {
        setTimeout(() => {
          movePeriod(-1);
          resetTableDisplayLimit();
          render();
          hideLoading();
        }, 12);
      });
    };
  }
  if ($('next-period')) {
    $('next-period').onclick = () => {
      if (state.period === 'all' || state.period === 'custom') return;
      showLoading('Updating period...');
      requestAnimationFrame(() => {
        setTimeout(() => {
          movePeriod(1);
          resetTableDisplayLimit();
          render();
          hideLoading();
        }, 12);
      });
    };
  }

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

  // Prior Period Comparison Tooltip / Tap Handler
  const compareEl = $('spent-compare');
  if (compareEl && !compareEl.dataset.tooltipBound) {
    compareEl.dataset.tooltipBound = 'true';
    compareEl.addEventListener('click', (e) => {
      e.stopPropagation();
      const text = compareEl.getAttribute('aria-label') || compareEl.title || $('spent-tooltip')?.textContent;
      if (text && text !== 'No prior period') {
        toast(text);
      }
    });
  }
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
  initChartViewToggle(render);
  initEventListeners();
})();
