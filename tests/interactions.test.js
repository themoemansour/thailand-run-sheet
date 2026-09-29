import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SETTINGS, CREW } from '../src/assets/js/data/trip.js';
import { hotelTotals, cashTotals, balances, settleUp } from '../src/assets/js/lib/calculations.js';
import { parseSharing, formatSharing, legacyUuid } from '../src/assets/js/lib/sharing-format.js';

test('hotel calculator preserves credits, cash and points arithmetic', () => {
  const cash = hotelTotals(DEFAULT_SETTINGS);
  assert.equal(cash.statement, 1050);
  assert.equal(cash.property, 200);
  assert.equal(cash.cash, 786);
  assert.equal(cash.uCash, 1965);
  assert.equal(cash.net, 2251);
  assert.equal(cash.per, 450.2);
  const points = hotelTotals({ ...DEFAULT_SETTINGS, mode:'points' });
  assert.equal(points.uNeed, 342000);
  assert.equal(points.uCash, 0);
  assert.equal(points.net, 286);
  const low = hotelTotals({ ...DEFAULT_SETTINGS, 'b1.cost': 100 });
  assert.equal(low.bookings[0].waste, 400);
  assert.equal(low.bookings[0].net, 0);
});

test('cash planning and expense settlement follow original rounding and split', () => {
  assert.deepEqual(cashTotals(DEFAULT_SETTINGS), { total:40000, usd:40000 / 35, pulls:2, fees:440 });
  const expenses = [
    { amount_thb:1050, payer:CREW[0], split:[CREW[0],CREW[1],CREW[2]] },
    { amount_thb:350, payer:CREW[1], split:[CREW[0],CREW[1]] },
  ];
  const bal = balances(expenses);
  assert.equal(bal[CREW[0]], 525);
  assert.equal(bal[CREW[1]], -175);
  assert.equal(bal[CREW[2]], -350);
  assert.equal(settleUp(bal).reduce((n,t) => n + t.amt, 0), 525);
});

test('v2 sharing round trips and rejects malformed records before any import', () => {
  const state = {
    placements:[{ id:crypto.randomUUID(), day_id:'d13', slot:'night', activity_id:null, title:'A & B', cost_low:0, cost_high:200, city:'pattaya', sort_order:0 }],
    expenses:[{ id:crypto.randomUUID(), description:'Dinner', amount_thb:1000, payer:CREW[0], split:[CREW[0],CREW[1]] }],
  };
  assert.deepEqual(parseSharing(formatSharing(state)), state);
  const bad = JSON.parse(formatSharing(state));
  bad.expenses[0].split = ['stranger'];
  assert.throws(() => parseSharing(JSON.stringify(bad)), /split/);
  bad.expenses[0].split = [CREW[0], CREW[1]];
  bad.placements[0].cost_high = -1;
  assert.throws(() => parseSharing(JSON.stringify(bad)), /cost/);
});

test('v1 repeated placements receive stable occurrence IDs and expenses remain idempotent', () => {
  const old = { v:1, plan:{ d13:{ morning:['p1','p1'], night:['custom1'] } },
    custom:{ custom1:{nm:'A custom stop', cost:[0,100], city:'pattaya'} },
    ledger:[{ id:'e123', desc:'Taxi', thb:350, payer:CREW[0], split:[CREW[0],CREW[1]], ts:1700000000000 }] };
  const once = parseSharing(JSON.stringify(old));
  const twice = parseSharing(JSON.stringify(old));
  assert.deepEqual(once, twice);
  assert.equal(new Set(once.placements.map(p => p.id)).size, 3);
  assert.equal(once.placements[2].activity_id, null);
  assert.match(legacyUuid('expense', 'e123'), /^[0-9a-f-]{36}$/);
  old.plan.d13.night.push('missing');
  assert.throws(() => parseSharing(JSON.stringify(old)), /Unknown old calendar activity/);
});
