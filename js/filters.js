/**
 * Filter & Sort Controls, Multi-Select Popovers & State Synchronization
 */

import { $, escapeHtml, toast } from './utils.js';
import { state } from './state.js';
import { bounds } from './dates.js';
import { categoryColor, formatCategory } from './categories.js';

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
  document.querySelectorAll('.notion-popover, .export-menu').forEach(p => p.classList.add('hidden'));
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

export function syncFilterPills() {
  // Category Pill
  const catLabel = $('pill-cat-label');
  const catDot = $('cat-active-dot');
  const catPill = $('cat-pill');
  if (catLabel && catDot && catPill) {
    if (state.selectedCategories.size === 0) {
      catLabel.textContent = 'Category';
      catDot.classList.add('hidden');
      catPill.classList.remove('has-filter');
      state.category = 'all';
    } else if (state.selectedCategories.size === 1) {
      const single = [...state.selectedCategories][0];
      catLabel.textContent = formatCategory(single);
      catDot.classList.remove('hidden');
      catPill.classList.add('has-filter');
      state.category = single;
    } else {
      catLabel.textContent = `${state.selectedCategories.size} categories`;
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
    if (state.selectedAccounts.size === 0) {
      acctLabel.textContent = 'Account';
      acctDot.classList.add('hidden');
      acctPill.classList.remove('has-filter');
      state.account = 'all';
    } else if (state.selectedAccounts.size === 1) {
      const single = [...state.selectedAccounts][0];
      acctLabel.textContent = single;
      acctDot.classList.remove('hidden');
      acctPill.classList.add('has-filter');
      state.account = single;
    } else {
      acctLabel.textContent = `${state.selectedAccounts.size} accounts`;
      acctDot.classList.remove('hidden');
      acctPill.classList.add('has-filter');
      state.account = 'all';
    }
  }

  // Reset Button & Clear category drilldown button
  const hasFilter = state.selectedCategories.size > 0 ||
                    state.selectedAccounts.size > 0 ||
                    Boolean(state.search && state.search.trim()) ||
                    state.sort !== 'date-desc';
  if ($('notion-reset-filters')) $('notion-reset-filters').classList.toggle('hidden', !hasFilter);
  if ($('clear-category')) $('clear-category').classList.toggle('hidden', state.selectedCategories.size === 0);

  // Sync hidden legacy selects if present
  if ($('category-filter')) $('category-filter').value = state.category;
  if ($('account-filter')) $('account-filter').value = state.account;
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
        const count = rows.filter(r => r.category === c).length;
        const isChecked = state.selectedCategories.has(c);
        const col = categoryColor(c);
        return `<label class="notion-option-item" data-value="${escapeHtml(c.toLowerCase())}">
          <input type="checkbox" class="notion-checkbox" data-cat="${escapeHtml(c)}" ${isChecked ? 'checked' : ''} />
          <span class="cat-pill" style="background:${col.bg};color:${col.fg}">${escapeHtml(formatCategory(c))}</span>
          <span class="notion-option-count">${count}</span>
        </label>`;
      }).join('');

      listEl.querySelectorAll('input[type="checkbox"]').forEach(chk => {
        chk.onchange = () => {
          const catVal = chk.dataset.cat;
          if (chk.checked) state.selectedCategories.add(catVal);
          else state.selectedCategories.delete(catVal);
          syncFilterPills();
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
        const count = rows.filter(r => r.account === a).length;
        const isChecked = state.selectedAccounts.has(a);
        return `<label class="notion-option-item" data-value="${escapeHtml(a.toLowerCase())}">
          <input type="checkbox" class="notion-checkbox" data-acct="${escapeHtml(a)}" ${isChecked ? 'checked' : ''} />
          <span class="acct-pill"><span class="acct-icon">🏛</span> ${escapeHtml(a)}</span>
          <span class="notion-option-count">${count}</span>
        </label>`;
      }).join('');

      listEl.querySelectorAll('input[type="checkbox"]').forEach(chk => {
        chk.onchange = () => {
          const acctVal = chk.dataset.acct;
          if (chk.checked) state.selectedAccounts.add(acctVal);
          else state.selectedAccounts.delete(acctVal);
          syncFilterPills();
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
        if ($('cat-search-input')) {
          $('cat-search-input').value = '';
          $('cat-search-input').focus();
          document.querySelectorAll('#cat-options-list .notion-option-item').forEach(i => i.style.display = 'flex');
        }
      }
    };
  }
  if ($('cat-search-input')) {
    $('cat-search-input').onclick = (e) => e.stopPropagation();
    $('cat-search-input').oninput = (e) => {
      const q = e.target.value.toLowerCase().trim();
      document.querySelectorAll('#cat-options-list .notion-option-item').forEach(item => {
        const val = item.dataset.value || '';
        item.style.display = (!q || val.includes(q)) ? 'flex' : 'none';
      });
    };
  }
  if ($('cat-clear-btn')) {
    $('cat-clear-btn').onclick = (e) => {
      e.stopPropagation();
      state.selectedCategories.clear();
      state.category = 'all';
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
        if ($('acct-search-input')) {
          $('acct-search-input').value = '';
          $('acct-search-input').focus();
          document.querySelectorAll('#acct-options-list .notion-option-item').forEach(i => i.style.display = 'flex');
        }
      }
    };
  }
  if ($('acct-search-input')) {
    $('acct-search-input').onclick = (e) => e.stopPropagation();
    $('acct-search-input').oninput = (e) => {
      const q = e.target.value.toLowerCase().trim();
      document.querySelectorAll('#acct-options-list .notion-option-item').forEach(item => {
        const val = item.dataset.value || '';
        item.style.display = (!q || val.includes(q)) ? 'flex' : 'none';
      });
    };
  }
  if ($('acct-clear-btn')) {
    $('acct-clear-btn').onclick = (e) => {
      e.stopPropagation();
      state.selectedAccounts.clear();
      state.account = 'all';
      populateAccounts();
      onRender();
    };
  }

  // + Filter Ghost Pill Toggle
  if ($('add-filter-btn')) {
    $('add-filter-btn').onclick = (e) => {
      e.stopPropagation();
      const pop = $('add-filter-popover');
      if (!pop) return;
      const opening = pop.classList.contains('hidden');
      closeAllPopovers();
      if (opening) {
        pop.classList.remove('hidden');
        $('add-filter-btn').setAttribute('aria-expanded', 'true');
      }
    };
  }
  if ($('add-filter-cat')) {
    $('add-filter-cat').onclick = (e) => {
      e.stopPropagation();
      closeAllPopovers();
      $('cat-pill')?.click();
    };
  }
  if ($('add-filter-acct')) {
    $('add-filter-acct').onclick = (e) => {
      e.stopPropagation();
      closeAllPopovers();
      $('acct-pill')?.click();
    };
  }

  // Reset Filter Button
  if ($('notion-reset-filters')) {
    $('notion-reset-filters').onclick = () => {
      state.selectedCategories.clear();
      state.selectedAccounts.clear();
      state.category = 'all';
      state.account = 'all';
      state.search = '';
      if ($('search')) $('search').value = '';
      state.sort = 'date-desc';
      closeAllPopovers();
      syncSortPill();
      syncFilterPills();
      onRender();
      toast('Filters and sort reset');
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
    if (!e.target.closest('.notion-pill-wrap') && !e.target.closest('.export-dropdown-wrap')) {
      closeAllPopovers();
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAllPopovers();
  });
}
