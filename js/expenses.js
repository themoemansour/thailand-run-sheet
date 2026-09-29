import { CREW, RATE } from './data.js';
import { $, esc, money, baht, copyText } from './ui.js';
import { balances, settleUp } from './calculations.js';

let pendingAdd = null;
export function hasUnsavedExpense() { return !!pendingAdd; }

export function settlementText(expenses) {
  const transfers = settleUp(balances(expenses));
  return transfers.length ? `THAILAND — SETTLE UP\n\n${transfers.map(t => `${t.from} pays ${t.to}  ${baht(t.amt)} (${money(t.amt / RATE)})`).join('\n')}` : "Everyone's square — nothing to settle.";
}

export function initExpenses(store) {
  let payerSel = CREW[0];
  const splitSel = Object.fromEntries(CREW.map(n => [n, true]));
  pendingAdd = null;
  let busy = false;
  const msg = document.createElement('p');
  msg.className = 'note'; msg.id = 'expenseMessage'; msg.setAttribute('role', 'status');
  $('addExp').parentElement.after(msg);
  const discard = document.createElement('button');
  discard.type = 'button'; discard.className = 'btn ghost'; discard.textContent = 'Discard unsaved expense'; discard.hidden = true;
  msg.after(discard);
  function lockForm(locked) {
    for (const control of [...['eDesc','eAmt','eCur','allSplit'].map($), ...document.querySelectorAll('#payerRow button, #splitRow button')]) {
      if (locked) control.dataset.busy = 'true';
      else delete control.dataset.busy;
      control.disabled = locked || !store.ready || !navigator.onLine;
    }
  }
  discard.addEventListener('click', async () => {
    if (busy || !pendingAdd) return;
    busy = true; discard.disabled = true;
    try {
      await store.refresh();
      msg.textContent = store.state.expenses.some(e => e.id === pendingAdd.id)
        ? 'That expense was saved. The form is ready for another.'
        : 'Unsaved expense discarded.';
      pendingAdd = null; $('eDesc').value = ''; $('eAmt').value = '';
      lockForm(false); discard.hidden = true;
    } catch (_) { msg.textContent = 'Could not check the expense yet. Retry or discard when connected.'; }
    finally { busy = false; discard.disabled = false; }
  });

  function renderWhoRows() {
    $('payerRow').innerHTML = CREW.map(n => `<button class="who-chip payer" type="button" data-payer="${esc(n)}" aria-pressed="${payerSel === n}">${esc(n)}</button>`).join('');
    $('splitRow').innerHTML = CREW.map(n => `<button class="who-chip" type="button" data-split="${esc(n)}" aria-pressed="${!!splitSel[n]}">${esc(n)}</button>`).join('');
  }
  function renderLedger() {
    const expenses = store.state.expenses;
    const bal = balances(expenses), total = expenses.reduce((a, e) => a + e.amount_thb, 0);
    $('ledTotal').textContent = `${baht(total)} · ${money(total / RATE)}`;
    $('balances').innerHTML = expenses.length ? Object.entries(bal).map(([n,v]) => {
      const cls = v > .5 ? 'pos' : v < -.5 ? 'neg' : 'zero';
      const txt = v > .5 ? `is owed ${baht(v)}` : v < -.5 ? `owes ${baht(-v)}` : 'square';
      return `<div class="bal"><span>${esc(n)}</span><span class="${cls}">${txt}</span></div>`;
    }).join('') : '<p class="note" style="margin:0">No expenses logged yet.</p>';
    const transfers = settleUp(bal);
    $('settleList').innerHTML = transfers.length ? transfers.map(t => `<div class="s"><span><b>${esc(t.from)}</b> pays <b>${esc(t.to)}</b></span><span class="mono">${baht(t.amt)}</span></div>`).join('') : '<div class="s none">Nothing to settle.</div>';
    $('expList').innerHTML = expenses.length ? expenses.slice().reverse().map(e => `<div class="exp"><div><div>${esc(e.description)}</div><div class="meta2">${esc(e.payer)} paid &middot; split ${e.split.length} way${e.split.length === 1 ? '' : 's'} &middot; ${esc(e.split.join(', '))}</div></div><span class="amt">${baht(e.amount_thb)}</span><button class="x" type="button" data-shared data-delexp="${esc(e.id)}" aria-label="Remove">&times;</button></div>`).join('') : '<div class="exp"><span class="meta2">Nothing logged yet.</span></div>';
    for (const btn of $('expList').querySelectorAll('[data-shared]')) btn.disabled = !store.ready;
  }
  $('payerRow').addEventListener('click', e => { const b = e.target.closest('[data-payer]'); if (b) { payerSel = b.dataset.payer; renderWhoRows(); } });
  $('splitRow').addEventListener('click', e => { const b = e.target.closest('[data-split]'); if (b) { splitSel[b.dataset.split] = !splitSel[b.dataset.split]; renderWhoRows(); } });
  $('allSplit').addEventListener('click', () => { const anyOff = CREW.some(n => !splitSel[n]); CREW.forEach(n => { splitSel[n] = anyOff; }); renderWhoRows(); });

  // Keep the form and ID fixed until an uncertain failed write is resolved.
  $('addExp').addEventListener('click', async () => {
    if (busy || !store.ready) return;
    if (!pendingAdd) {
      const description = $('eDesc').value.trim(), amt = Number($('eAmt').value), split = CREW.filter(n => splitSel[n]);
      if (!description || description.length > 500) { $('eDesc').focus(); return; }
      const amount_thb = $('eCur').value === 'USD' ? amt * RATE : amt;
      if (!Number.isFinite(amount_thb) || amount_thb <= 0 || amount_thb > 1000000000) { $('eAmt').focus(); return; }
      if (!split.length) { msg.textContent = 'Choose at least one person to split between.'; return; }
      pendingAdd = { id: crypto.randomUUID(), description, amount_thb, payer: payerSel, split };
    }
    busy = true; $('addExp').dataset.busy = 'true'; $('addExp').disabled = true; lockForm(true); msg.textContent = '';
    try {
      await store.addExpense(pendingAdd);
      pendingAdd = null; $('eDesc').value = ''; $('eAmt').value = ''; lockForm(false); discard.hidden = true; $('eDesc').focus();
    } catch (_) { msg.textContent = 'Could not save this expense. Your form is intact; select Add it to retry.'; discard.hidden = false; }
    finally { busy = false; delete $('addExp').dataset.busy; $('addExp').disabled = !store.ready || !navigator.onLine; }
  });
  $('expList').addEventListener('click', async e => {
    const b = e.target.closest('[data-delexp]');
    if (!b || b.disabled) return;
    b.disabled = true;
    try { await store.removeExpense(b.dataset.delexp); msg.textContent = ''; }
    catch (_) { msg.textContent = 'Could not remove this expense. Select Remove to retry.'; b.disabled = false; }
  });
  $('copySettle').addEventListener('click', () => { void copyText(settlementText(store.state.expenses), $('copySettle'), 'Copied', 'Copy the settlement'); });
  renderWhoRows();
  store.subscribe(() => renderLedger());
}
