/**
 * Donut Charts (Category Breakdown & Cashflow Macro Split)
 */

import { $, money, escapeHtml } from './utils.js';
import { state, PALETTE } from './state.js';
import { splitCategoryEmoji } from './categories.js';
import { setTypeFilter, selectCategory } from './filters.js';

export function renderMacroDonut(expenses, income, transfers, net) {
  const donut = $('donut');
  if (!donut) return;

  const totalVolume = expenses + income + transfers;
  const netSign = net > 0 ? '+' : (net < 0 ? '−' : '');
  const netCaption = net > 0 ? 'Net saved' : (net < 0 ? 'Net deficit' : 'Net flow');
  const netColorClass = net > 0 ? 'amount-income' : (net < 0 ? 'amount-expense' : 'amount-neutral');
  const defaultTotalFormatted = `${netSign}${money(Math.abs(net), true)}`;

  if (totalVolume <= 0) {
    donut.innerHTML = `<div class="donut-center"><strong id="donut-total" class="amount-neutral">₹0</strong><span id="donut-caption">No activity</span></div>`;
    const legendEl = $('legend');
    if (legendEl) legendEl.innerHTML = `<span class="empty-table">No transactions for this period.</span>`;
    return;
  }

  const streams = [];
  if (income > 0) {
    streams.push({
      name: 'Income',
      typeKey: 'income',
      value: income,
      color: '#0f7b6c',
      dotClass: 'dot-income',
      emoji: '💰'
    });
  }
  if (expenses > 0) {
    streams.push({
      name: 'Expenses',
      typeKey: 'expense',
      value: expenses,
      color: '#eb5757',
      dotClass: 'dot-expense',
      emoji: '💸'
    });
  }
  if (transfers > 0) {
    streams.push({
      name: 'Transfers',
      typeKey: 'transfer',
      value: transfers,
      color: '#787774',
      dotClass: 'dot-transfer',
      emoji: '🔄'
    });
  }

  let position = 0;
  const slices = streams.map((item, i) => {
    const percent = (item.value / totalVolume) * 100;
    const slice = { ...item, percent, start: position, index: i };
    position += percent;
    return slice;
  });

  donut.innerHTML = `<svg class="donut-svg" viewBox="0 0 100 100" aria-label="Cashflow Overview"><circle class="donut-ring" cx="50" cy="50" r="42" pathLength="100"></circle>${slices.map((item) => `<circle class="donut-slice" data-index="${item.index}" data-type-key="${item.typeKey}" cx="50" cy="50" r="42" pathLength="100" stroke="${item.color}" stroke-dasharray="${item.percent} ${100 - item.percent}" stroke-dashoffset="${-item.start}"></circle>`).join('')}</svg><div class="donut-center"><strong id="donut-total" class="${netColorClass}">${defaultTotalFormatted}</strong><span id="donut-caption">${netCaption}</span></div>`;

  const legendEl = $('legend');
  if (legendEl) {
    legendEl.innerHTML = slices.map((item) => {
      return `<button class="legend-item macro-legend-item" data-index="${item.index}" data-type-key="${item.typeKey}" title="Drill into ${escapeHtml(item.name)} breakdown">
        <div class="legend-item-left">
          <i class="legend-dot ${item.dotClass}" style="background:${item.color}"></i>
          <span class="legend-emoji">${item.emoji}</span>
          <span class="legend-label">${escapeHtml(item.name)}</span>
          <span class="macro-drilldown-hint">→</span>
        </div>
        <div class="legend-item-right">
          <span class="legend-pct">${Math.round(item.percent)}%</span>
          <span class="legend-sep">·</span>
          <span class="legend-amt">${money(item.value, true)}</span>
        </div>
      </button>`;
    }).join('');
  }

  const hover = (item) => {
    donut.classList.add('has-hover');
    donut.querySelectorAll('.donut-slice').forEach(slice => slice.classList.toggle('hovered', Number(slice.dataset.index) === item.index));
    const totalEl = $('donut-total');
    if (totalEl) {
      totalEl.textContent = money(item.value, true);
      totalEl.className = item.typeKey === 'income' ? 'amount-income' : (item.typeKey === 'expense' ? 'amount-expense' : 'amount-neutral');
    }
    const capEl = $('donut-caption');
    if (capEl) capEl.innerHTML = `${item.emoji} ${item.name} · ${Math.round(item.percent)}%`;
  };

  const clearHover = () => {
    donut.classList.remove('has-hover');
    donut.querySelectorAll('.donut-slice').forEach(slice => slice.classList.remove('hovered'));
    const totalEl = $('donut-total');
    if (totalEl) {
      totalEl.textContent = defaultTotalFormatted;
      totalEl.className = netColorClass;
    }
    const capEl = $('donut-caption');
    if (capEl) capEl.textContent = netCaption;
  };

  donut.querySelectorAll('.donut-slice').forEach(slice => {
    const item = slices[Number(slice.dataset.index)];
    slice.onmouseenter = () => hover(item);
    slice.onmouseleave = clearHover;
    slice.onclick = () => setTypeFilter(item.typeKey);
  });

  if (legendEl) {
    legendEl.querySelectorAll('.legend-item').forEach(button => {
      const item = slices[Number(button.dataset.index)];
      button.onmouseenter = () => hover(item);
      button.onmouseleave = clearHover;
      button.onfocus = () => hover(item);
      button.onblur = clearHover;
      button.onclick = () => setTypeFilter(item.typeKey);
    });
  }
}

