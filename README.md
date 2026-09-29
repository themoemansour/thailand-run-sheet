# Thailand Run Sheet

Shared trip planner for Nov 13–27, 2026: Pattaya 3 nights, Phuket 5, Bangkok 6. The calendar and activity list share the landing page so drag-and-drop and tap-to-place stay intact. The other numbered sections have separate static pages, with a common 16-item menu and the original grid-paper styling. The fixed calendar itinerary covers Nov 13–26, as in the original.

## Run locally

Serve this directory over HTTP, for example with Python's standard-library server:

```sh
python -m http.server 8000 --bind 127.0.0.1
```

Open `http://127.0.0.1:8000`. Native JavaScript modules need HTTP; opening `index.html` directly as a `file:` URL is unsupported. No build step or framework is required. Use HTTPS when publishing.

## Shared data

The browser uses the Supabase project and public publishable key in `js/config.js`. That key is public configuration. Never replace it with a secret or service-role key.

The intended access model is **anyone with the link can read and edit, including clearing the shared calendar and resetting the shared trip after confirmation**. There are no individual accounts. The database permissions also allow these actions directly through the API; a browser confirmation is a convenience, not an access control. Do not store secrets in this planner.

Only three app-specific tables are exposed to the anonymous role:

- `thailand_placements`: one UUID per calendar occurrence, including custom and per-entry edited activity details.
- `thailand_expenses`: one UUID per expense, with the fixed crew's payer and split participants.
- `thailand_settings`: one key per calculator input, booking flag and checklist tick (48 keys).

Explicit grants, row-level policies and value constraints are in `database/001_thailand_shared.sql`. It also defines transaction-based clear/reset/import functions using caller privileges. Existing unrelated tables and their policies are untouched.

Apply that SQL **once**, to a confirmed empty/new planner project, using the Supabase SQL Editor or migration tooling. It creates the three tables, seeds their settings once, and adds them to the `supabase_realtime` publication. It deliberately fails if the app tables already exist. Ordinary page loads never seed or upload local browser data. The checked-in default settings match the original source, with an empty editable calendar and expense ledger; fixed flight/hotel pins remain in `js/data.js`.

Supabase JS **2.117.2** is loaded as a version-pinned ES module from jsDelivr (`https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.2/+esm`). Internet access to that CDN and the configured Supabase project is required. There is no runtime npm installation.

Changes use individual record/field writes and Postgres Changes subscriptions. Focus, reconnect and coming online refetch current database state. Same-field changes use the last accepted database write. Numeric fields commit on change/blur; menu navigation waits for submitted writes and flushes pending settings. Incoming data does not replace active drafts. Failed writes retain a draft or leave the previous saved state visible with an explicit retry. Offline editing is disabled; reconnect reads current data and never replays an offline queue.

## Everyday use

Drag an activity from section 03 directly into a calendar slot, or tap its **+** and choose a day/time slot on the same page. The 01 and 03 menu links jump between these sections. The old `activities.html` URL redirects to the list. Use **+ add** for custom activities, such as `Dinner | 500`. Each added occurrence has Edit, Move and remove controls; flight and hotel pins remain fixed. Print includes the calendar and fixed pins, with the catalogue and editing controls hidden.

Hotel/cash calculator inputs, points balances, booking flags, expenses and checklist ticks are shared. Totals and settlements are calculated from those inputs. Search filters, navigation and unsubmitted expense forms are temporary browser state.

Copy plan, Print and Copy settlement remain available. Page 02 provides optional JSON export/import for **calendar activities and expenses only**, not a full backup of settings. Export refreshes current data before copying. The new v2 format preserves record IDs; old v1 plan/custom/ledger codes are validated and converted to stable occurrence IDs. Imports are atomic and repeatable without adding duplicate IDs. They add missing records; they do not propagate deletions or override existing records. Normal collaboration uses automatic synchronization.

Clear shared calendar removes only added activities. Reset shared trip data clears added activities and expenses and restores all 48 settings in one transaction. Both leave fixed trip content unchanged.

## Tests

```sh
node --test
```

The Node built-in tests cover calculations, legacy import identity, malformed imports, authoritative store updates, failure handling and updates to deleted records. Browser verification should use separate contexts against a configured test project and exercise addition/edit/move/delete, unrelated concurrent edits, settings/checklists, reconnect, repeated imports and reset. Remove test records afterward. See `docs/verification.md` for the implementation's checked results.

## Deploy

Keep the existing static-hosting arrangement. On Vercel, use the repository root as the output directory with no build command. `vercel.json` retains the original response headers. Each `.html` page is directly addressable; no SPA rewrite is needed. Configure the intended Supabase project before publishing. Pushing a branch may create a preview if the repository already has a deployment integration; this repository contains no automatic deployment script.

An owner should check the Supabase dashboard before the trip. A Free project can pause after low activity; resume it in the dashboard, then open the planner and verify Saved and a test edit. No artificial keep-alive traffic is used. See [Supabase project pausing](https://supabase.com/docs/guides/platform/free-project-pausing).

`HANDOFF.md` is a local planning document, ignored and untracked on this implementation branch.
