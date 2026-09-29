import { DAYS, todayDayId } from '../data/trip.js';

const pages = [
  ['01', 'Calendar', '/#calendar', 'index'],
  ['02', 'Activities', '/#activities', 'activities'],
  ['03', 'Read this part twice', '/important/', 'important'],
  ['04', 'Before you fly', '/before-you-fly/', 'before-you-fly'],
  ['05', 'Moving between places', '/transport/', 'transport'],
  ['06', 'Hotel guide', '/hotels/', 'hotels'],
  ['07', 'Settle up', '/expenses/', 'expenses'],
  ['08', 'Eating and the pork problem', '/food/', 'food'],
  ['09', 'Health and pharmacies', '/health/', 'health'],
  ['10', 'Money on the ground', '/money/', 'money'],
  ['11', 'Scams', '/scams/', 'scams'],
  ['12', 'Still to resolve', '/unresolved/', 'unresolved'],
  ['13', 'Checklist', '/checklist/', 'checklist'],
  ['14', 'If something goes wrong', '/emergency/', 'emergency'],
  ['15', 'Links', '/links/', 'links'],
  ['16', 'Share calendar and ledger', '/sharing/', 'sharing'],
];

export function initNav() {
  const nav = document.getElementById('pageNav');
  if (!nav) return;
  const quick = document.createElement('div');
  quick.className = 'nav-quick';
  quick.append(...[pages[0], pages[1]].map(makeLink));
  const toggle = document.createElement('button');
  toggle.className = 'nav-toggle';
  toggle.type = 'button';
  toggle.setAttribute('aria-controls', 'sectionPanel');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.innerHTML = '<span>Sections</span><span class="nav-chevron" aria-hidden="true"></span>';
  const panel = document.createElement('div');
  panel.className = 'nav-panel';
  panel.id = 'sectionPanel';
  panel.hidden = true;
  const list = document.createElement('div');
  list.className = 'nav-list';
  list.append(...pages.map(makeLink));
  panel.append(list);
  nav.append(quick, toggle, panel);

  function setOpen(open, restoreFocus = false) {
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    if (!open && restoreFocus) toggle.focus();
  }
  toggle.addEventListener('click', () => setOpen(panel.hidden));
  panel.addEventListener('click', event => {
    if (event.target.closest('a')) setOpen(false, true);
  });
  document.addEventListener('pointerdown', event => {
    if (!panel.hidden && !nav.contains(event.target)) setOpen(false);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !panel.hidden) setOpen(false, true);
  });
  nav.addEventListener('focusout', event => {
    if (!panel.hidden && !nav.contains(event.relatedTarget)) setOpen(false);
  });
  function updateCurrent() {
    const page = document.body.dataset.page || 'index';
    const active = page === 'index' && location.hash === '#activities' ? 'activities' : page;
    for (const link of nav.querySelectorAll('a[data-page]')) {
      if (link.dataset.page === active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    }
  }
  updateCurrent();
  window.addEventListener('hashchange', updateCurrent);
}

// The masthead strip: one segment per trip day, grouped into city legs, each linking to its calendar card.
export function initRoute() {
  const route = document.getElementById('route');
  if (!route) return;
  const todayId = todayDayId();
  const legs = [];
  for (const day of DAYS) {
    const last = legs.at(-1);
    if (last && last.city === day.city && day.city !== 'travel') last.days.push(day);
    else legs.push({ city: day.city, days: [day] });
  }
  route.innerHTML = legs.map(leg => `<div class="leg c-${leg.city}" style="flex-grow:${leg.days.length}">
    <span class="leg-name">${leg.city === 'travel' ? '<span aria-hidden="true">&#9992;</span><span class="sr">Travel</span>' : leg.city}</span>
    <span class="leg-days">${leg.days.map(day => `<a href="/#day-${day.id}"${day.id === todayId ? ' class="is-today" aria-current="date"' : ''} title="${day.dt} · ${day.label}"><span class="sr">${day.dt}</span><span aria-hidden="true">${day.dt.split(' ').at(-1)}</span></a>`).join('')}</span>
  </div>`).join('');
}

// Light/dark switch. With no saved choice the page follows the device setting.
export function initTheme() {
  const button = document.getElementById('themeToggle');
  if (!button) return;
  const root = document.documentElement;
  const isDark = () => root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  const sync = () => {
    button.setAttribute('aria-pressed', String(isDark()));
    button.setAttribute('aria-label', isDark() ? 'Switch to light theme' : 'Switch to dark theme');
  };
  button.addEventListener('click', () => {
    root.dataset.theme = isDark() ? 'light' : 'dark';
    try { localStorage.setItem('theme', root.dataset.theme); } catch { /* Theme still applies for this visit. */ }
    sync();
  });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', sync);
  sync();
}

function makeLink([number, label, href, page]) {
  const link = document.createElement('a');
  link.href = href;
  link.dataset.page = page;
  const n = document.createElement('span');
  n.className = 'nav-num';
  n.textContent = number;
  const title = document.createElement('span');
  title.textContent = label;
  link.append(n, title);
  return link;
}
