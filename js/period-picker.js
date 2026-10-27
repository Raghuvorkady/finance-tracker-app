/**
 * Interactive Period Selector & Data-Presence Grayout
 */

import { state } from './state.js';
import { $, shortDate } from './utils.js';
import { getPeriodsDataPresence, getAvailableYears, bounds, getCalendarWeek } from './dates.js';
import { closeAllPopovers } from './filters.js';

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const FULL_MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

let viewYear = new Date().getFullYear();
let viewMonth = new Date().getMonth();
let pickerView = 'month'; // 'week' | 'month' | 'year' | 'quarter' | 'financial'
let onRender = () => {};

export function registerPeriodPickerRenderCallback(fn) {
  onRender = fn;
}

export function getPickerView() {
  return pickerView;
}

export function setPickerView(mode) {
  pickerView = mode;
}

export function getViewYear() {
  return viewYear;
}

export function setViewYear(y) {
  viewYear = y;
}

export function getViewMonth() {
  return viewMonth;
}

export function setViewMonth(m) {
  viewMonth = m;
}

export function isAtCurrentPeriod(vYear = null, vMonth = null) {
  const now = new Date();
  const anchor = state.anchor || now;

  if (state.period === 'weekly') {
    const curBounds = bounds();
    const isCurrentWeek = (now >= curBounds.start && now <= curBounds.end);
    if (vYear !== null && vYear !== now.getFullYear()) return false;
    if (vMonth !== null && vMonth !== now.getMonth()) return false;
    return isCurrentWeek;
  }

  if (state.period === 'monthly') {
    const isAnchorCurrentMonth = (anchor.getFullYear() === now.getFullYear() && anchor.getMonth() === now.getMonth());
    if (vYear !== null && vYear !== now.getFullYear()) {
      return false;
    }
    return isAnchorCurrentMonth;
  }

  if (state.period === 'yearly') {
    return anchor.getFullYear() === now.getFullYear();
  }

  if (state.period === 'quarterly') {
    const isAnchorCurrentQuarter = (anchor.getFullYear() === now.getFullYear() &&
      Math.floor(anchor.getMonth() / 3) === Math.floor(now.getMonth() / 3));
    if (vYear !== null && vYear !== now.getFullYear()) {
      return false;
    }
    return isAnchorCurrentQuarter;
  }

  if (state.period === 'financial') {
    const currentFy = now.getMonth() < 3 ? now.getFullYear() - 1 : now.getFullYear();
    const anchorFy = anchor.getMonth() < 3 ? anchor.getFullYear() - 1 : anchor.getFullYear();
    return anchorFy === currentFy;
  }

  return false;
}

export function getWeeksForMonth(year, month) {
  const weeks = [];
  const firstDay = new Date(year, month, 1);
  const dayOffset = (firstDay.getDay() + 6) % 7;
  let curMonday = new Date(year, month, 1 - dayOffset, 0, 0, 0, 0);
  const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);

  while (curMonday <= monthEnd) {
    const start = new Date(curMonday.getFullYear(), curMonday.getMonth(), curMonday.getDate(), 0, 0, 0, 0);
    const end = new Date(curMonday.getFullYear(), curMonday.getMonth(), curMonday.getDate() + 6, 23, 59, 59, 999);
    const cw = getCalendarWeek(start);
    weeks.push({
      cw,
      start,
      end,
      anchor: new Date(start)
    });
    curMonday = new Date(curMonday.getFullYear(), curMonday.getMonth(), curMonday.getDate() + 7, 0, 0, 0, 0);
  }
  return weeks;
}

function renderTodayButton(isCurrent) {
  const disabledAttr = isCurrent ? 'disabled aria-disabled="true"' : '';
  const disabledClass = isCurrent ? 'disabled' : '';
  const titleAttr = isCurrent ? 'Already at current period' : 'Jump to current period';

  return `
    <button type="button" class="chevron period-picker-today-btn ${disabledClass}" id="picker-today-btn" ${disabledAttr} aria-label="${titleAttr}" title="${titleAttr}">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
        <circle cx="12" cy="15" r="2" fill="currentColor"/>
      </svg>
    </button>
  `;
}

