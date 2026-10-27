/**
 * Ledgerly Finance Tracker - Application Entrypoint & Coordinator
 */

import { state } from './state.js';
import { $, money, periodDays, toast, showLoading, hideLoading } from './utils.js';
import { normalizeRows } from './parser.js';
import {
  bounds,
  movePeriod,
  priorExpense,
  getPriorPeriodBounds,
  canMovePeriod,
  findNearestPeriodAnchorWithData
} from './dates.js';
import { renderDonut, renderMacroDonut, renderLineChart, initChartViewToggle, syncChartViewToggle } from './charts.js';
import { renderTable, registerTableRenderCallback, initColumnMenu, resetTableDisplayLimit } from './table.js';
import {
  filtered,
  baseFiltered,
  categoryTotals,
  syncSortPill,
  syncFilterPills,
  populateCategories,
  populateAccounts,
  initFilterListeners,
  registerRenderCallback,
  closeAllPopovers
} from './filters.js';
import {
  initPeriodPickerListeners,
  renderPeriodPicker,
  registerPeriodPickerRenderCallback
} from './period-picker.js';
import { initExportListeners, updatePrintHeader } from './export.js';
import {
  initSettings,
  initSettingsListeners,
  registerSettingsCallback
} from './settings.js';
import { PeriodType } from './types.js';

export function render(): void {
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
  const periodLabel = $<HTMLButtonElement>('period-label');
  if (periodLabel) periodLabel.textContent = range.label;
  const isNavigable = state.period !== 'all' && state.period !== 'custom';
  if (periodLabel) {
    periodLabel.disabled = !isNavigable;
    if (periodLabel.classList) {
      periodLabel.classList.toggle('disabled', !isNavigable);
    }
  }

  // Prev / Next chevrons: restricted to periods having data
  const canPrev = canMovePeriod(-1);
  const canNext = canMovePeriod(1);
  const prevBtn = $<HTMLButtonElement>('prev-period');
  if (prevBtn) {
    prevBtn.disabled = !canPrev;
    if (prevBtn.classList) {
      prevBtn.classList.toggle('disabled', !canPrev);
    }
  }
  const nextBtn = $<HTMLButtonElement>('next-period');
  if (nextBtn) {
    nextBtn.disabled = !canNext;
    if (nextBtn.classList) {
      nextBtn.classList.toggle('disabled', !canNext);
    }
  }

  const periodPop = $('period-popover');
  if (periodPop && !periodPop.classList.contains('hidden')) {
    renderPeriodPicker();
  }

  // Top metric cards
  const spentTitle = $('spent-title');
  if (spentTitle) {
    spentTitle.textContent = chartType === 'transfer' ? 'Transfers' : chartType === 'income' ? 'Income' : 'Total spent';
  }
  const spentVal = $('spent-value');
  if (spentVal) {
    spentVal.textContent = money(chartType === 'transfer' ? transfers : chartType === 'income' ? income : expenses);
    spentVal.className = chartType === 'transfer' ? 'amount-transfer' : chartType === 'income' ? 'amount-income' : 'amount-expense';
  }
  const incVal = $('income-value');
  if (incVal) {
    incVal.textContent = money(income);
    incVal.className = 'amount-income';
  }
  const net = income - expenses;
  const netVal = $('net-value');
  if (netVal) {
    netVal.textContent = money(net);
    netVal.className = net >= 0 ? 'amount-net-positive' : 'amount-net-negative';
  }
  const dailyVal = $('daily-value');
  if (dailyVal) {
    dailyVal.textContent = money(expenses / periodDays(range));
    dailyVal.className = 'amount-neutral';
  }
  const incCount = $('income-count');
  if (incCount) {
    const incLen = rows.filter(r => r.type === 'income').length;
    incCount.textContent = `${incLen} transaction${incLen === 1 ? '' : 's'}`;
  }
  const recCopy = $('records-copy');
  if (recCopy) {
    const expLen = rows.filter(r => r.type === 'expense').length;
    recCopy.textContent = `${expLen} expense${expLen === 1 ? '' : 's'}`;
  }
  const netCopy = $('net-copy');
  if (netCopy) {
    netCopy.textContent = 'Income − expenses';
  }
  const compareEl = $('spent-compare');
  const tooltipEl = $('spent-tooltip');
  if (compareEl) {
    if (chartType === 'transfer') {
      const txLen = rows.filter(r => r.type === 'transfer').length;
      compareEl.textContent = `${txLen} transfer${txLen === 1 ? '' : 's'}`;
      compareEl.setAttribute('aria-label', `${txLen} transfer${txLen === 1 ? '' : 's'} recorded`);
      compareEl.removeAttribute('title');
      if (tooltipEl) tooltipEl.textContent = `${txLen} transfer${txLen === 1 ? '' : 's'} recorded in this period`;
    } else if (!priorRange || prior === null || prior === 0) {
      compareEl.textContent = 'No prior period';
      const msg = !priorRange ? 'No prior period to compare against' : `No prior activity recorded (${priorRange.label})`;
      compareEl.setAttribute('aria-label', msg);
      compareEl.removeAttribute('title');
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
      compareEl.removeAttribute('title');
      if (tooltipEl) tooltipEl.textContent = fullDetail;
    }
  }

  // Clear drilldown button in spending panel
  const clearCat = $('clear-category');
  if (clearCat) {
    const hasCategoryFilter = state.selectedCategories.size > 0 || (state.excludedCategories && state.excludedCategories.size > 0);
    clearCat.classList.toggle('hidden', !hasCategoryFilter);
  }

  // Synchronize Breakdown / Trend View Toggle
  syncChartViewToggle();

  // Charts
  const baseRows = baseFiltered();
  const baseTotals = categoryTotals(baseRows, chartType);

  if (state.type === 'all' && state.selectedCategories.size === 0 && (!state.excludedCategories || state.excludedCategories.size === 0)) {
    renderMacroDonut(expenses, income, transfers, net);
  } else {
    renderDonut(baseTotals, chartTotal, chartType);
  }
  renderLineChart(rows, range, state.type);

  // Table
  renderTable(rows);

  // Synchronize Printable Statement Metadata
  updatePrintHeader(range, rows);
}

