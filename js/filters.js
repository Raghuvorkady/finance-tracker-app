/**
 * Filter & Sort Controls, Multi-Select Popovers & State Synchronization
 */

import { $, escapeHtml, toast, showLoading, hideLoading } from './utils.js';
import { state, COLUMN_DEFINITIONS } from './state.js';
import { bounds } from './dates.js';
import { categoryColor, formatCategory } from './categories.js';
import { hasCustomColumns, resetColumns, moveColumn, toggleColumn, getVisibleColumns, reorderColumnTo, saveColumns, resetTableDisplayLimit } from './table.js';

let onRender = () => {};
export function registerRenderCallback(fn) {
  onRender = fn;
}

export function baseFiltered() {
  const isAll = state.period === 'all';
  const { start, end } = bounds();
  const lower = state.search ? state.search.toLowerCase() : '';
  const isAcctExclude = state.accountFilterMode === 'exclude' || state.accountOperator === 'is-not';
  const acctList = isAcctExclude
    ? ((state.excludedAccounts && state.excludedAccounts.size > 0) ? state.excludedAccounts : state.selectedAccounts)
    : state.selectedAccounts;

  return state.data.filter(r => {
    if (!isAll && (r.date < start || r.date > end)) return false;
    if (state.type !== 'all' && r.type !== state.type) return false;

    if (isAcctExclude) {
      if (acctList && acctList.size > 0 && acctList.has(r.account)) return false;
    } else {
      if (acctList && acctList.size > 0 && !acctList.has(r.account)) return false;
    }

    if (lower && ![r.category, r.note, r.description, r.account].join(' ').toLowerCase().includes(lower)) return false;
    return true;
  });
}

export function filtered() {
  const base = baseFiltered();
  const isExcludeMode = state.categoryFilterMode === 'exclude' || state.categoryOperator === 'is-not';
  if (isExcludeMode) {
    const list = (state.excludedCategories && state.excludedCategories.size > 0)
      ? state.excludedCategories
      : state.selectedCategories;
    if (!list || list.size === 0) {
      return base;
    }
    return base.filter(r => !list.has(r.category));
  } else {
    // include mode (is)
    if (!state.selectedCategories || state.selectedCategories.size === 0) {
      return base;
    }
    return base.filter(r => state.selectedCategories.has(r.category));
  }
}

export function categoryTotals(rows, type = 'expense') {
  return Object.entries(
    rows.filter(r => r.type === type).reduce((out, r) => {
      out[r.category] = (out[r.category] || 0) + r.amount;
      return out;
    }, {})
  ).sort((a, b) => b[1] - a[1]);
}

export function closeAllPopovers() {
  document.querySelectorAll('.notion-popover, .export-menu, .display-menu, .notion-operator-menu').forEach(p => {
    p.classList.add('hidden');
    p.classList.remove('open');
  });
  document.querySelectorAll('[aria-expanded]').forEach(btn => btn.setAttribute('aria-expanded', 'false'));
  const backdrop = $('mobile-popover-backdrop');
  if (backdrop) backdrop.classList.add('hidden');
}

export function syncSortPill() {
  const iconEl = $('pill-sort-icon');
  const labelEl = $('pill-sort-label');
  const pillEl = $('sort-pill');
  if (!iconEl || !labelEl || !pillEl) return;

  if (state.sort === 'date-asc') {
    iconEl.textContent = '↓';
    labelEl.textContent = 'Date';
  } else if (state.sort === 'amount-desc') {
    iconEl.textContent = '↓';
    labelEl.textContent = 'Amount';
  } else if (state.sort === 'amount-asc') {
    iconEl.textContent = '↑';
    labelEl.textContent = 'Amount';
  } else {
    iconEl.textContent = '↑';
    labelEl.textContent = 'Date';
  }
  pillEl.classList.add('active-sort');

  document.querySelectorAll('#sort-popover [data-sort]').forEach(btn => {
    btn.classList.toggle('selected', btn.dataset.sort === state.sort);
  });
}

export function renderCategoryChips() {
  const container = $('cat-chips');
  const clearAllBtn = $('cat-clear-all-btn');
  const searchInput = $('cat-search-input');
  if (!container) return;

  container.innerHTML = '';
  const isExcludeMode = state.categoryFilterMode === 'exclude' || state.categoryOperator === 'is-not';
  const activeList = isExcludeMode
    ? ((state.excludedCategories && state.excludedCategories.size > 0) ? [...state.excludedCategories] : [...state.selectedCategories])
    : [...state.selectedCategories];

  activeList.forEach(cat => {
    const col = categoryColor(cat);
    const chip = document.createElement('span');
    chip.className = `notion-chip ${isExcludeMode ? 'is-excluded-chip' : ''}`;
    if (!isExcludeMode) {
      chip.style.backgroundColor = col.bg;
      chip.style.color = col.fg;
    }

    const label = document.createElement('span');
    label.className = 'notion-chip-text';
    label.textContent = isExcludeMode ? `≠ ${formatCategory(cat)}` : formatCategory(cat);
    chip.appendChild(label);

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'notion-chip-remove';
    removeBtn.setAttribute('aria-label', `Remove ${formatCategory(cat)}`);
    removeBtn.textContent = '✕';
    removeBtn.onclick = (e) => {
      e.stopPropagation();
      if (isExcludeMode) {
        if (state.excludedCategories) state.excludedCategories.delete(cat);
        state.selectedCategories.delete(cat);
        if ((!state.excludedCategories || state.excludedCategories.size === 0) && state.selectedCategories.size === 0) {
          state.categoryFilterMode = 'include';
          state.categoryOperator = 'is';
        }
      } else {
        state.selectedCategories.delete(cat);
      }
      syncFilterPills();
      populateCategories();
      onRender();
      if (searchInput) searchInput.focus();
    };
    chip.appendChild(removeBtn);

    container.appendChild(chip);
  });

  if (clearAllBtn) {
    clearAllBtn.classList.toggle('hidden', activeList.length === 0);
  }
  if (searchInput) {
    searchInput.placeholder = activeList.length === 0 ? 'Type a category...' : '';
  }
}

