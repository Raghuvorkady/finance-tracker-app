/**
 * Theme, Font Scaling, and Dashboard Layout Mode Settings
 */

import { $, getStorage, setStorage } from './utils.js';
import { state, DEFAULT_SCALE } from './state.js';
import { closeAllPopovers } from './filters.js';
import { downloadCsv } from './export.js';
import { LayoutViewMode, ActiveTab, ActionLayoutMode } from './types.js';

let onSettingsChange: () => void = () => {};
export function registerSettingsCallback(fn: () => void): void {
  onSettingsChange = fn;
}

export function setFontScale(scale: number | string): void {
  const num = Math.min(1.5, Math.max(0.8, Math.round(parseFloat(String(scale)) * 100) / 100));
  if (typeof document !== 'undefined') {
    document.documentElement.style.setProperty('--font-scale', String(num));
  }
  setStorage('ledgerly-font-scale', String(num));

  const pct = `${Math.round(num * 100)}%`;
  const readout = $('font-scale-readout');
  if (readout) readout.textContent = pct;
  const pill = $('font-scale-pill');
  if (pill) pill.textContent = pct;
  const sheetPill = $('sheet-font-scale');
  if (sheetPill) sheetPill.textContent = pct;
}

export function adjustFontScale(delta: number): void {
  const current = parseFloat(getStorage('ledgerly-font-scale', String(DEFAULT_SCALE)) || String(DEFAULT_SCALE));
  setFontScale(current + delta);
}

export function setLayoutView(mode?: string): void {
  const valid: LayoutViewMode = (mode === 'a' || mode === 'b' || mode === 'c') ? mode : 'a';
  state.layoutView = valid;
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-layout-view', valid);
    setStorage('ledgerly-layout-view', valid);
    document.querySelectorAll<HTMLElement>('#display-layout-options [data-view-mode]').forEach(btn => {
      btn.classList.toggle('selected', btn.dataset.viewMode === valid);
    });
  }
  if (valid === 'c') {
    setOptionCTab(state.activeTab || 'transactions');
  }
}

export function setOptionCTab(tabName?: string): void {
  const valid: ActiveTab = (tabName === 'transactions' || tabName === 'breakdown') ? tabName : 'transactions';
  state.activeTab = valid;
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-active-tab', valid);
    setStorage('ledgerly-active-c-tab', valid);
    document.querySelectorAll<HTMLElement>('#option-c-subtabs [data-c-tab]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.cTab === valid);
    });
  }
}

export function setTheme(theme = 'notion'): void {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', theme);
    setStorage('ledgerly-theme', theme);
    document.querySelectorAll<HTMLElement>('[data-theme]').forEach(btn => {
      if (btn.tagName === 'BUTTON') btn.classList.toggle('selected', btn.dataset.theme === theme);
    });
  }
  onSettingsChange();
}

export function setActionLayout(mode?: string): void {
  const valid: ActionLayoutMode = (mode === 'p1' || mode === 'existing' || mode === 'p2' || mode === 'p3') ? mode : 'p1';
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-action-layout', valid);
    setStorage('ledgerly-action-layout', valid);
    document.querySelectorAll<HTMLElement>('[data-action-mode]').forEach(btn => {
      btn.classList.toggle('selected', btn.dataset.actionMode === valid);
    });
  }
  onSettingsChange();
}

export function openBottomSheet(): void {
  closeAllPopovers();
  const sheet = $('bottom-sheet-backdrop');
  if (sheet) sheet.classList.remove('hidden');
}

export function closeBottomSheet(): void {
  const sheet = $('bottom-sheet-backdrop');
  if (sheet) sheet.classList.add('hidden');
}

