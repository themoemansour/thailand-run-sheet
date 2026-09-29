import { DEFAULT_SETTINGS } from './data.js';
import { hotelTotals, cashTotals } from './calculations.js';
import { $, money, baht, pts } from './ui.js';

const NUMS = ['ptNights','ptRate','ptPts','phNights','phRate','phPts','bkNights','bkRate','bkPts','balUR','balMR','cDays','cDaily','cActs','cFee'];
const fields = new Map();
let activeStore;

function fieldValue(el, key) { return el.type === 'checkbox' ? el.checked : key === 'mode' ? el.value : Number(el.value); }
function paintField(el, value) { if (el.type === 'checkbox') el.checked = !!value; else el.value = String(value); }
function valueFor(key) {
  const field = fields.get(key);
  return field ? fieldValue(field.el, key) : activeStore.state.settings[key] ?? DEFAULT_SETTINGS[key];
}
function settingsView() {
  const values = { ...DEFAULT_SETTINGS, ...activeStore.state.settings };
  for (const key of fields.keys()) values[key] = valueFor(key);
  return values;
}
function render() {
  if ($('rows')) renderHotels(settingsView());
  document.querySelectorAll('#todo li').forEach(li => li.classList.toggle('checked', !!li.querySelector('input')?.checked));
}
function renderHotels(v) {
  const t = hotelTotals(v);
  for (const b of t.bookings) {
    const row = document.querySelector(`#rows tr[data-id="${b.id}"]`);
    if (!row) continue;
    row.querySelector('.oop').textContent = money(b.net);
    row.classList.toggle('done', !!v[`${b.id}.done`]);
    const span = Math.max(b.cost, b.cap) || 1;
    row.querySelector('.b-credit').style.width = `${b.applied / span * 100}%`;
    row.querySelector('.b-cash').style.width = `${b.net / span * 100}%`;
    row.querySelector('.b-waste').style.width = `${b.waste / span * 100}%`;
    const key = row.querySelector('.barkey');
    key.textContent = b.waste > 0 ? `${money(b.waste)} of credit wasted — book up a room category` : `${money(b.applied)} covered · ${money(b.net)} on you`;
    key.classList.toggle('warn', b.waste > 0);
  }
  for (const c of t.cities) {
    $(`${c.prefix}Label`).textContent = t.points ? 'Points required' : 'Cash required';
    $(`${c.prefix}Total`).textContent = t.points ? `${pts(c.need)} pts` : money(c.cash);
  }
  const ur = Number(v.balUR) || 0;
  $('ptsNeed').textContent = `${pts(t.uNeed)} pts`;
  const verdict = $('ptsVerdict');
  if (!t.points) { verdict.className = 'verdict'; verdict.textContent = 'Cash mode. Points untouched.'; }
  else if (!ur) { verdict.className = 'verdict'; verdict.textContent = 'Enter your Ultimate Rewards balance to check coverage.'; }
  else if (ur >= t.uNeed) { verdict.className = 'verdict ok'; verdict.textContent = `Covered, with ${pts(ur - t.uNeed)} UR to spare.`; }
  else {
    const short = t.uNeed - ur;
    const blended = t.cities.reduce((n, c) => n + c.per, 0) / 3;
    const blendedRate = t.cities.reduce((n, c) => n + c.rate, 0) / 3;
    verdict.className = 'verdict bad';
    verdict.textContent = `${pts(short)} UR short — roughly ${money(blended > 0 ? short / blended * blendedRate : 0)} falls back to cash.`;
  }
  $('fCredit').textContent = money(t.statement + t.property + t.travel);
  $('fCash').textContent = money(t.total);
  $('fWaste').textContent = money(t.wasted);
  $('fWaste').className = `fig${t.wasted > 0 ? ' saffron' : ''}`;
  $('fDone').textContent = `${t.done}/${t.bookings.length}`;
  $('fPer').textContent = money(t.per);
  $('fPerSub').textContent = t.points ? `${pts(t.uNeed)} UR alongside` : 'after credits, all cash';
  $('pNum').textContent = v.party;
  $('mCash').setAttribute('aria-pressed', String(!t.points));
  $('mPoints').setAttribute('aria-pressed', String(t.points));
  const c = cashTotals(v);
  $('cTotal').textContent = baht(c.total);
  $('cUSD').textContent = money(c.usd);
  $('cPulls').textContent = c.pulls;
  $('cFees').textContent = baht(c.fees);
}
function retryControl() {
  let button = $('retrySettings');
  if (!button) {
    button = document.createElement('button');
    button.id = 'retrySettings'; button.type = 'button'; button.className = 'btn ghost';
    button.textContent = 'Retry unsaved settings'; button.hidden = true;
    ($('rows')?.parentElement || $('todo')?.parentElement || document.body).append(button);
  }
  if (!button.dataset.retryBound) {
    button.addEventListener('click', () => { void flushSettings(); });
    button.dataset.retryBound = 'true';
  }
  button.hidden = ![...fields.values()].some(f => f.failed);
  let note = $('settingsValidation');
  if (!note && [...fields.values()].some(f => f.el.type === 'number')) {
    note = document.createElement('p'); note.id = 'settingsValidation'; note.className = 'note';
    note.setAttribute('role', 'status'); button.parentElement.after(note);
  }
  if (note) note.textContent = [...fields.values()].some(f => f.validationError)
    ? 'Not saved: correct the highlighted number, then retry.' : '';
}
function track(key, el) {
  const field = { el, dirty: false, failed: false, writing: null, revision: 0, validationError: false };
  fields.set(key, field);
  el.dataset.setting = key;
  const edit = () => {
    field.dirty = true; field.failed = false; field.validationError = false; field.revision++;
    el.removeAttribute('aria-invalid'); el.setCustomValidity?.(''); retryControl(); render();
  };
  if (el.type === 'number') {
    el.addEventListener('input', edit);
    el.addEventListener('change', () => { edit(); void saveField(key); });
    el.addEventListener('blur', () => {
      if (field.dirty) void saveField(key);
      else if (!field.writing) { paintField(el, activeStore.state.settings[key] ?? DEFAULT_SETTINGS[key]); render(); }
    });
  } else {
    el.addEventListener('change', () => { edit(); void saveField(key); });
  }
}
async function saveField(key) {
  const f = fields.get(key);
  if (!f?.dirty || f.writing || !activeStore.ready) return false;
  const value = fieldValue(f.el, key), rev = f.revision;
  if (f.el.type === 'number' && (!Number.isFinite(value) || f.el.value === '' || !f.el.validity.valid)) {
    f.failed = true; f.validationError = true;
    f.el.setAttribute('aria-invalid', 'true');
    if (f.el.value === '' || !Number.isFinite(value)) f.el.setCustomValidity('Enter a valid number.');
    f.el.reportValidity(); retryControl(); return false;
  }
  f.writing = activeStore.setSetting(key, value);
  let accepted = false;
  try {
    await f.writing;
    accepted = true;
    if (f.revision === rev) { f.dirty = false; f.failed = false; f.validationError = false; }
  } catch (_) { f.failed = true; }
  finally {
    f.writing = null;
    if (accepted && !f.dirty && document.activeElement !== f.el) {
      paintField(f.el, activeStore.state.settings[key] ?? DEFAULT_SETTINGS[key]);
    }
    retryControl(); render();
    if (accepted && f.dirty && f.revision !== rev) void saveField(key);
  }
  return !f.dirty;
}
export function hasUnsavedSettings() {
  return [...fields.values()].some(f => f.dirty || !!f.writing);
}
export async function flushSettings() {
  if (!activeStore) return true;
  const keys = [...fields].filter(([, f]) => f.dirty || f.writing).map(([key]) => key);
  await Promise.all(keys.map(async key => {
    const f = fields.get(key);
    for (let i = 0; i < 20 && (f.dirty || f.writing); i++) {
      if (f.writing) { await f.writing.catch(() => {}); await Promise.resolve(); continue; }
      if (f.failed && i > 0) break;
      await saveField(key);
      if (f.failed) break;
    }
  }));
  return !hasUnsavedSettings();
}
export function initSettings(store) {
  activeStore = store;
  for (const key of NUMS) { const el = $(key); if (el) track(key, el); }
  if ($('travelCredit')) track('travelCredit', $('travelCredit'));
  for (const row of document.querySelectorAll('#rows tr[data-id]')) {
    for (const [suffix, selector] of [['cost','.cost'],['done','.done']]) track(`${row.dataset.id}.${suffix}`, row.querySelector(selector));
  }
  document.querySelectorAll('[data-setting^="check."]').forEach(el => track(el.dataset.setting, el));
  if ($('mCash')) {
    const mode = { el: { value: 'cash' }, dirty: false, failed: false, writing: null, revision: 0 };
    fields.set('mode', mode);
    const party = { el: { value: '5' }, dirty: false, failed: false, writing: null, revision: 0 };
    fields.set('party', party);
    const choose = (key, value) => { const f = fields.get(key); f.el.value = String(value); f.dirty = true; f.revision++; render(); void saveField(key); };
    $('mCash').addEventListener('click', () => choose('mode', 'cash'));
    $('mPoints').addEventListener('click', () => choose('mode', 'points'));
    $('pMinus').addEventListener('click', () => choose('party', Math.max(1, Number(valueFor('party')) - 1)));
    $('pPlus').addEventListener('click', () => choose('party', Math.min(12, Number(valueFor('party')) + 1)));
  }
  retryControl();
  store.subscribe(state => {
    for (const [key, f] of fields) {
      if (f.dirty || f.writing || document.activeElement === f.el) continue;
      paintField(f.el, state.settings[key] ?? DEFAULT_SETTINGS[key]);
    }
    render();
  });
}
