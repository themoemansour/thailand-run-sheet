import { getSupabase } from './supabase.js';
import { DEFAULT_RATE } from './sheet-math.js';

const TABLE = 'thailand_sheet';
const SETUP_ID = '00000000-0000-4000-8000-000000000001';
const LOCAL_KEY = 'tripSheet.v1';

// Same starting rows as database/003_trip_sheet.sql, used until the shared table exists.
const all = { Moe: 1, Zain: 1, Sepehr: 1, Zach: 1, Erfan: 1, Khader: 1 };
const four = { Sepehr: 1, Zach: 1, Erfan: 1, Khader: 1 };
export const SEED = [
  { id: SETUP_ID, tab: 'setup', sort_order: 0, data: { rate: DEFAULT_RATE } },
  { id: '5e1d0c4a-0b1a-4c35-9f0e-000000000001', tab: 'ledger', sort_order: 1, data: { date: '2026-11-13', category: 'Hotel', description: 'Acqua Hotel — 3 nights, 3 rooms (11/13–11/16)', city: 'Pattaya', paidBy: 'Sepehr', amount: 620, currency: 'USD', shares: all } },
  { id: '5e1d0c4a-0b1a-4c35-9f0e-000000000002', tab: 'ledger', sort_order: 2, data: { date: '2026-11-16', category: 'Hotel', description: 'Radisson Red — 5 nights, 3 rooms (11/16–11/21)', city: 'Phuket / Patong', paidBy: 'Sepehr', amount: 1976.55, currency: 'USD', shares: all } },
  { id: '5e1d0c4a-0b1a-4c35-9f0e-000000000003', tab: 'ledger', sort_order: 3, data: { date: '2026-11-21', category: 'Hotel', description: 'Maison Hotel — 4 nights, 1 room (11/21–11/25)', city: 'Bangkok', paidBy: 'Moe', amount: 366, currency: 'USD', shares: { Moe: 1, Zain: 1 } } },
  { id: '5e1d0c4a-0b1a-4c35-9f0e-000000000004', tab: 'ledger', sort_order: 4, data: { date: '2026-11-21', category: 'Hotel', description: 'Maison Hotel — 5 nights, 1 room (11/21–11/26)', city: 'Bangkok', paidBy: 'Zach', amount: 394, currency: 'USD', shares: four } },
  { id: '5e1d0c4a-0b1a-4c35-9f0e-000000000005', tab: 'ledger', sort_order: 5, data: { date: '2026-11-21', category: 'Hotel', description: 'Maison Hotel — 6 nights, 1 room (11/21–11/27)', city: 'Bangkok', paidBy: 'Sepehr', amount: 507, currency: 'USD', shares: four } },
];

const missingTable = error => /could not find the table|relation .* does not exist|schema cache/i.test(String(error?.message || error));

function readLocal() {
  try {
    const rows = JSON.parse(localStorage.getItem(LOCAL_KEY));
    if (Array.isArray(rows)) return rows;
  } catch { /* Fall back to the seed. */ }
  return structuredClone(SEED);
}
function writeLocal(rows) {
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(rows)); } catch { /* Keeps working for this visit. */ }
}

// Shared rows in Supabase with realtime refetch; falls back to this browser until migration 003 runs.
export function createSheetStore({ clientLoader = getSupabase } = {}) {
  let client, channel;
  let rows = [];
  const listeners = new Set(), statusListeners = new Set();
  const api = { mode: 'loading', status: { phase: 'loading', message: 'Loading sheet…' } };

  const publish = () => { for (const fn of listeners) fn(api.view()); };
  const setStatus = (phase, message) => { api.status = { phase, message }; for (const fn of statusListeners) fn(api.status); };
  const order = (a, b) => a.sort_order - b.sort_order || String(a.created_at || '').localeCompare(String(b.created_at || '')) || a.id.localeCompare(b.id);

  api.view = () => ({
    rate: Number(rows.find(r => r.tab === 'setup')?.data?.rate) || DEFAULT_RATE,
    ledger: rows.filter(r => r.tab === 'ledger').sort(order),
    payments: rows.filter(r => r.tab === 'payments').sort(order),
  });
  api.subscribe = fn => { listeners.add(fn); fn(api.view()); return () => listeners.delete(fn); };
  api.subscribeStatus = fn => { statusListeners.add(fn); fn(api.status); return () => statusListeners.delete(fn); };

  async function load() {
    const { data, error } = await client.from(TABLE).select('*');
    if (error) throw error;
    rows = data;
    publish();
  }
  const refresh = () => load().catch(error => setStatus('error', `Could not refresh: ${error.message || error}`));

  api.start = async () => {
    try {
      client = await clientLoader();
      await load();
      api.mode = 'shared';
      setStatus('saved', 'Shared · saved');
      channel = client.channel('thailand-sheet')
        .on('postgres_changes', { event: '*', schema: 'public', table: TABLE }, refresh)
        .subscribe();
      addEventListener('focus', refresh);
      addEventListener('online', refresh);
    } catch (error) {
      api.mode = 'local';
      rows = readLocal();
      publish();
      setStatus('local', missingTable(error)
        ? 'Local only: the shared sheet is not set up yet, so edits stay in this browser.'
        : 'Offline: edits stay in this browser for now.');
    }
  };

  // Optimistic local update, then a single-row write. Remote changes refetch everything.
  async function persist(job, row) {
    if (api.mode !== 'shared') { writeLocal(rows); return; }
    setStatus('saving', 'Saving…');
    try {
      const { error } = await job();
      if (error) throw error;
      setStatus('saved', 'Shared · saved');
    } catch (error) {
      setStatus('error', `Not saved${row ? ` (${row.tab})` : ''}: ${error.message || error}. Refreshing.`);
      await refresh();
    }
  }

  api.add = (tab, data) => {
    const row = { id: crypto.randomUUID(), tab, data, sort_order: Date.now(), created_at: new Date().toISOString() };
    rows.push(row); publish();
    return persist(() => client.from(TABLE).insert({ id: row.id, tab, data, sort_order: row.sort_order }), row);
  };
  api.update = (id, data) => {
    const row = rows.find(r => r.id === id);
    if (!row) return Promise.resolve();
    row.data = data; publish();
    return persist(() => client.from(TABLE).update({ data }).eq('id', id), row);
  };
  api.remove = id => {
    rows = rows.filter(r => r.id !== id); publish();
    return persist(() => client.from(TABLE).delete().eq('id', id));
  };
  api.setRate = rate => {
    let row = rows.find(r => r.tab === 'setup');
    if (!row) { row = { id: SETUP_ID, tab: 'setup', sort_order: 0, data: {} }; rows.push(row); }
    row.data = { ...row.data, rate }; publish();
    return persist(() => client.from(TABLE).upsert({ id: row.id, tab: 'setup', data: row.data, sort_order: 0 }), row);
  };
  api.stop = async () => { if (channel) await client.removeChannel(channel); };
  return api;
}
