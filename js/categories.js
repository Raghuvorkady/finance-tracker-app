/**
 * Category Styling, Palettes, Notion Icons & Category Formatting
 */

export const NOTION_NAMED_COLORS = {
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
  travel: { bg: '#e8deee', fg: '#472459' },
  flight: { bg: '#e8deee', fg: '#472459' },
  vacation: { bg: '#e8deee', fg: '#472459' },
  transport: { bg: '#d3e5ef', fg: '#183347' },
  metro: { bg: '#d3e5ef', fg: '#183347' },
  fuel: { bg: '#d3e5ef', fg: '#183347' },
  petrol: { bg: '#d3e5ef', fg: '#183347' },
  cab: { bg: '#d3e5ef', fg: '#183347' },
  uber: { bg: '#d3e5ef', fg: '#183347' },
  ola: { bg: '#d3e5ef', fg: '#183347' },
  health: { bg: '#ffe2dd', fg: '#933835' },
  medical: { bg: '#ffe2dd', fg: '#933835' },
  doctor: { bg: '#ffe2dd', fg: '#933835' },
  pharmacy: { bg: '#ffe2dd', fg: '#933835' },
  fitness: { bg: '#dbeddb', fg: '#1c3829' },
  gym: { bg: '#dbeddb', fg: '#1c3829' },
  personal: { bg: '#f5e0e9', fg: '#692943' },
  beauty: { bg: '#f5e0e9', fg: '#692943' },
  shopping: { bg: '#f5e0e9', fg: '#692943' },
  clothing: { bg: '#f5e0e9', fg: '#692943' },
  clothes: { bg: '#f5e0e9', fg: '#692943' },
  bills: { bg: '#fdecc8', fg: '#402c1b' },
  electricity: { bg: '#fdecc8', fg: '#402c1b' },
  water: { bg: '#fdecc8', fg: '#402c1b' },
  wifi: { bg: '#fdecc8', fg: '#402c1b' },
  internet: { bg: '#fdecc8', fg: '#402c1b' },
  salary: { bg: '#dbeddb', fg: '#1c3829' },
  income: { bg: '#dbeddb', fg: '#1c3829' },
  freelance: { bg: '#dbeddb', fg: '#1c3829' },
  bonus: { bg: '#dbeddb', fg: '#1c3829' },
  interest: { bg: '#dbeddb', fg: '#1c3829' },
  dividend: { bg: '#dbeddb', fg: '#1c3829' },
  refund: { bg: '#dbeddb', fg: '#1c3829' },
  transfer: { bg: '#f1f0ef', fg: '#555452' },
  investment: { bg: '#f5e0e9', fg: '#692943' }
};

export const NOTION_PALETTE = [
  { bg: '#faeccd', fg: '#89632a' },
  { bg: '#ffe2dd', fg: '#933835' },
  { bg: '#d3e5ef', fg: '#183347' },
  { bg: '#e3e2e0', fg: '#32302c' },
  { bg: '#dbeddb', fg: '#1c3829' },
  { bg: '#e8deee', fg: '#472459' },
  { bg: '#f5e0e9', fg: '#692943' },
  { bg: '#fdecc8', fg: '#402c1b' }
];

export function categoryColor(name) {
  const clean = String(name || '').toLowerCase().trim();
  for (const [key, val] of Object.entries(NOTION_NAMED_COLORS)) {
    if (clean.includes(key)) return val;
  }
  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = (clean.charCodeAt(i) + ((hash << 5) - hash)) | 0;
  }
  return NOTION_PALETTE[Math.abs(hash) % NOTION_PALETTE.length];
}

