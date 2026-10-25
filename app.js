const state = {
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
  customEnd: ''
};
const PALETTE = ['#708f46','#e88a68','#8372c7','#d5ae51','#4d9f92','#a56f92','#6a9ccc','#b5a85a','#bf7b60','#6f9c76'];
const $ = (id) => document.getElementById(id);
const DEFAULT_SCALE = 1.0;
const money = (n, compact = false) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2, notation: compact ? 'compact' : 'standard' }).format(n || 0);
const dateKey = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

function cleanText(value) { return String(value ?? '').trim(); }
function findColumn(headers, choices) {
  const clean = headers.map(h => String(h).trim().toLowerCase());
  const exactIdx = clean.findIndex(h => choices.includes(h));
  if (exactIdx !== -1) return headers[exactIdx];
  const subIdx = clean.findIndex(h => choices.some(c => h.includes(c)));
  return subIdx !== -1 ? headers[subIdx] : undefined;
}
function normalizeType(value) { const type = cleanText(value).toLowerCase(); if (type.includes('transfer')) return 'transfer'; if (type.includes('income')) return 'income'; return 'expense'; }
function parseAmount(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? Math.abs(value) : 0;
  if (!value) return 0;
  const cleaned = String(value).replace(/[^0-9.-]+/g, '');
  const num = parseFloat(cleaned);
  return Number.isFinite(num) ? Math.abs(num) : 0;
}
function parseDate(value) {
  if (!value) return null;
  // 1. SheetJS parsed Date object with cellDates: true
  // Excel date numbers are pure local timestamps; SheetJS creates UTC Date objects from them.
  // Using UTC methods preserves the exact year, month, and date as recorded in Excel.
  if (value instanceof Date && !isNaN(value)) {
    return new Date(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate(), 0, 0, 0, 0);
  }
  // 2. Excel numeric serial date (e.g. 45961 for 2025-10-31)
  if (typeof value === 'number') {
    const utc = new Date(Math.round((value - 25569) * 86400 * 1000));
    return new Date(utc.getUTCFullYear(), utc.getUTCMonth(), utc.getUTCDate(), 0, 0, 0, 0);
  }
  // 3. String date formats (e.g. DD/MM/YYYY, YYYY-MM-DD, DD-MM-YYYY)
  if (typeof value === 'string') {
    const s = value.trim();
    if (!s) return null;
    // YYYY-MM-DD or YYYY/MM/DD
    let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
    if (m) {
      return new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10), 0, 0, 0, 0);
    }
    // DD-MM-YYYY or DD/MM/YYYY
    m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
    if (m) {
      const p1 = parseInt(m[1], 10);
      const p2 = parseInt(m[2], 10);
      const yr = parseInt(m[3], 10);
      if (p1 > 12) {
        return new Date(yr, p2 - 1, p1, 0, 0, 0, 0);
      } else if (p2 > 12) {
        return new Date(yr, p1 - 1, p2, 0, 0, 0, 0);
      } else {
        // In Money Manager (India / international), dates default to DD/MM/YYYY
        return new Date(yr, p2 - 1, p1, 0, 0, 0, 0);
      }
    }
    // Fallback standard parse
    const d = new Date(s);
    if (!isNaN(d)) {
      return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
    }
  }
  return null;
}

function normalizeRows(rows) {
  const headers = rows[0].map(cleanText);
  const dateCol = findColumn(headers, ['period','date','transaction date','time']);
  const categoryCol = findColumn(headers, ['category','category name']);
  const subcategoryCol = findColumn(headers, ['subcategory','sub category','sub-category']);
  const typeCol = findColumn(headers, ['income/expense','type','transaction type','income / expense']);
  const amountCol = findColumn(headers, ['amount','inr','value','money','expense/income']);
  const accountCol = findColumn(headers, ['accounts','account','wallet','bank']);
  const noteCol = findColumn(headers, ['note','notes','memo']);
  const descriptionCol = headers.find((h, i) => {
    const text = String(h).trim().toLowerCase();
    return (text.includes('description') || text.includes('payee') || text.includes('narrative') || text.includes('particulars') || text.includes('desc') || text.includes('remark') || text.includes('details')) && h !== noteCol;
  });
  if (!dateCol || !categoryCol || !amountCol) throw new Error('Expected Period/Date, Category, and Amount or INR columns.');
  // Use the first matching header position. Money Manager exports can repeat
  // `Accounts` as a calculated final column, so a name-to-index map is unsafe.
  const col = (name) => name ? headers.indexOf(name) : -1;
  return rows.slice(1).map((row, i) => {
    const date = parseDate(row[col(dateCol)]);
    const amount = parseAmount(row[col(amountCol)]);
    const cat = cleanText(row[col(categoryCol)]);
    const sub = subcategoryCol ? cleanText(row[col(subcategoryCol)]) : '';
    const category = cat || sub || 'Uncategorized';
    const noteRaw = cleanText(row[col(noteCol)]);
    const descRaw = descriptionCol ? cleanText(row[col(descriptionCol)]) : '';
    const note = noteRaw || (sub && cat !== sub ? sub : '');
    const description = descRaw;
    const finalNote = note || (description ? description : '—');
    const finalDesc = description && description !== finalNote ? description : '';
    return {
      id: i,
      date,
      category,
      type: normalizeType(typeCol ? row[col(typeCol)] : 'Expense'),
      amount,
      account: accountCol ? cleanText(row[col(accountCol)]) : '—',
      note: finalNote,
      description: finalDesc
    };
  }).filter(r => r.date && r.amount > 0);
}

function bounds() {
  const anchor = state.anchor || new Date();
  if (state.period === 'all') {
    if (!state.data.length) return { start: new Date(), end: new Date(), label: 'All activity' };
    const minD = new Date(Math.min(...state.data.map(r => +r.date)));
    minD.setHours(0, 0, 0, 0);
    const maxD = new Date(Math.max(...state.data.map(r => +r.date)));
    maxD.setHours(23, 59, 59, 999);
    return { start: minD, end: maxD, label: 'All activity' };
  }
  if (state.period === 'custom') {
    const start = state.customStart ? new Date(`${state.customStart}T00:00:00`) : new Date(Math.min(...state.data.map(r => +r.date)));
    start.setHours(0, 0, 0, 0);
    const end = state.customEnd ? new Date(`${state.customEnd}T23:59:59.999`) : new Date(Math.max(...state.data.map(r => +r.date)));
    end.setHours(23, 59, 59, 999);
    return { start, end, label: `${shortDate(start)} – ${shortDate(end)}` };
  }
  if (state.period === 'weekly') {
    const dow = (anchor.getDay() + 6) % 7;
    const start = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() - dow, 0, 0, 0, 0);
    const end = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() - dow + 6, 23, 59, 59, 999);
    return { start, end, label: `${shortDate(start)} – ${shortDate(end)}` };
  }
  if (state.period === 'monthly') {
    const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1, 0, 0, 0, 0);
    const end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start, end, label: start.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) };
  }
  if (state.period === 'quarterly') {
    const q = Math.floor(anchor.getMonth() / 3);
    const start = new Date(anchor.getFullYear(), q * 3, 1, 0, 0, 0, 0);
    const end = new Date(anchor.getFullYear(), q * 3 + 3, 0, 23, 59, 59, 999);
    return { start, end, label: `Q${q + 1} ${anchor.getFullYear()}` };
  }
  if (state.period === 'yearly') {
    const start = new Date(anchor.getFullYear(), 0, 1, 0, 0, 0, 0);
    const end = new Date(anchor.getFullYear(), 11, 31, 23, 59, 59, 999);
    return { start, end, label: String(anchor.getFullYear()) };
  }
  const fy = anchor.getMonth() < 3 ? anchor.getFullYear() - 1 : anchor.getFullYear();
  const start = new Date(fy, 3, 1, 0, 0, 0, 0);
  const end = new Date(fy + 1, 2, 31, 23, 59, 59, 999);
  return { start, end, label: `FY ${fy}–${String(fy + 1).slice(2)}` };
}
function shortDate(d) { return d.toLocaleDateString('en-IN',{day:'numeric',month:'short'}); }
function filtered() {
  const {start,end} = bounds();
  const lower = state.search.toLowerCase();
  return state.data.filter(r =>
    r.date >= start && r.date <= end &&
    (state.type === 'all' || r.type === state.type) &&
    (state.selectedCategories.size === 0 || state.selectedCategories.has(r.category)) &&
    (state.selectedAccounts.size === 0 || state.selectedAccounts.has(r.account)) &&
    (!lower || [r.category, r.note, r.description, r.account].join(' ').toLowerCase().includes(lower))
  );
}
function categoryTotals(rows, type = 'expense') { return Object.entries(rows.filter(r => r.type === type).reduce((out, r) => { out[r.category] = (out[r.category] || 0) + r.amount; return out; }, {})).sort((a,b) => b[1]-a[1]); }
function periodDays({start,end}) { return Math.max(1, Math.ceil((dateKey(end)-dateKey(start))/86400000)+1); }
function priorExpense() { const {start,end} = bounds(); if (state.period === 'all' || state.period === 'custom') return null; const ms = end - start + 86400000; const prevStart = new Date(start - ms), prevEnd = new Date(start - 1); return state.data.filter(r => r.date >= prevStart && r.date <= prevEnd && r.type === 'expense' && (state.category === 'all'||r.category===state.category) && (state.account === 'all'||r.account===state.account)).reduce((sum,r)=>sum+r.amount,0); }