export function renderPeriodPicker() {
  const pop = $('period-popover');
  if (!pop) return;

  const presence = getPeriodsDataPresence();
  const anchor = state.anchor || new Date();
  const now = new Date();

  if (pickerView === 'week') {
    const isCurrent = isAtCurrentPeriod(viewYear, viewMonth);
    const weeks = getWeeksForMonth(viewYear, viewMonth);
    let weeksHtml = '';

    for (const week of weeks) {
      const hasData = state.data.some(r => r.date >= week.start && r.date <= week.end);
      const isSelected = state.period === 'weekly' && anchor >= week.start && anchor <= week.end;
      const isCurrentWeek = now >= week.start && now <= week.end;
      const classes = [
        'period-picker-btn',
        'period-week-btn',
        hasData ? 'has-data' : 'has-no-data',
        isSelected ? 'selected' : '',
        isCurrentWeek ? 'is-current' : ''
      ].filter(Boolean).join(' ');

      const disabledAttr = hasData ? '' : 'disabled aria-disabled="true"';
      const cwStr = `CW${String(week.cw).padStart(2, '0')}`;
      const rangeStr = `${shortDate(week.start)} – ${shortDate(week.end)}`;
      const titleAttr = hasData
        ? `${cwStr} (${rangeStr})`
        : `No transactions in ${cwStr} (${rangeStr})`;

      weeksHtml += `<button type="button" class="${classes}" data-week-time="${week.start.getTime()}" ${disabledAttr} title="${titleAttr}">
        <span class="period-week-tag">${cwStr}</span>
        <span class="period-week-dates">(${rangeStr})</span>
      </button>`;
    }

    pop.innerHTML = `
      <div class="notion-popover-header period-popover-header">
        <div class="period-picker-nav">
          <button type="button" class="chevron period-picker-prev" id="picker-prev-month" aria-label="Previous month" title="Previous month">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <button type="button" class="period-picker-year-btn" id="picker-month-btn" title="Click to pick a month">
            <span>${MONTH_NAMES[viewMonth]} ${viewYear}</span>
            <svg class="period-picker-caret" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <button type="button" class="chevron period-picker-next" id="picker-next-month" aria-label="Next month" title="Next month">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
        <div class="period-popover-header-actions">
          ${renderTodayButton(isCurrent)}
          <button type="button" class="notion-popover-close-btn" data-close-popover aria-label="Done">Done</button>
        </div>
      </div>
      <div class="period-picker-grid period-grid-weeks">
        ${weeksHtml}
      </div>
    `;
  } else if (pickerView === 'month') {
    const isCurrent = isAtCurrentPeriod(viewYear, state.period === 'weekly' ? viewMonth : null);
    let monthsHtml = '';
    for (let m = 0; m < 12; m++) {
      const count = presence.yearMonths.get(viewYear)?.get(m) || 0;
      const hasData = count > 0;
      const isSelected = state.period === 'monthly'
        ? (anchor.getFullYear() === viewYear && anchor.getMonth() === m)
        : (state.period === 'weekly' && viewMonth === m);
      const isCurrentMonth = now.getFullYear() === viewYear && now.getMonth() === m;
      const classes = [
        'period-picker-btn',
        hasData ? 'has-data' : 'has-no-data',
        isSelected ? 'selected' : '',
        isCurrentMonth ? 'is-current' : ''
      ].filter(Boolean).join(' ');

      const disabledAttr = hasData ? '' : 'disabled aria-disabled="true"';
      const titleAttr = hasData
        ? `${FULL_MONTH_NAMES[m]} ${viewYear}`
        : `No transactions in ${FULL_MONTH_NAMES[m]} ${viewYear}`;

      monthsHtml += `<button type="button" class="${classes}" data-month="${m}" ${disabledAttr} title="${titleAttr}">${MONTH_NAMES[m]}</button>`;
    }

    const backToWeeksBtn = state.period === 'weekly'
      ? `<button type="button" class="period-picker-back-btn" id="picker-back-weeks" title="Back to weeks">← Weeks</button>`
      : '';

    pop.innerHTML = `
      <div class="notion-popover-header period-popover-header">
        <div class="period-picker-nav">
          <button type="button" class="chevron period-picker-prev" id="picker-prev-year" aria-label="Previous year" title="Previous year">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <button type="button" class="period-picker-year-btn" id="picker-year-btn" title="Click to pick a year">
            <span>${viewYear}</span>
            <svg class="period-picker-caret" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <button type="button" class="chevron period-picker-next" id="picker-next-year" aria-label="Next year" title="Next year">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
          ${backToWeeksBtn}
        </div>
        <div class="period-popover-header-actions">
          ${renderTodayButton(isCurrent)}
          <button type="button" class="notion-popover-close-btn" data-close-popover aria-label="Done">Done</button>
        </div>
      </div>
      <div class="period-picker-grid period-grid-months">
        ${monthsHtml}
      </div>
    `;
  } else if (pickerView === 'year') {
    const isCurrent = isAtCurrentPeriod();
    const years = getAvailableYears(3, 2);
    let yearsHtml = '';
    for (const y of years) {
      const hasData = presence.years.has(y);
      const isSelected = anchor.getFullYear() === y;
      const isCurrentYear = now.getFullYear() === y;
      const classes = [
        'period-picker-btn',
        'period-year-btn',
        hasData ? 'has-data' : 'has-no-data',
        isSelected ? 'selected' : '',
        isCurrentYear ? 'is-current' : ''
      ].filter(Boolean).join(' ');

      const disabledAttr = hasData ? '' : 'disabled aria-disabled="true"';
      const titleAttr = hasData ? `Year ${y}` : `No transactions in ${y}`;

      yearsHtml += `<button type="button" class="${classes}" data-year="${y}" ${disabledAttr} title="${titleAttr}">${y}</button>`;
    }

    const backBtn = (state.period === 'monthly' || state.period === 'weekly')
      ? `<button type="button" class="period-picker-back-btn" id="picker-back-months">← Back to months</button>`
      : `<span class="period-picker-title">Select Year</span>`;

    pop.innerHTML = `
      <div class="notion-popover-header period-popover-header">
        <div class="period-picker-title-wrap">${backBtn}</div>
        <div class="period-popover-header-actions">
          ${renderTodayButton(isCurrent)}
          <button type="button" class="notion-popover-close-btn" data-close-popover aria-label="Done">Done</button>
        </div>
      </div>
      <div class="period-picker-grid period-grid-years">
        ${yearsHtml}
      </div>
    `;
  } else if (pickerView === 'quarter') {
    const isCurrent = isAtCurrentPeriod(viewYear);
    const quarters = [
      { label: 'Q1', desc: 'Jan–Mar', q: 0 },
      { label: 'Q2', desc: 'Apr–Jun', q: 1 },
      { label: 'Q3', desc: 'Jul–Sep', q: 2 },
      { label: 'Q4', desc: 'Oct–Dec', q: 3 }
    ];
    let quartersHtml = '';
    const anchorQ = Math.floor(anchor.getMonth() / 3);

    for (const item of quarters) {
      const count = presence.yearQuarters.get(viewYear)?.get(item.q) || 0;
      const hasData = count > 0;
      const isSelected = state.period === 'quarterly' && anchor.getFullYear() === viewYear && anchorQ === item.q;
      const classes = [
        'period-picker-btn',
        'period-quarter-btn',
        hasData ? 'has-data' : 'has-no-data',
        isSelected ? 'selected' : ''
      ].filter(Boolean).join(' ');

      const disabledAttr = hasData ? '' : 'disabled aria-disabled="true"';
      const titleAttr = hasData
        ? `${item.label} ${viewYear} (${item.desc})`
        : `No transactions in ${item.label} ${viewYear}`;

      quartersHtml += `<button type="button" class="${classes}" data-quarter="${item.q}" ${disabledAttr} title="${titleAttr}">
        <strong>${item.label}</strong>
        <span class="period-picker-sub">${item.desc}</span>
      </button>`;
    }

    pop.innerHTML = `
      <div class="notion-popover-header period-popover-header">
        <div class="period-picker-nav">
          <button type="button" class="chevron period-picker-prev" id="picker-prev-year" aria-label="Previous year" title="Previous year">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <span class="period-picker-year-static">${viewYear}</span>
          <button type="button" class="chevron period-picker-next" id="picker-next-year" aria-label="Next year" title="Next year">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
        <div class="period-popover-header-actions">
          ${renderTodayButton(isCurrent)}
          <button type="button" class="notion-popover-close-btn" data-close-popover aria-label="Done">Done</button>
        </div>
      </div>
      <div class="period-picker-grid period-grid-quarters">
        ${quartersHtml}
      </div>
    `;
  } else if (pickerView === 'financial') {
    const isCurrent = isAtCurrentPeriod();
    const anchorFy = anchor.getMonth() < 3 ? anchor.getFullYear() - 1 : anchor.getFullYear();
    const years = getAvailableYears(2, 2);
    let fyHtml = '';

    for (const y of years) {
      const count = presence.financialYears.get(y) || 0;
      const hasData = count > 0;
      const isSelected = state.period === 'financial' && anchorFy === y;
      const label = `FY ${y}–${String(y + 1).slice(2)}`;
      const classes = [
        'period-picker-btn',
        'period-fy-btn',
        hasData ? 'has-data' : 'has-no-data',
        isSelected ? 'selected' : ''
      ].filter(Boolean).join(' ');

      const disabledAttr = hasData ? '' : 'disabled aria-disabled="true"';
      const titleAttr = hasData ? label : `No transactions in ${label}`;

      fyHtml += `<button type="button" class="${classes}" data-fy="${y}" ${disabledAttr} title="${titleAttr}">${label}</button>`;
    }

    pop.innerHTML = `
      <div class="notion-popover-header period-popover-header">
        <div class="period-picker-title">Select Financial Year</div>
        <div class="period-popover-header-actions">
          ${renderTodayButton(isCurrent)}
          <button type="button" class="notion-popover-close-btn" data-close-popover aria-label="Done">Done</button>
        </div>
      </div>
      <div class="period-picker-grid period-grid-fy">
        ${fyHtml}
      </div>
    `;
  }

  attachPickerEventDelegation(pop);
}

