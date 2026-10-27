// Pure calculations for the trip sheet. Mirrors the Thailand_Trip_Cost_Split workbook.
export const SHEET_PEOPLE = ['Moe', 'Zain', 'Sepehr', 'Zach', 'Erfan', 'Khader'];
export const SHEET_CATEGORIES = [
  'Hotel', 'Food & Drinks', 'Nightlife', 'Excursions & Activities', 'Domestic Flights',
  'Ferries & Long-Distance', 'Local Transport (Grab/Taxi)', 'Shopping', 'Fees & Visas', 'Other',
];
export const SHEET_METHODS = ['Venmo', 'Zelle', 'Cash', 'Apple Pay', 'PayPal', 'Other'];
export const DEFAULT_RATE = 33.5;

const num = v => (Number.isFinite(Number(v)) && v !== '' && v !== null ? Number(v) : 0);

export function toUsd(amount, currency, rate) {
  const value = num(amount);
  return currency === 'THB' ? (num(rate) > 0 ? value / num(rate) : 0) : value;
}

// Each person's weighted share of one charge (1 = in, 2 = double). Empty when nobody is marked.
export function chargeShares(row, rate) {
  const usd = toUsd(row.amount, row.currency, rate);
  const weights = SHEET_PEOPLE.map(name => Math.max(0, num(row.shares?.[name])));
  const total = weights.reduce((a, w) => a + w, 0);
  return {
    usd, totalShares: total,
    perPerson: Object.fromEntries(SHEET_PEOPLE.map((name, i) => [name, total ? usd * weights[i] / total : 0])),
  };
}

export function rowProblem(row) {
  if (!num(row.amount)) return '';
  if (!row.paidBy) return 'Who paid?';
  if (!SHEET_PEOPLE.some(name => num(row.shares?.[name]) > 0)) return "Mark who's in";
  if (!row.category) return 'Pick a category';
  return '';
}

// Greedy settle-up: the biggest debtor pays the biggest creditor until everyone is within a cent.
export function settleUp(balance) {
  const left = SHEET_PEOPLE.map(name => Math.round((balance[name] || 0) * 100) / 100);
  const out = [];
  for (let guard = 0; guard < 50; guard++) {
    const min = Math.min(...left), max = Math.max(...left);
    const amt = Math.min(-min, max);
    if (!(amt >= 0.01)) break;
    const from = left.indexOf(min), to = left.indexOf(max);
    out.push({ from: SHEET_PEOPLE[from], to: SHEET_PEOPLE[to], amt });
    left[from] += amt; left[to] -= amt;
  }
  return out;
}

export function summarize({ ledger = [], payments = [], rate = DEFAULT_RATE } = {}) {
  const people = Object.fromEntries(SHEET_PEOPLE.map(name => [name, { paid: 0, cost: 0, sent: 0, received: 0 }]));
  const byCategory = {};
  let total = 0, count = 0, paidBack = 0;
  for (const row of ledger) {
    const { usd, totalShares, perPerson } = chargeShares(row, rate);
    if (!num(row.amount)) continue;
    count++; total += usd;
    if (people[row.paidBy]) people[row.paidBy].paid += usd;
    if (!totalShares) continue;
    const category = row.category || 'Other';
    byCategory[category] ||= Object.fromEntries(SHEET_PEOPLE.map(name => [name, 0]));
    for (const name of SHEET_PEOPLE) {
      people[name].cost += perPerson[name];
      byCategory[category][name] += perPerson[name];
    }
  }
  for (const p of payments) {
    const usd = toUsd(p.amount, p.currency, rate);
    if (!usd || !people[p.from] || !people[p.to] || p.from === p.to) continue;
    paidBack += usd;
    people[p.from].sent += usd;
    people[p.to].received += usd;
  }
  const balance = {};
  for (const name of SHEET_PEOPLE) {
    const p = people[name];
    p.balance = p.paid - p.cost + p.sent - p.received;
    balance[name] = p.balance;
  }
  return { total, count, paidBack, average: total / SHEET_PEOPLE.length, people, byCategory, settle: settleUp(balance) };
}

export function toCsv(rows) {
  const cell = v => {
    const s = v === undefined || v === null ? '' : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return rows.map(r => r.map(cell).join(',')).join('\r\n');
}
