import { STAYS, HOTELS, REVIEWED_ON, estimateStay, bookingUrl } from '../data/hotels.js';

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const integer = new Intl.NumberFormat('en-US');
const cityClasses = { pattaya: 'c-pattaya', phuket: 'c-phuket', bangkok: 'c-bangkok' };

function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

function safeUrl(value) {
  try {
    const url = new URL(value, location.origin);
    return ['https:', 'http:'].includes(url.protocol) ? escapeHTML(url.href) : '#';
  } catch { return '#'; }
}

function dateLabel(iso) {
  const date = new Date(`${iso}T00:00:00Z`);
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(date);
}

function hotelCard(hotel, stay, recommended, people, rooms) {
  const book = bookingUrl(hotel, stay, { people, rooms });
  const title = escapeHTML(hotel.name);
  return `<article class="hotel-card${recommended ? ' hotel-card-featured' : ''}">
    <div class="hotel-card-top">
      <div class="hotel-card-name">
        <span class="hotel-card-badge">${escapeHTML(hotel.badge || (recommended ? 'Start here' : 'Shortlist'))}</span>
        <h4>${title}</h4>
        <p class="hotel-card-location">${escapeHTML(hotel.location)}</p>
      </div>
      <div class="hotel-score" aria-label="Guest score ${escapeHTML(hotel.score)} out of 10 from ${escapeHTML(hotel.reviews)} reviews">
        <strong>${escapeHTML(hotel.score)}</strong><span>Booking.com<br>${integer.format(Number(hotel.reviews) || 0)} reviews</span>
      </div>
    </div>
    <p class="hotel-stars">${escapeHTML(hotel.stars)}-star hotel</p>
    <p class="hotel-fit">${escapeHTML(hotel.fit)}</p>
    <dl class="hotel-card-facts">
      <div><dt>Sleeping setup</dt><dd>${escapeHTML(hotel.rooms)}</dd></div>
      <div><dt>Watch for</dt><dd>${escapeHTML(hotel.caution)}</dd></div>
    </dl>
    <p class="hotel-price-status">${escapeHTML(dateLabel(stay.checkin))}–${escapeHTML(dateLabel(stay.checkout))} price unverified · compare the full stay total</p>
    <div class="hotel-card-actions">
      <a class="hotel-book" href="${safeUrl(book)}" target="_blank" rel="noopener noreferrer" aria-label="Check ${title} for ${people} adults in ${rooms} rooms, opens booking site">Check dates <span aria-hidden="true">↗</span></a>
      <a href="${safeUrl(hotel.official)}" target="_blank" rel="noopener noreferrer" aria-label="${title} official site, opens new tab">Hotel site</a>
      <a href="${safeUrl(hotel.reviewUrl)}" target="_blank" rel="noopener noreferrer" aria-label="${title} guest reviews, opens new tab">Guest reviews</a>
      ${hotel.detailsUrl ? `<a href="${safeUrl(hotel.detailsUrl)}" target="_blank" rel="noopener noreferrer" aria-label="${title} details, opens new tab">Details</a>` : ''}
      ${hotel.cautionUrl ? `<a href="${safeUrl(hotel.cautionUrl)}" target="_blank" rel="noopener noreferrer" aria-label="${title} recent review notes, opens new tab">Recent review notes</a>` : ''}
    </div>
  </article>`;
}