function attachPickerEventDelegation(pop) {
  // Current Period / Today quick-jump button
  const todayBtn = pop.querySelector('#picker-today-btn');
  if (todayBtn) {
    todayBtn.onclick = (e) => {
      e.stopPropagation();
      state.anchor = new Date();
      closeAllPopovers();
      onRender();
    };
  }

  // Month previous / next (for week view)
  const prevMonthBtn = pop.querySelector('#picker-prev-month');
  if (prevMonthBtn) {
    prevMonthBtn.onclick = (e) => {
      e.stopPropagation();
      viewMonth--;
      if (viewMonth < 0) {
        viewMonth = 11;
        viewYear--;
      }
      renderPeriodPicker();
    };
  }

  const nextMonthBtn = pop.querySelector('#picker-next-month');
  if (nextMonthBtn) {
    nextMonthBtn.onclick = (e) => {
      e.stopPropagation();
      viewMonth++;
      if (viewMonth > 11) {
        viewMonth = 0;
        viewYear++;
      }
      renderPeriodPicker();
    };
  }

  // Switch to month view from week view
  const monthBtn = pop.querySelector('#picker-month-btn');
  if (monthBtn) {
    monthBtn.onclick = (e) => {
      e.stopPropagation();
      pickerView = 'month';
      renderPeriodPicker();
    };
  }

  // Back to week view from month view
  const backWeeksBtn = pop.querySelector('#picker-back-weeks');
  if (backWeeksBtn) {
    backWeeksBtn.onclick = (e) => {
      e.stopPropagation();
      pickerView = 'week';
      renderPeriodPicker();
    };
  }

  // Year previous / next
  const prevBtn = pop.querySelector('#picker-prev-year');
  if (prevBtn) {
    prevBtn.onclick = (e) => {
      e.stopPropagation();
      viewYear--;
      renderPeriodPicker();
    };
  }

  const nextBtn = pop.querySelector('#picker-next-year');
  if (nextBtn) {
    nextBtn.onclick = (e) => {
      e.stopPropagation();
      viewYear++;
      renderPeriodPicker();
    };
  }

  // Switch to year view from month view
  const yearBtn = pop.querySelector('#picker-year-btn');
  if (yearBtn) {
    yearBtn.onclick = (e) => {
      e.stopPropagation();
      pickerView = 'year';
      renderPeriodPicker();
    };
  }

  // Back to month view from year view
  const backMonthsBtn = pop.querySelector('#picker-back-months');
  if (backMonthsBtn) {
    backMonthsBtn.onclick = (e) => {
      e.stopPropagation();
      pickerView = 'month';
      renderPeriodPicker();
    };
  }

  // Week selection
  pop.querySelectorAll('[data-week-time]').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      if (btn.disabled || btn.classList.contains('has-no-data')) return;
      const time = parseInt(btn.dataset.weekTime, 10);
      state.anchor = new Date(time);
      closeAllPopovers();
      onRender();
    };
  });

  // Month selection
  pop.querySelectorAll('[data-month]').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      if (btn.disabled || btn.classList.contains('has-no-data')) return;
      const monthIndex = parseInt(btn.dataset.month, 10);
      if (state.period === 'weekly') {
        viewMonth = monthIndex;
        pickerView = 'week';
        renderPeriodPicker();
      } else {
        state.anchor = new Date(viewYear, monthIndex, 1);
        closeAllPopovers();
        onRender();
      }
    };
  });

  // Year selection
  pop.querySelectorAll('[data-year]').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      if (btn.disabled || btn.classList.contains('has-no-data')) return;
      const y = parseInt(btn.dataset.year, 10);
      viewYear = y;
      if (state.period === 'monthly' || state.period === 'weekly') {
        pickerView = 'month';
        renderPeriodPicker();
      } else {
        state.anchor = new Date(y, 0, 1);
        closeAllPopovers();
        onRender();
      }
    };
  });

  // Quarter selection
  pop.querySelectorAll('[data-quarter]').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      if (btn.disabled || btn.classList.contains('has-no-data')) return;
      const q = parseInt(btn.dataset.quarter, 10);
      state.anchor = new Date(viewYear, q * 3, 1);
      closeAllPopovers();
      onRender();
    };
  });

  // FY selection
  pop.querySelectorAll('[data-fy]').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      if (btn.disabled || btn.classList.contains('has-no-data')) return;
      const fy = parseInt(btn.dataset.fy, 10);
      state.anchor = new Date(fy, 3, 1);
      closeAllPopovers();
      onRender();
    };
  });
}