export function renderDonut(totals, expenses, analysisType = 'expense') {
  const visible = totals.slice(0, 7);
  const other = totals.slice(7).reduce((s, [, v]) => s + v, 0);
  if (other) visible.push(['Other', other]);

  const donut = $('donut');
  if (!donut) return;

  const caption = analysisType === 'transfer' ? 'moved' : analysisType === 'income' ? 'received' : 'spent';
  const totalEl = $('donut-total');
  if (totalEl) {
    totalEl.className = '';
    totalEl.textContent = money(expenses, true);
  }
  const capEl = $('donut-caption');
  if (capEl) capEl.textContent = caption;

  const legendEl = $('legend');
  if (!visible.length) {
    donut.innerHTML = `<div class="donut-center"><strong id="donut-total">₹0</strong><span id="donut-caption">${caption}</span></div>`;
    if (legendEl) legendEl.innerHTML = `<span class="empty-table">No ${analysisType === 'transfer' ? 'transfers' : analysisType === 'income' ? 'income' : 'expenses'} for these filters.</span>`;
    return;
  }

  let position = 0;
  const slices = visible.map(([name, value], i) => {
    const percent = expenses > 0 ? (value / expenses) * 100 : 0;
    const item = { name, value, percent, start: position, color: PALETTE[i % PALETTE.length], index: i };
    position += percent;
    return item;
  });

  donut.innerHTML = `<svg class="donut-svg" viewBox="0 0 100 100" aria-label="${analysisType === 'transfer' ? 'Transfer channels' : analysisType === 'income' ? 'Income categories' : 'Spending categories'}"><circle class="donut-ring" cx="50" cy="50" r="42" pathLength="100"></circle>${slices.map((item) => `<circle class="donut-slice" data-index="${item.index}" cx="50" cy="50" r="42" pathLength="100" stroke="${item.color}" stroke-dasharray="${item.percent} ${100 - item.percent}" stroke-dashoffset="${-item.start}"></circle>`).join('')}</svg><div class="donut-center"><strong id="donut-total">${money(expenses, true)}</strong><span id="donut-caption">${caption}</span></div>`;

  if (legendEl) {
    legendEl.innerHTML = slices.map((item) => {
      const { emoji, text } = splitCategoryEmoji(item.name);
      return `<button class="legend-item ${state.category === item.name ? 'focused' : ''}" data-index="${item.index}" ${item.name === 'Other' ? 'disabled' : ''} title="${escapeHtml(item.name)}">
        <div class="legend-item-left">
          <i class="legend-dot" style="background:${item.color}"></i>
          <span class="legend-emoji">${emoji}</span>
          <span class="legend-label">${escapeHtml(text)}</span>
        </div>
        <div class="legend-item-right">
          <span class="legend-pct">${Math.round(item.percent)}%</span>
          <span class="legend-sep">·</span>
          <span class="legend-amt">${money(item.value, true)}</span>
        </div>
      </button>`;
    }).join('');
  }

  const hover = (item) => {
    donut.classList.add('has-hover');
    donut.querySelectorAll('.donut-slice').forEach(slice => slice.classList.toggle('hovered', Number(slice.dataset.index) === item.index));
    const { emoji, text } = splitCategoryEmoji(item.name);
    const t = $('donut-total');
    if (t) {
      t.className = '';
      t.textContent = money(item.value, true);
    }
    const c = $('donut-caption');
    if (c) c.innerHTML = `${emoji} ${escapeHtml(text)} · ${Math.round(item.percent)}%`;
  };

  const clearHover = () => {
    donut.classList.remove('has-hover');
    donut.querySelectorAll('.donut-slice').forEach(slice => slice.classList.remove('hovered'));
    const t = $('donut-total');
    if (t) {
      t.className = '';
      t.textContent = money(expenses, true);
    }
    const c = $('donut-caption');
    if (c) c.textContent = caption;
  };

  donut.querySelectorAll('.donut-slice').forEach(slice => {
    const item = slices[Number(slice.dataset.index)];
    slice.onmouseenter = () => hover(item);
    slice.onmouseleave = clearHover;
    slice.onclick = () => selectCategory(item.name);
  });

  if (legendEl) {
    legendEl.querySelectorAll('.legend-item').forEach(button => {
      const item = slices[Number(button.dataset.index)];
      button.onmouseenter = () => hover(item);
      button.onmouseleave = clearHover;
      button.onfocus = () => hover(item);
      button.onblur = clearHover;
      button.onclick = () => selectCategory(item.name);
    });
  }
}
