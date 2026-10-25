/**
 * Ledgerly State & Core Constants
 */

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
  activeTab: 'transactions'
};

export const DEFAULT_SCALE = 1.0;

export const PALETTE = [
  '#708f46', '#e88a68', '#8372c7', '#d5ae51', '#4d9f92',
  '#a56f92', '#6a9ccc', '#b5a85a', '#bf7b60', '#6f9c76'
];
