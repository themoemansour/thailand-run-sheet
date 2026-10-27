import { $, esc, copyText } from '../lib/ui.js';
import { createSheetStore } from '../lib/sheet-store.js';
import {
  SHEET_PEOPLE, SHEET_CATEGORIES, SHEET_METHODS, chargeShares, rowProblem, summarize, toUsd, toCsv,
} from '../lib/sheet-math.js';

const usd = n => (n < 0 ? '−$' : '$') + Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const today = () => new Date().toISOString().slice(0, 10);
const options = (list, value, blank = '') =>
  (blank !== null ? `<option value="">${blank}</option>` : '') +
  list.map(v => `<option value="${esc(v)}"${v === value ? ' selected' : ''}>${esc(v)}</option>`).join('');

export function initSheet() {
  const store = createSheetStore();
  let view = store.view();
  let tab = 'ledger';
  try { tab = sessionStorage.getItem('sheet.tab') || 'ledger'; } catch { /* Default tab. */ }

  const wrap = $('sheetWrap');

  function ledgerTable() {
    const totals = Object.fromEntries(SHEET_PEOPLE.map(n => [n, 0]));
    const body = view.ledger.map(row => {
      const d = row.data;
      const { usd: amtUsd, totalShares, perPerson } = chargeShares(d, view.rate);
      for (const n of SHEET_PEOPLE) totals[n] += perPerson[n];
      const problem = rowProblem(d);
      return `<tr data-id="${esc(row.id)}" data-tab="ledger">
        <td><input type="date" data-f="date" value="${esc(d.date || '')}" aria-label="Date"></td>
        <td><select data-f="category" aria-label="Category">${options(SHEET_CATEGORIES, d.category, '—')}</select></td>
        <td><input type="text" class="wide" data-f="description" value="${esc(d.description || '')}" placeholder="What was it" aria-label="Description"></td>
        <td><input type="text" data-f="city" value="${esc(d.city || '')}" placeholder="City" aria-label="City"></td>
        <td><select data-f="paidBy" aria-label="Paid by">${options(SHEET_PEOPLE, d.paidBy, '—')}</select></td>
        <td><input type="number" data-f="amount" value="${esc(d.amount ?? '')}" min="0" step="0.01" placeholder="0" aria-label="Amount"></td>
        <td><select data-f="currency" aria-label="Currency">${options(['USD', 'THB'], d.currency || 'USD', null)}</select></td>
        <td class="calc mono">${d.amount ? usd(amtUsd) : ''}</td>
        ${SHEET_PEOPLE.map(n => {
          const w = Number(d.shares?.[n]) || 0;
          return `<td class="share"><button type="button" data-share="${esc(n)}" data-w="${w}" aria-label="${esc(n)} share: ${w}" title="${w ? `${usd(perPerson[n])}` : 'Not in'}">${w || ''}</button></td>`;
        }).join('')}
        <td class="calc mono">${totalShares || ''}</td>
        <td class="row-tools"><button type="button" class="mini" data-all title="Everyone in / out">all</button>${problem ? `<span class="warn">${esc(problem)}</span>` : ''}</td>
        <td><button type="button" class="x" data-del aria-label="Delete row">&times;</button></td>
      </tr>`;
    }).join('');
    return `<div class="grid-scroll"><table class="grid">
      <thead><tr><th>Date</th><th>Category</th><th>Description</th><th>City</th><th>Paid by</th><th>Amount</th><th>Cur</th><th>USD</th>
        ${SHEET_PEOPLE.map(n => `<th class="share">${esc(n)}</th>`).join('')}<th>#</th><th></th><th></th></tr></thead>
      <tbody>${body || `<tr><td colspan="${SHEET_PEOPLE.length + 11}" class="empty">No charges yet. Add one below.</td></tr>`}</tbody>
      <tfoot><tr><td colspan="7">Each person's cost</td><td class="calc mono">${usd(Object.values(totals).reduce((a, b) => a + b, 0))}</td>
        ${SHEET_PEOPLE.map(n => `<td class="calc mono share">${Math.round(totals[n]).toLocaleString()}</td>`).join('')}<td colspan="3"></td></tr></tfoot>
    </table></div>
    <div class="btnrow"><button class="btn" type="button" data-add="ledger">+ Add charge</button></div>
    <p class="note">Tap a name cell to cycle <b>blank → 1 → 2</b>. 1 = in on it, 2 = double share (two massages). Splits are by shares, so a 2 pays twice what a 1 pays. THB converts at the rate above.</p>`;
  }

  function paymentsTable() {
    const body = view.payments.map(row => {
      const d = row.data;
      return `<tr data-id="${esc(row.id)}" data-tab="payments">
        <td><input type="date" data-f="date" value="${esc(d.date || '')}" aria-label="Date"></td>
        <td><select data-f="from" aria-label="From">${options(SHEET_PEOPLE, d.from, '—')}</select></td>
        <td><select data-f="to" aria-label="To">${options(SHEET_PEOPLE, d.to, '—')}</select></td>
        <td><input type="number" data-f="amount" value="${esc(d.amount ?? '')}" min="0" step="0.01" placeholder="0" aria-label="Amount"></td>
        <td><select data-f="currency" aria-label="Currency">${options(['USD', 'THB'], d.currency || 'USD', null)}</select></td>
        <td class="calc mono">${d.amount ? usd(toUsd(d.amount, d.currency, view.rate)) : ''}</td>
        <td><select data-f="method" aria-label="Method">${options(SHEET_METHODS, d.method, '—')}</select></td>
        <td><input type="text" class="wide" data-f="note" value="${esc(d.note || '')}" placeholder="Note" aria-label="Note"></td>
        <td><button type="button" class="x" data-del aria-label="Delete row">&times;</button></td>
      </tr>`;
    }).join('');
    return `<div class="grid-scroll"><table class="grid">
      <thead><tr><th>Date</th><th>From (paid)</th><th>To (got it)</th><th>Amount</th><th>Cur</th><th>USD</th><th>Method</th><th>Note</th><th></th></tr></thead>
      <tbody>${body || '<tr><td colspan="9" class="empty">No paybacks logged yet.</td></tr>'}</tbody>
    </table></div>
    <div class="btnrow"><button class="btn" type="button" data-add="payments">+ Log a payback</button></div>
    <p class="note">Log every Venmo, Zelle or cash payback here. Summary and Settle up adjust automatically.</p>`;
  }

  function summaryView(s) {
    const cats = Object.keys(s.byCategory).sort((a, b) => SHEET_CATEGORIES.indexOf(a) - SHEET_CATEGORIES.indexOf(b));
    return `<div class="duo">
      <div class="pane"><h3>Settle up</h3><p class="hint">Fewest payments to square everyone.</p>
        <div class="settle">${s.settle.length ? s.settle.map(t => `<div class="s"><span><b>${esc(t.from)}</b> pays <b>${esc(t.to)}</b></span><span class="mono">${usd(t.amt)}</span></div>`).join('') : '<div class="s none">Everyone\'s square. Nothing to settle.</div>'}</div>
        <div class="btnrow"><button class="btn" type="button" id="copySheetSettle">Copy for the group chat</button></div>
        <p class="note">Once these are paid, log them on the Payments tab and this list clears.</p></div>
      <div class="pane"><h3>Where everyone stands</h3><p class="hint">Positive means the group owes you.</p>
        <div class="grid-scroll"><table class="grid compact"><thead><tr><th>Name</th><th>Paid for group</th><th>Trip cost</th><th>Sent</th><th>Received</th><th>Balance</th></tr></thead>
        <tbody>${SHEET_PEOPLE.map(n => { const p = s.people[n]; const cls = p.balance > .005 ? 'pos' : p.balance < -.005 ? 'neg' : 'zero';
          return `<tr><td>${esc(n)}</td><td class="mono">${usd(p.paid)}</td><td class="mono">${usd(p.cost)}</td><td class="mono">${usd(p.sent)}</td><td class="mono">${usd(p.received)}</td><td class="mono ${cls}">${usd(p.balance)}</td></tr>`; }).join('')}</tbody></table></div></div>
    </div>
    <div class="pane" style="margin-top:.9rem"><h3>Trip cost by category</h3><p class="hint">Each person's share, USD.</p>
      <div class="grid-scroll"><table class="grid compact"><thead><tr><th>Category</th>${SHEET_PEOPLE.map(n => `<th>${esc(n)}</th>`).join('')}<th>Total</th></tr></thead>
      <tbody>${cats.length ? cats.map(c => `<tr><td>${esc(c)}</td>${SHEET_PEOPLE.map(n => `<td class="mono">${usd(s.byCategory[c][n])}</td>`).join('')}<td class="mono"><b>${usd(SHEET_PEOPLE.reduce((a, n) => a + s.byCategory[c][n], 0))}</b></td></tr>`).join('') : `<tr><td colspan="${SHEET_PEOPLE.length + 2}" class="empty">Nothing yet.</td></tr>`}</tbody>
      <tfoot><tr><td>Total</td>${SHEET_PEOPLE.map(n => `<td class="mono">${usd(s.people[n].cost)}</td>`).join('')}<td class="mono">${usd(s.total)}</td></tr></tfoot></table></div></div>`;
  }

  function render() {
    // Keep whatever someone is typing when a remote change re-renders the grid.
    const active = document.activeElement;
    const keep = active && wrap.contains(active) && active.dataset.f
      ? { id: active.closest('tr')?.dataset.id, f: active.dataset.f, value: active.value, start: active.selectionStart }
      : null;
    const s = summarize({ ledger: view.ledger.map(r => r.data), payments: view.payments.map(r => r.data), rate: view.rate });
    $('stTotal').textContent = usd(s.total);
    $('stAvg').textContent = usd(s.average);
    $('stCount').textContent = s.count;
    $('stBack').textContent = usd(s.paidBack);
    if (document.activeElement !== $('sheetRate')) $('sheetRate').value = view.rate;
    for (const b of document.querySelectorAll('#sheetTabs [data-tab]')) b.setAttribute('aria-pressed', String(b.dataset.tab === tab));
    $('sheetCounts').textContent = `${view.ledger.length} charges · ${view.payments.length} paybacks`;
    wrap.innerHTML = tab === 'ledger' ? ledgerTable() : tab === 'payments' ? paymentsTable() : summaryView(s);
    $('copySheetSettle')?.addEventListener('click', e => { void copyText(settleText(s), e.currentTarget, 'Copied', 'Copy for the group chat'); });
    if (keep?.id) {
      const el = wrap.querySelector(`tr[data-id="${CSS.escape(keep.id)}"] [data-f="${keep.f}"]`);
      if (el) { el.value = keep.value; el.focus(); try { el.setSelectionRange(keep.start, keep.start); } catch { /* Not a text field. */ } }
    }
  }

  function settleText(s) {
    return s.settle.length
      ? `THAILAND — SETTLE UP\n\n${s.settle.map(t => `${t.from} pays ${t.to}  ${usd(t.amt)}`).join('\n')}\n\nTotal trip spend ${usd(s.total)}`
      : "Everyone's square. Nothing to settle.";
  }

  const rowOf = el => {
    const tr = el.closest('tr[data-id]');
    if (!tr) return null;
    const row = view[tr.dataset.tab].find(r => r.id === tr.dataset.id);
    return row && { row, data: structuredClone(row.data) };
  };

  wrap.addEventListener('change', e => {
    const f = e.target.dataset.f, hit = f && rowOf(e.target);
    if (!hit) return;
    const v = e.target.value;
    hit.data[f] = e.target.type === 'number' ? (v === '' ? '' : Number(v)) : v.trim();
    void store.update(hit.row.id, hit.data);
  });
  wrap.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.matches('input')) e.target.blur();
  });
  wrap.addEventListener('click', e => {
    const add = e.target.closest('[data-add]');
    if (add) {
      const last = view[add.dataset.add].at(-1)?.data;
      void store.add(add.dataset.add, add.dataset.add === 'ledger'
        ? { date: last?.date || today(), category: '', description: '', city: last?.city || '', paidBy: '', amount: '', currency: last?.currency || 'USD', shares: Object.fromEntries(SHEET_PEOPLE.map(n => [n, 1])) }
        : { date: today(), from: '', to: '', amount: '', currency: 'USD', method: '', note: '' });
      requestAnimationFrame(() => wrap.querySelector('tbody tr:last-child [data-f="description"], tbody tr:last-child [data-f="from"]')?.focus());
      return;
    }
    const hit = rowOf(e.target);
    if (!hit) return;
    const share = e.target.closest('[data-share]');
    if (share) {
      const n = share.dataset.share;
      hit.data.shares = { ...hit.data.shares, [n]: ((Number(hit.data.shares?.[n]) || 0) + 1) % 3 };
      if (!hit.data.shares[n]) delete hit.data.shares[n];
      void store.update(hit.row.id, hit.data);
    } else if (e.target.closest('[data-all]')) {
      const allIn = SHEET_PEOPLE.every(n => Number(hit.data.shares?.[n]) > 0);
      hit.data.shares = allIn ? {} : Object.fromEntries(SHEET_PEOPLE.map(n => [n, Number(hit.data.shares?.[n]) || 1]));
      void store.update(hit.row.id, hit.data);
    } else if (e.target.closest('[data-del]')) {
      const label = hit.data.description || hit.data.note || 'this row';
      if (confirm(`Delete "${label}" for everyone?`)) void store.remove(hit.row.id);
    }
  });

  $('sheetTabs').addEventListener('click', e => {
    const b = e.target.closest('[data-tab]');
    if (!b) return;
    tab = b.dataset.tab;
    try { sessionStorage.setItem('sheet.tab', tab); } catch { /* Tab resets next visit. */ }
    render();
  });
  $('sheetRate').addEventListener('change', e => {
    const rate = Number(e.target.value);
    if (rate > 0 && rate < 1000) void store.setRate(rate);
    else e.target.value = view.rate;
  });
  $('sheetCsv').addEventListener('click', () => {
    const s = summarize({ ledger: view.ledger.map(r => r.data), payments: view.payments.map(r => r.data), rate: view.rate });
    const csv = toCsv([
      ['LEDGER'], ['Date', 'Category', 'Description', 'City', 'Paid By', 'Amount', 'Currency', 'Amount (USD)', ...SHEET_PEOPLE.map(n => `${n} share`), ...SHEET_PEOPLE.map(n => `${n} cost`)],
      ...view.ledger.map(({ data: d }) => { const c = chargeShares(d, view.rate); return [d.date, d.category, d.description, d.city, d.paidBy, d.amount, d.currency, c.usd.toFixed(2), ...SHEET_PEOPLE.map(n => d.shares?.[n] || ''), ...SHEET_PEOPLE.map(n => c.perPerson[n].toFixed(2))]; }),
      [], ['PAYMENTS'], ['Date', 'From', 'To', 'Amount', 'Currency', 'Amount (USD)', 'Method', 'Note'],
      ...view.payments.map(({ data: d }) => [d.date, d.from, d.to, d.amount, d.currency, toUsd(d.amount, d.currency, view.rate).toFixed(2), d.method, d.note]),
      [], ['SUMMARY'], ['Name', 'Paid for group', 'Trip cost', 'Sent', 'Received', 'Balance'],
      ...SHEET_PEOPLE.map(n => { const p = s.people[n]; return [n, p.paid, p.cost, p.sent, p.received, p.balance].map((v, i) => (i ? v.toFixed(2) : v)); }),
      [], ['SETTLE UP'], ...s.settle.map(t => [t.from, 'pays', t.to, t.amt.toFixed(2)]),
      [], ['THB per USD', view.rate],
    ]);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' }));
    a.download = `Thailand_Trip_Cost_Split_${today()}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });

  store.subscribeStatus(st => {
    $('sheetStatus').textContent = st.message;
    $('sheetStatus').dataset.phase = st.phase;
    $('sheetSetup').hidden = st.phase !== 'local';
  });
  store.subscribe(next => { view = next; render(); });
  void store.start();
}
