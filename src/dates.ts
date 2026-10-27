/**
 * Date Calculations, Period Bounds & Period Navigation
 */

import { state } from './state.js';
import { shortDate } from './utils.js';
import { PeriodBounds, FilterTransactionType, PeriodType } from './types.js';

let cachedDataRef: unknown = null;
let cachedMinDate: Date | null = null;
let cachedMaxDate: Date | null = null;

export function getDataDateRange(): { min: Date; max: Date } {
  if (cachedDataRef === state.data && cachedMinDate && cachedMaxDate) {
    return { min: cachedMinDate, max: cachedMaxDate };
  }
  if (!state.data.length) {
    const now = new Date();
    return { min: now, max: now };
  }
  let minTime = Infinity;
  let maxTime = -Infinity;
  for (let i = 0; i < state.data.length; i++) {
    const t = +state.data[i].date;
    if (t < minTime) minTime = t;
    if (t > maxTime) maxTime = t;
  }
  cachedDataRef = state.data;
  cachedMinDate = new Date(minTime);
  cachedMinDate.setHours(0, 0, 0, 0);
  cachedMaxDate = new Date(maxTime);
  cachedMaxDate.setHours(23, 59, 59, 999);
  return { min: cachedMinDate, max: cachedMaxDate };
}

export function getCalendarWeek(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

export interface PeriodsDataPresence {
  years: Set<number>;
  yearMonths: Map<number, Map<number, number>>;
  yearQuarters: Map<number, Map<number, number>>;
  financialYears: Map<number, number>;
}

export function getPeriodsDataPresence(): PeriodsDataPresence {
  const years = new Set<number>();
  const yearMonths = new Map<number, Map<number, number>>();
  const yearQuarters = new Map<number, Map<number, number>>();
  const financialYears = new Map<number, number>();

  for (let i = 0; i < state.data.length; i++) {
    const d = state.data[i].date;
    if (!d || isNaN(d.getTime())) continue;
    const y = d.getFullYear();
    const m = d.getMonth();
    const q = Math.floor(m / 3);
    const fy = m < 3 ? y - 1 : y;

    years.add(y);

    if (!yearMonths.has(y)) yearMonths.set(y, new Map<number, number>());
    const ym = yearMonths.get(y)!;
    ym.set(m, (ym.get(m) || 0) + 1);

    if (!yearQuarters.has(y)) yearQuarters.set(y, new Map<number, number>());
    const yq = yearQuarters.get(y)!;
    yq.set(q, (yq.get(q) || 0) + 1);

    financialYears.set(fy, (financialYears.get(fy) || 0) + 1);
  }

  return { years, yearMonths, yearQuarters, financialYears };
}

export function getAvailableYears(padBefore = 2, padAfter = 2): number[] {
  const anchorYear = (state.anchor || new Date()).getFullYear();
  if (!state.data.length) {
    const years: number[] = [];
    for (let y = anchorYear - padBefore; y <= anchorYear + padAfter; y++) {
      years.push(y);
    }
    return years;
  }
  const { min, max } = getDataDateRange();
  const minYear = Math.min(min.getFullYear(), anchorYear);
  const maxYear = Math.max(max.getFullYear(), anchorYear);
  const start = minYear - padBefore;
  const end = maxYear + padAfter;
  const years: number[] = [];
  for (let y = start; y <= end; y++) {
    years.push(y);
  }
  return years;
}

export function bounds(): PeriodBounds {
  const anchor = state.anchor || new Date();
  if (state.period === 'all') {
    if (!state.data.length) return { start: new Date(), end: new Date(), label: 'All activity' };
    const { min, max } = getDataDateRange();
    return { start: new Date(min), end: new Date(max), label: 'All activity' };
  }
  if (state.period === 'custom') {
    const { min, max } = getDataDateRange();
    const start = state.customStart ? new Date(`${state.customStart}T00:00:00`) : new Date(min);
    start.setHours(0, 0, 0, 0);
    const end = state.customEnd ? new Date(`${state.customEnd}T23:59:59.999`) : new Date(max);
    end.setHours(23, 59, 59, 999);
    return { start, end, label: `${shortDate(start)} – ${shortDate(end)}` };
  }
  if (state.period === 'weekly') {
    const day = (anchor.getDay() + 6) % 7;
    const start = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() - day, 0, 0, 0, 0);
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6, 23, 59, 59, 999);
    return { start, end, label: `${shortDate(start)} – ${shortDate(end)}` };
  }
  if (state.period === 'monthly') {
    const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1, 0, 0, 0, 0);
    const end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start, end, label: anchor.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) };
  }
  if (state.period === 'quarterly') {
    const q = Math.floor(anchor.getMonth() / 3);
    const start = new Date(anchor.getFullYear(), q * 3, 1, 0, 0, 0, 0);
    const end = new Date(anchor.getFullYear(), q * 3 + 3, 0, 23, 59, 59, 999);
    return { start, end, label: `Q${q + 1} ${anchor.getFullYear()}` };
  }
  if (state.period === 'yearly') {
    const start = new Date(anchor.getFullYear(), 0, 1, 0, 0, 0, 0);
    const end = new Date(anchor.getFullYear(), 11, 31, 23, 59, 59, 999);
    return { start, end, label: String(anchor.getFullYear()) };
  }
  const fy = anchor.getMonth() < 3 ? anchor.getFullYear() - 1 : anchor.getFullYear();
  const start = new Date(fy, 3, 1, 0, 0, 0, 0);
  const end = new Date(fy + 1, 2, 31, 23, 59, 59, 999);
  return { start, end, label: `FY ${fy}–${String(fy + 1).slice(2)}` };
}

