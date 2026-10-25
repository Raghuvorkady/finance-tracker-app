/**
 * Filter & Sort Controls, Multi-Select Popovers & State Synchronization
 */

import { $, escapeHtml, toast } from './utils.js';
import { state, COLUMN_DEFINITIONS } from './state.js';
import { bounds } from './dates.js';
import { categoryColor, formatCategory } from './categories.js';
import { hasCustomColumns, resetColumns, moveColumn, toggleColumn, getVisibleColumns } from './table.js';

let onRender = () => {};
export function registerRenderCallback(fn) {
  onRender = fn;
}

export function filtered() {
  const { start, end } = bounds();
  const lower = state.search.toLowerCase();
  return state.data.filter(r =>
    r.date >= start && r.date <= end &&
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

  renderCategoryChips();
  renderAccountChips();

  // Reset Button & Clear category drilldown button
  const hasFilter = state.selectedCategories.size > 0 ||
                    state.selectedAccounts.size > 0 ||
                    Boolean(state.search && state.search.trim()) ||
                    state.sort !== 'date-desc' ||
                    isCustomCols;
  if ($('notion-reset-filters')) $('notion-reset-filters').classList.toggle('hidden', !hasFilter);
  if ($('clear-category')) $('clear-category').classList.toggle('hidden', state.selectedCategories.size === 0);

  // Sync hidden legacy selects if present
  if ($('category-filter')) $('category-filter').value = state.category;
  if ($('account-filter')) $('account-filter').value = state.account;
}

export function populateColsList() {
  const listEl = $('cols-list');
  if (!listEl) return;

  const visible = getVisibleColumns();
  const itemsHtml = state.columnOrder.map((colId) => {
    const def = COLUMN_DEFINITIONS[colId] || { id: colId, label: colId, icon: '' };
    const isHidden = state.hiddenColumns.has(colId);
    const visIdx = visible.indexOf(colId);
    const canMoveLeft = !isHidden && visIdx > 0;
    const canMoveRight = !isHidden && visIdx >= 0 && visIdx < visible.length - 1;
    const iconHtml = def.icon ? `<span class="notion-col-item-icon">${def.icon}</span>` : '';

    return `<div class="notion-col-item ${isHidden ? 'is-hidden' : ''}" data-col="${colId}">
      <div class="notion-col-item-left">
        ${iconHtml}
        <span class="notion-col-item-name">${def.label}</span>
      </div>
      <div class="notion-col-item-actions">
        <button type="button" class="notion-col-action-btn btn-col-left ${canMoveLeft ? '' : 'disabled'}" data-col="${colId}" title="Move left" ${canMoveLeft ? '' : 'disabled'}>←</button>
        <button type="button" class="notion-col-action-btn btn-col-right ${canMoveRight ? '' : 'disabled'}" data-col="${colId}" title="Move right" ${canMoveRight ? '' : 'disabled'}>→</button>
        <button type="button" class="notion-col-action-btn btn-col-toggle ${isHidden ? 'hidden-col' : 'visible-col'}" data-col="${colId}" title="${isHidden ? 'Show in view' : 'Hide in view'}">
          ${isHidden ? '👁‍🗨' : '👁️'}
        </button>
      </div>
    </div>`;
  }).join('');

  listEl.innerHTML = itemsHtml;

  listEl.querySelectorAll('.btn-col-left').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const col = btn.dataset.col;
      if (moveColumn(col, 'left')) {
        populateColsList();
        syncFilterPills();
        onRender();
        toast('Column moved left');
      }
    };
  });

  listEl.querySelectorAll('.btn-col-right').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const col = btn.dataset.col;
      if (moveColumn(col, 'right')) {
        populateColsList();
        syncFilterPills();
        onRender();
        toast('Column moved right');
      }
    };
  });

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
}

export function populateCategories() {
  const { start, end } = bounds();
  const periodRows = state.data.filter(r => r.date >= start && r.date <= end);
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
  const { start, end } = bounds();
  const periodRows = state.data.filter(r => r.date >= start && r.date <= end);
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
  onRender();
}

export function setSort(newSort) {
  state.sort = newSort;
  syncSortPill();
  closeAllPopovers();
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
        populateColsList();
      }
    };
  }

  // Columns Reset Button
  if ($('cols-reset-btn')) {
    $('cols-reset-btn').onclick = (e) => {
      e.stopPropagation();
      resetColumns();
      populateColsList();
      syncFilterPills();
      onRender();
      toast('Columns reset to default');
    };
  }

  // Reset Filter Button (resets filters, search, sort, AND column order/visibility)
  if ($('notion-reset-filters')) {
    $('notion-reset-filters').onclick = () => {
      state.selectedCategories.clear();
      state.selectedAccounts.clear();
      state.category = 'all';
      state.account = 'all';
      state.search = '';
      if ($('search')) $('search').value = '';
      state.sort = 'date-desc';
      resetColumns();
      closeAllPopovers();
      syncSortPill();
      syncFilterPills();
      populateColsList();
      onRender();
      toast('Filters and columns reset');
    };
  }

  // Clear Category Button in spending breakdown panel
  if ($('clear-category')) {
    $('clear-category').onclick = () => {
      state.selectedCategories.clear();
      state.category = 'all';
      syncFilterPills();
      onRender();
    };
  }

  // Search Input
  if ($('search')) {
    $('search').oninput = (e) => {
      state.search = e.target.value;
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