function render() {
  populateCategories();
  populateAccounts();
  syncSortPill();
  syncFilterPills();
  const range = bounds(); const rows = filtered(); const expenses = rows.filter(r=>r.type==='expense').reduce((s,r)=>s+r.amount,0); const income = rows.filter(r=>r.type==='income').reduce((s,r)=>s+r.amount,0); const transfers = rows.filter(r=>r.type==='transfer').reduce((s,r)=>s+r.amount,0); const prior = priorExpense(); const chartType = state.type === 'transfer' ? 'transfer' : state.type === 'income' ? 'income' : 'expense'; const chartTotal = chartType === 'transfer' ? transfers : chartType === 'income' ? income : expenses;
  $('period-label').textContent = range.label; $('period-mode-label').textContent = state.period === 'financial' ? 'FINANCIAL YEAR' : state.period.toUpperCase();
  $('spent-title').textContent = chartType === 'transfer' ? 'Money moved' : chartType === 'income' ? 'Money received' : 'Total spent';
  $('spent-value').textContent = money(chartType === 'transfer' ? transfers : chartType === 'income' ? income : expenses);
  $('spent-value').className = chartType === 'transfer' ? 'amount-neutral' : chartType === 'income' ? 'amount-income' : 'amount-expense';
  $('income-value').textContent = money(income); $('income-value').className = 'amount-income';
  const net = income - expenses; $('net-value').textContent = money(net); $('net-value').className = net >= 0 ? 'amount-net-positive' : 'amount-net-negative';
  $('daily-value').textContent = money(expenses / periodDays(range)); $('daily-value').className = 'amount-neutral';
  $('income-count').textContent = `${rows.filter(r=>r.type==='income').length} income transaction${rows.filter(r=>r.type==='income').length===1?'':'s'}`; $('records-copy').textContent = `${rows.filter(r=>r.type==='expense').length} recorded expenses`;
  $('spent-compare').textContent = chartType === 'transfer' ? `${rows.filter(r=>r.type==='transfer').length} transfer record${rows.filter(r=>r.type==='transfer').length===1?'':'s'} in this view` : prior === null || prior === 0 ? 'No prior period to compare' : `${Math.abs((expenses-prior)/prior*100).toFixed(0)}% ${expenses > prior ? 'more' : 'less'} than prior period`;
  if (state.type === 'all' && state.selectedCategories.size === 0) {
    $('breakdown-title').textContent = 'Cashflow Breakdown';
  } else if (state.type === 'income') {
    $('breakdown-title').textContent = 'Income Breakdown';
  } else if (state.type === 'transfer') {
    $('breakdown-title').textContent = 'Transfers Breakdown';
  } else {
    $('breakdown-title').textContent = 'Expense Breakdown';
  }
  const clearBtn = $('clear-category');
  if (clearBtn) clearBtn.classList.toggle('hidden', state.selectedCategories.size === 0);
  if (state.type === 'all' && state.selectedCategories.size === 0) {
    renderMacroDonut(expenses, income, transfers, net);
  } else {
    renderDonut(categoryTotals(rows, chartType), chartTotal, chartType);
  }
  renderTable(rows);
}
function selectCategory(category) {
  if (category === 'Other') return;
  if (state.selectedCategories.has(category) && state.selectedCategories.size === 1) {
    state.selectedCategories.clear();
    state.category = 'all';
  } else {
    state.selectedCategories = new Set([category]);
    state.category = category;
  }
  syncFilterPills();
  render();
  const panel = $('spending-section');
  if (panel) {
    panel.classList.remove('drill-anim');
    requestAnimationFrame(() => panel.classList.add('drill-anim'));
  }
}
function splitCategoryEmoji(rawName) {
  const str = String(rawName || '').trim();
  const emojiRegex = /^(\p{Extended_Pictographic}|\p{Emoji_Presentation}|\uFE0F|\u200D)+/u;
  const match = str.match(emojiRegex);
  if (match) {
    const emoji = match[0].trim();
    const text = str.slice(match[0].length).trim();
    return { emoji, text: text || emoji };
  }
  if (str.toLowerCase() === 'other') return { emoji: '📦', text: 'Other' };
  const fallback = getNotionIcon('', str);
  return { emoji: fallback || '🏷️', text: str };
}

