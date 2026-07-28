# PND Scout UI tests

Playwright/Scout end-to-end coverage for the PND (investigations) UI.

## Running

Stop any locally running Elasticsearch/Kibana (the Scout server brings its own up).

Start the server for classic stateful:

```sh
node scripts/scout.js start-server --location local --arch stateful --domain classic
```

Then, in a second terminal, run the tests:

```sh
node scripts/playwright test \
  --config x-pack/solutions/security/plugins/pnd/test/scout/ui/playwright.config.ts \
  --project=local
```

Or do both in one shot:

```sh
node scripts/scout.js run-tests --arch stateful --domain classic \
  --config x-pack/solutions/security/plugins/pnd/test/scout/ui/playwright.config.ts
```

## What's covered

`tests/proposal_decision_confirmation.spec.ts` exercises the decision-confirmation modal on
the investigation detail page (`investigation_detail.tsx` / `ProposalRow`): clicking a
decision button (approve/isolate, modify, escalate, defer, dismiss) must never call the
backend directly — it must open an `EuiConfirmModal` first, and only the modal's own
confirm button may trigger the API call. This guards against a misclick on a dense button
row silently isolating a live endpoint (the highest-stakes proposal type, `type: 'contain'`).

The suite targets the fixed seed fixture `inv-floor-datastage-013` /
`prop-floor-datastage-013` from `server/routes/investigations/real_data.ts` (a pending,
`type: 'contain'` proposal), which is deterministically present on a fresh cluster via the
only-if-empty seeding gate in `investigation_store.ts`. If you repoint the suite at a
different fixture, re-verify its `type`/`status` first — the assertions are specific to the
isolate-endpoint confirmation copy.

Complementary unit coverage for the same flow (all button variants, all confirmation copy,
cancel path) lives in
`public/pages/investigations/proposal_row_confirm.test.tsx` (Jest + RTL) — the Scout suite
here is deliberately narrow (accept/isolate only) since it's the highest-consequence path,
not a full re-test of every button in a browser.
