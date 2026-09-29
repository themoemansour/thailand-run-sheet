import { DEFAULT_SETTINGS } from '../data/trip.js';
import { $ } from '../lib/ui.js';

const fields = new Map();
let activeStore;

function render() {
  document.querySelectorAll('#todo li').forEach(li => li.classList.toggle('checked', !!li.querySelector('input')?.checked));
}

function retryControl() {
  let button = $('retrySettings');
  if (!button) {
    button = document.createElement('button');
    button.id = 'retrySettings';
    button.type = 'button';
    button.className = 'btn ghost';
    button.textContent = 'Retry unsaved settings';
    button.hidden = true;
    ($('todo')?.parentElement || document.body).append(button);
  }
  if (!button.dataset.retryBound) {
    button.addEventListener('click', () => { void flushSettings(); });
    button.dataset.retryBound = 'true';
  }
  button.hidden = ![...fields.values()].some(field => field.failed);
}

function track(key, el) {
  const field = { el, dirty: false, failed: false, writing: null, revision: 0 };
  fields.set(key, field);
  el.addEventListener('change', () => {
    field.dirty = true;
    field.failed = false;
    field.revision++;
    retryControl();
    render();
    void saveField(key);
  });
}

async function saveField(key) {
  const field = fields.get(key);
  if (!field?.dirty || field.writing || !activeStore.ready) return false;
  const value = field.el.checked;
  const revision = field.revision;
  field.writing = activeStore.setSetting(key, value);
  let accepted = false;
  try {
    await field.writing;
    accepted = true;
    if (field.revision === revision) {
      field.dirty = false;
      field.failed = false;
    }
  } catch (_) {
    field.failed = true;
  } finally {
    field.writing = null;
    if (accepted && !field.dirty && document.activeElement !== field.el) {
      field.el.checked = !!(activeStore.state.settings[key] ?? DEFAULT_SETTINGS[key]);
    }
    retryControl();
    render();
    if (accepted && field.dirty && field.revision !== revision) void saveField(key);
  }
  return !field.dirty;
}

export function hasUnsavedSettings() {
  return [...fields.values()].some(field => field.dirty || !!field.writing);
}

export async function flushSettings() {
  if (!activeStore) return true;
  const keys = [...fields].filter(([, field]) => field.dirty || field.writing).map(([key]) => key);
  await Promise.all(keys.map(async key => {
    const field = fields.get(key);
    for (let i = 0; i < 20 && (field.dirty || field.writing); i++) {
      if (field.writing) {
        await field.writing.catch(() => {});
        await Promise.resolve();
        continue;
      }
      if (field.failed && i > 0) break;
      await saveField(key);
      if (field.failed) break;
    }
  }));
  return !hasUnsavedSettings();
}

export function initSettings(store) {
  activeStore = store;
  document.querySelectorAll('[data-setting^="check."]').forEach(el => track(el.dataset.setting, el));
  retryControl();
  store.subscribe(state => {
    for (const [key, field] of fields) {
      if (field.dirty || field.writing || document.activeElement === field.el) continue;
      field.el.checked = !!(state.settings[key] ?? DEFAULT_SETTINGS[key]);
    }
    render();
  });
}