export function renderAccountChips() {
  const container = $('acct-chips');
  const clearAllBtn = $('acct-clear-all-btn');
  const searchInput = $('acct-search-input');
  if (!container) return;

  container.innerHTML = '';
  const isExcludeMode = state.accountFilterMode === 'exclude' || state.accountOperator === 'is-not';
  const activeList = isExcludeMode
    ? ((state.excludedAccounts && state.excludedAccounts.size > 0) ? [...state.excludedAccounts] : [...state.selectedAccounts])
    : [...state.selectedAccounts];

  activeList.forEach(acct => {
    const chip = document.createElement('span');
    chip.className = `notion-chip ${isExcludeMode ? 'is-excluded-chip' : ''}`;
    if (!isExcludeMode) {
      chip.style.backgroundColor = '#edece9';
      chip.style.color = '#37352f';
    }

    const label = document.createElement('span');
    label.className = 'notion-chip-text';
    label.textContent = isExcludeMode ? `≠ ${acct}` : acct;
    chip.appendChild(label);

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'notion-chip-remove';
    removeBtn.setAttribute('aria-label', `Remove ${acct}`);
    removeBtn.textContent = '✕';
    removeBtn.onclick = (e) => {
      e.stopPropagation();
      if (isExcludeMode) {
        if (state.excludedAccounts) state.excludedAccounts.delete(acct);
        state.selectedAccounts.delete(acct);
        if ((!state.excludedAccounts || state.excludedAccounts.size === 0) && state.selectedAccounts.size === 0) {
          state.accountFilterMode = 'include';
          state.accountOperator = 'is';
        }
      } else {
        state.selectedAccounts.delete(acct);
      }
      syncFilterPills();
      populateAccounts();
      onRender();
      if (searchInput) searchInput.focus();
    };
    chip.appendChild(removeBtn);

    container.appendChild(chip);
  });

  if (clearAllBtn) {
    clearAllBtn.classList.toggle('hidden', activeList.length === 0);
  }
  if (searchInput) {
    searchInput.placeholder = activeList.length === 0 ? 'Type an account...' : '';
  }
}

export function syncFilterPills() {
  // Category Pill
  const catLabel = $('pill-cat-label');
  const catDot = $('cat-active-dot');
  const catPill = $('cat-pill');
  if (catLabel && catDot && catPill) {
    const isExcludeMode = state.categoryFilterMode === 'exclude' || state.categoryOperator === 'is-not';
    const selectedCats = [...state.selectedCategories];
    const excludedCats = state.excludedCategories ? [...state.excludedCategories] : [];
    const activeCats = isExcludeMode
      ? (excludedCats.length > 0 ? excludedCats : selectedCats)
      : selectedCats;

    if (isExcludeMode && activeCats.length > 0) {
      catDot.classList.remove('hidden');
      catPill.classList.add('has-filter');
      if (activeCats.length === 1) {
        catLabel.textContent = `Category is not ${formatCategory(activeCats[0])}`;
      } else if (activeCats.length === 2) {
        catLabel.textContent = `Category is not ${formatCategory(activeCats[0])}, ${formatCategory(activeCats[1])}`;
      } else {
        catLabel.textContent = `Category is not (${activeCats.length})`;
      }
      state.category = 'all';
    } else if (!isExcludeMode && activeCats.length > 0) {
      catDot.classList.remove('hidden');
      catPill.classList.add('has-filter');
      if (activeCats.length === 1) {
        catLabel.textContent = `Category: ${formatCategory(activeCats[0])}`;
        state.category = activeCats[0];
      } else if (activeCats.length === 2) {
        catLabel.textContent = `Category: ${activeCats.map(formatCategory).join(', ')}`;
        state.category = 'all';
      } else {
        catLabel.textContent = `Category: ${activeCats.slice(0, 2).map(formatCategory).join(', ')} +${activeCats.length - 2}`;
        state.category = 'all';
      }
    } else {
      catLabel.textContent = 'Category';
      catDot.classList.add('hidden');
      catPill.classList.remove('has-filter');
      state.category = 'all';
    }
  }

  // Account Pill
  const acctLabel = $('pill-acct-label');
  const acctDot = $('acct-active-dot');
  const acctPill = $('acct-pill');
  if (acctLabel && acctDot && acctPill) {
    const isAcctExclude = state.accountFilterMode === 'exclude' || state.accountOperator === 'is-not';
    const selectedAccts = [...state.selectedAccounts];
    const excludedAccts = state.excludedAccounts ? [...state.excludedAccounts] : [];
    const activeAccts = isAcctExclude
      ? (excludedAccts.length > 0 ? excludedAccts : selectedAccts)
      : selectedAccts;

    if (isAcctExclude && activeAccts.length > 0) {
      catDot.classList.remove('hidden');
      acctDot.classList.remove('hidden');
      acctPill.classList.add('has-filter');
      if (activeAccts.length === 1) {
        acctLabel.textContent = `Account is not ${activeAccts[0]}`;
      } else if (activeAccts.length === 2) {
        acctLabel.textContent = `Account is not ${activeAccts[0]}, ${activeAccts[1]}`;
      } else {
        acctLabel.textContent = `Account is not (${activeAccts.length})`;
      }
      state.account = 'all';
    } else if (!isAcctExclude && activeAccts.length > 0) {
      acctDot.classList.remove('hidden');
      acctPill.classList.add('has-filter');
      if (activeAccts.length === 1) {
        acctLabel.textContent = `Account: ${activeAccts[0]}`;
        state.account = activeAccts[0];
      } else if (activeAccts.length === 2) {
        acctLabel.textContent = `Account: ${activeAccts.join(', ')}`;
        state.account = 'all';
      } else {
        acctLabel.textContent = `Account: ${activeAccts.slice(0, 2).join(', ')} +${activeAccts.length - 2}`;
        state.account = 'all';
      }
    } else {
      acctLabel.textContent = 'Account';
      acctDot.classList.add('hidden');
      acctPill.classList.remove('has-filter');
      state.account = 'all';
    }
  }

  // Columns Pill
  const colsPill = $('cols-pill');
  const colsDot = $('cols-active-dot');
  const isCustomCols = hasCustomColumns();
  if (colsPill && colsDot) {
    colsDot.classList.toggle('hidden', !isCustomCols);
    colsPill.classList.toggle('has-filter', isCustomCols);
  }
  const colsResetBtn = $('cols-reset-btn');
  if (colsResetBtn) {
    colsResetBtn.classList.toggle('hidden', !isCustomCols);
  }

  renderCategoryChips();
  renderAccountChips();

  // Reset Button & Clear category drilldown button
  const hasFilter = state.selectedCategories.size > 0 ||
                    (state.excludedCategories && state.excludedCategories.size > 0) ||
                    state.selectedAccounts.size > 0 ||
                    (state.excludedAccounts && state.excludedAccounts.size > 0) ||
                    Boolean(state.search && state.search.trim()) ||
                    state.sort !== 'date-desc' ||
                    isCustomCols;

  const hasCategoryFilter = state.selectedCategories.size > 0 || (state.excludedCategories && state.excludedCategories.size > 0);
  if ($('clear-category')) $('clear-category').classList.toggle('hidden', !hasCategoryFilter);

  // Sync hidden legacy selects if present
  if ($('category-filter')) $('category-filter').value = state.category;
  if ($('account-filter')) $('account-filter').value = state.account;
}

