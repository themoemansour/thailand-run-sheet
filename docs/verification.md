# Implementation verification

Implementation branch: `codex/shared-trip-pages`.

## Automated checks

The current suite passes 15 tests covering generated routes/local links, copied plan content, room-night and extra-adult budget calculations, dated group booking links, expense settlement, import validation/identity, authoritative state notifications, failed-write retention, prevention of deleted placement resurrection, Realtime disconnection status and initial connection retry cleanup. An initial successful data read now shows Connecting live updates while the first subscription opens, rather than a false disconnection warning. The obsolete hotel/credit calculator tests were removed with that interface.

## September 28 hotel guide and delete correction

Reviewed Claude's uncommitted visual/navigation changes, retaining the theme toggle, route-day navigation and combined calendar/activity page. Fixed mobile day-card stretching, focus on a hidden date after selecting a catalogue activity, and the delete button being re-enabled while its request was in progress.

Replaced the entire hotel/credit page with a sourced 11-property guide and a clearly illustrative USD room-budget planner for five/six adults in two/three rooms. Guide controls initialize independently of Supabase. Removed old client calculator code and credit-based fixed hotel assumptions; retained the 48 database settings for compatibility.

Database logs showed `DELETE requires a WHERE clause` inside `thailand_clear_calendar()`. PostgREST's authenticator role preloads `safeupdate`, which the SQL-tool connection does not. Migration `002_explicit_clear_filters.sql` adds explicit non-null primary-key predicates to both clear/reset functions without changing permissions, RLS or the safeguard. It was applied as `thailand_explicit_clear_filters`; the deployed definitions were inspected afterward. Security advisors returned no findings.

The clear/reset functions passed an anonymous-role transaction test that rolled back all effects, checking that clear preserves expenses and reset restores defaults. The reusable check is `database/verify_clear_reset.sql`. This does not reproduce PostgREST's session-loaded guard. Loading that server library through the SQL tool was disallowed and was not bypassed. No live bulk clear/reset was performed on the group's data.

Real isolated Chromium checks on this revision passed:

- Custom Add → Save → reload → delete by ID; desktop native drag/drop and deletion of the added occurrence.
- Mobile catalogue selection preserves focus on the visible November 20 card and saves the activity to that date. A follow-up slot assertion initially matched both `.slot` and `.slots`; its error output showed the saved November 20 Afternoon slot. All temporary records were removed by their exact IDs.
- Theme toggle, route-day navigation, menu open/Escape and cancellation of the shared Clear/Reset confirmations.
- All 15 pages fit at 390px and 1280px. At 320px, initial checks found an overflow during a transient connection message. The status row now wraps; final checks with both initial loading and a simulated long disconnection message plus Retry and an open menu fit at 320px. The hotel page also fits at 320px.
- The guide filters 11 hotels to six four-star or five five-star choices. Room/headcount changes update both costs and dated booking URLs. Invalid rate input hides the estimate. Browser checks validated the $4,200 default, $3,500 two-room/five-adult example, and $4,200 two-room/six-adult example, including the clearly labeled $50 supplement assumption.
- Desktop and mobile full-page/viewport screenshots were inspected. The calendar and activity list remain on the same page. No sustained Realtime connection failure was observed.

The Playwright MCP profile was in use by another automation, so these checks used a separate temporary Chromium profile through the already-installed Playwright library. Existing browser sessions were left intact. The remaining sections describe the earlier implementation and its then-current labels.

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
