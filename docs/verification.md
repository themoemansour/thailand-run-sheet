# Implementation verification

Implementation branch: `codex/shared-trip-pages`.

## Automated checks

`node --test` passes 10 tests covering copied plan content, hotel/cash calculations, expense settlement, v2 validation, stable v1 occurrence IDs, authoritative state notifications, failed-write retention, prevention of deleted placement resurrection, Realtime disconnection status and initial connection retry cleanup. All JavaScript modules pass syntax checks.

Extraction checks confirmed all 16 numbered sections, 14 original itinerary days, 83 original catalogue activities, 48 setting defaults and exact content parity for the ten unchanged reference sections. Database seed values match `DEFAULT_SETTINGS`. Following the user's scope correction, sections 01 and 03 share `index.html` to preserve drag-and-drop; there are 15 full pages plus the `activities.html` compatibility redirect.

## Browser and database checks

Independent Chromium checks on the final combined calendar/catalogue build passed:

- All 15 full pages open directly and refresh. The 16 menu entries retain numbered content and show the current page or calendar/list section. The former `activities.html` route redirects to `index.html#activities`.
- The reference pages and combined calendar/list fit at both 390px and 320px; the final menu item is reachable on phones.
- The catalogue renders 83 activities, filters to 30 Phuket activities, and handles empty searches.
- Menu 03 jumps to the list and highlights it. Choosing Walking Street with **+** stays on the page, sets `#calendar`, highlights menu 01, shows the placement prompt and scrolls the calendar into view. Cancel clears the prompt.
- A real mouse drag starts placement mode, displays the activity picker and applies the dragging style. Mouse-up clears the drag style. Database-backed drop/save remains pending setup.
- All 15 fixed anchors have no edit controls. Print retains the 14 day cards and pins while hiding the catalogue, navigation, status and editing controls.

Live database initialization and two-session synchronization checks are **pending explicit approval** of anonymous write/delete and shared-reset access. The live schema-application attempt was rejected by automatic approval review; it did not create the app tables. No successful database application, shared save, Realtime convergence, real import/reset, or offline recovery against the project is claimed until that step is verified. The current preview therefore shows a connection/setup error and disables shared edits.

The setup script is `database/001_thailand_shared.sql`; the configured project is `gvlpnygtuuouejndhzzh`. Before initialization its public schema and migration history were empty. The script is confined to `thailand_*` objects and the three app tables' Realtime publication membership.
