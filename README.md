# Thailand Run Sheet

Shared trip planner for Nov 13–27, 2026: Pattaya 3 nights, Phuket 5, Bangkok 6. The calendar and activity list share the landing page so drag-and-drop and tap-to-place stay intact. The other numbered sections have separate static pages, with a common 16-item menu and the original grid-paper styling. The fixed calendar itinerary covers Nov 13–26, as in the original.

## Run locally

Use Node.js 20 or newer. No npm dependencies are required:

```sh
npm run dev
```

Open `http://127.0.0.1:4317`. The development server builds the site and watches source files. Native JavaScript modules need HTTP; opening files directly is unsupported. Use HTTPS when publishing.

## Project structure

```text
src/
  layouts/base.html       Shared document, header, navigation and footer
  pages/                 Page content, without duplicated document wrappers
  assets/
    styles/main.css      Layout, responsive styles and print rules
    js/app.js            Page initialization and navigation guards
    js/components/       Shared navigation
    js/pages/            Calendar, catalogue, hotel guide, checklist, ledger and sharing
    js/lib/              Shared data access, calculations and utilities
    js/data/trip.js       Fixed itinerary and catalogue
    js/data/hotels.js     Sourced hotel shortlist and room-budget calculations
scripts/                 Static build and local development server
database/                Versioned Supabase schema
tests/                   Node test suite
docs/                    Verification notes
dist/                    Generated site; ignored by Git
```

Edit `src/`, then run `npm run build` to produce `dist/`. All pages use one layout. Routes such as `/hotels/` work directly and on refresh; old `.html` links redirect to their current routes. Calendar and activities stay together at `/#calendar` and `/#activities`, side by side on wide screens and stacked on phones. The Sections button opens the complete index without sideways scrolling.

## Shared data

The browser uses the Supabase project and public publishable key in `src/assets/js/lib/config.js`. That key is public configuration. Never replace it with a secret or service-role key.

The intended access model is **anyone with the link can read and edit, including clearing the shared calendar and resetting the shared trip after confirmation**. There are no individual accounts. The database permissions also allow these actions directly through the API; a browser confirmation is a convenience, not an access control. Do not store secrets in this planner.

Only three app-specific tables are exposed to the anonymous role:

- `thailand_placements`: one UUID per calendar occurrence, including custom and per-entry edited activity details.
- `thailand_expenses`: one UUID per expense, with the fixed crew's payer and split participants.
- `thailand_settings`: checklist ticks and legacy settings (48 keys retained for compatibility).

Explicit grants, row-level policies and value constraints are in `database/001_thailand_shared.sql`. It also defines transaction-based clear/reset/import functions using caller privileges. Existing unrelated tables and their policies are untouched.

Both numbered migrations have been applied to the confirmed project `gvlpnygtuuouejndhzzh` with explicit approval of anonymous editing, deletion and shared reset. For a different empty project, apply `001_thailand_shared.sql` then `002_explicit_clear_filters.sql` **once** using migration tooling. The first creates the three tables, seeds settings and adds the tables to `supabase_realtime`; it deliberately fails if the tables already exist. The second adds explicit primary-key predicates to intentional clear/reset deletes so PostgREST's `safeupdate` guard accepts them. Permissions and RLS remain unchanged. Ordinary page loads never seed or upload local browser data. Fixed itinerary pins remain in `src/assets/js/data/trip.js`.

Supabase JS **2.117.2** is loaded as a version-pinned ES module from jsDelivr (`https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.2/+esm`). Internet access to that CDN and the configured Supabase project is required. There is no runtime npm installation.

Changes use individual record/field writes and Postgres Changes subscriptions. Focus, reconnect and coming online refetch current database state. Same-field changes use the last accepted database write. Numeric fields commit on change/blur; menu navigation waits for submitted writes and flushes pending settings. Incoming data does not replace active drafts. Failed writes retain a draft or leave the previous saved state visible with an explicit retry. Offline writes are paused; custom activity drafts can still be opened and retained. Reconnect reads current data and never replays an offline queue.

## Everyday use

Drag an activity from section 02 (the list) directly into a calendar slot, or tap its **+** and choose **Place here** in a day/time slot on the same page. Calendar and Activities links jump between these sections. The old `activities.html` URL redirects to the list. Use **+ add** for custom activities, such as `Dinner | 500`. Each added occurrence has Edit, Move and remove controls; flight and hotel pins remain fixed. Print includes the calendar and fixed pins, with the catalogue and editing controls hidden.

Expenses and checklist ticks are shared. Hotel research, stars and guest-review snapshots live in `src/assets/js/data/hotels.js`, with sources linked beside each choice. The hotel guide replaces the old credit/points calculator; legacy database keys remain for compatibility. Its two/three-room, five/six-adult budget scenario is temporary browser state and works even if the shared database is unavailable. All displayed hotel budget figures are illustrative US dollars per room per night, not verified availability or rates for November. Search filters, navigation and unsubmitted expense forms are also temporary.

Copy plan, Print and Copy settlement remain available. Page 16 (Share calendar and ledger) provides optional JSON export/import for **calendar activities and expenses only**, not a full backup of settings. Export refreshes current data before copying. The new v2 format preserves record IDs; old v1 plan/custom/ledger codes are validated and converted to stable occurrence IDs. Imports are atomic and repeatable without adding duplicate IDs. They add missing records; they do not propagate deletions or override existing records. Normal collaboration uses automatic synchronization.

Clear shared calendar removes only added activities. Reset shared trip data clears added activities and expenses and restores all 48 settings in one transaction. Both leave fixed trip content unchanged.

## Tests

```sh
npm test
```

The Node built-in tests cover calculations, legacy import identity, malformed imports, authoritative store updates, failure handling and updates to deleted records. Browser verification should use separate contexts against a configured test project and exercise addition/edit/move/delete, unrelated concurrent edits, settings/checklists, reconnect, repeated imports and reset. Remove test records afterward. See `docs/verification.md` for the implementation's checked results.

## Deploy

On Vercel, `vercel.json` builds with `npm run build` and serves `dist/`, retaining the original response headers. Other static hosts can serve the same generated directory. Each route is directly addressable; no SPA rewrite is needed. Configure the intended Supabase project before publishing. Pushing a branch may create a preview if the repository already has a deployment integration; this repository contains no automatic deployment script.

An owner should check the Supabase dashboard before the trip. A Free project can pause after low activity; resume it in the dashboard, then open the planner and verify Saved and a test edit. No artificial keep-alive traffic is used. See [Supabase project pausing](https://supabase.com/docs/guides/platform/free-project-pausing).

`HANDOFF.md` is a local planning document, ignored and untracked on this implementation branch.
