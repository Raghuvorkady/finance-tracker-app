/**
 * Excel Parsing & Transaction Normalization
 */

import { cleanText } from './utils.js';

export function findColumn(headers, choices) {
  const clean = headers.map(h => String(h).trim().toLowerCase());
  const exactIdx = clean.findIndex(h => choices.includes(h));
  if (exactIdx !== -1) return headers[exactIdx];
  const subIdx = clean.findIndex(h => choices.some(c => h.includes(c)));
  return subIdx !== -1 ? headers[subIdx] : undefined;
}

export function normalizeType(value) {
  const type = cleanText(value).toLowerCase();
  if (type.includes('transfer')) return 'transfer';
  if (type.includes('income')) return 'income';
  return 'expense';
}

export function parseAmount(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? Math.abs(value) : 0;
  if (!value) return 0;
  const cleaned = String(value).replace(/[^0-9.-]+/g, '');
  const num = parseFloat(cleaned);
  return Number.isFinite(num) ? Math.abs(num) : 0;
}

export function parseDate(value) {
  if (!value) return null;
  if (value instanceof Date) {
    return isNaN(value) ? null : new Date(value.getFullYear(), value.getMonth(), value.getDate(), 0, 0, 0, 0);
  }
  if (typeof value === 'number') {
    const d = new Date(Math.round((value - 25569) * 86400 * 1000));
    return isNaN(d) ? null : new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  }
  if (typeof value === 'string') {
    const s = value.trim();
    const m = s.match(/^(\d{1,4})[./-](\d{1,2})[./-](\d{2,4})/);
    if (m) {
      if (m[1].length === 4) {
        return new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10), 0, 0, 0, 0);
      }
      const p1 = parseInt(m[1], 10);
      const p2 = parseInt(m[2], 10);
      const yr = parseInt(m[3], 10);
      if (p1 > 12) {
        return new Date(yr, p2 - 1, p1, 0, 0, 0, 0);
      } else if (p2 > 12) {
        return new Date(yr, p1 - 1, p2, 0, 0, 0, 0);
      } else {
        return new Date(yr, p2 - 1, p1, 0, 0, 0, 0);
      }
    }
    const d = new Date(s);
    if (!isNaN(d)) {
      return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
    }
  }
  return null;
}

export function normalizeRows(rows) {
  const headers = rows[0].map(cleanText);
  const dateCol = findColumn(headers, ['period', 'date', 'transaction date', 'time']);
  const categoryCol = findColumn(headers, ['category', 'category name']);
  const subcategoryCol = findColumn(headers, ['subcategory', 'sub category', 'sub-category']);
  const typeCol = findColumn(headers, ['income/expense', 'type', 'transaction type', 'income / expense']);
  const amountCol = findColumn(headers, ['amount', 'inr', 'value', 'money', 'expense/income']);
  const accountCol = findColumn(headers, ['accounts', 'account', 'wallet', 'bank']);
  const noteCol = findColumn(headers, ['note', 'notes', 'memo']);
  const descriptionCol = headers.find((h) => {
    const text = String(h).trim().toLowerCase();
    return (text.includes('description') || text.includes('payee') || text.includes('narrative') ||
            text.includes('particulars') || text.includes('desc') || text.includes('remark') ||
            text.includes('details')) && h !== noteCol;
  });

  if (!dateCol || !categoryCol || !amountCol) {
    throw new Error('Expected Period/Date, Category, and Amount or INR columns.');
  }

  const col = (name) => name ? headers.indexOf(name) : -1;

  return rows.slice(1).map((row, i) => {
    const date = parseDate(row[col(dateCol)]);
    const amount = parseAmount(row[col(amountCol)]);
    const cat = cleanText(row[col(categoryCol)]);
    const sub = subcategoryCol ? cleanText(row[col(subcategoryCol)]) : '';
    const category = cat || sub || 'Uncategorized';
    const noteRaw = cleanText(row[col(noteCol)]);
    const descRaw = descriptionCol ? cleanText(row[col(descriptionCol)]) : '';
    const note = noteRaw || (sub && cat !== sub ? sub : '');
    const description = descRaw;
    const finalNote = note || (description ? description : '—');
    const finalDesc = description && description !== finalNote ? description : '';

    return {
      id: i,
      date,
      category,
      type: normalizeType(typeCol ? row[col(typeCol)] : 'Expense'),
      amount,
      account: accountCol ? cleanText(row[col(accountCol)]) : '—',
      note: finalNote,
      description: finalDesc
    };
  }).filter(r => r.date && r.amount > 0);
}
