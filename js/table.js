/**
 * Transactions Table & Mobile Card View Rendering
 */

import { $, money, escapeHtml, toast, setStorage, showLoading, hideLoading } from './utils.js';
import { state, DEFAULT_COLUMN_ORDER, COLUMN_DEFINITIONS } from './state.js';
import { categoryPill, categoryColor, getNotionIcon, formatCategory } from './categories.js';

let tableRerenderCallback = () => {};
export function registerTableRenderCallback(fn) {
  tableRerenderCallback = fn;
}

let tableDisplayLimit = 100;
export function resetTableDisplayLimit() {
  tableDisplayLimit = 100;
}
export function getTableDisplayLimit() {
  return tableDisplayLimit;
}
export function setTableDisplayLimit(limit) {
  tableDisplayLimit = limit;
}

let activeDragCol = null;
let activeColMenuId = null;

export function getVisibleColumns() {
  const visible = state.columnOrder.filter(c => !state.hiddenColumns.has(c));
  return visible.length ? visible : [...DEFAULT_COLUMN_ORDER];
}

export function hasCustomColumns() {
  if (state.hiddenColumns && state.hiddenColumns.size > 0) return true;
  if (!state.columnOrder || state.columnOrder.length !== DEFAULT_COLUMN_ORDER.length) return true;
  for (let i = 0; i < DEFAULT_COLUMN_ORDER.length; i++) {
    if (state.columnOrder[i] !== DEFAULT_COLUMN_ORDER[i]) return true;
  }
  return false;
}

export function saveColumns() {
  setStorage('ledgerly_column_order', JSON.stringify(state.columnOrder));
  setStorage('ledgerly_hidden_columns', JSON.stringify([...state.hiddenColumns]));
}

export function reorderColumnTo(sourceCol, targetCol, position = 'before') {
  if (sourceCol === targetCol) return false;
  const newOrder = [...state.columnOrder];
  const fromIdx = newOrder.indexOf(sourceCol);
  if (fromIdx === -1) return false;
  newOrder.splice(fromIdx, 1);
  const toIdx = newOrder.indexOf(targetCol);
  if (toIdx === -1) return false;
  if (position === 'before') {
    newOrder.splice(toIdx, 0, sourceCol);
  } else {
    newOrder.splice(toIdx + 1, 0, sourceCol);
  }
  state.columnOrder = newOrder;
  saveColumns();
  return true;
}

export function moveColumn(colId, direction) {
  const visible = getVisibleColumns();
  const idx = visible.indexOf(colId);
  if (idx === -1) return false;
  const targetIdx = direction === 'left' ? idx - 1 : idx + 1;
  if (targetIdx < 0 || targetIdx >= visible.length) return false;
  const targetCol = visible[targetIdx];
  return reorderColumnTo(colId, targetCol, direction === 'left' ? 'before' : 'after');
}

export function hideColumn(colId) {
  const visible = getVisibleColumns();
  if (visible.length <= 1) {
    toast('At least one column must remain visible');
    return false;
  }
  state.hiddenColumns.add(colId);
  saveColumns();
  return true;
}

export function unhideColumn(colId) {
  if (state.hiddenColumns.has(colId)) {
    state.hiddenColumns.delete(colId);
    saveColumns();
    return true;
  }
  return false;
}

export function toggleColumn(colId) {
  if (state.hiddenColumns.has(colId)) {
    return unhideColumn(colId);
  }
  return hideColumn(colId);
}

export function resetColumns() {
  state.columnOrder = [...DEFAULT_COLUMN_ORDER];
  state.hiddenColumns = new Set();
  saveColumns();
}

export function closeColumnMenu() {
  const menu = $('notion-col-menu');
  if (menu) {
    menu.classList.add('hidden');
  }
  activeColMenuId = null;
}

