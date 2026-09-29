import { $, copyText } from './ui.js';
import { parseSharing, formatSharing } from './sharing-format.js';

export function initSharing(store) {
  let busy = false;
  const msg = $('mergeMsg');
  const setMessage = (text, kind = '') => { msg.className = `mergemsg${kind ? ` ${kind}` : ''}`; msg.textContent = text; };
  const generate = async () => {
    await store.refresh();
    $('exportBox').value = formatSharing(store.state);
  };
  $('doExport').addEventListener('click', async () => {
    if (busy) return;
    busy = true;
    try { await generate(); setMessage('Calendar and expenses refreshed for export.'); }
    catch (_) { setMessage('Could not refresh the export. Check the connection and retry.', 'bad'); }
    finally { busy = false; }
  });
  $('copyExport').addEventListener('click', async () => {
    if (busy) return;
    busy = true;
    try { await generate(); await copyText($('exportBox').value, $('copyExport'), 'Copied', 'Copy it'); }
    catch (_) { setMessage('Could not refresh the export. Check the connection and retry.', 'bad'); }
    finally { busy = false; }
  });
  $('doImport').addEventListener('click', async () => {
    if (busy || !store.ready) return;
    const raw = $('importBox').value.trim();
    if (!raw) { setMessage('Paste a code in first.'); return; }
    let payload;
    try { payload = parseSharing(raw); }
    catch (e) { setMessage(e.message, 'bad'); return; }
    busy = true;
    for (const control of [$('doImport'), $('importBox')]) { control.dataset.busy = 'true'; control.disabled = true; }
    try {
      const result = await store.importRecords(payload);
      const items = result.placements ?? result.items ?? 0, exp = result.expenses ?? result.exp ?? 0;
      setMessage(`Merged: ${items} calendar item${items === 1 ? '' : 's'} and ${exp} expense${exp === 1 ? '' : 's'} added. Duplicates were skipped.`, 'ok');
      $('importBox').value = '';
    } catch (_) { setMessage('Import failed. Your code is still here; retry when connected.', 'bad'); }
    finally {
      busy = false;
      for (const control of [$('doImport'), $('importBox')]) {
        delete control.dataset.busy;
        control.disabled = !store.ready || !navigator.onLine;
      }
    }
  });
}
