// Research snapshots, not inventory or live prices. Keep source links beside each recommendation.
export const REVIEWED_ON = '28 September 2026';
export const STAYS = [
  { id:'pattaya', name:'Pattaya', checkin:'2026-11-13', checkout:'2026-11-16', nights:3, area:'Central Pattaya', reason:'Stay near Beach Road or Soi Buakhao for food and evenings out. Take a ride to Bali Hai Pier for Koh Larn; a hill resort adds a ride to most outings.' },
  { id:'phuket', name:'Patong · Phuket', checkin:'2026-11-16', checkout:'2026-11-21', nights:5, area:'Walkable Patong', reason:'Keep the beach and Bangla Road within walking distance. Island and dive trips still need a transfer; confirm your operator collects from Patong.' },
  { id:'bangkok', name:'Bangkok', checkin:'2026-11-21', checkout:'2026-11-27', nights:6, area:'Asok / lower Sukhumvit', reason:'One base for all six nights. Asok connects BTS and MRT for Siam, markets and temple trips. River festivities still need a train, boat or taxi journey.' },
];

export const HOTELS = [
  { id:'amber', city:'pattaya', name:'Hotel Amber Pattaya', stars:4, score:'9.1', reviews:3842, badge:'Start here for value',
    location:'Inland near Soi Buakhao. Allow roughly 15–20 minutes on foot to the beach; use a ride for Walking Street and Bali Hai Pier.',
    fit:'A strong first quote: pool, sauna and notably high cleanliness (9.4) and staff (9.6) review scores. More practical for a value stay than a secluded hill resort.',
    caution:'Not beachfront. The hotel’s daytime drop-off shuttle is a bonus, not a plan for a late night or an early ferry.',
    rooms:'Twin rooms with two single beds are published. Start with three twins; third-adult occupancy is not verified.',
    official:'https://atmindgroup.com/hotelamberpattaya/', reviewUrl:'https://www.booking.com/hotel/th/amber-pattaya.html', detailsUrl:'https://atmindgroup.com/hotelamberpattaya/wp-content/uploads/2020/12/Hotel-Amber-Pattaya.pdf' },
  { id:'adelphi', city:'pattaya', name:'Adelphi Pattaya', stars:4, score:'8.7', reviews:1333, badge:'Smaller hotel alternative',
    location:'Central Pattaya’s inland Soi Buakhao area, about 1 km from the beach according to the hotel. Ride to the pier.',
    fit:'A compact hotel with a rooftop pool. Cleanliness (9.2) and staff (9.4) are stronger than the overall score; compare its total quote with Amber.',
    caution:'Choose for the room and location value, not a large resort pool or immediate beach access.',
    rooms:'Request confirmed twin beds for each room. Do not price two rooms for six adults without a written occupancy and bed confirmation.',
    official:'https://www.adelphipattaya.com/', reviewUrl:'https://www.booking.com/hotel/th/adelphi-pattaya.en-gb.html' },
  { id:'avani', city:'pattaya', name:'Avani Pattaya Resort', stars:5, score:'8.7', reviews:1190, badge:'Central resort upgrade',
    location:'Beach Road beside Royal Garden Plaza, about 50 m from the beach. Walking Street is roughly 10–15 minutes on foot; the pier is farther.',
    fit:'Garden resort and pool in a convenient central location. Its location and staff both score 9.4; a useful upgrade if the full-stay quote is competitive.',
    caution:'Some recent guests describe dated rooms or bathroom maintenance. Ask which room category has been refreshed before paying for the upgrade.',
    rooms:'Deluxe Garden View is advertised for up to three adults. Confirm the third adult’s actual bed, supplement and breakfast; capacity alone is not three beds.',
    official:'https://www.avanihotels.com/en/pattaya', reviewUrl:'https://www.booking.com/hotel/th/avani-pattaya-resort-spa.html', detailsUrl:'https://www.avanihotels.com/en/pattaya/rooms', cautionUrl:'https://au.hotels.com/ho196454/avani-pattaya-resort-pattaya-and-vicinity-thailand/' },
  { id:'clover-patong', city:'phuket', name:'Hotel Clover Patong Phuket', stars:4, score:'8.9', reviews:4257, badge:'Start here for location',
    location:'Central beach area on Thawewong Road. Roughly 5–10 minutes on foot to Bangla Road.',
    fit:'The first Patong quote to get: rooftop pool, beach access nearby and a 9.5 location score. Cleanliness is 9.2 and staff 9.4.',
    caution:'Deluxe Studio rooms are compact at 26 m². Request a quieter room away from street and corridor traffic; central Patong will not feel secluded.',
    rooms:'The official Deluxe Studio includes a twin option. Three twins are the straightforward setup; a third adult in these rooms is not verified.',
    official:'https://patongphuket.hotelclover.com/', reviewUrl:'https://www.booking.com/hotel/th/surf-patong.en-gb.html', detailsUrl:'https://patongphuket.hotelclover.com/accommodation/deluxe-studio-room/' },
  { id:'indigo', city:'phuket', name:'Hotel Indigo Phuket Patong', stars:5, score:'8.9', reviews:1197, badge:'Boutique luxury upgrade',
    location:'Rat U Thit Road in central Patong. IHG places Bangla Walking Street 0.5 km away, with the beach also walkable.',
    fit:'Standard rooms of 38–45 m², rooftop pool and a strong service record. Cleanliness scores 9.3, comfort 9.4 and staff 9.5.',
    caution:'Traffic noise can reach some rooms, including a garden-side room in one recent account. Request a quiet room away from the street opening.',
    rooms:'IHG lists standard rooms with two twins or a king and rollaways by request. Booking.com lists extra beds at THB 1,800 per person per night in eligible rooms; confirm three-adult occupancy and availability.',
    official:'https://www.ihg.com/hotelindigo/hotels/us/en/phuket/phupp/hoteldetail', reviewUrl:'https://www.booking.com/hotel/th/indigo-phuket-patong.html', detailsUrl:'https://www.ihg.com/hotelindigo/hotels/us/en/phuket/phupp/hoteldetail/rooms', cautionUrl:'https://www.tripadvisor.com/Hotel_Review-g297930-d14076704-Reviews-or10-Hotel_Indigo_Phuket_Patong_by_IHG-Patong_Kathu_Phuket.html' },
  { id:'courtyard', city:'phuket', name:'Courtyard Phuket, Patong Beach Resort', stars:5, score:'8.9', reviews:1612, badge:'Pool and space upgrade',
    location:'South end of Patong’s Beach Road, across the road from the beach. Bangla Road is roughly a 15–20 minute walk.',
    fit:'Four pools and rooms starting at about 31 m². A resort option with 9.2 cleanliness and 9.3 staff scores, while keeping Patong walkable.',
    caution:'Family-oriented and busier around the pools; the beach requires a road crossing. Farther from the evening action than Clover.',
    rooms:'Twin room categories are available. Confirm beds and adult occupancy for the exact category; two rooms for six adults is not assumed.',
    official:'https://www.marriott.com/en-us/hotels/hktcp-courtyard-phuket-patong-beach-resort/overview/', reviewUrl:'https://www.booking.com/hotel/th/courtyard-by-marriott-phuket-patong-beach-resort.en-gb.html', detailsUrl:'https://www.marriott.com/en-us/hotels/hktcp-courtyard-phuket-patong-beach-resort/rooms/' },
  { id:'clover-asoke', city:'bangkok', name:'Hotel Clover Asoke', stars:4, score:'8.7', reviews:1685, badge:'Start here for value',
    location:'Sukhumvit 16, about a five-minute walk to Asok BTS, Sukhumvit MRT and Terminal 21 according to the hotel.',
    fit:'The most useful first comparison for this group: central transit access and a listed three-single-bed room. Staff score 9.5 and location 9.3.',
    caution:'Standard rooms are around 25 m²; pay attention to the triple’s actual size and luggage space. Check breakfast inclusions rather than assuming a lavish buffet.',
    rooms:'Booking.com lists a Triple Room with three single beds. Two such rooms could suit six adults if the exact dated rate confirms all six occupants.',
    official:'https://asoke.hotelclover.com/', reviewUrl:'https://www.booking.com/hotel/th/clover-asoke.html' },
  { id:'mercure-bangkok', city:'bangkok', name:'Mercure Bangkok Sukhumvit 11', stars:4, score:'8.6', reviews:1496, badge:'Nightlife alternative',
    location:'About 350 m / five minutes to Nana BTS and 950 m / twelve minutes to Asok, per the hotel.',
    fit:'Good for evenings on Sukhumvit 11, with a pool and 9.0 cleanliness and comfort scores. Compare with Clover and Solaria before trading transit convenience for nightlife.',
    caution:'The lively street can mean more night noise; request a quiet room. A less direct MRT connection than the Asok choices.',
    rooms:'Twin categories are listed. Confirm a third adult’s bed and total charge in writing if considering two rooms.',
    official:'https://all.accor.com/hotel/A247/index.en.shtml', reviewUrl:'https://www.booking.com/hotel/th/mercure-sukhumvit11.html' },
  { id:'solaria', city:'bangkok', name:'Solaria Nishitetsu Hotel Bangkok', stars:4, score:'9.1', reviews:499, badge:'Best rail convenience · 4-star',
    location:'Direct connection to Asok BTS Exit 4; about one minute to Sukhumvit MRT Exit 3, per the hotel.',
    fit:'Especially convenient in heat or rain. Location scores 9.8 and cleanliness 9.4; a practical upgrade over a cheaper hotel farther from rail.',
    caution:'A smaller review sample than the other Bangkok picks. Wi-Fi scores only 6.7, so ask about the connection if anyone needs to work.',
    rooms:'Solaria Twin has two 140 cm beds, but published capacity is two adults plus a child under 12. That is not permission for three adults.',
    official:'https://www.solariabangkok.com/location.html', reviewUrl:'https://www.booking.com/hotel/th/solaria-nishitetsu-bangkok.en-gb.html', detailsUrl:'https://www.solariabangkok.com/stay/solaria-twin-room.html' },
  { id:'carlton', city:'bangkok', name:'Carlton Hotel Bangkok Sukhumvit', stars:5, score:'9.3', reviews:5665, badge:'Best luxury review record',
    location:'About 400 m / six minutes to Asok BTS and 360 m / five minutes to Sukhumvit MRT, per the hotel.',
    fit:'The strongest overall review record here, backed by thousands of stays. Cleanliness and comfort are both 9.7, staff 9.6 and value 9.1.',
    caution:'Early check-in can cost extra, and late checkout is not guaranteed. Compare the six-night total before deciding the upgrade is affordable.',
    rooms:'Several categories permit three adults. The hotel lists an extra bed at THB 1,500++ per night for Deluxe / Executive rooms; advance availability and final tax-inclusive price matter.',
    official:'https://www.carltonhotel.co.th/', reviewUrl:'https://www.booking.com/hotel/th/carlton-bangkok-sukhumvit.en-gb.html', detailsUrl:'https://www.carltonhotel.co.th/faq' },
  { id:'terminal21', city:'bangkok', name:'Grande Centre Point Terminal 21', stars:5, score:'9.1', reviews:2894, badge:'Best rail convenience · 5-star',
    location:'Direct BTS / MRT access at the Terminal 21 mall, with easy food-court meals between outings.',
    fit:'A 9.7 location score and a well-reviewed five-star stay. Particularly useful for six nights of independent outings and regrouping.',
    caution:'You are choosing a busy mall and interchange setting. Compare the premium against Solaria across the junction.',
    rooms:'Grand Deluxe Triple is listed with three single beds. Confirm that room type, six-adult total and breakfast for every occupant before booking two rooms.',
    official:'https://grandecentrepointterminal21.com/', reviewUrl:'https://www.booking.com/hotel/th/grande-centre-point.en-gb.html' },
];

export function estimateStay({ nights, rooms, people, rate, extraBedRate = 0 }) {
  if (!Number.isInteger(nights) || nights < 1 || ![2, 3].includes(rooms) || ![5, 6].includes(people)
    || !Number.isFinite(rate) || rate < 0 || !Number.isFinite(extraBedRate) || extraBedRate < 0) {
    throw new RangeError('Use valid nights, 2 or 3 rooms, 5 or 6 adults and non-negative rates.');
  }
  const roomNights = nights * rooms;
  const extraAdults = Math.max(0, people - rooms * 2);
  const total = roomNights * rate + extraAdults * nights * extraBedRate;
  return { roomNights, extraAdults, total, perPerson:total / people };
}

export function bookingUrl(hotel, stay, { people, rooms }) {
  if (![5, 6].includes(people) || ![2, 3].includes(rooms)) throw new RangeError('Unsupported room setup');
  const url = new URL(hotel.reviewUrl);
  url.search = new URLSearchParams({checkin:stay.checkin, checkout:stay.checkout, group_adults:String(people), no_rooms:String(rooms), group_children:'0', selected_currency:'USD'});
  return url.href;
}
