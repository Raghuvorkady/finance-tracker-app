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

export function filtered() {
  const isAll = state.period === 'all';
  const { start, end } = bounds();
  const lower = state.search ? state.search.toLowerCase() : '';
  return state.data.filter(r =>
    (isAll || (r.date >= start && r.date <= end)) &&
    (state.type === 'all' || r.type === state.type) &&
    (state.selectedCategories.size === 0 || state.selectedCategories.has(r.category)) &&
    (state.selectedAccounts.size === 0 || state.selectedAccounts.has(r.account)) &&
    (!lower || [r.category, r.note, r.description, r.account].join(' ').toLowerCase().includes(lower))
  );
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
  document.querySelectorAll('.notion-popover, .export-menu, .display-menu').forEach(p => {
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
  const selected = [...state.selectedCategories];

  selected.forEach(cat => {
    const col = categoryColor(cat);
    const chip = document.createElement('span');
    chip.className = 'notion-chip';
    chip.style.backgroundColor = col.bg;
    chip.style.color = col.fg;

    const label = document.createElement('span');
    label.className = 'notion-chip-text';
    label.textContent = formatCategory(cat);
    chip.appendChild(label);

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'notion-chip-remove';
    removeBtn.setAttribute('aria-label', `Remove ${formatCategory(cat)}`);
    removeBtn.textContent = '✕';
    removeBtn.onclick = (e) => {
      e.stopPropagation();
      state.selectedCategories.delete(cat);
      syncFilterPills();
      populateCategories();
      onRender();
      if (searchInput) searchInput.focus();
    };
    chip.appendChild(removeBtn);

    container.appendChild(chip);
  });

  if (clearAllBtn) {
    clearAllBtn.classList.toggle('hidden', selected.length === 0);
  }
  if (searchInput) {
    searchInput.placeholder = selected.length === 0 ? 'Select one or more options...' : '';
  }
}

export function renderAccountChips() {
  const container = $('acct-chips');
  const clearAllBtn = $('acct-clear-all-btn');
  const searchInput = $('acct-search-input');
  if (!container) return;

  container.innerHTML = '';
  const selected = [...state.selectedAccounts];

  selected.forEach(acct => {
    const chip = document.createElement('span');
    chip.className = 'notion-chip';
    chip.style.backgroundColor = '#edece9';
    chip.style.color = '#37352f';

    const label = document.createElement('span');
    label.className = 'notion-chip-text';
    label.textContent = acct;
    chip.appendChild(label);

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'notion-chip-remove';
    removeBtn.setAttribute('aria-label', `Remove ${acct}`);
    removeBtn.textContent = '✕';
    removeBtn.onclick = (e) => {
      e.stopPropagation();
      state.selectedAccounts.delete(acct);
      syncFilterPills();
      populateAccounts();
      onRender();
      if (searchInput) searchInput.focus();
    };
    chip.appendChild(removeBtn);

    container.appendChild(chip);
  });

  if (clearAllBtn) {
    clearAllBtn.classList.toggle('hidden', selected.length === 0);
  }
  if (searchInput) {
    searchInput.placeholder = selected.length === 0 ? 'Select one or more options...' : '';
  }
}

export function syncFilterPills() {
  // Category Pill
  const catLabel = $('pill-cat-label');
  const catDot = $('cat-active-dot');
  const catPill = $('cat-pill');
  if (catLabel && catDot && catPill) {
    const selectedCats = [...state.selectedCategories];
    if (selectedCats.length === 0) {
      catLabel.textContent = 'Category';
      catDot.classList.add('hidden');
      catPill.classList.remove('has-filter');
      state.category = 'all';
    } else if (selectedCats.length <= 2) {
      catLabel.textContent = `Category: ${selectedCats.map(formatCategory).join(', ')}`;
      catDot.classList.remove('hidden');
      catPill.classList.add('has-filter');
      state.category = selectedCats.length === 1 ? selectedCats[0] : 'all';
    } else {
      catLabel.textContent = `Category: ${selectedCats.slice(0, 2).map(formatCategory).join(', ')} +${selectedCats.length - 2}`;
      catDot.classList.remove('hidden');
      catPill.classList.add('has-filter');
      state.category = 'all';
    }
  }

  // Account Pill
  const acctLabel = $('pill-acct-label');
  const acctDot = $('acct-active-dot');
  const acctPill = $('acct-pill');
  if (acctLabel && acctDot && acctPill) {
    const selectedAccts = [...state.selectedAccounts];
    if (selectedAccts.length === 0) {
      acctLabel.textContent = 'Account';
      acctDot.classList.add('hidden');
      acctPill.classList.remove('has-filter');
      state.account = 'all';
    } else if (selectedAccts.length <= 2) {
      acctLabel.textContent = `Account: ${selectedAccts.join(', ')}`;
      acctDot.classList.remove('hidden');
      acctPill.classList.add('has-filter');
      state.account = selectedAccts.length === 1 ? selectedAccts[0] : 'all';
    } else {
      acctLabel.textContent = `Account: ${selectedAccts.slice(0, 2).join(', ')} +${selectedAccts.length - 2}`;
      acctDot.classList.remove('hidden');
      acctPill.classList.add('has-filter');
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
                    state.selectedAccounts.size > 0 ||
                    Boolean(state.search && state.search.trim()) ||
                    state.sort !== 'date-desc' ||
                    isCustomCols;

  if ($('clear-category')) $('clear-category').classList.toggle('hidden', state.selectedCategories.size === 0);

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

  const listEl = $('cat-options-list');
  if (listEl) {
    if (!cats.length) {
      listEl.innerHTML = '<span class="empty-table" style="padding:10px 8px;font-size:12px">No categories found.</span>';
    } else {
      listEl.innerHTML = cats.map(c => {
        const isChecked = state.selectedCategories.has(c);
        const col = categoryColor(c);
        return `<div class="notion-filter-option ${isChecked ? 'selected' : ''}" data-cat="${escapeHtml(c)}" data-value="${escapeHtml(c.toLowerCase())}">
          <span class="notion-custom-check ${isChecked ? 'checked' : ''}">${isChecked ? '✓' : ''}</span>
          <span class="notion-tag" style="background:${col.bg};color:${col.fg}">${escapeHtml(formatCategory(c))}</span>
        </div>`;
      }).join('');

      listEl.querySelectorAll('.notion-filter-option').forEach(row => {
        row.onclick = (e) => {
          e.stopPropagation();
          const catVal = row.dataset.cat;
          if (state.selectedCategories.has(catVal)) {
            state.selectedCategories.delete(catVal);
          } else {
            state.selectedCategories.add(catVal);
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

  const listEl = $('acct-options-list');
  if (listEl) {
    if (!accts.length) {
      listEl.innerHTML = '<span class="empty-table" style="padding:10px 8px;font-size:12px">No accounts found.</span>';
    } else {
      listEl.innerHTML = accts.map(a => {
        const isChecked = state.selectedAccounts.has(a);
        return `<div class="notion-filter-option ${isChecked ? 'selected' : ''}" data-acct="${escapeHtml(a)}" data-value="${escapeHtml(a.toLowerCase())}">
          <span class="notion-custom-check ${isChecked ? 'checked' : ''}">${isChecked ? '✓' : ''}</span>
          <span class="notion-tag" style="background:#edece9;color:#37352f"><span class="acct-icon">🏛</span> ${escapeHtml(a)}</span>
        </div>`;
      }).join('');

      listEl.querySelectorAll('.notion-filter-option').forEach(row => {
        row.onclick = (e) => {
          e.stopPropagation();
          const acctVal = row.dataset.acct;
          if (state.selectedAccounts.has(acctVal)) {
            state.selectedAccounts.delete(acctVal);
          } else {
            state.selectedAccounts.add(acctVal);
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

export function setTypeFilter(newType) {
  state.type = newType;
  state.selectedCategories.clear();
  state.selectedAccounts.clear();
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

export function selectCategory(category) {
  if (category === 'Other') return;
  if (state.selectedCategories.has(category) && state.selectedCategories.size === 1) {
    state.selectedCategories.clear();
    state.category = 'all';
  } else {
    state.selectedCategories = new Set([category]);
    state.category = category;
  }
  syncFilterPills();
  onRender();
  const panel = $('spending-section');
  if (panel) {
    panel.classList.remove('drill-anim');
    requestAnimationFrame(() => panel.classList.add('drill-anim'));
  }
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
      state.category = 'all';
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
      state.category = 'all';
      syncFilterPills();
      populateCategories();
      onRender();
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
      state.account = 'all';
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
      state.account = 'all';
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
      state.category = 'all';
      resetTableDisplayLimit();
      syncFilterPills();
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
    if (!e.target.closest('.notion-pill-wrap') && !e.target.closest('.export-dropdown-wrap') && !e.target.closest('.display-dropdown-wrap') && !e.target.closest('#notion-col-menu') && !e.target.closest('.notion-th-draggable')) {
      closeAllPopovers();
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAllPopovers();
  });
}