export function openColumnMenu(colId, anchorEl) {
  const menu = $('notion-col-menu');
  if (!menu || !anchorEl) return;

  activeColMenuId = colId;
  const def = COLUMN_DEFINITIONS[colId];
  if (!def) return;

  const iconEl = $('col-menu-icon');
  const titleEl = $('col-menu-title');
  if (iconEl) {
    iconEl.textContent = def.icon;
    iconEl.style.display = def.icon ? 'inline-block' : 'none';
  }
  if (titleEl) titleEl.textContent = def.label;

  const visible = getVisibleColumns();
  const hideBtn = $('col-menu-hide');
  if (hideBtn) {
    const disabled = visible.length <= 1;
    hideBtn.disabled = disabled;
    hideBtn.classList.toggle('disabled', disabled);
  }

  // Position popover
  const rect = anchorEl.getBoundingClientRect();
  const scrollTop = (typeof window !== 'undefined' ? (window.scrollY || document.documentElement.scrollTop) : 0) || 0;
  const scrollLeft = (typeof window !== 'undefined' ? (window.scrollX || document.documentElement.scrollLeft) : 0) || 0;

  menu.style.top = `${rect.bottom + scrollTop + 4}px`;
  const menuWidth = 190;
  const winWidth = typeof window !== 'undefined' ? window.innerWidth : 1024;
  const leftPos = Math.max(10, Math.min(winWidth - menuWidth - 10, rect.left + scrollLeft));
  menu.style.left = `${leftPos}px`;

  menu.classList.remove('hidden');
}

export function initColumnMenu() {
  const hideBtn = $('col-menu-hide');
  if (hideBtn) {
    hideBtn.onclick = (e) => {
      e.stopPropagation();
      if (!activeColMenuId) return;
      const def = COLUMN_DEFINITIONS[activeColMenuId];
      if (hideColumn(activeColMenuId)) {
        closeColumnMenu();
        tableRerenderCallback();
        toast(`"${def ? def.label : activeColMenuId}" hidden from view`);
      }
    };
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#notion-col-menu') && !e.target.closest('.th-dots-btn') && !e.target.closest('th.notion-th-draggable')) {
        closeColumnMenu();
      }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeColumnMenu();
    });
  }
}