export function initHotelGuide() {
  const root = document.getElementById('hotelGuide');
  if (!root) return;

  root.querySelector('#hotelReviewedOn').textContent = REVIEWED_ON;
  const cityNav = root.querySelector('#hotelCityNav');
  const shortlists = root.querySelector('#hotelShortlists');
  const rateGrid = root.querySelector('#hotelRateGrid');
  const hotelByCity = new Map(STAYS.map(stay => [stay.id, HOTELS.filter(hotel => hotel.city === stay.id)]));
  const state = { stars: 'all', people: 5, rooms: 3 };

  cityNav.innerHTML = STAYS.map((stay, index) => `<a href="#hotel-${escapeHTML(stay.id)}"><span>${String(index + 1).padStart(2, '0')}</span>${escapeHTML(stay.name)}<small>${escapeHTML(stay.nights)} nights</small></a>`).join('');
  rateGrid.innerHTML = STAYS.map(stay => `<label class="hotel-rate ${cityClasses[stay.id] || ''}" for="hotelRate-${escapeHTML(stay.id)}">
    <span class="hotel-rate-name">${escapeHTML(stay.name)} <small>${escapeHTML(stay.nights)} nights</small></span>
    <span class="hotel-input-wrap"><span aria-hidden="true">$</span><input id="hotelRate-${escapeHTML(stay.id)}" type="number" inputmode="decimal" min="0" max="10000" step="any" value="100" aria-label="Illustrative ${escapeHTML(stay.name)} price in US dollars per room per night"></span>
    <span class="hotel-rate-caption">per room, per night · your assumption</span>
  </label>`).join('');

  function renderShortlists() {
    shortlists.innerHTML = STAYS.map(stay => {
      const all = hotelByCity.get(stay.id) || [];
      const shown = state.stars === 'all' ? all : all.filter(hotel => String(hotel.stars) === state.stars);
      const recommended = shown[0];
      return `<section class="hotel-city ${cityClasses[stay.id] || ''}" id="hotel-${escapeHTML(stay.id)}" aria-labelledby="hotel-${escapeHTML(stay.id)}-title">
        <header class="hotel-city-head">
          <div><p class="hotel-city-dates">${escapeHTML(dateLabel(stay.checkin))}–${escapeHTML(dateLabel(stay.checkout))} · ${escapeHTML(stay.nights)} nights</p>
            <h3 id="hotel-${escapeHTML(stay.id)}-title">${escapeHTML(stay.name)}</h3><p>${escapeHTML(stay.area)} · ${escapeHTML(stay.reason)}</p></div>
          <span class="hotel-city-count">${shown.length} ${shown.length === 1 ? 'hotel' : 'hotels'}</span>
        </header>
        ${recommended ? `<p class="hotel-city-pick"><strong>Start here: ${escapeHTML(recommended.name)}.</strong> ${escapeHTML(recommended.fit)}</p>` : ''}
        <div class="hotel-cards">${shown.length ? shown.map(hotel => hotelCard(hotel, stay, hotel === recommended, state.people, state.rooms)).join('') : '<p class="hotel-no-results">No hotels in this class for this city. Show all to see the full shortlist.</p>'}</div>
      </section>`;
    }).join('');
    const visibleCount = STAYS.reduce((count, stay) => count + (state.stars === 'all'
      ? (hotelByCity.get(stay.id) || []).length
      : (hotelByCity.get(stay.id) || []).filter(hotel => String(hotel.stars) === state.stars).length), 0);
    root.querySelector('#hotelFilterStatus').textContent = `Showing ${visibleCount} ${visibleCount === 1 ? 'hotel' : 'hotels'} across ${STAYS.length} cities`;
  }

  function readNumber(input) {
    const value = input.valueAsNumber;
    const valid = Number.isFinite(value) && value >= Number(input.min) && value <= Number(input.max);
    if (valid) input.removeAttribute('aria-invalid');
    else input.setAttribute('aria-invalid', 'true');
    return valid ? value : null;
  }

  function updateCosts() {
    root.querySelector('#hotelRoomNote').textContent = state.rooms === 2
      ? `${state.people} adults in two rooms means ${state.people - 4} extra ${state.people - 4 === 1 ? 'adult' : 'adults'} each night. Only use this estimate if the chosen hotel confirms real three-adult rooms or an extra bed, the supplement, and availability for every night.`
      : `${state.people} adults in three rooms: ${state.people === 6 ? 'three twin rooms are the simplest setup' : 'ask for two twin rooms plus one room for a single guest'}. All three rooms stay in the estimate for all fourteen nights.`;
    const extraBedRate = readNumber(root.querySelector('#hotelExtraRate'));
    const rates = STAYS.map(stay => readNumber(root.querySelector(`#hotelRate-${stay.id}`)));
    const validation = root.querySelector('#hotelValidation');
    if (extraBedRate === null || rates.some(rate => rate === null)) {
      root.querySelector('#hotelRoomNights').textContent = '—';
      root.querySelector('#hotelTotal').textContent = '—';
      root.querySelector('#hotelPerPerson').textContent = '—';
      validation.textContent = 'Enter valid USD room rates and an extra-adult amount from $0 to $1,000.';
      validation.hidden = false;
      return;
    }
    validation.hidden = true;
    const totals = STAYS.map((stay, index) => estimateStay({
      nights: stay.nights,
      rooms: state.rooms,
      people: state.people,
      rate: rates[index],
      extraBedRate,
    }));
    const roomNights = totals.reduce((sum, item) => sum + item.roomNights, 0);
    const total = totals.reduce((sum, item) => sum + item.total, 0);
    root.querySelector('#hotelRoomNights').textContent = integer.format(roomNights);
    root.querySelector('#hotelTotal').textContent = money.format(total);
    root.querySelector('#hotelPerPerson').textContent = money.format(total / state.people);
  }

  root.querySelector('.hotel-filter').addEventListener('click', event => {
    const button = event.target.closest('button[data-hotel-stars]');
    if (!button) return;
    state.stars = button.dataset.hotelStars;
    for (const control of root.querySelectorAll('[data-hotel-stars]')) control.setAttribute('aria-pressed', String(control === button));
    renderShortlists();
  });
  root.addEventListener('change', event => {
    if (event.target.name === 'hotelPeople') state.people = Number(event.target.value);
    if (event.target.name === 'hotelRooms') state.rooms = Number(event.target.value);
    if (event.target.name === 'hotelPeople' || event.target.name === 'hotelRooms') {
      root.querySelector('#hotelQuoteContext').firstChild.textContent = `Quote links use ${state.people} adults / ${state.rooms} rooms. `;
      renderShortlists();
    }
    updateCosts();
  });
  root.addEventListener('input', event => {
    if (event.target.matches('input[type="number"]')) updateCosts();
  });
  const budgetDisclosure = root.querySelector('#hotelBudgetDisclosure');
  root.querySelector('#hotelAdjustRooms').addEventListener('click', () => {
    budgetDisclosure.open = true;
    budgetDisclosure.querySelector('summary').focus();
    budgetDisclosure.scrollIntoView({ block: 'start' });
  });
  function openBudgetHash() {
    if (location.hash === '#hotelBudget' || location.hash === '#hotelBudgetDisclosure') {
      budgetDisclosure.open = true;
      root.querySelector('#hotelBudgetTitle').focus({ preventScroll: true });
      budgetDisclosure.scrollIntoView({ block: 'start' });
    }
  }
  window.addEventListener('hashchange', openBudgetHash);
  renderShortlists();
  updateCosts();
  openBudgetHash();
}
