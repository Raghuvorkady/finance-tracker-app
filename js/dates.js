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
  if (state.period === 'weekly') a.setDate(a.getDate() + direction * 7);
  else if (state.period === 'monthly') a.setMonth(a.getMonth() + direction);
  else if (state.period === 'quarterly') a.setMonth(a.getMonth() + direction * 3);
  else if (state.period === 'yearly' || state.period === 'financial') a.setFullYear(a.getFullYear() + direction);
  state.anchor = a;
}

export function priorExpense() {
  const { start, end } = bounds();
  if (state.period === 'all' || state.period === 'custom') return null;
  const ms = end - start + 86400000;
  const prevStart = new Date(start - ms);
  const prevEnd = new Date(start - 1);
  return state.data.filter(r =>
    r.date >= prevStart && r.date <= prevEnd &&
    r.type === 'expense' &&
    (state.selectedCategories.size === 0 || state.selectedCategories.has(r.category)) &&
    (state.selectedAccounts.size === 0 || state.selectedAccounts.has(r.account))
  ).reduce((sum, r) => sum + r.amount, 0);
}