export function periodBoundsForAnchor(anchor: Date, period: PeriodType = state.period): { start: Date; end: Date } | null {
  if (period === 'weekly') {
    const day = (anchor.getDay() + 6) % 7;
    const start = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() - day, 0, 0, 0, 0);
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6, 23, 59, 59, 999);
    return { start, end };
  }
  if (period === 'monthly') {
    const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1, 0, 0, 0, 0);
    const end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start, end };
  }
  if (period === 'quarterly') {
    const q = Math.floor(anchor.getMonth() / 3);
    const start = new Date(anchor.getFullYear(), q * 3, 1, 0, 0, 0, 0);
    const end = new Date(anchor.getFullYear(), q * 3 + 3, 0, 23, 59, 59, 999);
    return { start, end };
  }
  if (period === 'yearly') {
    const start = new Date(anchor.getFullYear(), 0, 1, 0, 0, 0, 0);
    const end = new Date(anchor.getFullYear(), 11, 31, 23, 59, 59, 999);
    return { start, end };
  }
  if (period === 'financial') {
    const fy = anchor.getMonth() < 3 ? anchor.getFullYear() - 1 : anchor.getFullYear();
    const start = new Date(fy, 3, 1, 0, 0, 0, 0);
    const end = new Date(fy + 1, 2, 31, 23, 59, 59, 999);
    return { start, end };
  }
  return null;
}

export function hasPeriodData(anchor: Date, period: PeriodType = state.period): boolean {
  if (!state.data.length) return false;
  const b = periodBoundsForAnchor(anchor, period);
  if (!b) return false;
  for (let i = 0; i < state.data.length; i++) {
    const d = state.data[i].date;
    if (d >= b.start && d <= b.end) return true;
  }
  return false;
}

export function canMovePeriod(direction: number): boolean {
  if (state.period === 'all' || state.period === 'custom' || !state.data.length) return false;
  const cur = bounds();
  if (direction < 0) {
    for (let i = 0; i < state.data.length; i++) {
      if (state.data[i].date < cur.start) return true;
    }
    return false;
  } else {
    for (let i = 0; i < state.data.length; i++) {
      if (state.data[i].date > cur.end) return true;
    }
    return false;
  }
}

export function getShiftedAnchor(direction: number, customAnchor: Date | null = state.anchor, customPeriod: PeriodType = state.period): Date {
  const a = new Date(customAnchor || new Date());
  if (customPeriod === 'weekly') {
    a.setDate(a.getDate() + direction * 7);
  } else if (customPeriod === 'monthly') {
    a.setDate(1);
    a.setMonth(a.getMonth() + direction);
  } else if (customPeriod === 'quarterly') {
    a.setDate(1);
    a.setMonth(a.getMonth() + direction * 3);
  } else if (customPeriod === 'yearly' || customPeriod === 'financial') {
    a.setDate(1);
    a.setFullYear(a.getFullYear() + direction);
  }
  return a;
}