function renderMacroDonut(expenses, income, transfers, net) {
  const donut = $('donut');
  const totalVolume = expenses + income + transfers;
  const netSign = net > 0 ? '+' : (net < 0 ? '−' : '');
  const netCaption = net > 0 ? 'Net saved' : (net < 0 ? 'Net deficit' : 'Net flow');
  const netColorClass = net > 0 ? 'amount-income' : (net < 0 ? 'amount-expense' : 'amount-neutral');
  const defaultTotalFormatted = `${netSign}${money(Math.abs(net), true)}`;

  if (totalVolume <= 0) {
    donut.innerHTML = `<div class="donut-center"><strong id="donut-total" class="amount-neutral">₹0</strong><span id="donut-caption">No activity</span></div>`;
    $('legend').innerHTML = `<span class="empty-table">No transactions for this period.</span>`;
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
    const slice = { ...item, percent, start: position };
    position += percent;
    return slice;
  });

  donut.innerHTML = `<svg class="donut-svg" viewBox="0 0 100 100" aria-label="Cashflow Overview"><circle class="donut-ring" cx="50" cy="50" r="42" pathLength="100"></circle>${slices.map((item, i) => `<circle class="donut-slice" data-index="${i}" data-type-key="${item.typeKey}" cx="50" cy="50" r="42" pathLength="100" stroke="${item.color}" stroke-dasharray="${item.percent} ${100 - item.percent}" stroke-dashoffset="${-item.start}"></circle>`).join('')}</svg><div class="donut-center"><strong id="donut-total" class="${netColorClass}">${defaultTotalFormatted}</strong><span id="donut-caption">${netCaption}</span></div>`;

  $('legend').innerHTML = slices.map((item, i) => {
    return `<button class="legend-item macro-legend-item" data-index="${i}" data-type-key="${item.typeKey}" title="Drill into ${escapeHtml(item.name)} breakdown">
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

  const hover = (item) => {
    donut.classList.add('has-hover');
    donut.querySelectorAll('.donut-slice').forEach(slice => slice.classList.toggle('hovered', Number(slice.dataset.index) === slices.indexOf(item)));
    const totalEl = $('donut-total');
    totalEl.textContent = money(item.value, true);
    totalEl.className = item.typeKey === 'income' ? 'amount-income' : (item.typeKey === 'expense' ? 'amount-expense' : 'amount-neutral');
    $('donut-caption').innerHTML = `${item.emoji} ${item.name} · ${Math.round(item.percent)}%`;
  };

  const clearHover = () => {
    donut.classList.remove('has-hover');
    donut.querySelectorAll('.donut-slice').forEach(slice => slice.classList.remove('hovered'));
    const totalEl = $('donut-total');
    totalEl.textContent = defaultTotalFormatted;
    totalEl.className = netColorClass;
    $('donut-caption').textContent = netCaption;
  };

  donut.querySelectorAll('.donut-slice').forEach(slice => {
    const item = slices[Number(slice.dataset.index)];
    slice.onmouseenter = () => hover(item);
    slice.onmouseleave = clearHover;
    slice.onclick = () => setTypeFilter(item.typeKey);
  });

  $('legend').querySelectorAll('.legend-item').forEach(button => {
    const item = slices[Number(button.dataset.index)];
    button.onmouseenter = () => hover(item);
    button.onmouseleave = clearHover;
    button.onfocus = () => hover(item);
    button.onblur = clearHover;
    button.onclick = () => setTypeFilter(item.typeKey);
  });
}

function renderDonut(totals, expenses, analysisType = 'expense') {
  const visible = totals.slice(0,7); const other = totals.slice(7).reduce((s,[,v])=>s+v,0); if(other) visible.push(['Other',other]);
  const donut = $('donut'); const caption = analysisType === 'transfer' ? 'moved' : analysisType === 'income' ? 'received' : 'spent';
  const totalEl = $('donut-total');
  if (totalEl) {
    totalEl.className = '';
    totalEl.textContent = money(expenses,true);
  }
  $('donut-caption').textContent = caption;
  if (!visible.length) { donut.innerHTML = `<div class="donut-center"><strong id="donut-total">₹0</strong><span id="donut-caption">${caption}</span></div>`; $('legend').innerHTML = `<span class="empty-table">No ${analysisType === 'transfer' ? 'transfers' : analysisType === 'income' ? 'income' : 'expenses'} for these filters.</span>`; return; }
  let position = 0; const slices = visible.map(([name,value],i) => { const percent = value / expenses * 100; const item = { name, value, percent, start: position, color: PALETTE[i % PALETTE.length] }; position += percent; return item; });
  donut.innerHTML = `<svg class="donut-svg" viewBox="0 0 100 100" aria-label="${analysisType === 'transfer' ? 'Transfer channels' : analysisType === 'income' ? 'Income categories' : 'Spending categories'}"><circle class="donut-ring" cx="50" cy="50" r="42" pathLength="100"></circle>${slices.map((item,i)=>`<circle class="donut-slice" data-index="${i}" cx="50" cy="50" r="42" pathLength="100" stroke="${item.color}" stroke-dasharray="${item.percent} ${100-item.percent}" stroke-dashoffset="${-item.start}"></circle>`).join('')}</svg><div class="donut-center"><strong id="donut-total">${money(expenses,true)}</strong><span id="donut-caption">${caption}</span></div>`;
  $('legend').innerHTML = slices.map((item,i)=>{
    const { emoji, text } = splitCategoryEmoji(item.name);
    return `<button class="legend-item ${state.category===item.name?'focused':''}" data-index="${i}" ${item.name==='Other'?'disabled':''} title="${escapeHtml(item.name)}">
      <div class="legend-item-left">
        <i class="legend-dot" style="background:${item.color}"></i>
        <span class="legend-emoji">${emoji}</span>
        <span class="legend-label">${escapeHtml(text)}</span>
      </div>
      <div class="legend-item-right">
        <span class="legend-pct">${Math.round(item.percent)}%</span>
        <span class="legend-sep">·</span>
        <span class="legend-amt">${money(item.value,true)}</span>
      </div>
    </button>`;
  }).join('');
  const hover = (item) => {
    donut.classList.add('has-hover');
    donut.querySelectorAll('.donut-slice').forEach(slice => slice.classList.toggle('hovered', Number(slice.dataset.index) === slices.indexOf(item)));
    const { emoji, text } = splitCategoryEmoji(item.name);
    const t = $('donut-total');
    if (t) {
      t.className = '';
      t.textContent = money(item.value,true);
    }
    $('donut-caption').innerHTML = `${emoji} ${escapeHtml(text)} · ${Math.round(item.percent)}%`;
  };
  const clearHover = () => {
    donut.classList.remove('has-hover');
    donut.querySelectorAll('.donut-slice').forEach(slice => slice.classList.remove('hovered'));
    const t = $('donut-total');
    if (t) {
      t.className = '';
      t.textContent = money(expenses,true);
    }
    $('donut-caption').textContent = caption;
  };
  donut.querySelectorAll('.donut-slice').forEach(slice => { const item = slices[Number(slice.dataset.index)]; slice.onmouseenter = () => hover(item); slice.onmouseleave = clearHover; slice.onclick = () => selectCategory(item.name); });
  $('legend').querySelectorAll('.legend-item').forEach(button => {
    const item = slices[Number(button.dataset.index)];
    button.onmouseenter = () => hover(item);
    button.onmouseleave = clearHover;
    button.onfocus = () => hover(item);
    button.onblur = clearHover;
    button.onclick = () => selectCategory(item.name);
  });
}

const NOTION_NAMED_COLORS = {
  school: { bg: '#e3e2e0', fg: '#32302c' },
  education: { bg: '#e3e2e0', fg: '#32302c' },
  books: { bg: '#e3e2e0', fg: '#32302c' },
  home: { bg: '#faeccd', fg: '#89632a' },
  housing: { bg: '#faeccd', fg: '#89632a' },
  rent: { bg: '#faeccd', fg: '#89632a' },
  groceries: { bg: '#faeccd', fg: '#89632a' },
  vegetables: { bg: '#faeccd', fg: '#89632a' },
  phone: { bg: '#faeccd', fg: '#89632a' },
  food: { bg: '#ffe2dd', fg: '#933835' },
  dinner: { bg: '#ffe2dd', fg: '#933835' },
  lunch: { bg: '#ffe2dd', fg: '#933835' },
  breakfast: { bg: '#ffe2dd', fg: '#933835' },
  restaurant: { bg: '#ffe2dd', fg: '#933835' },
  snack: { bg: '#ffe2dd', fg: '#933835' },
  entertainment: { bg: '#d3e5ef', fg: '#183347' },
  movies: { bg: '#d3e5ef', fg: '#183347' },
  cinema: { bg: '#d3e5ef', fg: '#183347' },
  shopping: { bg: '#fadec9', fg: '#854c1d' },
  clothing: { bg: '#fadec9', fg: '#854c1d' },
  electronics: { bg: '#fadec9', fg: '#854c1d' },
  utilities: { bg: '#e8deee', fg: '#412454' },
  bills: { bg: '#e8deee', fg: '#412454' },
  wifi: { bg: '#e8deee', fg: '#412454' },
  health: { bg: '#dbeddb', fg: '#1c3829' },
  medical: { bg: '#dbeddb', fg: '#1c3829' },
  transport: { bg: '#d3e5ef', fg: '#183347' },
  travel: { bg: '#d3e5ef', fg: '#183347' },
  commute: { bg: '#d3e5ef', fg: '#183347' },
  fuel: { bg: '#d3e5ef', fg: '#183347' },
  income: { bg: '#dbeddb', fg: '#1c3829' },
  salary: { bg: '#dbeddb', fg: '#1c3829' },
  refund: { bg: '#dbeddb', fg: '#1c3829' },
  transfer: { bg: '#f1f0ef', fg: '#555452' },
  investment: { bg: '#f5e0e9', fg: '#692943' }
};

const NOTION_PALETTE = [
  { bg: '#faeccd', fg: '#89632a' }, // yellow (Home)
  { bg: '#ffe2dd', fg: '#933835' }, // red/pink (Food)
  { bg: '#d3e5ef', fg: '#183347' }, // blue (Entertainment)
  { bg: '#e3e2e0', fg: '#32302c' }, // gray (School)
  { bg: '#dbeddb', fg: '#1c3829' }, // green
  { bg: '#fadec9', fg: '#854c1d' }, // orange
  { bg: '#e8deee', fg: '#412454' }, // purple
  { bg: '#eee0da', fg: '#442a1e' }, // brown
  { bg: '#f5e0e9', fg: '#692943' }  // pink
];

function categoryColor(name) {
  const clean = String(name ?? '').toLowerCase().trim();
  for (const [key, val] of Object.entries(NOTION_NAMED_COLORS)) {
    if (clean.includes(key)) return val;
  }
  let hash = 0;
  for (let i = 0; i < clean.length; i++) hash = (clean.charCodeAt(i) + ((hash << 5) - hash)) | 0;
  return NOTION_PALETTE[Math.abs(hash) % NOTION_PALETTE.length];
}

function formatCategory(name) {
  if (!name) return 'Uncategorized';
  const s = String(name).trim();
  if (s === s.toUpperCase() || s === s.toLowerCase()) {
    return s.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  }
  return s;
}

function formatType(type) {
  const t = cleanText(type).toLowerCase();
  if (t === 'expense') return 'Expense';
  if (t === 'income') return 'Income';
  if (t === 'transfer') return 'Transfer';
  return type ? type.charAt(0).toUpperCase() + type.slice(1) : 'Expense';
}

function getNotionIcon(note, category = '') {
  const text = `${String(note ?? '')} ${String(category ?? '')}`.toLowerCase();
  
  // Food & Beverages
  if (text.includes('coffee') || text.includes('tea') || text.includes('chai') || text.includes('cafe') || text.includes('starbucks')) return '☕';
  if (text.includes('breakfast') || text.includes('egg') || text.includes('dosa') || text.includes('idli')) return '🍳';
  if (text.includes('dinner') || text.includes('zomato') || text.includes('swiggy') || text.includes('restaurant') || text.includes('biryani')) return '🌮';
  if (text.includes('lunch') || text.includes('sandwich') || text.includes('meal') || text.includes('thali')) return '🥪';
  if (text.includes('grocer') || text.includes('vegetable') || text.includes('fruit') || text.includes('milk') || text.includes('blinkit') || text.includes('zepto') || text.includes('instamart') || text.includes('supermarket')) return '🥬';
  if (text.includes('snack') || text.includes('bakery') || text.includes('pizza') || text.includes('burger') || text.includes('chips')) return '🍕';
  if (text.includes('dessert') || text.includes('ice cream') || text.includes('sweet') || text.includes('cake')) return '🍨';
  if (text.includes('food') || text.includes('dining')) return '🍽️';

  // Transportation & Commute
  if (text.includes('train') || text.includes('ticket') || text.includes('irctc') || text.includes('railway')) return '🚆';
  if (text.includes('metro')) return '🚇';
  if (text.includes('flight') || text.includes('airline') || text.includes('airport') || text.includes('airways')) return '✈️';
  if (text.includes('bus')) return '🚌';
  if (text.includes('auto') || text.includes('rickshaw')) return '🛺';
  if (text.includes('fuel') || text.includes('petrol') || text.includes('diesel') || text.includes('gas station')) return '⛽';
  if (text.includes('travel') || text.includes('uber') || text.includes('ola') || text.includes('rapido') || text.includes('cab') || text.includes('taxi') || text.includes('toll') || text.includes('parking')) return '🚗';
  if (text.includes('transport') || text.includes('commute')) return '🚗';

  // Housing & Utilities
  if (text.includes('hous') || text.includes('home') || text.includes('rent') || text.includes('flat') || text.includes('apartment')) return '🏡';
  if (text.includes('phone') || text.includes('mobile') || text.includes('recharge') || text.includes('airtel') || text.includes('jio')) return '📱';
  if (text.includes('wifi') || text.includes('internet') || text.includes('broadband')) return '📶';
  if (text.includes('electric') || text.includes('power') || text.includes('bescom')) return '⚡';
  if (text.includes('water')) return '💧';
  if (text.includes('gas') || text.includes('lpg') || text.includes('cylinder')) return '🔥';
  if (text.includes('bill') || text.includes('utility')) return '🧾';

  // Entertainment & Leisure
  if (text.includes('movie') || text.includes('cinema') || text.includes('theatre') || text.includes('pvr') || text.includes('inox') || text.includes('bookmyshow')) return '🍿';
  if (text.includes('game') || text.includes('gaming') || text.includes('steam')) return '🎮';
  if (text.includes('subscription') || text.includes('netflix') || text.includes('spotify') || text.includes('prime') || text.includes('youtube')) return '📺';
  if (text.includes('vacation') || text.includes('trip') || text.includes('hotel') || text.includes('resort')) return '🏖️';
  if (text.includes('entertainment')) return '🍿';

  // Education & Work
  if (text.includes('book') || text.includes('school') || text.includes('edu') || text.includes('course') || text.includes('udemy') || text.includes('tuition')) return '📚';

  // Shopping & Personal Care
  if (text.includes('shopping') || text.includes('amazon') || text.includes('flipkart') || text.includes('myntra')) return '🛍️';
  if (text.includes('cloth') || text.includes('dress') || text.includes('apparel') || text.includes('zara') || text.includes('h&m')) return '👕';
  if (text.includes('salon') || text.includes('haircut') || text.includes('spa') || text.includes('beauty')) return '💈';
  if (text.includes('gym') || text.includes('fitness') || text.includes('cult')) return '🏋️';

  // Medical & Health
  if (text.includes('medical') || text.includes('health') || text.includes('doctor') || text.includes('medicine') || text.includes('pharmacy') || text.includes('clinic') || text.includes('hospital')) return '💊';

  // Finance & Movement
  if (text.includes('salary') || text.includes('income') || text.includes('payroll')) return '💰';
  if (text.includes('invest') || text.includes('sip') || text.includes('mutual') || text.includes('stock') || text.includes('dividend')) return '📈';
  if (text.includes('tax') || text.includes('gst')) return '🏛️';
  if (text.includes('insurance') || text.includes('lic')) return '🛡️';
  if (text.includes('cash') || text.includes('atm')) return '💵';
  if (text.includes('transfer')) return '🔁';
  if (text.includes('refund') || text.includes('cashback')) return '↩️';
  if (text.includes('gift') || text.includes('donation')) return '🎁';

  // General fallbacks by category
  const cat = String(category ?? '').toLowerCase();
  if (cat.includes('food')) return '🍽️';
  if (cat.includes('travel') || cat.includes('trans')) return '🚗';
  if (cat.includes('shop')) return '🛍️';
  if (cat.includes('bill') || cat.includes('util')) return '🧾';
  if (cat.includes('home') || cat.includes('hous')) return '🏡';
  if (cat.includes('health') || cat.includes('med')) return '💊';
  if (cat.includes('edu') || cat.includes('book')) return '📚';
  if (cat.includes('entertain')) return '🍿';

  return '📄';
}

function categoryPill(name) {
  const isNotion = document.documentElement.getAttribute('data-theme') === 'notion';
  const display = formatCategory(name);
  if (!isNotion) return `<span class="category-cell">${escapeHtml(display)}</span>`;
  const c = categoryColor(name);
  return `<span class="cat-pill" style="background:${c.bg};color:${c.fg}">${escapeHtml(display)}</span>`;
}

function renderTable(rows) {
  const isNotion = document.documentElement.getAttribute('data-theme') === 'notion';
  const sorted = [...rows].sort((a,b) => {
    if (state.sort === 'date-asc') return a.date - b.date;
    if (state.sort === 'amount-desc') return b.amount - a.amount;
    if (state.sort === 'amount-asc') return a.amount - b.amount;
    return b.date - a.date;
  });
  const sliced = sorted;
  if ($('transaction-count')) $('transaction-count').textContent = rows.length;
  if ($('c-tab-tx-count')) $('c-tab-tx-count').textContent = rows.length;

  const head = $('transaction-head');
  if (head) {
    if (isNotion) {
      head.innerHTML = `<tr>
        <th class="col-title" style="min-width:180px"><span class="notion-th-icon">Aa</span> Expense</th>
        <th class="col-amount align-right" style="min-width:110px"><span class="notion-th-icon">#</span> Amount</th>
        <th class="col-category" style="min-width:110px"><span class="notion-th-icon">▾</span> Category</th>
        <th class="col-date" style="min-width:110px"><span class="notion-th-icon">📅</span> Date</th>
        <th class="col-account" style="min-width:90px"><span class="notion-th-icon">🏛</span> Account</th>
      </tr>`;
    } else {
      head.innerHTML = `<tr>
        <th>Date</th>
        <th>Category</th>
        <th>Expense / Note</th>
        <th>Account</th>
        <th class="align-right">Amount</th>
      </tr>`;
    }
  }

  const txBody = $('transaction-body');
  if (txBody) {
    txBody.innerHTML = sliced.length ? (sliced.map(r => {
    const noteText = r.note && r.note !== '—' ? r.note : r.category;
    const hasDesc = Boolean(r.description && r.description !== r.note && r.description !== '—');
    const fullTooltip = hasDesc ? `${noteText} — ${r.description}` : noteText;
    const descBadge = hasDesc ? `<span class="tx-desc-badge" tabindex="0" role="button" aria-label="Description: ${escapeHtml(r.description)}" title="${escapeHtml(r.description)}"><svg class="tx-desc-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg><span class="tx-desc-tooltip">${escapeHtml(r.description)}</span></span>` : '';
    const noteDisplay = isNotion
      ? `<span class="notion-item-title"><span class="notion-item-icon">${getNotionIcon(noteText, r.category)}</span> <span class="notion-item-text">${escapeHtml(noteText)}</span>${descBadge}</span>`
      : `<span class="note-with-desc"><span class="note-text">${escapeHtml(r.note)}</span>${descBadge}</span>`;
    const dateFormatted = isNotion
      ? r.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : r.date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const amountClass = `amount amount-${r.type}`;
    const amountPrefix = r.type === 'expense' ? '−' : (r.type === 'income' ? '+' : '');

    if (isNotion) {
      return `<tr>
        <td class="notion-title-cell" title="${escapeHtml(fullTooltip)}">${noteDisplay}</td>
        <td class="align-right ${amountClass}">${amountPrefix}${money(r.amount)}</td>
        <td class="category-cell">${categoryPill(r.category)}</td>
        <td class="date-cell">${dateFormatted}</td>
        <td class="account-cell">${escapeHtml(r.account)}</td>
      </tr>`;
    }
    return `<tr>
      <td>${dateFormatted}</td>
      <td class="category-cell">${categoryPill(r.category)}</td>
      <td class="note-cell" title="${escapeHtml(fullTooltip)}">${noteDisplay}</td>
      <td class="account-cell">${escapeHtml(r.account)}</td>
      <td class="align-right ${amountClass}">${amountPrefix}${money(r.amount)}</td>
    </tr>`;
  }).join('') + (isNotion ? `<tr class="notion-new-row" id="notion-new-row"><td colspan="5"><span class="notion-new-label"><span class="notion-plus-icon">+</span> New</span></td></tr>` : '')) : '<tr><td colspan="5" class="empty-table">No transactions match this view.</td></tr>';
  }

  const newRow = $('notion-new-row');
  if (newRow) {
    newRow.onclick = () => $('file-input').click();
  }

  const foot = $('transaction-foot');
  if (foot) {
    if (isNotion && rows.length) {
      const sum = rows.reduce((s, r) => s + (r.type === 'expense' ? r.amount : -r.amount), 0);
      foot.innerHTML = `<tr>
        <td class="notion-calc-cell"><span class="notion-calc-label">Count ${rows.length}</span></td>
        <td class="align-right notion-calc-sum"><span class="notion-calc-tag">SUM</span> <span class="notion-calc-val">${money(Math.abs(sum))}</span></td>
        <td class="notion-calc-cell"></td>
        <td class="notion-calc-cell"></td>
        <td class="notion-calc-cell"></td>
      </tr>`;
    } else if (rows.length) {
      const sum = rows.reduce((s, r) => s + (r.type === 'expense' ? r.amount : -r.amount), 0);
      foot.innerHTML = `<tr>
        <td colspan="4" class="align-right" style="font-weight:500;font-size:11px;color:var(--muted)">SUM</td>
        <td class="align-right" style="font-weight:500;font-size:12px">${money(Math.abs(sum))}</td>
      </tr>`;
    } else {
      foot.innerHTML = '';
    }
  }

  // Mobile List View rendering
  const mobileList = $('mobile-tx-list');
  if (mobileList) {
    mobileList.innerHTML = sliced.length ? (sliced.map(r => {
      const noteText = r.note && r.note !== '—' ? r.note : r.category;
      const hasDesc = Boolean(r.description && r.description !== r.note && r.description !== '—');
      const fullTooltip = hasDesc ? `${noteText} — ${r.description}` : noteText;
      const descBadge = hasDesc ? `<span class="tx-desc-badge" tabindex="0" role="button" aria-label="Description: ${escapeHtml(r.description)}" title="${escapeHtml(r.description)}"><svg class="tx-desc-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg><span class="tx-desc-tooltip">${escapeHtml(r.description)}</span></span>` : '';
      const icon = getNotionIcon(noteText, r.category);
      const c = categoryColor(r.category);
      const dateFormatted = isNotion
        ? r.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : r.date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      const amountClass = `amount amount-${r.type}`;
      const amountPrefix = r.type === 'expense' ? '−' : (r.type === 'income' ? '+' : '');
      return `
        <div class="tx-item">
          <div class="tx-icon-badge" style="background:${c.bg};color:${c.fg}">${icon}</div>
          <div class="tx-details">
            <div class="tx-title" title="${escapeHtml(fullTooltip)}"><span class="tx-title-text">${escapeHtml(noteText)}</span>${descBadge}</div>
            <div class="tx-meta">
              <span class="cat-pill" style="background:${c.bg};color:${c.fg}">${escapeHtml(formatCategory(r.category))}</span>
              <span class="tx-dot">·</span>
              <span class="tx-date">${dateFormatted}</span>
              ${r.account && r.account !== '—' ? `<span class="tx-dot">·</span><span class="tx-account">${escapeHtml(r.account)}</span>` : ''}
            </div>
          </div>
          <div class="tx-right">
            <div class="tx-amount ${amountClass}">${amountPrefix}${money(r.amount)}</div>
          </div>
        </div>`;
    }).join('') + (isNotion ? `<div class="tx-item notion-new-row" id="notion-mobile-new-row" style="cursor:pointer;padding:12px 6px;"><div class="tx-icon-badge" style="background:#f7f7f5;color:#9b9a97;">+</div><div class="tx-details"><div class="tx-title" style="color:#9b9a97;font-weight:500;">New transaction</div></div></div>` : '')) : '<div class="empty-table" style="padding:24px 0;text-align:center;">No transactions match this view.</div>';

    const mobileNew = $('notion-mobile-new-row');
    if (mobileNew) mobileNew.onclick = () => $('file-input').click();
  }

}
function escapeHtml(value) { return String(value).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function movePeriod(direction) {
  const d = new Date(state.anchor);
  if (state.period === 'weekly') {
    d.setDate(d.getDate() + direction * 7);
  } else if (state.period === 'monthly') {
    d.setDate(1);
    d.setMonth(d.getMonth() + direction);
  } else if (state.period === 'quarterly') {
    d.setDate(1);
    d.setMonth(d.getMonth() + direction * 3);
  } else if (state.period === 'yearly' || state.period === 'financial') {
    d.setDate(1);
    d.setFullYear(d.getFullYear() + direction);
  }
  state.anchor = d;
  render();
}
function closeAllPopovers() {
  document.querySelectorAll('.notion-popover, .export-menu').forEach(p => p.classList.add('hidden'));
  document.querySelectorAll('[aria-expanded]').forEach(btn => btn.setAttribute('aria-expanded', 'false'));
}

function syncSortPill() {
  const iconEl = $('pill-sort-icon');
  const labelEl = $('pill-sort-label');
  const pillEl = $('sort-pill');
  if (!iconEl || !labelEl || !pillEl) return;

  if (state.sort === 'date-asc') {
    iconEl.textContent = '↓';
    labelEl.textContent = 'Date';
  } else if (state.sort === 'amount-desc') {
    iconEl.textContent = '↓';
    labelEl.textContent = 'Amount';
  } else if (state.sort === 'amount-asc') {
    iconEl.textContent = '↑';
    labelEl.textContent = 'Amount';
  } else {
    iconEl.textContent = '↑';
    labelEl.textContent = 'Date';
  }
  pillEl.classList.add('active-sort');

  document.querySelectorAll('#sort-popover [data-sort]').forEach(btn => {
    btn.classList.toggle('selected', btn.dataset.sort === state.sort);
  });
}

function syncFilterPills() {
  // Category Pill
  const catLabel = $('pill-cat-label');
  const catDot = $('cat-active-dot');
  const catPill = $('cat-pill');
  if (catLabel && catDot && catPill) {
    if (state.selectedCategories.size === 0) {
      catLabel.textContent = 'Category';
      catDot.classList.add('hidden');
      catPill.classList.remove('has-filter');
      state.category = 'all';
    } else if (state.selectedCategories.size === 1) {
      const single = [...state.selectedCategories][0];
      catLabel.textContent = formatCategory(single);
      catDot.classList.remove('hidden');
      catPill.classList.add('has-filter');
      state.category = single;
    } else {
      catLabel.textContent = `${state.selectedCategories.size} categories`;
      catDot.classList.remove('hidden');
      catPill.classList.add('has-filter');
      state.category = 'all';
    }
  }

  // Account Pill
  const acctLabel = $('pill-acct-label');
  const acctDot = $('acct-active-dot');
  const acctPill = $('acct-pill');
  if (acctLabel && acctDot && acctPill) {
    if (state.selectedAccounts.size === 0) {
      acctLabel.textContent = 'Account';
      acctDot.classList.add('hidden');
      acctPill.classList.remove('has-filter');
      state.account = 'all';
    } else if (state.selectedAccounts.size === 1) {
      const single = [...state.selectedAccounts][0];
      acctLabel.textContent = single;
      acctDot.classList.remove('hidden');
      acctPill.classList.add('has-filter');
      state.account = single;
    } else {
      acctLabel.textContent = `${state.selectedAccounts.size} accounts`;
      acctDot.classList.remove('hidden');
      acctPill.classList.add('has-filter');
      state.account = 'all';
    }
  }

  // Reset Button & Clear category drilldown button
  const hasFilter = state.selectedCategories.size > 0 ||
                    state.selectedAccounts.size > 0 ||
                    Boolean(state.search && state.search.trim()) ||
                    state.sort !== 'date-desc';
  if ($('notion-reset-filters')) $('notion-reset-filters').classList.toggle('hidden', !hasFilter);
  if ($('clear-category')) $('clear-category').classList.toggle('hidden', state.selectedCategories.size === 0);

  // Sync hidden legacy selects if present
  if ($('category-filter')) $('category-filter').value = state.category;
  if ($('account-filter')) $('account-filter').value = state.account;
}

function populateCategories() {
  const { start, end } = bounds();
  const periodRows = state.data.filter(r => r.date >= start && r.date <= end);
  let rows = periodRows;
  if (state.type !== 'all') {
    rows = periodRows.filter(r => r.type === state.type);
  }
  const cats = [...new Set(rows.map(r => r.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

  for (const c of state.selectedCategories) {
    if (!cats.includes(c)) state.selectedCategories.delete(c);
  }

  const listEl = $('cat-options-list');
  if (listEl) {
    if (!cats.length) {
      listEl.innerHTML = '<span class="empty-table" style="padding:10px 8px;font-size:12px">No categories found.</span>';
    } else {
      listEl.innerHTML = cats.map(c => {
        const count = rows.filter(r => r.category === c).length;
        const isChecked = state.selectedCategories.has(c);
        const col = categoryColor(c);
        return `<label class="notion-option-item" data-value="${escapeHtml(c.toLowerCase())}">
          <input type="checkbox" class="notion-checkbox" data-cat="${escapeHtml(c)}" ${isChecked ? 'checked' : ''} />
          <span class="cat-pill" style="background:${col.bg};color:${col.fg}">${escapeHtml(formatCategory(c))}</span>
          <span class="notion-option-count">${count}</span>
        </label>`;
      }).join('');

      listEl.querySelectorAll('input[type="checkbox"]').forEach(chk => {
        chk.onchange = () => {
          const catVal = chk.dataset.cat;
          if (chk.checked) state.selectedCategories.add(catVal);
          else state.selectedCategories.delete(catVal);
          syncFilterPills();
          render();
        };
      });
    }
  }

  // Also sync legacy selects if present
  const options = '<option value="all">All categories</option>' + cats.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(formatCategory(c))}</option>`).join('');
  if ($('category-filter')) $('category-filter').innerHTML = options;
  if ($('tx-category-filter')) $('tx-category-filter').innerHTML = options;

  syncFilterPills();
}

function populateAccounts() {
  const { start, end } = bounds();
  const periodRows = state.data.filter(r => r.date >= start && r.date <= end);
  let rows = periodRows;
  if (state.type !== 'all') {
    rows = periodRows.filter(r => r.type === state.type);
  }
  const accts = [...new Set(rows.map(r => r.account).filter(a => a && a !== '—' && String(a).trim() !== ''))].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

  for (const a of state.selectedAccounts) {
    if (!accts.includes(a)) state.selectedAccounts.delete(a);
  }

  const listEl = $('acct-options-list');
  if (listEl) {
    if (!accts.length) {
      listEl.innerHTML = '<span class="empty-table" style="padding:10px 8px;font-size:12px">No accounts found.</span>';
    } else {
      listEl.innerHTML = accts.map(a => {
        const count = rows.filter(r => r.account === a).length;
        const isChecked = state.selectedAccounts.has(a);
        return `<label class="notion-option-item" data-value="${escapeHtml(a.toLowerCase())}">
          <input type="checkbox" class="notion-checkbox" data-acct="${escapeHtml(a)}" ${isChecked ? 'checked' : ''} />
          <span class="acct-pill"><span class="acct-icon">🏛</span> ${escapeHtml(a)}</span>
          <span class="notion-option-count">${count}</span>
        </label>`;
      }).join('');

      listEl.querySelectorAll('input[type="checkbox"]').forEach(chk => {
        chk.onchange = () => {
          const acctVal = chk.dataset.acct;
          if (chk.checked) state.selectedAccounts.add(acctVal);
          else state.selectedAccounts.delete(acctVal);
          syncFilterPills();
          render();
        };
      });
    }
  }

  const options = '<option value="all">All accounts</option>' + accts.map(a => `<option value="${escapeHtml(a)}">${escapeHtml(a)}</option>`).join('');
  if ($('account-filter')) $('account-filter').innerHTML = options;
  if ($('tx-account-filter')) $('tx-account-filter').innerHTML = options;

  syncFilterPills();
}

function setTypeFilter(newType) {
  state.type = newType;
  state.selectedCategories.clear();
  state.selectedAccounts.clear();
  state.category = 'all';
  state.account = 'all';
  if ($('type-filter')) $('type-filter').value = newType;
  document.querySelectorAll('#tx-type-pills [data-tx-type]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.txType === newType);
  });
  render();
}

function setSort(newSort) {
  state.sort = newSort;
  syncSortPill();
  closeAllPopovers();
  render();
}

function toast(message) { const el=$('toast');el.textContent=message;el.classList.add('visible');setTimeout(()=>el.classList.remove('visible'),2600); }
function setFontScale(scale) {
  const num = Math.min(1.5, Math.max(0.8, Math.round(parseFloat(scale) * 100) / 100));
  document.documentElement.style.setProperty('--font-scale', String(num));
  setStorage('ledgerly-font-scale', String(num));

  const pct = `${Math.round(num * 100)}%`;
  const readout = $('font-scale-readout');
  if (readout) readout.textContent = pct;
  const pill = $('font-scale-pill');
  if (pill) pill.textContent = pct;

  document.querySelectorAll('[data-scale]').forEach(btn => {
    const btnScale = parseFloat(btn.dataset.scale);
    btn.classList.toggle('selected', Math.abs(btnScale - num) < 0.05);
  });
}

function adjustFontScale(delta) {
  const current = parseFloat(getStorage('ledgerly-font-scale', DEFAULT_SCALE));
  setFontScale(current + delta);
}

function downloadCsv(all = false) {
  const rows = all ? [...state.data].sort((a,b) => b.date - a.date) : filtered();
  if (!rows.length) {
    toast('No transactions to export.');
    return;
  }
  const csv = [
    'Date,Category,Note,Description,Account,Type,Amount',
    ...rows.map(r => [
      r.date.toISOString().slice(0, 10),
      r.category,
      r.note,
      r.description || '',
      r.account,
      r.type,
      r.amount
    ].map(v => `"${String(v).replaceAll('"', '""')}"`).join(','))
  ].join('\n');
  const filename = all ? 'ledgerly-all-transactions.csv' : 'ledgerly-filtered-transactions.csv';
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
  toast(`Exported ${rows.length.toLocaleString('en-IN')} transactions (${all ? 'All data' : 'Filtered data'})`);
}

function getStorage(key, fallback = null) {
  try { return typeof localStorage !== 'undefined' ? (localStorage.getItem(key) ?? fallback) : fallback; } catch (e) { return fallback; }
}
function setStorage(key, val) {
  try { if (typeof localStorage !== 'undefined') localStorage.setItem(key, val); } catch (e) {}
}

function setLayoutView(mode) {
  const valid = ['a', 'b', 'c'].includes(mode) ? mode : 'a';
  state.layoutView = valid;
  document.documentElement.setAttribute('data-layout-view', valid);
  setStorage('ledgerly-layout-view', valid);
  document.querySelectorAll('#view-mode-tabs [data-view-mode]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.viewMode === valid);
  });
  document.querySelectorAll('#display-layout-options [data-view-mode]').forEach(btn => {
    btn.classList.toggle('selected', btn.dataset.viewMode === valid);
  });
  if (valid === 'c') {
    setOptionCTab(state.activeTab || 'transactions');
  }
}

function setOptionCTab(tabName) {
  const valid = ['transactions', 'breakdown'].includes(tabName) ? tabName : 'transactions';
  state.activeTab = valid;
  document.documentElement.setAttribute('data-active-tab', valid);
  setStorage('ledgerly-active-c-tab', valid);
  document.querySelectorAll('#option-c-subtabs [data-c-tab]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.cTab === valid);
  });
}

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  setStorage('ledgerly-theme', theme);
  document.querySelectorAll('[data-theme]').forEach(btn => {
    if (btn.tagName === 'BUTTON') btn.classList.toggle('selected', btn.dataset.theme === theme);
  });
  if (state.data.length) render();
  else renderTable([]);
}

