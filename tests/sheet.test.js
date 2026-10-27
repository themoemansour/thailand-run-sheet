import test from 'node:test';
import assert from 'node:assert/strict';
import { summarize, chargeShares, rowProblem, toCsv } from '../src/assets/js/lib/sheet-math.js';
import { SEED } from '../src/assets/js/lib/sheet-store.js';

const ledger = SEED.filter(r => r.tab === 'ledger').map(r => r.data);
const close = (a, b) => assert.ok(Math.abs(a - b) < 0.005, `${a} != ${b}`);

test('seed rows reproduce the workbook Summary tab', () => {
  const s = summarize({ ledger, rate: 33.5 });
  close(s.total, 3863.55);
  close(s.average, 643.925);
  const expected = { Moe: -249.758333, Zain: -615.758333, Sepehr: 2445.541667, Zach: -264.008333, Erfan: -658.008333, Khader: -658.008333 };
  for (const [name, balance] of Object.entries(expected)) close(s.people[name].balance, balance);
  close(s.settle.reduce((a, t) => a + t.amt, 0), 2445.54);
  assert.ok(s.settle.every(t => t.to === 'Sepehr'));
});

test('payments, THB and double shares adjust balances', () => {
  const s = summarize({
    ledger: [{ amount: 3350, currency: 'THB', paidBy: 'Moe', category: 'Nightlife', shares: { Moe: 1, Zach: 2 } }],
    payments: [{ from: 'Zach', to: 'Moe', amount: 50, currency: 'USD' }],
    rate: 33.5,
  });
  close(s.total, 100);
  close(s.people.Zach.cost, 66.6667);
  close(s.people.Zach.balance, -16.6667);
  close(s.people.Moe.balance, 16.6667);
  assert.deepEqual(s.settle.map(t => [t.from, t.to]), [['Zach', 'Moe']]);
});

test('row problems and CSV escaping', () => {
  assert.equal(rowProblem({ amount: 10, shares: { Moe: 1 } }), 'Who paid?');
  assert.equal(rowProblem({ amount: 10, paidBy: 'Moe', shares: {} }), "Mark who's in");
  assert.equal(chargeShares({ amount: 10, shares: {} }, 33.5).totalShares, 0);
  assert.equal(toCsv([['a,b', 'say "hi"']]), '"a,b","say ""hi"""');
});
