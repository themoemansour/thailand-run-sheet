import { ACTS, CREW, DAYS, SLOTS } from '../data/trip.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const dayIds = new Set(DAYS.map(d => d.id));
const slotIds = new Set(SLOTS.map(s => s[0]));
const cityIds = new Set(['pattaya','phuket','bangkok','travel']);
const activities = new Map(ACTS.map(a => [a.id, a]));
const fail = message => { throw new Error(message); };
const object = v => v && typeof v === 'object' && !Array.isArray(v);
const finiteNonnegative = v => typeof v === 'number' && Number.isFinite(v) && v >= 0;
const text = (v, label, max = 500) => typeof v === 'string' && v.trim() && v.length <= max ? v : fail(`Invalid ${label}.`);
const date = v => typeof v === 'string' && !Number.isNaN(Date.parse(v)) ? v : fail('Invalid date.');

// Stable 128-bit hash for old IDs. This is identity normalization, not a security primitive.
export function legacyUuid(kind, identity) {
  const input = `${kind}\u0000${identity}`;
  function hash(seed) {
    let value = seed;
    for (const c of input) { value ^= BigInt(c.codePointAt(0)); value = BigInt.asUintN(64, value * 0x100000001b3n); }
    return value.toString(16).padStart(16, '0');
  }
  const hex = hash(0xcbf29ce484222325n) + hash(0x84222325cbf29ce4n);
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-5${hex.slice(13,16)}-a${hex.slice(17,20)}-${hex.slice(20,32)}`;
}

function placement(p) {
  if (!object(p) || !UUID.test(p.id) || !dayIds.has(p.day_id) || !slotIds.has(p.slot)) fail('Invalid calendar entry.');
  const activity_id = p.activity_id === null ? null : text(p.activity_id, 'activity ID', 80);
  if (activity_id !== null && !activities.has(activity_id)) fail('Unknown catalogue activity.');
  const title = text(p.title, 'calendar title', 200);
  if (!finiteNonnegative(p.cost_low) || !finiteNonnegative(p.cost_high) || p.cost_high < p.cost_low || p.cost_high > 100000000) fail('Invalid calendar cost.');
  const city = text(p.city, 'city', 100);
  if (!cityIds.has(city)) fail('Invalid calendar city.');
  if (!Number.isSafeInteger(p.sort_order) || p.sort_order < 0) fail('Invalid calendar order.');
  return { id:p.id.toLowerCase(), day_id:p.day_id, slot:p.slot, activity_id, title, cost_low:p.cost_low, cost_high:p.cost_high, city,
    sort_order:p.sort_order, ...(p.created_at == null ? {} : { created_at:date(p.created_at) }) };
}
function expense(e) {
  if (!object(e) || !UUID.test(e.id)) fail('Invalid expense ID.');
  const description = text(e.description, 'expense description');
  if (!finiteNonnegative(e.amount_thb) || e.amount_thb <= 0 || e.amount_thb > 1000000000 || !CREW.includes(e.payer)) fail('Invalid expense.');
  if (!Array.isArray(e.split) || !e.split.length || new Set(e.split).size !== e.split.length || !e.split.every(n => CREW.includes(n))) fail('Invalid expense split.');
  return { id:e.id.toLowerCase(), description, amount_thb:e.amount_thb, payer:e.payer, split:e.split.slice(),
    ...(e.created_at == null ? {} : { created_at:date(e.created_at) }) };
}
function unique(records, label) {
  const ids = new Set();
  for (const record of records) { if (ids.has(record.id)) fail(`Duplicate ${label} ID in code.`); ids.add(record.id); }
  return records;
}
function normalizeV1(d) {
  if (!object(d.plan) || !object(d.custom) || !Array.isArray(d.ledger)) fail('Invalid old sharing code.');
  const placements = [];
  for (const [dayId, slots] of Object.entries(d.plan)) {
    if (!dayIds.has(dayId) || !object(slots)) fail('Invalid old calendar day.');
    for (const [slot, ids] of Object.entries(slots)) {
      if (!slotIds.has(slot) || !Array.isArray(ids)) fail('Invalid old calendar slot.');
      const occurrence = new Map();
      ids.forEach((oldId, sort_order) => {
        text(oldId, 'old activity ID', 100);
        const act = activities.get(oldId) || d.custom[oldId];
        if (!object(act)) fail('Unknown old calendar activity.');
        const title = text(act.nm, 'old activity title');
        if (!Array.isArray(act.cost) || act.cost.length !== 2 || !act.cost.every(finiteNonnegative) || act.cost[1] < act.cost[0]) fail('Invalid old activity cost.');
        const city = text(act.city, 'old activity city', 100);
        const count = occurrence.get(oldId) || 0;
        occurrence.set(oldId, count + 1);
        placements.push(placement({ id:legacyUuid('placement', `${dayId}\u0000${slot}\u0000${oldId}\u0000${count}`), day_id:dayId,
          slot, activity_id:activities.has(oldId) ? oldId : null, title, cost_low:act.cost[0], cost_high:act.cost[1], city, sort_order }));
      });
    }
  }
  const expenses = d.ledger.map(e => {
    if (!object(e)) fail('Invalid old expense.');
    const oldId = text(e.id, 'old expense ID', 200);
    return expense({ id:legacyUuid('expense', oldId), description:e.desc, amount_thb:e.thb, payer:e.payer, split:e.split,
      ...(e.ts == null ? {} : { created_at:date(new Date(e.ts).toISOString()) }) });
  });
  if (placements.length > 1000 || expenses.length > 1000) fail('Sharing code has too many records.');
  return { placements:unique(placements,'calendar'), expenses:unique(expenses,'expense') };
}
export function parseSharing(raw) {
  if (typeof raw !== 'string' || raw.length > 2_000_000) fail('Sharing code is too large.');
  let d;
  try { d = JSON.parse(raw); } catch (_) { fail("That isn't a valid code — copy the whole block, braces included."); }
  if (!object(d)) fail('Invalid sharing code.');
  if (d.v === 1) return normalizeV1(d);
  if (d.v !== 2 || !Array.isArray(d.placements) || !Array.isArray(d.expenses)) fail('Unsupported sharing code version.');
  if (d.placements.length > 1000 || d.expenses.length > 1000) fail('Sharing code has too many records.');
  return { placements:unique(d.placements.map(placement),'calendar'), expenses:unique(d.expenses.map(expense),'expense') };
}
export function formatSharing(state) {
  return JSON.stringify({ v:2, placements:unique(state.placements.map(placement),'calendar'), expenses:unique(state.expenses.map(expense),'expense') });
}