(function initSettings() {
  const savedTheme = getStorage('ledgerly-theme', 'ledgerly');
  setTheme(savedTheme);
  const savedScale = getStorage('ledgerly-font-scale', DEFAULT_SCALE);
  setFontScale(savedScale);
  const savedLayout = getStorage('ledgerly-layout-view', 'a');
  setLayoutView(savedLayout);
  const savedTab = getStorage('ledgerly-active-c-tab', 'transactions');
  setOptionCTab(savedTab);
})();

$('file-input').addEventListener('change', async e=>{const file=e.target.files[0];if(!file)return;if(!window.XLSX){toast('The Excel reader is still loading. Please try again.');return}try{const wb=XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:true});const sheet=wb.Sheets[wb.SheetNames[0]];const rows=XLSX.utils.sheet_to_json(sheet,{header:1,defval:''});state.data=normalizeRows(rows);if(!state.data.length)throw new Error('No usable transactions were found.');state.anchor=new Date(Math.max(...state.data.map(r=>+r.date)));state.customStart=state.data.reduce((a,r)=>a<r.date?a:r.date,state.data[0].date).toISOString().slice(0,10);state.customEnd=state.anchor.toISOString().slice(0,10);$('custom-start').value=state.customStart;$('custom-end').value=state.customEnd;populateCategories();populateAccounts();$('empty-state').classList.add('hidden');$('dashboard').classList.remove('hidden');if($('app-topbar'))$('app-topbar').classList.remove('hidden');if($('greeting-banner'))$('greeting-banner').classList.remove('hidden');if($('bottom-nav'))$('bottom-nav').classList.remove('hidden');render();toast(`${state.data.length.toLocaleString('en-IN')} transactions imported from ${file.name}`)}catch(err){toast(err.message||'Could not read that workbook.');console.error(err)}});
document.querySelectorAll('[data-period]').forEach(btn=>btn.addEventListener('click',()=>{state.period=btn.dataset.period;document.querySelectorAll('[data-period]').forEach(b=>b.classList.toggle('selected',b===btn));$('custom-dates').classList.toggle('hidden',state.period!=='custom');render()}));
$('prev-period').onclick=()=>movePeriod(-1);$('next-period').onclick=()=>movePeriod(1);
if ($('category-filter')) $('category-filter').onchange=e=>{state.selectedCategories = e.target.value === 'all' ? new Set() : new Set([e.target.value]); syncFilterPills(); render();};
if ($('account-filter')) $('account-filter').onchange=e=>{state.selectedAccounts = e.target.value === 'all' ? new Set() : new Set([e.target.value]); syncFilterPills(); render();};
if ($('type-filter')) $('type-filter').onchange=e=>{setTypeFilter(e.target.value)};
$('search').oninput=e=>{state.search=e.target.value; syncFilterPills(); render();};
$('custom-start').onchange=e=>{state.customStart=e.target.value;render();};
$('custom-end').onchange=e=>{state.customEnd=e.target.value;render();};
$('clear-category').onclick=()=>{state.selectedCategories.clear(); state.category='all'; syncFilterPills(); render();};
$('clear-data').onclick=()=>{state.data=[];state.selectedCategories.clear();state.selectedAccounts.clear();state.category='all';state.account='all';$('dashboard').classList.add('hidden');if($('app-topbar'))$('app-topbar').classList.add('hidden');if($('greeting-banner'))$('greeting-banner').classList.add('hidden');if($('bottom-nav'))$('bottom-nav').classList.add('hidden');if($('display-settings'))$('display-settings').classList.add('hidden');$('empty-state').classList.remove('hidden');$('file-input').value='';toast('Workspace cleared');};
document.querySelectorAll('#tx-type-pills [data-tx-type]').forEach(btn=>{btn.onclick=()=>setTypeFilter(btn.dataset.txType);});

