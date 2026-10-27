/**
 * Formatting, Sanitization, Storage & DOM Helpers
 */

export const $ = <T extends HTMLElement = HTMLElement>(id: string): T | null =>
  typeof document !== 'undefined' ? (document.getElementById(id) as T | null) : null;

export function cleanText(value: unknown): string {
  return String(value ?? '').trim();
}

export function escapeHtml(str: unknown): string {
  return String(str || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export const money = (n: number | string, compact = false): string => {
  const absVal = Math.abs(Number(n) || 0);
  const formatted = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    notation: compact ? 'compact' : 'standard'
  }).format(absVal);
  return formatted.replace(/^[-+−]?\s*₹\s*/, '₹\u00A0');
};

export const dateKey = (date: Date): number =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

export function shortDate(d: Date): string {
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export function periodDays({ start, end }: { start: Date; end: Date }): number {
  return Math.max(1, Math.ceil((dateKey(end) - dateKey(start)) / 86400000) + 1);
}

export function getStorage<T extends string>(key: string, fallback: T | null = null): string | null {
  try {
    return typeof localStorage !== 'undefined' ? (localStorage.getItem(key) ?? fallback) : fallback;
  } catch (e) {
    return fallback;
  }
}

export function setStorage(key: string, val: string): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, val);
  } catch (e) {}
}

export function toast(message: string): void {
  const el = $('toast');
  if (!el) return;
  el.textContent = message;
  el.classList.add('visible');
  setTimeout(() => el.classList.remove('visible'), 2600);
}

export function showLoading(message = 'Loading...'): void {
  const bar = $('top-loading-bar');
  const indicator = $('loading-indicator');
  const text = $('loading-text');
  if (bar) bar.classList.remove('hidden');
  if (indicator) {
    if (text) text.textContent = message;
    indicator.classList.remove('hidden');
  }
}

export function hideLoading(): void {
  const bar = $('top-loading-bar');
  const indicator = $('loading-indicator');
  if (bar) bar.classList.add('hidden');
  if (indicator) indicator.classList.add('hidden');
}
