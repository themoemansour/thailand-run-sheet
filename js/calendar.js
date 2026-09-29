import { DAYS, SLOTS, ACTS } from './data.js';
import { $, esc, baht, copyText } from './ui.js';

let activeEditor = null;
const catalogue = new Map(ACTS.map(a => [a.id,a]));
const costText = p => p.cost_high === 0 ? 'free' : p.cost_low === p.cost_high ? baht(p.cost_low) : `${baht(p.cost_low)}–${Math.round(p.cost_high).toLocaleString()}`;
const plainName = text => text.replace(/<[^>]+>/g, '');
const ordered = placements => placements.slice().sort((a,b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));

export function planText(placements) {
  const out = ['THAILAND — Nov 13-27, 2026','Pattaya 3 · Phuket 5 · Bangkok 6',''];
  let low = 0, high = 0;
  for (const day of DAYS) {
    const lines = day.anchors.map(a => '   * ' + plainName(a));
    for (const [slot,label] of SLOTS) {
      for (const entry of ordered(placements.filter(p => p.day_id === day.id && p.slot === slot))) {
        lines.push(`   ${label}: ${entry.title}  (${entry.cost_high === 0 ? 'free' : 'THB ' + entry.cost_low + (entry.cost_low === entry.cost_high ? '' : '-' + entry.cost_high)})`);
        low += entry.cost_low; high += entry.cost_high;
      }
    }
    out.push(`${day.dt} — ${day.city.toUpperCase()} — ${day.label}`, lines.length ? lines.join('\n') : '   (nothing planned yet)', '');
  }
  out.push(`Per person, activities: ${high ? baht(low) + '–' + Math.round(high).toLocaleString() : '฿0'}`);
  return out.join('\n');
}

export async function flushCalendar() {
  if (!activeEditor) return true;
  // An open edit dialog is a draft. Keep it visible until saved or cancelled.
  if (activeEditor.kind === 'dialog') return false;
  return activeEditor.commit();
}
export const hasCalendarDraft = () => !!activeEditor;

