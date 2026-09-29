import { getSupabase } from './supabase.js';

const TABLES = {
  placements: 'thailand_placements',
  expenses: 'thailand_expenses',
  settings: 'thailand_settings',
};
const PLACEMENT_FIELDS = new Set([
  'day_id', 'slot', 'activity_id', 'title', 'cost_low', 'cost_high', 'city', 'sort_order',
]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function requireId(id) {
  if (typeof id !== 'string' || !UUID.test(id)) throw new Error('A valid record ID is required.');
}

function unwrap(result) {
  if (result.error) throw result.error;
  return result.data;
}

function plainError(error) {
  const detail = String(error?.message || error || 'Connection failed');
  if (/could not find the table|relation .* does not exist/i.test(detail)) return 'Shared trip is not set up yet. Ask the organizer to finish setup.';
  if (/permission denied|row-level security/i.test(detail)) return 'Shared trip access is unavailable. Ask the organizer to check setup.';
  if (/failed to fetch|network|offline/i.test(detail)) return 'Connection lost. Retry when online.';
  if (/duplicate|unique/i.test(detail)) return 'That entry already exists. Refresh and retry.';
  if (/check constraint|invalid input|violates|bad request/i.test(detail)) return 'Invalid entry. Check the values and retry.';
  return detail.length > 110 ? detail.slice(0, 107) + '…' : detail;
}

export function createStore({ clientLoader = getSupabase, events = globalThis } = {}) {
  let client;
  let startPromise;
  let tail = Promise.resolve();
  let refreshPromise;
  let readAgain = false;
  const failedWrites = new Map();
  let liveConnected = false;
  let channel;
  let activeChannel = false;
  const dataListeners = new Set();
  const statusListeners = new Set();

  const api = {
    state: { placements: [], expenses: [], settings: {} },
    ready: false,
    status: { phase: 'loading', message: 'Loading…' },
    pending: 0,
    subscribe(fn) {
      dataListeners.add(fn);
      fn(api.state);
      return () => dataListeners.delete(fn);
    },
    subscribeStatus(fn) {
      statusListeners.add(fn);
      fn(api.status);
      return () => statusListeners.delete(fn);
    },
  };

  function publishStatus(phase, message) {
    api.status = { phase, message };
    for (const fn of statusListeners) fn(api.status);
  }

  function schedule(job) {
    const result = tail.then(job, job);
    tail = result.catch(() => {});
    return result;
  }

  function offline() {
    return events.navigator?.onLine === false;
  }

  async function load() {
    if (offline()) throw new Error('Offline');
    client ||= await clientLoader();
    const [placements, expenses, settings] = await Promise.all([
      client.from(TABLES.placements).select('*'),
      client.from(TABLES.expenses).select('*'),
      client.from(TABLES.settings).select('key,value'),
    ]);
    const rows = {
      placements: unwrap(placements).sort((a, b) =>
        a.day_id.localeCompare(b.day_id) ||
        ['morning','afternoon','evening','night'].indexOf(a.slot) - ['morning','afternoon','evening','night'].indexOf(b.slot) ||
        a.sort_order - b.sort_order ||
        String(a.created_at).localeCompare(String(b.created_at)) ||
        a.id.localeCompare(b.id)),
      expenses: unwrap(expenses).sort((a, b) =>
        String(a.created_at).localeCompare(String(b.created_at)) || a.id.localeCompare(b.id)),
      settings: Object.fromEntries(unwrap(settings).map(({ key, value }) => [key, value])),
    };
    api.state = rows;
    api.ready = true;
    for (const fn of dataListeners) fn(api.state);
    if (api.pending === 0) settleStatus();
    return rows;
  }

  function settleStatus() {
    if (offline()) {
      publishStatus('offline', 'Offline. Editing is paused.');
    } else if (failedWrites.size) {
      publishStatus('error', [...failedWrites.values()].at(-1));
    } else if (!liveConnected) {
      publishStatus('offline', 'Live updates disconnected. Retry connection.');
    } else {
      publishStatus('saved', 'Saved');
    }
  }

  function handleError(error) {
    publishStatus(offline() ? 'offline' : 'error', plainError(error));
  }

  api.refresh = function refresh() {
    if (refreshPromise) {
      readAgain = true;
      return refreshPromise;
    }
    refreshPromise = schedule(async () => {
      do {
        readAgain = false;
        try {
          await load();
        } catch (error) {
          handleError(error);
          throw error;
        }
      } while (readAgain);
      return api.state;
    }).finally(() => { refreshPromise = undefined; });
    return refreshPromise;
  };

  function backgroundRefresh() {
    api.refresh().catch(() => {});
  }

  api.start = function start() {
    if (startPromise) return startPromise;
    publishStatus('loading', 'Loading…');
    startPromise = (async () => {
      client = await clientLoader();
      channel = client.channel('thailand-shared-data');
      const openedChannel = channel;
      activeChannel = true;
      for (const table of Object.values(TABLES)) {
        channel.on('postgres_changes', { event: '*', schema: 'public', table }, backgroundRefresh);
      }
      channel.subscribe(status => {
        if (!activeChannel || channel !== openedChannel) return;
        if (status === 'SUBSCRIBED') {
          liveConnected = true;
          if (api.ready) backgroundRefresh();
        }
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          liveConnected = false;
          if (api.pending === 0) settleStatus();
        }
      });
      events.addEventListener?.('focus', backgroundRefresh);
      events.addEventListener?.('online', backgroundRefresh);
      events.addEventListener?.('offline', onOffline);
      await api.refresh();
      return api.state;
    })().catch(async error => {
      activeChannel = false;
      liveConnected = false;
      if (channel) {
        try { await client?.removeChannel?.(channel); } catch { /* Keep the original load error. */ }
      }
      channel = undefined;
      events.removeEventListener?.('focus', backgroundRefresh);
      events.removeEventListener?.('online', backgroundRefresh);
      events.removeEventListener?.('offline', onOffline);
      handleError(error);
      startPromise = undefined;
      throw error;
    });
    return startPromise;
  };

  function onOffline() {
        if (api.pending === 0) publishStatus('offline', 'Offline. Editing is paused.');
  }

  function write(key, operation) {
    if (!api.ready) {
      const error = new Error('Shared data has not loaded yet. Retry connection.');
      failedWrites.set(key, plainError(error));
      handleError(error);
      return Promise.reject(error);
    }
    if (offline()) {
      const error = new Error('Offline');
      failedWrites.set(key, plainError(error));
      handleError(error);
      return Promise.reject(error);
    }
    api.pending++;
    publishStatus('saving', 'Saving…');
    return schedule(async () => {
      try {
        if (offline()) throw new Error('Offline');
        await operation();
        await load();
        failedWrites.delete(key);
        return api.state;
      } catch (error) {
        failedWrites.set(key, plainError(error));
        handleError(error);
        throw error;
      } finally {
        api.pending--;
        if (api.pending === 0) settleStatus();
      }
    });
  }

  api.setSetting = (key, value) => write(`setting:${key}`, async () => {
    if (typeof key !== 'string') throw new Error('Invalid setting.');
    const rows = unwrap(await client.from(TABLES.settings).update({ value }).eq('key', key).select('key'));
    if (rows.length !== 1) throw new Error('Setting is missing. Retry connection.');
  });
  api.addPlacement = record => write(`placement:${record?.id}`, async () => {
    requireId(record?.id);
    unwrap(await client.from(TABLES.placements).upsert(record, { onConflict: 'id', ignoreDuplicates: true }));
  });
  api.updatePlacement = (id, patch) => write(`placement:${id}`, async () => {
    requireId(id);
    if (!patch || !Object.keys(patch).length || Object.keys(patch).some(key => !PLACEMENT_FIELDS.has(key))) {
      throw new Error('Invalid placement change.');
    }
    const rows = unwrap(await client.from(TABLES.placements).update(patch).eq('id', id).select('id'));
    if (rows.length !== 1) throw new Error('This activity was deleted by someone else. Refresh the calendar.');
  });
  api.removePlacement = id => write(`placement:${id}`, async () => {
    requireId(id);
    unwrap(await client.from(TABLES.placements).delete().eq('id', id));
  });
  api.addExpense = record => write(`expense:${record?.id}`, async () => {
    requireId(record?.id);
    unwrap(await client.from(TABLES.expenses).upsert(record, { onConflict: 'id', ignoreDuplicates: true }));
  });
  api.removeExpense = id => write(`expense:${id}`, async () => {
    requireId(id);
    unwrap(await client.from(TABLES.expenses).delete().eq('id', id));
  });
  api.clearCalendar = () => write('clearCalendar', async () => {
    unwrap(await client.rpc('thailand_clear_calendar'));
  });
  api.resetAll = () => write('resetAll', async () => {
    unwrap(await client.rpc('thailand_reset_all'));
  });
  api.importRecords = ({ placements, expenses } = {}) => {
    if (!Array.isArray(placements) || !Array.isArray(expenses)) {
      const error = new Error('Import needs placement and expense arrays.');
      failedWrites.set('import', plainError(error));
      handleError(error);
      return Promise.reject(error);
    }
    let counts;
    return write('import', async () => {
      counts = unwrap(await client.rpc('thailand_import_records', {
        p_placements: placements, p_expenses: expenses,
      }));
    }).then(() => counts);
  };
  return api;
}

export const store = createStore();