// ── Notion Filter & Sort Controls Listeners ──
if ($('sort-pill')) {
  $('sort-pill').onclick = (e) => {
    e.stopPropagation();
    const pop = $('sort-popover');
    const opening = pop.classList.contains('hidden');
    closeAllPopovers();
    if (opening) {
      pop.classList.remove('hidden');
      $('sort-pill').setAttribute('aria-expanded', 'true');
    }
  };
}
document.querySelectorAll('#sort-popover [data-sort]').forEach(btn => {
  btn.onclick = (e) => {
    e.stopPropagation();
    setSort(btn.dataset.sort);
  };
});

// Category Pill Toggle
if ($('cat-pill')) {
  $('cat-pill').onclick = (e) => {
    e.stopPropagation();
    const pop = $('cat-popover');
    const opening = pop.classList.contains('hidden');
    closeAllPopovers();
    if (opening) {
      pop.classList.remove('hidden');
      $('cat-pill').setAttribute('aria-expanded', 'true');
      if ($('cat-search-input')) {
        $('cat-search-input').value = '';
        $('cat-search-input').focus();
        document.querySelectorAll('#cat-options-list .notion-option-item').forEach(i => i.style.display = 'flex');
      }
    }
  };
}
if ($('cat-search-input')) {
  $('cat-search-input').onclick = (e) => e.stopPropagation();
  $('cat-search-input').oninput = (e) => {
    const q = e.target.value.toLowerCase().trim();
    document.querySelectorAll('#cat-options-list .notion-option-item').forEach(item => {
      const val = item.dataset.value || '';
      item.style.display = (!q || val.includes(q)) ? 'flex' : 'none';
    });
  };
}
if ($('cat-clear-btn')) {
  $('cat-clear-btn').onclick = (e) => {
    e.stopPropagation();
    state.selectedCategories.clear();
    state.category = 'all';
    populateCategories();
    render();
  };
}

