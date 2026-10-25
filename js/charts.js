/**
 * Donut Charts (Category Breakdown & Cashflow Macro Split)
 */

import { $, money, escapeHtml } from './utils.js';
import { state, PALETTE, EXPENSE_PALETTE, INCOME_PALETTE, TRANSFER_PALETTE, MACRO_COLORS, setChartView } from './state.js';
import { splitCategoryEmoji } from './categories.js';
import { setTypeFilter, selectCategory } from './filters.js';

export function renderMacroDonut(expenses, income, transfers, net) {
  const donut = $('donut');
  if (!donut) return;

  const totalVolume = expenses + income + transfers;
  const netCaption = net > 0 ? 'Net saved' : (net < 0 ? 'Net deficit' : 'Net flow');
  const netColorClass = net > 0 ? 'amount-income' : (net < 0 ? 'amount-expense' : 'amount-neutral');
  const defaultTotalFormatted = money(Math.abs(net), true);

  if (totalVolume <= 0) {
    donut.innerHTML = `<div class="donut-center"><strong id="donut-total" class="amount-neutral">${money(0)}</strong><span id="donut-caption">No activity</span></div>`;
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
      color: MACRO_COLORS.income,
      dotClass: 'dot-income',
      emoji: '💰'
    });
  }
  if (expenses > 0) {
    streams.push({
      name: 'Expenses',
      typeKey: 'expense',
      value: expenses,
      color: MACRO_COLORS.expense,
      dotClass: 'dot-expense',
      emoji: '💸'
    });
  }
  if (transfers > 0) {
    streams.push({
      name: 'Transfers',
      typeKey: 'transfer',
      value: transfers,
      color: MACRO_COLORS.transfer,
      dotClass: 'dot-transfer',
      emoji: '🔄'
    });
  }

  // Sort streams in descending order (largest amount first)
  streams.sort((a, b) => b.value - a.value);

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
      totalEl.className = item.typeKey === 'income' ? 'amount-income' : (item.typeKey === 'expense' ? 'amount-expense' : 'amount-transfer');
    }
    const capEl = $('donut-caption');
    if (capEl) capEl.innerHTML = `<span class="donut-cat-name">${item.emoji} ${escapeHtml(item.name)}</span><span class="donut-cat-pct">${Math.round(item.percent)}%</span>`;
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

export function getSliceColor(index, analysisType = 'expense', isOther = false) {
  if (isOther) return '#94a3b8';
  const palette = analysisType === 'income' ? INCOME_PALETTE : (analysisType === 'transfer' ? TRANSFER_PALETTE : EXPENSE_PALETTE);
  if (index < palette.length) {
    return palette[index];
  }
  // Fallback for unbounded categories: golden angle (~137.508°) generates non-repeating vibrant hues
  const hue = Math.round((210 + (index - palette.length) * 137.508) % 360);
  return `hsl(${hue}, 75%, 52%)`;
}

