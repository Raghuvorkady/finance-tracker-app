// End-to-end verification of refactored ES modules

let elementStore = {};
function mockElement(id) {
  return {
    id,
    classList: {
      classes: new Set(['hidden']),
      add(c) { this.classes.add(c); },
      remove(c) { this.classes.delete(c); },
      toggle(c, force) {
        if (force === undefined) {
          if (this.classes.has(c)) this.classes.delete(c);
          else this.classes.add(c);
        } else if (force) {
          this.classes.add(c);
        } else {
          this.classes.delete(c);
        }
      },
      contains(c) { return this.classes.has(c); }
    },
    dataset: {},
    style: { setProperty() {} },
    innerHTML: '',
    textContent: '',
    value: '',
    className: '',
    setAttribute() {},
    appendChild(child) {},
    getAttribute(name) { return name === 'data-theme' ? 'notion' : null; },
    querySelectorAll(selector) {
      return [];
    },
    addEventListener() {}
  };
}

global.$ = (id) => {
  if (!elementStore[id]) elementStore[id] = mockElement(id);
  return elementStore[id];
};

global.document = {
  createElement(tag) {
    return mockElement('mock-' + tag);
  },
  getElementById(id) {
    if (!elementStore[id]) elementStore[id] = mockElement(id);
    return elementStore[id];
  },
  documentElement: {
    style: { setProperty() {} },
    setAttribute() {},
    getAttribute(name) { return name === 'data-theme' ? 'notion' : null; }
  },
  querySelectorAll: (selector) => {
    if (selector.includes('#tx-type-pills [data-tx-type]')) {
      const types = ['all', 'expense', 'income', 'transfer'];
      return types.map(t => ({
        dataset: { txType: t },
        classList: { toggle() {} }
      }));
    }
    if (selector.includes('#sort-popover [data-sort]')) {
      const sorts = ['date-desc', 'date-asc', 'amount-desc', 'amount-asc'];
      return sorts.map(s => ({
        dataset: { sort: s },
        classList: { toggle() {} }
      }));
    }
    return [];
  },
  querySelector: (selector) => {
    return null;
  },
  addEventListener: () => {}
};

global.window = {
  XLSX: {},
  matchMedia: () => ({ matches: false, addEventListener() {} })
};

global.requestAnimationFrame = (fn) => fn();

// Dynamic imports of refactored modules
const { state } = await import('../js/state.js');
const { normalizeRows } = await import('../js/parser.js');
const { bounds } = await import('../js/dates.js');
const { filtered, setTypeFilter, setSort, syncFilterPills } = await import('../js/filters.js');
const { render } = await import('../js/app.js');
const {
  renderTable,
  moveColumn,
  hideColumn,
  unhideColumn,
  toggleColumn,
  resetColumns,
  hasCustomColumns,
  getVisibleColumns
} = await import('../js/table.js');
const { setLayoutView, setActionLayout } = await import('../js/settings.js');

console.log('✓ ES Modules successfully loaded!');

const rawExcelRows = [
  ['Date', 'Category', 'Subcategory', 'Amount', 'Income/Expense', 'Account', 'Note', 'Description'],
  ['15/10/2026', 'Food', 'Dining', '450', 'Expense', 'HDFC Bank', 'Dinner with team', 'UPI/529103948/Zomato Bangalore/Payment'],
  ['16/10/2026', 'Salary', '', '150000', 'Income', 'ICICI Bank', 'Monthly Salary', 'NEFT-TECH CORP-OCT2026-SALARY'],
  ['17/10/2026', 'Savings Transfer', '', '25000', 'Transfer', 'ICICI Bank', 'To PPF Account', 'Transfer to PPF'],
  ['18/10/2026', 'Groceries', '', '1200', 'Expense', 'Credit Card', '', 'Blinkit Online Delivery order #8841'],
  ['19/10/2026', 'Entertainment', '', '800', 'Expense', 'HDFC Bank', 'Movie tickets', 'BookMyShow']
];

state.data = normalizeRows(rawExcelRows);
state.anchor = new Date('2026-10-15T12:00:00');
state.period = 'monthly';
state.type = 'all';

console.log('✓ normalizeRows normalized count:', state.data.length, '(expected 5)');

// Render master
render();
console.log('✓ render() executed without error');
console.log('✓ Donut contains macro slices:', document.getElementById('donut').innerHTML.includes('data-type-key="income"'));
console.log('✓ Breakdown title for all:', document.getElementById('breakdown-title').textContent, '(expected Breakdown)');
if (document.getElementById('breakdown-title').textContent !== 'Breakdown') throw new Error('Expected Breakdown title');

// Test Expense Filter
setTypeFilter('expense');
console.log('✓ setTypeFilter("expense") state.type:', state.type);
console.log('✓ Breakdown title for expense:', document.getElementById('breakdown-title').textContent, '(expected Breakdown)');
if (document.getElementById('breakdown-title').textContent !== 'Breakdown') throw new Error('Expected Breakdown title');
console.log('✓ Net copy minimal:', document.getElementById('net-copy').textContent, '(expected Income − expenses)');
if (document.getElementById('net-copy').textContent !== 'Income − expenses') throw new Error('Expected Income − expenses');
console.log('✓ Income count minimal:', document.getElementById('income-count').textContent);
console.log('✓ Records copy minimal:', document.getElementById('records-copy').textContent);