// Account Pill Toggle
if ($('acct-pill')) {
  $('acct-pill').onclick = (e) => {
    e.stopPropagation();
    const pop = $('acct-popover');
    const opening = pop.classList.contains('hidden');
    closeAllPopovers();
    if (opening) {
      pop.classList.remove('hidden');
      $('acct-pill').setAttribute('aria-expanded', 'true');
      if ($('acct-search-input')) {
        $('acct-search-input').value = '';
        $('acct-search-input').focus();
        document.querySelectorAll('#acct-options-list .notion-option-item').forEach(i => i.style.display = 'flex');
      }
    }
  };
}
if ($('acct-search-input')) {
  $('acct-search-input').onclick = (e) => e.stopPropagation();
  $('acct-search-input').oninput = (e) => {
    const q = e.target.value.toLowerCase().trim();
    document.querySelectorAll('#acct-options-list .notion-option-item').forEach(item => {
      const val = item.dataset.value || '';
      item.style.display = (!q || val.includes(q)) ? 'flex' : 'none';
    });
  };
}
if ($('acct-clear-btn')) {
  $('acct-clear-btn').onclick = (e) => {
    e.stopPropagation();
    state.selectedAccounts.clear();
    state.account = 'all';
    populateAccounts();
    render();
  };
}

// + Filter Ghost Pill Toggle
if ($('add-filter-btn')) {
  $('add-filter-btn').onclick = (e) => {
    e.stopPropagation();
    const pop = $('add-filter-popover');
    const opening = pop.classList.contains('hidden');
    closeAllPopovers();
    if (opening) {
      pop.classList.remove('hidden');
      $('add-filter-btn').setAttribute('aria-expanded', 'true');
    }
  };
}
if ($('add-filter-cat')) {
  $('add-filter-cat').onclick = (e) => {
    e.stopPropagation();
    closeAllPopovers();
    if ($('cat-pill')) $('cat-pill').click();
  };
}
if ($('add-filter-acct')) {
  $('add-filter-acct').onclick = (e) => {
    e.stopPropagation();
    closeAllPopovers();
    if ($('acct-pill')) $('acct-pill').click();
  };
}

