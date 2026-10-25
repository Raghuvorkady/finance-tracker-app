/**
 * Theme, Font Scaling, and Dashboard Layout Mode Settings
 */

import { $, getStorage, setStorage } from './utils.js';
import { state, DEFAULT_SCALE } from './state.js';

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

export function initSettings() {
  const savedTheme = getStorage('ledgerly-theme', 'ledgerly');
  setTheme(savedTheme);
  const savedScale = getStorage('ledgerly-font-scale', DEFAULT_SCALE);
  setFontScale(savedScale);
  const savedLayout = getStorage('ledgerly-layout-view', 'a');
  setLayoutView(savedLayout);
  const savedTab = getStorage('ledgerly-active-c-tab', 'transactions');
  setOptionCTab(savedTab);
}

export function initSettingsListeners() {
  const displayToggle = $('display-toggle');
  const displayMenu = $('display-settings');
  const displayWrap = $('display-dropdown-wrap');

  if (displayToggle && displayMenu) {
    let hoverTimeout = null;

    const showMenu = () => {
      if (hoverTimeout) {
        clearTimeout(hoverTimeout);
        hoverTimeout = null;
      }
      document.querySelectorAll('.notion-popover, .export-menu').forEach(p => p.classList.add('hidden'));
      displayMenu.classList.add('open');
      displayToggle.setAttribute('aria-expanded', 'true');
    };

    const hideMenuWithDelay = () => {
      if (hoverTimeout) clearTimeout(hoverTimeout);
      hoverTimeout = setTimeout(() => {
        displayMenu.classList.remove('open');
        displayToggle.setAttribute('aria-expanded', 'false');
      }, 300);
    };

    if (displayWrap) {
      displayWrap.addEventListener('mouseenter', showMenu);
      displayWrap.addEventListener('mouseleave', hideMenuWithDelay);
    }

    displayToggle.onclick = (e) => {
      e.stopPropagation();
      if (hoverTimeout) {
        clearTimeout(hoverTimeout);
        hoverTimeout = null;
      }
      const opening = !displayMenu.classList.contains('open');
      document.querySelectorAll('.notion-popover, .export-menu').forEach(p => p.classList.add('hidden'));
      displayMenu.classList.toggle('open', opening);
      displayToggle.setAttribute('aria-expanded', String(opening));
    };

    displayMenu.onclick = (e) => {
      e.stopPropagation();
    };

    document.addEventListener('click', (e) => {
      if (!displayMenu.contains(e.target) && e.target !== displayToggle && !displayToggle.contains(e.target)) {
        if (hoverTimeout) clearTimeout(hoverTimeout);
        displayMenu.classList.remove('open');
        displayToggle.setAttribute('aria-expanded', 'false');
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (hoverTimeout) clearTimeout(hoverTimeout);
        displayMenu.classList.remove('open');
        displayToggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  if ($('font-dec')) $('font-dec').onclick = () => adjustFontScale(-0.1);
  if ($('font-inc')) $('font-inc').onclick = () => adjustFontScale(+0.1);
  if ($('font-reset')) $('font-reset').onclick = () => setFontScale(DEFAULT_SCALE);
  document.querySelectorAll('#theme-options [data-theme]').forEach(button => {
    button.onclick = () => setTheme(button.dataset.theme);
  });
  document.querySelectorAll('#display-layout-options [data-view-mode]').forEach(btn => {
    btn.onclick = () => setLayoutView(btn.dataset.viewMode);
  });
  document.querySelectorAll('#option-c-subtabs [data-c-tab]').forEach(btn => {
    btn.onclick = () => setOptionCTab(btn.dataset.cTab);
  });
}