export function findNearestPeriodAnchorWithData(direction: number): Date | null {
  if (!canMovePeriod(direction)) return null;
  let next = getShiftedAnchor(direction);
  let count = 0;
  while (!hasPeriodData(next) && count < 120) {
    next = getShiftedAnchor(direction, next);
    count++;
  }
  return hasPeriodData(next) ? next : null;
}

export function movePeriod(direction: number): void {
  if (state.period === 'all' || state.period === 'custom') return;
  state.anchor = getShiftedAnchor(direction);
}

export function getPriorPeriodBounds(): PeriodBounds | null {
  const anchor = state.anchor || new Date();
  if (state.period === 'all' || state.period === 'custom') return null;

  if (state.period === 'monthly') {
    const prevMonthDate = new Date(anchor.getFullYear(), anchor.getMonth() - 1, 15);
    const start = new Date(prevMonthDate.getFullYear(), prevMonthDate.getMonth(), 1, 0, 0, 0, 0);
    const end = new Date(prevMonthDate.getFullYear(), prevMonthDate.getMonth() + 1, 0, 23, 59, 59, 999);
    const label = prevMonthDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    return { start, end, label };
  }

  if (state.period === 'weekly') {
    const day = (anchor.getDay() + 6) % 7;
    const curStart = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() - day, 0, 0, 0, 0);
    const start = new Date(curStart.getFullYear(), curStart.getMonth(), curStart.getDate() - 7, 0, 0, 0, 0);
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6, 23, 59, 59, 999);
    return { start, end, label: `${shortDate(start)} – ${shortDate(end)}` };
  }

  if (state.period === 'quarterly') {
    const q = Math.floor(anchor.getMonth() / 3);
    const prevQ = (q - 1 + 4) % 4;
    const prevYear = q === 0 ? anchor.getFullYear() - 1 : anchor.getFullYear();
    const start = new Date(prevYear, prevQ * 3, 1, 0, 0, 0, 0);
    const end = new Date(prevYear, prevQ * 3 + 3, 0, 23, 59, 59, 999);
    return { start, end, label: `Q${prevQ + 1} ${prevYear}` };
  }

  if (state.period === 'yearly') {
    const prevYear = anchor.getFullYear() - 1;
    const start = new Date(prevYear, 0, 1, 0, 0, 0, 0);
    const end = new Date(prevYear, 11, 31, 23, 59, 59, 999);
    return { start, end, label: String(prevYear) };
  }

  if (state.period === 'financial') {
    const fy = anchor.getMonth() < 3 ? anchor.getFullYear() - 1 : anchor.getFullYear();
    const prevFy = fy - 1;
    const start = new Date(prevFy, 3, 1, 0, 0, 0, 0);
    const end = new Date(prevFy + 1, 2, 31, 23, 59, 59, 999);
    return { start, end, label: `FY ${prevFy}–${String(prevFy + 1).slice(2)}` };
  }

  return null;
}

export function priorExpense(type: FilterTransactionType = 'expense'): number | null {
  const prior = getPriorPeriodBounds();
  if (!prior) return null;

  const { start, end } = prior;
  const lower = state.search ? state.search.toLowerCase() : '';

  return state.data.filter(r => {
    if (r.date < start || r.date > end || r.type !== type) return false;
    const isAcctExclude = state.accountFilterMode === 'exclude' || state.accountOperator === 'is-not';
    if (isAcctExclude) {
      const list = (state.excludedAccounts && state.excludedAccounts.size > 0)
        ? state.excludedAccounts
        : state.selectedAccounts;
      if (list && list.has(r.account)) return false;
    } else {
      if (state.selectedAccounts.size > 0 && !state.selectedAccounts.has(r.account)) return false;
      if (state.account !== 'all' && r.account !== state.account) return false;
    }
    if (lower && ![r.category, r.note, r.description, r.account].join(' ').toLowerCase().includes(lower)) return false;

    const isExclude = state.categoryFilterMode === 'exclude' || state.categoryOperator === 'is-not';
    if (isExclude) {
      const list = (state.excludedCategories && state.excludedCategories.size > 0)
        ? state.excludedCategories
        : state.selectedCategories;
      if (list && list.has(r.category)) return false;
    } else {
      if (state.selectedCategories.size > 0 && !state.selectedCategories.has(r.category)) return false;
      if (state.category !== 'all' && r.category !== state.category) return false;
    }
    return true;
  }).reduce((sum, r) => sum + r.amount, 0);
}