export function formatCategory(name) {
  if (!name) return 'Uncategorized';
  const s = String(name).trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export const NOTION_KEYWORD_ICONS = [
  { key: 'swiggy', icon: '🍲' }, { key: 'zomato', icon: '🍲' }, { key: 'blinkit', icon: '🥦' },
  { key: 'zepto', icon: '🥦' }, { key: 'instamart', icon: '🥦' }, { key: 'amazon', icon: '📦' },
  { key: 'flipkart', icon: '🛍' }, { key: 'uber', icon: '🚗' }, { key: 'ola', icon: '🚕' },
  { key: 'netflix', icon: '🍿' }, { key: 'prime', icon: '🎬' }, { key: 'spotify', icon: '🎵' },
  { key: 'hotstar', icon: '📺' }, { key: 'youtube', icon: '▶' }, { key: 'starbucks', icon: '☕' },
  { key: 'coffee', icon: '☕' }, { key: 'chai', icon: '☕' }, { key: 'tea', icon: '☕' },
  { key: 'fuel', icon: '⛽' }, { key: 'petrol', icon: '⛽' }, { key: 'diesel', icon: '⛽' },
  { key: 'movie', icon: '🎬' }, { key: 'cinema', icon: '🍿' }, { key: 'bookmyshow', icon: '🎟' },
  { key: 'metro', icon: '🚇' }, { key: 'flight', icon: '✈' }, { key: 'train', icon: '🚆' },
  { key: 'hotel', icon: '🏨' }, { key: 'gym', icon: '💪' }, { key: 'cult', icon: '💪' },
  { key: 'pharmacy', icon: '💊' }, { key: 'medicine', icon: '💊' }, { key: 'hospital', icon: '🏥' },
  { key: 'doctor', icon: '🩺' }, { key: 'salary', icon: '💰' }, { key: 'dividend', icon: '📈' },
  { key: 'interest', icon: '🏦' }, { key: 'rent', icon: '🏠' }, { key: 'electricity', icon: '⚡' },
  { key: 'bescom', icon: '⚡' }, { key: 'water', icon: '💧' }, { key: 'gas', icon: '🔥' },
  { key: 'wifi', icon: '📶' }, { key: 'internet', icon: '🌐' }, { key: 'broadband', icon: '🌐' },
  { key: 'recharge', icon: '📱' }, { key: 'airtel', icon: '📱' }, { key: 'jio', icon: '📱' },
  { key: 'credit card', icon: '💳' }, { key: 'emi', icon: '📆' }, { key: 'loan', icon: '🏦' },
  { key: 'transfer', icon: '🔄' }, { key: 'savings', icon: '🐷' }, { key: 'investment', icon: '📊' },
  { key: 'mutual fund', icon: '📈' }, { key: 'sip', icon: '📈' }, { key: 'stocks', icon: '📊' },
  { key: 'zerodha', icon: '📊' }, { key: 'groww', icon: '📊' }
];

export function getNotionIcon(title, category) {
  const t = String(title || '').toLowerCase();
  const c = String(category || '').toLowerCase();
  for (const pair of NOTION_KEYWORD_ICONS) {
    if (t.includes(pair.key) || c.includes(pair.key)) return pair.icon;
  }
  if (c.includes('food') || c.includes('dinner') || c.includes('lunch') || c.includes('breakfast')) return '🍽';
  if (c.includes('grocer') || c.includes('vegetable')) return '🥦';
  if (c.includes('travel') || c.includes('vacation')) return '🧳';
  if (c.includes('transport') || c.includes('auto') || c.includes('cab')) return '🚕';
  if (c.includes('shop') || c.includes('cloth')) return '🛍';
  if (c.includes('home') || c.includes('house') || c.includes('furnish')) return '🏠';
  if (c.includes('health') || c.includes('medical')) return '🩺';
  if (c.includes('entertain') || c.includes('game')) return '🎮';
  if (c.includes('bill') || c.includes('utility')) return '🧾';
  if (c.includes('education') || c.includes('book') || c.includes('school')) return '📚';
  if (c.includes('salary') || c.includes('income')) return '💰';
  if (c.includes('transfer')) return '🔄';
  return '📄';
}

export function splitCategoryEmoji(rawName) {
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

export function categoryPill(name) {
  const isNotion = typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'notion';
  const display = formatCategory(name);
  if (!isNotion) return `<span class="category-cell">${display}</span>`;
  const c = categoryColor(name);
  return `<span class="cat-pill" style="background:${c.bg};color:${c.fg}">${display}</span>`;
}