// Reset Filter Button
if ($('notion-reset-filters')) {
  $('notion-reset-filters').onclick = () => {
    state.selectedCategories.clear();
    state.selectedAccounts.clear();
    state.category = 'all';
    state.account = 'all';
    state.search = '';
    if ($('search')) $('search').value = '';
    state.sort = 'date-desc';
    closeAllPopovers();
    syncSortPill();
    syncFilterPills();
    render();
    toast('Filters and sort reset');
  };
}

// Topbar Export CSV Toggle
if ($('export-toggle-btn')) {
  $('export-toggle-btn').onclick = (e) => {
    e.stopPropagation();
    const menu = $('export-menu');
    const opening = menu.classList.contains('hidden');
    closeAllPopovers();
    if (opening) {
      menu.classList.remove('hidden');
      $('export-toggle-btn').setAttribute('aria-expanded', 'true');
      const filteredCount = filtered().length;
      const allCount = state.data.length;
      if ($('export-filtered-count')) $('export-filtered-count').textContent = `${filteredCount.toLocaleString('en-IN')} transaction${filteredCount === 1 ? '' : 's'}`;
      if ($('export-all-count')) $('export-all-count').textContent = `${allCount.toLocaleString('en-IN')} transaction${allCount === 1 ? '' : 's'}`;
    }
  };
}
if ($('export-filtered-btn')) {
  $('export-filtered-btn').onclick = (e) => {
    e.stopPropagation();
    closeAllPopovers();
    downloadCsv(false);
  };
}
if ($('export-all-btn')) {
  $('export-all-btn').onclick = (e) => {
    e.stopPropagation();
    closeAllPopovers();
    downloadCsv(true);
  };
}

