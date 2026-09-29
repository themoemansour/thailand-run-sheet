import test from 'node:test';
import assert from 'node:assert/strict';
import { STAYS, HOTELS, estimateStay, bookingUrl } from '../src/assets/js/data/hotels.js';

test('full trip room-night and per-person comparisons do not confuse rooms with people', () => {
  for (const people of [5, 6]) {
    const result = STAYS.map(stay => estimateStay({...stay, rooms:3, people, rate:100}));
    assert.deepEqual(result.map(r => r.roomNights), [9, 15, 18]);
    assert.equal(result.reduce((sum, r) => sum + r.total, 0), 4200);
    assert.equal(result.reduce((sum, r) => sum + r.perPerson, 0), people === 5 ? 840 : 700);
    assert.ok(result.every(r => r.extraAdults === 0));
  }
});

test('two-room comparison adds supplements once per extra adult per night', () => {
  const five = estimateStay({nights:14, rooms:2, people:5, rate:100, extraBedRate:30});
  const six = estimateStay({nights:14, rooms:2, people:6, rate:100, extraBedRate:30});
  assert.deepEqual(five, {roomNights:28, extraAdults:1, total:3220, perPerson:644});
  assert.equal(six.extraAdults, 2);
  assert.equal(six.total, 3640);
  assert.equal(six.perPerson, 3640 / 6);
  for (const rate of [-1, NaN, Infinity]) {
    assert.throws(() => estimateStay({nights:3, rooms:3, people:6, rate}), RangeError);
  }
});

test('quote links use the whole group, correct stay dates and no children', () => {
  for (const hotel of HOTELS) {
    const stay = STAYS.find(s => s.id === hotel.city);
    const url = new URL(bookingUrl(hotel, stay, {people:6, rooms:2}));
    assert.equal(url.searchParams.get('checkin'), stay.checkin);
    assert.equal(url.searchParams.get('checkout'), stay.checkout);
    assert.equal(url.searchParams.get('group_adults'), '6');
    assert.equal(url.searchParams.get('no_rooms'), '2');
    assert.equal(url.searchParams.get('group_children'), '0');
    assert.equal(url.origin, 'https://www.booking.com');
    assert.ok(stay.nights === (Date.parse(stay.checkout) - Date.parse(stay.checkin)) / 86400000);
  }
});
