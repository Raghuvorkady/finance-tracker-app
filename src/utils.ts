/**
 * Formatting, Sanitization, Storage & DOM Helpers
 */

import { CurrencyInfo } from './types.js';

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

const KNOWN_CURRENCY_MAP: Record<string, { code: string; symbol: string }> = {
  '$': { code: 'USD', symbol: '$' },
  'usd': { code: 'USD', symbol: '$' },
  'dollar': { code: 'USD', symbol: '$' },
  'dollars': { code: 'USD', symbol: '$' },
  '€': { code: 'EUR', symbol: '€' },
  'eur': { code: 'EUR', symbol: '€' },
  'euro': { code: 'EUR', symbol: '€' },
  'euros': { code: 'EUR', symbol: '€' },
  '£': { code: 'GBP', symbol: '£' },
  'gbp': { code: 'GBP', symbol: '£' },
  'pound': { code: 'GBP', symbol: '£' },
  'pounds': { code: 'GBP', symbol: '£' },
  '₹': { code: 'INR', symbol: '₹' },
  'inr': { code: 'INR', symbol: '₹' },
  'rs': { code: 'INR', symbol: '₹' },
  'rs.': { code: 'INR', symbol: '₹' },
  'rupee': { code: 'INR', symbol: '₹' },
  'rupees': { code: 'INR', symbol: '₹' },
  '¥': { code: 'JPY', symbol: '¥' },
  'jpy': { code: 'JPY', symbol: '¥' },
  'yen': { code: 'JPY', symbol: '¥' },
  'c$': { code: 'CAD', symbol: '$' },
  'cad': { code: 'CAD', symbol: '$' },
  'a$': { code: 'AUD', symbol: '$' },
  'aud': { code: 'AUD', symbol: '$' },
  's$': { code: 'SGD', symbol: '$' },
  'sgd': { code: 'SGD', symbol: '$' },
  'aed': { code: 'AED', symbol: 'AED' },
  'chf': { code: 'CHF', symbol: 'CHF' },
  'cny': { code: 'CNY', symbol: '¥' },
  '₩': { code: 'KRW', symbol: '₩' },
  'krw': { code: 'KRW', symbol: '₩' },
  '฿': { code: 'THB', symbol: '฿' },
  'thb': { code: 'THB', symbol: '฿' },
  '₫': { code: 'VND', symbol: '₫' },
  'vnd': { code: 'VND', symbol: '₫' },
  '₱': { code: 'PHP', symbol: '₱' },
  'php': { code: 'PHP', symbol: '₱' },
  'r$': { code: 'BRL', symbol: 'R$' },
  'brl': { code: 'BRL', symbol: 'R$' },
  'zł': { code: 'PLN', symbol: 'zł' },
  'pln': { code: 'PLN', symbol: 'zł' },
  'zar': { code: 'ZAR', symbol: 'R' }
};

export function resolveCurrency(raw: unknown): CurrencyInfo {
  if (!raw) return { code: 'INR', symbol: '₹' };
  const str = cleanText(raw);
  if (!str) return { code: 'INR', symbol: '₹' };
  const lower = str.toLowerCase();
  if (KNOWN_CURRENCY_MAP[lower]) {
    return { ...KNOWN_CURRENCY_MAP[lower] };
  }

  // 3-letter ISO code detection
  if (/^[a-zA-Z]{3}$/.test(str)) {
    const code = str.toUpperCase();
    try {
      const parts = new Intl.NumberFormat(code === 'INR' ? 'en-IN' : 'en-US', {
        style: 'currency',
        currency: code,
        currencyDisplay: 'narrowSymbol'
      }).formatToParts(0);
      const symbol = parts.find(p => p.type === 'currency')?.value || code;
      return { code, symbol };
    } catch (e) {
      return { code, symbol: code };
    }
  }

  // Fallback for custom symbols or strings
  return { code: 'INR', symbol: str };
}

let activeCurrency: CurrencyInfo = { code: 'INR', symbol: '₹' };

export function setActiveCurrency(curr: string | CurrencyInfo): void {
  if (typeof curr === 'string') {
    activeCurrency = resolveCurrency(curr);
  } else if (curr && curr.code && curr.symbol) {
    activeCurrency = { ...curr };
  }
}

export function getActiveCurrency(): CurrencyInfo {
  return { ...activeCurrency };
}

export const money = (n: number | string, compact = false, currencyOverride?: string): string => {
  const info = currencyOverride ? resolveCurrency(currencyOverride) : activeCurrency;
  const absVal = Math.abs(Number(n) || 0);
  const locale = info.code === 'INR' ? 'en-IN' : 'en-US';

  let formattedNumber: string;
  try {
    formattedNumber = new Intl.NumberFormat(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      notation: compact ? 'compact' : 'standard'
    }).format(absVal);
  } catch (e) {
    formattedNumber = absVal.toFixed(2);
  }

  return `${info.symbol}\u00A0${formattedNumber}`;
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