function initEventListeners(): void {
  // File Import Listener
  const fileInput = $<HTMLInputElement>('file-input');
  if (fileInput) {
    fileInput.addEventListener('change', async (e: Event) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
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

        const customStartEl = $<HTMLInputElement>('custom-start');
        if (customStartEl) customStartEl.value = state.customStart;
        const customEndEl = $<HTMLInputElement>('custom-end');
        if (customEndEl) customEndEl.value = state.customEnd;

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
      } catch (err: any) {
        hideLoading();
        toast(err.message || 'Could not read that workbook.');
        console.error(err);
      }
    });
  }

  // Period Tabs
  if (typeof document !== 'undefined') {
    document.querySelectorAll<HTMLElement>('[data-period]').forEach(btn => {
      btn.addEventListener('click', () => {
        const nextPeriod = btn.dataset.period as PeriodType | undefined;
        if (!nextPeriod || state.period === nextPeriod) return;
        closeAllPopovers();
        state.period = nextPeriod;
        document.querySelectorAll<HTMLElement>('[data-period]').forEach(b => b.classList.toggle('selected', b === btn));
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
  }

  // Prev / Next Period (restricted to periods with data)
  const prevBtn = $('prev-period');
  if (prevBtn) {
    prevBtn.onclick = () => {
      if (!canMovePeriod(-1)) return;
      showLoading('Updating period...');
      requestAnimationFrame(() => {
        setTimeout(() => {
          const target = findNearestPeriodAnchorWithData(-1);
          if (target) state.anchor = target;
          else movePeriod(-1);
          resetTableDisplayLimit();
          render();
          hideLoading();
        }, 12);
      });
    };
  }
  const nextBtn = $('next-period');
  if (nextBtn) {
    nextBtn.onclick = () => {
      if (!canMovePeriod(1)) return;
      showLoading('Updating period...');
      requestAnimationFrame(() => {
        setTimeout(() => {
          const target = findNearestPeriodAnchorWithData(1);
          if (target) state.anchor = target;
          else movePeriod(1);
          resetTableDisplayLimit();
          render();
          hideLoading();
        }, 12);
      });
    };
  }

  // Custom Dates
  const customStart = $<HTMLInputElement>('custom-start');
  if (customStart) customStart.onchange = (e) => {
    state.customStart = (e.target as HTMLInputElement).value;
    render();
  };
  const customEnd = $<HTMLInputElement>('custom-end');
  if (customEnd) customEnd.onchange = (e) => {
    state.customEnd = (e.target as HTMLInputElement).value;
    render();
  };

  // Clear Workspace
  const clearData = $('clear-data');
  if (clearData) {
    clearData.onclick = () => {
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
      const fileInputEl = $<HTMLInputElement>('file-input');
      if (fileInputEl) fileInputEl.value = '';
      toast('Workspace cleared');
    };
  }

  // Bottom Navigation Scroll Targets
  const navTargets: Record<string, string> = {
    overview: 'dashboard',
    spending: 'spending-section',
    transactions: 'transactions-section'
  };
  if (typeof document !== 'undefined') {
    document.querySelectorAll<HTMLElement>('[data-nav]').forEach(button => {
      button.onclick = () => {
        const navKey = button.dataset.nav;
        if (!navKey || !navTargets[navKey]) return;
        const target = $(navTargets[navKey]);
        if (!target || target.classList.contains('hidden')) return;
        document.querySelectorAll<HTMLElement>('[data-nav]').forEach(item => item.classList.toggle('active', item.dataset.nav === button.dataset.nav));
        button.classList.remove('pulse');
        requestAnimationFrame(() => button.classList.add('pulse'));
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        if (button.dataset.nav === 'transactions') {
          setTimeout(() => $('search')?.focus({ preventScroll: true }), 450);
        }
      };
    });
  }

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
  registerPeriodPickerRenderCallback(() => {
    resetTableDisplayLimit();
    render();
  });
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
  initPeriodPickerListeners();
  initColumnMenu();
  initExportListeners();
  initChartViewToggle(render);
  initEventListeners();
})();
