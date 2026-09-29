# Implementation verification

Implementation branch: `codex/shared-trip-pages`.

## Automated checks

`npm test` passes 12 tests covering generated routes and local links, copied plan content, hotel/cash calculations, expense settlement, v2 validation, stable v1 occurrence IDs, authoritative state notifications, failed-write retention, prevention of deleted placement resurrection, Realtime disconnection status and initial connection retry cleanup. All JavaScript modules pass syntax checks.

Extraction checks confirmed all 16 numbered sections, 14 original itinerary days, 83 original catalogue activities, 48 setting defaults and exact content parity for the ten unchanged reference sections. Database seed values match `DEFAULT_SETTINGS`. Following the user's scope correction, sections 01 and 03 share `index.html` to preserve drag-and-drop; there are 15 full pages plus the `activities.html` compatibility redirect.

## Browser and database checks

Initial Chromium checks on the combined calendar/catalogue build passed:

- All 15 full pages open directly and refresh. The 16 menu entries retain numbered content and show the current page or calendar/list section. The former `activities.html` route redirects to `index.html#activities`.
- The reference pages and combined calendar/list fit at both 390px and 320px; the final menu item is reachable on phones.
- The catalogue renders 83 activities, filters to 30 Phuket activities, and handles empty searches.
- Menu 03 jumps to the list and highlights it. Choosing Walking Street with **+** stays on the page, sets `#calendar`, highlights menu 01, shows the placement prompt and scrolls the calendar into view. Cancel clears the prompt.
- A real mouse drag starts placement mode, displays the activity picker and applies the dragging style. Mouse-up clears the drag style.
- All 15 fixed anchors have no edit controls. Print retains the 14 day cards and pins while hiding the catalogue, navigation, status and editing controls.

Migration `thailand_shared_trip` was applied successfully after explicit approval of anonymous editing, deletion and shared reset. The three app tables exist and all 48 settings were initialized. Supabase security advisors returned no findings after application.

Real browser checks confirmed custom Add → Save → reload persistence, catalogue selection → slot placement, and live appearance/deletion in a second isolated browser context. Temporary records were removed afterward.

A transaction executed as `anon` validated placement insert/update, import of a placement and expense, duplicate import skipping, checklist update, calendar clear preserving expenses, and reset restoring settings. The entire transaction was rolled back, preserving existing shared data. This verifies database operations, not the reset confirmation UI.

The reorganized build produces 15 full pages from `src/pages/` and one shared layout. Legacy `.html` links redirect to clean routes; `/index.html` remains supported.

## Final responsive build

Independent Chromium verification passed on the reorganized build:

- Custom Add, save, reload, edit, move and remove; only the test records were removed.
- Mobile activity selection and **Place here**, reload persistence, then removal.
- Real desktop drag-and-drop into a slot at 1280 × 900 with the activity catalogue beside the calendar.
- Add, edit and remove converged in a second independent browser context without refresh.
- The Sections panel exposes all 16 links, closes on Escape and outside click, and supports keyboard traversal. Escape restores the toggle focus; section jumps focus their destination.
- All 15 pages open directly and refresh. No document overflow at 320px or 390px. The old activities URL redirects to the shared calendar/catalogue page.
- A failed offline save retains its draft and shows Retry save. Reconnect and retry persist it through reload.
- Print retains all 14 day cards and 15 fixed pins, while hiding the catalogue and controls.

Earlier drag attempts with an off-screen destination and stale accessible-name selectors were test-harness failures; corrected native drag/tap tests passed. Test entries were cleaned up by their IDs. No shared clear or reset was issued from the browser.

The setup script is `database/001_thailand_shared.sql`; the configured project is `gvlpnygtuuouejndhzzh`. Before initialization its public schema and migration history were empty. The script is confined to `thailand_*` objects and the three app tables' Realtime publication membership.
