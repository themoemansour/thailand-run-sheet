import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../src/assets/js/lib/store.js';

function fakeClient() {
  const db = {
    thailand_placements: [],
    thailand_expenses: [],
    thailand_settings: [{ key: 'mode', value: 'cash' }],
  };
  let failNextUpdate = false;
  let failNextSelect = false;
  let channelStatus;
  const ok = data => Promise.resolve({ data, error: null });
  const client = {
    db,
    failUpdate() { failNextUpdate = true; },
    failSelect() { failNextSelect = true; },
    removedChannels: 0,
    removeChannel() { this.removedChannels++; return Promise.resolve(); },
    signalChannel(status) { channelStatus?.(status); },
    channel() { return { on() { return this; }, subscribe(callback) { channelStatus = callback; callback('SUBSCRIBED'); return this; } }; },
    from(name) {
      return {
        select() {
          if (failNextSelect) {
            failNextSelect = false;
            return Promise.resolve({ data: null, error: new Error('read failed') });
          }
          return ok(structuredClone(db[name]));
        },
        update(patch) {
          return {
            eq(key, value) {
              return {
                select() {
                  if (failNextUpdate) {
                    failNextUpdate = false;
                    return Promise.resolve({ data: null, error: new Error('write failed') });
                  }
                  const row = db[name].find(item => item[key] === value);
                  if (!row) return ok([]);
                  Object.assign(row, patch);
                  return ok([{ id: row.id, key: row.key }]);
                },
              };
            },
          };
        },
      };
    },
  };
  return client;
}

test('data subscribers receive authoritative state, not Saving notifications', async () => {
  const client = fakeClient();
  const store = createStore({ clientLoader: async () => client, events: {} });
  let dataEvents = 0;
  const statuses = [];
  store.subscribe(() => dataEvents++);
  store.subscribeStatus(status => statuses.push(status.phase));
  await store.start();
  assert.equal(store.ready, true);
  assert.equal(dataEvents, 2);
  await store.setSetting('mode', 'points');
  assert.equal(store.state.settings.mode, 'points');
  assert.equal(dataEvents, 3);
  assert.deepEqual(statuses.slice(-2), ['saving', 'saved']);
});

test('failed write stays visible through background refresh, then explicit retry succeeds', async () => {
  const client = fakeClient();
  const store = createStore({ clientLoader: async () => client, events: {} });
  await store.start();
  client.failUpdate();
  await assert.rejects(store.setSetting('mode', 'points'), /write failed/);
  assert.equal(store.status.phase, 'error');
  await store.refresh();
  assert.equal(store.status.phase, 'error');
  await store.setSetting('mode', 'points');
  assert.equal(store.status.phase, 'saved');
  assert.equal(store.state.settings.mode, 'points');
});

test('missing placement update never inserts a deleted entry', async () => {
  const client = fakeClient();
  const store = createStore({ clientLoader: async () => client, events: {} });
  await store.start();
  await assert.rejects(
    store.updatePlacement('e9b1cb68-632b-4c36-ac60-cd2595a72e49', { title: 'Moved' }),
    /deleted by someone else/,
  );
  assert.equal(client.db.thailand_placements.length, 0);
});

test('unrelated success keeps a failed field visible; dropped live channel stays offline', async () => {
  const client = fakeClient();
  client.db.thailand_settings.push({ key: 'party', value: 5 });
  const store = createStore({ clientLoader: async () => client, events: {} });
  await store.start();
  client.failUpdate();
  await assert.rejects(store.setSetting('mode', 'points'));
  await store.setSetting('party', 6);
  assert.equal(store.status.phase, 'error');
  await store.setSetting('mode', 'points');
  assert.equal(store.status.phase, 'saved');
  client.signalChannel('CHANNEL_ERROR');
  await store.refresh();
  assert.equal(store.status.phase, 'offline');
  client.signalChannel('SUBSCRIBED');
  await store.refresh();
  assert.equal(store.status.phase, 'saved');
});

test('failed initial load removes its channel and a retry starts cleanly', async () => {
  const client = fakeClient();
  client.failSelect();
  const store = createStore({ clientLoader: async () => client, events: {} });
  await assert.rejects(store.start(), /read failed/);
  assert.equal(store.ready, false);
  assert.equal(client.removedChannels, 1);
  await store.start();
  assert.equal(store.ready, true);
  assert.equal(store.status.phase, 'saved');
});
