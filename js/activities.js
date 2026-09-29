import { ACTS } from './data.js';
import { $, esc, baht } from './ui.js';

export function initActivities(pickUp) {
  const filters = {city:'all', cat:'all', q:''};
  function render() {
    const query = filters.q.toLowerCase();
    const list = ACTS.filter(a => (filters.city === 'all' || a.city === filters.city)
      && (filters.cat === 'all' || (filters.cat === 'must' ? a.must : a.cat === filters.cat))
      && (!query || `${a.nm} ${a.tip} ${a.cat} ${a.city}`.toLowerCase().includes(query)));
    $('acts').innerHTML = list.length ? list.map(a => {
      const free = a.cost[1] === 0;
      const cost = free ? 'Free' : a.cost[0] === a.cost[1] ? baht(a.cost[0]) : `${baht(a.cost[0])}–${Math.round(a.cost[1]).toLocaleString()}`;
      return `<article class="act c-${a.city}" draggable="true" data-id="${a.id}">
        <div class="top"><div><div class="cat-tag">${a.city} &middot; ${a.cat}</div><div class="nm">${a.nm}</div></div>
        <button class="add" type="button" data-pick="${a.id}" aria-label="Add ${esc(a.nm.replace(/<[^>]+>/g,''))} to a day">+</button></div>
        <div class="meta"><span class="m">${a.dur}</span><span class="m ${free ? 'free' : 'cost'}">${cost}</span>
        ${a.must ? '<span class="m must">Must do</span>' : ''}${a.dive ? '<span class="m must">No-fly 24h</span>' : ''}</div>
        <p class="tip">${a.tip}</p>${a.link ? `<div class="lnk"><a href="${a.link}" target="_blank" rel="noopener">Official site &rarr;</a></div>` : ''}</article>`;
    }).join('') : '<p class="emptymsg">Nothing matches. Clear the search or pick a different filter.</p>';
  }
  for (const [id,key] of [['cityFilters','city'],['catFilters','cat']]) {
    $(id).addEventListener('click', event => {
      const button = event.target.closest('.chip');
      if (!button) return;
      filters[key] = button.dataset[key];
      $(id).querySelectorAll('.chip').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
      render();
    });
  }
  $('srch').addEventListener('input', event => { filters.q = event.target.value; render(); });
  $('acts').addEventListener('click', event => {
    const button = event.target.closest('[data-pick]');
    if (button) pickUp(button.dataset.pick, true);
  });
  $('acts').addEventListener('dragstart', event => {
    const card = event.target.closest('.act');
    if (!card || !pickUp(card.dataset.id, false)) { event.preventDefault(); return; }
    event.dataTransfer.setData('text/plain', card.dataset.id);
    event.dataTransfer.effectAllowed = 'copy';
    card.classList.add('dragging');
  });
  $('acts').addEventListener('dragend', event => {
    event.target.closest('.act')?.classList.remove('dragging');
    document.querySelectorAll('.slot.over').forEach(slot => slot.classList.remove('over'));
  });
  render();
}