export function renderDonut(totals, expenses, analysisType = 'expense') {
  const visible = totals.slice(0, 7);
  const other = totals.slice(7).reduce((s, [, v]) => s + v, 0);
  if (other) visible.push(['Other', other]);

  const donut = $('donut');
  if (!donut) return;

  const caption = analysisType === 'transfer' ? 'moved' : analysisType === 'income' ? 'received' : 'spent';
  const typeColorClass = analysisType === 'income' ? 'amount-income' : (analysisType === 'transfer' ? 'amount-transfer' : 'amount-expense');
  const totalEl = $('donut-total');
  if (totalEl) {
    totalEl.className = typeColorClass;
    totalEl.textContent = money(expenses, true);
  }
  const capEl = $('donut-caption');
  if (capEl) capEl.textContent = caption;

  const legendEl = $('legend');
  if (!visible.length) {
    donut.innerHTML = `<div class="donut-center"><strong id="donut-total" class="${typeColorClass}">${money(0)}</strong><span id="donut-caption">${caption}</span></div>`;
    if (legendEl) legendEl.innerHTML = `<span class="empty-table">No ${analysisType === 'transfer' ? 'transfers' : analysisType === 'income' ? 'income' : 'expenses'} for these filters.</span>`;
    return;
  }

  let position = 0;
  const slices = visible.map(([name, value], i) => {
    const percent = expenses > 0 ? (value / expenses) * 100 : 0;
    const isOther = name.toLowerCase() === 'other';
    const color = getSliceColor(i, analysisType, isOther);
    const item = { name, value, percent, start: position, color, index: i };
    position += percent;
    return item;
  });

  donut.innerHTML = `<svg class="donut-svg" viewBox="0 0 100 100" aria-label="${analysisType === 'transfer' ? 'Transfer channels' : analysisType === 'income' ? 'Income categories' : 'Spending categories'}"><circle class="donut-ring" cx="50" cy="50" r="42" pathLength="100"></circle>${slices.map((item) => `<circle class="donut-slice" data-index="${item.index}" cx="50" cy="50" r="42" pathLength="100" stroke="${item.color}" stroke-dasharray="${item.percent} ${100 - item.percent}" stroke-dashoffset="${-item.start}"></circle>`).join('')}</svg><div class="donut-center"><strong id="donut-total" class="${typeColorClass}">${money(expenses, true)}</strong><span id="donut-caption">${caption}</span></div>`;

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
      t.className = typeColorClass;
      t.textContent = money(item.value, true);
    }
    const c = $('donut-caption');
    if (c) c.innerHTML = `<span class="donut-cat-name">${emoji} ${escapeHtml(text)}</span><span class="donut-cat-pct">${Math.round(item.percent)}%</span>`;
  };

  const clearHover = () => {
    donut.classList.remove('has-hover');
    donut.querySelectorAll('.donut-slice').forEach(slice => slice.classList.remove('hovered'));
    const t = $('donut-total');
    if (t) {
      t.className = typeColorClass;
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

// ── Time-Series Aggregation & SVG Line Chart Engine ──

export function aggregateTimeSeries(rows = [], range = null, period = 'monthly') {
  if (!range) {
    const now = new Date();
    range = {
      start: new Date(now.getFullYear(), now.getMonth(), 1),
      end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
      label: 'Current'
    };
  }

  const startDate = new Date(range.start);
  const endDate = new Date(range.end);
  if (startDate > endDate) {
    const temp = new Date(startDate);
    startDate.setTime(endDate.getTime());
    endDate.setTime(temp.getTime());
  }

  const buckets = [];

  if (period === 'weekly') {
    for (let i = 0; i < 7; i++) {
      const bStart = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + i, 0, 0, 0, 0);
      const bEnd = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + i, 23, 59, 59, 999);
      const label = bStart.toLocaleDateString('en-IN', { weekday: 'short' });
      const dateLabel = bStart.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
      buckets.push({ index: i, label, dateLabel, start: bStart, end: bEnd, expense: 0, income: 0, transfer: 0, count: 0, categories: {} });
    }
  } else if (period === 'monthly') {
    const numDays = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0).getDate();
    for (let day = 1; day <= numDays; day++) {
      const bStart = new Date(startDate.getFullYear(), startDate.getMonth(), day, 0, 0, 0, 0);
      const bEnd = new Date(startDate.getFullYear(), startDate.getMonth(), day, 23, 59, 59, 999);
      const label = String(day);
      const dateLabel = bStart.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      buckets.push({ index: day - 1, label, dateLabel, start: bStart, end: bEnd, expense: 0, income: 0, transfer: 0, count: 0, categories: {} });
    }
  } else if (period === 'quarterly') {
    let cur = new Date(startDate);
    cur.setHours(0, 0, 0, 0);
    let idx = 0;
    while (cur <= endDate) {
      const bStart = new Date(cur);
      const bEnd = new Date(cur.getTime() + 7 * 86400000 - 1);
      if (bEnd > endDate) bEnd.setTime(endDate.getTime());
      const label = bStart.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      const dateLabel = `Week of ${label}`;
      buckets.push({ index: idx++, label, dateLabel, start: bStart, end: bEnd, expense: 0, income: 0, transfer: 0, count: 0, categories: {} });
      cur = new Date(cur.getTime() + 7 * 86400000);
    }
  } else if (period === 'yearly') {
    for (let m = 0; m < 12; m++) {
      const bStart = new Date(startDate.getFullYear(), m, 1, 0, 0, 0, 0);
      const bEnd = new Date(startDate.getFullYear(), m + 1, 0, 23, 59, 59, 999);
      const label = bStart.toLocaleDateString('en-IN', { month: 'short' });
      const dateLabel = bStart.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
      buckets.push({ index: m, label, dateLabel, start: bStart, end: bEnd, expense: 0, income: 0, transfer: 0, count: 0, categories: {} });
    }
  } else if (period === 'financial') {
    const fyYear = startDate.getFullYear();
    for (let offset = 0; offset < 12; offset++) {
      const m = (3 + offset) % 12;
      const yr = offset < 9 ? fyYear : fyYear + 1;
      const bStart = new Date(yr, m, 1, 0, 0, 0, 0);
      const bEnd = new Date(yr, m + 1, 0, 23, 59, 59, 999);
      const label = bStart.toLocaleDateString('en-IN', { month: 'short' });
      const dateLabel = bStart.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
      buckets.push({ index: offset, label, dateLabel, start: bStart, end: bEnd, expense: 0, income: 0, transfer: 0, count: 0, categories: {} });
    }
  } else {
    // Custom or All time
    const totalDays = Math.max(1, Math.round((+endDate - +startDate) / 86400000));
    if (totalDays <= 31) {
      for (let i = 0; i < totalDays; i++) {
        const bStart = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + i, 0, 0, 0, 0);
        const bEnd = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + i, 23, 59, 59, 999);
        const label = bStart.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
        const dateLabel = bStart.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
        buckets.push({ index: i, label, dateLabel, start: bStart, end: bEnd, expense: 0, income: 0, transfer: 0, count: 0, categories: {} });
      }
    } else if (totalDays <= 180) {
      let cur = new Date(startDate);
      cur.setHours(0, 0, 0, 0);
      let idx = 0;
      while (cur <= endDate) {
        const bStart = new Date(cur);
        const bEnd = new Date(cur.getTime() + 7 * 86400000 - 1);
        if (bEnd > endDate) bEnd.setTime(endDate.getTime());
        const label = bStart.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
        const dateLabel = `Week of ${label}`;
        buckets.push({ index: idx++, label, dateLabel, start: bStart, end: bEnd, expense: 0, income: 0, transfer: 0, count: 0, categories: {} });
        cur = new Date(cur.getTime() + 7 * 86400000);
      }
    } else {
      let cur = new Date(startDate.getFullYear(), startDate.getMonth(), 1, 0, 0, 0, 0);
      let idx = 0;
      while (cur <= endDate) {
        const bStart = new Date(cur);
        const bEnd = new Date(cur.getFullYear(), cur.getMonth() + 1, 0, 23, 59, 59, 999);
        const label = bStart.toLocaleDateString('en-IN', { month: 'short' });
        const dateLabel = bStart.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
        buckets.push({ index: idx++, label, dateLabel, start: bStart, end: bEnd, expense: 0, income: 0, transfer: 0, count: 0, categories: {} });
        cur.setMonth(cur.getMonth() + 1);
      }
    }
  }

  if (!buckets.length) {
    buckets.push({
      index: 0,
      label: range.label || 'All',
      dateLabel: range.label || 'All',
      start: startDate,
      end: endDate,
      expense: 0,
      income: 0,
      transfer: 0,
      count: 0,
      categories: {}
    });
  }

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const rTime = +r.date;
    for (let j = 0; j < buckets.length; j++) {
      const b = buckets[j];
      if (rTime >= +b.start && rTime <= +b.end) {
        if (r.type === 'expense') b.expense += r.amount;
        else if (r.type === 'income') b.income += r.amount;
        else if (r.type === 'transfer') b.transfer += r.amount;
        b.count++;
        b.categories[r.category] = (b.categories[r.category] || 0) + r.amount;
        break;
      }
    }
  }

  for (let i = 0; i < buckets.length; i++) {
    const b = buckets[i];
    b.net = b.income - b.expense;
    let topCat = null;
    let topAmt = 0;
    for (const [cat, amt] of Object.entries(b.categories)) {
      if (amt > topAmt) {
        topCat = cat;
        topAmt = amt;
      }
    }
    b.topCategory = topCat;
    b.topCategoryAmount = topAmt;
  }

  return buckets;
}

