import { DEPART } from './data/trip.js';
import { initNav } from './components/navigation.js';
import { initCalendar, flushCalendar, hasCalendarDraft } from './pages/calendar.js';
import { initActivities } from './pages/activities.js';
import { initSettings, flushSettings, hasUnsavedSettings } from './pages/settings.js';
import { initExpenses, hasUnsavedExpense } from './pages/expenses.js';
import { initSharing } from './pages/sharing.js';
import { $ } from './lib/ui.js';

initNav();
$('cdN').textContent = Math.max(0, Math.ceil((DEPART - new Date()) / 86400000));
const page = document.body.dataset.page;
let store;
let resetting = false;
let suppressUnload = false;

function gate() {
  if (resetting) return;
  for (const control of document.querySelectorAll('[data-shared]')) {
    // A module can keep a specific control locked during its own submission.
    if (!control.dataset.busy) control.disabled = !store?.ready || !navigator.onLine;
  }
}
function showStatus(status) {
  $('syncStatus').textContent = status.message;
  $('syncStatus').dataset.phase = status.phase;
  $('retryConnection').hidden = !['error','offline'].includes(status.phase);
  gate();
}
gate();

try {
  ({ store } = await import('./lib/store.js'));
  if (page === 'index') {
    const calendar = initCalendar(store);
    initActivities(calendar.pickUp);
  }
  if (page === 'hotels' || page === 'checklist') initSettings(store);
  if (page === 'expenses') initExpenses(store);
  if (page === 'sharing') initSharing(store);
  store.subscribe(gate);
  store.subscribeStatus(showStatus);
  $('retryConnection').addEventListener('click', async () => {
    try { await (store.ready ? store.refresh() : store.start()); } catch { /* Status contains the connection failure. */ }
  });
  $('reset').addEventListener('click', async () => {
    if (resetting) return;
    if (!window.confirm('Reset everything saved for everyone? This clears added calendar activities and expenses and restores all hotel figures, booking flags and checklist ticks. Fixed trip content stays.')) return;
    if ((hasCalendarDraft() || hasUnsavedSettings() || hasUnsavedExpense()) && !window.confirm('You also have an unsaved draft on this page. Discard it and reset the shared trip?')) return;
    resetting = true;
    const controls = [...document.querySelectorAll('button,input,select,textarea')];
    const disabled = controls.map(control => control.disabled);
    controls.forEach(control => { control.disabled = true; });
    try {
      const deadline = Date.now() + 15000;
      while (store.pending && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 50));
      if (store.pending) throw new Error('A save is still in progress. Try the reset again once it finishes.');
      await store.resetAll();
      suppressUnload = true;
      location.reload();
    } catch (error) {
      showStatus({phase:'error',message:error.message || 'Reset failed. Try again when connected.'});
      controls.forEach((control,index) => { control.disabled = disabled[index]; });
      resetting = false;
      gate();
    }
  });

  let navigating = false;
  document.addEventListener('click', async event => {
    const anchor = event.target.closest('a[href]');
    if (!anchor || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || anchor.target === '_blank' || anchor.download) return;
    const url = new URL(anchor.href, location.href);
    const canonicalPath = path => path.replace(/\/index\.html$/, '/').replace(/\.html$/, '/').replace(/\/?$/, '/');
    const currentPath = canonicalPath(location.pathname);
    if (url.origin !== location.origin) return;
    if (canonicalPath(url.pathname) === currentPath && url.hash) {
      const section = document.getElementById(decodeURIComponent(url.hash.slice(1)));
      if (section) {
        event.preventDefault(); history.pushState(null, '', url.hash);
        window.dispatchEvent(new Event('hashchange'));
        section.scrollIntoView({behavior:'smooth'});
        section.tabIndex = -1;
        section.focus({preventScroll:true});
      }
      return;
    }
    event.preventDefault();
    if (navigating) return;
    navigating = true;
    try {
      if (hasUnsavedExpense()) {
        showStatus({phase:'error',message:'Retry or discard your unsaved expense before changing pages.'});
        return;
      }
      if (!await flushCalendar() || !await flushSettings()) {
        showStatus({phase:'error',message:'Finish saving or cancel your unsaved draft before changing pages.'});
        return;
      }
      // Let already-submitted writes finish before a static page navigation unloads the client.
      const deadline = Date.now() + 15000;
      while (store.pending && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 50));
      if (store.pending) { showStatus({phase:'error',message:'Still saving. Please wait, then try the page link again.'}); return; }
      location.assign(url);
    } finally { navigating = false; }
  });
  window.addEventListener('beforeunload', event => {
    if (!suppressUnload && (store.pending || hasCalendarDraft() || hasUnsavedSettings() || hasUnsavedExpense())) { event.preventDefault(); event.returnValue = ''; }
  });
  window.addEventListener('online',gate);
  window.addEventListener('offline',gate);
  await store.start();
} catch (error) {
  showStatus(store?.status.phase === 'error' || store?.status.phase === 'offline'
    ? store.status
    : {phase:'error',message:'Could not load the shared trip. Check your internet connection and retry.'});
  if (!store) $('retryConnection').addEventListener('click', () => location.reload());
  console.error('Trip initialization failed:', error);
}
