/**
 * Transactions Table & Mobile Card View Rendering
 */

import { $, money, escapeHtml } from './utils.js';
import { state } from './state.js';
import { categoryPill, categoryColor, getNotionIcon, formatCategory } from './categories.js';

export function renderTable(rows) {
  const isNotion = typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'notion';

  const sorted = [...rows].sort((a, b) => {
    if (state.sort === 'date-asc') return a.date - b.date;
    if (state.sort === 'amount-desc') return b.amount - a.amount;
    if (state.sort === 'amount-asc') return a.amount - b.amount;
    return b.date - a.date;
  });

  const sliced = sorted;
  if ($('transaction-count')) $('transaction-count').textContent = rows.length;
  if ($('c-tab-tx-count')) $('c-tab-tx-count').textContent = rows.length;

  const head = $('transaction-head');
  if (head) {
    if (isNotion) {
      head.innerHTML = `<tr>
        <th class="col-title" style="min-width:180px"><span class="notion-th-icon">Aa</span> Expense</th>
        <th class="col-amount align-right" style="min-width:110px"><span class="notion-th-icon">#</span> Amount</th>
        <th class="col-category" style="min-width:110px"><span class="notion-th-icon">▾</span> Category</th>
        <th class="col-date" style="min-width:110px"><span class="notion-th-icon">📅</span> Date</th>
        <th class="col-account" style="min-width:90px"><span class="notion-th-icon">🏛</span> Account</th>
      </tr>`;
    } else {
      head.innerHTML = `<tr>
        <th>Date</th>
        <th>Category</th>
        <th>Expense / Note</th>
        <th>Account</th>
        <th class="align-right">Amount</th>
      </tr>`;
    }
  }

  const txBody = $('transaction-body');
  if (txBody) {
    txBody.innerHTML = sliced.length ? (sliced.map(r => {
      const noteText = r.note && r.note !== '—' ? r.note : r.category;
      const hasDesc = Boolean(r.description && r.description !== r.note && r.description !== '—');
      const fullTooltip = hasDesc ? `${noteText} — ${r.description}` : noteText;
      const descBadge = hasDesc ? `<span class="tx-desc-badge" tabindex="0" role="button" aria-label="Description: ${escapeHtml(r.description)}" title="${escapeHtml(r.description)}"><svg class="tx-desc-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg><span class="tx-desc-tooltip">${escapeHtml(r.description)}</span></span>` : '';
      const noteDisplay = isNotion
        ? `<span class="notion-item-title"><span class="notion-item-icon">${getNotionIcon(noteText, r.category)}</span> <span class="notion-item-text">${escapeHtml(noteText)}</span>${descBadge}</span>`
        : `<span class="note-with-desc"><span class="note-text">${escapeHtml(r.note)}</span>${descBadge}</span>`;
      const dateFormatted = isNotion
        ? r.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : r.date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      const amountClass = `amount amount-${r.type}`;
      const amountPrefix = r.type === 'expense' ? '−' : (r.type === 'income' ? '+' : '');

      if (isNotion) {
        return `<tr>
          <td class="notion-title-cell" title="${escapeHtml(fullTooltip)}">${noteDisplay}</td>
          <td class="align-right ${amountClass}">${amountPrefix}${money(r.amount)}</td>
          <td class="category-cell">${categoryPill(r.category)}</td>
          <td class="date-cell">${dateFormatted}</td>
          <td class="account-cell">${escapeHtml(r.account)}</td>
        </tr>`;
      }
      return `<tr>
        <td>${dateFormatted}</td>
        <td>${categoryPill(r.category)}</td>
        <td title="${escapeHtml(fullTooltip)}">${noteDisplay}</td>
        <td>${escapeHtml(r.account)}</td>
        <td class="align-right ${amountClass}">${amountPrefix}${money(r.amount)}</td>
      </tr>`;
    }).join('')) : `<tr><td colspan="5" class="empty-table">No transactions found for this period.</td></tr>`;

    if (isNotion && sliced.length) {
      const newRow = document.createElement('tr');
      newRow.className = 'notion-new-row';
      newRow.innerHTML = `<td colspan="5" class="notion-new-cell"><span class="notion-plus-icon">+</span> <span class="notion-new-text">New transaction (Import file)</span></td>`;
      newRow.onclick = () => $('file-input')?.click();
      txBody.appendChild(newRow);
    }
  }

  // Footer Calculation Row
  const foot = $('transaction-foot');
  if (foot) {
    if (isNotion) {
      const expenses = rows.filter(r => r.type === 'expense').reduce((s, r) => s + r.amount, 0);
      foot.innerHTML = `<tr class="notion-calc-row">
        <td class="notion-calc-cell"><span class="notion-calc-label">Count</span> <span class="notion-calc-val">${rows.length}</span></td>
        <td class="notion-calc-cell align-right"><span class="notion-calc-label">Total Out</span> <span class="notion-calc-val">${money(expenses)}</span></td>
        <td class="notion-calc-cell"></td>
        <td class="notion-calc-cell"></td>
        <td class="notion-calc-cell"></td>
      </tr>`;
    } else if (rows.length) {
      const sum = rows.reduce((s, r) => s + (r.type === 'expense' ? r.amount : -r.amount), 0);
      foot.innerHTML = `<tr>
        <td colspan="4" class="align-right" style="font-weight:500;font-size:11px;color:var(--muted)">SUM</td>
        <td class="align-right" style="font-weight:500;font-size:12px">${money(Math.abs(sum))}</td>
      </tr>`;
    } else {
      foot.innerHTML = '';
    }
  }

  // Mobile List View rendering
  const mobileList = $('mobile-tx-list');
  if (mobileList) {
    mobileList.innerHTML = sliced.length ? (sliced.map(r => {
      const noteText = r.note && r.note !== '—' ? r.note : r.category;
      const hasDesc = Boolean(r.description && r.description !== r.note && r.description !== '—');
      const fullTooltip = hasDesc ? `${noteText} — ${r.description}` : noteText;
      const descBadge = hasDesc ? `<span class="tx-desc-badge" tabindex="0" role="button" aria-label="Description: ${escapeHtml(r.description)}" title="${escapeHtml(r.description)}"><svg class="tx-desc-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg><span class="tx-desc-tooltip">${escapeHtml(r.description)}</span></span>` : '';
      const icon = getNotionIcon(noteText, r.category);
      const c = categoryColor(r.category);
      const dateFormatted = isNotion
        ? r.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : r.date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      const amountClass = `amount amount-${r.type}`;
      const amountPrefix = r.type === 'expense' ? '−' : (r.type === 'income' ? '+' : '');
      return `
        <div class="tx-item">
          <div class="tx-icon-badge" style="background:${c.bg};color:${c.fg}">${icon}</div>
          <div class="tx-details">
            <div class="tx-title" title="${escapeHtml(fullTooltip)}"><span class="tx-title-text">${escapeHtml(noteText)}</span>${descBadge}</div>
            <div class="tx-meta">
              <span class="cat-pill" style="background:${c.bg};color:${c.fg}">${escapeHtml(formatCategory(r.category))}</span>
              <span class="tx-dot">·</span>
              <span class="tx-date">${dateFormatted}</span>
              ${r.account && r.account !== '—' ? `<span class="tx-dot">·</span><span class="tx-account">${escapeHtml(r.account)}</span>` : ''}
            </div>
          </div>
          <div class="tx-right">
            <div class="tx-amount ${amountClass}">${amountPrefix}${money(r.amount)}</div>
          </div>
        </div>`;
    }).join('')) : `<div class="empty-table" style="padding:28px 16px">No transactions found for this period.</div>`;

    if (isNotion && sliced.length) {
      const mobileNew = document.createElement('div');
      mobileNew.className = 'notion-mobile-new-btn';
      mobileNew.innerHTML = `<span class="notion-plus-icon">+</span> Import more transactions`;
      mobileNew.onclick = () => $('file-input')?.click();
      mobileList.appendChild(mobileNew);
    }
  }
}