export function initCalendar(store) {
  let pending = null;
  let placementId = null;
  let placing = false;
  const initial = new URL(location.href).searchParams.get('activity');
  if (catalogue.has(initial)) pending = initial;

  function cancelPick() {
    pending = null;
    placementId = null;
    document.body.classList.remove('placing');
    const url = new URL(location.href);
    url.searchParams.delete('activity');
    history.replaceState(null, '', url);
  }
  function render() {
    // Never replace an in-progress input or modal as remote notifications arrive.
    if (activeEditor) return;
    const placements = store.state.placements;
    let totalLow = 0, totalHigh = 0;
    $('cal').innerHTML = DAYS.map(day => {
      const entries = ordered(placements.filter(p => p.day_id === day.id));
      const low = entries.reduce((sum,p) => sum + p.cost_low,0);
      const high = entries.reduce((sum,p) => sum + p.cost_high,0);
      totalLow += low; totalHigh += high;
      const warning = day.nodive && entries.some(p => catalogue.get(p.activity_id)?.dive);
      const slots = SLOTS.map(([slot,label]) => `<div class="slot" data-day="${day.id}" data-slot="${slot}">
        <div class="sh"><span>${label}</span><button class="addbtn" type="button" data-shared data-add="${day.id}|${slot}">+ add</button></div>
        <div class="items">${entries.filter(p => p.slot === slot).map(p => {
          const wrong = p.city && day.city !== 'travel' && p.city !== day.city;
          return `<div class="pill${wrong ? ' wrongcity' : ''}" data-entry="${p.id}"><span>${esc(p.title)}${wrong ? ` <b>(${esc(p.city)})</b>` : ''}</span>
            <span class="cst">${costText(p)}</span>
            <button class="addbtn" type="button" data-shared data-edit="${p.id}" aria-label="Edit ${esc(p.title)}">Edit</button>
            <button class="addbtn" type="button" data-shared data-move="${p.id}" aria-label="Move ${esc(p.title)}">Move</button>
            <button class="x" type="button" data-shared data-rm="${p.id}" aria-label="Remove ${esc(p.title)}">&times;</button></div>`;
        }).join('')}</div></div>`).join('');
      return `<section class="dayc c-${day.city}"><header><div><div class="dt">${day.dt}</div><div class="dl">${day.label}</div></div>
        <div style="text-align:right"><span class="citychip">${day.city}</span><div class="who">${day.who}</div></div></header>
        ${day.anchors.length ? `<div class="anchors">${day.anchors.map(a => `<div class="anchor"><span class="pin">&#9679;</span><span>${a}</span></div>`).join('')}</div>` : ''}
        ${warning ? '<div class="warnrow">&#9888; Dive placed the day before you fly — 18–24h rule</div>' : ''}
        <div class="slots">${slots}</div><div class="dayfoot"><span>${entries.length} planned</span><span class="tot">${high ? baht(low) + '–' + Math.round(high).toLocaleString() : '—'}</span></div></section>`;
    }).join('');
    $('planCount').textContent = placements.length;
    $('planCost').textContent = totalHigh ? `${baht(totalLow)}–${Math.round(totalHigh).toLocaleString()}` : '฿0';
    gate();
  }
  function gate() {
    $('cal').querySelectorAll('[data-shared]').forEach(button => { button.disabled = !store.ready || !navigator.onLine; });
  }
  function beginPick() {
    if (!pending) return;
    document.body.classList.add('placing');
    $('pickerTxt').textContent = `Placing “${plainName(catalogue.get(pending).nm)}” — tap a day and time slot`;
  }
  function pickUp(id, scroll = true) {
    if (placing || !catalogue.has(id)) return false;
    if (activeEditor) { activeEditor.focus(); return false; }
    if (pending !== id) placementId = null;
    pending = id;
    beginPick();
    if (scroll) {
      history.replaceState(null, '', '#calendar');
      window.dispatchEvent(new Event('hashchange'));
      $('cal').scrollIntoView({behavior:'smooth',block:'start'});
    }
    return true;
  }
  async function place(dayId, slot) {
    if (placing || !store.ready || !navigator.onLine || !pending) return;
    const activity = catalogue.get(pending);
    placementId ||= crypto.randomUUID();
    const row = {id:placementId, day_id:dayId, slot, activity_id:activity.id,
      title:plainName(activity.nm), cost_low:activity.cost[0], cost_high:activity.cost[1], city:activity.city, sort_order:Date.now()};
    placing = true;
    try { await store.addPlacement(row); cancelPick(); }
    catch { $('pickerTxt').textContent = `Not saved. Tap a day and time slot to retry “${plainName(activity.nm)}”.`; }
    finally { placing = false; }
  }
  function openInput(dayId, slot, button) {
    if (activeEditor) { activeEditor.focus(); return; }
    const wrapper = document.createElement('div');
    wrapper.innerHTML = '<input class="newitem" type="text" maxlength="200" aria-label="Custom activity and optional baht cost" placeholder="Anything · or Name | 500"><div class="btnrow"><button class="addbtn" type="button" data-save>Save</button><button class="addbtn" type="button" data-cancel>Cancel</button></div><div class="note" role="status" data-message></div>';
    button.closest('.slot').querySelector('.items').append(wrapper);
    const input = wrapper.querySelector('input');
    const message = wrapper.querySelector('[data-message]');
    let closed = false, saving = null;
    const id = crypto.randomUUID();
    function close() { closed = true; activeEditor = null; wrapper.remove(); render(); }
    async function commit() {
      if (closed) return true;
      if (saving) return saving;
      const raw = input.value.trim();
      if (!raw) { close(); return true; }
      const [name, cost = '0', ...extra] = raw.split('|').map(s => s.trim());
      const amount = Number(cost.replaceAll(',', ''));
      if (!name || extra.length || !Number.isFinite(amount) || amount < 0 || amount > 100000000) {
        message.textContent = 'Use a name and an optional non-negative baht cost, such as Dinner | 500.';
        return false;
      }
      const record = {id,day_id:dayId,slot,activity_id:null,title:name,cost_low:amount,cost_high:amount,
        city:DAYS.find(d => d.id === dayId).city,sort_order:Date.now()};
      input.readOnly = true;
      wrapper.querySelector('[data-cancel]').disabled = true;
      message.textContent = 'Saving…';
      saving = (async () => {
        try { await store.addPlacement(record); close(); return true; }
        catch { message.textContent = 'Not saved. Your draft is here; press Save to retry when connected.'; wrapper.querySelector('[data-save]').textContent = 'Retry save'; return false; }
        finally { input.readOnly = false; wrapper.querySelector('[data-cancel]').disabled = false; saving = null; }
      })();
      return saving;
    }
    activeEditor = {kind:'inline', commit, focus:() => input.focus()};
    input.addEventListener('keydown', event => {
      if (event.key === 'Enter') { event.preventDefault(); void commit(); }
      if (event.key === 'Escape' && !saving) { event.preventDefault(); close(); }
    });
    input.addEventListener('blur', event => {
      if (!closed && !saving && !wrapper.contains(event.relatedTarget)) void commit();
    });
    wrapper.querySelector('[data-save]').addEventListener('click', () => void commit());
    wrapper.querySelector('[data-cancel]').addEventListener('click', () => { if (!saving) close(); });
    input.focus();
  }
  function editEntry(id, moving) {
    if (activeEditor) { activeEditor.focus(); return; }
    const row = store.state.placements.find(p => p.id === id);
    if (!row) return;
    const dialog = document.createElement('dialog');
    dialog.className = 'pane';
    dialog.style.cssText = 'width:min(460px,calc(100% - 2rem));max-height:90vh;overflow:auto;color:var(--ink);background:var(--panel);border:1px solid var(--line);border-radius:6px';
    dialog.innerHTML = `<form><h3>${moving ? 'Move' : 'Edit'} activity</h3>
      <label class="field">Name <input name="title" type="text" value="${esc(row.title)}" required maxlength="200" style="width:65%"></label>
      <label class="field">Low cost, ฿ <input name="cost_low" type="number" value="${row.cost_low}" min="0" max="100000000" step="any" required></label>
      <label class="field">High cost, ฿ <input name="cost_high" type="number" value="${row.cost_high}" min="0" max="100000000" step="any" required></label>
      <label class="field">Day <select name="day_id" style="max-width:70%">${DAYS.map(d => `<option value="${d.id}" ${row.day_id === d.id ? 'selected' : ''}>${d.dt} · ${d.city}</option>`).join('')}</select></label>
      <label class="field">Time <select name="slot">${SLOTS.map(([key,label]) => `<option value="${key}" ${row.slot === key ? 'selected' : ''}>${label}</option>`).join('')}</select></label>
      <p class="note" role="status"></p><div class="btnrow"><button class="btn" type="submit">Save</button><button class="btn ghost" type="button" data-cancel>Cancel</button></div></form>`;
    document.body.append(dialog);
    let busy = false;
    const form = dialog.querySelector('form');
    const message = dialog.querySelector('[role=status]');
    activeEditor = {kind:'dialog',focus:() => dialog.querySelector('input').focus()};
    const close = () => { if (!busy) { activeEditor = null; dialog.close(); dialog.remove(); render(); } };
    dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
    dialog.querySelector('[data-cancel]').addEventListener('click', close);
    form.addEventListener('submit', async event => {
      event.preventDefault(); if (busy) return;
      const values = Object.fromEntries(new FormData(form));
      const patch = {title:values.title.trim(),cost_low:Number(values.cost_low),cost_high:Number(values.cost_high),day_id:values.day_id,slot:values.slot};
      if (!patch.title || patch.cost_high < patch.cost_low) { message.textContent = 'Enter a name and a high cost at least as large as the low cost.'; return; }
      busy = true;
      form.querySelector('button[type=submit]').disabled = true;
      try { await store.updatePlacement(id,patch); busy = false; close(); }
      catch (error) { message.textContent = `Not saved: ${error.message}. Your draft is here; Save retries it.`; }
      finally { busy = false; form.querySelector('button[type=submit]').disabled = false; }
    });
    dialog.showModal();
    dialog.querySelector(moving ? '[name=day_id]' : '[name=title]').focus();
  }
  $('cal').addEventListener('click', async event => {
    const button = event.target.closest('button');
    if (button?.disabled) return;
    if (button?.dataset.rm) {
      button.disabled = true;
      try { await store.removePlacement(button.dataset.rm); }
      catch { button.disabled = false; button.title = 'Not removed. Click to retry.'; }
      return;
    }
    if (button?.dataset.edit || button?.dataset.move) { editEntry(button.dataset.edit || button.dataset.move, !!button.dataset.move); return; }
    const slot = event.target.closest('.slot');
    if (slot && pending && !event.target.closest('input,[data-save],[data-cancel]')) { await place(slot.dataset.day,slot.dataset.slot); return; }
    if (button?.dataset.add) { const [day,time] = button.dataset.add.split('|'); openInput(day,time,button); }
  });
  $('cal').addEventListener('dragover', event => {
    const slot = event.target.closest('.slot');
    if (!slot || !pending) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    slot.classList.add('over');
  });
  $('cal').addEventListener('dragleave', event => {
    const slot = event.target.closest('.slot');
    if (slot && !slot.contains(event.relatedTarget)) slot.classList.remove('over');
  });
  $('cal').addEventListener('drop', async event => {
    const slot = event.target.closest('.slot');
    if (!slot) return;
    event.preventDefault();
    slot.classList.remove('over');
    const id = event.dataTransfer.getData('text/plain');
    if (catalogue.has(id) && pickUp(id, false)) await place(slot.dataset.day, slot.dataset.slot);
  });
  $('pickerCancel').addEventListener('click', cancelPick);
  document.addEventListener('keydown', event => { if (event.key === 'Escape') cancelPick(); });
  $('copyPlan').addEventListener('click', () => copyText(planText(store.state.placements),$('copyPlan'),'Copied — paste it in the chat'));
  $('printPlan').addEventListener('click', () => window.print());
  $('clearPlan').addEventListener('click', async () => {
    if (!await flushCalendar()) return;
    if (!window.confirm('Clear the shared calendar for everyone? All added activities will be removed. Pinned flights and hotels, expenses and settings stay.')) return;
    try { await store.clearCalendar(); cancelPick(); } catch { /* The shared status reports failure; the button is the explicit retry. */ }
  });
  store.subscribe(render);
  store.subscribeStatus(gate);
  beginPick();
  return {pickUp};
}