// SVG icons for the property visibility panel
const SVG_EYE_OPEN = `<svg width="15" height="15" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" fill="currentColor"/></svg>`;
const SVG_EYE_SLASH = `<svg width="15" height="15" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46A11.804 11.804 0 001 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z" fill="currentColor"/></svg>`;
const DRAG_HANDLE = `<span class="cols-drag-handle" aria-hidden="true">⠿</span>`;

function makeColItemHtml(colId, isHidden, searchQ) {
  const def = COLUMN_DEFINITIONS[colId] || { id: colId, label: colId, icon: '' };
  if (searchQ && !def.label.toLowerCase().includes(searchQ)) return '';
  const iconHtml = def.icon ? `<span class="notion-col-item-icon">${def.icon}</span>` : `<span class="notion-col-item-icon cols-icon-text">Aa</span>`;
  const eyeHtml = isHidden ? SVG_EYE_SLASH : SVG_EYE_OPEN;
  return `<div class="notion-col-item" data-col="${colId}" draggable="true">
    ${DRAG_HANDLE}
    <div class="notion-col-item-left">
      ${iconHtml}
      <span class="notion-col-item-name">${def.label}</span>
    </div>
    <button type="button" class="cols-eye-btn btn-col-toggle ${isHidden ? 'hidden-col' : 'visible-col'}" data-col="${colId}" title="${isHidden ? 'Show in view' : 'Hide in view'}" aria-label="${isHidden ? 'Show' : 'Hide'} ${def.label}">
      ${eyeHtml}
    </button>
  </div>`;
}

function bindColsListDragReorder(listEl, isHiddenList) {
  let dragSrc = null;
  listEl.querySelectorAll('.notion-col-item[draggable]').forEach(item => {
    item.ondragstart = (e) => {
      dragSrc = item.dataset.col;
      item.classList.add('cols-item-dragging');
      e.dataTransfer.effectAllowed = 'move';
    };
    item.ondragend = () => {
      item.classList.remove('cols-item-dragging');
      listEl.querySelectorAll('.cols-drag-over').forEach(el => el.classList.remove('cols-drag-over'));
    };
    item.ondragover = (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      listEl.querySelectorAll('.cols-drag-over').forEach(el => el.classList.remove('cols-drag-over'));
      item.classList.add('cols-drag-over');
    };
    item.ondragleave = () => item.classList.remove('cols-drag-over');
    item.ondrop = (e) => {
      e.preventDefault();
      item.classList.remove('cols-drag-over');
      const targetCol = item.dataset.col;
      if (dragSrc && dragSrc !== targetCol) {
        if (reorderColumnTo(dragSrc, targetCol, 'before')) {
          populateColsList();
          syncFilterPills();
          onRender();
        }
      }
    };
  });
}

export function populateColsList() {
  const visibleListEl = $('cols-visible-list');
  const hiddenListEl = $('cols-hidden-list');
  const shownSection = $('cols-shown-section');
  const hiddenSection = $('cols-hidden-section');

  // Fallback for legacy #cols-list if new elements not present
  const legacyListEl = $('cols-list');

  if (!visibleListEl && !legacyListEl) return;

  const searchQ = ($('cols-search-input') || {}).value ? $('cols-search-input').value.toLowerCase().trim() : '';

  const visibleCols = getVisibleColumns();
  const hiddenCols = state.columnOrder.filter(c => state.hiddenColumns.has(c));

  if (visibleListEl && hiddenListEl) {
    // Sync reset button visibility
    const resetBtn = $('cols-reset-btn');
    if (resetBtn) {
      resetBtn.classList.toggle('hidden', !hasCustomColumns());
    }

    // New Notion-style two-section panel
    const shownHtml = visibleCols.map(colId => makeColItemHtml(colId, false, searchQ)).join('');
    const hiddenHtml = hiddenCols.map(colId => makeColItemHtml(colId, true, searchQ)).join('');

    visibleListEl.innerHTML = shownHtml || '<span class="cols-empty-msg">No visible properties</span>';
    hiddenListEl.innerHTML = hiddenHtml || '';

    if (shownSection) shownSection.style.display = '';
    if (hiddenSection) hiddenSection.style.display = hiddenCols.length === 0 && !searchQ ? 'none' : '';

    // Bind eye toggles
    [visibleListEl, hiddenListEl].forEach(listEl => {
      listEl.querySelectorAll('.btn-col-toggle').forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          const col = btn.dataset.col;
          const def = COLUMN_DEFINITIONS[col];
          const wasHidden = state.hiddenColumns.has(col);
          if (toggleColumn(col)) {
            populateColsList();
            syncFilterPills();
            onRender();
            toast(wasHidden ? `"${def ? def.label : col}" visible` : `"${def ? def.label : col}" hidden`);
          }
        };
      });
    });

    // Bind drag-reorder only on visible list
    bindColsListDragReorder(visibleListEl, false);
  } else if (legacyListEl) {
    // Legacy fallback rendering
    const itemsHtml = state.columnOrder.map((colId) => {
      const def = COLUMN_DEFINITIONS[colId] || { id: colId, label: colId, icon: '' };
      const isHidden = state.hiddenColumns.has(colId);
      return makeColItemHtml(colId, isHidden, searchQ);
    }).join('');
    legacyListEl.innerHTML = itemsHtml;
    legacyListEl.querySelectorAll('.btn-col-toggle').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const col = btn.dataset.col;
        const def = COLUMN_DEFINITIONS[col];
        const wasHidden = state.hiddenColumns.has(col);
        if (toggleColumn(col)) { populateColsList(); syncFilterPills(); onRender(); }
      };
    });
  }
}