export function initSettings(): void {
  setTheme('notion');
  const savedScale = getStorage('ledgerly-font-scale', String(DEFAULT_SCALE));
  setFontScale(savedScale ? parseFloat(savedScale) : DEFAULT_SCALE);
  const savedLayout = getStorage('ledgerly-layout-view', 'a');
  setLayoutView(savedLayout || 'a');
  const savedTab = getStorage('ledgerly-active-c-tab', 'transactions');
  setOptionCTab(savedTab || 'transactions');
  const savedActionLayout = getStorage('ledgerly-action-layout', 'p1');
  setActionLayout(savedActionLayout === 'existing' ? 'p1' : (savedActionLayout || 'p1'));
}

export function initSettingsListeners(): void {
  const displayToggle = $('display-toggle');
  const displayMenu = $('display-settings');

  if (displayToggle && displayMenu) {
    displayToggle.onclick = (e) => {
      e.stopPropagation();
      const opening = displayMenu.classList.contains('hidden');
      closeAllPopovers();
      if (opening) {
        displayMenu.classList.remove('hidden');
        displayToggle.setAttribute('aria-expanded', 'true');
      }
    };

    displayMenu.onclick = (e) => {
      e.stopPropagation();
    };
  }

  const fontDec = $('font-dec');
  if (fontDec) fontDec.onclick = () => adjustFontScale(-0.1);
  const fontInc = $('font-inc');
  if (fontInc) fontInc.onclick = () => adjustFontScale(+0.1);
  const fontReset = $('font-reset');
  if (fontReset) fontReset.onclick = () => setFontScale(DEFAULT_SCALE);

  if (typeof document !== 'undefined') {
    document.querySelectorAll<HTMLElement>('button[data-theme]').forEach(button => {
      button.onclick = () => {
        if (button.dataset.theme) setTheme(button.dataset.theme);
      };
    });
    document.querySelectorAll<HTMLElement>('#display-layout-options [data-view-mode], #sheet-layout-options [data-view-mode]').forEach(btn => {
      btn.onclick = () => {
        if (btn.dataset.viewMode) setLayoutView(btn.dataset.viewMode);
      };
    });
    document.querySelectorAll<HTMLElement>('#option-c-subtabs [data-c-tab]').forEach(btn => {
      btn.onclick = () => {
        if (btn.dataset.cTab) setOptionCTab(btn.dataset.cTab);
      };
    });
    document.querySelectorAll<HTMLElement>('[data-action-mode]').forEach(btn => {
      btn.onclick = () => {
        if (btn.dataset.actionMode) setActionLayout(btn.dataset.actionMode);
      };
    });
  }

  const hamburgerBtn = $('mobile-hamburger-btn');
  if (hamburgerBtn) {
    hamburgerBtn.onclick = (e) => {
      e.stopPropagation();
      openBottomSheet();
    };
  }

  const sheetClose = $('sheet-close-btn');
  if (sheetClose) sheetClose.onclick = () => closeBottomSheet();
  const sheetBackdrop = $('bottom-sheet-backdrop');
  if (sheetBackdrop) {
    sheetBackdrop.onclick = (e) => {
      if (e.target === sheetBackdrop) closeBottomSheet();
    };
  }

  const sheetImportTrigger = $('sheet-import-trigger');
  if (sheetImportTrigger) {
    sheetImportTrigger.onclick = () => {
      closeBottomSheet();
      const fileInput = $('file-input');
      if (fileInput) fileInput.click();
    };
  }

  const sheetExpFiltered = $('sheet-export-filtered');
  if (sheetExpFiltered) {
    sheetExpFiltered.onclick = () => {
      closeBottomSheet();
      downloadCsv(false);
    };
  }
  const sheetExpAll = $('sheet-export-all');
  if (sheetExpAll) {
    sheetExpAll.onclick = () => {
      closeBottomSheet();
      downloadCsv(true);
    };
  }

  const sheetFontDec = $('sheet-font-dec');
  if (sheetFontDec) sheetFontDec.onclick = () => adjustFontScale(-0.1);
  const sheetFontInc = $('sheet-font-inc');
  if (sheetFontInc) sheetFontInc.onclick = () => adjustFontScale(+0.1);
}
