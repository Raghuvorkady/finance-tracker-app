/**
 * Ledgerly State & Core Constants
 */

export const DEFAULT_COLUMN_ORDER = ['date', 'note', 'category', 'account', 'amount'];

export const COLUMN_DEFINITIONS = {
  date: { id: 'date', label: 'Date', icon: '📅', nonNotionLabel: 'Date', minWidth: '110px', align: 'left' },
  category: { id: 'category', label: 'Category', icon: '', nonNotionLabel: 'Category', minWidth: '110px', align: 'left' },
  note: { id: 'note', label: 'Note', icon: 'Aa', nonNotionLabel: 'Expense / Note', minWidth: '180px', align: 'left' },
  account: { id: 'account', label: 'Account', icon: '🏛', nonNotionLabel: 'Account', minWidth: '100px', align: 'left' },
  amount: { id: 'amount', label: 'Amount', icon: '', nonNotionLabel: 'Amount', minWidth: '110px', align: 'right' }
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

function loadSavedChartView() {
  try {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('ledgerly_chart_view');
      if (saved === 'donut' || saved === 'trend') return saved;
    }
  } catch (e) {}
  return 'donut';
}

export const state = {
  data: [],
  period: 'monthly',
  anchor: null,
  category: 'all',
  categoryFilterMode: 'include', // 'include' (Is) | 'exclude' (Is not)
  categoryOperator: 'is', // 'is' | 'is-not'
  selectedCategories: new Set(),
  excludedCategories: new Set(),
  account: 'all',
  accountFilterMode: 'include', // 'include' (Is) | 'exclude' (Is not)
  accountOperator: 'is', // 'is' | 'is-not'
  selectedAccounts: new Set(),
  excludedAccounts: new Set(),
  type: 'all',
  search: '',
  sort: 'date-desc',
  customStart: '',
  customEnd: '',
  layoutView: 'a',
  activeTab: 'transactions',
  chartView: loadSavedChartView(),
  columnOrder: loadSavedColumnOrder(),
  hiddenColumns: loadSavedHiddenColumns()
};

export function setChartView(view) {
  if (view !== 'donut' && view !== 'trend') return;
  state.chartView = view;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('ledgerly_chart_view', view);
    }
  } catch (e) {}
}

export const DEFAULT_SCALE = 1.0;

export const EXPENSE_PALETTE = [
  '#3b82f6', // Vivid Blue (Tailwind blue-500)
  '#f97316', // Bright Tangerine / Orange (Tailwind orange-500)
  '#10b981', // Fresh Emerald Green (Tailwind emerald-500)
  '#8b5cf6', // Rich Violet / Purple (Tailwind violet-500)
  '#f59e0b', // Warm Amber / Gold (Tailwind amber-500)
  '#06b6d4', // Crisp Cyan / Teal (Tailwind cyan-500)
  '#f43f5e', // Vibrant Rose / Coral (Tailwind rose-500)
  '#84cc16', // Fresh Lime Green (Tailwind lime-500)
  '#d946ef', // Bright Fuchsia / Magenta (Tailwind fuchsia-500)
  '#6366f1'  // Indigo Blue (Tailwind indigo-500)
];

export const INCOME_PALETTE = [
  '#10b981', // Fresh Emerald Green (Tailwind emerald-500)
  '#06b6d4', // Crisp Cyan / Teal (Tailwind cyan-500)
  '#3b82f6', // Vivid Blue (Tailwind blue-500)
  '#84cc16', // Fresh Lime Green (Tailwind lime-500)
  '#14b8a6', // Clean Teal (Tailwind teal-500)
  '#f59e0b', // Warm Amber / Gold (Tailwind amber-500)
  '#22c55e', // Vibrant Green (Tailwind green-500)
  '#0ea5e9', // Electric Sky Blue (Tailwind sky-500)
  '#8b5cf6', // Rich Violet (Tailwind violet-500)
  '#059669'  // Forest Emerald (Tailwind emerald-600)
];

export const TRANSFER_PALETTE = [
  '#6366f1', // Indigo (Tailwind indigo-500)
  '#f59e0b', // Warm Amber / Gold (Tailwind amber-500)
  '#0ea5e9', // Sky Blue (Tailwind sky-500)
  '#ec4899', // Pink / Rose (Tailwind pink-500)
  '#10b981', // Emerald Green (Tailwind emerald-500)
  '#8b5cf6', // Rich Violet (Tailwind violet-500)
  '#f97316', // Tangerine Orange (Tailwind orange-500)
  '#06b6d4', // Crisp Cyan (Tailwind cyan-500)
  '#84cc16', // Fresh Lime (Tailwind lime-500)
  '#3b82f6'  // Electric Blue (Tailwind blue-500)
];

export const MACRO_COLORS = {
  income: '#10b981',   // Vibrant Emerald Green
  expense: '#f43f5e',  // Vibrant Rose / Coral Red
  transfer: '#787774'  // Neutral / Grey
};

export const PALETTE = EXPENSE_PALETTE;