export function populateCategories() {
  const isAll = state.period === 'all';
  const { start, end } = bounds();
  const periodRows = isAll ? state.data : state.data.filter(r => r.date >= start && r.date <= end);
  let rows = periodRows;
  if (state.type !== 'all') {
    rows = periodRows.filter(r => r.type === state.type);
  }
  const cats = [...new Set(rows.map(r => r.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

  for (const c of state.selectedCategories) {
    if (!cats.includes(c)) state.selectedCategories.delete(c);
  }
  if (state.excludedCategories) {
    for (const c of state.excludedCategories) {
      if (!cats.includes(c)) state.excludedCategories.delete(c);
    }
  }

  // Synchronize operator trigger button text & menu options
  const isExcludeMode = state.categoryFilterMode === 'exclude' || state.categoryOperator === 'is-not';
  const opText = $('cat-operator-text');
  if (opText) {
    opText.textContent = isExcludeMode ? 'is not' : 'is';
  }
  const chartOpText = $('chart-operator-text');
  if (chartOpText) {
    chartOpText.textContent = isExcludeMode ? 'is not' : 'is';
  }

  const isBtn = $('cat-op-is');
  const isNotBtn = $('cat-op-is-not');
  if (isBtn && isNotBtn) {
    isBtn.classList.toggle('selected', !isExcludeMode);
    isBtn.classList.toggle('active', !isExcludeMode);
    isBtn.setAttribute('aria-selected', !isExcludeMode ? 'true' : 'false');
    isNotBtn.classList.toggle('selected', isExcludeMode);
    isNotBtn.classList.toggle('active', isExcludeMode);
    isNotBtn.setAttribute('aria-selected', isExcludeMode ? 'true' : 'false');
  }

  const chartIsBtn = $('chart-op-is');
  const chartIsNotBtn = $('chart-op-is-not');
  if (chartIsBtn && chartIsNotBtn) {
    chartIsBtn.classList.toggle('selected', !isExcludeMode);
    chartIsBtn.classList.toggle('active', !isExcludeMode);
    chartIsBtn.setAttribute('aria-selected', !isExcludeMode ? 'true' : 'false');
    chartIsNotBtn.classList.toggle('selected', isExcludeMode);
    chartIsNotBtn.classList.toggle('active', isExcludeMode);
    chartIsNotBtn.setAttribute('aria-selected', isExcludeMode ? 'true' : 'false');
  }

  const listEl = $('cat-options-list');
  if (listEl) {
    if (!cats.length) {
      listEl.innerHTML = '<span class="empty-table" style="padding:10px 8px;font-size:12px">No categories found.</span>';
    } else {
      listEl.innerHTML = cats.map(c => {
        const isSelected = isExcludeMode
          ? Boolean((state.excludedCategories && state.excludedCategories.has(c)) || (state.selectedCategories && state.selectedCategories.has(c)))
          : Boolean(state.selectedCategories && state.selectedCategories.has(c));
        const col = categoryColor(c);
        const checkChar = isSelected ? (isExcludeMode ? '✕' : '✓') : '';
        const checkClass = isSelected ? (isExcludeMode ? 'checked is-not-check' : 'checked') : '';
        const tagStyle = isExcludeMode && isSelected
          ? 'background:rgba(235, 87, 87, 0.12);color:#eb5757;text-decoration:line-through;'
          : `background:${col.bg};color:${col.fg};`;

        return `<div class="notion-filter-option ${isSelected ? 'selected' : ''}" data-cat="${escapeHtml(c)}" data-value="${escapeHtml(c.toLowerCase())}">
          <span class="notion-custom-check ${checkClass}">${checkChar}</span>
          <span class="notion-tag" style="${tagStyle}">${escapeHtml(formatCategory(c))}</span>
        </div>`;
      }).join('');

      listEl.querySelectorAll('.notion-filter-option').forEach(row => {
        row.onclick = (e) => {
          e.stopPropagation();
          const catVal = row.dataset.cat;
          if (isExcludeMode) {
            if (!state.excludedCategories) state.excludedCategories = new Set();
            if (state.excludedCategories.has(catVal) || state.selectedCategories.has(catVal)) {
              state.excludedCategories.delete(catVal);
              state.selectedCategories.delete(catVal);
            } else {
              state.excludedCategories.add(catVal);
              state.selectedCategories.add(catVal);
            }
          } else {
            if (state.selectedCategories.has(catVal)) {
              state.selectedCategories.delete(catVal);
            } else {
              state.selectedCategories.add(catVal);
            }
          }
          syncFilterPills();
          populateCategories();
          onRender();
        };
      });
    }
  }

  // Also sync legacy selects if present
  const options = '<option value="all">All categories</option>' + cats.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(formatCategory(c))}</option>`).join('');
  if ($('category-filter')) $('category-filter').innerHTML = options;
  if ($('tx-category-filter')) $('tx-category-filter').innerHTML = options;

  syncFilterPills();
}

export function populateAccounts() {
  const isAll = state.period === 'all';
  const { start, end } = bounds();
  const periodRows = isAll ? state.data : state.data.filter(r => r.date >= start && r.date <= end);
  let rows = periodRows;
  if (state.type !== 'all') {
    rows = periodRows.filter(r => r.type === state.type);
  }
  const accts = [...new Set(rows.map(r => r.account).filter(a => a && a !== '—' && String(a).trim() !== ''))].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

  for (const a of state.selectedAccounts) {
    if (!accts.includes(a)) state.selectedAccounts.delete(a);
  }
  if (state.excludedAccounts) {
    for (const a of state.excludedAccounts) {
      if (!accts.includes(a)) state.excludedAccounts.delete(a);
    }
  }

  // Synchronize operator trigger button text & menu options
  const isAcctExclude = state.accountFilterMode === 'exclude' || state.accountOperator === 'is-not';
  const opText = $('acct-operator-text');
  if (opText) {
    opText.textContent = isAcctExclude ? 'is not' : 'is';
  }

  const isBtn = $('acct-op-is');
  const isNotBtn = $('acct-op-is-not');
  if (isBtn && isNotBtn) {
    isBtn.classList.toggle('selected', !isAcctExclude);
    isBtn.classList.toggle('active', !isAcctExclude);
    isBtn.setAttribute('aria-selected', !isAcctExclude ? 'true' : 'false');
    isNotBtn.classList.toggle('selected', isAcctExclude);
    isNotBtn.classList.toggle('active', isAcctExclude);
    isNotBtn.setAttribute('aria-selected', isAcctExclude ? 'true' : 'false');
  }

  const listEl = $('acct-options-list');
  if (listEl) {
    if (!accts.length) {
      listEl.innerHTML = '<span class="empty-table" style="padding:10px 8px;font-size:12px">No accounts found.</span>';
    } else {
      listEl.innerHTML = accts.map(a => {
        const isSelected = isAcctExclude
          ? Boolean((state.excludedAccounts && state.excludedAccounts.has(a)) || (state.selectedAccounts && state.selectedAccounts.has(a)))
          : Boolean(state.selectedAccounts && state.selectedAccounts.has(a));
        const checkChar = isSelected ? (isAcctExclude ? '✕' : '✓') : '';
        const checkClass = isSelected ? (isAcctExclude ? 'checked is-not-check' : 'checked') : '';
        const tagStyle = isAcctExclude && isSelected
          ? 'background:rgba(235, 87, 87, 0.12);color:#eb5757;text-decoration:line-through;'
          : 'background:#edece9;color:#37352f;';

        return `<div class="notion-filter-option ${isSelected ? 'selected' : ''}" data-acct="${escapeHtml(a)}" data-value="${escapeHtml(a.toLowerCase())}">
          <span class="notion-custom-check ${checkClass}">${checkChar}</span>
          <span class="notion-tag" style="${tagStyle}"><span class="acct-icon">🏛</span> ${escapeHtml(a)}</span>
        </div>`;
      }).join('');

      listEl.querySelectorAll('.notion-filter-option').forEach(row => {
        row.onclick = (e) => {
          e.stopPropagation();
          const acctVal = row.dataset.acct;
          if (isAcctExclude) {
            if (!state.excludedAccounts) state.excludedAccounts = new Set();
            if (state.excludedAccounts.has(acctVal) || state.selectedAccounts.has(acctVal)) {
              state.excludedAccounts.delete(acctVal);
              state.selectedAccounts.delete(acctVal);
            } else {
              state.excludedAccounts.add(acctVal);
              state.selectedAccounts.add(acctVal);
            }
          } else {
            if (state.selectedAccounts.has(acctVal)) {
              state.selectedAccounts.delete(acctVal);
            } else {
              state.selectedAccounts.add(acctVal);
            }
          }
          syncFilterPills();
          populateAccounts();
          onRender();
        };
      });
    }
  }

  const options = '<option value="all">All accounts</option>' + accts.map(a => `<option value="${escapeHtml(a)}">${escapeHtml(a)}</option>`).join('');
  if ($('account-filter')) $('account-filter').innerHTML = options;
  if ($('tx-account-filter')) $('tx-account-filter').innerHTML = options;

  syncFilterPills();
}

export function setAccountOperator(op) {
  const isNot = (op === 'is-not' || op === 'exclude');
  const newMode = isNot ? 'exclude' : 'include';
  const newOp = isNot ? 'is-not' : 'is';

  state.accountFilterMode = newMode;
  state.accountOperator = newOp;

  if (isNot) {
    // Switching to "is not": active accounts become the excluded set
    state.excludedAccounts = new Set(state.selectedAccounts);
  } else {
    // Switching to "is": active accounts become the included set
    if (state.excludedAccounts && state.excludedAccounts.size > 0) {
      state.selectedAccounts = new Set(state.excludedAccounts);
      state.excludedAccounts.clear();
    }
  }

  const opBtn = $('acct-operator-btn');
  const opText = $('acct-operator-text');
  const opMenu = $('acct-operator-menu');
  if (opText) {
    opText.textContent = isNot ? 'is not' : 'is';
  }
  if (opBtn) {
    opBtn.setAttribute('aria-expanded', 'false');
  }
  if (opMenu) {
    opMenu.classList.add('hidden');
  }

  const isBtn = $('acct-op-is');
  const isNotBtn = $('acct-op-is-not');
  if (isBtn && isNotBtn) {
    isBtn.classList.toggle('selected', !isNot);
    isBtn.classList.toggle('active', !isNot);
    isBtn.setAttribute('aria-selected', !isNot ? 'true' : 'false');
    isNotBtn.classList.toggle('selected', isNot);
    isNotBtn.classList.toggle('active', isNot);
    isNotBtn.setAttribute('aria-selected', isNot ? 'true' : 'false');
  }

  syncFilterPills();
  populateAccounts();
  onRender();
}

export function setTypeFilter(newType) {
  state.type = newType;
  state.selectedCategories.clear();
  if (state.excludedCategories) state.excludedCategories.clear();
  state.selectedAccounts.clear();
  if (state.excludedAccounts) state.excludedAccounts.clear();
  state.categoryFilterMode = 'include';
  state.categoryOperator = 'is';
  state.accountFilterMode = 'include';
  state.accountOperator = 'is';
  state.category = 'all';
  state.account = 'all';
  if ($('type-filter')) $('type-filter').value = newType;
  document.querySelectorAll('#tx-type-pills [data-tx-type]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.txType === newType);
  });
  resetTableDisplayLimit();
  onRender();
}

export function setSort(newSort) {
  state.sort = newSort;
  syncSortPill();
  closeAllPopovers();
  resetTableDisplayLimit();
  onRender();
}

export function setCategoryOperator(op) {
  const isNot = (op === 'is-not' || op === 'exclude');
  const newMode = isNot ? 'exclude' : 'include';
  const newOp = isNot ? 'is-not' : 'is';

  state.categoryFilterMode = newMode;
  state.categoryOperator = newOp;

  if (isNot) {
    // Switching to "is not": active categories become the excluded set
    state.excludedCategories = new Set(state.selectedCategories);
  } else {
    // Switching to "is": active categories become the included set
    if (state.excludedCategories && state.excludedCategories.size > 0) {
      state.selectedCategories = new Set(state.excludedCategories);
      state.excludedCategories.clear();
    }
  }

  const opBtn = $('cat-operator-btn');
  const opText = $('cat-operator-text');
  const opMenu = $('cat-operator-menu');
  if (opText) {
    opText.textContent = isNot ? 'is not' : 'is';
  }
  if (opBtn) {
    opBtn.setAttribute('aria-expanded', 'false');
  }
  if (opMenu) {
    opMenu.classList.add('hidden');
  }

  const chartOpBtn = $('chart-operator-btn');
  const chartOpText = $('chart-operator-text');
  const chartOpMenu = $('chart-operator-menu');
  if (chartOpText) {
    chartOpText.textContent = isNot ? 'is not' : 'is';
  }
  if (chartOpBtn) {
    chartOpBtn.setAttribute('aria-expanded', 'false');
  }
  if (chartOpMenu) {
    chartOpMenu.classList.add('hidden');
  }

  const isBtn = $('cat-op-is');
  const isNotBtn = $('cat-op-is-not');
  if (isBtn && isNotBtn) {
    isBtn.classList.toggle('selected', !isNot);
    isBtn.classList.toggle('active', !isNot);
    isBtn.setAttribute('aria-selected', !isNot ? 'true' : 'false');
    isNotBtn.classList.toggle('selected', isNot);
    isNotBtn.classList.toggle('active', isNot);
    isNotBtn.setAttribute('aria-selected', isNot ? 'true' : 'false');
  }

  const chartIsBtn = $('chart-op-is');
  const chartIsNotBtn = $('chart-op-is-not');
  if (chartIsBtn && chartIsNotBtn) {
    chartIsBtn.classList.toggle('selected', !isNot);
    chartIsBtn.classList.toggle('active', !isNot);
    chartIsBtn.setAttribute('aria-selected', !isNot ? 'true' : 'false');
    chartIsNotBtn.classList.toggle('selected', isNot);
    chartIsNotBtn.classList.toggle('active', isNot);
    chartIsNotBtn.setAttribute('aria-selected', isNot ? 'true' : 'false');
  }

  syncFilterPills();
  populateCategories();
  onRender();
}

export function toggleCategoryInclusion(category) {
  if (!state.excludedCategories) {
    state.excludedCategories = new Set();
  }

  state.categoryFilterMode = 'exclude';
  state.categoryOperator = 'is-not';

  if (category === 'Other') {
    const baseRows = baseFiltered();
    const chartType = state.type === 'transfer' ? 'transfer' : state.type === 'income' ? 'income' : 'expense';
    const baseTotals = categoryTotals(baseRows, chartType);
    const tailCategories = baseTotals.slice(7).map(([cat]) => cat);
    const isOtherExcluded = state.excludedCategories.has('Other') || (tailCategories.length > 0 && tailCategories.every(c => state.excludedCategories.has(c)));

    if (isOtherExcluded) {
      state.excludedCategories.delete('Other');
      state.selectedCategories.delete('Other');
      tailCategories.forEach(c => {
        state.excludedCategories.delete(c);
        state.selectedCategories.delete(c);
      });
    } else {
      state.excludedCategories.add('Other');
      state.selectedCategories.add('Other');
      tailCategories.forEach(c => {
        state.excludedCategories.add(c);
        state.selectedCategories.add(c);
      });
    }
  } else {
    if (state.excludedCategories.has(category)) {
      state.excludedCategories.delete(category);
      state.selectedCategories.delete(category);
    } else {
      state.excludedCategories.add(category);
      state.selectedCategories.add(category);
    }
  }

  if (state.excludedCategories.size === 0) {
    state.categoryFilterMode = 'include';
    state.categoryOperator = 'is';
  }

  const opText = $('cat-operator-text');
  if (opText) {
    opText.textContent = state.categoryFilterMode === 'exclude' ? 'is not' : 'is';
  }
  const chartOpText = $('chart-operator-text');
  if (chartOpText) {
    chartOpText.textContent = state.categoryFilterMode === 'exclude' ? 'is not' : 'is';
  }

  syncFilterPills();
  populateCategories();
  onRender();
  const panel = $('spending-section');
  if (panel) {
    panel.classList.remove('drill-anim');
    requestAnimationFrame(() => panel.classList.add('drill-anim'));
  }
}

export function handleChartCategoryClick(category) {
  const isExcludeMode = state.categoryOperator === 'is-not' || state.categoryFilterMode === 'exclude';
  if (isExcludeMode) {
    toggleCategoryInclusion(category);
  } else {
    // 'is' mode (inclusion / focus)
    if (category === 'Other') {
      const baseRows = baseFiltered();
      const chartType = state.type === 'transfer' ? 'transfer' : state.type === 'income' ? 'income' : 'expense';
      const baseTotals = categoryTotals(baseRows, chartType);
      const tailCategories = baseTotals.slice(7).map(([cat]) => cat);
      const allSelected = tailCategories.length > 0 && tailCategories.every(c => state.selectedCategories.has(c));
      if (allSelected || state.selectedCategories.has('Other')) {
        state.selectedCategories.delete('Other');
        tailCategories.forEach(c => state.selectedCategories.delete(c));
      } else {
        state.selectedCategories.add('Other');
        tailCategories.forEach(c => state.selectedCategories.add(c));
      }
    } else {
      if (state.selectedCategories.has(category)) {
        state.selectedCategories.delete(category);
      } else {
        state.selectedCategories.add(category);
      }
    }
    if (state.excludedCategories) state.excludedCategories.clear();
    syncFilterPills();
    populateCategories();
    onRender();
    const panel = $('spending-section');
    if (panel) {
      panel.classList.remove('drill-anim');
      requestAnimationFrame(() => panel.classList.add('drill-anim'));
    }
  }
}

export function selectCategory(category) {
  toggleCategoryInclusion(category);
}

export function initFilterListeners() {
  // Sort Pill Toggle
  if ($('sort-pill')) {
    $('sort-pill').onclick = (e) => {
      e.stopPropagation();
      const pop = $('sort-popover');
      if (!pop) return;
      const opening = pop.classList.contains('hidden');
      closeAllPopovers();
      if (opening) {
        pop.classList.remove('hidden');
        $('sort-pill').setAttribute('aria-expanded', 'true');
        $('mobile-popover-backdrop')?.classList.remove('hidden');
      }
    };
  }
  document.querySelectorAll('#sort-popover [data-sort]').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      setSort(btn.dataset.sort);
    };
  });

  // Category Operator Dropdown Toggle
  const catOpBtn = $('cat-operator-btn');
  const catOpMenu = $('cat-operator-menu');
  if (catOpBtn && catOpMenu) {
    catOpBtn.onclick = (e) => {
      e.stopPropagation();
      const isHidden = catOpMenu.classList.contains('hidden');
      if (isHidden) {
        catOpMenu.classList.remove('hidden');
        catOpBtn.setAttribute('aria-expanded', 'true');
      } else {
        catOpMenu.classList.add('hidden');
        catOpBtn.setAttribute('aria-expanded', 'false');
      }
    };
  }

  // Operator menu item selection
  if (catOpMenu) {
    catOpMenu.querySelectorAll('[data-op]').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        setCategoryOperator(btn.dataset.op);
      };
    });
  }

  // Fallback for Category Operator Toggle if present
  if ($('cat-operator-toggle')) {
    $('cat-operator-toggle').onclick = (e) => {
      e.stopPropagation();
      const btn = e.target.closest('[data-op]');
      if (!btn) return;
      setCategoryOperator(btn.dataset.op);
    };
  }

  // Dismiss operator menu when clicking outside it inside cat-popover
  const catPopover = $('cat-popover');
  if (catPopover) {
    catPopover.onclick = (e) => {
      if (catOpMenu && !catOpMenu.classList.contains('hidden') && !e.target.closest('#cat-operator-dropdown-wrap')) {
        catOpMenu.classList.add('hidden');
        catOpBtn?.setAttribute('aria-expanded', 'false');
      }
    };
  }

  // Chart Header Operator Dropdown Toggle
  const chartOpBtn = $('chart-operator-btn');
  const chartOpMenu = $('chart-operator-menu');
  if (chartOpBtn && chartOpMenu) {
    chartOpBtn.onclick = (e) => {
      e.stopPropagation();
      const isHidden = chartOpMenu.classList.contains('hidden');
      if (isHidden) {
        chartOpMenu.classList.remove('hidden');
        chartOpBtn.setAttribute('aria-expanded', 'true');
      } else {
        chartOpMenu.classList.add('hidden');
        chartOpBtn.setAttribute('aria-expanded', 'false');
      }
    };
  }

  // Chart Operator menu item selection
  if (chartOpMenu) {
    chartOpMenu.querySelectorAll('[data-op]').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        setCategoryOperator(btn.dataset.op);
      };
    });
  }

  // Dismiss chart operator menu on spending panel click outside dropdown wrap
  const spendingSection = $('spending-section');
  if (spendingSection) {
    spendingSection.addEventListener('click', (e) => {
      if (chartOpMenu && !chartOpMenu.classList.contains('hidden') && !e.target.closest('#chart-operator-dropdown-wrap')) {
        chartOpMenu.classList.add('hidden');
        chartOpBtn?.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // Category Pill Toggle
  if ($('cat-pill')) {
    $('cat-pill').onclick = (e) => {
      e.stopPropagation();
      const pop = $('cat-popover');
      if (!pop) return;
      const opening = pop.classList.contains('hidden');
      closeAllPopovers();
      if (opening) {
        pop.classList.remove('hidden');
        $('cat-pill').setAttribute('aria-expanded', 'true');
        $('mobile-popover-backdrop')?.classList.remove('hidden');
        renderCategoryChips();
        if ($('cat-search-input')) {
          $('cat-search-input').value = '';
          $('cat-search-input').focus();
          document.querySelectorAll('#cat-options-list .notion-filter-option').forEach(i => i.style.display = 'flex');
        }
      }
    };
  }
  if ($('cat-chip-box')) {
    $('cat-chip-box').onclick = (e) => {
      e.stopPropagation();
      $('cat-search-input')?.focus();
    };
  }
  if ($('cat-search-input')) {
    $('cat-search-input').onclick = (e) => e.stopPropagation();
    $('cat-search-input').oninput = (e) => {
      const q = e.target.value.toLowerCase().trim();
      document.querySelectorAll('#cat-options-list .notion-filter-option').forEach(item => {
        const val = item.dataset.value || '';
        item.style.display = (!q || val.includes(q)) ? 'flex' : 'none';
      });
    };
    $('cat-search-input').onkeydown = (e) => {
      if (e.key === 'Backspace' && e.target.value === '' && state.selectedCategories.size > 0) {
        const arr = [...state.selectedCategories];
        state.selectedCategories.delete(arr[arr.length - 1]);
        syncFilterPills();
        populateCategories();
        onRender();
      }
    };
  }
  if ($('cat-clear-all-btn')) {
    $('cat-clear-all-btn').onclick = (e) => {
      e.stopPropagation();
      state.selectedCategories.clear();
      if (state.excludedCategories) state.excludedCategories.clear();
      state.categoryFilterMode = 'include';
      state.categoryOperator = 'is';
      state.category = 'all';
      const opText = $('cat-operator-text');
      if (opText) opText.textContent = 'is';
      syncFilterPills();
      populateCategories();
      onRender();
      $('cat-search-input')?.focus();
    };
  }
  if ($('cat-clear-btn')) {
    $('cat-clear-btn').onclick = (e) => {
      e.stopPropagation();
      state.selectedCategories.clear();
      if (state.excludedCategories) state.excludedCategories.clear();
      state.categoryFilterMode = 'include';
      state.categoryOperator = 'is';
      state.category = 'all';
      const opText = $('cat-operator-text');
      if (opText) opText.textContent = 'is';
      syncFilterPills();
      populateCategories();
      onRender();
    };
  }

  // Account Operator Dropdown Toggle
  const acctOpBtn = $('acct-operator-btn');
  const acctOpMenu = $('acct-operator-menu');
  if (acctOpBtn && acctOpMenu) {
    acctOpBtn.onclick = (e) => {
      e.stopPropagation();
      const isHidden = acctOpMenu.classList.contains('hidden');
      if (isHidden) {
        acctOpMenu.classList.remove('hidden');
        acctOpBtn.setAttribute('aria-expanded', 'true');
      } else {
        acctOpMenu.classList.add('hidden');
        acctOpBtn.setAttribute('aria-expanded', 'false');
      }
    };
  }

  // Account Operator menu item selection
  if (acctOpMenu) {
    acctOpMenu.querySelectorAll('[data-op]').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        setAccountOperator(btn.dataset.op);
      };
    });
  }

  // Dismiss account operator menu when clicking outside it inside acct-popover
  const acctPopover = $('acct-popover');
  if (acctPopover) {
    acctPopover.onclick = (e) => {
      if (acctOpMenu && !acctOpMenu.classList.contains('hidden') && !e.target.closest('#acct-operator-dropdown-wrap')) {
        acctOpMenu.classList.add('hidden');
        acctOpBtn?.setAttribute('aria-expanded', 'false');
      }
    };
  }

  // Account Pill Toggle
  if ($('acct-pill')) {
    $('acct-pill').onclick = (e) => {
      e.stopPropagation();
      const pop = $('acct-popover');
      if (!pop) return;
      const opening = pop.classList.contains('hidden');
      closeAllPopovers();
      if (opening) {
        pop.classList.remove('hidden');
        $('acct-pill').setAttribute('aria-expanded', 'true');
        $('mobile-popover-backdrop')?.classList.remove('hidden');
        renderAccountChips();
        if ($('acct-search-input')) {
          $('acct-search-input').value = '';
          $('acct-search-input').focus();
          document.querySelectorAll('#acct-options-list .notion-filter-option').forEach(i => i.style.display = 'flex');
        }
      }
    };
  }
  if ($('acct-chip-box')) {
    $('acct-chip-box').onclick = (e) => {
      e.stopPropagation();
      $('acct-search-input')?.focus();
    };
  }
  if ($('acct-search-input')) {
    $('acct-search-input').onclick = (e) => e.stopPropagation();
    $('acct-search-input').oninput = (e) => {
      const q = e.target.value.toLowerCase().trim();
      document.querySelectorAll('#acct-options-list .notion-filter-option').forEach(item => {
        const val = item.dataset.value || '';
        item.style.display = (!q || val.includes(q)) ? 'flex' : 'none';
      });
    };
    $('acct-search-input').onkeydown = (e) => {
      if (e.key === 'Backspace' && e.target.value === '' && state.selectedAccounts.size > 0) {
        const arr = [...state.selectedAccounts];
        state.selectedAccounts.delete(arr[arr.length - 1]);
        syncFilterPills();
        populateAccounts();
        onRender();
      }
    };
  }
  if ($('acct-clear-all-btn')) {
    $('acct-clear-all-btn').onclick = (e) => {
      e.stopPropagation();
      state.selectedAccounts.clear();
      if (state.excludedAccounts) state.excludedAccounts.clear();
      state.accountFilterMode = 'include';
      state.accountOperator = 'is';
      state.account = 'all';
      const opText = $('acct-operator-text');
      if (opText) opText.textContent = 'is';
      syncFilterPills();
      populateAccounts();
      onRender();
      $('acct-search-input')?.focus();
    };
  }
  if ($('acct-clear-btn')) {
    $('acct-clear-btn').onclick = (e) => {
      e.stopPropagation();
      state.selectedAccounts.clear();
      if (state.excludedAccounts) state.excludedAccounts.clear();
      state.accountFilterMode = 'include';
      state.accountOperator = 'is';
      state.account = 'all';
      const opText = $('acct-operator-text');
      if (opText) opText.textContent = 'is';
      syncFilterPills();
      populateAccounts();
      onRender();
    };
  }

  // Columns Pill Toggle
  if ($('cols-pill')) {
    $('cols-pill').onclick = (e) => {
      e.stopPropagation();
      const pop = $('cols-popover');
      if (!pop) return;
      const opening = pop.classList.contains('hidden');
      closeAllPopovers();
      if (opening) {
        pop.classList.remove('hidden');
        $('cols-pill').setAttribute('aria-expanded', 'true');
        $('mobile-popover-backdrop')?.classList.remove('hidden');
        if ($('cols-search-input')) $('cols-search-input').value = '';
        populateColsList();
        // Focus search after render
        requestAnimationFrame(() => { if ($('cols-search-input')) $('cols-search-input').focus(); });
      }
    };
  }

  // Mobile Popover Backdrop Click
  const popoverBackdrop = $('mobile-popover-backdrop');
  if (popoverBackdrop) {
    popoverBackdrop.onclick = () => closeAllPopovers();
  }

  // Done / Close Buttons inside popovers
  document.querySelectorAll('[data-close-popover]').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      closeAllPopovers();
    };
  });

  // Columns Panel Close Button
  if ($('cols-panel-close')) {
    $('cols-panel-close').onclick = (e) => {
      e.stopPropagation();
      const pop = $('cols-popover');
      if (pop) pop.classList.add('hidden');
      if ($('cols-pill')) $('cols-pill').setAttribute('aria-expanded', 'false');
    };
  }

  // Columns Search Input
  if ($('cols-search-input')) {
    $('cols-search-input').onclick = (e) => e.stopPropagation();
    $('cols-search-input').oninput = () => populateColsList();
  }

  // Hide All visible columns button
  if ($('cols-hide-all-btn')) {
    $('cols-hide-all-btn').onclick = (e) => {
      e.stopPropagation();
      const visible = getVisibleColumns();
      // Keep at least 1 visible
      visible.slice(1).forEach(c => state.hiddenColumns.add(c));
      saveColumns();
      populateColsList();
      syncFilterPills();
      onRender();
      toast('Columns hidden');
    };
  }

  // Show All hidden columns button
  if ($('cols-show-all-btn')) {
    $('cols-show-all-btn').onclick = (e) => {
      e.stopPropagation();
      state.hiddenColumns.clear();
      saveColumns();
      populateColsList();
      syncFilterPills();
      onRender();
      toast('All columns visible');
    };
  }

  // Columns Reset Button (icon button)
  if ($('cols-reset-btn')) {
    $('cols-reset-btn').onclick = (e) => {
      e.stopPropagation();
      resetColumns();
      if ($('cols-search-input')) $('cols-search-input').value = '';
      populateColsList();
      syncFilterPills();
      onRender();
      toast('Columns reset to default');
    };
  }

  // Clear Category Button in spending breakdown panel
  if ($('clear-category')) {
    $('clear-category').onclick = () => {
      state.selectedCategories.clear();
      if (state.excludedCategories) state.excludedCategories.clear();
      state.categoryFilterMode = 'include';
      state.categoryOperator = 'is';
      state.category = 'all';
      const opText = $('cat-operator-text');
      if (opText) opText.textContent = 'is';
      const chartOpText = $('chart-operator-text');
      if (chartOpText) chartOpText.textContent = 'is';
      resetTableDisplayLimit();
      syncFilterPills();
      populateCategories();
      onRender();
    };
  }

  // Search Input
  if ($('search')) {
    $('search').oninput = (e) => {
      state.search = e.target.value;
      resetTableDisplayLimit();
      syncFilterPills();
      onRender();
    };
  }

  // Type Pills
  document.querySelectorAll('#tx-type-pills [data-tx-type]').forEach(btn => {
    btn.onclick = () => setTypeFilter(btn.dataset.txType);
  });

  // Global click & Escape to dismiss popovers
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.notion-pill-wrap') && !e.target.closest('.export-dropdown-wrap') && !e.target.closest('.display-dropdown-wrap') && !e.target.closest('#notion-col-menu') && !e.target.closest('.notion-th-draggable') && !e.target.closest('.period-label-wrap')) {
      closeAllPopovers();
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAllPopovers();
  });
}
