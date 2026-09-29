import { CREW, RATE, ATM_MAX } from '../data/trip.js';

export function hotelTotals(values) {
  const points = values.mode === 'points';
  let statement = 0, property = 0, cash = 0, wasted = 0, done = 0;
  const bookings = ['b1', 'b2', 'b3'].map((id, i) => {
    const cap = [500, 250, 300][i], prop = [0, 0, 200][i];
    const cost = Number(values[`${id}.cost`]) || 0;
    const applied = Math.min(cap, cost), waste = cap - applied, net = cost - applied;
    statement += applied; property += prop; cash += net; wasted += waste;
    if (values[`${id}.done`]) done++;
    return { id, cap, prop, cost, applied, waste, net };
  });
  const cities = ['pt', 'ph', 'bk'].map(prefix => {
    const n = Number(values[`${prefix}Nights`]) || 0;
    const rate = Number(values[`${prefix}Rate`]) || 0;
    const per = Number(values[`${prefix}Pts`]) || 0;
    return { prefix, cash: points ? 0 : n * rate, need: points ? n * per : 0, rate, per };
  });
  const uCash = cities.reduce((n, c) => n + c.cash, 0);
  const uNeed = cities.reduce((n, c) => n + c.need, 0);
  const travel = values.travelCredit ? 300 : 0;
  const total = cash + uCash;
  return { points, bookings, cities, statement, property, cash, wasted, done, uCash, uNeed,
    travel, total, net: Math.max(0, total - property - travel), per: Math.max(0, total - property - travel) / (Number(values.party) || 5) };
}

export function cashTotals(values) {
  const total = (Number(values.cDays) || 0) * (Number(values.cDaily) || 0) + (Number(values.cActs) || 0);
  const pulls = Math.ceil(total / ATM_MAX) || 0;
  return { total, usd: total / RATE, pulls, fees: pulls * (Number(values.cFee) || 0) };
}

export function balances(expenses) {
  const bal = Object.fromEntries(CREW.map(n => [n, 0]));
  for (const e of expenses) {
    if (!Array.isArray(e.split) || !e.split.length) continue;
    bal[e.payer] += e.amount_thb;
    for (const n of e.split) bal[n] -= e.amount_thb / e.split.length;
  }
  return bal;
}

export function settleUp(bal) {
  const cred = [], deb = [];
  for (const [n, raw] of Object.entries(bal)) {
    const v = Math.round(raw * 100) / 100;
    if (v > 0.5) cred.push({ n, v });
    else if (v < -0.5) deb.push({ n, v: -v });
  }
  cred.sort((a, b) => b.v - a.v);
  deb.sort((a, b) => b.v - a.v);
  const out = [];
  let i = 0, j = 0, guard = 0;
  while (i < deb.length && j < cred.length && guard++ < 300) {
    const amt = Math.min(deb[i].v, cred[j].v);
    out.push({ from: deb[i].n, to: cred[j].n, amt });
    deb[i].v -= amt; cred[j].v -= amt;
    if (deb[i].v < 0.5) i++;
    if (cred[j].v < 0.5) j++;
  }
  return out;
}