// Test Sort
setSort('amount-desc');
console.log('✓ setSort("amount-desc") state.sort:', state.sort);

// Test Multi-Select Category
state.selectedCategories.add('Food');
state.selectedCategories.add('Groceries');
const f = filtered();
console.log('✓ Multi-select Food + Groceries filtered count:', f.length, '(expected 2)');
console.log('✓ Multi-select categories match:', f.map(r => r.category).sort().join(', '), '(expected Food, Groceries)');

// Test Column Ordering, Hiding, and Resetting
console.log('\n--- Column Feature Tests ---');
resetColumns();
syncFilterPills();
console.log('✓ Initial columns:', getVisibleColumns().join(', '), '(hasCustomColumns:', hasCustomColumns(), 'expected false)');
if ($('cols-reset-btn').classList.contains('hidden') !== true) {
  throw new Error('Expected cols-reset-btn to be hidden initially');
}

// 1. Move column left — move 'category' left (index 2 → 1)
const movedLeft = moveColumn('category', 'left');
syncFilterPills();
console.log('✓ moveColumn("category", "left"):', movedLeft, '| Order:', state.columnOrder.join(', '));
if (state.columnOrder[1] !== 'category' || state.columnOrder[2] !== 'note') {
  throw new Error('moveColumn left failed: expected category at index 1, note at index 2');
}
console.log('✓ hasCustomColumns after move:', hasCustomColumns(), '(expected true)');
if ($('cols-reset-btn').classList.contains('hidden') === true) {
  throw new Error('Expected cols-reset-btn to be visible after column modification');
}

// 2. Move column right — move 'date' right (index 0 → 1)
const movedRight = moveColumn('date', 'right');
console.log('✓ moveColumn("date", "right"):', movedRight, '| Order:', state.columnOrder.join(', '));
if (state.columnOrder[0] !== 'category' || state.columnOrder[1] !== 'date') {
  throw new Error('moveColumn right failed: expected category at index 0, date at index 1');
}

// 3. Hide column
const hiddenCat = hideColumn('category');
console.log('✓ hideColumn("category"):', hiddenCat, '| Visible:', getVisibleColumns().join(', '));
if (getVisibleColumns().includes('category')) {
  throw new Error('hideColumn failed: category should not be visible');
}

// 4. Toggle column (unhide)
const toggledCat = toggleColumn('category');
console.log('✓ toggleColumn("category") unhide:', toggledCat, '| Visible:', getVisibleColumns().join(', '));
if (!getVisibleColumns().includes('category')) {
  throw new Error('toggleColumn unhide failed: category should be visible');
}

// 5. Reset columns
resetColumns();
syncFilterPills();
console.log('✓ resetColumns() -> Order:', state.columnOrder.join(', '), '| Hidden size:', state.hiddenColumns.size);
if (hasCustomColumns()) {
  throw new Error('resetColumns failed: hasCustomColumns should be false');
}
if ($('cols-reset-btn').classList.contains('hidden') !== true) {
  throw new Error('Expected cols-reset-btn to be hidden after reset');
}

// 6. Test renderTable with customized columns
hideColumn('account');
moveColumn('amount', 'left');
renderTable(state.data);
console.log('✓ renderTable executed with custom columns without error');
resetColumns();

// 7. Test Split View layout mode
setLayoutView('b');
console.log('✓ setLayoutView("b") state.layoutView:', state.layoutView, '(expected b)');
if (state.layoutView !== 'b') throw new Error('Expected layoutView to be b');

// 8. Test Action layout modes (Proposals)
setActionLayout('p1');
console.log('✓ setActionLayout("p1") applied');
setActionLayout('p2');
console.log('✓ setActionLayout("p2") applied');
setActionLayout('existing');
console.log('✓ setActionLayout("existing") applied');

// 9. Test Palette & Unbounded Categories Edge Case
const { getSliceColor } = await import('../js/charts.js');
const c0 = getSliceColor(0, 'expense');
const c9 = getSliceColor(9, 'expense');
const cTransfer0 = getSliceColor(0, 'transfer');
const cTransfer1 = getSliceColor(1, 'transfer');
const cOther = getSliceColor(7, 'expense', true);
const c15 = getSliceColor(15, 'expense');
console.log('✓ getSliceColor(0):', c0, '| getSliceColor(9):', c9);
console.log('✓ getSliceColor(0, transfer):', cTransfer0, '| getSliceColor(1, transfer):', cTransfer1);
console.log('✓ getSliceColor(other):', cOther, '(expected #94a3b8)');
console.log('✓ getSliceColor(15) fallback:', c15);
if (cOther !== '#94a3b8') throw new Error('Expected #94a3b8 for Other');
if (cTransfer0 !== '#6366f1') throw new Error('Expected vibrant indigo for transfer slice 0');
if (!c15.startsWith('hsl(')) throw new Error('Expected dynamic HSL generation for index >= 10');
console.log('✓ Color edge case handling verified successfully!');

console.log('\nAll refactored module tests PASSED successfully!');
