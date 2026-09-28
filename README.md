# Thailand Run Sheet

Trip planner for Nov 13-27, 2026. Pattaya 3 nights, Phuket 5, Bangkok 6.

Single self-contained `index.html`. No build step, no dependencies, works offline.

## What's in it

- Drag-and-drop calendar, colour-coded by city, with pinned flights and hotels
- 83 activities with durations, real baht prices and tips
- Export/import codes so everyone can merge their calendars
- Settle-up ledger with minimum-transfer settlement
- Hotel credit tracker (Chase Edit + Select stack, Amex FHR)
- Food guide built around no pork
- Health, pharmacies, transport, scams, Thai phrases

State is stored per-browser in `localStorage`. Nothing is sent anywhere.

## Local

Open `index.html` in a browser. That's it.

## Deploy

    npx vercel --prod