// Global click & Escape to dismiss popovers
document.addEventListener('click', (e) => {
  if (!e.target.closest('.notion-pill-wrap') && !e.target.closest('.export-dropdown-wrap')) {
    closeAllPopovers();
  }
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeAllPopovers();
});
$('display-toggle').onclick=()=>{ const panel=$('display-settings'); const opening=panel.classList.contains('hidden'); panel.classList.toggle('hidden'); $('display-toggle').setAttribute('aria-expanded',String(opening)); };
if ($('font-dec')) $('font-dec').onclick = () => adjustFontScale(-0.1);
if ($('font-inc')) $('font-inc').onclick = () => adjustFontScale(+0.1);
document.querySelectorAll('[data-scale]').forEach(button=>button.onclick=()=>setFontScale(button.dataset.scale));
document.querySelectorAll('#theme-options [data-theme]').forEach(button => button.onclick = () => setTheme(button.dataset.theme));
document.querySelectorAll('#view-mode-tabs [data-view-mode]').forEach(btn => {
  btn.onclick = () => setLayoutView(btn.dataset.viewMode);
});
document.querySelectorAll('#display-layout-options [data-view-mode]').forEach(btn => {
  btn.onclick = () => setLayoutView(btn.dataset.viewMode);
});
document.querySelectorAll('#option-c-subtabs [data-c-tab]').forEach(btn => {
  btn.onclick = () => setOptionCTab(btn.dataset.cTab);
});
const navTargets = { overview: 'dashboard', spending: 'spending-section', transactions: 'transactions-section', planner: 'planner-section' };
document.querySelectorAll('[data-nav]').forEach(button => button.onclick = () => { const target = $(navTargets[button.dataset.nav]); if (!target || target.classList.contains('hidden')) return; document.querySelectorAll('[data-nav]').forEach(item => item.classList.toggle('active', item.dataset.nav === button.dataset.nav)); button.classList.remove('pulse'); requestAnimationFrame(() => button.classList.add('pulse')); target.scrollIntoView({ behavior: 'smooth', block: 'start' }); if (button.dataset.nav === 'transactions') setTimeout(() => $('search').focus({ preventScroll: true }), 450); });
