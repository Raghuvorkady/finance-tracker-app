/**
 * Core Domain Interfaces & Type Definitions for Ledgerly
 */

export type TransactionType = 'expense' | 'income' | 'transfer';
export type FilterTransactionType = TransactionType | 'all';
export type PeriodType = 'monthly' | 'weekly' | 'quarterly' | 'yearly' | 'financial' | 'custom' | 'all';
export type SortCriteria = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc';
export type LayoutViewMode = 'a' | 'b' | 'c';
export type ActiveTab = 'transactions' | 'breakdown';
export type ActionLayoutMode = 'p1' | 'existing' | 'p2' | 'p3';
export type ChartViewMode = 'donut' | 'trend';
export type ColumnId = 'date' | 'note' | 'category' | 'account' | 'amount';

export interface ColumnDefinition {
  id: ColumnId;
  label: string;
  icon: string;
  nonNotionLabel: string;
  minWidth: string;
  align: 'left' | 'right' | 'center';
}

export interface Transaction {
  id: number;
  date: Date;
  category: string;
  type: TransactionType;
  amount: number;
  account: string;
  note: string;
  description: string;
}

export interface PeriodBounds {
  start: Date;
  end: Date;
  label: string;
}

export interface NotionColor {
  bg: string;
  fg: string;
}

export type FilterMode = 'include' | 'exclude';
export type FilterOperator = 'is' | 'is-not';

export interface AppState {
  data: Transaction[];
  period: PeriodType;
  anchor: Date | null;
  category: string;
  categoryFilterMode: FilterMode;
  categoryOperator: FilterOperator;
  selectedCategories: Set<string>;
  excludedCategories: Set<string>;
  account: string;
  accountFilterMode: FilterMode;
  accountOperator: FilterOperator;
  selectedAccounts: Set<string>;
  excludedAccounts: Set<string>;
  type: FilterTransactionType;
  search: string;
  sort: SortCriteria;
  customStart: string;
  customEnd: string;
  layoutView: LayoutViewMode;
  activeTab: ActiveTab;
  chartView: ChartViewMode;
  columnOrder: ColumnId[];
  hiddenColumns: Set<ColumnId>;
}

export interface MacroStream {
  name: string;
  typeKey: TransactionType;
  value: number;
  color: string;
  dotClass: string;
  emoji: string;
}

export interface MacroSlice extends MacroStream {
  percent: number;
  start: number;
  index: number;
}

export interface CategorySlice {
  name: string;
  value: number;
  color: string;
  percent: number;
  start: number;
  index: number;
}

export interface TimeSeriesBucket {
  label: string;
  date: Date;
  expense: number;
  income: number;
  transfer: number;
  categories: Record<string, number>;
}

declare global {
  interface Window {
    XLSX?: {
      read(data: ArrayBuffer, opts: { type: string; cellDates: boolean }): {
        Sheets: Record<string, any>;
        SheetNames: string[];
      };
      utils: {
        sheet_to_json(sheet: any, opts: { header: number; defval: string }): any[][];
      };
    };
  }
}