export function renderTable(rows) {
  const isNotion = typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'notion';
  const visibleCols = getVisibleColumns();

  const sorted = [...rows].sort((a, b) => {
    if (state.sort === 'date-asc') return a.date - b.date;
    if (state.sort === 'amount-desc') return b.amount - a.amount;
    if (state.sort === 'amount-asc') return a.amount - b.amount;
    return b.date - a.date;
  });

  const totalCount = sorted.length;
  const sliced = sorted.slice(0, tableDisplayLimit);
  const hasMore = totalCount > tableDisplayLimit;

  if ($('transaction-count')) $('transaction-count').textContent = rows.length;
  if ($('c-tab-tx-count')) $('c-tab-tx-count').textContent = rows.length;

  const head = $('transaction-head');
  if (head) {
    const ths = visibleCols.map(colId => {
      const def = COLUMN_DEFINITIONS[colId] || { id: colId, label: colId, icon: '', nonNotionLabel: colId, minWidth: '100px', align: 'left' };
      const isRight = def.align === 'right';
      const iconHtml = def.icon ? `<span class="notion-th-icon">${def.icon}</span>` : '';
      if (isNotion) {
        return `<th class="col-${colId} ${isRight ? 'align-right' : ''} notion-th-draggable" data-col="${colId}" style="min-width:${def.minWidth}" draggable="true">
          <div class="th-content-wrap">
            <div class="th-title-area">
              ${iconHtml}
              <span class="th-name">${def.label}</span>
            </div>
            <button type="button" class="th-dots-btn" aria-label="Options for ${def.label} column" title="Options">•••</button>
          </div>
        </th>`;
      }
      return `<th class="col-${colId} ${isRight ? 'align-right' : ''} notion-th-draggable" data-col="${colId}" style="min-width:${def.minWidth}" draggable="true">
        <div class="th-content-wrap">
          <span class="th-name">${def.nonNotionLabel}</span>
          <button type="button" class="th-dots-btn" aria-label="Options for ${def.nonNotionLabel} column" title="Options">•••</button>
        </div>
      </th>`;
    }).join('');

    head.innerHTML = `<tr>${ths}</tr>`;

    // Attach listeners to th elements
    head.querySelectorAll('th.notion-th-draggable').forEach(th => {
      const colId = th.dataset.col;

      th.onclick = (e) => {
        e.stopPropagation();
        openColumnMenu(colId, th);
      };

      th.ondragstart = (e) => {
        activeDragCol = colId;
        th.classList.add('th-dragging');
        if (e.dataTransfer) {
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', colId);
        }
      };

      th.ondragover = (e) => {
        e.preventDefault();
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
        const rect = th.getBoundingClientRect();
        const isLeft = e.clientX < rect.left + rect.width / 2;
        if (isLeft) {
          th.classList.add('th-drag-over-left');
          th.classList.remove('th-drag-over-right');
        } else {
          th.classList.add('th-drag-over-right');
          th.classList.remove('th-drag-over-left');
        }
      };

      th.ondragleave = () => {
        th.classList.remove('th-drag-over-left', 'th-drag-over-right');
      };

      th.ondragend = () => {
        if (typeof document !== 'undefined') {
          document.querySelectorAll('th.notion-th-draggable').forEach(el => {
            el.classList.remove('th-dragging', 'th-drag-over-left', 'th-drag-over-right');
          });
        }
        activeDragCol = null;
      };

      th.ondrop = (e) => {
        e.preventDefault();
        th.classList.remove('th-drag-over-left', 'th-drag-over-right');
        const sourceCol = activeDragCol || (e.dataTransfer && e.dataTransfer.getData('text/plain'));
        const targetCol = colId;
        if (sourceCol && targetCol && sourceCol !== targetCol) {
          const rect = th.getBoundingClientRect();
          const isLeft = e.clientX < rect.left + rect.width / 2;
          if (reorderColumnTo(sourceCol, targetCol, isLeft ? 'before' : 'after')) {
            tableRerenderCallback();
            toast('Column reordered');
          }
        }
      };
    });
  }

  const txBody = $('transaction-body');
  if (txBody) {
    let rowsHtml = sliced.map(r => {
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

      const tds = visibleCols.map(colId => {
        if (colId === 'date') {
          return isNotion
            ? `<td class="date-cell">${dateFormatted}</td>`
            : `<td>${dateFormatted}</td>`;
        }
        if (colId === 'category') {
          return isNotion
            ? `<td class="category-cell">${categoryPill(r.category)}</td>`
            : `<td>${categoryPill(r.category)}</td>`;
        }
        if (colId === 'note') {
          return isNotion
            ? `<td class="notion-title-cell" title="${escapeHtml(fullTooltip)}">${noteDisplay}</td>`
            : `<td title="${escapeHtml(fullTooltip)}">${noteDisplay}</td>`;
        }
        if (colId === 'account') {
          return isNotion
            ? `<td class="account-cell">${escapeHtml(r.account)}</td>`
            : `<td>${escapeHtml(r.account)}</td>`;
        }
        if (colId === 'amount') {
          return `<td class="align-right ${amountClass}">${amountPrefix}${money(r.amount)}</td>`;
        }
        return `<td></td>`;
      }).join('');

      return `<tr>${tds}</tr>`;
    }).join('');

    if (hasMore) {
      rowsHtml += `<tr class="tx-load-more-row">
        <td colspan="${visibleCols.length}" class="tx-load-more-cell">
          <div class="tx-load-more-wrap">
            <span class="tx-load-more-info">Showing ${sliced.length} of ${totalCount.toLocaleString('en-IN')} transactions</span>
            <button type="button" class="tx-load-more-btn" id="tx-load-more-btn">Load more (+100)</button>
            <button type="button" class="tx-load-all-btn" id="tx-load-all-btn">Show all (${totalCount.toLocaleString('en-IN')})</button>
          </div>
        </td>
      </tr>`;
    }

    txBody.innerHTML = sliced.length ? rowsHtml : `<tr><td colspan="${visibleCols.length}" class="empty-table">No transactions found for this period.</td></tr>`;

    if (hasMore) {
      const moreBtn = $('tx-load-more-btn');
      if (moreBtn) {
        moreBtn.onclick = () => {
          tableDisplayLimit = Math.min(totalCount, tableDisplayLimit + 100);
          renderTable(rows);
        };
      }
      const allBtn = $('tx-load-all-btn');
      if (allBtn) {
        allBtn.onclick = () => {
          showLoading('Rendering all transactions...');
          requestAnimationFrame(() => {
            setTimeout(() => {
              tableDisplayLimit = totalCount;
              renderTable(rows);
              hideLoading();
            }, 16);
          });
        };
      }
    }
  }

  // Footer Calculation Row
  const foot = $('transaction-foot');
  if (foot) {
    if (isNotion) {
      const expenses = rows.filter(r => r.type === 'expense').reduce((s, r) => s + r.amount, 0);
      const cells = visibleCols.map((colId, index) => {
        if (index === 0) {
          return `<td class="notion-calc-cell"><span class="notion-calc-label">Count</span> <span class="notion-calc-val">${rows.length}</span></td>`;
        }
        if (colId === 'amount') {
          return `<td class="notion-calc-cell align-right"><span class="notion-calc-label">Total Out</span> <span class="notion-calc-val">${money(expenses)}</span></td>`;
        }
        return `<td class="notion-calc-cell"></td>`;
      }).join('');
      foot.innerHTML = `<tr class="notion-calc-row">${cells}</tr>`;
    } else if (rows.length) {
      const sum = rows.reduce((s, r) => s + (r.type === 'expense' ? r.amount : -r.amount), 0);
      const hasAmount = visibleCols.includes('amount');
      if (hasAmount) {
        const colSpan = Math.max(1, visibleCols.length - 1);
        foot.innerHTML = `<tr>
          <td colspan="${colSpan}" class="align-right" style="font-weight:500;font-size:11px;color:var(--muted)">SUM</td>
          <td class="align-right" style="font-weight:500;font-size:12px">${money(Math.abs(sum))}</td>
        </tr>`;
      } else {
        foot.innerHTML = `<tr>
          <td colspan="${visibleCols.length}" class="align-right" style="font-weight:500;font-size:12px;color:var(--muted)">Count: ${rows.length}</td>
        </tr>`;
      }
    } else {
      foot.innerHTML = '';
    }
  }

  // Mobile List View rendering
  const mobileList = $('mobile-tx-list');
  if (mobileList) {
    let mobHtml = sliced.map(r => {
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
    }).join('');

    if (hasMore) {
      mobHtml += `<div class="tx-load-more-wrap mobile-load-more">
        <span class="tx-load-more-info">Showing ${sliced.length} of ${totalCount.toLocaleString('en-IN')}</span>
        <button type="button" class="tx-load-more-btn" id="mobile-load-more-btn">Load more (+100)</button>
      </div>`;
    }

    mobileList.innerHTML = sliced.length ? mobHtml : `<div class="empty-table" style="padding:28px 16px">No transactions found for this period.</div>`;

    if (hasMore) {
      const mobBtn = $('mobile-load-more-btn');
      if (mobBtn) {
        mobBtn.onclick = () => {
          tableDisplayLimit = Math.min(totalCount, tableDisplayLimit + 100);
          renderTable(rows);
        };
      }
    }
  }

  // Automatic load on scroll
  if (typeof document !== 'undefined' && typeof document.querySelector === 'function') {
    const tableWrap = document.querySelector('.table-wrap');
    if (tableWrap && !tableWrap._hasScrollListener) {
      tableWrap._hasScrollListener = true;
      tableWrap.addEventListener('scroll', () => {
        if (tableDisplayLimit < rows.length && (tableWrap.scrollTop + tableWrap.clientHeight >= tableWrap.scrollHeight - 250)) {
          tableDisplayLimit = Math.min(rows.length, tableDisplayLimit + 100);
          renderTable(rows);
        }
      }, { passive: true });
    }
  }
}
