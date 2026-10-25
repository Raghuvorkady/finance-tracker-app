/**
 * Ledgerly State & Core Constants
 */

export const DEFAULT_COLUMN_ORDER = ['date', 'category', 'note', 'account', 'amount'];

export const COLUMN_DEFINITIONS = {
  date: { id: 'date', label: 'Date', icon: '📅', nonNotionLabel: 'Date', minWidth: '110px', align: 'left' },
  category: { id: 'category', label: 'Category', icon: '▾', nonNotionLabel: 'Category', minWidth: '110px', align: 'left' },
  note: { id: 'note', label: 'Note', icon: 'Aa', nonNotionLabel: 'Expense / Note', minWidth: '180px', align: 'left' },
  account: { id: 'account', label: 'Account', icon: '🏛', nonNotionLabel: 'Account', minWidth: '100px', align: 'left' },
  amount: { id: 'amount', label: 'Amount', icon: '#', nonNotionLabel: 'Amount', minWidth: '110px', align: 'right' }
};

function loadSavedColumnOrder() {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem('ledgerly_column_order');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const valid = parsed.filter(id => DEFAULT_COLUMN_ORDER.includes(id));
          DEFAULT_COLUMN_ORDER.forEach(id => {
            if (!valid.includes(id)) valid.push(id);
          });
          return valid;
        }
      }
    }
  } catch (e) {}
  return [...DEFAULT_COLUMN_ORDER];
}

function loadSavedHiddenColumns() {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem('ledgerly_hidden_columns');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const valid = parsed.filter(id => DEFAULT_COLUMN_ORDER.includes(id));
          if (valid.length < DEFAULT_COLUMN_ORDER.length) {
            return new Set(valid);
          }
        }
      }
    }
  } catch (e) {}
  return new Set();
}

export const state = {
  data: [],
  period: 'monthly',
  anchor: null,
  category: 'all',
  selectedCategories: new Set(),
  account: 'all',
  selectedAccounts: new Set(),
  type: 'all',
  search: '',
  sort: 'date-desc',
  customStart: '',
  customEnd: '',
  layoutView: 'a',
  activeTab: 'transactions',
  columnOrder: loadSavedColumnOrder(),
  hiddenColumns: loadSavedHiddenColumns()
};

export const DEFAULT_SCALE = 1.0;

export const PALETTE = [
  '#708f46', '#e88a68', '#8372c7', '#d5ae51', '#4d9f92',
  '#a56f92', '#6a9ccc', '#b5a85a', '#bf7b60', '#6f9c76'
];
