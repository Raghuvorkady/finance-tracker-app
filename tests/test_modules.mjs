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
    removeAttribute() {},
    appendChild(child) {},
    getAttribute(name) { return name === 'data-theme' ? 'notion' : null; },
    click() {
      if (typeof this.onclick === 'function') {
        this.onclick({ stopPropagation() {}, preventDefault() {} });
      }
    },
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
    if (selector.includes('.notion-popover')) {
      return Object.values(elementStore).filter(el => el.id === 'period-popover' || (el.className && el.className.includes('notion-popover')));
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

// ── Donut Chart describeArc SVG Precision Tests ──
const { describeArc } = await import('../js/charts.js');
const arc100 = describeArc(50, 50, 42, 0, 100);
if (!arc100.includes('A 42 42 0 1 1 50 92') || !arc100.includes('A 42 42 0 1 1 50 8')) {
  throw new Error('Expected 100% slice to render two full semicircles');
}
console.log('✓ describeArc 100% full circle verified:', arc100);

const arc1 = describeArc(50, 50, 42, 0, 35);
const arc2 = describeArc(50, 50, 42, 35, 65);
const arc1End = arc1.split(' ').slice(-2).join(' ');
const arc2Start = arc2.split(' ').slice(1, 3).join(' ');
if (arc1End !== arc2Start) {
  throw new Error(`Adjacent arc vertices must match: arc1End "${arc1End}" vs arc2Start "${arc2Start}"`);
}
console.log('✓ Adjacent arc vertices match seamlessly:', arc1End, '===', arc2Start);

if (!arc1.includes(' 0 1 ')) throw new Error('Expected largeArcFlag 0 for 35% slice');
if (!arc2.includes(' 1 1 ')) throw new Error('Expected largeArcFlag 1 for 65% slice');
console.log('✓ largeArcFlag dynamically computed correctly based on percentage');

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

// ── 15. Test Period Navigation Chevron Data-Presence Restrictions ──
state.period = 'all';
render();
const prevPeriodBtn = document.getElementById('prev-period');
const nextPeriodBtn = document.getElementById('next-period');

console.log('✓ Period chevrons disabled for All-Time:', prevPeriodBtn.disabled && nextPeriodBtn.disabled);
if (!prevPeriodBtn.disabled || !nextPeriodBtn.disabled) {
  throw new Error('Expected chevron navigation to be disabled when period is "all"');
}

// In monthly mode at Oct 2026: Sep 2026 has data, but Nov 2026 (future) has NO data
state.period = 'monthly';
state.anchor = new Date('2026-10-15T12:00:00');
render();

console.log('✓ Prev chevron enabled (Sep 2026 has data):', !prevPeriodBtn.disabled);
if (prevPeriodBtn.disabled) {
  throw new Error('Expected prev chevron to be enabled because Sep 2026 has data');
}

console.log('✓ Next chevron disabled (No data after Oct 2026):', nextPeriodBtn.disabled);
if (!nextPeriodBtn.disabled) {
  throw new Error('Expected next chevron to be disabled because no data exists after Oct 2026');
}

// Move to earliest data period (Sep 2026): prev should become disabled, next becomes enabled
state.anchor = new Date('2026-09-15T12:00:00');
render();

console.log('✓ Prev chevron disabled at earliest data boundary:', prevPeriodBtn.disabled);
if (!prevPeriodBtn.disabled) {
  throw new Error('Expected prev chevron to be disabled when no data exists prior to Sep 2026');
}

console.log('✓ Next chevron enabled towards Oct 2026:', !nextPeriodBtn.disabled);
if (nextPeriodBtn.disabled) {
  throw new Error('Expected next chevron to be enabled towards Oct 2026');
}

// Reset back to Oct 2026
state.anchor = new Date('2026-10-15T12:00:00');
render();

// Test Period label has clean text without dropdown icon
const periodLabelEl = document.getElementById('period-label');
console.log('✓ Period label text clean and without dropdown icon:', periodLabelEl.textContent.trim());
if (periodLabelEl.innerHTML.includes('period-caret') || periodLabelEl.innerHTML.includes('svg')) {
  throw new Error('Expected period label to not contain dropdown icon SVG');
}

// ── 16. Test Period Picker & Data Presence Detection ──
const { getPeriodsDataPresence, getAvailableYears, getCalendarWeek } = await import('../js/dates.js');
const {
  renderPeriodPicker,
  togglePeriodPicker,
  setPickerView,
  getPickerView,
  setViewYear,
  getViewYear,
  setViewMonth,
  getViewMonth,
  getWeeksForMonth
} = await import('../js/period-picker.js');
const { closeAllPopovers } = await import('../js/filters.js');

const presence = getPeriodsDataPresence();
console.log('✓ 2026 has data:', presence.years.has(2026));
if (!presence.years.has(2026)) throw new Error('Expected 2026 to have data in presence');

// Oct (month 9) has data
const octCount = presence.yearMonths.get(2026)?.get(9) || 0;
console.log('✓ Oct 2026 tx count:', octCount);
if (octCount === 0) throw new Error('Expected Oct 2026 to have transactions');

// Jan (month 0) has NO data
const janCount = presence.yearMonths.get(2026)?.get(0) || 0;
console.log('✓ Jan 2026 tx count (expected 0):', janCount);
if (janCount !== 0) throw new Error('Expected Jan 2026 to have 0 transactions');

// Year 2019 has NO data
if (presence.years.has(2019)) throw new Error('Expected 2019 to have no data');

// Available years range
const availYears = getAvailableYears(2, 2);
console.log('✓ Available years range:', availYears);
if (!availYears.includes(2026)) throw new Error('Expected available years to include 2026');

// Month picker rendering & grayout verification
state.period = 'monthly';
state.anchor = new Date(2026, 9, 15); // Oct 2026
setViewYear(2026);
setPickerView('month');
renderPeriodPicker();
const pop = document.getElementById('period-popover');

// Check Oct 2026 (data-month="9") is active and NOT disabled
const octActive = pop.innerHTML.includes('data-month="9"') && !pop.innerHTML.includes('data-month="9" disabled');
console.log('✓ Oct 2026 month button active and clickable:', octActive);
if (!octActive) throw new Error('Expected Oct 2026 to be enabled and not disabled');

// Check Jan 2026 (data-month="0") has-no-data and disabled attribute
const janDisabled = pop.innerHTML.includes('data-month="0"') && pop.innerHTML.includes('has-no-data') && pop.innerHTML.includes('disabled');
console.log('✓ Jan 2026 month button disabled and greyed out (Option B):', janDisabled);
if (!janDisabled) throw new Error('Expected Jan 2026 to have disabled attribute and has-no-data class');

// Test Quick-jump to current period icon sits beside Done in popover header
const hasTodayBtnBesideDone = pop.innerHTML.includes('id="picker-today-btn"') && pop.innerHTML.includes('data-close-popover');
console.log('✓ Quick-jump icon sits in popover header beside Done:', hasTodayBtnBesideDone);
if (!hasTodayBtnBesideDone) throw new Error('Expected picker-today-btn to sit beside Done in popover header');

// Test Quick-jump to current period icon is disabled when already at current period
state.anchor = new Date();
setViewYear(new Date().getFullYear());
setPickerView('month');
renderPeriodPicker();
const isTodayDisabledAtCurrent = pop.innerHTML.includes('id="picker-today-btn"') && pop.innerHTML.includes('disabled');
console.log('✓ Quick-jump icon disabled when already in current period:', isTodayDisabledAtCurrent);
if (!isTodayDisabledAtCurrent) throw new Error('Expected picker-today-btn to be disabled when already in current period');

// Test Quick-jump icon is enabled when viewing another period
setViewYear(new Date().getFullYear() - 1);
renderPeriodPicker();
const isTodayEnabledWhenAway = pop.innerHTML.includes('id="picker-today-btn"') && !pop.innerHTML.includes('id="picker-today-btn" disabled');
console.log('✓ Quick-jump icon enabled when viewing another period:', isTodayEnabledWhenAway);
if (!isTodayEnabledWhenAway) throw new Error('Expected picker-today-btn to be enabled when away from current period');

// Test Year button rendered in header
const hasYearButton = pop.innerHTML.includes('id="picker-year-btn"') && pop.innerHTML.includes(String(getViewYear()));
console.log('✓ Year button rendered prominently in header:', hasYearButton);
if (!hasYearButton) throw new Error('Expected year button in popover header');

// Year picker rendering & grayout verification
setPickerView('year');
renderPeriodPicker();
const year2026Active = pop.innerHTML.includes('data-year="2026"') && !pop.innerHTML.includes('data-year="2026" disabled');
console.log('✓ Year 2026 active and clickable in year picker:', year2026Active);
if (!year2026Active) throw new Error('Expected 2026 to be enabled in year picker');

// Toggle Period Picker
pop.classList.add('hidden');
const labelBtn = document.getElementById('period-label');
togglePeriodPicker();
console.log('✓ Period popover opened via toggle:', !pop.classList.contains('hidden'));
if (pop.classList.contains('hidden')) throw new Error('Expected popover to be visible after toggle');

closeAllPopovers();
console.log('✓ Period popover closed via closeAllPopovers:', pop.classList.contains('hidden'));
if (!pop.classList.contains('hidden')) throw new Error('Expected popover to be hidden after closeAllPopovers');

// ── 17. Test Dedicated Week Picker (Option A & CW## Format) ──
// Test ISO calendar week calculation
const cw1 = getCalendarWeek(new Date(2026, 0, 1));
console.log('✓ ISO Calendar Week for 1 Jan 2026:', cw1, '(expected 1)');
if (cw1 !== 1) throw new Error(`Expected CW 1 for Jan 1 2026 but got ${cw1}`);

// Test getWeeksForMonth for October 2026
const octWeeks = getWeeksForMonth(2026, 9);
console.log('✓ Weeks in Oct 2026:', octWeeks.length, '(expected 5)');
if (octWeeks.length !== 5) throw new Error(`Expected 5 weeks in Oct 2026 but got ${octWeeks.length}`);
octWeeks.forEach((w) => {
  if (w.start.getDay() !== 1) throw new Error(`Expected week start to be Monday (day 1) but got ${w.start.getDay()}`);
  if (w.end.getDay() !== 0) throw new Error(`Expected week end to be Sunday (day 0) but got ${w.end.getDay()}`);
  if (typeof w.cw !== 'number' || w.cw < 1 || w.cw > 53) throw new Error(`Invalid calendar week number: ${w.cw}`);
});

// Test togglePeriodPicker opens week picker when state.period === 'weekly'
state.period = 'weekly';
state.anchor = new Date(2026, 9, 15); // Oct 15, 2026 (falls in CW42)
pop.classList.add('hidden');
togglePeriodPicker();
console.log('✓ togglePeriodPicker sets pickerView to "week":', getPickerView() === 'week');
if (getPickerView() !== 'week') throw new Error(`Expected pickerView to be 'week' but got ${getPickerView()}`);

// Verify week picker HTML elements
const hasWeekGrid = pop.innerHTML.includes('period-grid-weeks');
const hasWeekTag = pop.innerHTML.includes('period-week-tag') && pop.innerHTML.includes('CW42');
const hasCwParenthesesFormat = pop.innerHTML.includes('CW42</span>') && pop.innerHTML.includes('(') && pop.innerHTML.includes(')');
console.log('✓ Week picker grid rendered:', hasWeekGrid);
console.log('✓ CW## label format rendered (e.g. CW42):', hasWeekTag);
console.log('✓ CW## (start – end) pattern matched:', hasCwParenthesesFormat);
if (!hasWeekGrid || !hasWeekTag || !hasCwParenthesesFormat) {
  throw new Error('Expected Week Picker to render period-grid-weeks with CW## (start - end) format');
}

// Option B verification: weeks with data are clickable, weeks with no data are disabled
const week42HasData = pop.innerHTML.includes('CW42') && pop.innerHTML.includes('has-data') && !pop.innerHTML.includes('has-data" disabled');
console.log('✓ Week CW42 (with transactions) is enabled and clickable:', week42HasData);
if (!week42HasData) throw new Error('Expected week CW42 with data to be active and not disabled');

const weekHasNoData = pop.innerHTML.includes('has-no-data') && pop.innerHTML.includes('disabled aria-disabled="true"');
console.log('✓ Empty week is greyed out and disabled (Option B):', weekHasNoData);
if (!weekHasNoData) throw new Error('Expected empty weeks to be disabled with aria-disabled="true"');

// Test today button disabled/enabled in weekly mode
state.anchor = new Date();
setViewYear(new Date().getFullYear());
setViewMonth(new Date().getMonth());
renderPeriodPicker();
const isWeeklyTodayDisabledAtCurrent = pop.innerHTML.includes('id="picker-today-btn"') && pop.innerHTML.includes('disabled');
console.log('✓ Weekly quick-jump icon disabled when in current week:', isWeeklyTodayDisabledAtCurrent);
if (!isWeeklyTodayDisabledAtCurrent) throw new Error('Expected picker-today-btn to be disabled at current week');

// Month navigation from week view
setViewMonth(new Date().getMonth() - 1);
renderPeriodPicker();
const isWeeklyTodayEnabledWhenNavigated = pop.innerHTML.includes('id="picker-today-btn"') && !pop.innerHTML.includes('id="picker-today-btn" disabled');
console.log('✓ Weekly quick-jump icon enabled when navigated to another month:', isWeeklyTodayEnabledWhenNavigated);
if (!isWeeklyTodayEnabledWhenNavigated) throw new Error('Expected picker-today-btn to be enabled when navigated away');

closeAllPopovers();

// ── 18. Test Category Legend Inclusion/Exclusion Toggle & Notion Operator Dropdown ──
const { toggleCategoryInclusion, setCategoryOperator } = await import('../js/filters.js');

state.period = 'monthly';
state.anchor = new Date(2026, 9, 15);
state.type = 'expense';
state.search = '';
state.selectedCategories.clear();
state.excludedCategories.clear();
state.categoryOperator = 'is';
state.categoryFilterMode = 'include';
render();

const initialFiltered = filtered();
const initialSpentText = document.getElementById('spent-value').textContent;
const legendBefore = document.getElementById('legend').innerHTML;

console.log('✓ Initial expense count before exclusion:', initialFiltered.length);
console.log('✓ Initial spent total:', initialSpentText);
if (legendBefore.includes('is-excluded')) throw new Error('Expected no excluded legend items initially');

// Exclude 'Food' category by clicking legend
toggleCategoryInclusion('Food');

const filteredAfterExcl = filtered();
const spentTextAfterExcl = document.getElementById('spent-value').textContent;
const legendAfterExcl = document.getElementById('legend').innerHTML;
const pillLabelAfterExcl = document.getElementById('pill-cat-label').textContent;

console.log('✓ Category Food marked in excludedCategories:', state.excludedCategories.has('Food'));
if (!state.excludedCategories.has('Food')) throw new Error('Expected Food to be in state.excludedCategories');

console.log('✓ Transactions table excludes Food rows:', !filteredAfterExcl.some(r => r.category === 'Food'));
if (filteredAfterExcl.some(r => r.category === 'Food')) throw new Error('Expected Food rows to be filtered out');

console.log('✓ KPI spent value updated (reduced):', spentTextAfterExcl !== initialSpentText);
if (spentTextAfterExcl === initialSpentText) throw new Error('Expected spent KPI value to decrease when category is excluded');

console.log('✓ Legend item for Food has is-excluded class (greyed out):', legendAfterExcl.includes('is-excluded') && legendAfterExcl.includes('Food'));
if (!legendAfterExcl.includes('is-excluded') || !legendAfterExcl.includes('Food')) {
  throw new Error('Expected Food legend button to have is-excluded class');
}

console.log('✓ Filter pill updated to show Category is not Food:', pillLabelAfterExcl === 'Category is not Food');
if (pillLabelAfterExcl !== 'Category is not Food') throw new Error(`Expected 'Category is not Food' but got '${pillLabelAfterExcl}'`);

// Operator toggle test
console.log('✓ Operator state set to exclude:', state.categoryFilterMode === 'exclude');
if (state.categoryFilterMode !== 'exclude') throw new Error('Expected categoryFilterMode to be exclude');
console.log('✓ Operator is-not set:', state.categoryOperator === 'is-not');
if (state.categoryOperator !== 'is-not') throw new Error('Expected categoryOperator to be is-not');
console.log('✓ Operator button text updated:', document.getElementById('cat-operator-text').textContent === 'is not');
if (document.getElementById('cat-operator-text').textContent !== 'is not') throw new Error('Expected operator button text to be "is not"');

// ── 19. Test Mutual Exclusivity: Either "is" or "is not" ──
// Switch operator to 'is'
setCategoryOperator('is');
console.log('✓ Operator switched to "is":', state.categoryOperator === 'is' && state.categoryFilterMode === 'include');
if (state.categoryOperator !== 'is' || state.categoryFilterMode !== 'include') {
  throw new Error('Expected operator to be "is" and filterMode to be "include"');
}
console.log('✓ Operator button text reflects "is":', document.getElementById('cat-operator-text').textContent === 'is');
if (document.getElementById('cat-operator-text').textContent !== 'is') {
  throw new Error('Expected operator button text to be "is"');
}

const filteredInMode = filtered();
console.log('✓ Under "is" mode, only Food rows returned:', filteredInMode.every(r => r.category === 'Food') && filteredInMode.length > 0);
if (!filteredInMode.every(r => r.category === 'Food') || filteredInMode.length === 0) {
  throw new Error('Expected only Food rows to be returned under "is" mode');
}

const pillLabelInMode = document.getElementById('pill-cat-label').textContent;
console.log('✓ Filter pill under "is" mode displays Category: Food:', pillLabelInMode === 'Category: Food');
if (pillLabelInMode !== 'Category: Food') {
  throw new Error(`Expected 'Category: Food' but got '${pillLabelInMode}'`);
}

// Switch operator back to 'is not'
setCategoryOperator('is-not');
console.log('✓ Operator switched back to "is-not":', state.categoryOperator === 'is-not' && state.categoryFilterMode === 'exclude');
if (state.categoryOperator !== 'is-not' || state.categoryFilterMode !== 'exclude') {
  throw new Error('Expected operator to be "is-not" and filterMode to be "exclude"');
}

const filteredNotInMode = filtered();
console.log('✓ Under "is not" mode, Food is excluded again:', !filteredNotInMode.some(r => r.category === 'Food'));
if (filteredNotInMode.some(r => r.category === 'Food')) {
  throw new Error('Expected Food rows to be excluded under "is not" mode');
}

const pillLabelNotInMode = document.getElementById('pill-cat-label').textContent;
console.log('✓ Filter pill under "is not" mode displays Category is not Food:', pillLabelNotInMode === 'Category is not Food');
if (pillLabelNotInMode !== 'Category is not Food') {
  throw new Error(`Expected 'Category is not Food' but got '${pillLabelNotInMode}'`);
}

// Multi-category exclusion pill text check
state.excludedCategories.add('Groceries');
syncFilterPills();
const pillLabel2Cats = document.getElementById('pill-cat-label').textContent;
console.log('✓ 2 categories excluded pill text:', pillLabel2Cats);
if (pillLabel2Cats !== 'Category is not Food, Groceries') {
  throw new Error(`Expected 'Category is not Food, Groceries' but got '${pillLabel2Cats}'`);
}

state.excludedCategories.add('Shopping');
syncFilterPills();
const pillLabel3Cats = document.getElementById('pill-cat-label').textContent;
console.log('✓ 3 categories excluded pill text:', pillLabel3Cats);
if (pillLabel3Cats !== 'Category is not (3)') {
  throw new Error(`Expected 'Category is not (3)' but got '${pillLabel3Cats}'`);
}

state.excludedCategories.delete('Groceries');
state.excludedCategories.delete('Shopping');

// Re-include 'Food' category by clicking the greyed-out legend item again
toggleCategoryInclusion('Food');

const filteredAfterReinc = filtered();
const spentTextAfterReinc = document.getElementById('spent-value').textContent;
const legendAfterReinc = document.getElementById('legend').innerHTML;

console.log('✓ Food removed from excludedCategories on second click:', !state.excludedCategories.has('Food'));
if (state.excludedCategories.has('Food')) throw new Error('Expected Food to be removed from excludedCategories');

console.log('✓ Transactions table restored Food rows:', filteredAfterReinc.length === initialFiltered.length);
if (filteredAfterReinc.length !== initialFiltered.length) throw new Error('Expected filtered count to restore to initial');

console.log('✓ KPI spent value restored:', spentTextAfterReinc === initialSpentText);
if (spentTextAfterReinc !== initialSpentText) throw new Error('Expected spent KPI value to restore to initial');

console.log('✓ Legend item for Food restored to normal:', !legendAfterReinc.includes('is-excluded'));
if (legendAfterReinc.includes('is-excluded')) throw new Error('Expected Food legend button to no longer have is-excluded class');

// Test #clear-category button resets exclusions & restores operator to "is"
toggleCategoryInclusion('Food');
if (!state.excludedCategories.has('Food')) throw new Error('Expected Food to be excluded before clear');
document.getElementById('clear-category').click();
console.log('✓ Clear category button resets all exclusions:', state.excludedCategories.size === 0);
if (state.excludedCategories.size !== 0) throw new Error('Expected clear-category button to clear excludedCategories');
console.log('✓ Clear category button resets operator to "is":', state.categoryOperator === 'is');
if (state.categoryOperator !== 'is') throw new Error('Expected categoryOperator to reset to "is"');

// ── 20. Test Account Filter Notion Operator Dropdown & Mutual Exclusivity ──
const { setAccountOperator } = await import('../js/filters.js');

state.type = 'all';
state.selectedCategories.clear();
state.excludedCategories.clear();
state.selectedAccounts.clear();
state.excludedAccounts.clear();
state.accountOperator = 'is';
state.accountFilterMode = 'include';
render();

// 1. Initial State
console.log('✓ Initial Account operator is "is":', state.accountOperator === 'is');
if (state.accountOperator !== 'is') throw new Error('Expected accountOperator to be "is" initially');
console.log('✓ Initial Account filterMode is "include":', state.accountFilterMode === 'include');
if (state.accountFilterMode !== 'include') throw new Error('Expected accountFilterMode to be "include" initially');

// 2. Select HDFC Bank under "is" mode
state.selectedAccounts.add('HDFC Bank');
syncFilterPills();
render();

const acctFilteredIn = filtered();
const acctPillIn = document.getElementById('pill-acct-label').textContent;
console.log('✓ Account under "is" mode returns only HDFC Bank rows:', acctFilteredIn.every(r => r.account === 'HDFC Bank') && acctFilteredIn.length === 2);
if (!acctFilteredIn.every(r => r.account === 'HDFC Bank') || acctFilteredIn.length !== 2) {
  throw new Error('Expected only HDFC Bank rows to be returned under "is" mode');
}
console.log('✓ Account filter pill under "is" mode:', acctPillIn);
if (acctPillIn !== 'Account: HDFC Bank') throw new Error(`Expected 'Account: HDFC Bank' but got '${acctPillIn}'`);

// 3. Switch operator to "is-not"
setAccountOperator('is-not');
console.log('✓ Account operator switched to "is-not":', state.accountOperator === 'is-not' && state.accountFilterMode === 'exclude');
if (state.accountOperator !== 'is-not' || state.accountFilterMode !== 'exclude') {
  throw new Error('Expected accountOperator to be "is-not" and accountFilterMode to be "exclude"');
}
console.log('✓ Account operator button text reflects "is not":', document.getElementById('acct-operator-text').textContent === 'is not');
if (document.getElementById('acct-operator-text').textContent !== 'is not') {
  throw new Error('Expected acct-operator-text to be "is not"');
}

const acctFilteredOut = filtered();
console.log('✓ Under "is not" mode, HDFC Bank is excluded:', !acctFilteredOut.some(r => r.account === 'HDFC Bank') && acctFilteredOut.length === 3);
if (acctFilteredOut.some(r => r.account === 'HDFC Bank') || acctFilteredOut.length !== 3) {
  throw new Error('Expected HDFC Bank rows to be excluded under "is not" mode');
}

const acctPillOut = document.getElementById('pill-acct-label').textContent;
console.log('✓ Account filter pill under "is not" mode displays Account is not HDFC Bank:', acctPillOut === 'Account is not HDFC Bank');
if (acctPillOut !== 'Account is not HDFC Bank') {
  throw new Error(`Expected 'Account is not HDFC Bank' but got '${acctPillOut}'`);
}

// 4. Multi-account exclusion pill formatting
state.excludedAccounts.add('Credit Card');
syncFilterPills();
const acctPill2 = document.getElementById('pill-acct-label').textContent;
console.log('✓ 2 accounts excluded pill text:', acctPill2);
if (acctPill2 !== 'Account is not HDFC Bank, Credit Card') {
  throw new Error(`Expected 'Account is not HDFC Bank, Credit Card' but got '${acctPill2}'`);
}

state.excludedAccounts.add('ICICI Bank');
syncFilterPills();
const acctPill3 = document.getElementById('pill-acct-label').textContent;
console.log('✓ 3 accounts excluded pill text:', acctPill3);
if (acctPill3 !== 'Account is not (3)') {
  throw new Error(`Expected 'Account is not (3)' but got '${acctPill3}'`);
}

// 5. Switch operator back to "is"
setAccountOperator('is');
console.log('✓ Account operator switched back to "is":', state.accountOperator === 'is' && state.accountFilterMode === 'include');
if (state.accountOperator !== 'is' || state.accountFilterMode !== 'include') {
  throw new Error('Expected accountOperator to be "is"');
}
console.log('✓ Account operator button text reflects "is":', document.getElementById('acct-operator-text').textContent === 'is');
if (document.getElementById('acct-operator-text').textContent !== 'is') {
  throw new Error('Expected acct-operator-text to be "is"');
}

// 6. Test #acct-clear-btn resets operator and clears accounts
document.getElementById('acct-clear-btn').click();
console.log('✓ Account clear button resets all account selections:', state.selectedAccounts.size === 0 && state.excludedAccounts.size === 0);
if (state.selectedAccounts.size !== 0 || state.excludedAccounts.size !== 0) {
  throw new Error('Expected selectedAccounts and excludedAccounts to be empty after clear');
}
console.log('✓ Account clear button resets operator to "is":', state.accountOperator === 'is');
if (state.accountOperator !== 'is') throw new Error('Expected accountOperator to reset to "is"');
console.log('✓ Account pill label restored to neutral "Account":', document.getElementById('pill-acct-label').textContent === 'Account');
if (document.getElementById('pill-acct-label').textContent !== 'Account') {
  throw new Error('Expected pill label to be "Account" after clear');
}

// ── 21. Test Mode-Aware Breakdown Chart Interaction (Option A) ──
const { handleChartCategoryClick } = await import('../js/filters.js');

state.type = 'expense';
state.selectedCategories.clear();
state.excludedCategories.clear();
state.categoryOperator = 'is';
state.categoryFilterMode = 'include';
render();

// 1. Chart Operator Header reflects 'is'
console.log('✓ Chart operator header text reflects "is":', document.getElementById('chart-operator-text').textContent === 'is');
if (document.getElementById('chart-operator-text').textContent !== 'is') {
  throw new Error('Expected chart-operator-text to be "is"');
}

// 2. Click category 'Food' in 'is' mode -> focuses/selects Food
handleChartCategoryClick('Food');
console.log('✓ Clicking Food under "is" mode adds Food to selectedCategories:', state.selectedCategories.has('Food'));
if (!state.selectedCategories.has('Food')) throw new Error('Expected Food to be in selectedCategories');

const chartLegendInFocus = document.getElementById('legend').innerHTML;
console.log('✓ Legend item for Food has is-selected-focus class:', chartLegendInFocus.includes('is-selected-focus') && chartLegendInFocus.includes('Food'));
if (!chartLegendInFocus.includes('is-selected-focus') || !chartLegendInFocus.includes('Food')) {
  throw new Error('Expected Food to have is-selected-focus in legend');
}

console.log('✓ Legend item for other categories has is-unselected class:', chartLegendInFocus.includes('is-unselected'));
if (!chartLegendInFocus.includes('is-unselected')) {
  throw new Error('Expected unselected categories to have is-unselected in legend');
}

console.log('✓ Filter pill displays Category: Food:', document.getElementById('pill-cat-label').textContent === 'Category: Food');
if (document.getElementById('pill-cat-label').textContent !== 'Category: Food') {
  throw new Error('Expected Category: Food in filter pill');
}

// 3. Click 'Food' again -> deselects it
handleChartCategoryClick('Food');
console.log('✓ Clicking Food again removes it from selectedCategories:', !state.selectedCategories.has('Food') && state.selectedCategories.size === 0);
if (state.selectedCategories.has('Food')) throw new Error('Expected Food to be removed on second click');
console.log('✓ Filter pill restored to neutral Category:', document.getElementById('pill-cat-label').textContent === 'Category');
if (document.getElementById('pill-cat-label').textContent !== 'Category') {
  throw new Error('Expected Category in filter pill');
}

// 4. Switch Chart Operator to 'is-not'
setCategoryOperator('is-not');
console.log('✓ Chart operator switched to "is-not":', state.categoryOperator === 'is-not');
if (state.categoryOperator !== 'is-not') throw new Error('Expected categoryOperator to be is-not');
console.log('✓ Chart operator header text reflects "is not":', document.getElementById('chart-operator-text').textContent === 'is not');
if (document.getElementById('chart-operator-text').textContent !== 'is not') {
  throw new Error('Expected chart-operator-text to be "is not"');
}
console.log('✓ Popover operator text is synchronized to "is not":', document.getElementById('cat-operator-text').textContent === 'is not');
if (document.getElementById('cat-operator-text').textContent !== 'is not') {
  throw new Error('Expected cat-operator-text to be synced to "is not"');
}

// 5. Click category 'Food' in 'is not' mode -> excludes Food
handleChartCategoryClick('Food');
console.log('✓ Clicking Food under "is not" mode excludes Food:', state.excludedCategories.has('Food'));
if (!state.excludedCategories.has('Food')) throw new Error('Expected Food to be in excludedCategories');

const chartLegendInExclude = document.getElementById('legend').innerHTML;
console.log('✓ Legend item for Food has is-excluded class:', chartLegendInExclude.includes('is-excluded') && chartLegendInExclude.includes('Food'));
if (!chartLegendInExclude.includes('is-excluded') || !chartLegendInExclude.includes('Food')) {
  throw new Error('Expected Food to have is-excluded in legend');
}
console.log('✓ Filter pill displays Category is not Food:', document.getElementById('pill-cat-label').textContent === 'Category is not Food');
if (document.getElementById('pill-cat-label').textContent !== 'Category is not Food') {
  throw new Error('Expected Category is not Food in filter pill');
}

// 6. Reset button resets chart back to neutral 'is' mode
document.getElementById('clear-category').click();
console.log('✓ Clear category resets chart operator to "is":', state.categoryOperator === 'is');
if (state.categoryOperator !== 'is') throw new Error('Expected categoryOperator to reset to "is"');
console.log('✓ Chart operator text restored to "is":', document.getElementById('chart-operator-text').textContent === 'is');
if (document.getElementById('chart-operator-text').textContent !== 'is') {
  throw new Error('Expected chart-operator-text to be "is"');
}

console.log('\nAll refactored module tests PASSED successfully!');
