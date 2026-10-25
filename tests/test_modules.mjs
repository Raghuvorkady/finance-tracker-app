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
      if (selector && selector.includes('[data-chart-view]')) {
        return [
          { dataset: { chartView: 'donut' }, classList: { toggle() {} } },
          { dataset: { chartView: 'trend' }, classList: { toggle() {} } }
        ];
      }
      return [];
    },
    querySelector(selector) {
      return null;
    },
    addEventListener() {}
  };
}

global.$ = (id) => {
  if (!elementStore[id]) elementStore[id] = mockElement(id);
  return elementStore[id];
};

global.document = {
  title: 'Ledgerly — Finance analyst',
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
    if (selector.includes('[data-chart-view]')) {
      return [
        { dataset: { chartView: 'donut' }, classList: { toggle() {} } },
        { dataset: { chartView: 'trend' }, classList: { toggle() {} } }
      ];
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
  printCalled: false,
  print() { this.printCalled = true; },
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

// 10. Test money formatting (space after ₹ and no signs)
const { money } = await import('../js/utils.js');
const mPositive = money(51325.44);
const mNegative = money(-51325.44);
const mZero = money(0);
const mCompact = money(91940, true);
console.log('✓ money(51325.44):', JSON.stringify(mPositive));
console.log('✓ money(-51325.44):', JSON.stringify(mNegative));
console.log('✓ money(91940, true):', JSON.stringify(mCompact));

if (!mPositive.startsWith('₹\u00A0')) throw new Error('Expected space after ₹ in money()');
if (mNegative.includes('-') || mNegative.includes('−') || mNegative.includes('+')) throw new Error('money() must not include + or - signs');
if (!mNegative.startsWith('₹\u00A051,325.44')) throw new Error('Expected unsigned ₹ 51,325.44 for negative amount');
if (!mCompact.startsWith('₹\u00A0')) throw new Error('Expected space after ₹ in compact money()');
console.log('✓ Money currency formatting & space verified successfully!');

// ── 11. Test Line Chart Analysis (Time-Series Aggregation & SVG Curves) ──
const { aggregateTimeSeries, renderLineChart } = await import('../js/charts.js');
const { setChartView } = await import('../js/state.js');

// Test Monthly Buckets (October 2026: 31 days)
const octRange = {
  start: new Date(2026, 9, 1, 0, 0, 0, 0),
  end: new Date(2026, 9, 31, 23, 59, 59, 999),
  label: 'October 2026'
};
const monthlyBuckets = aggregateTimeSeries(state.data, octRange, 'monthly');
console.log('✓ Monthly time series bucket count:', monthlyBuckets.length, '(expected 31)');
if (monthlyBuckets.length !== 31) throw new Error('Expected 31 daily buckets for October');

// Check that transactions mapped into the correct daily buckets
// 15th: Food expense ₹450
// 16th: Salary income ₹150,000
// 17th: Transfer ₹25,000
// 18th: Groceries expense ₹1200
// 19th: Entertainment expense ₹800
const day15 = monthlyBuckets[14];
const day16 = monthlyBuckets[15];
const day17 = monthlyBuckets[16];
const day18 = monthlyBuckets[17];
console.log('✓ Day 15 expense:', day15.expense, 'top category:', day15.topCategory);
if (day15.expense !== 450 || day15.topCategory !== 'Food') throw new Error('Bucket 15 aggregation mismatch');
if (day16.income !== 150000) throw new Error('Bucket 16 income mismatch');
if (day17.transfer !== 25000) throw new Error('Bucket 17 transfer mismatch');
if (day18.expense !== 1200 || day18.topCategory !== 'Groceries') throw new Error('Bucket 18 expense mismatch');

// Test Weekly Buckets (7 days)
const weekRange = {
  start: new Date(2026, 9, 12, 0, 0, 0, 0),
  end: new Date(2026, 9, 18, 23, 59, 59, 999),
  label: 'Week 42'
};
const weeklyBuckets = aggregateTimeSeries(state.data, weekRange, 'weekly');
console.log('✓ Weekly time series bucket count:', weeklyBuckets.length, '(expected 7)');
if (weeklyBuckets.length !== 7) throw new Error('Expected 7 buckets for weekly period');

// Test Yearly Buckets (12 months)
const yearRange = {
  start: new Date(2026, 0, 1, 0, 0, 0, 0),
  end: new Date(2026, 11, 31, 23, 59, 59, 999),
  label: '2026'
};
const yearlyBuckets = aggregateTimeSeries(state.data, yearRange, 'yearly');
console.log('✓ Yearly time series bucket count:', yearlyBuckets.length, '(expected 12)');
if (yearlyBuckets.length !== 12) throw new Error('Expected 12 buckets for yearly period');

// Test SVG Line Chart rendering
const mockChartContainer = mockElement('trend-chart');
elementStore['trend-chart'] = mockChartContainer;
elementStore['trend-summary-strip'] = mockElement('trend-summary-strip');
elementStore['trend-footer-legend'] = mockElement('trend-footer-legend');
elementStore['trend-chart-wrap'] = mockElement('trend-chart-wrap');

renderLineChart(state.data, octRange, 'all');
console.log('✓ renderLineChart SVG output generated:', mockChartContainer.innerHTML.includes('<svg class="trend-svg"'));
if (!mockChartContainer.innerHTML.includes('<svg class="trend-svg"')) throw new Error('renderLineChart failed to output SVG');
if (!mockChartContainer.innerHTML.includes('class="trend-path path-expense"')) throw new Error('Expense curve missing from trend chart SVG');
if (!mockChartContainer.innerHTML.includes('class="trend-path path-income"')) throw new Error('Income curve missing from trend chart SVG');

// Test Chart View Switcher
setChartView('trend');
console.log('✓ setChartView("trend") state.chartView:', state.chartView);
if (state.chartView !== 'trend') throw new Error('Expected chartView to be "trend"');
setChartView('donut');
console.log('✓ setChartView("donut") state.chartView:', state.chartView);
if (state.chartView !== 'donut') throw new Error('Expected chartView to be "donut"');

// ── 12. Test PDF Statement Export & Reactive Print Header ──
const { exportPdf, updatePrintHeader } = await import('../js/export.js');
window.printCalled = false;
exportPdf();
console.log('✓ exportPdf executed cleanly');
console.log('✓ Print statement period label:', document.getElementById('print-period-label').textContent);
console.log('✓ Print statement filter summary:', document.getElementById('print-filter-summary').textContent);
if (!document.getElementById('print-filter-summary').textContent.includes('transaction')) {
  throw new Error('Expected transaction count in print statement summary');
}

// Test reactive print header update on filter changes via render()
state.selectedCategories.clear();
state.category = 'all';
state.type = 'all';
state.search = '';
render();
console.log('✓ Neutral render print summary:', document.getElementById('print-filter-summary').textContent);
if (!document.getElementById('print-filter-summary').textContent.includes('All Categories · All Accounts · 5 transactions')) {
  throw new Error('Expected "All Categories · All Accounts · 5 transactions" in neutral print summary');
}

// Apply type and search filter
state.type = 'expense';
state.search = 'team';
render();
console.log('✓ Filtered render print summary:', document.getElementById('print-filter-summary').textContent);
if (!document.getElementById('print-filter-summary').textContent.includes('Type: Expense') ||
    !document.getElementById('print-filter-summary').textContent.includes('Search: "team"') ||
    !document.getElementById('print-filter-summary').textContent.includes('1 transaction')) {
  throw new Error('Expected dynamic filter criteria in print summary');
}

// ── 13. Test Exact Calendar Prior Period Math & Tooltip ──
const { getPriorPeriodBounds, priorExpense } = await import('../js/dates.js');

// Test June 2026 prior is exact full May 2026 (May 1 to May 31)
state.anchor = new Date(2026, 5, 15);
state.period = 'monthly';
const junePrior = getPriorPeriodBounds();
console.log('✓ June 2026 prior period label:', junePrior.label, '(expected May 2026)');
if (junePrior.label !== 'May 2026') throw new Error('Expected May 2026 as prior period for June 2026');
if (junePrior.start.getDate() !== 1 || junePrior.end.getDate() !== 31) {
  throw new Error('Expected full calendar month May 1 to May 31');
}

// Test May 2026 prior is exact full April 2026 (April 1 to April 30)
state.anchor = new Date(2026, 4, 15);
const mayPrior = getPriorPeriodBounds();
console.log('✓ May 2026 prior period label:', mayPrior.label, '(expected April 2026)');
if (mayPrior.label !== 'April 2026') throw new Error('Expected April 2026 as prior period for May 2026');
if (mayPrior.start.getDate() !== 1 || mayPrior.end.getDate() !== 30) {
  throw new Error('Expected full calendar month April 1 to April 30');
}

// Test January 2026 prior is exact full December 2025
state.anchor = new Date(2026, 0, 15);
const janPrior = getPriorPeriodBounds();
console.log('✓ Jan 2026 prior period label:', janPrior.label, '(expected December 2025)');
if (janPrior.label !== 'December 2025') throw new Error('Expected December 2025 as prior period for Jan 2026');
if (janPrior.start.getFullYear() !== 2025 || janPrior.end.getFullYear() !== 2025) {
  throw new Error('Expected year boundary transition to 2025');
}

// ── 14. Test Period Navigator Rollover & 31st Day Boundary Handling ──
const { movePeriod } = await import('../js/dates.js');

// Case 1: Upload on Oct 31, navigate right -> November 2026 (NOT December)
state.period = 'monthly';
state.anchor = new Date(2026, 9, 31);
movePeriod(1);
const case1Label = bounds().label;
console.log('✓ Case 1 movePeriod(+1) from Oct 31:', case1Label, '(expected November 2026)');
if (case1Label !== 'November 2026') throw new Error(`Expected November 2026 but got ${case1Label}`);

// Case 2: Upload on Oct 31, navigate left -> September 2026 on single click (NOT October)
state.anchor = new Date(2026, 9, 31);
movePeriod(-1);
const case2Label = bounds().label;
console.log('✓ Case 2 movePeriod(-1) from Oct 31:', case2Label, '(expected September 2026)');
if (case2Label !== 'September 2026') throw new Error(`Expected September 2026 but got ${case2Label}`);

// Additional boundary: Jan 31 -> right -> February 2026
state.anchor = new Date(2026, 0, 31);
movePeriod(1);
const janToFebLabel = bounds().label;
console.log('✓ Boundary Jan 31 + 1:', janToFebLabel, '(expected February 2026)');
if (janToFebLabel !== 'February 2026') throw new Error(`Expected February 2026 but got ${janToFebLabel}`);

// Additional boundary: Mar 31 -> left -> February 2026
state.anchor = new Date(2026, 2, 31);
movePeriod(-1);
const marToFebLabel = bounds().label;
console.log('✓ Boundary Mar 31 - 1:', marToFebLabel, '(expected February 2026)');
if (marToFebLabel !== 'February 2026') throw new Error(`Expected February 2026 but got ${marToFebLabel}`);

// Quarterly navigation from end of month
state.period = 'quarterly';
state.anchor = new Date(2026, 9, 31); // Oct 31 (Q4)
movePeriod(-1);
const qPriorLabel = bounds().label;
console.log('✓ Quarterly navigation Q4 - 1:', qPriorLabel, '(expected Q3 2026)');
if (qPriorLabel !== 'Q3 2026') throw new Error(`Expected Q3 2026 but got ${qPriorLabel}`);

// Yearly leap-year boundary: Feb 29 2024 -> +1 year -> 2025
state.period = 'yearly';
state.anchor = new Date(2024, 1, 29);
movePeriod(1);
const leapYearLabel = bounds().label;
console.log('✓ Yearly leap boundary 2024 + 1:', leapYearLabel, '(expected 2025)');
if (leapYearLabel !== '2025') throw new Error(`Expected 2025 but got ${leapYearLabel}`);

// Reset state for clean conclusion
state.anchor = new Date('2026-10-15T12:00:00');
state.period = 'monthly';
state.type = 'all';
state.search = '';
state.selectedCategories.clear();
state.category = 'all';

// Test Comparison text does not include "vs prior"
state.data.push({
  date: new Date('2026-09-15T12:00:00'),
  category: 'Food',
  subcategory: '',
  amount: 2000,
  type: 'expense',
  account: 'HDFC Bank',
  note: 'Prior month food',
  description: 'Prior'
});
render();
const compareText = document.getElementById('spent-compare').textContent;
console.log('✓ Comparison text formatted:', compareText, '(expected no "vs prior")');
if (compareText.includes('vs prior')) throw new Error(`Expected comparison text not to contain 'vs prior' but got ${compareText}`);
if (!compareText.includes('%')) throw new Error(`Expected comparison text to contain percentage but got ${compareText}`);

console.log('\nAll refactored module tests PASSED successfully!');
