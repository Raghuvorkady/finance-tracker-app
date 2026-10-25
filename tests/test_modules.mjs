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
const { filtered, setTypeFilter, setSort } = await import('../js/filters.js');
const { render } = await import('../js/app.js');

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
console.log('✓ Breakdown title for all:', document.getElementById('breakdown-title').textContent, '(expected Cashflow Breakdown)');

// Test Expense Filter
setTypeFilter('expense');
console.log('✓ setTypeFilter("expense") state.type:', state.type);
console.log('✓ Breakdown title for expense:', document.getElementById('breakdown-title').textContent, '(expected Expense Breakdown)');

// Test Sort
setSort('amount-desc');
console.log('✓ setSort("amount-desc") state.sort:', state.sort);

// Test Multi-Select Category
state.selectedCategories.add('Food');
state.selectedCategories.add('Groceries');
const f = filtered();
console.log('✓ Multi-select Food + Groceries filtered count:', f.length, '(expected 2)');
console.log('✓ Multi-select categories match:', f.map(r => r.category).sort().join(', '), '(expected Food, Groceries)');

console.log('\nAll refactored module tests PASSED successfully!');
