/**
 * Date Calculations, Period Bounds & Period Navigation
 */

import { state } from './state.js';
import { shortDate } from './utils.js';

let cachedDataRef = null;
let cachedMinDate = null;
let cachedMaxDate = null;

export function getDataDateRange() {
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

export function bounds() {
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

export function movePeriod(direction) {
  if (state.period === 'all' || state.period === 'custom') return;
  const a = new Date(state.anchor || new Date());
  if (state.period === 'weekly') {
    a.setDate(a.getDate() + direction * 7);
  } else if (state.period === 'monthly') {
    a.setDate(1);
    a.setMonth(a.getMonth() + direction);
  } else if (state.period === 'quarterly') {
    a.setDate(1);
    a.setMonth(a.getMonth() + direction * 3);
  } else if (state.period === 'yearly' || state.period === 'financial') {
    a.setDate(1);
    a.setFullYear(a.getFullYear() + direction);
  }
  state.anchor = a;
}

export function getPriorPeriodBounds() {
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

export function priorExpense(type = 'expense') {
  const prior = getPriorPeriodBounds();
  if (!prior) return null;

  const { start, end } = prior;
  const lower = state.search ? state.search.toLowerCase() : '';

  return state.data.filter(r =>
    r.date >= start && r.date <= end &&
    r.type === type &&
    (state.selectedCategories.size === 0 || state.selectedCategories.has(r.category)) &&
    (state.category === 'all' || r.category === state.category) &&
    (state.selectedAccounts.size === 0 || state.selectedAccounts.has(r.account)) &&
    (state.account === 'all' || r.account === state.account) &&
    (!lower || [r.category, r.note, r.description, r.account].join(' ').toLowerCase().includes(lower))
  ).reduce((sum, r) => sum + r.amount, 0);
}