function getNiceMax(val) {
  if (val <= 0) return 1000;
  if (val <= 50) return 50;
  if (val <= 100) return 100;
  const exp = Math.floor(Math.log10(val));
  const base = Math.pow(10, exp);
  const frac = val / base;
  let mult = 10;
  if (frac <= 1.0) mult = 1.0;
  else if (frac <= 1.5) mult = 1.5;
  else if (frac <= 2.0) mult = 2.0;
  else if (frac <= 2.5) mult = 2.5;
  else if (frac <= 5.0) mult = 5.0;
  else mult = 10;
  return mult * base;
}

function getSplinePath(points) {
  if (!points || !points.length) return '';
  if (points.length === 1) return `M ${points[0].x.toFixed(1)},${points[0].y.toFixed(1)} h 2`;
  let d = `M ${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    const cp1x = p1.x + (p2.x - p0.x) * 0.16;
    const cp1y = p1.y + (p2.y - p0.y) * 0.16;
    const cp2x = p2.x - (p3.x - p1.x) * 0.16;
    const cp2y = p3 ? p2.y - (p3.y - p1.y) * 0.16 : p2.y;
    d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return d;
}

export function renderLineChart(rows, range, activeType = 'all') {
  const container = $('trend-chart');
  if (!container) return;

  const buckets = aggregateTimeSeries(rows, range, state.period);
  const totalExpenses = buckets.reduce((s, b) => s + b.expense, 0);
  const totalIncome = buckets.reduce((s, b) => s + b.income, 0);
  const totalTransfer = buckets.reduce((s, b) => s + b.transfer, 0);
  const activeDays = buckets.filter(b => b.count > 0).length;
  const peakExpenseBucket = buckets.reduce((max, b) => b.expense > (max ? max.expense : -1) ? b : max, null);
  const avgExpense = buckets.length > 0 ? totalExpenses / buckets.length : 0;

  // Render Summary Strip
  const strip = $('trend-summary-strip');
  if (strip) {
    const isIncome = activeType === 'income';
    const isTransfer = activeType === 'transfer';
    const primaryLabel = isTransfer ? 'Transfers' : (isIncome ? 'Income' : 'Daily Avg');
    const primaryValue = isTransfer ? money(totalTransfer, true) : (isIncome ? money(totalIncome, true) : money(avgExpense, true));
    const peakTitle = isIncome ? 'Peak Inflow' : 'Peak Outflow';
    const peakVal = isIncome
      ? buckets.reduce((m, b) => b.income > (m ? m.income : -1) ? b : m, null)
      : peakExpenseBucket;
    const peakAmt = peakVal ? (isIncome ? peakVal.income : peakVal.expense) : 0;

    strip.innerHTML = `
      <div class="trend-stat-chip">
        <span class="trend-stat-label">${primaryLabel}</span>
        <strong class="trend-stat-value">${primaryValue}</strong>
      </div>
      <div class="trend-stat-chip">
        <span class="trend-stat-label">${peakTitle}</span>
        <strong class="trend-stat-value ${isIncome ? 'amount-income' : 'amount-expense'}">${peakAmt > 0 ? money(peakAmt, true) : '₹ 0'}</strong>
        <span class="trend-stat-sub">${peakAmt > 0 && peakVal ? escapeHtml(peakVal.label) : '—'}</span>
      </div>
      <div class="trend-stat-chip">
        <span class="trend-stat-label">Active Points</span>
        <strong class="trend-stat-value">${activeDays} / ${buckets.length}</strong>
      </div>
    `;
  }

  // Dimensions & Scales
  const width = 640;
  const height = 220;
  const pad = { top: 24, right: 28, bottom: 36, left: 56 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const baselineY = pad.top + plotH;

  const maxVal = Math.max(...buckets.map(b => {
    if (activeType === 'expense') return b.expense;
    if (activeType === 'income') return b.income;
    if (activeType === 'transfer') return b.transfer;
    return Math.max(b.expense, b.income);
  }), 0);

  const niceMax = getNiceMax(maxVal);

  for (let i = 0; i < buckets.length; i++) {
    const b = buckets[i];
    b.x = pad.left + (buckets.length > 1 ? (i / (buckets.length - 1)) * plotW : plotW / 2);
    b.yExpense = maxVal > 0 ? baselineY - (b.expense / niceMax) * plotH : baselineY;
    b.yIncome = maxVal > 0 ? baselineY - (b.income / niceMax) * plotH : baselineY;
    b.yTransfer = maxVal > 0 ? baselineY - (b.transfer / niceMax) * plotH : baselineY;
  }

  const yTicks = [0, niceMax / 2, niceMax];
  const gridHtml = yTicks.map(t => {
    const y = baselineY - (t / niceMax) * plotH;
    return `
      <line x1="${pad.left}" y1="${y.toFixed(1)}" x2="${(width - pad.right).toFixed(1)}" y2="${y.toFixed(1)}" class="trend-grid-line"></line>
      <text x="${(pad.left - 10).toFixed(1)}" y="${(y + 3.5).toFixed(1)}" text-anchor="end" class="trend-axis-label">${money(t, true)}</text>
    `;
  }).join('');

  let labelStep = 1;
  if (buckets.length > 20) labelStep = 5;
  else if (buckets.length > 10) labelStep = 2;

  const xLabelsHtml = buckets.map((b, idx) => {
    const isFirst = idx === 0;
    const isLast = idx === buckets.length - 1;
    const isStep = idx % labelStep === 0;
    if (!isFirst && !isLast && !isStep) return '';
    return `<text x="${b.x.toFixed(1)}" y="${(baselineY + 18).toFixed(1)}" text-anchor="middle" class="trend-axis-label">${escapeHtml(b.label)}</text>`;
  }).join('');

  const showExpense = activeType === 'all' || activeType === 'expense';
  const showIncome = activeType === 'all' || activeType === 'income';
  const showTransfer = activeType === 'transfer';

  const expPoints = buckets.map(b => ({ x: b.x, y: b.yExpense }));
  const incPoints = buckets.map(b => ({ x: b.x, y: b.yIncome }));
  const trfPoints = buckets.map(b => ({ x: b.x, y: b.yTransfer }));

  const expLineD = showExpense ? getSplinePath(expPoints) : '';
  const expAreaD = showExpense ? `${expLineD} L ${expPoints[expPoints.length - 1].x.toFixed(1)},${baselineY.toFixed(1)} L ${expPoints[0].x.toFixed(1)},${baselineY.toFixed(1)} Z` : '';

  const incLineD = showIncome ? getSplinePath(incPoints) : '';
  const incAreaD = showIncome ? `${incLineD} L ${incPoints[incPoints.length - 1].x.toFixed(1)},${baselineY.toFixed(1)} L ${incPoints[0].x.toFixed(1)},${baselineY.toFixed(1)} Z` : '';

  const trfLineD = showTransfer ? getSplinePath(trfPoints) : '';
  const trfAreaD = showTransfer ? `${trfLineD} L ${trfPoints[trfPoints.length - 1].x.toFixed(1)},${baselineY.toFixed(1)} L ${trfPoints[0].x.toFixed(1)},${baselineY.toFixed(1)} Z` : '';

  const dotsHtml = buckets.filter(b => b.count > 0).map(b => {
    let out = '';
    if (showExpense && b.expense > 0) {
      out += `<circle cx="${b.x.toFixed(1)}" cy="${b.yExpense.toFixed(1)}" r="3.2" class="trend-dot dot-expense"></circle>`;
    }
    if (showIncome && b.income > 0) {
      out += `<circle cx="${b.x.toFixed(1)}" cy="${b.yIncome.toFixed(1)}" r="3.2" class="trend-dot dot-income"></circle>`;
    }
    if (showTransfer && b.transfer > 0) {
      out += `<circle cx="${b.x.toFixed(1)}" cy="${b.yTransfer.toFixed(1)}" r="3.2" class="trend-dot dot-transfer"></circle>`;
    }
    return out;
  }).join('');

  container.innerHTML = `
    <svg class="trend-svg" viewBox="0 0 ${width} ${height}" aria-label="Cash flow timeline">
      <defs>
        <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#f43f5e" stop-opacity="0.28"></stop>
          <stop offset="100%" stop-color="#f43f5e" stop-opacity="0.0"></stop>
        </linearGradient>
        <linearGradient id="incGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#10b981" stop-opacity="0.28"></stop>
          <stop offset="100%" stop-color="#10b981" stop-opacity="0.0"></stop>
        </linearGradient>
        <linearGradient id="trfGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#6366f1" stop-opacity="0.28"></stop>
          <stop offset="100%" stop-color="#6366f1" stop-opacity="0.0"></stop>
        </linearGradient>
      </defs>

      <!-- Grid lines & Axes -->
      <g class="trend-grid">${gridHtml}</g>
      <g class="trend-x-labels">${xLabelsHtml}</g>

      <!-- Filled areas -->
      ${showIncome ? `<path d="${incAreaD}" fill="url(#incGrad)" class="trend-area"></path>` : ''}
      ${showExpense ? `<path d="${expAreaD}" fill="url(#expGrad)" class="trend-area"></path>` : ''}
      ${showTransfer ? `<path d="${trfAreaD}" fill="url(#trfGrad)" class="trend-area"></path>` : ''}

      <!-- Stroke lines -->
      ${showIncome ? `<path d="${incLineD}" fill="none" class="trend-path path-income"></path>` : ''}
      ${showExpense ? `<path d="${expLineD}" fill="none" class="trend-path path-expense"></path>` : ''}
      ${showTransfer ? `<path d="${trfLineD}" fill="none" class="trend-path path-transfer"></path>` : ''}

      <!-- Data point markers -->
      <g class="trend-dots">${dotsHtml}</g>

      <!-- Scrubber elements -->
      <line id="trend-scrubber-line" x1="0" y1="${pad.top}" x2="0" y2="${baselineY}" class="trend-scrubber-line hidden"></line>
      <circle id="trend-focus-exp" cx="0" cy="0" r="5" class="trend-focus-dot dot-expense hidden"></circle>
      <circle id="trend-focus-inc" cx="0" cy="0" r="5" class="trend-focus-dot dot-income hidden"></circle>
      <circle id="trend-focus-trf" cx="0" cy="0" r="5" class="trend-focus-dot dot-transfer hidden"></circle>

      <!-- Transparent interaction overlay -->
      <rect class="trend-overlay" x="${pad.left}" y="${pad.top}" width="${plotW}" height="${plotH}" fill="transparent"></rect>
    </svg>
  `;

  // Render Footer Legend
  const legend = $('trend-footer-legend');
  if (legend) {
    const items = [];
    if (showExpense) {
      items.push(`
        <div class="trend-legend-pill">
          <span class="trend-legend-indicator bg-expense"></span>
          <span>Expenses: <strong>${money(totalExpenses, true)}</strong></span>
        </div>
      `);
    }
    if (showIncome) {
      items.push(`
        <div class="trend-legend-pill">
          <span class="trend-legend-indicator bg-income"></span>
          <span>Income: <strong>${money(totalIncome, true)}</strong></span>
        </div>
      `);
    }
    if (showTransfer) {
      items.push(`
        <div class="trend-legend-pill">
          <span class="trend-legend-indicator bg-transfer"></span>
          <span>Transfers: <strong>${money(totalTransfer, true)}</strong></span>
        </div>
      `);
    }
    if (activeType === 'all' && (totalIncome > 0 || totalExpenses > 0)) {
      const net = totalIncome - totalExpenses;
      const netClass = net >= 0 ? 'amount-income' : 'amount-expense';
      const netSign = net > 0 ? '+' : '';
      items.push(`
        <div class="trend-legend-pill">
          <span class="trend-legend-indicator bg-neutral"></span>
          <span>Net: <strong class="${netClass}">${netSign}${money(net, true)}</strong></span>
        </div>
      `);
    }
    legend.innerHTML = items.join('');
  }

  // Interactive Hover Scrubber
  const overlay = container.querySelector('.trend-overlay');
  const tooltip = $('trend-tooltip');
  const wrap = $('trend-chart-wrap');
  if (!overlay || !wrap) return;

  overlay.onpointermove = (e) => {
    const rect = overlay.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width;
    const bucketIdx = Math.max(0, Math.min(buckets.length - 1, Math.round(relX * (buckets.length - 1))));
    const b = buckets[bucketIdx];
    if (!b) return;

    const scrubLine = $('trend-scrubber-line');
    if (scrubLine) {
      scrubLine.setAttribute('x1', b.x.toFixed(1));
      scrubLine.setAttribute('x2', b.x.toFixed(1));
      scrubLine.classList.remove('hidden');
    }

    const fExp = $('trend-focus-exp');
    if (fExp) {
      fExp.setAttribute('cx', b.x.toFixed(1));
      fExp.setAttribute('cy', b.yExpense.toFixed(1));
      fExp.classList.toggle('hidden', !showExpense);
    }
    const fInc = $('trend-focus-inc');
    if (fInc) {
      fInc.setAttribute('cx', b.x.toFixed(1));
      fInc.setAttribute('cy', b.yIncome.toFixed(1));
      fInc.classList.toggle('hidden', !showIncome);
    }
    const fTrf = $('trend-focus-trf');
    if (fTrf) {
      fTrf.setAttribute('cx', b.x.toFixed(1));
      fTrf.setAttribute('cy', b.yTransfer.toFixed(1));
      fTrf.classList.toggle('hidden', !showTransfer);
    }

    if (tooltip) {
      tooltip.classList.remove('hidden');
      let rowsHtml = '';
      if (showExpense) {
        rowsHtml += `<div class="trend-tip-row"><span class="trend-tip-swatch bg-expense"></span><span class="trend-tip-name">Expense:</span><strong class="amount-expense">${money(b.expense)}</strong></div>`;
      }
      if (showIncome) {
        rowsHtml += `<div class="trend-tip-row"><span class="trend-tip-swatch bg-income"></span><span class="trend-tip-name">Income:</span><strong class="amount-income">${money(b.income)}</strong></div>`;
      }
      if (showTransfer) {
        rowsHtml += `<div class="trend-tip-row"><span class="trend-tip-swatch bg-transfer"></span><span class="trend-tip-name">Transfer:</span><strong class="amount-transfer">${money(b.transfer)}</strong></div>`;
      }
      if (showExpense && showIncome && (b.expense > 0 || b.income > 0)) {
        const netSign = b.net > 0 ? '+' : '';
        const netColor = b.net >= 0 ? 'amount-income' : 'amount-expense';
        rowsHtml += `<div class="trend-tip-row net-row"><span class="trend-tip-swatch bg-neutral"></span><span class="trend-tip-name">Net:</span><strong class="${netColor}">${netSign}${money(b.net)}</strong></div>`;
      }
      if (b.topCategory && b.expense > 0) {
        rowsHtml += `<div class="trend-tip-top-cat">Top: <strong>${escapeHtml(b.topCategory)}</strong> (${money(b.topCategoryAmount, true)})</div>`;
      }
      if (b.count === 0) {
        rowsHtml += `<div class="trend-tip-empty">No transactions recorded</div>`;
      }

      tooltip.innerHTML = `
        <div class="trend-tip-title">${escapeHtml(b.dateLabel)}</div>
        <div class="trend-tip-content">${rowsHtml}</div>
      `;

      const wrapRect = wrap.getBoundingClientRect();
      const pointerX = e.clientX - wrapRect.left;
      const pointerY = e.clientY - wrapRect.top;
      const tipWidth = 190;
      let left = pointerX + 16;
      if (left + tipWidth > wrapRect.width) {
        left = pointerX - tipWidth - 16;
      }
      tooltip.style.left = `${Math.max(6, left)}px`;
      tooltip.style.top = `${Math.max(6, pointerY - 45)}px`;
    }
  };

  overlay.onpointerleave = () => {
    const scrubLine = $('trend-scrubber-line');
    if (scrubLine) scrubLine.classList.add('hidden');
    const fExp = $('trend-focus-exp');
    if (fExp) fExp.classList.add('hidden');
    const fInc = $('trend-focus-inc');
    if (fInc) fInc.classList.add('hidden');
    const fTrf = $('trend-focus-trf');
    if (fTrf) fTrf.classList.add('hidden');
    if (tooltip) tooltip.classList.add('hidden');
  };
}

export function syncChartViewToggle() {
  const donutLayout = $('donut-chart-layout');
  const trendLayout = $('trend-chart-layout');
  const title = $('breakdown-title');
  const isTrend = state.chartView === 'trend';

  if (donutLayout) donutLayout.classList.toggle('hidden', isTrend);
  if (trendLayout) trendLayout.classList.toggle('hidden', !isTrend);
  if (title) title.textContent = isTrend ? 'Cash Flow Trends' : 'Breakdown';

  const toggleWrap = $('chart-view-toggle');
  if (toggleWrap) {
    toggleWrap.querySelectorAll('[data-chart-view]').forEach(btn => {
      btn.classList.toggle('selected', btn.dataset.chartView === state.chartView);
    });
  }
}

export function initChartViewToggle(onSwitch) {
  const toggleWrap = $('chart-view-toggle');
  if (!toggleWrap) return;

  const buttons = toggleWrap.querySelectorAll('[data-chart-view]');
  buttons.forEach(btn => {
    btn.onclick = () => {
      const targetView = btn.dataset.chartView;
      if (targetView === state.chartView) return;
      setChartView(targetView);
      syncChartViewToggle();
      if (typeof onSwitch === 'function') {
        onSwitch(targetView);
      }
    };
  });
  syncChartViewToggle();
}