export function togglePeriodPicker() {
  const pop = $('period-popover');
  const trigger = $('period-label');
  if (!pop || !trigger) return;

  const isNavigable = state.period !== 'all' && state.period !== 'custom';
  if (!isNavigable) return;

  const opening = pop.classList.contains('hidden');
  closeAllPopovers();

  if (opening) {
    // Reset viewYear, viewMonth and pickerView according to current state.period and state.anchor
    const anchor = state.anchor || new Date();
    viewYear = anchor.getFullYear();
    viewMonth = anchor.getMonth();
    if (state.period === 'weekly') {
      pickerView = 'week';
    } else if (state.period === 'monthly') {
      pickerView = 'month';
    } else if (state.period === 'yearly') {
      pickerView = 'year';
    } else if (state.period === 'quarterly') {
      pickerView = 'quarter';
    } else if (state.period === 'financial') {
      pickerView = 'financial';
    } else {
      pickerView = 'month';
    }

    renderPeriodPicker();
    pop.classList.remove('hidden');
    trigger.setAttribute('aria-expanded', 'true');
    $('mobile-popover-backdrop')?.classList.remove('hidden');
  }
}

export function initPeriodPickerListeners() {
  const labelBtn = $('period-label');
  if (labelBtn) {
    labelBtn.onclick = (e) => {
      e.stopPropagation();
      togglePeriodPicker();
    };
  }
}
