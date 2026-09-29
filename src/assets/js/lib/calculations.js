import { CREW } from '../data/trip.js';

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
