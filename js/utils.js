/**
 * Formatting, Sanitization, Storage & DOM Helpers
 */

export const $ = (id) => document.getElementById(id);

export function cleanText(value) {
  return String(value ?? '').trim();
}

export function escapeHtml(str) {
  return String(str || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export const money = (n, compact = false) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    notation: compact ? 'compact' : 'standard'
  }).format(n || 0);

export const dateKey = (date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

export function shortDate(d) {
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export function periodDays({ start, end }) {
  return Math.max(1, Math.ceil((dateKey(end) - dateKey(start)) / 86400000) + 1);
}

export function getStorage(key, fallback = null) {
  try {
    return typeof localStorage !== 'undefined' ? (localStorage.getItem(key) ?? fallback) : fallback;
  } catch (e) {
    return fallback;
  }
}

export function setStorage(key, val) {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, val);
  } catch (e) {}
}

export function toast(message) {
  const el = $('toast');
  if (!el) return;
  el.textContent = message;
  el.classList.add('visible');
  setTimeout(() => el.classList.remove('visible'), 2600);
}
