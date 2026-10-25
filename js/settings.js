/**
 * Theme, Font Scaling, and Dashboard Layout Mode Settings
 */

import { $, getStorage, setStorage } from './utils.js';
import { state, DEFAULT_SCALE } from './state.js';
import { closeAllPopovers } from './filters.js';
import { downloadCsv } from './export.js';

let onSettingsChange = () => {};
export function registerSettingsCallback(fn) {
  onSettingsChange = fn;
}

export function setFontScale(scale) {
  const num = Math.min(1.5, Math.max(0.8, Math.round(parseFloat(scale) * 100) / 100));
  document.documentElement.style.setProperty('--font-scale', String(num));
  setStorage('ledgerly-font-scale', String(num));

  const pct = `${Math.round(num * 100)}%`;
  const readout = $('font-scale-readout');
  if (readout) readout.textContent = pct;
  const pill = $('font-scale-pill');
  if (pill) pill.textContent = pct;
  const sheetPill = $('sheet-font-scale');
  if (sheetPill) sheetPill.textContent = pct;
}

export function adjustFontScale(delta) {
  const current = parseFloat(getStorage('ledgerly-font-scale', DEFAULT_SCALE));
  setFontScale(current + delta);
}

export function setLayoutView(mode) {
  const valid = ['a', 'b', 'c'].includes(mode) ? mode : 'a';
  state.layoutView = valid;
  document.documentElement.setAttribute('data-layout-view', valid);
  setStorage('ledgerly-layout-view', valid);
  document.querySelectorAll('#display-layout-options [data-view-mode]').forEach(btn => {
    btn.classList.toggle('selected', btn.dataset.viewMode === valid);
  });
  if (valid === 'c') {
    setOptionCTab(state.activeTab || 'transactions');
  }
}

export function setOptionCTab(tabName) {
  const valid = ['transactions', 'breakdown'].includes(tabName) ? tabName : 'transactions';
  state.activeTab = valid;
  document.documentElement.setAttribute('data-active-tab', valid);
  setStorage('ledgerly-active-c-tab', valid);
  document.querySelectorAll('#option-c-subtabs [data-c-tab]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.cTab === valid);
  });
}

export function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  setStorage('ledgerly-theme', theme);
  document.querySelectorAll('[data-theme]').forEach(btn => {
    if (btn.tagName === 'BUTTON') btn.classList.toggle('selected', btn.dataset.theme === theme);
  });
  onSettingsChange();
}

export function setActionLayout(mode) {
  const valid = ['p1', 'existing', 'p2', 'p3'].includes(mode) ? mode : 'p1';
  document.documentElement.setAttribute('data-action-layout', valid);
  setStorage('ledgerly-action-layout', valid);
  document.querySelectorAll('[data-action-mode]').forEach(btn => {
    btn.classList.toggle('selected', btn.dataset.actionMode === valid);
  });
  onSettingsChange();
}

export function openBottomSheet() {
  closeAllPopovers();
  const sheet = $('bottom-sheet-backdrop');
  if (sheet) sheet.classList.remove('hidden');
}

export function closeBottomSheet() {
  const sheet = $('bottom-sheet-backdrop');
  if (sheet) sheet.classList.add('hidden');
}

export function initSettings() {
  const savedTheme = getStorage('ledgerly-theme', 'ledgerly');
  setTheme(savedTheme === 'mobile' ? 'ledgerly' : savedTheme);
  const savedScale = getStorage('ledgerly-font-scale', DEFAULT_SCALE);
  setFontScale(savedScale);
  const savedLayout = getStorage('ledgerly-layout-view', 'a');
  setLayoutView(savedLayout);
  const savedTab = getStorage('ledgerly-active-c-tab', 'transactions');
  setOptionCTab(savedTab);
  const savedActionLayout = getStorage('ledgerly-action-layout', 'p1');
  setActionLayout(savedActionLayout === 'existing' ? 'p1' : savedActionLayout);
}

export function initSettingsListeners() {
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

  if ($('font-dec')) $('font-dec').onclick = () => adjustFontScale(-0.1);
  if ($('font-inc')) $('font-inc').onclick = () => adjustFontScale(+0.1);
  if ($('font-reset')) $('font-reset').onclick = () => setFontScale(DEFAULT_SCALE);
  document.querySelectorAll('[data-theme]').forEach(button => {
    button.onclick = () => setTheme(button.dataset.theme);
  });
  document.querySelectorAll('#display-layout-options [data-view-mode], #sheet-layout-options [data-view-mode]').forEach(btn => {
    btn.onclick = () => setLayoutView(btn.dataset.viewMode);
  });
  document.querySelectorAll('#option-c-subtabs [data-c-tab]').forEach(btn => {
    btn.onclick = () => setOptionCTab(btn.dataset.cTab);
  });
  document.querySelectorAll('[data-action-mode]').forEach(btn => {
    btn.onclick = () => setActionLayout(btn.dataset.actionMode);
  });

  // Mobile Hamburger button (Proposal 1)
  const hamburgerBtn = $('mobile-hamburger-btn');
  if (hamburgerBtn) {
    hamburgerBtn.onclick = (e) => {
      e.stopPropagation();
      openBottomSheet();
    };
  }

  // Bottom Sheet backdrop & close button
  const sheetClose = $('sheet-close-btn');
  if (sheetClose) sheetClose.onclick = () => closeBottomSheet();
  const sheetBackdrop = $('bottom-sheet-backdrop');
  if (sheetBackdrop) {
    sheetBackdrop.onclick = (e) => {
      if (e.target === sheetBackdrop) closeBottomSheet();
    };
  }

  // Sheet file import trigger
  const sheetImportTrigger = $('sheet-import-trigger');
  if (sheetImportTrigger) {
    sheetImportTrigger.onclick = () => {
      closeBottomSheet();
      const fileInput = $('file-input');
      if (fileInput) fileInput.click();
    };
  }

  // Sheet export buttons
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

  // Sheet font stepper
  if ($('sheet-font-dec')) $('sheet-font-dec').onclick = () => adjustFontScale(-0.1);
  if ($('sheet-font-inc')) $('sheet-font-inc').onclick = () => adjustFontScale(+0.1);
}
