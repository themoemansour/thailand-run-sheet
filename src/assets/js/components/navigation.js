const pages = [
  ['01', 'Calendar', '/#calendar', 'index'],
  ['02', 'Share calendar and ledger', '/sharing/', 'sharing'],
  ['03', 'Activities', '/#activities', 'activities'],
  ['04', 'Read this part twice', '/important/', 'important'],
  ['05', 'Before you fly', '/before-you-fly/', 'before-you-fly'],
  ['06', 'Moving between places', '/transport/', 'transport'],
  ['07', 'Hotels and the credit burn', '/hotels/', 'hotels'],
  ['08', 'Settle up', '/expenses/', 'expenses'],
  ['09', 'Eating and the pork problem', '/food/', 'food'],
  ['10', 'Health and pharmacies', '/health/', 'health'],
  ['11', 'Money on the ground', '/money/', 'money'],
  ['12', 'Scams', '/scams/', 'scams'],
  ['13', 'Still to resolve', '/unresolved/', 'unresolved'],
  ['14', 'Checklist', '/checklist/', 'checklist'],
  ['15', 'If something goes wrong', '/emergency/', 'emergency'],
  ['16', 'Links', '/links/', 'links'],
];

export function initNav() {
  const nav = document.getElementById('pageNav');
  if (!nav) return;
  const quick = document.createElement('div');
  quick.className = 'nav-quick';
  quick.append(...[pages[0], pages[2]].map(makeLink));
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
